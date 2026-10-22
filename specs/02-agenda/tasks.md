# Tareas — Agenda (CUN-01)

**Plan:** `specs/02-agenda/plan.md` (aprobado el 22 de octubre de 2026)
**Numeración:** sigue a `specs/06-acceso/tasks.md`, que va de T-001 a T-011.
**Regla:** una tarea cabe en una sesión de trabajo. Termina cuando se cumple su «Hecho cuando», su prueba pasa y `python tools/trazabilidad.py --check` sigue limpio.

Estados: `pendiente` · `en curso` · `hecha`.

---

## 1. Operaciones (transversal)

### T-012 · Operaciones: estados, confirmación e idempotencia

- **Satisface:** REQ-CUN01-03 (núcleo) · habilita AD-09, P-03, P-07, P-11
- **Depende de:** T-003
- **Contenido:** tabla `operacion`; máquina de estados del plan §3.2; `POST /operaciones`, `/:id/confirmar`, `/:id/descartar` y `GET /operaciones`; registro de ejecutores por `tipo`; transición a `ejecutada` con bloqueo de fila
- **Hecho cuando:** una operación de un tipo de prueba solo ejecuta su efecto al confirmarse; confirmar dos veces ejecuta una vez y devuelve el mismo resultado; descartar no ejecuta nada
- **Prueba:** `operaciones.confirmar-dos-veces-ejecuta-una`
- **Estado:** pendiente

---

## 2. Calendario y réplica

### T-013 · Puerto del proveedor de calendario

- **Habilita:** AD-10 · plan §2
- **Depende de:** T-008
- **Contenido:** interfaz `ProveedorCalendario` (listar con sincronización incremental, crear, actualizar, cancelar); implementación para Google Calendar sobre `ClienteGoogle`; implementación simulada en memoria que cuenta llamadas
- **Hecho cuando:** la implementación simulada pasa las mismas pruebas de contrato que se usarán para la real; la real se probó a mano una vez con una cuenta de prueba
- **Prueba:** `calendario.contrato-del-proveedor`
- **Estado:** pendiente

### T-014 · Réplica y sincronización

- **Satisface:** REQ-CUN01-09, REQ-CUN01-10 · H-AG-03, H-AG-04, H-AG-06
- **Depende de:** T-013
- **Contenido:** `evento_agenda` y `sincronizacion_calendario`; sincronización inicial (−30 días a +365 días, `singleEvents=true`), incremental con `syncToken` en un trabajo de BullMQ y repetición completa ante `410`; un borrado en Google se marca `cancelado` (R-25)
- **Hecho cuando:** tras sincronizar contra el proveedor simulado, la réplica refleja altas, cambios y borrados; cada evento conserva su zona horaria; solo se lee el calendario principal
- **Pruebas:** `agenda.solo-eventos-propios`, `agenda.horas-con-zona-horaria`
- **Estado:** pendiente

### T-015 · Consulta de la agenda

- **Satisface:** REQ-CUN01-08, REQ-CUN01-09, REQ-CUN01-10, REQ-CUN01-11 (consulta)
- **Depende de:** T-014
- **Contenido:** `GET /agenda/eventos?desde=&hasta=` y `GET /agenda/eventos/:id`, con `@RequiereGoogle('calendar.events')` y sincronización bajo demanda si han pasado más de 2 minutos
- **Hecho cuando:** sin permiso no se llama al proveedor; con permiso se devuelven solo eventos propios, con su zona; la consulta funciona sin ningún proveedor de modelo configurado
- **Pruebas:** `agenda.sin-permiso-no-invoca-proveedor`, `agenda.consulta-sin-proveedor-de-modelo`
- **Estado:** pendiente

---

## 3. Reglas deterministas

### T-016 · Conflictos y alternativas

- **Satisface:** REQ-CUN01-02, REQ-CUN01-05 (cálculo) · DP-02, H-AG-03
- **Depende de:** T-001
- **Contenido:** funciones puras `detectarConflictos()` y `generarAlternativas()` en el dominio de agenda, sin base de datos ni red
- **Hecho cuando:** una tabla de casos cubre cada punto de DP-02: misma duración, banda horaria, mismo día primero por cercanía, sin fin de semana, máximo tres, máximo siete días, y que los eventos de todo el día no bloquean
- **Prueba:** `alternativas.dp02`
- **Estado:** pendiente

---

## 4. Operaciones de agenda

### T-017 · Registrar un compromiso

- **Satisface:** REQ-CUN01-02, REQ-CUN01-03, REQ-CUN01-04, REQ-CUN01-07 · H-AG-01
- **Depende de:** T-012, T-015, T-016
- **Contenido:** tipo `agenda.registrar`: esquema `PropuestaEvento`, `DATOS_FALTANTES`, consulta de solapes antes de proponer, ejecución en el proveedor y actualización de la réplica con la respuesta. `DURACION_POR_DEFECTO` queda como parámetro sin valor
- **Hecho cuando:** sin confirmar no hay llamadas de escritura al proveedor; al confirmar, el evento queda con los datos mostrados; con datos incompletos no se crea la operación
- **Pruebas:** `agenda.consulta-solapes-antes-de-proponer`, `agenda.sin-confirmar-no-escribe-ni-notifica`, `agenda.confirmar-registra-lo-mostrado`, `agenda.datos-faltantes-no-crea-operacion`
- **Estado:** pendiente

### T-018 · Conflicto al proponer y al confirmar

- **Satisface:** REQ-CUN01-05 · H-AG-07
- **Depende de:** T-017
- **Contenido:** la propuesta incluye el evento que causa el conflicto y hasta tres alternativas, y no se puede confirmar. Al confirmar se vuelve a comprobar; si apareció un conflicto, la operación vuelve a `propuesta`
- **Hecho cuando:** los dos casos del criterio de aceptación se cumplen contra el proveedor simulado
- **Prueba:** `agenda.conflicto-identifica-causa-y-ofrece-alternativas`
- **Estado:** pendiente

### T-019 · Modificar y cancelar

- **Satisface:** REQ-CUN01-06, REQ-CUN01-11 (control directo) · DP-01, H-AG-04, H-AG-05
- **Depende de:** T-017
- **Contenido:** tipos `agenda.modificar` y `agenda.cancelar`, con origen `agente` o `control_directo`; solo sobre la instancia elegida; se rechazan con explicación si el usuario no es el organizador
- **Hecho cuando:** cancelar exige confirmación; modificar una instancia no toca la serie; un evento ajeno se rechaza sin llamar al proveedor
- **Prueba:** `agenda.cancelar-requiere-confirmacion`
- **Estado:** pendiente

---

## 5. Interfaz móvil

### T-020 · Andamiaje del móvil

- **Habilita:** AD-02, AD-08
- **Depende de:** T-001
- **Contenido:** `apps/movil` con Expo, consumiendo `packages/contratos`; elegir la herramienta de pruebas de extremo a extremo para móvil, que el plan no fija (Maestro, o Playwright sobre Expo web)
- **Hecho cuando:** la aplicación arranca en el simulador y en web; la herramienta elegida está anotada en `PROPUESTA-TECNICA.md` §4.1
- **Prueba:** `movil.arranca`
- **Estado:** hecha en web · 22 de octubre de 2026. **Falta probarla en un teléfono o simulador**: este equipo no tiene emulador. Se hace con Expo Go (`npx pnpm@12.10.1 --filter @nexoai/movil start`), poniendo en `EXPO_PUBLIC_API_URL` la IP del equipo en la red local
- **Notas de implementación:**
  - **Expo SDK 57.0.27**, con React Native 0.86.3 y React 19.2.3. Se descartó el SDK 58 porque su React Native 0.88.0 tiene una semana.
  - El móvil usa React 19.2.3 y la web 19.3.0. No es un problema: pnpm instala cada aplicación por separado.
  - Pruebas de extremo a extremo: **Playwright sobre Expo web** a 390×844, anotado en la propuesta técnica §4.1.
  - **Excepciones de auditoría:** `node-forge` (GHSA-86w9-cpqp-85rv) y `braces` (GHSA-vfj7-8cjw-p6xm), dos vulnerabilidades altas **sin versión corregida publicada**, en herramientas de desarrollo de Expo y Metro que no entran en la app. Están en `pnpm-workspace.yaml` con su motivo, para revisarlas en cada SDK.
  - Se creó a mano, sin el generador de plantillas de Expo, para que no entraran archivos sin revisar.
  - Las pruebas de la web y del móvil esperan hasta 20 s por cada comprobación: en `verificar` corren a la vez que las de la API y compilan cada ruta en su primera visita.

### T-021 · Agenda en el móvil: Hoy y cancelar

- **Satisface:** REQ-CUN01-06 (interfaz), REQ-CUN01-10, REQ-CUN01-11, REQ-CUN01-12
- **Depende de:** T-015, T-019, T-020
- **Contenido:** nivel Hoy de la sección Agenda, con el huso visible; estado vacío cuya acción abre la capa de captura (de momento sin interpretación); detalle de un compromiso con «Cancelar compromiso» y su tarjeta de confirmación; aviso de asistente no disponible
- **Hecho cuando:** el recorrido coincide con los cuadros vigentes de `07 Móvil v2` y no existe ningún formulario de creación
- **Prueba:** `agenda.estado-vacio-abre-captura`
- **Estado:** pendiente

---

**Fuera de este desglose:** las herramientas `agenda.*` del agente y su evaluación `agente.agenda.extrae-sin-inventar-fin` (fase 2), y los niveles Semana y Mes.
