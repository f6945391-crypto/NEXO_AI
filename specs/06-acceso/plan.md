# Plan técnico — Acceso

**Especificación:** `specs/06-acceso/spec.md` (REQ-ACC-01 a 12)
**Fase:** 1
**Decisiones que aplica:** AD-01, AD-02, AD-08, AD-09 · P-04, P-05, P-07, P-08
**Estado:** **aprobado** por el equipo el 22 de octubre de 2026, con sus hallazgos H-ACC-01 a H-ACC-05 tal como están · **Revisado el 22 de octubre de 2026 por D-17**: rol colaborador (§5.5), ACC-13 y ACC-14, H-ACC-06

Este plan dice **dónde y cómo** se cumple cada requisito. No añade comportamiento. Lo que la especificación no decide está en §8 como hallazgo y vuelve a ella.

---

## 1. Alcance

| Entra | No entra |
|---|---|
| Ingreso con credenciales, primer ingreso, sesión y cierre de sesión | Contraseña olvidada: no tiene requisito (spec §4, pendiente) |
| Perfil: zona horaria y su cambio con previsualización | Cambiar correo o plan, o darse de baja (REQ-ACC-12) |
| Conexión con Google, consentimientos y su revocación | Registro abierto (REQ-ACC-01) |
| Aislamiento entre organizaciones | Administración del equipo desde la interfaz (S-5, sin especificar) |

## 2. Módulos

| Módulo NestJS | Responsabilidad | Expone |
|---|---|---|
| `IdentidadModule` | Credenciales, sesiones, perfil, guardas de rol y de primer ingreso | `AutenticacionController`, `PerfilController`, `ContextoSolicitud` |
| `IntegracionesModule` | OAuth de Google, almacén cifrado de tokens, estado de cada consentimiento | `GoogleController`, `ConsentimientosService`, el puerto `ClienteGoogle` |
| `OperacionesModule` | Transversal, AD-09. Aquí lo usa el cambio de zona horaria; se define en `specs/02-agenda/plan.md` §3 | `OperacionesService` |
| `AuditoriaModule` | Transversal. Registro de acciones (propuesta §9) | `AuditoriaService` |

**Contexto de solicitud.** Cada petición autenticada lleva `{ perfilId, organizacionId, rol, plan }`, sacado del JWT. Una extensión del cliente Prisma añade `organizacionId` a toda consulta sobre tablas de la organización. Así, el aislamiento entre organizaciones no depende de que cada consulta se acuerde de filtrar (propuesta §9, P-04).

## 3. Modelo de datos

| Tabla | Campos principales | Notas |
|---|---|---|
| `organizacion` | `id`, `nombre`, `creada_en` | Cliente que crea las cuentas (R-45) |
| `perfil_usuario` (EN-01) | `id`, `organizacion_id`, `correo` único, `hash_contrasena`, `rol` (`usuario_personal` · `gerente` · `colaborador`, este último desde D-17), `plan` (`gratuito` · `personal` · `empresarial`), `zona_horaria` (IANA, nula hasta el primer ingreso), `debe_cambiar_contrasena`, `creado_en` | Rol y plan los fija la organización y no hay ruta para cambiarlos (ACC-12) |
| `sesion_renovacion` | `id`, `perfil_id`, `hash_token`, `familia`, `expira_en`, `revocada_en` | Token de renovación rotativo. Si se reutiliza uno ya rotado, se revoca toda la familia |
| `consentimiento_integracion` | `id`, `perfil_id`, `proveedor` (`google`), `alcance`, `estado` (`concedido` · `revocado` · `caducado`), `token_cifrado`, `concedido_en`, `cambiado_en`, `aviso_emitido_en` | **Una fila por alcance**: calendario y correo se revocan por separado (propuesta §9) |
| `evento_auditoria` | `id`, `organizacion_id`, `perfil_id`, `accion`, `detalle` (jsonb), `ocurrido_en` | Ingreso, primer ingreso, cambio de contraseña, conexión y revocación, cambio de zona horaria |

**Zona horaria (P-05).** Se guarda como identificador IANA (`America/Lima`), nunca como desfase fijo, y se valida contra `Intl.supportedValuesOf('timeZone')`.

## 4. Contratos y rutas

Los esquemas viven en `packages/contratos/acceso` (AD-08).

| Ruta | Contrato | Requisitos |
|---|---|---|
| `POST /auth/ingreso` | `IngresoSolicitud` → `IngresoRespuesta { rol, plan, primerIngresoPendiente }` | ACC-02, ACC-03 |
| `POST /auth/primer-ingreso` | `PrimerIngresoSolicitud { contrasenaNueva, zonaHoraria }` | ACC-04, ACC-05 |
| `POST /auth/renovar` | — → `IngresoRespuesta` | Sesión |
| `POST /auth/salida` | — | ACC-12, que deja solo cerrar sesión |
| `GET /perfil` | `Perfil` | ACC-10 |
| `POST /operaciones` con `tipo: perfil.cambiar_zona_horaria` | `CambioZonaHorariaCarga { zonaHoraria }` → propuesta con `compromisosAfectados[]` | ACC-10, ACC-11 |
| `POST /operaciones/:id/confirmar` | — | ACC-11 |
| `GET /integraciones/google/permisos` | `PermisoGoogle[] { alcance, paraQue, estado }` | ACC-06, ACC-07 |
| ~~`GET /integraciones/google/conectar?alcance=`~~ `POST /integraciones/google/enlace` | `EnlaceGoogleSolicitud` → `{ url }`. *Ajuste de T-007: un enlace normal no puede llevar el token de sesión, así que el cliente pide con su sesión un enlace firmado de 10 minutos y lo abre* | ACC-06 |
| `GET /integraciones/google/retorno` | — | ACC-06 |

**No existe** ninguna ruta para cambiar el correo, el plan, el rol ni para borrar la cuenta. El esquema de `Perfil` es estricto: un campo de más se rechaza (ACC-12).

## 5. Flujos

### 5.1 Ingreso (ACC-02, ACC-03)

1. Se busca el perfil por correo. **Si no existe, se verifica igualmente contra un hash ficticio**, para que el tiempo de respuesta no revele si el correo está registrado.
2. Cualquier fallo devuelve el mismo error `CREDENCIALES_INVALIDAS`, con el mismo cuerpo y el mismo código HTTP.
3. Se emiten un JWT de acceso de 15 minutos y un token de renovación de 30 días. *T-024 · DP-04: reutilizar un token recién rotado dentro de 30 segundos se trata como una renovación duplicada y no cierra la sesión.* En la web van en una cookie `httpOnly` y `SameSite=Strict`; en el móvil, en `expo-secure-store`. *Ajuste de T-004: la API devuelve los dos tokens en el cuerpo de la respuesta. La cookie de la web la pone el servidor de Next.js, que hace de intermediario (T-011); así el navegador nunca ve el token de renovación. Ajuste de T-022: las cookies son `SameSite=Lax` y no `Strict`, porque al volver de Google (otro sitio) el navegador no enviaba la sesión y llevaba a la entrada. Lax sigue sin enviarlas en formularios que llegan desde otros sitios.*
4. La respuesta incluye `rol` y `plan`. **Qué vista corresponde a cada rol lo decide el cliente** según el diseño de `WEB-v2 / Acceso` (hallazgo H-ACC-05).
5. Hay un límite de 5 intentos por minuto por correo y por IP, con `@nestjs/throttler`. *Ajuste de T-004: los contadores se guardan en memoria, no en Redis, porque solo un proceso atiende HTTP (AD-01). Pasan a Redis si la API se escala a más de una instancia.*

### 5.2 Primer ingreso (ACC-04, ACC-05)

- Una guarda global, `PrimerIngresoGuard`, responde `PRIMER_INGRESO_PENDIENTE` a cualquier ruta excepto `primer-ingreso` y `salida` mientras `debe_cambiar_contrasena` sea verdadero o `zona_horaria` sea nula.
- La zona horaria llega en la petición. El cliente puede **preseleccionar** la del navegador, pero el envío exige que la persona la elija (ACC-05); esto se comprueba en la prueba de extremo a extremo.
- No se pregunta franja horaria (R-44).

### 5.3 Cambio de zona horaria (ACC-10, ACC-11)

Es una **Operación** (AD-09):

1. Al proponerse, se calculan los compromisos futuros de la réplica de agenda y su hora local con la zona actual y con la nueva. Los que cambian de hora local van en `compromisosAfectados`.
2. **Los compromisos no se modifican**: se guardan como instantes absolutos, y lo único que cambia es cómo se muestran. Esta es la lectura de «qué compromisos quedan a otra hora» (hallazgo H-ACC-04).
3. Solo al confirmar se actualiza `perfil_usuario.zona_horaria` y se registra en auditoría.

*Ajustes de T-009:*
- Los compromisos afectados van **en los datos de la tarjeta de confirmación**, uno por línea, con su hora en la zona actual y en la nueva; no hace falta un campo propio. Como mucho diez, y después «y N más».
- Cuentan los compromisos **futuros, vigentes y con hora**. Los de todo el día no tienen hora que cambie.
- Pedir la zona que ya se tiene responde `SOLICITUD_INVALIDA`, sin crear la operación.
- Admite los orígenes `agente` y `control_directo`: es un ajuste sobre algo que ya existe, el perfil (DP-01).
- El ejecutor vive en `IdentidadModule` y lee la réplica con el repositorio público de `AgendaModule`.

*Interfaz web (T-027):* en Ajustes, dentro de «Perfil», la fila de la zona horaria lleva «Cambiar». La web propone la Operación con origen `control_directo` y pinta su tarjeta de confirmación con los datos que devuelve la API, sin calcular nada por su cuenta. Las acciones de servidor proponen, confirman y descartan; tras confirmar, la página se vuelve a pedir y la agenda se muestra en la zona nueva. No es un camino manual paralelo: es un ajuste sobre el perfil, que existe (DP-01), en el sitio que fijan REQ-ACC-10 y R-34.

### 5.4 Conexión con Google (ACC-06 a ACC-09)

- Hay exactamente dos alcances: `https://www.googleapis.com/auth/calendar.events` (ver y editar eventos) y `https://www.googleapis.com/auth/gmail.send`. Están en una constante de `packages/contratos` junto con el texto de para qué sirve cada uno. **`gmail.readonly` no aparece en ningún sitio del código** (P-08), y lo comprueba una prueba.
- Cada alcance se pide con su propia autorización incremental (`include_granted_scopes`), de modo que la persona concede uno sin el otro.
- Los tokens se cifran con AES-256-GCM antes de guardarse, con una clave de una variable de entorno que nunca se escribe en el registro.
- **ACC-08:** el decorador `@RequiereGoogle('calendar.events')` comprueba el consentimiento antes de que el servicio haga nada. Si falta, devuelve `PERMISO_GOOGLE_FALTANTE { alcance, paraQue, comoConceder }` sin llamar a Google.
- **ACC-09:** el puerto `ClienteGoogle` es el único que llama a Google. Ante `invalid_grant` o un 401 que no se arregla renovando el token, marca el consentimiento como `revocado` o `caducado` y deja de intentar. Si `aviso_emitido_en` está vacío, emite el aviso y lo rellena; si ya estaba lleno, no avisa otra vez. Los trabajos en cola comprueban el estado antes de llamar.

### 5.5 El rol colaborador (ACC-13, ACC-14, ACC-15) · añadido por D-17

> **Cambia el 23 de octubre de 2026 (D-17 a enmendada).** El colaborador usa el agente como el Plan Empresarial; lo único que no puede es asignar tareas a otros. Lo que sigue en esta sección describe la implementación de T-004 y T-007, que **T-026 sustituye** así:
> - **Toda ruta declara su alcance**: `@SobreLoPropio()` (trabaja sobre lo de la propia persona) o `@SoloResponsable()` (asigna o delega trabajo, o administra el equipo). `RolGuard` rechaza al colaborador las segundas con `ROL_NO_PERMITIDO` (ACC-15), **y también una ruta sin declarar**, para que un olvido no la deje abierta. Una prueba recorre todas las rutas de la aplicación y falla si alguna no declara su alcance. Las rutas `@Publico()` no lo necesitan.
> - **Las Operaciones también:** un tipo de Operación que asigna trabajo a otros declara `soloResponsable`, y `POST /operaciones` lo rechaza al colaborador antes de proponer nada. Hace falta porque la delegación llegará como Operación, por una ruta que el colaborador sí usa.
> - `GET /integraciones/google/permisos` devuelve al colaborador los dos alcances (ACC-14).
> - La web deja de enviar al colaborador a `/solo-movil`, que se retira, y le muestra la aplicación entera.
> - **Pendiente para la fase 4 (REQ-ACC-16, 23 de octubre de 2026):** la autoridad pasa a tenerse **por equipo**. Hoy el rol está en la cuenta; con el modelo de equipos, `@SoloResponsable()` tendrá que comprobar que quien pide es responsable **del equipo afectado**, y el rol de la cuenta dejará de bastar.
> - `@SoloResponsable()` solo excluye al rol colaborador. Que la delegación sea del Plan Empresarial es una restricción por plan, que todavía no existe (análisis por plan pendiente).


- **Se deniega por defecto.** Una guarda global, `RolGuard`, rechaza con `ROL_NO_PERMITIDO` toda ruta que no declare `@PermitidoPara('colaborador')`. Así una ruta nueva nunca queda abierta al colaborador por olvido.
- Las únicas rutas permitidas al colaborador son las de sus tareas asignadas y sus hilos (fase 4), su perfil, la sesión y el calendario de Google.
- `GET /integraciones/google/permisos` devuelve al colaborador **solo** el alcance de calendario; pedir `gmail.send` con ese rol se rechaza.
- ~~**«Solo en la aplicación móvil»** lo aplica el cliente: si un colaborador entra en la web, esta le indica que su cuenta se usa desde el móvil (H-ACC-06).~~ **Cambiado el 23 de octubre de 2026:** el colaborador usa la web y el móvil (REQ-ACC-13 reescrito). Lo que lo limita es el servidor, que ya deniega por defecto; el cliente no tiene que distinguir plataformas. **Mientras no exista su vista de tareas (fase 4)**, la web le sigue mostrando el aviso de `/solo-movil`, que se retira en cuanto llegue esa vista.

## 6. Seguridad

| Aspecto | Tratamiento |
|---|---|
| Contraseñas | argon2id. La temporal no se puede reutilizar como nueva |
| Política de contraseña | Mínimo 12 caracteres, sin más reglas de composición (hallazgo H-ACC-02) |
| Sesión | Acceso de 15 min; renovación de 30 días, rotativa y con detección de reutilización (hallazgo H-ACC-03) |
| Tokens de Google | Cifrados en reposo; nunca se devuelven al cliente |
| Aislamiento | Extensión de Prisma por organización; prueba de que un perfil de la organización A no puede leer nada de la B |

## 7. Verificación

| Requisito | Componente | Prueba prevista | Tipo |
|---|---|---|---|
| ACC-01 | Semilla y script de alta (H-ACC-01); no hay ruta de registro | `acceso.sin-registro-abierto` | Integración |
| ACC-02 | `AutenticacionController` | `acceso.ingreso-devuelve-rol` | Integración |
| ACC-03 | Hash ficticio y error único | `acceso.error-no-revela-correo` | Integración |
| ACC-04 | `PrimerIngresoGuard` | `acceso.primer-ingreso-bloquea-hasta-completar` | Integración |
| ACC-05 | Formulario de primer ingreso | `acceso.zona-horaria-requiere-eleccion` | Extremo a extremo |
| ACC-06 | `GET /integraciones/google/permisos` | `acceso.permisos-google-explicados` | Integración |
| ACC-07 | Constante de alcances | `acceso.solo-dos-alcances-sin-lectura-de-buzon` | Unitaria |
| ACC-08 | `@RequiereGoogle` | `acceso.sin-google-no-agenda-ni-envia` | Integración |
| ACC-09 | `ClienteGoogle` | `acceso.revocacion-avisa-una-vez-y-no-reintenta` | Integración con un Google simulado |
| ACC-10 | Operación `perfil.cambiar_zona_horaria` | `acceso.zona-horaria-modificable` | Integración |
| ACC-11 | Previsualización de la operación | `acceso.cambio-zona-muestra-afectados-y-no-aplica-sin-confirmar` | Integración |
| ACC-12 | Esquema estricto de `Perfil`; ausencia de rutas | `acceso.cuenta-no-autogestionable` | Integración |
| ACC-13 | `RolGuard` con denegación por defecto | `acceso.colaborador-solo-ve-lo-suyo` | Integración |
| ACC-14 | Permisos de Google por rol | `acceso.colaborador-solo-calendario` | Integración |

Los nombres de prueba se copian a `specs/trazabilidad.md` cuando la tarea correspondiente las implemente.

## 8. Hallazgos — vuelven a la especificación

Decisiones que este plan tuvo que tomar porque la especificación no las cubre. Están registradas en `SPEC.md` §8 y **no son definitivas** hasta que el equipo las acepte.

| # | Hallazgo | Lo que asume este plan |
|---|---|---|
| H-ACC-01 | ACC-01 dice que las cuentas «se crean en el sistema», pero no quién ni cómo | Un script de alta y una semilla para desarrollo. No hay interfaz de administración en la fase 1 |
| H-ACC-02 | No hay política de contraseña | Mínimo 12 caracteres |
| H-ACC-03 | No se especifica cuánto dura una sesión | 15 minutos de acceso y 30 días de renovación |
| H-ACC-04 | ACC-11 no dice si cambiar de zona horaria mueve los compromisos o solo cambia cómo se muestran | Solo cambia cómo se muestran; los instantes se conservan |
| H-ACC-05 | ACC-02 habla de «la vista que corresponde a su rol» sin nombrarla | La API devuelve rol y plan, y el cliente decide la vista según el diseño de Acceso |
| ~~H-ACC-06~~ | ~~ACC-13 dice «solo en la aplicación móvil», pero el servidor no distingue plataformas de forma fiable~~ | **Retirado el 23 de octubre de 2026**: ACC-13 ya no restringe la plataforma. El aviso `/solo-movil` queda como provisional hasta la vista web del colaborador (fase 4) |
