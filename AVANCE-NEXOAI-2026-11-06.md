# Avance de NexoAI — 6 de noviembre de 2026 (noche)

**Para:** Claude Code, al retomar la rama `modificacion/vision-nexoai`.
**Qué es:** el estado exacto del repositorio y del producto tras el trabajo en paralelo de hoy (tres carriles además del tuyo), qué está commiteado y qué está **solo en el árbol de trabajo**, y qué te toca hacer en qué orden. Complementa a `AVANCE-NEXOAI-2026-11-05.md`; donde difieran, manda este.
**No es especificación.** Lo que se afirma del código se comprobó en una copia exacta de `36a9551` y en pruebas automáticas; las cifras de §2 salen de esas corridas.

---

## Índice

1. [Resumen](#1-resumen)
2. [Estado del repositorio: commiteado frente a sin commit](#2-estado-del-repositorio-commiteado-frente-a-sin-commit)
3. [Qué se hizo hoy, por carril](#3-qué-se-hizo-hoy-por-carril)
4. [Lo que la persona ve ahora en `localhost:3001`](#4-lo-que-la-persona-ve-ahora-en-localhost3001)
5. [Pruebas: antes y después](#5-pruebas-antes-y-después)
6. [Lo que te toca hacer, en orden](#6-lo-que-te-toca-hacer-en-orden)
7. [Decisiones tomadas durante el diseño que hay que confirmar](#7-decisiones-tomadas-durante-el-diseño-que-hay-que-confirmar)
8. [Hallazgos para tu carril (API y agente)](#8-hallazgos-para-tu-carril-api-y-agente)
9. [Aclaración: «Esperando de alguien» no es del plan Empresarial](#9-aclaración-esperando-de-alguien-no-es-del-plan-empresarial)
10. [Avance frente al plan por valor](#10-avance-frente-al-plan-por-valor)
11. [Riesgos y cosas sueltas](#11-riesgos-y-cosas-sueltas)

---

## 1. Resumen

| Indicador | 5 de noviembre | Hoy |
|---|---|---|
| Último commit de la rama | `9217a68` (T-038) | `36a9551` (T-039) |
| Requisitos especificados | 154 | **157** (REQ-CUN01-14, 15; REQ-CAP-25), en el árbol de trabajo |
| Tareas del agente hechas | T-038 | T-038, **T-039** (commit) |
| Tareas de interfaz hechas | — | **T-044** (Semana y Mes) y **T-045** (franja «en espera»), web y móvil, **sin commit** |
| Pulido sin tarea | — | «Ver anteriores» visible (web y móvil), **sin commit** |
| Pruebas e2e web | 16 | 20 (+4), 21 de 22 corridas en el contenedor |
| Pruebas e2e móvil | 8 | 11 (+3) |
| Pruebas API | 232 | 232 (sin cambios) |
| Pruebas visuales del plan | A0 (línea base) | **A0–A6 hechas** sobre T-039: 19 de 20; la que falla ya está corregida por el pulido |
| Hito 1 del plan por valor | 0 de 2,5 sesiones | T-039 hecha; faltan T-040 y T-043 |
| Hito 2 del plan por valor | 0 de 3 | **Hecho** salvo commit, `SPEC.md` y marcar tareas |

**En una frase:** la conversación ya no se borra, hay separadores, «Ver anteriores» se ve, y la agenda tiene Semana, Mes y la franja de lo que está en espera. Falta que el agente se acuerde de lo recién hecho (T-040) y que todo esto quede commiteado y registrado en `SPEC.md`.

---

## 2. Estado del repositorio: commiteado frente a sin commit

### 2.1 Commits en `modificacion/vision-nexoai` (del más reciente)

| Hash | Qué | Autor |
|---|---|---|
| `36a9551` | T-039: la conversación ya no se vacía (web y móvil) | Claude Code |
| `9c42ef3` | Plan por valor, decisiones 27 y H-AG-08, REQ-CUN01-01 y 13 precisados, T-043 (solo especificación) | Claude Code |
| `f7a6301` | «envio 01»: pruebas de T-038, avance del 5 de noviembre, incidencia del ingreso móvil. **Incluye por error `.nexoai-9217a68.tgz` (6,6 MB)** | Franco |
| `c93687e` … `e614c8a` | P0 y sus enmiendas, T-038 | Claude Code |

### 2.2 En el árbol de trabajo, sin commit (28 archivos, +1 654 / −126)

Son el resultado de aplicar los siete parches de `entregas/` sobre `36a9551`; se copiaron como archivos para que Franco los viera en `localhost:3001` sin tocar el historial. **Los parches de `entregas/` y estos archivos son lo mismo: no apliques los parches encima.**

| Grupo | Archivos | Carril |
|---|---|---|
| Especificación | `specs/02-agenda/spec.md` (REQ-CUN01-14, 15; decisiones 20–26), `specs/02-agenda/plan.md` (§10), `specs/02-agenda/tasks.md` (§7: T-044, T-045, pulido), `specs/01-captura/spec.md` (REQ-CAP-25), `specs/trazabilidad.md` (157, 0 problemas), `design/ARQUITECTURA-VISUAL-WEB.md` (§9 punto 2) | C |
| Web | `src/lib/agenda.ts`, `src/lib/asistente.ts`, `src/app/page.tsx`, `src/app/acciones.ts`, `src/app/aplicacion/{aplicacion,conversacion,iconos}.tsx`, **nuevos** `aplicacion/agenda.tsx` y `aplicacion/en-espera.tsx`, `globales.css`; e2e: `agenda.spec.ts`, `asistente.spec.ts`, `cuentas.json`, `arrancar-api.mjs` (solo semilla de cuentas) | B-web |
| Móvil | `src/agenda/dia.ts`, `src/pantallas/{agenda,captura,inicio}.tsx`, **nuevo** `pantallas/en-espera.tsx`; e2e: **nuevos** `agenda-semana-y-mes.spec.ts`, `en-espera.spec.ts`, `cuentas.json` | B-móvil |

### 2.3 Sin seguimiento, que no deben entrar

`.nexoai-36a9551.tgz` (paquete temporal, bórralo), `entregas/` (parches ya aplicados como archivos; puede quedarse como registro o borrarse), `design/capturas/2026-11-06-t039/` (sí entra: evidencia de las pruebas).

---

## 3. Qué se hizo hoy, por carril

| Carril | Quién | Qué | Dónde está |
|---|---|---|---|
| A · agente | Claude Code | T-039; decisiones 27 (tarea guardada cierra el episodio) y H-AG-08 (24 h con aviso); T-043 especificada; ajuste de `AGENTS.md` | Commits `9c42ef3`, `36a9551`, `c93687e` |
| B · interfaz web | Agente Opus (encargo en `entregas/ENCARGO-CARRIL-B.md`) | T-044, T-045 y pulido en `apps/web`; 4 pruebas e2e nuevas; 6 capturas | Árbol de trabajo; parches en `entregas/carril-b-web/`; capturas en `entregas/capturas-carril-b/web/` |
| B · interfaz móvil | Agente Opus | Lo mismo en `apps/movil`; 3 pruebas nuevas; 8 capturas | Árbol de trabajo; `entregas/carril-b-movil/`; `entregas/capturas-carril-b/movil/` |
| C · especificación | Claude (chat) | REQ-CUN01-14, 15, REQ-CAP-25; decisiones 20–26; plan §10; T-044, T-045; trazabilidad | Árbol de trabajo; `entregas/carril-c/` |
| D · pruebas | Claude (chat) | A1–A6 sobre `36a9551`, con comparaciones antes/después | `design/capturas/2026-11-06-t039/INFORME-PRUEBAS-T039.md` |

Los carriles B y C se hicieron en copias del commit `36a9551`, en árboles separados, sin tocar `apps/api` ni `packages/contratos`, para no chocar con tu trabajo en T-040 y T-043.

---

## 4. Lo que la persona ve ahora en `localhost:3001`

Comprobado por Franco a las 22:53 con su cuenta y Groq (captura en el chat):

| Pantalla | Antes de hoy | Ahora |
|---|---|---|
| Conversación tras confirmar | Se vaciaba | Se conserva; separador «Viernes 6, 22:05 · Se registró "clase de diseño de PCB"» |
| Tarea dicha al asistente | Desaparecía con la conversación | Queda con su separador «Tarea guardada» y aparece en la franja «N cosas en espera» sobre la agenda de hoy |
| «Ver anteriores» | Arriba, fuera de la vista (A4.b) | Pegado arriba, visible siempre que haya más |
| Agenda | Solo Hoy | Hoy · **Semana** · **Mes**, con navegación y «Volver a hoy» |
| Tareas | Vacío con las tres franjas | Igual (CUN-03 no está especificado; ver §9) |

Lo que **no** cambia todavía: tras confirmar, «mejor a las 5» sigue sin saber a qué se refiere (T-040), y el remate «He consultado tu agenda; ya tienes la lista disponible. ¿Hay algo más…?» sobra (una línea en `instrucciones.ts`, §8).

---

## 5. Pruebas: antes y después

| Conjunto | Antes | Después | Notas |
|---|---|---|---|
| API (Vitest) | 232 | 232 | Sin cambios en `apps/api` |
| Web e2e | 16 | 20 | Nuevas: `web.agenda-semana-y-mes` (2), `web.en-espera-visible`, `web.asistente-historial` (+1, pegajoso). 21 de 22 corrieron en el contenedor: `acceso.recorrido-web › volver desde otro sitio` tiene `localhost:3101` escrito a mano y no se corrió con otros puertos; en tu equipo debe pasar |
| Móvil e2e | 8 | 11 | Nuevas: `movil.agenda-semana-y-mes` (2), `movil.en-espera-visible` |
| Tipos | — | Limpios en web y móvil | `tsc --noEmit` |
| Visuales A1–A6 | — | 19 de 20 | `design/capturas/2026-11-06-t039/`; la fallida (A4.b) la corrige el pulido |
| `verificar` completo | En verde en `36a9551` | **Pendiente en tu equipo** con los 28 archivos | Es tu primer paso (§6) |

---

## 6. Lo que te toca hacer, en orden

1. **Comprobar y commitear lo que está en el árbol**, en este orden y con estos mensajes (coinciden con los parches de `entregas/`):
   - `Semana y Mes (REQ-CUN01-14, 15), lo en espera visible (REQ-CAP-25), T-044 y T-045 (solo especificación)` → los 6 archivos de especificación y diseño.
   - `T-044 · Semana y mes en la web`, `T-045 · Franja «en espera» en la web`, `Pulido · «Ver anteriores» visible en la web` → `apps/web/**` (si prefieres un solo commit por paquete, vale: `T-044 y T-045 en la web, con el pulido de «Ver anteriores»`).
   - Lo mismo para `apps/movil/**`.
   - Antes del primer commit: `npx pnpm@12.10.1 verificar` y `python tools/trazabilidad.py --check` (hoy: 157, 0 problemas).
2. **`SPEC.md`** (solo tú lo tocas): §5 conteo 157 (02-agenda 15, 01-captura 25); §8 abierto «retirar algo de la cola desde la franja»; §9 nada nuevo; §11 una línea por el lote. Versión 2.20.0.
3. **Marcar T-044 y T-045 como hechas** en `specs/02-agenda/tasks.md` y `trazabilidad.md` (`implementado`, con las pruebas), con la fecha y el conteo de pruebas.
4. **Borrar `.nexoai-36a9551.tgz`** y, si Franco no lo ha hecho, quitar `.nexoai-9217a68.tgz` del historial (`git rm --cached` + `*.tgz` en `.gitignore`; ya está `.nexoai-src.tgz`, generalízalo).
5. **T-040** (nota de continuidad) y **T-043** (agenda al día, fin a medianoche), como estaba previsto. Suma la línea de instrucciones de §8.1.
6. **Dos ajustes pequeños de interfaz** que salieron de la revisión (§8.3 y §8.4): franja solo en el nivel Hoy en el móvil; quitar la opacidad 0,6 o darle token.
7. Avisar cuando T-040 esté en commit: toca el bloque **B5–B10** del plan de pruebas (lo corre el chat con el simulado; la corrida contra Groq la hace Franco).

---

## 7. Decisiones tomadas durante el diseño que hay que confirmar

Ya están escritas como decisiones 20–26 en `specs/02-agenda/spec.md` §«Detectadas al especificar Semana y Mes»; faltan el aval del equipo y su eco en `SPEC.md` §8 si alguna queda abierta.

| # | Decisión | Estado |
|---|---|---|
| 20 | La semana empieza en lunes | Propuesta |
| 21 | Mes: un punto por cada dos compromisos, hasta tres; sin cifras | Propuesta |
| 22 | Semana y Mes leen la copia local con el margen de 2 min (solo el asistente fuerza la lectura, decisión 18); `RANGO_MAXIMO_DIAS` es 366 | Propuesta |
| 23 | Semana y Mes son solo de consulta | Propuesta |
| 24 | Fecha de foco única; «Anterior/Siguiente»; «Esta semana / Este mes» en la web | Tomada al construir |
| 25 | Cancelados no cuentan para los puntos; varios días cuentan en cada día; días de otros meses elegibles | Tomada al construir |
| 26 | Franja «en espera» en el nivel Hoy, también sin calendario; frase y motivo desde `vistaConfirmacion` | Tomada al construir; **ver §8.2** |

---

## 8. Hallazgos para tu carril (API y agente)

1. **Remate sobrante tras una consulta.** Con Groq, después de la lista el modelo añade «He consultado tu agenda; ya tienes la lista disponible. ¿Hay algo más en lo que pueda ayudarte?». Una línea en `instrucciones.ts`: tras `agenda_consultar`, no añadir texto; la lista es la respuesta. Va con T-040, que ya toca las instrucciones.
2. **Motivos de la espera largos.** `OperacionRespuesta` no expone `motivoEspera` ni `solicitudOriginal`; la franja usa «Lo que pediste» y `motivoNoConfirmable` de `vistaConfirmacion`, y por eso dice «Las tareas llegan en una próxima versión. Queda guardado hasta entonces.» en vez de «las tareas llegan en una próxima versión». Para los textos cortos de REQ-CAP-25 hacen falta esos dos campos en `packages/contratos/src/operaciones.ts` y en `OperacionesService` (lectura, sin escritura nueva). Es un cambio de contrato, así que es tuyo; anótalo como hallazgo de `02-agenda` o `07-agente`.
3. **Franja en el móvil en los tres niveles**, en la web solo en Hoy. REQ-CAP-25 dice «sobre la agenda de hoy»: unificar al nivel Hoy en `apps/movil/src/pantallas/inicio.tsx` (pocas líneas).
4. **Opacidad 0,6** mientras carga la vista nueva en la web (`globales.css`): no sale de ningún token. Quitarla o añadir el token.
5. **Semana con hoy al final**: no se desplaza solo hasta hoy si hay muchos compromisos. Mejora menor, sin tarea.
6. **`RANGO_MAXIMO_DIAS` es 366** en `packages/contratos/src/agenda.ts`; el «31 días» que circula es el de la herramienta del asistente. La especificación ya lo dice bien (decisión 22).
7. **Prueba con puerto escrito a mano**: `apps/web/e2e/acceso.spec.ts`, «volver desde otro sitio», usa `localhost:3101` literal. Conviene leerlo de la configuración, como hacen las demás.

---

## 9. Aclaración: «Esperando de alguien» no es del plan Empresarial

Franco vio la franja «Esperando de alguien» en Tareas con `personal@nexoai.test` y preguntó si era del plan Empresarial. No lo es, y **no la añadió ningún carril de hoy**: `apps/web/src/app/aplicacion/secciones.ts` ya la traía en `36a9551` (línea 24, con el comentario R-38), y la sección Tareas sigue vacía porque CUN-03 no está especificado.

La regla de producto lo deja claro (`REPLANTEO.md` §8, línea 270): *«Esperando de alguien» en Personal y «encargadas» en Empresarial son la misma franja a distinta escala.* Es decir:

| Franja | Plan | Qué es |
|---|---|---|
| Con fecha · Sin fecha · **Esperando de alguien** | Gratuito y Personal (CUN-03) | Tus tareas, incluidas las que dependen de que otra persona te responda («le pediste el presupuesto hace 5 días», diseño móvil línea 56) |
| **Encargadas** | Empresarial (CUN-07) | Lo que encargaste a tu equipo. `aplicacion.tsx` lo tiene previsto y el colaborador no la ve (REQ-ACC-15) |

Así que la pantalla está bien para el plan Personal; lo que falta es el contenido, que llega con el hito 3 del plan por valor.

---

## 10. Avance frente al plan por valor

| Hito | Lo que gana la persona | Estado | Falta |
|---|---|---|---|
| 1 | Conversación continua; asistente que se acuerda | **A medias** | T-040, T-043, pulido de la tarjeta en conflicto |
| 2 | Semana y Mes | **Hecho** (sin commit) | Commit, `SPEC.md`, marcar tareas, ajustes §8.3–8.4 |
| — | Lo en espera visible (venía del hito 1) | **Hecho** (sin commit) | Igual que el 2; motivos cortos (§8.2) |
| 3 | Tareas de verdad (CUN-03) | No empezado | Especificar primero (una sesión), 7 en total |
| 4 | Actividad y registro | No empezado | Depende del 3 |
| 5 | La jornada | No empezado | Depende del 3 y de D-5 |

Sesiones consumidas hoy fuera de tu carril: unas 2 (los dos agentes en paralelo, 16 minutos cada uno, más la especificación y las pruebas). Por eso el hito 2 salió antes que el 1: era independiente y de más valor por sesión.

---

## 11. Riesgos y cosas sueltas

- **Los 28 archivos están sin commit en el equipo de Franco.** Cualquier `git checkout` o `git stash` descuidado los pierde; el respaldo son los parches de `entregas/`. Commitearlos es lo primero.
- **`verificar` completo no se ha corrido con todo junto** (en el contenedor se corrió por paquete). Si algo falla, lo más probable es la prueba del puerto fijo (§8.7) o la prueba intermitente del móvil ya conocida.
- **Groq**: la clave se renovó hoy; las corridas de evaluación siguen siendo a mano y una sola por cambio de instrucciones.
- **Integración continua** sigue en rojo por `node-forge` hasta que entre `actualizacion/error-npm`.
- **PowerShell**: `npx` falla con la política de ejecución; usar `npx.cmd` o `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. Conviene una línea en `AGENTS.md`.
