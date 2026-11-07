# Informe — carril empresarial (estructura del Plan Empresarial)

**Fecha:** 7 de noviembre de 2026 · **Rama:** `carril-t4-admin`, sobre `base-tanda3` · **Solo documentos:** ningún archivo de `apps/`, ningún `spec.md`, ni `SPEC.md`, ni el glosario

---

## Índice

1. [Resumen](#1-resumen)
2. [Commits](#2-commits)
3. [Decisiones propuestas](#3-decisiones-propuestas)
4. [Enmiendas a requisitos y documentos existentes](#4-enmiendas-a-requisitos-y-documentos-existentes)
5. [Líneas para `SPEC.md`](#5-líneas-para-specmd)
6. [Preguntas para el equipo](#6-preguntas-para-el-equipo)
7. [Lo que no se pudo verificar](#7-lo-que-no-se-pudo-verificar)

---

## 1. Resumen

`ESTRUCTURA-PERFIL-EMPRESARIAL.md`, en la raíz, junta lo que estaba repartido en cinco áreas y dice cómo encaja el Plan Empresarial para quien lo usa. Lo central:

- **Dos sitios y un canal.** En la **aplicación** (web y móvil) se actúa, siempre por el asistente; en la **zona de empresa** (solo web, sin asistente) se mira el estado del equipo y se administra; el **correo** solo avisa. «Mi equipo» es de lectura en esta versión.
- **Tres perfiles por pertenencia y por equipo:** administrador, responsable y colaborador. Una persona puede ser los tres a la vez en distintos equipos (REQ-ACC-16).
- **Mapa de superficies:** 14 capacidades por 5 sitios, cada celda con su requisito o «por decidir».
- **Las dos preguntas abiertas de `SPEC.md` §8, con propuesta:** el responsable tiene en el móvil todo lo que pasa por el asistente y ningún panorama; el colaborador usa en la web la misma aplicación que todos, con sus tareas asignadas como franja y la tarea abierta en el lienzo.
- **Qué cambia en la aplicación al pertenecer a una empresa**, sección por sección: aparecen «Encargadas» y «Asignadas» en Tareas, la fila «Organización» en Ajustes y la entrada a la zona; la agenda, las tareas personales y la Actividad siguen siendo solo de la persona.
- **Orden de la fase 4 en siete bloques**, con el criterio de `PLAN-VALOR-USUARIO.md`: empresa, sumarse, equipos (T-065 a T-074), delegar y responder (T-090 a T-098), seguimiento (T-099 a T-102), disponibilidad (T-103 a T-107) y peticiones (T-108, T-109). **29 sesiones**; recorte propuesto para el Entregable: bloques 1 a 4, **19 sesiones**.
- **Lo que falta especificar:** el modelo de la tarea delegada (INC-21 del carril de CUN-03), el hilo, el panorama de disponibilidad, el reporte en la zona, el correo real, la notificación, CUN-06 y **la lista exacta de cuadros** que INC-14 reclama.

Además: notas de plan en `03-tareas`, `04-comunicaciones` y `05-equipos` con **lo que cada área espera de `08-administracion`**, para no reinventarlo, y dos pedidos nuevos a esa área; y la sección nueva «La zona de empresa» en el diseño web.

`python tools/trazabilidad.py --check`: **209 requisitos, 0 problemas** (no se tocó ningún `spec.md`).

## 2. Commits

Autor `Claude (carril empresarial) <claude@nexoai.local>`, uno por documento.

| Hash | Mensaje | Archivos |
|---|---|---|
| `503559d` | docs(empresarial): cómo se estructura el Plan Empresarial para quien lo usa | `ESTRUCTURA-PERFIL-EMPRESARIAL.md` (+336) |
| `80d5a65` | plan(03-tareas): dónde vive cada cosa desde el 7 de noviembre de 2026 | `specs/03-tareas/plan.md` (+53, nuevo) |
| `24657a0` | plan(05-equipos): dónde vive cada cosa desde el 7 de noviembre de 2026 | `specs/05-equipos/plan.md` (+40, nuevo) |
| `5377feb` | plan(04-comunicaciones): dónde vive cada cosa desde el 7 de noviembre de 2026 | `specs/04-comunicaciones/plan.md` (+33, nuevo) |
| `32ed6f8` | design(web): la zona de empresa y remisión desde Ajustes | `design/ARQUITECTURA-VISUAL-WEB.md` (+93) |
| (este) | entregas: informe del carril empresarial | `entregas/INFORME-CARRIL-EMPRESARIAL.md` |

```
 ESTRUCTURA-PERFIL-EMPRESARIAL.md  | 336 ++++++++++++++++++++++++++++++++++++++
 design/ARQUITECTURA-VISUAL-WEB.md |  93 +++++++++++
 specs/03-tareas/plan.md           |  53 ++++++
 specs/04-comunicaciones/plan.md   |  33 ++++
 specs/05-equipos/plan.md          |  40 +++++
 5 files changed, 555 insertions(+)   (sin contar este informe)
```

**Para integrar.** No hay conflictos de código posibles. Los tres `plan.md` son nuevos; si otro carril los crea a la vez, se juntan las secciones. `design/ARQUITECTURA-VISUAL-WEB.md` solo gana una nota en §7, un punto en §14 y la §15 al final. Las tareas T-090 a T-109 **no están en ningún `tasks.md`**: solo en el documento de la raíz, como propuesta.

## 3. Decisiones propuestas

Todas **provisionales**, pendientes del equipo. Ninguna se escribió en un `spec.md`: la columna dice dónde debería vivir cada una.

| # | Decisión | Dónde debería vivir |
|---|---|---|
| H-EMP-01 | **Tres perfiles por pertenencia y por equipo**, no por rol de la cuenta: administrador (marca en la pertenencia), responsable (marca en el miembro del equipo) y colaborador (miembro sin ella). «Gerente» queda como sinónimo antiguo de responsable | `specs/glosario.md` §1; `06-acceso` (enmiendas del carril de administración) |
| H-EMP-02 | **En la aplicación se actúa; en la zona se mira.** Lo que crea o cambia trabajo pasa por el asistente y vive en la aplicación. «Mi equipo» es de lectura en esta versión; la zona solo actúa para administrar | `08-administracion/spec.md` §5; `design/ARQUITECTURA-VISUAL-WEB.md` §15 (ya escrito como propuesta) |
| H-EMP-03 | **El responsable en el móvil:** todo lo que pasa por el asistente (delegar, pedir, convocar, resumen, síntesis del reporte, decidir respuestas en «Encargadas»); ningún panorama (rejilla del equipo, tablero, reporte completo) | `SPEC.md` §8 (cierra la pregunta 1); cabecera de `03-tareas` |
| H-EMP-04 | **La vista web del colaborador es la aplicación común**, sin vista propia y sin zona. Se retira el aviso que lo manda al móvil cuando exista «Asignadas» | `SPEC.md` §8 (cierra la pregunta 2); `03-tareas`, nota de REQ-CUN07-15; `06-acceso/plan.md` §5.5 |
| H-EMP-05 | **Dos usos de la disponibilidad:** panorama del equipo en la zona, solo para el responsable; consulta para convocar en la aplicación, para cualquier miembro (REQ-CUN05-17). En el móvil, alternativas en la tarjeta, sin rejilla | `05-equipos/spec.md` §2 y §4 |
| H-EMP-06 | **Franja «Asignadas»**: lo que le asignaron a un miembro y las peticiones que recibe, separada de las personales y de «Encargadas». Las dos franjas aparecen solo si la cuenta es miembro o responsable de algún equipo, no por tener pertenencia | `03-tareas` §7; glosario, «Franja» |
| H-EMP-07 | **Las respuestas del colaborador y las propuestas de tarea se deciden en la aplicación, en «Encargadas»**, no en la zona: cambiar una tarea necesita al asistente | `03-tareas` §7 (REQ-CUN07-12, 17, 19) |
| H-EMP-08 | **El hilo se escribe solo en la aplicación**; en la zona solo se lee lo destacable | `03-tareas` §7 (REQ-CUN07-15) |
| H-EMP-09 | **Las Operaciones del trabajo del equipo se guardan en la empresa pero se ven en la conversación de quien las pidió.** La exclusión de `08-administracion/plan.md` §7.3 vale solo para `administracion.*`, `afiliacion.*` y `equipo.*` | `08-administracion/plan.md` §7.3; `03-tareas/plan.md` §1.2 (ya escrito) |
| H-EMP-10 | **La tarea del equipo, aparte de la personal** (tabla propia en la empresa). Responde INC-21 del carril de CUN-03 | `03-tareas/plan.md` §1.3 (ya escrito); `PROPUESTA-TECNICA.md` §8; EN-04 |
| H-EMP-11 | **Nombre en pantalla de la zona y de su entrada:** «Administración» no vale para un responsable que no administra. Propuesta: «Empresa» o el nombre de la organización. Apartados «Mi equipo», «Personas», «Equipos», «Registro» | `08-administracion/spec.md` §5 (textos); glosario, «Área de administración» → «Zona de empresa» |
| H-EMP-12 | **Compartir libre/ocupado se decide en Ajustes, fila «Organización», por equipo**, y se puede retirar en cualquier momento. Al aceptar una invitación se pregunta una vez, aparte | `05-equipos`, REQ-CUN05-16; `08-administracion`, REQ-ADM-20 |
| H-EMP-13 | **Actividad no tiene alcance de equipo en la aplicación.** El registro con alcance de equipo de `design/ARQUITECTURA-VISUAL-WEB.md` §6 pasa a la zona y queda fuera de esta versión | `design/ARQUITECTURA-VISUAL-WEB.md` §6 y §15 (ya escrito en §15); especificación de Actividad del carril de actividad |
| H-EMP-14 | **El reporte desde el móvil:** la síntesis y su descarga; la lectura completa solo en la zona | `03-tareas` §8 (REQ-CUN08-07) |
| H-EMP-15 | **La notificación en la aplicación** usa el mismo componente de aviso que la invitación, y un punto en Tareas como el del asa (H-CAP-04) | `03-tareas` §7 (REQ-CUN07-03, 16, 17) |
| H-EMP-16 | **Orden de la fase 4:** empresa → sumarse → equipos → delegar y responder → seguimiento → disponibilidad → peticiones | `SPEC.md` §10 |
| H-EMP-17 | **Tareas nuevas desde T-090** (T-090 a T-109), para no chocar con `08` ni `09` ni el carril de actividad. Entran en el `tasks.md` de su área al avalarse su especificación | `specs/03-tareas/tasks.md` y `specs/05-equipos/tasks.md`, cuando existan |
| H-EMP-18 | **Sin registro de tiempo del equipo en esta versión:** el seguimiento cuenta tareas, fechas y retrasos, no horas | `03-tareas` §8 (enmienda a REQ-CUN08-01 y 04) |
| H-EMP-19 | **Pasar de la aplicación a la zona pide entrar otra vez** si la sesión de la zona no está abierta. Se acepta la fricción en esta versión | `08-administracion/plan.md` §7.1 |
| H-EMP-20 | **La lectura de equipos y miembros se exporta fuera de `AdministracionModule`**, para que el asistente resuelva «Vasco» sin importar el módulo de la zona | `08-administracion/plan.md` §7.3 (pedido de `03` y `05`) |
| H-EMP-21 | **Alcance nuevo `@MiembroDelEquipo(resolverEquipo)`** para la consulta para convocar, las peticiones y las propuestas al responsable | `08-administracion/plan.md` §4.2 (pedido de `03` y `05`) |

## 4. Enmiendas a requisitos y documentos existentes

**No se aplicó ninguna.** Se suman a las del carril de administración (`entregas/INFORME-CARRIL-ADMIN.md` §5), que siguen pendientes.

| Dónde | Hoy dice | Propuesta | Por qué |
|---|---|---|---|
| REQ-ADM-05 | «le ofrecerá el área de administración en la web, y solo en la web» (solo al administrador) | «DONDE una cuenta sea administradora de una organización de empresa o responsable de alguno de sus equipos, EL SISTEMA le ofrecerá la zona de empresa en la web, y solo en la web, con su propia entrada» | La zona también es del responsable («Mi equipo»); ya lo pedía H-ADM-22 |
| `08-administracion/spec.md` §5, «Dónde va» | «Ocupa el ancho de la conversación y del lienzo» | «Es una zona aparte, con entrada y sesión propias, que se abre en otra pestaña» | Decisión del 6 de noviembre de 2026 (plan §7) |
| `08-administracion/spec.md` §5, cuadros | `WEB-v2 / Administración / 01` a `05` | `WEB-v2 / Empresa / 06` a `10`, más los de «Mi equipo» | `design/ARQUITECTURA-VISUAL-WEB.md` §15.5 |
| `08-administracion/plan.md` §7.3 | Las Operaciones de ámbito empresa no aparecen en la aplicación | Solo `administracion.*`, `afiliacion.*` y `equipo.*` | H-EMP-09 |
| `08-administracion/plan.md` §4.3 | Cuatro usos de `sinAislar` | Un quinto: libre/ocupado de un miembro que lo compartió, solo inicio, fin y si ocupa | `05-equipos/plan.md` §1.1 |
| Glosario, «Área de administración» | «Página de la web, solo para administradores … se entra desde el pie de la navegación» | Renombrar a **«Zona de empresa»**: sitio aparte, con entrada propia, para administradores y responsables; apartados «Mi equipo», «Personas», «Equipos», «Registro» | H-EMP-11, H-ADM-22 |
| Glosario, «Franja» | «con fecha, sin fecha, esperando de alguien, encargadas» | Sumar «asignadas» | H-EMP-06 |
| Cabecera de `03-tareas` | «Qué parte de la coordinación tiene el gerente en el móvil está por decidir» | Remitir a H-EMP-03 | Cierra la pregunta |
| REQ-CUN07-15, nota de ubicación | «En la web del colaborador, falta diseñarlo (INC-14)» | «En la web del colaborador, igual que en la del responsable: en el lienzo, con la tarea abierta» | H-EMP-04 |
| REQ-CUN08-01 | «… y cuánto tiempo se registró en ellas» | Quitarlo en esta versión, o marcarlo como posterior | H-EMP-18; el registro de tiempo del equipo queda fuera |
| REQ-CUN08-04 | «se ve en la web y se descarga en PDF»; indicadores con tiempo | «se ve en la zona de empresa y se descarga en PDF»; sin horas en esta versión | H-ADM-22, H-EMP-18 |
| REQ-CUN08-07 | «el acceso al reporte completo» | «un acceso que abre el reporte en la zona de empresa, o lo descarga desde el móvil» | H-ADM-22, H-EMP-14 |
| Cabecera de `05-equipos` | «Plataforma: web» | «Web (panorama en la zona y rejilla para convocar) y móvil (alternativas para convocar)» | H-EMP-05, REQ-CUN05-17 |
| REQ-CUN05-11 | «equipos sobre los que el gerente tiene permiso» | «equipos de los que es responsable, para el panorama; de los que es miembro, para convocar (REQ-CUN05-17)» | REQ-ACC-16 |
| REQ-ACC-13 | «de lo ajeno, solo le muestra las tareas que tiene asignadas y sus hilos» | Sumar «libre u ocupado de su equipo para convocar (REQ-CUN05-17) y las peticiones que recibe (REQ-CUN07-18)» | Hoy contradice a los otros dos; su propia nota dice que sigue abierto |
| `design/ARQUITECTURA-VISUAL-WEB.md` §6 | El Empresarial añade el alcance de equipo al registro | Remitir a §15.3: va a la zona, fuera de esta versión | H-EMP-13 |
| `PROPUESTA-TECNICA.md` §8, fila `tarea` | Una tabla con «responsable y quien delegó» | Dos: `tarea` (personal) y `tarea_equipo` | H-EMP-10 |
| `design/ARQUITECTURA-VISUAL-MOVIL.md` | Sin mención de la empresa | Una nota con lo que gana el móvil al pertenecer a una empresa (§4 del documento de la raíz) y los cuadros `CUN-09 / Móvil / …` | Este carril no lo tocó porque el encargo solo pedía la web |

## 5. Líneas para `SPEC.md`

**§8, fila «Las dos plataformas para los dos perfiles»:** tachar las dos preguntas y añadir «**Propuesta del 2026-11-07** en `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §3.2 y §3.3: (1) en el móvil, el responsable tiene todo lo que pasa por el asistente (delegar, pedir, convocar, resumen, síntesis del reporte, decidir respuestas) y ningún panorama, que vive en la zona de empresa, solo web (H-EMP-03); (2) el colaborador usa en la web la misma aplicación que todos, con la franja «Asignadas» y la tarea en el lienzo, sin zona (H-EMP-04). Se retira `/solo-movil` con T-096. Se tacha al aval».

**§8, D-18:** añadir «La zona de empresa no cobra ni cuenta asientos; queda fuera de la fase 4 (`ESTRUCTURA-PERFIL-EMPRESARIAL.md` §7)».

**§8, fila nueva:** «**Estructura del Plan Empresarial** (`ESTRUCTURA-PERFIL-EMPRESARIAL.md`, 2026-11-07). Hallazgos H-EMP-01 a 21, pendientes. Los que más pesan: en la aplicación se actúa y en la zona se mira (H-EMP-02); la tarea del equipo va aparte de la personal (H-EMP-10, responde INC-21 del carril de CUN-03); dos usos de la disponibilidad (H-EMP-05); nombre de la zona en pantalla (H-EMP-11) | Bloques 4 a 7 de la fase 4».

**§8, «Seguimiento del equipo (CUN-08, borrador)»:** añadir «El reporte completo se abre en la zona de empresa, «Mi equipo» (H-ADM-22); desde el móvil, la síntesis y la descarga (H-EMP-14). Sin horas del equipo en esta versión (H-EMP-18)».

**§9, INC-14:** cambiar la propuesta por «**Lista exacta de cuadros** en `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §6.6 (aviso de invitación, zona de empresa, móvil del colaborador y los que necesita el bloque 4) y `design/ARQUITECTURA-VISUAL-WEB.md` §15.5. Orden: el aviso antes del bloque 2; la zona antes de los bloques 3 y 5; el móvil del colaborador antes del bloque 4».

**§9, inconsistencias nuevas** (numerar al integrar: los carriles de administración y de CUN-03 usaron los dos INC-19 a 21 para cosas distintas, y conviene renumerar uno de los dos lotes):
- **REQ-ACC-13 frente a REQ-CUN05-17 y REQ-CUN07-18.** El primero limita lo ajeno del colaborador a sus tareas asignadas y sus hilos; los otros le dan libre/ocupado del equipo y las peticiones. Propuesta: la enmienda de §4.
- **REQ-CUN08-01 y 04 piden el tiempo registrado** del equipo, que no tiene requisito ni entra en esta versión. Propuesta: la enmienda de §4.
- **`08-administracion/plan.md` §7.3 deja fuera de la aplicación toda Operación de ámbito empresa**, y delegar se propone en la conversación de la aplicación. Propuesta: H-EMP-09.

**§10, fila de la fase 4:** «Parcial; diseño desfasado (INC-14). **Estructura y orden propuestos el 2026-11-07** en `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §5: siete bloques, del 1 al 3 con `08-administracion` (T-065 a T-074) y del 4 al 7 con T-090 a T-109 propuestas (delegar y responder, seguimiento, disponibilidad, peticiones). 29 sesiones; recorte para el Entregable: bloques 1 a 4 (19)».

**§10, «Siguiente paso concreto»:** sustituir «decidir el recorte de la fase 4» por «decidir el recorte de la fase 4 con `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §5 (propuesta: bloques 1 a 4)».

**§11:** `| 2026-11-07 | 2.2x.y (parche siguiente al integrar) | **Estructura del Plan Empresarial, solo documentos.** ESTRUCTURA-PERFIL-EMPRESARIAL.md: tres perfiles por pertenencia y por equipo; mapa de superficies (aplicación web y móvil, zona de empresa, correo) con el requisito de cada celda; qué cambia en la aplicación al pertenecer a una empresa; orden de la fase 4 en siete bloques con T-090 a T-109 propuestas; lo que falta especificar, con la lista de cuadros de INC-14. Propuesta para las dos preguntas abiertas de §8 (H-EMP-03, 04). Notas de plan nuevas en 03-tareas, 04-comunicaciones y 05-equipos con lo que esperan de 08-administracion. Diseño web §15, la zona de empresa, y remisión en §7. Hallazgos H-EMP-01 a 21. Sin cambios en requisitos ni en código | ESTRUCTURA-PERFIL-EMPRESARIAL.md, specs/03-tareas/plan.md, specs/04-comunicaciones/plan.md, specs/05-equipos/plan.md, design/ARQUITECTURA-VISUAL-WEB.md, SPEC.md | Equipo (decisión del 6 de noviembre), redactado por Claude |`

## 6. Preguntas para el equipo

1. **¿«En la aplicación se actúa, en la zona se mira»** (H-EMP-02)? Es lo que hace que «Mi equipo» no necesite asistente ni formularios. La alternativa es dar a la zona acciones directas sobre el equipo (aceptar respuestas, reasignar), que tendrían que respetar P-11 sin asistente.
2. **¿El responsable en el móvil sin panoramas** (H-EMP-03)? ¿O el móvil necesita al menos ver el tablero de su equipo?
3. **¿La tarea del equipo aparte de la personal** (H-EMP-10, INC-21)? Conviene decidirlo antes de T-047 del carril de CUN-03, que crea la tabla `tarea`.
4. **¿«Asignadas» como nombre de la franja del colaborador** (H-EMP-06), y que las peticiones recibidas vivan en ella?
5. **¿Cómo se llama la zona en pantalla** (H-EMP-11)? «Empresa», el nombre de la organización u otro.
6. **¿Dónde acepta la persona compartir su libre/ocupado** (H-EMP-12)? ¿Se pregunta al aceptar la invitación, o solo en Ajustes?
7. **¿Qué muestra el panorama de disponibilidad al abrirse** (§6.3 del documento)? Propuesta: la semana en curso, de lunes a viernes, en la banda 08:00–20:00.
8. **¿Se acepta tener que entrar otra vez en la zona** al abrir un reporte desde la conversación (H-EMP-19)?
9. **¿Se quita el tiempo registrado del seguimiento** en esta versión (H-EMP-18)?
10. **¿Recorte del Entregable en los bloques 1 a 4** (19 sesiones), dejando seguimiento, disponibilidad y peticiones para después?
11. **¿Quién especifica CUN-06** (convocar reunión) y cuándo? Sin él, la disponibilidad solo consulta.

## 7. Lo que no se pudo verificar

- **No se ejecutó nada** (sin `node_modules`, por encargo). Solo `python tools/trazabilidad.py --check`, que sigue en 0 problemas porque no cambió ningún `spec.md`.
- **Los nombres técnicos de `08-administracion`** (`EquiposLectura`, `@MiembroDelEquipo`, las rutas de «Mi equipo») son propuestas contra su `plan.md` del 6 de noviembre de 2026. El carril de administración los construye a la vez en otro árbol: si allí cambian, las notas de `03`, `04` y `05` se ajustan al integrar.
- **El carril de actividad** numera tareas a la vez; T-090 a T-109 se eligieron lejos de lo conocido, pero no se pudo comprobar su numeración.
- **No hay cuadros con que contrastar** nada de esto (INC-14, INC-15).
- **Atribución de los commits.** Llevan `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` y la línea `Claude-Session` pedidas en el encargo. La configuración de la sesión proponía otra línea (`Claude Opus 5.5`); se siguió la del encargo. Si hace falta la otra, se cambia al convertirlos en parches.
