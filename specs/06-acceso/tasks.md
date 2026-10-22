# Tareas — Acceso

**Plan:** `specs/06-acceso/plan.md` (aprobado el 22 de octubre de 2026)
**Numeración:** `T-nnn` es única en todo el proyecto. Las tareas de agenda siguen en `specs/02-agenda/tasks.md` desde T-012; T-022 se añadió aquí después.
**Regla:** una tarea cabe en una sesión de trabajo. Termina cuando se cumple su «Hecho cuando», su prueba pasa y `python tools/trazabilidad.py --check` sigue limpio.

Estados: `pendiente` · `en curso` · `hecha`.

## Orden de ejecución

Acordado el 22 de octubre de 2026 para tener pantallas antes. Las dependencias de cada tarea mandan sobre este orden.

**T-004 → T-005 → T-010 → T-011** (primeras pantallas web) **→ T-020** (el móvil arranca) **→ T-006 → T-016 → T-012 →** el resto de agenda. La parte de Google (T-007, T-008, T-013, T-022) entra cuando estén las credenciales de Google Cloud.

---

## 0. Base técnica

Habilita todo lo demás. Sin requisito propio: cada tarea cita la decisión que hace posible.

### T-001 · Andamiaje del monorepo

- **Habilita:** AD-01, AD-02, AD-08
- **Depende de:** —
- **Contenido:** raíz con pnpm workspaces y Turborepo; `packages/contratos` con zod; `apps/api` en NestJS con una ruta `GET /salud`; Vitest con SWC; `docker-compose.yml` con PostgreSQL (más pgvector) y Redis; integración continua; script `verificar`, que ejecuta compilación, pruebas y trazabilidad
- **Hecho cuando:** `pnpm install`, `pnpm build`, `pnpm test` y `pnpm verificar` terminan sin errores, y `GET /salud` responde 200
- **Prueba:** `plataforma.salud-responde`
- **Estado:** hecha · 22 de octubre de 2026. `verificar` pasa (3 pruebas, 130 requisitos sin problemas) y la API compilada responde `200 {"estado":"ok"}`
- **Notas de implementación:**
  - pnpm se ejecuta con `npx pnpm@12.10.1`, porque Corepack 0.34 no reconoce el binario nativo de pnpm 12.
  - `@swc/core` está fijado en 1.16.2: desde la 1.16.12 rechaza cargar su binario nativo si su carpeta de caché es escribible por otros usuarios (`AGENTS.md`).
  - TypeScript 7.0.2 compila los decoradores de NestJS sin problema.
  - La integración continua instala pnpm con npm.
  - `docker-compose.yml` es válido según `docker compose config`, pero sus imágenes todavía no se han descargado ni levantado: eso se hace en T-002, que es la primera tarea que necesita la base

### T-002 · Base de datos y alta de cuentas

- **Satisface:** REQ-ACC-01 · H-ACC-01
- **Depende de:** T-001
- **Contenido:** Prisma con PostgreSQL; primera migración con `organizacion`, `perfil_usuario` y `evento_auditoria`; semilla de desarrollo con una organización, un usuario personal y un gerente; script `crear-cuenta` (correo, rol, plan, contraseña temporal)
- **Hecho cuando:** la migración se aplica sobre una base vacía, la semilla deja tres filas consultables y no existe ninguna ruta pública que cree cuentas
- **Prueba:** `acceso.sin-registro-abierto` · también `plataforma.migracion-y-semilla`
- **Estado:** hecha · 22 de octubre de 2026. `verificar` pasa con 10 pruebas. La migración `20261022000000_inicial` se aplica desde cero en cada ejecución de las pruebas y también se aplicó a la base de desarrollo, con la semilla
- **Notas de implementación:**
  - Prisma 7: la conexión va en `prisma.config.ts` y el cliente se genera en `apps/api/src/generado`, que no se versiona. La tarea `generar` de Turborepo lo regenera antes de compilar y probar. **No ejecutar `prisma init`**: instala por su cuenta instrucciones para agentes de IA.
  - Las pruebas usan la base `nexoai_prueba`, que se vacía y se migra en cada ejecución. El código se niega a vaciar cualquier base cuyo nombre no termine en `_prueba`.
  - El PostgreSQL del contenedor va en el **puerto 5433**, porque en este equipo hay un PostgreSQL 18 instalado como servicio de Windows en el 5432.
  - `crear-cuenta` valida todos los datos antes de escribir, para no dejar una organización creada a medias si la cuenta es inválida.
  - Las cuentas de la semilla y sus contraseñas temporales de desarrollo están en `apps/api/src/plataforma/semilla.ts`.

### T-003 · Contexto de solicitud y aislamiento por organización

- **Habilita:** P-04 · propuesta técnica §9
- **Depende de:** T-002
- **Contenido:** `ContextoSolicitud` con `{ perfilId, organizacionId, rol, plan }`; extensión del cliente Prisma que filtra por organización en toda tabla que la tenga
- **Hecho cuando:** una consulta hecha con el contexto de la organización A no devuelve filas de la B, en ninguna tabla con `organizacion_id`
- **Prueba:** `plataforma.aislamiento-entre-organizaciones`
- **Estado:** hecha · 22 de octubre de 2026. 10 pruebas sobre las tres tablas: lecturas, condiciones explícitas sobre otra organización, escrituras masivas, actualizar o borrar por id ajeno, creación, cambio de organización y transacciones. Con el filtro desactivado fallan 7, así que las pruebas sí detectan un filtro roto
- **Notas de implementación:**
  - `aislarPorOrganizacion()` en `src/plataforma/aislamiento.ts` es una extensión de consultas de Prisma. Añade la condición con `AND`, que vale también para las búsquedas por clave única.
  - Las tablas filtradas están en una lista explícita, `MODELOS_CON_ORGANIZACION`. Una prueba lee `schema.prisma` y falla si una tabla con `organizacionId` no está en ella.
  - `PrismaService` ofrece `deOrganizacion(id)`, el acceso normal, y `sinAislar`, solo para lo que ocurre antes de conocer la organización, como el ingreso.
  - El filtro no cubre las escrituras anidadas ni el SQL crudo; los cubren reglas de `AGENTS.md`.
  - `ContextoSolicitud` está definido en `src/identidad/contexto.ts`. Quien lo rellena a partir del JWT es T-004.

---

## 1. Cuenta y sesión

### T-004 · Ingreso y sesión

- **Satisface:** REQ-ACC-02, REQ-ACC-03, REQ-ACC-13 (núcleo) · H-ACC-03
- **Depende de:** T-003
- **Contenido:** `POST /auth/ingreso`, `/auth/renovar` y `/auth/salida`; argon2id; verificación contra un hash ficticio cuando el correo no existe; error único `CREDENCIALES_INVALIDAS`; JWT de 15 minutos y renovación rotativa de 30 días con detección de reutilización; límite de 5 intentos por minuto. **Añadido por D-17:** el rol `colaborador` (migración nueva y contrato `Rol`), una cuenta de colaborador en la semilla, y `RolGuard`, que deniega por defecto al colaborador toda ruta no marcada con `@PermitidoPara('colaborador')`
- **Hecho cuando:** un ingreso correcto devuelve rol y plan; un correo inexistente y una contraseña errónea dan la misma respuesta; reutilizar un token ya rotado revoca su familia; un colaborador recibe `ROL_NO_PERMITIDO` en cualquier ruta no marcada para su rol
- **Pruebas:** `acceso.ingreso-devuelve-rol`, `acceso.error-no-revela-correo`, `acceso.colaborador-solo-ve-lo-suyo` · también `acceso.sesion-rotativa`, `acceso.limite-de-intentos`
- **Estado:** hecha · 22 de octubre de 2026. 15 pruebas nuevas, 35 en total. Con la denegación del colaborador desactivada, su prueba falla. La migración `20261022010000_rol_colaborador_y_sesiones` está aplicada en desarrollo, y la semilla incluye `colaborador@nexoai.test`
- **Notas de implementación:**
  - Rutas: `POST /auth/ingreso`, `POST /auth/renovar`, `POST /auth/salida` y `GET /auth/sesion` («quién soy»).
  - Todos los errores tienen la forma `ErrorApi { codigo, mensaje }` de `packages/contratos`.
  - Dos guardas globales: `AutenticacionGuard`, que exige token salvo en las rutas `@Publico()`, y `RolGuard`, que deniega por defecto al colaborador. El contexto se lee con `@Contexto()`.
  - Dos ajustes respecto al plan, anotados en él (§5.1): el limitador cuenta en memoria y no en Redis, y los tokens viajan en el cuerpo de la respuesta (la cookie de la web llega en T-011).
  - Las pruebas que inician sesión usan un correo distinto cada una, porque el limitador cuenta por correo e IP durante todo el archivo.
  - Variable nueva: `JWT_SECRETO`. En el `.env` local ya hay un valor aleatorio.

### T-005 · Primer ingreso

- **Satisface:** REQ-ACC-04, REQ-ACC-05 (parte de servidor) · H-ACC-02
- **Depende de:** T-004
- **Contenido:** `PrimerIngresoGuard` global; `POST /auth/primer-ingreso` con contraseña nueva (mínimo 12 caracteres, distinta de la temporal) y zona horaria IANA validada
- **Hecho cuando:** con el primer ingreso pendiente, toda ruta salvo `primer-ingreso` y `salida` responde `PRIMER_INGRESO_PENDIENTE`; al completarlo, el acceso se libera
- **Prueba:** `acceso.primer-ingreso-bloquea-hasta-completar`
- **Estado:** pendiente

### T-006 · Perfil y cuenta no autogestionable

- **Satisface:** REQ-ACC-10 (lectura), REQ-ACC-12
- **Depende de:** T-004
- **Contenido:** `GET /perfil`; esquema estricto de `Perfil`; ninguna ruta de cambio de correo, plan, rol ni baja
- **Hecho cuando:** el perfil se lee; intentar enviar correo, plan o rol por cualquier ruta se rechaza; no hay rutas de baja
- **Prueba:** `acceso.cuenta-no-autogestionable`
- **Estado:** pendiente

---

## 2. Google

### T-007 · Conexión con Google y consentimientos

- **Satisface:** REQ-ACC-06, REQ-ACC-07, REQ-ACC-14
- **Depende de:** T-004
- **Añadido por D-17:** al colaborador solo se le ofrece el alcance de calendario; pedir `gmail.send` con ese rol se rechaza. Prueba adicional: `acceso.colaborador-solo-calendario`
- **Contenido:** `consentimiento_integracion` con una fila por alcance; constante de los dos alcances con su explicación en `packages/contratos`; OAuth incremental por alcance; tokens cifrados con AES-256-GCM; `GET /integraciones/google/permisos`
- **Hecho cuando:** cada alcance se concede por separado; los tokens no se pueden leer en claro desde la base; `gmail.readonly` no aparece en el código
- **Pruebas:** `acceso.permisos-google-explicados`, `acceso.solo-dos-alcances-sin-lectura-de-buzon`
- **Estado:** pendiente

### T-008 · Permiso faltante y revocación

- **Satisface:** REQ-ACC-08, REQ-ACC-09
- **Depende de:** T-007
- **Contenido:** decorador `@RequiereGoogle(alcance)`; puerto `ClienteGoogle`, que es el único que llama a Google; ante `invalid_grant`, el consentimiento pasa a revocado o caducado, se avisa una sola vez (`aviso_emitido_en`) y no se reintenta
- **Hecho cuando:** sin consentimiento no se hace ninguna llamada a Google; tras una revocación hay exactamente un aviso y cero reintentos
- **Pruebas:** `acceso.sin-google-no-agenda-ni-envia`, `acceso.revocacion-avisa-una-vez-y-no-reintenta`
- **Estado:** pendiente

### T-009 · Cambio de zona horaria

- **Satisface:** REQ-ACC-10, REQ-ACC-11 · H-ACC-04
- **Depende de:** T-012 (Operaciones), T-014 (réplica de agenda)
- **Contenido:** Operación `perfil.cambiar_zona_horaria`. La propuesta lista los compromisos futuros que cambian de hora local; los instantes no se tocan
- **Hecho cuando:** sin confirmar no cambia nada; al confirmar cambia solo `perfil_usuario.zona_horaria` y queda en auditoría
- **Pruebas:** `acceso.zona-horaria-modificable`, `acceso.cambio-zona-muestra-afectados-y-no-aplica-sin-confirmar`
- **Estado:** pendiente

---

## 3. Interfaz web

### T-010 · Andamiaje de la web

- **Habilita:** AD-02, AD-08
- **Depende de:** T-001
- **Contenido:** `apps/web` con Next.js, consumiendo `packages/contratos`; Playwright configurado
- **Hecho cuando:** la web compila, importa un esquema de `contratos` y una prueba de Playwright abre su página inicial
- **Prueba:** `web.arranca`
- **Estado:** pendiente

### T-011 · Pantallas de acceso en la web

- **Satisface:** REQ-ACC-02 a REQ-ACC-05 (interfaz) · H-ACC-05, H-ACC-06
- **Depende de:** T-005, T-010
- **Contenido:** `WEB-v2 / Acceso / 01 Entrada` y `02 Primer ingreso`, según el diseño. La zona horaria puede venir preseleccionada, pero hay que elegirla. Si entra un colaborador, la web le indica que su cuenta se usa desde el móvil. *(Revisado el 22 de octubre de 2026: «Conectar Google» pasó a T-022, para no esperar a las credenciales de Google y tener pantallas antes.)*
- **Hecho cuando:** entrar y completar el primer ingreso funciona contra la API; no se puede enviar el primer ingreso sin elegir zona horaria; un colaborador ve el aviso del móvil
- **Prueba:** `acceso.zona-horaria-requiere-eleccion`
- **Estado:** pendiente

### T-022 · Pantalla «Conectar Google» en la web

- **Satisface:** REQ-ACC-06 (interfaz)
- **Depende de:** T-007, T-011
- **Contenido:** `WEB-v2 / Acceso / 03 Conectar Google`: cada permiso con su explicación, concedido por separado
- **Hecho cuando:** desde la web se concede cada alcance por separado y su estado se refleja
- **Prueba:** `acceso.conectar-google-por-permiso`
- **Estado:** pendiente

---

**Fuera de este desglose:** la variante móvil de Acceso (falta su diseño, spec §4) y la contraseña olvidada (no tiene requisito).
