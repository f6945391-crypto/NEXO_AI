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
- **Estado:** hecha · 22 de octubre de 2026. 10 pruebas; 97 en el monorepo. Sin la condición que reclama la operación, la prueba de confirmaciones simultáneas falla
- **Notas de implementación:**
  - Tabla `operacion` (tercera migración) y módulo `OperacionesModule`, global, con `RegistroOperaciones`: cada módulo de dominio registra los ejecutores de sus tipos al iniciarse.
  - Un ejecutor declara su esquema de carga, cómo se propone (la `VistaConfirmacion`: acción, datos, qué es irreversible y si se puede confirmar) y cómo se ejecuta. `ejecutar` es el único sitio donde una operación produce efecto.
  - Desenlaces probados: ejecutada (idempotente), no confirmable, vuelve a propuesta si algo cambió (H-AG-07), fallida con su motivo, descartada.
  - Idempotencia con una actualización condicional atómica en lugar de `SELECT … FOR UPDATE` (ajuste anotado en el plan §3.2).
  - `Operacion` entra en el filtro por organización, y la prueba de aislamiento cubre ya cuatro tablas.
  - Todavía no hay tipos reales: los primeros llegan con T-017 (`agenda.registrar`) y T-009 (`perfil.cambiar_zona_horaria`).

---

## 2. Calendario y réplica

### T-013 · Puerto del proveedor de calendario

- **Habilita:** AD-10 · plan §2
- **Depende de:** T-008
- **Contenido:** interfaz `ProveedorCalendario` (listar con sincronización incremental, crear, actualizar, cancelar); implementación para Google Calendar sobre `ClienteGoogle`; implementación simulada en memoria que cuenta llamadas
- **Hecho cuando:** la implementación simulada pasa las mismas pruebas de contrato que se usarán para la real; la real se probó a mano una vez con una cuenta de prueba
- **Prueba:** `calendario.contrato-del-proveedor`
- **Estado:** hecha · 22 de octubre de 2026. 10 pruebas contra el simulado. **Lectura real probada** con `personal@nexoai.test` (`probar-calendario --solo-lectura`, y `GET /agenda/eventos` de punta a punta): Google entrega el token de sincronización también con la lectura acotada por fechas. La primera vez respondió `403 SERVICE_DISABLED`, porque la API de Google Calendar no estaba habilitada en el proyecto de Google Cloud; el equipo la habilitó. Los pasos de escritura del contrato todavía no se ejecutaron contra Google
- **Notas de implementación:**
  - `src/integraciones/calendario/`: el puerto (`proveedor-calendario.ts`), la implementación sobre Google (`google-calendar.ts`, sin SDK, con `ClienteGoogle`) y la simulada (`calendario-simulado.ts`).
  - **El contrato es código, no solo una prueba** (`contrato.ts`): la prueba lo ejecuta contra la simulada y `pnpm --filter @nexoai/api probar-calendario -- --correo <correo>` contra Google con la base de desarrollo. Crea un evento dentro de 30 días, lo cambia y lo cancela; con `--solo-lectura` solo lee.
  - Lo borrado en Google llega como cambio `cancelado`, no desaparece (R-25). Cancelar dos veces no falla (P-07).
  - Los eventos de todo el día empiezan y terminan a medianoche de su zona. Un evento sin zona propia toma la del calendario, que Google da en cada lectura.
  - Ante un error, la persona solo ve `GOOGLE_NO_DISPONIBLE`; el motivo real de Google queda en el registro del servidor.
  - La simulada cuenta lecturas y escrituras, y deja simular lo que se hace directamente en Google: crear, cambiar, borrar y que caduque el token (el `410`).

### T-014 · Réplica y sincronización

- **Satisface:** REQ-CUN01-09, REQ-CUN01-10 · H-AG-03, H-AG-04, H-AG-06
- **Depende de:** T-013
- **Contenido:** `evento_agenda` y `sincronizacion_calendario`; sincronización inicial (−30 días a +365 días, `singleEvents=true`), incremental con `syncToken` en un trabajo de BullMQ y repetición completa ante `410`; un borrado en Google se marca `cancelado` (R-25)
- **Hecho cuando:** tras sincronizar contra el proveedor simulado, la réplica refleja altas, cambios y borrados; cada evento conserva su zona horaria; solo se lee el calendario principal
- **Pruebas:** `agenda.solo-eventos-propios`, `agenda.horas-con-zona-horaria`
- **Estado:** hecha · 22 de octubre de 2026. 10 pruebas, también `agenda.sincronizacion-periodica`, que pasa por BullMQ sobre un Redis real
- **Notas de implementación:**
  - Tablas `evento_agenda` y `sincronizacion_calendario` (sexta migración); las dos entran en el filtro por organización y la prueba de aislamiento cubre ya seis tablas.
  - `SincronizadorCalendario`: incremental si hay token y la ventana está vigente; completa si no, o ante el `410`. Una sola sincronización a la vez por perfil dentro de un proceso.
  - `ReplicaEventosRepositorio` filtra siempre por el perfil, además de la organización (REQ-CUN01-09).
  - Proceso trabajador nuevo, `dist/trabajador.js`: cada 5 minutos un trabajo `repasar` encola un `sincronizar` por perfil conectado, sin duplicados y con un solo intento.
  - **BullMQ 6.3.11** e **ioredis 6.0.0**, las últimas con dos semanas. `msgpackr-extract`, una aceleración nativa opcional, queda sin permiso para ejecutar scripts.
  - Las pruebas usan el prefijo de cola `nexoai-prueba`, y la integración continua tiene ahora un servicio de Redis.
  - Ajustes del plan (§4) y hallazgo nuevo **H-AG-09**: la ventana se renueva leyendo completo cada 30 días.

### T-015 · Consulta de la agenda

- **Satisface:** REQ-CUN01-08, REQ-CUN01-09, REQ-CUN01-10, REQ-CUN01-11 (consulta)
- **Depende de:** T-014
- **Contenido:** `GET /agenda/eventos?desde=&hasta=` y `GET /agenda/eventos/:id`, con `@RequiereGoogle('calendar.events')` y sincronización bajo demanda si han pasado más de 2 minutos
- **Hecho cuando:** sin permiso no se llama al proveedor; con permiso se devuelven solo eventos propios, con su zona; la consulta funciona sin ningún proveedor de modelo configurado
- **Pruebas:** `agenda.sin-permiso-no-invoca-proveedor`, `agenda.consulta-sin-proveedor-de-modelo`
- **Estado:** hecha · 22 de octubre de 2026. 10 pruebas
- **Notas de implementación:**
  - El alcance se llama `calendario` en el código (`ALCANCES_GOOGLE`), no `calendar.events`: es la clave de `packages/contratos`, que apunta a ese permiso de Google.
  - Contrato `EventoAgenda` en `packages/contratos/src/agenda.ts`: horas en ISO 8601 con el desfase de la zona del evento («2026-10-26T10:00:00+01:00») y la zona IANA aparte. El rango pedido tiene que llevar desfase y no pasar de 366 días, lo que cubre la réplica.
  - Se devuelven también los cancelados, marcados como tales (R-25); el cliente decide cómo mostrarlos.
  - **Si Google no responde y ya hay réplica, se muestra la última copia** (lo existente sigue consultable, P-11). La primera vez no hay nada que mostrar y se responde `GOOGLE_NO_DISPONIBLE`. Un permiso retirado se avisa siempre.
  - El colaborador no tiene agenda propia en NexoAI (REQ-ACC-13): su calendario solo sirve para compartir disponibilidad, y la ruta le responde `ROL_NO_PERMITIDO`.
  - Código de error nuevo: `EVENTO_NO_ENCONTRADO`, también para un evento de otra persona.

---

## 3. Reglas deterministas

### T-016 · Conflictos y alternativas

- **Satisface:** REQ-CUN01-02, REQ-CUN01-05 (cálculo) · DP-02, H-AG-03
- **Depende de:** T-001
- **Contenido:** funciones puras `detectarConflictos()` y `generarAlternativas()` en el dominio de agenda, sin base de datos ni red
- **Hecho cuando:** una tabla de casos cubre cada punto de DP-02: misma duración, banda horaria, mismo día primero por cercanía, sin fin de semana, máximo tres, máximo siete días, y que los eventos de todo el día no bloquean
- **Prueba:** `alternativas.dp02`
- **Estado:** hecha · 22 de octubre de 2026. 11 pruebas unitarias. Con la regla del fin de semana desactivada fallan 3
- **Notas de implementación:**
  - `src/agenda/dominio/conflictos.ts` contiene `detectarConflictos()` y `generarAlternativas()`; `tiempo.ts` maneja la hora local de cualquier zona IANA sin librerías externas.
  - Dos eventos que solo se tocan no chocan. Los cancelados, los de todo el día y el propio evento que se modifica tampoco.
  - Tres detalles que DP-02 no decía y se añadieron a la decisión (plan §9, punto 7): horarios cada 15 minutos, alternativas sin solaparse entre sí y nunca en el pasado.
  - Una prueba cruza el cambio de horario de verano de Madrid (25 de octubre) y comprueba que el lunes a las 10:00 son las 09:00 UTC.

---

## 4. Operaciones de agenda

### T-017 · Registrar un compromiso

- **Satisface:** REQ-CUN01-02, REQ-CUN01-03, REQ-CUN01-04, REQ-CUN01-07 · H-AG-01
- **Depende de:** T-012, T-015, T-016
- **Contenido:** tipo `agenda.registrar`: esquema `PropuestaEvento`, `DATOS_FALTANTES`, consulta de solapes antes de proponer, ejecución en el proveedor y actualización de la réplica con la respuesta. `DURACION_POR_DEFECTO_MIN = 60` (H-AG-01, decidido por el equipo el 22 de octubre de 2026): si la carga no trae fin, el código lo calcula
- **Hecho cuando:** sin confirmar no hay llamadas de escritura al proveedor; al confirmar, el evento queda con los datos mostrados; con datos incompletos no se crea la operación
- **Pruebas:** `agenda.consulta-solapes-antes-de-proponer`, `agenda.sin-confirmar-no-escribe-ni-notifica`, `agenda.confirmar-registra-lo-mostrado`, `agenda.datos-faltantes-no-crea-operacion`
- **Estado:** hecha · 22 de octubre de 2026. 9 pruebas
- **Notas de implementación:**
  - `src/agenda/registrar-compromiso.ts`. La propuesta sincroniza antes de mirar los solapes, así ve también lo creado en Google hace un momento. Sin permiso de calendario no hay propuesta (REQ-CUN01-08).
  - **La propuesta guarda la carga completada**: fin calculado con `DURACION_POR_DEFECTO_MIN = 60` y zona del perfil si no venía. Al confirmar se registra exactamente eso, y el resultado es el evento tal como lo devolvió Google (REQ-CUN01-04).
  - La tarjeta muestra título, fecha, hora, zona («Hora de Lima (GMT-5)») y, si se usó la duración por defecto, que fue por no indicar el fin.
  - Un solape deja la propuesta sin poder confirmarse, con el motivo y el evento que la causa. Las alternativas y la nueva comprobación al confirmar son T-018.
  - Ajustes en Operaciones (T-012), anotados en el plan §3.3: `DATOS_FALTANTES` con la lista de campos, distinto de un dato inválido; los ejecutores pueden limitar su origen, y `agenda.registrar` solo admite `agente` (R-42, DP-01); `proponer` puede devolver la carga completada.
  - `AgendaModule` importa `OperacionesModule` aunque sea global: sin eso, el proceso trabajador no arrancaba. Lo detectó la prueba del trabajador.

### T-018 · Conflicto al proponer y al confirmar

- **Satisface:** REQ-CUN01-05 · H-AG-07
- **Depende de:** T-017
- **Contenido:** la propuesta incluye el evento que causa el conflicto y hasta tres alternativas, y no se puede confirmar. Al confirmar se vuelve a comprobar; si apareció un conflicto, la operación vuelve a `propuesta`
- **Hecho cuando:** los dos casos del criterio de aceptación se cumplen contra el proveedor simulado
- **Prueba:** `agenda.conflicto-identifica-causa-y-ofrece-alternativas`
- **Estado:** hecha · 23 de octubre de 2026. 3 pruebas nuevas. Sin la nueva comprobación al confirmar, la de H-AG-07 falla
- **Notas de implementación:**
  - La tarjeta de confirmación gana `conflicto`: los eventos que chocan (todos, no solo el primero) y hasta tres alternativas de `generarAlternativas()`, que también aparecen como texto en sus datos. Ajuste del plan §6.
  - **Elegir una alternativa es proponer de nuevo** con ese horario y descartar la anterior; no hace falta una ruta propia.
  - Al confirmar se vuelve a sincronizar y a revisar con la misma función que al proponer. Si ahora choca, no se escribe nada y la operación vuelve a `propuesta` con el conflicto y alternativas nuevas.
  - En esa nueva propuesta ya no aparece la nota «1 hora, porque no indicaste la hora de fin»: la carga guardada no recuerda que el fin se calculó. La hora mostrada sigue siendo la exacta.
  - **Defecto corregido de T-017:** sus pruebas usaban una fecha fija, el 6 de noviembre de 2026, y habrían fallado cuando esa fecha saliera de la ventana de la réplica. Ahora usan un viernes al menos diez días adelante, y el caso de otra zona usa Tokio, que no cambia de hora.

### T-019 · Modificar y cancelar

- **Satisface:** REQ-CUN01-06, REQ-CUN01-11 (control directo) · DP-01, H-AG-04, H-AG-05
- **Depende de:** T-017
- **Contenido:** tipos `agenda.modificar` y `agenda.cancelar`, con origen `agente` o `control_directo`; solo sobre la instancia elegida; se rechazan con explicación si el usuario no es el organizador
- **Hecho cuando:** cancelar exige confirmación; modificar una instancia no toca la serie; un evento ajeno se rechaza sin llamar al proveedor
- **Prueba:** `agenda.cancelar-requiere-confirmacion`
- **Estado:** hecha · 23 de octubre de 2026. 7 pruebas. Sin la comprobación del organizador, la de H-AG-05 falla
- **Notas de implementación:**
  - `agenda.modificar` (solo origen `agente`) y `agenda.cancelar` (`agente` y `control_directo`, DP-01). Ajustes del plan §6.
  - Un compromiso ajeno, ya cancelado o desconocido se rechaza **al proponer**, con `EVENTO_NO_MODIFICABLE` o `EVENTO_NO_ENCONTRADO` y su explicación, sin crear la operación ni escribir en Google. Al invitado se le recuerda que puede rechazar la invitación en Google Calendar (H-AG-05).
  - Modificar: lo que no se indica se toma del evento, y un inicio nuevo sin fin conserva la duración. La tarjeta muestra el antes y el ahora. Solo un horario nuevo se revisa (renombrar no tiene que resolver un solape que ya existía), y el propio evento no cuenta como solape.
  - **Revisión de horario compartida** (`revision-horario.ts`): conflicto, alternativas y nueva comprobación al confirmar son los mismos para registrar y modificar.
  - Un compromiso de todo el día no se cambia de hora desde aquí, aunque sí de título: H-AG-03 no dice cómo moverlo.
  - Cancelar quita el evento de Google y lo deja `cancelado` en la réplica (R-25). Si ya estaba cancelado al confirmar, no se vuelve a llamar a Google. La tarjeta dice qué es irreversible.
  - Todo, sobre la instancia elegida (H-AG-04). Las tarjetas dicen «No se avisa a nadie de este cambio»: hallazgo nuevo **H-AG-11**.
  - Las pruebas de agenda comparten `test/utilidades/fechas.ts`, con fechas relativas al día en que corren.

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
- **Depende de:** T-015, T-019, T-020, **T-028** (sin acceso en el móvil no hay agenda que mostrar; añadido el 24 de octubre de 2026)
- **Contenido:** nivel Hoy de la sección Agenda, con el huso visible; estado vacío cuya acción abre la capa de captura (de momento sin interpretación); detalle de un compromiso con «Cancelar compromiso» y su tarjeta de confirmación; aviso de asistente no disponible
- **Hecho cuando:** el recorrido coincide con los cuadros vigentes de `07 Móvil v2` y no existe ningún formulario de creación
- **Prueba:** `agenda.estado-vacio-abre-captura`
- **Estado:** pendiente

---

## 6. Interfaz web

### T-025 · Agenda en la web: Hoy

- **Satisface:** REQ-CUN01-10 (interfaz), REQ-CUN01-12 (web) · R-42 · H-AG-10
- **Depende de:** T-015, T-023
- **Origen:** pedido del equipo el 22 de octubre de 2026, para ver los compromisos reales antes de la fase 2. El móvil sigue en T-021
- **Contenido:** el nivel Hoy de la sección Agenda de la web muestra los compromisos del día en la zona del perfil, con la zona visible; los de todo el día primero; los de otra zona dicen también su hora allí; cancelados e invitados marcados. Estado vacío cuya acción lleva a la barra de entrada de la conversación (H-AG-10), sin formulario. Semana y Mes, de momento, dicen que llegan más adelante. Para probarlo sin Google, la API admite el calendario simulado fuera de producción
- **Hecho cuando:** con el calendario simulado, Hoy muestra los compromisos del día con su horario y su zona aunque el navegador esté en otra; sin compromisos, la acción enfoca la conversación; sin calendario, se ofrece conectarlo
- **Pruebas:** `agenda.horas-con-zona-horaria`, `agenda.estado-vacio-abre-captura` (extremo a extremo)
- **Estado:** hecha · 22 de octubre de 2026. 2 pruebas de extremo a extremo; `verificar` completo pasa con 155 pruebas. **Desvío del método:** el código se empezó antes de escribir esta tarea; la tarea, el plan y `SPEC.md` se completaron después, antes de probarlo y de hacer su commit
- **Notas de implementación:**
  - La página lee la agenda en el servidor (`src/lib/agenda.ts`) y la formatea allí: el navegador recibe el texto hecho, sin diferencias de formato entre servidor y navegador.
  - El día se calcula en la zona del perfil, de medianoche a medianoche con su desfase, también si ese día cambia la hora.
  - La API acepta `CALENDARIO_SIMULADO=1` para las pruebas de extremo a extremo y las demostraciones; en producción se niega a arrancar con él.
  - Probada a mano con `personal@nexoai.test` y un evento real de su calendario. Esa prueba mostró la lista centrada y encogida: Chrome aplica `place-items` también a un bloque normal, y el cuerpo del lienzo lo hereda del estado vacío. Se anula en la variante de lista.

---

**Fuera de este desglose:** las herramientas `agenda.*` del agente y su evaluación `agente.agenda.extrae-sin-inventar-fin` (fase 2), y los niveles Semana y Mes.
