# Informe del carril CUN-03 — tareas personales (solo especificación)

**Fecha:** 6 de noviembre de 2026
**Árbol:** `/home/claude/nexoai-b2-cun03`, rama `carril-cun03`, sobre `base-4a2b3f7`
**Alcance:** documentos y el registro de un prefijo en `tools/trazabilidad.py`. Cero código de producto.

## Índice

1. [Resumen](#1-resumen)
2. [Commits](#2-commits)
3. [Requisitos nuevos](#3-requisitos-nuevos)
4. [Decisiones tomadas durante el diseño](#4-decisiones-tomadas-durante-el-diseño)
5. [Líneas para `SPEC.md`](#5-líneas-para-specmd)
6. [Cambios que se piden en otras áreas](#6-cambios-que-se-piden-en-otras-áreas)
7. [Coordinación con otros carriles](#7-coordinación-con-otros-carriles)
8. [Preguntas para el equipo](#8-preguntas-para-el-equipo)

---

## 1. Resumen

- Área nueva `specs/09-tareas-personales/` con `spec.md` (REQ-CUN03-01 a 20), `plan.md` y `tasks.md` (T-046 a T-057).
- CUN-03 queda especificado entero: registrar, ver por franjas, completar, marcar recibido, reabrir, descartar, cambiar, las tareas en Hoy, el asistente y la conversión de lo que estaba en espera.
- Glosario: «Tarea personal», «Recibido», «Por confirmar», «Vencida», y precisión de «Esperando de alguien».
- Trazabilidad regenerada: **177 requisitos, 0 problemas** (`--check`). Los veinte nuevos, `pendiente`, con su fase, tarea y prueba prevista.
- Dieciocho decisiones H-TP-01 a 18, pendientes de aval. **La que necesita aval expreso es H-TP-11**: es una excepción a H-AG-08.

## 2. Commits

Autor `Claude (carril cun03) <claude@nexoai.local>`. Para los parches: `git format-patch base-4a2b3f7`.

| Hash | Mensaje |
|---|---|
| `7b023a9` | glosario: tarea personal, recibido, por confirmar y vencida (CUN-03) |
| `076a179` | spec(09-tareas-personales): CUN-03 tareas personales en EARS |
| `b025001` | plan(09-tareas-personales): modelo, Operaciones, rutas, agente y pantallas de CUN-03 |
| `f416fa1` | tasks(09-tareas-personales): T-046 a T-057 para CUN-03 |
| `202214e` | spec(09-tareas-personales): origen de REQ-CUN03-10 sin referencia al encargo |
| `a73b35f` | trazabilidad: área 09-tareas-personales (REQ-CUN03-01 a 20) |
| *(este)* | entregas: informe del carril CUN-03 |

## 3. Requisitos nuevos

| REQ | En una línea |
|---|---|
| CUN03-01 | Pedirle al asistente algo que hacer o que se espera propone una tarea; solo se registra al confirmar; no va a Google ni promete aviso |
| CUN03-02 | Sin fecha no se pregunta la fecha: la tarea va sin fecha; solo se pregunta qué hay que hacer si no se entiende |
| CUN03-03 | Tres estados (pendiente, hecha, descartada) y una sola franja por tarea pendiente, calculada por el código |
| CUN03-04 | Esperando de alguien guarda qué, de quién (texto libre), desde cuándo y para cuándo; sin contacto, sin notas y sin escribirle |
| CUN03-05 | «Recibido» da por hecho lo esperado con su día y no crea nada más |
| CUN03-06 | La sección Tareas muestra las tres franjas, con su contenido y su orden, igual en web y móvil |
| CUN03-07 | Una tarea con la fecha pasada se marca vencida («Vencía el…», «Debía llegar el…»); no cambia de estado |
| CUN03-08 | Cada franja vacía tiene su estado vacío, que lleva al asistente y no ofrece formulario |
| CUN03-09 | «Hecho» / «Recibido» sin tarjeta, con «Deshacer», también sin asistente |
| CUN03-10 | Las hechas de los últimos siete días se ven al pie de su franja y se reabren |
| CUN03-11 | Descartar lleva siempre tarjeta, desde el control o desde el asistente |
| CUN03-12 | Cambiar texto, fecha, hora límite o de quién solo por el asistente, con antes y después |
| CUN03-13 | En Hoy, un grupo «Tareas para este día» debajo de los compromisos; no es compromiso: ni Google, ni conflicto, ni Semana ni Mes |
| CUN03-14 | «¿Qué tengo pendiente?» responde con las tareas tal como están, agrupadas por franja |
| CUN03-15 | Completar, recibir, reabrir o descartar por conversación lleva tarjeta que dice cuál; con varias, candidatas |
| CUN03-16 | Asignar, delegar, prioridades, subtareas, repetir o avisar: se dice que no y no se hace nada; «pídele a X» se ofrece como esperando de alguien |
| CUN03-17 | Lo que estaba en espera por «función por llegar» se convierte en propuesta «Por confirmar» en Tareas, que no caduca ni se pierde |
| CUN03-18 | Sin asistente: la lista se ve, los controles funcionan y lo nuevo queda en espera |
| CUN03-19 | Las tareas personales solo las ve su dueño; tampoco el responsable del equipo |
| CUN03-20 | Las tareas funcionan sin el calendario de Google conectado |

## 4. Decisiones tomadas durante el diseño

Detalle en `specs/09-tareas-personales/spec.md`, al final, y lo que asume el plan en `plan.md` §11.

| # | Decisión |
|---|---|
| H-TP-01 | Tres estados propios (pendiente, hecha, descartada); sin «en curso» ni criterio de terminado, que son de la tarea delegada |
| H-TP-02 | La falta de fecha no es un dato que falta |
| H-TP-03 | La fecha es un día del calendario con hora límite opcional y su zona; un cambio de zona conserva el día |
| H-TP-04 | Esperando con fecha va solo a «Esperando de alguien» |
| H-TP-05 | Orden de cada franja |
| H-TP-06 | Hechas visibles siete días; descartadas, nunca |
| H-TP-07 | «Hecho», «Recibido» y «Reabrir» desde la lista sin tarjeta; por el asistente con tarjeta; descartar siempre con tarjeta |
| H-TP-08 | Crear y cambiar solo por el asistente (R-42) |
| H-TP-09 | Una tarea no es un compromiso: grupo propio en Hoy, sin Google, sin conflicto, sin Semana ni Mes |
| H-TP-10 | Sin avisos en esta versión; «recuérdame» no promete uno |
| H-TP-11 | **La conversión va a «Por confirmar», fuera de la conversación, y esas propuestas no caducan. Excepción a H-AG-08** |
| H-TP-12 | Sin límite por plan en esta versión, aunque `REPLANTEO.md` §4.3 pone «esperando de alguien» en el Plan Personal |
| H-TP-13 | Tareas asignadas y encargos no son tareas personales ni entran en las tres franjas |
| H-TP-14 | «Pídele a alguien…» se ofrece como algo que se espera de esa persona |
| H-TP-15 | «Recibido» es dar por hecho con su propio nombre |
| H-TP-16 | Mientras se convierte, el motivo dice que se está preparando para confirmar |
| H-TP-17 | Conversión ilegible: se propone sin fecha y se dice |
| H-TP-18 | «Esta semana» lista solo las que tienen fecha en el rango, y las vencidas |

## 5. Líneas para `SPEC.md`

El encargo habla de «§4 tabla de fases» y «§9 bitácora». En `SPEC.md` 2.20.1 la tabla de fases es **§10** y el registro de cambios es **§11**; §4 es arquitectura y §9 son las inconsistencias. Las líneas van con los números reales.

**Cabecera.** Versión siguiente **menor** (se añaden requisitos): 2.21.0, o la que toque tras integrar los otros carriles.

**§5, mapa de especificaciones — fila nueva** (antes del total):

```
| Tareas personales | `specs/09-tareas-personales/spec.md` | 03 | Web y móvil | G (esperando de alguien: P, sin límite en esta versión, H-TP-12) | CUN03-01…20 (20) | borrador; H-TP-01 a 18 pendientes de aval | — | propuesto | T-046 a T-057 (pendientes) | — | — |
```

Y en la fila de Captura, columna CUN, nada cambia; en el **Total**: `177 (171 vigentes)` (la base ya tenía 157 en la trazabilidad, con los tres del carril C; `SPEC.md` §5 todavía dice 154).

**§6, cobertura:**

```
| CUN-03 | Gestionar tareas personales | Usuario | 09-tareas-personales; 01-captura (la entrada) | **Especificado** (borrador del 2026-11-06, pendiente de aval): registrar, consultar por franjas, completar, reabrir, descartar, cambiar, Hoy y conversión de lo en espera |
```

**§8, decisiones abiertas — filas nuevas:**

```
| — | **Hallazgos de tareas personales** H-TP-01 a 18 (`specs/09-tareas-personales/spec.md`): estados propios, sin fecha no es dato faltante, la fecha como día con zona, orden de las franjas, qué lleva tarjeta, la tarea no es compromiso, sin avisos, sin límite por plan, «pídele a alguien» como esperando, conversión ilegible | T-046 a T-057 |
| — | **Excepción a H-AG-08 (H-TP-11).** Las propuestas que salen de convertir una tarea en espera van a «Por confirmar» en Tareas, fuera de la conversación, y **no caducan a las 24 horas**: quien se retrasó fue el sistema. Sin la excepción, una tarea pedida antes de CUN-03 se perdería a las 24 horas o al escribir otra cosa (REQ-AGT-01 descarta la propuesta pendiente) | REQ-CUN03-17; T-041; T-056 |
```

**§9, inconsistencias — filas nuevas:**

```
| INC-19 | **«Franja» con dos sentidos.** El glosario la define como corte de Tareas (con fecha, sin fecha, esperando, encargadas), y REQ-CAP-25 llama «franja» a la tira «N cosas en espera» de la agenda | `specs/glosario.md` §4; `specs/01-captura/spec.md` REQ-CAP-25; `specs/02-agenda/spec.md` decisión 26 | Dar otro nombre a la tira de lo en espera (por ejemplo «aviso de lo en espera») o ampliar la definición. `09-tareas-personales` usa «grupo» para «Por confirmar» y para «Tareas para este día» para no sumar un tercero |
| INC-20 | **H-AG-08 dice que la caducidad «vale para toda propuesta»**, y P-11 que lo encolado vuelve «por la confirmación de siempre» sin perderse. Con las tareas en espera, las dos no se cumplen a la vez | `specs/02-agenda/spec.md` decisión 12; `specs/07-agente/spec.md` decisión 28; `SPEC.md` P-11 | H-TP-11 |
| INC-21 | **`PROPUESTA-TECNICA.md` §8 describe una sola tabla `tarea`** con «responsable y quien delegó»; `09-tareas-personales/plan.md` propone una tabla solo para lo personal | `PROPUESTA-TECNICA.md` §8; `specs/09-tareas-personales/plan.md` §3 | Decidir al planificar CUN-07 si comparten tabla (H-TP-13) |
```

**§10, fases — fila 1, al final de su estado:**

```
… De la fase 1 quedan T-021 (agenda en el móvil) y las tareas personales: **CUN-03 especificado el 2026-11-06** en `09-tareas-personales` (borrador, T-046 a T-049 para el dominio y la API; T-050, T-051, T-056 son de la fase 2; T-052 a T-055 y T-057, pantallas)
```

Y en «Siguiente paso concreto»: el hito 3 pasa de «especificar CUN-03» a «avalar `09-tareas-personales` (sobre todo H-TP-11) y empezar por T-046».

**§11, registro de cambios:**

```
| 2026-11-06 | 2.21.0 | **CUN-03 especificado: área nueva `09-tareas-personales`**, borrador pendiente de aval. 20 requisitos (REQ-CUN03-01 a 20): ciclo de vida con tres estados y tres franjas; esperando de alguien y «Recibido»; lista, vencidas y estados vacíos; «Hecho» y «Reabrir» como controles directos sin tarjeta; descartar y cambiar con tarjeta; las tareas en Hoy sin ser compromisos; el asistente (consultar, completar con candidatas, lo que no hace); la conversión de lo que estaba en espera a «Por confirmar»; sin asistente, privacidad y sin calendario. Hallazgos H-TP-01 a 18; **H-TP-11 es una excepción a H-AG-08**. Plan (tabla `tarea`, seis Operaciones `tareas.*`, rutas, contratos, herramientas, pantallas, conversión) y tareas T-046 a T-057. Glosario: tarea personal, recibido, por confirmar, vencida. INC-19 a 21. `tools/trazabilidad.py` registra el prefijo CUN03. 177 requisitos (171 vigentes). Sin cambios de código | `specs/09-tareas-personales/`, `specs/glosario.md`, `specs/trazabilidad.md`, `tools/trazabilidad.py`, `SPEC.md` | Carril CUN-03 (Claude), integrado por Claude Code |
```

## 6. Cambios que se piden en otras áreas

No se tocaron: van en la integración, con su línea en §11. Lista completa en `spec.md` §10.

| Dónde | Cambio |
|---|---|
| `07-agente`, REQ-AGT-02 | Versión 2 sin la oración de la tarea en espera; la 1 queda como anterior |
| `07-agente` §2 y REQ-AGT-04 | La tarea deja de esperar y pasa a ser actividad junto al compromiso |
| `07-agente`, decisión 27 | `guardado` deja de producirse para tareas |
| `02-agenda`, decisión 12 (H-AG-08) | La excepción de H-TP-11 |
| `01-captura`, REQ-CAP-25 | Cambiar el ejemplo «las tareas llegan en una próxima versión» |
| `04-comunicaciones`, REQ-CUN04-14 | Decidir si REQ-CUN03-07 lo cubre para el Plan Personal |
| `glosario.md`, «En espera» | Quitar «como una tarea» del ejemplo de motivo |

## 7. Coordinación con otros carriles

- **Numeración:** T-046 a T-057. El carril de administración empieza en la última + 20 (T-065 según su encargo). No se pisan; Claude Code puede renumerar al integrar.
- **`tools/trazabilidad.py`:** una línea, `"CUN03": "1"` en `FASE_POR_PREFIJO`. Si el carril de administración añade su prefijo en el mismo diccionario, el conflicto es trivial (dos líneas seguidas).
- **`specs/trazabilidad.md`:** se regenera entero; al integrar los dos carriles, basta con volver a ejecutar `python tools/trazabilidad.py` y conservar las columnas manuales de los dos.
- **`specs/glosario.md`:** filas nuevas en §3, §4 y §5. Si el carril de administración añade en §1, no hay solape.
- **Carril de interfaz:** su ajuste de la franja «en espera» solo en Hoy del móvil es la base que asume REQ-CUN03-13.
- **INC-19 a 21 y la versión 2.21.0** son los siguientes libres en la base; si otro carril propone los mismos números, se renumeran al integrar.
- **Glosario por secciones:** el archivo no está ordenado alfabéticamente sino por sección. Las entradas nuevas van en su sección, junto al término con el que se relacionan.
- **Una nota sobre el encargo:** pide citar «P-05/P-06» para lo que sigue necesitando confirmación. El principio de la confirmación es **P-03**; P-05 (zona horaria) se cita para las fechas y P-06 (proveedor) no aplica. La especificación cita P-03.

## 8. Preguntas para el equipo

1. **H-TP-11.** ¿Se acepta que las propuestas de la conversión no caduquen a las 24 horas y vivan en «Por confirmar» fuera de la conversación? La alternativa es pasarlas una a una por la conversación, con el riesgo de perderlas a las 24 horas o cuando la persona escribe otra cosa.
2. **H-TP-09.** ¿Las tareas con fecha se quedan solo en Hoy, o también se ven en Semana (por ejemplo, una marca por día)? Hoy se dejó fuera para que Agenda siga contestando «qué va a pasar» (R-23, R-26).
3. **H-TP-07.** ¿Está bien que «Hecho» no lleve tarjeta? Es coherente con DP-01 y con «Acción sensible», pero es la primera escritura sin tarjeta del producto.
4. **H-TP-10.** ¿Se acepta que «recuérdame» no programe un aviso en esta versión? Es lo que más puede sorprender en la demostración.
5. **H-TP-12.** ¿«Esperando de alguien» se marca como del Plan Personal desde ya, o se espera a REQ-CAP-05 y D-7?
6. **H-TP-13 e INC-21.** ¿Las tareas delegadas de CUN-07 compartirán la tabla `tarea` o irán aparte? No bloquea CUN-03, pero conviene saberlo antes de T-047.
7. **INC-19.** ¿Qué nombre lleva la tira «N cosas en espera» de la agenda, para que «franja» quede solo para Tareas?
8. **Ejemplo de `secciones.ts`.** «Pídele a María Fernanda el informe para el lunes» aparece como ejemplo de Tareas para todos. Con H-TP-14 lleva a «esperando de alguien». ¿Se conserva o se cambia por uno que no suene a delegación?
