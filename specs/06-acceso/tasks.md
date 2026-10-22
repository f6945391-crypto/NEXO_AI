# Tareas — Acceso

**Plan:** `specs/06-acceso/plan.md` (aprobado el 22 de octubre de 2026)
**Numeración:** `T-nnn` es única en todo el proyecto. Las tareas de agenda siguen en `specs/02-agenda/tasks.md` desde T-012.
**Regla:** una tarea cabe en una sesión de trabajo. Termina cuando se cumple su «Hecho cuando», su prueba pasa y `python tools/trazabilidad.py --check` sigue limpio.

Estados: `pendiente` · `en curso` · `hecha`.

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
- **Prueba:** `acceso.sin-registro-abierto`
- **Estado:** pendiente

### T-003 · Contexto de solicitud y aislamiento por organización

- **Habilita:** P-04 · propuesta técnica §9
- **Depende de:** T-002
- **Contenido:** `ContextoSolicitud` con `{ perfilId, organizacionId, rol, plan }`; extensión del cliente Prisma que filtra por organización en toda tabla que la tenga
- **Hecho cuando:** una consulta hecha con el contexto de la organización A no devuelve filas de la B, en ninguna tabla con `organizacion_id`
- **Prueba:** `plataforma.aislamiento-entre-organizaciones`
- **Estado:** pendiente

---

## 1. Cuenta y sesión

### T-004 · Ingreso y sesión

- **Satisface:** REQ-ACC-02, REQ-ACC-03 · H-ACC-03
- **Depende de:** T-003
- **Contenido:** `POST /auth/ingreso`, `/auth/renovar` y `/auth/salida`; argon2id; verificación contra un hash ficticio cuando el correo no existe; error único `CREDENCIALES_INVALIDAS`; JWT de 15 minutos y renovación rotativa de 30 días con detección de reutilización; límite de 5 intentos por minuto
- **Hecho cuando:** un ingreso correcto devuelve rol y plan; un correo inexistente y una contraseña errónea dan la misma respuesta; reutilizar un token ya rotado revoca su familia
- **Pruebas:** `acceso.ingreso-devuelve-rol`, `acceso.error-no-revela-correo`
- **Estado:** pendiente

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

- **Satisface:** REQ-ACC-06, REQ-ACC-07
- **Depende de:** T-004
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

- **Satisface:** REQ-ACC-02 a REQ-ACC-06 (interfaz) · H-ACC-05
- **Depende de:** T-005, T-007, T-010
- **Contenido:** `WEB-v2 / Acceso / 01 Entrada`, `02 Primer ingreso` y `03 Conectar Google`, según el diseño. La zona horaria puede venir preseleccionada, pero hay que elegirla
- **Hecho cuando:** el recorrido completo funciona contra la API y no se puede enviar el primer ingreso sin elegir zona horaria
- **Prueba:** `acceso.zona-horaria-requiere-eleccion`
- **Estado:** pendiente

---

**Fuera de este desglose:** la variante móvil de Acceso (falta su diseño, spec §4) y la contraseña olvidada (no tiene requisito).
