# Tareas — Tareas personales (CUN-03)

> **Estado de la implementación (11 de noviembre de 2026).** Implementado a pedido de Aixa antes del aval del equipo: modelo y migración `20261111200000_tareas`, contratos, operaciones, herramientas del agente y secciones Tareas de web y móvil. Probado en Windows el 11 de noviembre de 2026 con Docker (PostgreSQL y Redis): `npx pnpm@12.10.1 verificar` en verde, con 264 pruebas de la API (incluidas las de Redis), 16 de contratos, 24 de Playwright en la web y 14 en el móvil (`movil.tareas-franjas` y `movil.tareas-completar`, nuevas), y la trazabilidad limpia. Al ejecutarlo se corrigió: la sección Tareas del móvil no estaba conectada (mostraba el vacío de Actividad); el guion del modelo simulado no reconocía fechas ni «¿qué tengo pendiente?»; la tarea no guardaba la Operación que la creó (`operacion_id`, §3 del plan). Diferencias con lo planeado: para la agenda existe la ruta `GET /tareas/en-fechas` (en lugar de un campo nuevo en la respuesta de agenda), **pero ninguna pantalla la usa todavía**, así que la tarea con fecha no aparece en Hoy (T-050) y la herramienta que registra es `captura.guardar_tarea`, ampliada, que propone la Operación `tareas.registrar`. **Corrección del 25 de noviembre de 2026**, tras la auditoría de la rama: los estados de `tasks.md` reflejan ya el avance real («en curso»); ninguna pasa a «hecha» hasta el aval.


**Plan:** `specs/08-tareas-personales/plan.md` (borrador del 11 de noviembre de 2026, pendiente de aval)
**Numeración:** sigue a `specs/07-agente/tasks.md`, que llega a T-045.
**Regla:** una tarea cabe en una sesión de trabajo. Termina cuando se cumple su «Hecho cuando», su prueba pasa y `python tools/trazabilidad.py --check` sigue limpio.
**Prerrequisito:** el equipo avala el spec y el plan. Hasta entonces, todas están `pendiente` y no se empieza ninguna.

Estados: `pendiente` · `en curso` · `hecha`.

---

## 1. Dominio y API (fase 1)

### T-046 · Entidad `tarea`, migración y esquemas

- **Satisface:** habilita REQ-CUN03-03, 05, 06, 07, 10 · plan §3
- **Depende de:** T-012
- **Contenido:** modelo `Tarea` y su migración en `apps/api/prisma/schema.prisma`; restricciones del plan §3; `tarea` en el filtro por organización; `packages/contratos/src/tareas.ts` con las cargas de `tareas.registrar`, `tareas.actualizar` y `tareas.completar`, la tarea de la API y las franjas
- **Hecho cuando:** la migración se aplica sin errores (Prisma Migrate no revierte: el SQL inverso está en el plan §3); una fila con `hora` y sin `fecha` es rechazada por la base; los esquemas validan y rechazan ejemplos de cada Operación
- **Prueba:** `tareas.modelo-y-restricciones`, `contratos.tareas`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Migración `20261111200000_tareas`, restricciones y contratos hechos. Pruebas `tareas.modelo-y-restricciones` y `contratos.tareas` añadidas el 25 de noviembre de 2026. Sin aval

### T-047 · Funciones puras de franja, atrasada y orden

- **Satisface:** REQ-CUN03-03 · decisiones 3 y 4 · P-02
- **Depende de:** T-046
- **Contenido:** `clasificarFranja`, `estaAtrasada` y `ordenarFranja` en `apps/api/src/tareas/`; sin acceso a base ni al modelo
- **Hecho cuando:** una tarea con fecha de ayer es atrasada y una de hoy no; una sin fecha nunca es atrasada; una «esperando» va a su franja aunque tenga fecha; el orden de la decisión 3 se cumple; cambiar la zona del perfil no mueve una fecha sin hora
- **Prueba:** `tareas.franjas-y-atrasadas`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Hecho en código con su prueba (`tareas.franjas-y-atrasadas`). Sin aval

### T-048 · Operaciones `tareas.registrar`, `tareas.actualizar` y `tareas.completar`

- **Satisface:** REQ-CUN03-01, 05, 06, 07 · AD-09 · P-03, P-07
- **Depende de:** T-046, T-047
- **Contenido:** `TareasModule` con `TareasRepositorio` filtrado por propietario y los tres ejecutores registrados en `RegistroOperaciones`, cada uno con su `VistaConfirmacion` (antes y después en actualizar); cancelar como variante de actualizar; reabrir como variante de completar; `espera_de` y `espera_que` sin envío ni notas
- **Hecho cuando:** ninguna Operación escribe antes de confirmarse; confirmar dos veces ejecuta una; descartar no crea nada; cancelar deja la fila con `estado = cancelada`; una tarea «esperando» no genera ningún mensaje ni nota
- **Prueba:** `tareas.registrar-propone-y-confirma`, `tareas.sin-fecha-no-inventa`, `tareas.actualizar-muestra-antes-y-despues`, `tareas.cancelar-no-borra`, `tareas.completar-y-reabrir`, `tareas.esperando-no-contacta`, `tareas.cambios`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Las tres Operaciones hechas, con sus pruebas. Sin aval

### T-049 · Rutas de consulta y control directo

- **Satisface:** REQ-CUN03-03, 05, 10 · DP-01 · plan §5
- **Depende de:** T-048
- **Contenido:** `GET /tareas`, `GET /tareas/:id`, `POST /tareas/:id/completar` y `/reabrir` (crean la Operación ya ejecutada, `origen = control_directo`); `tarea` en la prueba de aislamiento
- **Hecho cuando:** `GET /tareas` devuelve las tres franjas ordenadas y con el indicador de atrasada; completar por la ruta directa no pide tarjeta y queda en el registro; un gerente no obtiene tareas personales ajenas
- **Prueba:** `tareas.rutas-de-consulta`, `tareas.aislamiento-por-perfil`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Rutas y control directo hechos (`tareas.rutas-de-consulta`, `tareas.aislamiento-por-perfil`). `GET /tareas/en-fechas` y `?estado=` no estaban en el plan §5: anotados allí. Sin aval

### T-050 · Tarea con fecha en la agenda del día

- **Satisface:** REQ-CUN03-08 · decisiones 4 y 5
- **Depende de:** T-049
- **Contenido:** la respuesta de agenda del día incluye `tareas` aparte de `eventos`; una tarea con fecha y sin hora va después de lo de todo el día; `detectarConflictos()` y los puntos de Mes no las reciben
- **Hecho cuando:** con una tarea y un compromiso a la misma hora, Hoy devuelve los dos por separado; no se crea ningún evento en el calendario simulado; proponer o confirmar un compromiso a esa hora no declara conflicto
- **Prueba:** `agenda.tarea-no-es-conflicto`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Solo la ruta `GET /tareas/en-fechas`: **ninguna pantalla la usa todavía**, así que la tarea con fecha no aparece en Hoy. Se hace después de elegir implementación (INC-20)

---

## 2. Asistente (fase 2)

### T-051 · Herramientas `tareas.*` y `captura.guardar_tarea` que propone de verdad

- **Satisface:** REQ-CUN03-01, 02, 04, 05, 06 · plan §7 · H-TAR-02
- **Depende de:** T-048
- **Contenido:** `herramientas-tareas.ts` en `apps/api/src/agente/herramientas/` con `tareas.consultar`, `tareas.registrar`, `tareas.completar` y `tareas.actualizar`; lista de pendientes armada por código, como `lista-agenda.ts`; `captura.guardar_tarea` propone una Operación y solo guarda en espera si las tareas no están disponibles; instrucciones y guion de demostración al día; la nota de continuidad incluye las tareas; los resultados se marcan como contenido externo
- **Hecho cuando:** «recuérdame pagar el recibo el viernes» muestra la tarjeta y no crea nada hasta confirmar; «tengo que renovar mi pasaporte» propone sin fecha; «hoy me encontré con Juan en el banco» no propone nada; «¿qué tengo pendiente?» lista exactamente las pendientes; «marca como hecha la del recibo» propone con tarjeta
- **Prueba:** `agente.apunte-no-es-tarea`, `agente.consultar-pendientes`, `agente.herramientas-de-tareas` (con guion), `agente.evaluacion` (a mano, casos de tarea)
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Herramientas y guion hechos. Pruebas `agente.apunte-no-es-tarea`, `agente.consultar-pendientes` y `agente.herramientas-de-tareas` añadidas el 25 de noviembre de 2026. Falta `agente.evaluacion` con casos de tarea (a mano, gasta cuota de Groq). Sin aval

### T-052 · Conversión de lo que estaba en espera

- **Satisface:** REQ-CUN03-09 · REQ-AGT-02 · P-11 · decisión 27 de `07-agente`
- **Depende de:** T-051
- **Contenido:** `trabajador-en-espera.ts` convierte cada tarea en espera en una propuesta `tareas.registrar`, con `capturada_en` como referencia de «el viernes»; descartar cierra la solicitud sin crear nada; ajustar REQ-AGT-02 en `07-agente/spec.md` y la decisión 2 del §11 de `01-captura/spec.md`
- **Hecho cuando:** «recuérdame pagar el recibo el viernes», guardado en espera un miércoles, aparece como propuesta para el viernes de esa semana y no existe tarea hasta confirmar; descartarla no crea nada y la saca de la espera
- **Prueba:** `agente.en-espera-tarea-a-propuesta`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Hecho en código (`agente.en-espera-tarea-a-propuesta`). REQ-AGT-02 y la decisión 2 de `01-captura` quedan reescritas como propuesta hasta el aval (INC-19). Sin aval

---

## 3. Pantallas

### T-053 · Web: sección Tareas

- **Satisface:** REQ-CUN03-03, 05 · DP-01
- **Depende de:** T-049
- **Contenido:** sección Tareas en `apps/web` con las franjas «con fecha», «sin fecha» y «esperando de alguien», el indicador de atrasada, el detalle y «Hecho» / reabrir de un toque; la tarea con fecha se ve en Hoy como bloque distinto de un compromiso (T-050)
- **Hecho cuando:** una persona con una tarea de cada tipo ve cada una en su franja; «Hecho» la saca de la lista sin tarjeta y se puede reabrir; el bloque de Hoy se distingue del compromiso
- **Prueba:** `web.tareas-franjas`, `web.tareas-completar`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Franjas y «Hecho» hechos (`web.tareas-franjas`, `web.tareas-completar`). **Falta reabrir desde la pantalla** y el bloque en Hoy (T-050)

### T-054 · Móvil: sección Tareas

- **Satisface:** REQ-CUN03-03, 05
- **Depende de:** T-049
- **Contenido:** lo mismo en `apps/movil`, siguiendo `design/ARQUITECTURA-VISUAL-MOVIL.md` (regla tarea o apunte)
- **Hecho cuando:** igual que T-053, en el teléfono
- **Prueba:** `movil.tareas-franjas`, `movil.tareas-completar`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** Franjas y «Hecho» hechos (`movil.tareas-franjas`, `movil.tareas-completar`). **Falta reabrir desde la pantalla** y el bloque en Hoy (T-050)

---

## 4. Cierre

### T-055 · Documentación y trazabilidad

- **Satisface:** consistencia del repositorio
- **Depende de:** T-052, T-053, T-054
- **Contenido:** `SPEC.md` §5, §6 (CUN-03 a «Especificado») y §11; entrada **Tarea** del glosario con «personal» y los tres estados; `"CUN03": "1"` en `tools/trazabilidad.py`; regenerar `specs/trazabilidad.md`
- **Hecho cuando:** `python tools/trazabilidad.py --check` sale limpio y los diez requisitos tienen tarea y prueba
- **Prueba:** `python tools/trazabilidad.py --check`
- **Estado:** en curso
- **Avance (25 de noviembre de 2026):** `SPEC.md`, glosario, `trazabilidad.py` y `trazabilidad.md` al día el 25 de noviembre de 2026. CUN-03 sigue «en borrador» hasta el aval
