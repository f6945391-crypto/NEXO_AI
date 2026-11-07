# Plan técnico — Tareas del equipo (CUN-07, CUN-08, CUN-09)

**Especificación:** `specs/03-tareas/spec.md` (REQ-CUN07-01 a 19, REQ-CUN08-01 a 07) y el encargo de `specs/04-comunicaciones/spec.md` §9 (REQ-ENC-01 a 13)
**Fase:** 4, bloques 4, 5 y 7 de `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §5 (tareas propuestas T-090 a T-102, T-108 y T-109)
**Decisiones que aplica:** AD-08, AD-09 · P-02, P-03, P-04, P-07, P-09, P-10, P-11 · DP-01, DP-03 · H-ADM-08, H-ADM-18, H-ADM-22
**Depende de:** `specs/08-administracion/plan.md` (pertenencia, equipos, autoridad por equipo, zona de empresa), `specs/09-tareas-personales/plan.md` (la sección Tareas y sus franjas), `specs/07-agente/plan.md` (herramientas y tarjeta)
**Estado:** **esbozo** del 7 de noviembre de 2026. Solo contiene la nota de ubicación de §1. El plan técnico completo se escribe cuando el equipo avale la especificación (§8 sigue en borrador) y decida INC-21 del carril de CUN-03

Este plan dice **dónde y cómo** se cumple cada requisito. No añade comportamiento: lo que tuvo que decidir y la especificación no decía vuelve a ella como hallazgo.

---

## 1. Dónde vive cada cosa desde el 7 de noviembre de 2026

**Decisión del equipo del 6 de noviembre de 2026** (`specs/08-administracion/plan.md` §7, H-ADM-22): lo que el responsable tiene sobre su equipo vive en la **zona de empresa**, en «Mi equipo»; la conversación de la aplicación solo muestra la síntesis. El reparto completo, para las personas, está en `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §3. Para esta área:

| Pieza | Dónde | Requisitos |
|---|---|---|
| Delegar, con su tarjeta | Aplicación (web y móvil), por el asistente | REQ-CUN07-01 a 10 |
| «Encargadas»: lo que encargó el responsable, con las respuestas por decidir | Aplicación, sección Tareas | REQ-CUN07-12, 13, 17, 19 |
| «Asignadas»: lo que le asignaron a un miembro y sus peticiones recibidas (nombre por decidir, H-EMP-06) | Aplicación, sección Tareas | REQ-CUN07-11, 14, 18 |
| La tarea abierta con su hilo | Aplicación: lienzo en la web, dentro de la tarea en el móvil | REQ-CUN07-15; R-17, R-24 |
| Resumen del equipo y síntesis del reporte | Aplicación, conversación | REQ-CUN08-03, 07 |
| Tablero de tareas del equipo, reporte completo | **Zona de empresa**, «Mi equipo», solo web | REQ-CUN08-01, 04; H-ADM-22 |

### 1.1 Lo que esta área espera de `08-administracion`

No se reinventa. Si algo de esta lista no existe cuando empiece T-090, se pide a esa área, no se escribe aquí.

| Necesita | Qué es en `08-administracion` | Para | Estado en su plan |
|---|---|---|---|
| Pertenencia en el contexto | `ContextoSolicitud.empresa` (`organizacionId`, `miembroId`, `origen`) | Saber en qué empresa se guarda la tarea del equipo | Previsto, T-066 (§4.1) |
| Rechazo sin pertenencia | `@EnEmpresa()` y el error `SIN_ORGANIZACION`, con el texto de REQ-ADM-17 | Delegar o pedir sin estar en una empresa | Previsto, T-066 (§4.2) |
| Autoridad por equipo | `@SoloResponsable(resolverEquipo)` en rutas y `soloResponsable` con `resolverEquipo` en `EjecutorOperacion`, comprobados al proponer y al confirmar | Delegar (REQ-CUN07-04, REQ-ACC-15), decidir respuestas, leer el tablero y el reporte | Previsto, T-073 (§4.2) |
| Equipo sin responsable | El mismo `soloResponsable`: nadie pasa | REQ-ADM-32 | Previsto, T-073 |
| Miembros y responsable de un equipo | Lectura de `miembro_equipo` (`equipo_id`, `perfil_id`, `responsable`) y de `equipo` | Resolver «Vasco» a un perfil del equipo (REQ-CUN07-01, 05); listar el tablero por persona | **Pedido nuevo:** `08` solo prevé `GET /administracion/equipos` para el administrador. Hace falta una lectura **exportada fuera de `AdministracionModule`** (por ejemplo `EquiposLectura`: `equiposDe(perfilId)`, `miembros(equipoId)`, `responsable(equipoId)`, `esMiembro(perfilId, equipoId)`), porque §7.3 de `08` prohíbe que el módulo del asistente importe `AdministracionModule` (H-EMP-20) |
| Ser miembro sin ser responsable | Un alcance `@MiembroDelEquipo(resolverEquipo)` | Peticiones (REQ-CUN07-18) y propuestas al responsable (REQ-CUN07-19) | **Pedido nuevo** (H-EMP-21) |
| Correo de quien recibe la tarea | `PertenenciasRepositorio`: correo y estado del perfil, también de una cuenta afiliada (§4.3, tercera fila) | El correo de aviso (REQ-CUN07-16) | Previsto, T-066 |
| Al salir alguien de un equipo | Evento `SalidaDeEquipo { organizacionId, equipoId, perfilId, motivo }` en la misma transacción | Oyente de esta área: sus tareas abiertas quedan sin persona asignada (H-ADM-08); cierra REQ-ADM-13, 25 y 31 | Previsto sin oyentes, T-070 (§5.4). El oyente es T-098 |
| Operaciones en la empresa | `ambito: 'empresa'` en `EjecutorOperacion` (§5.2) | La tarea del equipo, la respuesta y la decisión se guardan en la organización de la empresa (H-ADM-18) | Previsto, T-067 |
| Rutas de la zona | Prefijo `/administracion/*` con `ambito: 'empresa'` y su guarda; grupo `app/(empresa)/administracion/**` en la web | El tablero y el reporte: `GET /administracion/mi-equipo/:equipoId/tareas` y `GET /administracion/mi-equipo/:equipoId/reporte?desde&hasta`, con `@SoloResponsable`; páginas bajo `(empresa)/administracion/mi-equipo/` | Prefijo previsto (§7.3). Las rutas de «Mi equipo» son propuesta de esta área |
| Correo que solo avisa | Puerto `CorreoPlataforma.avisar()` de `AvisosModule`, simulado, con `correo.aviso` en la auditoría | REQ-CUN07-16; DP-03 | Previsto, T-070 (§8) |

### 1.2 Dos cosas de `08-administracion` que esta área necesita distintas

1. **Las Operaciones del trabajo del equipo sí se ven en la aplicación.** `08-administracion/plan.md` §7.3 dice que las Operaciones de ámbito empresa no aparecen en `GET /operaciones` de la aplicación, ni en la franja en espera, ni en la transcripción. Eso vale para `administracion.*`, `afiliacion.*` y `equipo.*`. Las de esta área (`tareas_equipo.delegar`, `responder`, `decidir`, `pedir`, `proponer`) las propone el asistente **en la conversación de quien pide**: tienen que verse en su tarjeta, en su transcripción y, si el asistente no responde, en lo que tiene en espera (REQ-CUN07-09). Se guardan en la empresa y se leen desde la aplicación con `deOrganizacion(contexto.empresa.organizacionId)`, filtradas por quien las propuso. Para una cuenta afiliada, la transcripción está en su organización personal y la Operación en la de la empresa: la tarjeta lee la Operación por su identificador en la segunda (H-EMP-09). Pide una línea en `08-administracion/plan.md` §7.3.
2. **La entrada a la zona desde la conversación.** El acceso al reporte de REQ-CUN08-07 abre `/administracion/mi-equipo/:equipoId/reporte/...` en otra pestaña. La zona tiene sesión propia (`sesion_renovacion.ambito`, §7.1): si no está abierta, pide entrar. Se acepta en esta versión (H-EMP-19).

### 1.3 La tarea del equipo, aparte de la personal (INC-21 del carril de CUN-03)

**Propuesta, pendiente de decisión del equipo (H-EMP-10):** tabla propia, `tarea_equipo`, en la organización de la empresa, con `equipo_id`, `asignada_a` (nula si quedó sin persona, H-ADM-08), `encargada_por`, `fecha_limite`, `criterio_terminado`, `preguntas` (REQ-ENC-01, 03), `estado` (los de EN-04, con «en curso») y `operacion_origen_id`. La tabla `tarea` de `09-tareas-personales/plan.md` §3.1 no cambia. Motivos: con la opción B de `08-administracion/plan.md` §3.1, lo personal de una cuenta afiliada vive en su organización personal y lo del equipo en la empresa; una sola tabla tendría filas de las dos y P-10 dependería de cada consulta. `PROPUESTA-TECNICA.md` §8 («`tarea` … responsable y quien delegó») necesita su enmienda. Entra en `MODELOS_CON_ORGANIZACION`.

El hilo (REQ-CUN07-15) también vive en la empresa, con el autor de cada mensaje (H-ADM-08). Su forma depende de `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §6.2.
