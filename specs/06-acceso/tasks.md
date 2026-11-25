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
- **Prueba:** `acceso.primer-ingreso-bloquea-hasta-completar` · también `contratos.zona-horaria`, `contratos.primer-ingreso`
- **Estado:** hecha · 22 de octubre de 2026. 14 pruebas en la API y 6 en contratos; 63 en total. Con la guarda desactivada, su prueba falla
- **Notas de implementación:**
  - El token de acceso lleva la marca `pi` (primer ingreso pendiente). `PrimerIngresoGuard` va entre la autenticación y el rol. La única ruta autenticada permitida mientras está pendiente es la marcada con `@PermitidoDurantePrimerIngreso()`; salir no necesita sesión.
  - Al completarlo: se guardan la contraseña nueva y la zona, **se cierran todas las sesiones abiertas con la contraseña temporal** y la respuesta trae tokens nuevos sin la marca.
  - **Zona horaria:** se acepta lo que reconoce `Intl.DateTimeFormat`, siempre que tenga forma de zona con nombre. Se rechazan los desfases fijos y `Etc/`. No se usa `Intl.supportedValuesOf` porque deja fuera nombres vigentes como `America/Argentina/Buenos_Aires`; lo detectó una prueba.
  - **Decisión menor que no estaba en la especificación:** una vez completado, repetir el primer ingreso responde `409 PRIMER_INGRESO_YA_COMPLETADO`. Esta ruta no sirve para cambiar la contraseña en general, algo que ningún requisito pide.
  - La parte de interfaz de REQ-ACC-05 (que la zona se elija y no se deduzca) se prueba en T-011.

### T-006 · Perfil y cuenta no autogestionable

- **Satisface:** REQ-ACC-10 (lectura), REQ-ACC-12
- **Depende de:** T-004
- **Contenido:** `GET /perfil`; esquema estricto de `Perfil`; ninguna ruta de cambio de correo, plan, rol ni baja
- **Hecho cuando:** el perfil se lee; intentar enviar correo, plan o rol por cualquier ruta se rechaza; no hay rutas de baja
- **Prueba:** `acceso.cuenta-no-autogestionable`
- **Estado:** hecha · 22 de octubre de 2026. 4 pruebas en la API; 75 en total
- **Notas de implementación:** `GET /perfil` devuelve correo, rol, plan, zona horaria y organización, y también lo puede leer el colaborador (REQ-ACC-13). No hay ninguna ruta de escritura sobre el perfil; una prueba lo comprueba enumerando las rutas, y `PATCH`, `PUT`, `POST` y `DELETE` sobre `/perfil` responden 404. La web muestra el perfil en Ajustes, solo lectura. Cambiar la zona horaria (el resto de REQ-ACC-10) es T-009.

---

## 2. Google

### T-007 · Conexión con Google y consentimientos

- **Satisface:** REQ-ACC-06, REQ-ACC-07, REQ-ACC-14
- **Depende de:** T-004
- **Añadido por D-17:** al colaborador solo se le ofrece el alcance de calendario; pedir `gmail.send` con ese rol se rechaza. Prueba adicional: `acceso.colaborador-solo-calendario`
- **Contenido:** `consentimiento_integracion` con una fila por alcance; constante de los dos alcances con su explicación en `packages/contratos`; OAuth incremental por alcance; tokens cifrados con AES-256-GCM; `GET /integraciones/google/permisos`
- **Hecho cuando:** cada alcance se concede por separado; los tokens no se pueden leer en claro desde la base; `gmail.readonly` no aparece en el código
- **Pruebas:** `acceso.permisos-google-explicados`, `acceso.solo-dos-alcances-sin-lectura-de-buzon`
- **Estado:** hecha · 22 de octubre de 2026. 9 pruebas con Google simulado. **Probada con una cuenta real de Google**: el calendario de `personal@nexoai.test` quedó conectado, con el token cifrado
- **Notas de implementación:**
  - Tabla `consentimiento_integracion` (cuarta migración), una fila por alcance. Lleva `organizacionId`, que el plan no tenía, para quedar dentro del filtro por organización.
  - **Sin SDK de Google**: el puerto `ProveedorOAuthGoogle` hace las dos llamadas HTTP de OAuth, y las pruebas lo sustituyen por uno simulado.
  - **Ajuste del plan:** en vez de `GET /conectar`, `POST /integraciones/google/enlace` devuelve un enlace con estado firmado (JWT, 10 minutos) que ata la conexión a quien la pidió. Un estado falsificado, un rechazo en Google o un permiso desmarcado no guardan nada.
  - Tokens cifrados con AES-256-GCM con `TOKENS_CLAVE_CIFRADO`, generada en el `.env` local. `.env.example` documenta todas las variables de Google.
  - Una prueba recorre el código de la API, la web, el móvil y los contratos buscando alcances de lectura o gestión de Gmail.

### T-008 · Permiso faltante y revocación

- **Satisface:** REQ-ACC-08, REQ-ACC-09
- **Depende de:** T-007
- **Contenido:** decorador `@RequiereGoogle(alcance)`; puerto `ClienteGoogle`, que es el único que llama a Google; ante `invalid_grant`, el consentimiento pasa a revocado o caducado, se avisa una sola vez (`aviso_emitido_en`) y no se reintenta
- **Hecho cuando:** sin consentimiento no se hace ninguna llamada a Google; tras una revocación hay exactamente un aviso y cero reintentos
- **Pruebas:** `acceso.sin-google-no-agenda-ni-envia`, `acceso.revocacion-avisa-una-vez-y-no-reintenta`
- **Estado:** hecha · 22 de octubre de 2026. 10 pruebas con Google simulado; 121 en el monorepo. Sin la comprobación del permiso retirado, la prueba de «no reintentar» falla
- **Notas de implementación:**
  - `ClienteGoogle` es el único punto que llama a Google en nombre de una persona. Comprueba el permiso, renueva el acceso cuando caduca (y una vez más si Google responde 401) y guarda el token nuevo cifrado.
  - `@RequiereGoogle(alcance)` y su guarda global responden `PERMISO_GOOGLE_FALTANTE` antes de ejecutar la ruta.
  - Si la renovación responde `invalid_grant`, o el acceso sigue rechazado tras renovar, el permiso pasa a `revocado` o `caducado`, se borra el token y se avisa **una sola vez**. El aviso es un evento `google.permiso-perdido` en la auditoría, y Ajustes muestra el permiso como retirado. Las llamadas siguientes no llegan a Google.
  - Un fallo pasajero de Google (`GOOGLE_NO_DISPONIBLE`, 502) no toca el permiso.
  - El aviso todavía no es una notificación: llegará cuando exista el sistema de notificaciones (fase 4).

### T-009 · Cambio de zona horaria

- **Satisface:** REQ-ACC-10, REQ-ACC-11 · H-ACC-04
- **Depende de:** T-012 (Operaciones), T-014 (réplica de agenda)
- **Contenido:** Operación `perfil.cambiar_zona_horaria`. La propuesta lista los compromisos futuros que cambian de hora local; los instantes no se tocan
- **Hecho cuando:** sin confirmar no cambia nada; al confirmar cambia solo `perfil_usuario.zona_horaria` y queda en auditoría
- **Pruebas:** `acceso.zona-horaria-modificable`, `acceso.cambio-zona-muestra-afectados-y-no-aplica-sin-confirmar`
- **Estado:** hecha · 23 de octubre de 2026. 5 pruebas
- **Notas de implementación:**
  - `src/identidad/cambiar-zona-horaria.ts`, registrada en `IdentidadModule`, que importa `AgendaModule` para leer la réplica. Admite `agente` y `control_directo` (DP-01).
  - La tarjeta dice la zona actual y la nueva, cuántos compromisos se verán a otra hora y, de como mucho diez, su hora antes y después. Cuentan los futuros, vigentes y con hora: los de todo el día, los cancelados y los pasados no.
  - Al confirmar cambia solo `perfil_usuario.zona_horaria` y se registra `perfil.zona-horaria-cambiada` con la zona anterior y la nueva. Los instantes de los compromisos no se tocan (H-ACC-04).
  - Pedir la zona que ya se tiene, o una sin nombre IANA, responde `SOLICITUD_INVALIDA` sin crear nada.
  - La pantalla para cambiarla desde Ajustes es T-027; el agente lo hará en la fase 2.

---

## 3. Interfaz web

### T-010 · Andamiaje de la web

- **Habilita:** AD-02, AD-08
- **Depende de:** T-001
- **Contenido:** `apps/web` con Next.js, consumiendo `packages/contratos`; Playwright configurado
- **Hecho cuando:** la web compila, importa un esquema de `contratos` y una prueba de Playwright abre su página inicial
- **Prueba:** `web.arranca`
- **Estado:** hecha · 22 de octubre de 2026. La página inicial consulta `GET /salud` y valida la respuesta con `SaludRespuesta` de `contratos`. 64 pruebas en el monorepo
- **Notas de implementación:**
  - Next.js 16 (Turbopack, App Router), React 19 y TypeScript 7. Next compila y comprueba tipos con TypeScript 7 sin problema.
  - Playwright usa en local el Chrome instalado y en la integración continua instala Chromium.
  - **Seguridad:** la versión elegida al principio, Next.js 16.4.0, tenía dos vulnerabilidades críticas de ejecución remota de código y una de denegación de servicio. La auditoría encontró también dos altas en dependencias de Prisma 7.10.0 (`mysql2` y `deepmerge-ts`). Se subió a **Next.js 16.4.2** y **Prisma 7.10.1**, y la auditoría queda limpia. La integración continua ahora audita en cada ejecución.
  - Next.js imprime instrucciones dirigidas a agentes de IA (ejecutar `next upgrade --agent=security`). No se siguieron: se comprobó la vulnerabilidad con la auditoría y se corrigió fijando la versión. Queda la regla en `AGENTS.md`.

### T-011 · Pantallas de acceso en la web

- **Satisface:** REQ-ACC-02 a REQ-ACC-05 (interfaz) · H-ACC-05, H-ACC-06
- **Depende de:** T-005, T-010
- **Contenido:** `WEB-v2 / Acceso / 01 Entrada` y `02 Primer ingreso`, según el diseño. La zona horaria puede venir preseleccionada, pero hay que elegirla. Si entra un colaborador, la web le indica que su cuenta se usa desde el móvil. *(Revisado el 22 de octubre de 2026: «Conectar Google» pasó a T-022, para no esperar a las credenciales de Google y tener pantallas antes.)*
- **Hecho cuando:** entrar y completar el primer ingreso funciona contra la API; no se puede enviar el primer ingreso sin elegir zona horaria; un colaborador ve el aviso del móvil
- **Prueba:** `acceso.zona-horaria-requiere-eleccion` · también `acceso.recorrido-web`
- **Estado:** hecha · 22 de octubre de 2026. 6 pruebas de extremo a extremo con Playwright contra la API real; 69 en total. Revisado a mano en el navegador con la base de desarrollo
- **Notas de implementación:**
  - **Intermediario de sesión:** las acciones de servidor de Next.js hablan con la API y guardan los dos tokens en cookies `httpOnly` y `SameSite=Strict`. El navegador no puede leer el token de renovación, y una prueba lo comprueba. Cuando el acceso caduca, las páginas redirigen a `/sesion/renovar`, porque Next.js no permite escribir cookies al renderizar.
  - **Rutas:** `/entrar`, `/primer-ingreso`, `/solo-movil` (aviso al colaborador; **provisional desde el 23 de octubre de 2026**: el colaborador también usa la web, y el aviso se retira cuando llegue su vista de tareas en la fase 4), `/` (inicio provisional hasta que lleguen las secciones) y `/sesion/renovar`.
  - **Zona horaria (REQ-ACC-05):** el selector empieza vacío; «Usar la de este equipo» la propone, pero hace falta pulsarlo o elegir otra. Cada opción muestra su desfase, por ejemplo «America/Lima · GMT-5».
  - **Base propia para estas pruebas:** `nexoai_e2e_prueba`. `e2e/arrancar-api.mjs` la vacía, la migra, crea las cuentas de `e2e/cuentas.json` y arranca la API en el puerto 3102. Así no se pisa con las pruebas de la API, que Turborepo ejecuta a la vez.
  - **Diseño:** los cuadros `WEB-v2 / Acceso / 01–02` solo existen en Figma, y Figma no estaba disponible (el conector necesita autorización). Las pantallas se construyeron con la especificación, `design/tokens.json` y las reglas de `design/CONTEXTO.md`. **Falta contrastarlas con los cuadros** (INC-15).
  - Se desactivó el `AGENTS.md` que Next.js escribía en `apps/web` (`agentRules: false`), y la API arrancada a mano ahora carga el `.env`.

### T-024 · Renovación concurrente sin cerrar la sesión

- **Satisface:** REQ-ACC-02 (que la sesión no se pierda sin motivo) · DP-04. Añadida el 22 de octubre de 2026 por un defecto visto en la auditoría
- **Depende de:** T-004
- **Contenido:** columna `rotada_en` en `sesion_renovacion` (quinta migración). Si el mismo token recién rotado vuelve dentro de un margen, se trata como petición duplicada y se emiten tokens nuevos de la misma sesión. Fuera del margen, o si la sesión ya se cerró, se sigue revocando toda la familia
- **Hecho cuando:** dos renovaciones simultáneas con el mismo token dan 200 sin registrar `sesion.reutilizada`; la reutilización pasado el margen sigue cerrando la sesión; tras cerrar sesión, el margen no reabre nada
- **Prueba:** `acceso.renovacion-concurrente` · y `acceso.sesion-rotativa` ajustada
- **Estado:** hecha · 22 de octubre de 2026. Sin el margen, las pruebas de concurrencia fallan
- **Por qué:** la auditoría de `personal@nexoai.test` registró a las 19:56:45 dos renovaciones con el mismo token separadas por 227 ms. La API lo tomó como un robo y cerró la sesión. Era la web renovando dos veces a la vez, y habría pasado cada vez que caducara el acceso (15 minutos) con dos pestañas o dos cargas seguidas.

### T-023 · Armazón web de tres columnas

- **Habilita:** `design/ARQUITECTURA-VISUAL-WEB.md` §2, §3, §7 y §8 · R-32, R-36, R-40, R-42, R-43 · P-11. Añadida el 22 de octubre de 2026 a pedido del equipo, para tener la forma de la aplicación visible antes que las secciones
- **Depende de:** T-011
- **Contenido:**
  - Navegación de 72 px con Agenda, Tareas y Actividad, y Ajustes al pie. Ajustes se abre encima, se cierra con una equis y ofrece solo cerrar sesión (R-43, R-45).
  - Conversación de 528 px con su barra de entrada, el blanco inicial con tres ejemplos pulsables, y el estado «en espera» cuando el asistente no está disponible (R-42).
  - Lienzo de 840 px con la cabecera de cada sección, sus niveles o franjas, y sus estados vacíos.
  - Lienzo expandido (72 / 0 / 1368).
  - **Sin asistente detrás** (fase 2). Un mensaje enviado queda en la conversación como «en espera», con la garantía de que no se envió ni se creó nada. No se simulan respuestas.
- **Hecho cuando:** una persona con sesión ve las tres columnas; cambia de sección y cambia el lienzo; escribe o elige un ejemplo y ve su mensaje en espera; expande y contrae el lienzo; cierra sesión desde Ajustes
- **Prueba:** `web.armazon`
- **Estado:** hecha · 22 de octubre de 2026. 70 pruebas en el monorepo. Revisada a mano en el navegador
- **Notas de implementación:**
  - Componente cliente `src/app/aplicacion/aplicacion.tsx`; secciones, cortes y ejemplos en `secciones.ts`; iconos geométricos provisionales en `iconos.tsx`, declarados como tales (diseño §7).
  - **La conversación no persiste.** Un mensaje enviado vive solo en la pantalla, porque el asistente y la cola de Operaciones (T-012) todavía no existen. El aviso lo dice: «No se ha enviado a nadie ni se ha creado nada».
  - El lienzo de Agenda dice que hace falta el permiso de calendario (REQ-ACC-08), porque la agenda se muestra a partir de Google (AD-10).
  - En pantallas de menos de 1440 px se estrechan la conversación y el lienzo; por debajo de unos 710 px aparece desplazamiento horizontal. Que la web sea solo para escritorio se asumió aquí sin decidirlo: queda abierto como **H-WEB-01** en `SPEC.md` §8 (registrado el 22 de octubre de 2026).
  - Pendiente del diseño: el vaciado de la conversación con su advertencia (§5), el blanco «fuera del plan» y la regla del clic a media conversación (§7). No hacen falta mientras no haya propuestas que confirmar.
  - **Las pruebas de la web no corren si hay un `next dev` abierto en `apps/web`**: Next.js 16 no admite dos a la vez sobre el mismo proyecto.

### T-022 · Pantalla «Conectar Google» en la web

- **Satisface:** REQ-ACC-06 (interfaz)
- **Depende de:** T-007, T-011
- **Contenido:** `WEB-v2 / Acceso / 03 Conectar Google`: cada permiso con su explicación, concedido por separado
- **Hecho cuando:** desde la web se concede cada alcance por separado y su estado se refleja
- **Prueba:** `acceso.conectar-google-por-permiso`
- **Estado:** hecha · 22 de octubre de 2026. Probada con una cuenta real de Google
- **Notas de implementación:** Los permisos viven en **Ajustes**, cada uno con su explicación, su estado y su botón «Conectar»; Agenda ofrece «Conectar mi calendario» mientras falte. Al volver de Google aparece un aviso según el resultado. **Defecto encontrado en la prueba real:** con cookies `SameSite=Strict`, la vuelta desde Google perdía la sesión; se pasó a `Lax` y una prueba simula volver desde otro sitio.

---

### T-026 · El colaborador con el Plan Empresarial, sin autoridad para delegar

- **Satisface:** REQ-ACC-13, REQ-ACC-14, REQ-ACC-15 · D-17 (a y b) enmendada
- **Depende de:** T-004, T-007
- **Contenido:** según el plan §5.5: toda ruta declara `@SobreLoPropio()` o `@SoloResponsable()`, y `RolGuard` rechaza al colaborador las segundas y las que no declaran nada; los tipos de Operación pueden ser `soloResponsable`; los dos permisos de Google para el colaborador; retirar `/solo-movil` de la web; cambiar las pruebas que hoy comprueban la denegación por defecto, como la de T-015 sobre la agenda
- **Hecho cuando:** un colaborador consulta su agenda y conecta el correo; una ruta `@SoloResponsable()` y una Operación `soloResponsable` le responden `ROL_NO_PERMITIDO` sin ejecutar nada; una prueba falla si una ruta no declara su alcance; el colaborador entra en la web y ve la aplicación
- **Pruebas:** `acceso.colaborador-solo-ve-lo-suyo` (se reescribe), `acceso.solo-el-responsable-asigna-tareas`, `acceso.toda-ruta-declara-su-alcance`, `acceso.colaborador-con-los-dos-permisos` (sustituye a `acceso.colaborador-solo-calendario`)
- **Estado:** hecha · 23 de octubre de 2026. 4 pruebas nuevas y 4 reescritas
- **Notas de implementación:**
  - `@SobreLoPropio()` y `@SoloResponsable()` sustituyen a `@PermitidoPara('colaborador')`. Van en la clase del controlador: autenticación, perfil, Google, Operaciones y agenda son de lo propio.
  - `RolGuard` cierra al colaborador las rutas del responsable **y las que no declaran alcance**. La prueba `acceso.toda-ruta-declara-su-alcance` recorre los controladores de la aplicación; quitar la marca de la agenda la hace fallar señalando sus dos rutas.
  - `EjecutorOperacion.soloResponsable`: `POST /operaciones` lo rechaza al colaborador antes de proponer, y también al confirmar, por si su rol cambió entre medias.
  - Google ofrece los dos permisos a toda cuenta. La web ya no envía al colaborador a `/solo-movil`, que se retiró; le muestra la aplicación entera, sin la franja «Encargadas».
  - **Pendiente del análisis por plan:** los ejemplos de la conversación de Tareas sugieren delegar también al colaborador y a quien no tiene el Plan Empresarial.
  - Al empezar, Docker Desktop no arrancaba: había quedado un archivo `dockerInference` de la sesión anterior; el equipo lo borró.

### T-027 · Cambiar la zona horaria desde Ajustes, en la web

- **Satisface:** REQ-ACC-10, REQ-ACC-11 (interfaz) · R-34, DP-01
- **Depende de:** T-009, T-023
- **Origen:** pedido del equipo el 23 de octubre de 2026, tras T-009
- **Contenido:** en Ajustes, junto a la zona horaria, «Cambiar»: un selector como el del primer ingreso, que propone `perfil.cambiar_zona_horaria` como control directo y muestra su tarjeta de confirmación con los compromisos que se verán a otra hora. «Confirmar el cambio» lo aplica; «Cancelar» descarta la propuesta. Al confirmar, la aplicación se vuelve a cargar con la zona nueva
- **Hecho cuando:** la tarjeta se ve antes de cambiar nada; cancelar no cambia la zona; confirmar la cambia y la agenda pasa a mostrarse en la zona nueva
- **Prueba:** `acceso.cambiar-zona-desde-ajustes` (extremo a extremo)
- **Estado:** hecha · 23 de octubre de 2026. 1 prueba de extremo a extremo
- **Notas de implementación:**
  - `src/app/aplicacion/cambio-zona.tsx`, dentro de la fila «Zona horaria» de Ajustes: «Cambiar zona horaria» → selector → «Ver qué cambia» → tarjeta de confirmación → «Confirmar el cambio» o «Cancelar».
  - La tarjeta se pinta tal como la devuelve la API; la web no calcula qué compromisos cambian. Cancelar descarta la Operación.
  - Tras confirmar, la acción de servidor llama a `refresh()` (Next.js 16) y la página llega con el perfil y la agenda en la zona nueva, sin cerrar Ajustes.
  - La lista de zonas, que ya usaba el primer ingreso, pasa a `src/lib/zonas.ts` y la comparten las dos pantallas.
  - Para la prueba, una cuenta de extremo a extremo con un compromiso que cae «hoy» en Lima y en Tokio.

### T-028 · Acceso en el móvil

- **Satisface:** REQ-ACC-02, REQ-ACC-03, REQ-ACC-04, REQ-ACC-05 (interfaz móvil) · plan §5.6
- **Depende de:** T-004, T-005, T-020
- **Origen:** detectada el 24 de octubre de 2026 al empezar T-021: el móvil no tenía cómo entrar. Es parte del hito del presentable (`SPEC.md` §10)
- **Contenido:** pantallas Entrar y Primer ingreso en el móvil, con los mismos mensajes que la web; sesión en el almacenamiento seguro y renovación; salir; orígenes de navegador permitidos en la API (`CORS_ORIGENES`); cómo probarlo en un teléfono con Expo Go
- **Hecho cuando:** en Expo web, una cuenta entra, completa el primer ingreso eligiendo su zona, llega a la aplicación y sale; unas credenciales erróneas dan el mismo mensaje que en la web; la API rechaza un origen de navegador que no está en la lista
- **Pruebas:** `movil.acceso-recorrido` (extremo a extremo), `plataforma.cors-solo-origenes-listados`
- **Estado:** hecha · 24 de octubre de 2026. 4 pruebas nuevas. **Probada por el equipo en un teléfono Android** con Expo Go, contra la API de desarrollo por la IP del equipo
- **Notas de implementación:**
  - `apps/movil/src/sesion.ts`: los dos tokens en `expo-secure-store` en el teléfono y en memoria en Expo web; si el acceso caducó, se renueva una vez y se repite la petición; si tampoco vale, se borra la sesión y se vuelve a Entrar.
  - Pantallas `entrar.tsx` y `primer-ingreso.tsx`, con los mismos textos y mensajes que la web. La zona se busca escribiendo y se toca en la lista, o se usa la del teléfono; empieza sin elegir.
  - `inicio.tsx`: las tres secciones con pestañas abajo y Ajustes en la cabecera, encima y con «Cerrar», con el perfil y «Cerrar sesión». Agenda la rellena T-021. Botones con palabras y no iconos de texto, que algunos teléfonos pintan como emoji.
  - La API admite solo los orígenes de `CORS_ORIGENES` (`src/plataforma/cors.ts`).
  - Las pruebas del móvil arrancan su propia API sobre `nexoai_e2e_movil_prueba`, en el puerto 3103, con `apps/movil/e2e/cuentas.json`. El script de la web acepta ahora esas tres variables.
  - **Cómo probarlo en el teléfono:** `EXPO_PUBLIC_API_URL=http://<IP del equipo>:3000`, `npx pnpm@12.10.1 --filter @nexoai/movil start` y abrir el código QR con Expo Go. El firewall de Windows puede pedir permitir el puerto 3000.

### T-121 · Cambiar la contraseña desde Ajustes

- **Satisface:** REQ-ACC-18 · H-ACC-02
- **Depende de:** T-004, T-005, T-027
- **Contenido:** `PATCH /acceso/contrasena { actual, nueva }` con `@SobreLoPropio()`; reutiliza la validación de 12 caracteres y el cierre de sesiones de `autenticacion.service.ts` (lo mismo que REQ-ADM-14, pero lo pide la propia cuenta), y deja el evento de auditoría `contrasena.cambiada`. En Ajustes de la web, debajo de «Cambiar zona horaria», con el mismo patrón de tarjeta; en el móvil, igual. Es un control directo: no pasa por el asistente ni por una Operación, porque no tiene efecto externo
- **Hecho cuando:** con la actual correcta cambia y cierra las demás sesiones; con la actual incorrecta, la nueva corta o igual a la actual, un solo error y nada cambia
- **Pruebas:** `acceso.cambiar-contrasena` · una de extremo a extremo en la web
- **Estado:** pendiente · después del 26 de noviembre de 2026

### T-122 · Puerto de correo saliente

- **Satisface:** PT-3 (propuesta del 25 de noviembre de 2026, pendiente de aval) · P-06 por analogía. Tarea de infraestructura (`SPEC.md` §2.2)
- **Depende de:** el aval de PT-3
- **Contenido:** `apps/api/src/plataforma/correo/`: puerto `EnviadorCorreo` con `CorreoSimulado` (en memoria, cuenta los envíos) y `CorreoSmtp` (sirve para Mailpit y para producción, sin SDK de proveedor), elegido con `CORREO_PROVEEDOR`; `CORREO_SMTP_URL` y `CORREO_REMITENTE` en `.env`. Mailpit en `docker-compose.yml`, puertos 1025 y 8025. Una prueba impide usar un cliente de correo fuera de esa carpeta, como la de P-06 para el modelo
- **Hecho cuando:** un envío de prueba llega al buzón de Mailpit en desarrollo y al simulado en las pruebas, y ninguna prueba sale a internet
- **Pruebas:** `plataforma.correo-solo-por-el-puerto`, `plataforma.correo-simulado`
- **Estado:** pendiente · bloqueada por PT-3

### T-123 · Restablecer la contraseña por enlace

- **Satisface:** REQ-ACC-19
- **Depende de:** T-122
- **Contenido:** migración nueva con `restablecimiento_contrasena` (perfil, hash del token, vence en, usado en), en `MODELOS_CON_ORGANIZACION`. `POST /acceso/restablecer { correo }`, público, con el mismo limitador que el ingreso y siempre 200; `POST /acceso/restablecer/confirmar { token, nueva }`. Token de 32 bytes aleatorios del que solo se guarda el hash; un pedido nuevo invalida los anteriores; usarlo cierra todas las sesiones. Pantallas `/restablecer` en la web y el móvil, y «¿Olvidaste tu contraseña?» en Entrar
- **Hecho cuando:** un correo inexistente recibe la misma respuesta y no se envía nada; un enlace válido cambia la contraseña y cierra las sesiones; uno vencido o usado falla con el mismo mensaje; el correo simulado recibió exactamente uno
- **Pruebas:** `acceso.restablecer`
- **Estado:** pendiente · bloqueada por PT-3 (espera a T-122)

---

**Fuera de este desglose:** ~~la contraseña olvidada (no tiene requisito)~~ desde el 25 de noviembre de 2026 es REQ-ACC-19 (T-123). La variante móvil de Acceso pasó a T-028.
