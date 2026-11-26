# Traspaso para Claude Code — qué leer, qué no, y en qué orden trabajar

**Fecha:** 5 de noviembre de 2026
**Para:** la sesión de Claude Code que trabaja en el repositorio `NEXO_AI` y que **no ha modificado nada** desde `5fe7257` (`main`).
**Qué es:** el mapa de lectura y de trabajo para continuar sin releer todo. Resume tres hilos ya analizados (contexto y memoria del agente, parte visual, orden de aplicación) y los convierte en una secuencia de trabajo sobre ramas. **No sustituye a `AGENTS.md`**, que sigue mandando.

---

## Índice

1. [Estado de partida](#1-estado-de-partida)
2. [Leer primero, en este orden](#2-leer-primero-en-este-orden)
3. [Leer solo cuando toque ese código](#3-leer-solo-cuando-toque-ese-código)
4. [No leer, no tocar](#4-no-leer-no-tocar)
5. [Los tres hilos y a dónde va cada uno](#5-los-tres-hilos-y-a-dónde-va-cada-uno)
6. [Orden de trabajo en la aplicación](#6-orden-de-trabajo-en-la-aplicación)
7. [Decisiones pendientes, con valor por defecto](#7-decisiones-pendientes-con-valor-por-defecto)
8. [Reglas operativas para esta sesión](#8-reglas-operativas-para-esta-sesión)
9. [Sobre la lentitud del método: diagnóstico y ajuste](#9-sobre-la-lentitud-del-método-diagnóstico-y-ajuste)
10. [Guía visual: qué debe verse después de cada cambio](#10-guía-visual-qué-debe-verse-después-de-cada-cambio)

---

## 1. Estado de partida

| Cosa | Estado |
|---|---|
| Rama publicada | `main` en `5fe7257` en `github.com/f6945391-crypto/NEXO_AI`. Fase 2 completa (T-001 a T-037) |
| Integración continua | **En rojo** por `pnpm audit`: node-forge ≤ 1.4.0 vía la CLI de Expo. Arreglo conocido (`PLAN-RAMAS.md` §3) |
| Código del agente | Funciona con Groq y con el simulado. Ningún cambio desde T-037 |
| Documentos nuevos (sin commit o recién pusheados) | `INFORME-MEMORIA-AGENTE.md`, `INFORME-ESTRUCTURA-Y-REESTRUCTURACION-AGENTE.md`, `design/capturas/2026-11-04/INFORME-VISUAL-AGENTE.md`, `PLAN-RAMAS.md`, este archivo |
| Ramas a crear (las crea el equipo) | `actualizacion/error-npm` (corta) y `modificacion/vision-nexoai` (larga) |
| **Reparto git** | **Claude Code solo hace cambios y commits locales en la rama que se le indique. No crea ramas, no hace `push`, no abre *pull requests*, no fusiona. Todo eso lo hace Franco desde su equipo** |
| Temporal a borrar | `.nexoai-src.tgz` en la raíz |

**Diagnóstico en una frase:** el agente vacía la conversación tras cada acción porque REQ-AGT-01 y el glosario lo mandan; el diseño visual había previsto otra cosa (vaciado decidido por la persona, lienzo como registro); la transcripción vive dentro del estado de LangGraph. Se separa en tres capas (transcripción, contexto de trabajo, memoria por actividad) y se corrige la interfaz en consecuencia.

---

## 2. Leer primero, en este orden

Tiempo estimado: una sesión. Cada archivo tiene una razón; no hace falta leer más que la parte indicada.

| # | Archivo | Qué parte | Para qué |
|---|---|---|---|
| 1 | `AGENTS.md` | Entero | Cómo se trabaja en el repositorio. Manda sobre todo lo demás |
| 2 | `PLAN-RAMAS.md` | Entero | En qué rama se trabaja, qué commit va primero |
| 3 | `SPEC.md` | §2 (método), §3 (principios P-01 a P-11), §8 (decisiones abiertas), §9 (inconsistencias), §11 (últimas 10 líneas) | Lo que no se puede contradecir y lo que ya está abierto |
| 4 | `specs/07-agente/spec.md` | Entero (es corto) | REQ-AGT-01 y 02 vigentes, hallazgos H-AGT-01 a 15, y el borrador rechazado de §6 |
| 5 | `specs/07-agente/plan.md` | §4 (grafo), §6 (contexto), §9 (rutas), §10 (datos), §13 (hallazgos) | Cómo está construido lo que se va a cambiar |
| 6 | `specs/07-agente/tasks.md` | T-032, T-034, T-035, T-037 | Qué se hizo, con qué pruebas, y los ajustes al plan |
| 7 | `specs/glosario.md` | Entradas «Conversación», «Hilo», «Tarjeta de confirmación» | Los términos que cambian |
| 8 | `INFORME-MEMORIA-AGENTE.md` | §1, §3, §6 (incluida 6.4), §8, §10 | El porqué, la estructura objetivo, el texto de los requisitos nuevos, las decisiones pendientes |
| 9 | `INFORME-ESTRUCTURA-Y-REESTRUCTURACION-AGENTE.md` | §4, §5, §6, §7 | La contradicción diseño–requisito–código, qué archivo cambia y cuánto, el orden T-038 a T-042, los riesgos |
| 10 | `design/capturas/2026-11-04/INFORME-VISUAL-AGENTE.md` | §4, §6, §7 | Hallazgos visuales con evidencia, los cambios paso a paso, cómo encaja la voz |
| 11 | `design/ARQUITECTURA-VISUAL-WEB.md` | §2, §4, §5 | Lo que el diseño ya decía y no se implementó (modo Registro, vaciado por la persona) |

No hace falta leer `INFORME-LANGGRAPH.md`: lo que importa ya está absorbido en los informes 8 y 9 (consultar solo §1 a §4 si surge una duda sobre LangGraph).

---

## 3. Leer solo cuando toque ese código

| Cuando se trabaje en… | Leer |
|---|---|
| T-038 (transcripción) | `apps/api/src/agente/grafo/grafo-asistente.ts` (estado y `comunicar`), `apps/api/src/agente/asistente.service.ts`, `apps/api/src/agente/grafo/punto-control-prisma.ts` (no cambia, pero hay que entenderlo), `packages/contratos/src/asistente.ts`, `apps/api/prisma/schema.prisma` (modelos `ConversacionAgente`, `Operacion`), `apps/api/test/agente/conversacion.spec.ts`, `apps/api/test/plataforma/aislamiento-entre-organizaciones.spec.ts` |
| T-039 (clientes) | `apps/web/src/app/aplicacion/conversacion.tsx`, `apps/web/src/lib/asistente.ts`, `apps/web/src/app/acciones.ts`, `apps/movil/src/pantallas/captura.tsx`, `apps/web/e2e/asistente.spec.ts`, `apps/movil/e2e/captura.spec.ts`, `apps/web/src/app/globales.css` (bloque «Aplicación») |
| T-040 (nota de continuidad) | `apps/api/src/agente/grafo/instrucciones.ts`, `apps/api/src/agente/herramientas/contenido-externo.ts`, `apps/api/src/operaciones/operaciones.service.ts` (solo `listar`), `apps/api/src/agenda/formato.ts`, `apps/api/src/cli/evaluar-asistente.ts` |
| T-041 (ciclo de vida) | `apps/api/src/agente/en-espera.ts`, `apps/api/src/agente/trabajador-en-espera.ts`, `apps/api/src/trabajador.ts` |
| T-042 (alternativas de referente, hilo) | `apps/api/src/agente/herramientas/herramientas-agenda.ts`, `packages/contratos/src/agente.ts`, y lo de T-038 y T-039 |
| Pulido visual | `conversacion.tsx`, `captura.tsx`, `globales.css`, `apps/movil/src/tokens.ts`, `apps/web/src/app/aplicacion/aplicacion.tsx` |
| Regenerar cuadros de Figma | `design/figma/README.md` y sus scripts |
| Error npm | `pnpm-workspace.yaml` (bloques `auditConfig` y `overrides`) |

---

## 4. No leer, no tocar

| Qué | Por qué |
|---|---|
| `node_modules/`, `.turbo/` (4,9 GB), `.next/`, `dist/`, `.expo/`, `apps/api/src/generado/` | Generados; ya ignorados por git |
| `design/capturas/2026-11-04/crudo/` y `herramientas/` | Evidencia y scripts; se consultan desde el informe visual, no se editan |
| `SILABO-AGENTE.md` | Personal del equipo |
| `INFORME-LANGGRAPH.md` | Absorbido (ver §2) |
| `REPLANTEO.md`, Entregable 1 (`entregable-01/`) | Registros de decisiones; `AGENTS.md` prohíbe tocarlos sin pedido del equipo |
| `specs/01-captura`, `02-jornada`, `03-tareas`, `04-comunicaciones`, `05-equipos` | Fuera de alcance de esta rama. Excepción: `01-captura/spec.md` REQ-CAP-09 a 13 solo si se abre el plan de voz |
| `specs/02-agenda/*`, `specs/06-acceso/*` | No cambian. Leer `02-agenda/plan.md` §3 solo para la API de Operaciones |
| `design/VALIDACION-*.md`, `design/INCONSISTENCIAS-*.md`, `design/PRUEBA-*.md`, `INFORME-ESTRUCTURA-DISENO.md`, `PLAN-CIERRE-DISENO.md` | Validaciones anteriores. No se borran (`AGENTS.md`); se marcan como anteriores si el diseño cambia |
| `main` | Solo recibe fusiones por *pull request* |
| `.env` | Nunca se lee en voz alta ni se commitea |

---

## 5. Los tres hilos y a dónde va cada uno

| Hilo | Qué resuelve | Documento fuente | Dónde aterriza |
|---|---|---|---|
| **Contexto y memoria** | Transcripción persistente, episodios, nota de continuidad, actividad como unidad de memoria, inferencia con alternativas | `INFORME-MEMORIA-AGENTE.md` §6 y §8 | P0 (requisitos), T-038, T-040, T-041, T-042 |
| **Parte visual** | Pantalla que no se vacía, separadores, «ver anteriores», tarjeta en conflicto, lienzo en modo Objeto/Registro, anchos, asa | `INFORME-VISUAL-AGENTE.md` §6 | T-039 (lo que depende de T-038) y commits de pulido (lo que no depende de nada) |
| **Orden en la aplicación** | Qué se construye primero para que cada paso se vea y se pruebe solo | `INFORME-ESTRUCTURA-Y-REESTRUCTURACION-AGENTE.md` §6; `PLAN-RAMAS.md` §4 | La secuencia de §6 de este archivo |

Dependencias que no se pueden saltar: **T-039 depende de T-038** (sin transcripción propia, la pantalla no puede dejar de vaciarse al recargar); **T-040 depende de T-038** (la nota se escribe desde Operaciones, pero la evaluación necesita la historia); **T-042 depende de T-038 y T-040**. El pulido visual y el error npm no dependen de nada.

---

## 6. Orden de trabajo en la aplicación

| Paso | Rama | Qué se hace | Termina cuando |
|---|---|---|---|
| A | `actualizacion/error-npm` | Override de node-forge, excepción retirada, línea en `SPEC.md` §11 | `pnpm audit --audit-level high` sin altas, `verificar` en verde, commit local listo; Franco hace push y fusiona el PR |
| B | `modificacion/vision-nexoai` · **P0** | Solo documentos: `SPEC.md` §9 (inconsistencia diseño–requisito–código), H-AGT-16 y H-AGT-17, REQ-AGT-01 v2, REQ-AGT-03 a 05, glosario, diseño web y móvil, `plan.md`, `tasks.md` con T-038 a T-042, `SPEC.md` §5, §8, §11, trazabilidad regenerada | `trazabilidad.py --check` limpio; el equipo revisa el commit antes de seguir |
| C | misma rama · **T-038** | Transcripción propia (`turno_asistente`), `turnos` fuera del estado, `GET /asistente/conversacion` paginado, contratos | Pruebas de T-038; `verificar` en verde |
| D | misma rama · **T-039** | Web y móvil: sin vaciado, separadores, «ver anteriores», `episodioCerrado` | Pruebas e2e ampliadas; capturas nuevas con `design/capturas/2026-11-04/herramientas/` en una carpeta con fecha |
| E | misma rama · **pulido visual** (opcional aquí o en rama corta) | Tarjeta en conflicto, lienzo modo Objeto, invitación duplicada, anchos < 1440, asa, «Pensando», atajos de pregunta | Capturas antes/después |
| F | misma rama · **T-040** | Nota de continuidad, instrucciones, evaluación por trayectorias con dos casos nuevos | Evaluación contra Groq a mano (gasta cuota; una sola corrida) |
| G | misma rama · **T-041** | Cierre por inactividad, retención de puntos de control, `recursionLimit` | Pruebas nuevas |
| H | misma rama · **T-042** (si el equipo lo acepta) | Alternativas de referente, enlace turno→actividad, `actividad.contexto` | Pruebas nuevas; caso de evaluación |
| I | PR `modificacion/vision-nexoai → main` (lo abre Franco) | Tras probar en teléfono real | Fusión por Franco |

**Una regla de ritmo:** después de cada paso, parar y mostrar (commit, `verificar`, capturas si es visual). Nada de encadenar tres tareas sin revisión.

---

## 7. Decisiones pendientes, con valor por defecto

Para que la sesión no se bloquee: si el equipo dice «usa los valores por defecto», se avanza con esta columna y se anota en `spec.md` §5 como decisión tomada durante el diseño.

| # | Decisión | Por defecto propuesto | Dónde se discute |
|---|---|---|---|
| 1 | Adoptar tres capas y tres ciclos de vida | Sí | Memoria §10.1 |
| 2 | Cierre de episodio por inactividad | 30 minutos | Memoria §10.2 |
| 3 | Acciones en la nota de continuidad | Últimas 5 o últimos 7 días, lo menor | Memoria §10.3 |
| 4 | Retención de la transcripción | 90 días; configurable después | Memoria §10.4 |
| 5 | Retención de puntos de control cerrados | 7 días | Memoria §10.5 |
| 6 | Renombrar `conversacion_agente` en la base | **No**; solo en documentos y código | Estructura §9.5 |
| 7 | Dónde se ve lo pasado | Columna de conversación con separadores (ahora); modo Registro del lienzo (después, con Actividad) | Visual §8.1 |
| 8 | Vaciado manual con advertencia | No en esta fase | Visual §8.2 |
| 9 | Vista de «en espera» fuera de la conversación | Franja en el lienzo y en Hoy; retirar de la cola queda abierto | Visual §6 paso 5 |
| 10 | Anchos menores de 1440 | Ceder la conversación hasta 400 px antes que el lienzo; una columna por debajo de 1024 | Visual §6 paso 8 |
| 11 | Actividad como unidad de memoria; inferencia con alternativas | Sí; alternativas armadas por código; T-042 en esta rama solo si hay tiempo | Memoria §6.4 y §10.8 |
| 12 | Varias intenciones en una frase | En secuencia, una tarjeta cada una; resuelto una vez para texto y voz | Memoria §10.9; Visual §7.3 |
| 13 | Voz | Fuera de esta rama; solo el principio «voz → texto aprobado → mismo flujo» queda escrito | Visual §7 |

---

## 8. Reglas operativas para esta sesión

- **Trabajar solo en la rama que el equipo indique, y solo en local.** Claude Code edita y hace `git commit`; **nunca `git push`, nunca `git checkout -b`, nunca abre ni fusiona *pull requests*, nunca toca `main`.** Al terminar cada tarea, deja el commit hecho y avisa; Franco revisa, hace el push y abre el PR. Si la rama indicada no existe en local, se pide que la creen antes de empezar.
- **Orden de `AGENTS.md` sin excepción:** requisito → `SPEC.md` → plan → tareas → código → prueba → trazabilidad. Con el ajuste de ritmo de §9: la pasada de documentos se hace **una vez por rama** (P0), no una vez por cambio.
- **Un commit por tarea**, con `T-nnn` en el mensaje; `npx pnpm@12.10.1 verificar` y `python tools/trazabilidad.py --check` en verde antes de cada commit.
- **No gastar cuota de Groq** salvo en la evaluación de T-040, una sola corrida, avisando antes.
- **No tocar lo que no está en §3 para la tarea en curso.** Si hace falta, decirlo primero.
- **Capturas:** cada cambio visual se documenta con las herramientas de `design/capturas/2026-11-04/herramientas/`, en una carpeta nueva con la fecha. No se sobrescriben las del 4 de noviembre.
- **Avances cortos y revisables.** Mostrar el resultado de cada paso antes de empezar el siguiente.
- **Lo que el spec no cubre es un hallazgo**, no una decisión silenciosa: se anota en `spec.md` §5 y `SPEC.md` §8.

---

## 9. Sobre la lentitud del método: diagnóstico y ajuste

**La observación del equipo:** «el SDD demora en aplicar los cambios».

**Diagnóstico, medido en el propio repositorio.** Cada tarea de la fase 2 tocó, además del código, entre cuatro y seis documentos: `spec.md` §5 (hallazgos), `plan.md` §13 (ajustes), `tasks.md` (estado y notas), `SPEC.md` §8 y §11, y `trazabilidad.md`. T-037, por ejemplo, salió en dos commits (`4f41b07` solo especificación, `e2319de` código) y cuatro archivos de documentación por una constante y un aviso. El método no es lento por sí mismo; es lento **cuando se aplica cambio por cambio** y cuando cada ajuste pequeño obliga a la pasada completa.

**Qué no es la causa.** No es el orden espec → código (ese orden es lo que permitió detectar en una tarde que el vaciado venía de un requisito y no de un bug). No es la trazabilidad (se regenera sola).

**Ajustes que no rompen el método:**

| Ajuste | Qué cambia | Qué no cambia |
|---|---|---|
| **Documentar por lote, no por cambio** | Una sola pasada de documentos para toda la rama (P0), con todos los requisitos y tareas de la rama. Las tareas T-038 a T-042 después solo tocan `tasks.md` (estado y notas) y, si hay un ajuste al plan, una línea en `plan.md` §13 | `AGENTS.md`: el requisito sigue existiendo antes del código |
| **Distinguir comportamiento de presentación** | Un cambio que no altera lo que el sistema hace (la tarjeta en conflicto más corta, el color del asa, los anchos) **no necesita REQ nuevo**: se documenta en `design/` y con una línea en `SPEC.md` §11 | El diseño sigue siendo fuente de verdad visual |
| **«Hecho cuando» como contrato de prueba** | Escribir el «Hecho cuando» y los nombres de las pruebas en `tasks.md` durante P0; la tarea después es código y prueba, sin volver a los documentos | La prueba sigue ligada al requisito |
| **Una línea en `SPEC.md` §11 por commit, no por archivo** | Un registro de cambios por tarea | El historial queda igual de completo |
| **No reescribir informes** | Los tres informes son análisis con fecha; no se mantienen al día. Lo que se adopta pasa a `spec.md`, `plan.md` y `design/`; lo demás queda como estaba | `AGENTS.md`: no se borran documentos anteriores |

**Prueba de ritmo para esta rama.** Con los ajustes anteriores, la rama `modificacion/vision-nexoai` debería salir así: P0 = una sesión de documentos; cada tarea = una sesión de código con **un solo archivo de documentación tocado** (`tasks.md`) salvo hallazgo nuevo. Si una tarea exige volver a `spec.md` o `plan.md` más de una vez, es señal de que P0 quedó incompleto, y eso se corrige en P0, no saltándose el método. Al terminar la rama se puede medir: commits de documentación frente a commits de código. En la fase 2 la relación fue aproximadamente 1:1; el objetivo aquí es 1:4.

---

## 10. Guía visual: qué debe verse después de cada cambio

Para que la sesión no interprete los hallazgos a su manera: por cada pantalla, **la captura de referencia del 4 de noviembre**, lo que se ve hoy y lo que tiene que verse después. Las capturas anotadas están en `design/capturas/2026-11-04/web/` y `movil/`; las crudas en `crudo/`. Los textos siguen R-40 (sin vocabulario interno: nada de «episodio», «turno», «punto de control» en pantalla).

### 10.1 Reglas generales que ya se cumplen y no se pueden perder

| Regla | Dónde se ve | Cómo se comprueba |
|---|---|---|
| La tarjeta muestra la acción exacta, sus datos y lo que puso el sistema por su cuenta | `web/W04-tarjeta.png`, `movil/M05-tarjeta.png` | `role="article"` con nombre «Para confirmar»; texto «1 hora, porque no indicaste la hora de fin» |
| Lo que está en espera se ve en ámbar, con la frase guardada y el motivo, distinto de un fallo | `web/W16-en-espera.png`, `movil/M15-en-espera.png` | Empieza por «En espera.»; ningún `role="alert"` dentro de la conversación |
| El mensaje de la persona aparece al instante y «Pensando…» mientras responde | `web/W03-pensando.png` | `role="status"` con «Pensando…» |
| Web y móvil usan los mismos componentes, textos y jerarquía | todas | Los contratos de `packages/contratos` son la única fuente |
| Nombres accesibles que usan las pruebas | — | `Pídele algo al asistente` (campo), `Enviar`, `Confirmar`, `Descartar`, `Para confirmar` (tarjeta), `Asistente` (región web), `Pedir algo al asistente` y `Cerrar` (móvil) |

### 10.2 Pantalla por pantalla

#### A. Conversación tras confirmar (T-039) — el cambio principal

| | Hoy | Después |
|---|---|---|
| Captura | `web/W06-W08-vaciado.png`, `movil/M06-M08-vaciado.png` | — |
| Qué pasa | Al escribir el siguiente mensaje, la petición, la tarjeta y el «Listo» desaparecen de golpe | Se quedan. Debajo del «Listo» aparece un **separador** y, debajo, el mensaje nuevo |
| El separador | No existe | Una línea fina con texto pequeño centrado, color secundario: «**Jueves 29, 16:12 · Dentista registrado**». El resumen lo arma el código con el tipo de Operación y el título: «registrado», «movido», «cancelado», «descartado». Si el episodio se cerró sin acción (inactividad), solo la hora |
| Código | `conversacion.tsx` línea 202 y `captura.tsx` línea 168: `cerrada ? [provisional] : …` | Siempre `[...previos, provisional]`. El separador se pinta cuando cambia `episodioId` entre dos turnos consecutivos; no es un turno del contrato |
| Prueba | `web.asistente-agenda-y-confirma` | Ampliar: tras confirmar y escribir otra cosa, el texto «Listo: «Revisión»…» sigue visible y existe un separador |

#### B. Recarga y reapertura (T-038 + T-039)

| | Hoy | Después |
|---|---|---|
| Captura | `web/W13-recarga.png`, `movil/M10-reabierta.png` | — |
| Qué pasa | Vuelve el blanco inicial; en móvil solo queda el episodio sin acción | Se ve lo de hoy: los últimos 2–3 episodios con sus separadores, y arriba un botón «**Ver anteriores**» |
| «Ver anteriores» | No existe | Botón secundario al inicio de la lista. Trae la página anterior (cursor), la concatena arriba y **conserva la posición de lectura**. Desaparece cuando no hay más |
| Blanco inicial | Siempre que no hay conversación abierta | Solo cuando la transcripción está vacía de verdad (persona nueva). Si hay historial, se muestra el historial, no los ejemplos |
| Móvil | La capa abre vacía | La capa abre con el episodio actual y el anterior; «Ver anteriores» arriba; la lista baja sola hasta lo último |
| Prueba | — | `web.asistente-historial` (nueva): recargar y ver lo anterior; pulsar «Ver anteriores» y que aparezca un episodio más |

#### C. Tarjeta en conflicto (pulido, sin dependencia)

| | Hoy | Después |
|---|---|---|
| Captura | `web/W10-conflicto.png`, `movil/M11-conflicto.png` | — |
| Qué pasa | La fila «Alternativas» en texto corrido repite fechas largas y, debajo, los mismos horarios como botones; en móvil hay que desplazar para ver de qué acción es | Se quita la fila «Alternativas» en texto. Queda: datos de la acción → motivo en ámbar → botones de alternativa (formato corto «jueves 29, 19:00 – 20:00») → «Descartar». Una frase en el lugar de «Confirmar»: «**No se puede confirmar en este horario**» |
| Móvil | El título de la acción se pierde al desplazar | El título de la tarjeta queda fijo arriba mientras el contenido se desplaza (encabezado pegajoso dentro de la tarjeta) |
| Código | Vista del turno `propuesta` (web y móvil); el contrato `VistaConfirmacion` no cambia: la fila se omite en la vista cuando existe `conflicto.alternativas` | — |
| Prueba | — | Captura antes/después; `web.asistente-agenda-y-confirma` no cambia |

#### D. Lienzo en modo Objeto (pulido; decisión de diseño §4 ya tomada)

| | Hoy | Después |
|---|---|---|
| Captura | `web/W04-tarjeta.png` (lienzo en «Hoy no tienes compromisos» con una tarjeta para el miércoles 23:00) | — |
| Qué pasa | El lienzo no reacciona a la propuesta | Al llegar una tarjeta, el lienzo salta al **día de la propuesta** y marca la franja propuesta (y el solape, si lo hay). Al confirmar, vuelve a Hoy con la fila nueva resaltada 3 segundos. Al descartar, vuelve a donde estaba |
| Móvil | La agenda de fondo no cambia | La agenda de fondo salta al día propuesto; se ve por encima de la capa cuando la capa no ocupa toda la pantalla |
| Código | `aplicacion.tsx` solo refresca tras `resultado` | Reaccionar también a `propuesta` (fecha de la Operación) y a `descartada` |

#### E. «En espera» visible fuera de la conversación (decisión 9 de §7)

| | Hoy | Después |
|---|---|---|
| Captura | `web/W16-en-espera.png`, `movil/M15-en-espera.png` | — |
| Qué pasa | Solo vive en la conversación | Una **franja** encima de la lista de Hoy (web: en el lienzo; móvil: en Inicio): «**2 cosas en espera**», que al abrirse lista cada una con su motivo («el asistente no responde», «falta conectar el calendario», «las tareas llegan en una próxima versión») y, si el equipo lo decide, un botón «Retirar» |
| Código | `OperacionesService.listar(contexto, ['en_espera'])` ya existe | Un componente nuevo en web y móvil; sin ruta nueva en la API |

#### F. Entrada y espera (pulido)

| Elemento | Hoy | Después | Captura |
|---|---|---|---|
| «Pensando…» | Texto plano | Texto con un punto animado; si pasan más de 3 s, cambia a «Sigo en ello…». Sigue siendo `role="status"` | `web/W03-pensando.png` |
| Pregunta por dato que falta | Solo texto «¿Qué día?» | Debajo de la pregunta, **atajos generados por código según `campo`**: para `fecha`: «Hoy · Mañana · Otro día»; para `horaInicio`: «9:00 · 10:00 · Otra hora»; para `titulo`: ninguno. Elegir uno envía ese texto como mensaje normal (no pasa por un camino aparte) | `web/W14-pregunta.png` |
| Asa «Pedir algo» (móvil) | Violeta | Azul primario, el mismo de «Confirmar» | `movil/M02-inicio.png` |
| «Enviar» deshabilitado | Gris claro que parece permanente | Mismo botón con opacidad reducida y borde, para que se lea como «esperando texto» | `movil/M05-tarjeta.png` |
| Invitación duplicada (web) | Blanco de la conversación + botón «Pedírselo al asistente» en el lienzo vacío | El lienzo vacío solo dice «Hoy no tienes compromisos». El botón se conserva en móvil, donde la capa está cerrada | `web/W02-blanco-inicial.png` |

#### G. Anchos menores de 1440 (decisión 10 de §7)

| | Hoy | Después |
|---|---|---|
| Captura | `web/W19-1024.png` | — |
| Qué pasa | A 1024 px la conversación conserva 528 px y el lienzo baja a ~345 px | Entre 1024 y 1440: la conversación cede primero, hasta 400 px; después el lienzo. Por debajo de 1024: una sola columna con la conversación como capa, igual que en móvil |
| Código | `globales.css` línea 186: `72px minmax(300px, 528px) minmax(340px, 1fr)` | `72px minmax(400px, 528px) minmax(500px, 1fr)` y una consulta de medios a 1024 px |
| Documento | — | La regla se anota en `design/ARQUITECTURA-VISUAL-WEB.md` §2 |

#### H. Alternativas de referente (T-042, si entra)

| | Hoy | Después |
|---|---|---|
| Captura | No existe (ver `INFORME-MEMORIA-AGENTE.md` §6.4.5) | — |
| Qué pasa | «Mueve el dentista» con dos dentistas: el modelo pregunta en texto o elige mal | Un turno nuevo con una pregunta corta («¿Cuál?») y **botones de alternativa** armados por el código: «Dentista · jueves 29, 16:00 – 17:00» y «Dentista · 12 de noviembre, 10:00 – 11:00». Mismo componente visual que las alternativas de horario. Elegir uno lleva directamente a la tarjeta de la acción |
| Contrato | — | Turno `alternativas_de_referente` en `packages/contratos/src/asistente.ts`; la elección viaja por `POST /asistente/decisiones` con un tipo nuevo |

### 10.3 Cómo verificar cada cambio visual

1. Levantar la API de pruebas con el simulado y la web o el móvil, como describe `INFORME-VISUAL-AGENTE.md` §9.
2. Correr `design/capturas/2026-11-04/herramientas/capturar-web.mjs` y `capturar-movil.mjs`. Dejan las capturas en `salida/`; copiarlas a `design/capturas/<fecha>/crudo/`.
3. Para las pantallas que cambiaron, generar la anotada con `anotar.py` (ajustando coordenadas) y ponerla junto a la del 4 de noviembre en una comparación antes/después (la función `antes_despues` del script lo hace).
4. Los tamaños de referencia no cambian: **web 1440×900 y 1024×768; móvil 390×844 a escala 2.** Si se añade un tamaño (por ejemplo, 768 para la columna única), se documenta en el informe nuevo.
5. **Nunca sobrescribir** `design/capturas/2026-11-04/`.

### 10.4 Lo que la sesión no debe decidir sola en lo visual

- Colores, tipografía y espaciado nuevos: solo con los tokens existentes (`apps/movil/src/tokens.ts`, variables de `globales.css`). Nada inventado.
- Iconos: siguen siendo marcadores geométricos (diseño §7). No añadir un juego de iconos.
- Textos nuevos en pantalla: cortos, en segunda persona, sin vocabulario interno. Si hay duda, usar el patrón de los que ya existen («Listo: …», «De acuerdo, no hice nada.», «En espera. …»).
- Cualquier pantalla o sección nueva (Actividad, detalle de actividad): no entra sin decisión del equipo; solo se deja el hueco documentado.
