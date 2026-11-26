# Avance de NexoAI por perfil — 6 de noviembre de 2026

**Qué es:** cuánto puede hacer hoy cada perfil (usuario Gratuito, usuario Personal, colaborador, gerente) y cómo va el resto del proyecto: áreas, hitos del plan por valor, plataformas y calidad.
**Fuentes:** `specs/trazabilidad.md` (157 requisitos, 0 problemas), `SPEC.md` 2.20.1, `PLAN-VALOR-USUARIO.md`, `AVANCE-NEXOAI-2026-11-06.md` (el de los carriles B, C y D) y `git status` de la rama `modificacion/vision-nexoai`.
**No es especificación.** Si difiere de `SPEC.md`, manda `SPEC.md`.

---

## 1. Cómo leer las cifras

Hay tres estados del código, y las cifras los separan:

| Estado | Qué significa | Ejemplo |
|---|---|---|
| **Commiteado** | En un commit de la rama, con `verificar` en verde | T-039, `36a9551` |
| **Sin commit** | El código existe en el árbol de trabajo y se ve en `localhost:3001`, pero no está commiteado, no figura en `SPEC.md` y la trazabilidad lo marca como pendiente | Semana y Mes (T-044), franja «en espera» (T-045) |
| **Pendiente** | No hay código | T-040, tareas personales |

«Implementado» cuenta solo lo **commiteado y con prueba**. La columna «con lo sin commit» suma REQ-CUN01-14, REQ-CUN01-15 y REQ-CAP-25, que están hechos sin commit.

---

## 2. Resumen

| Indicador | Valor |
|---|---|
| Requisitos | 157 especificados, 151 vigentes |
| Implementados (commiteados) | **32 de 151 (21 %)** |
| Con lo sin commit | **35 de 151 (23 %)** |
| En curso | 6: REQ-CAP-01, 02 y 06; REQ-CUN01-01 y 13, reabiertos el 6 de noviembre para la agenda al día y el fin a medianoche; REQ-AGT-01, que espera la nota de continuidad |
| Tareas | T-001 a T-039 hechas, salvo T-040 a T-043 del agente. T-044 y T-045 hechas sin commit |
| Pruebas en `36a9551` | API 233, web 18, móvil 8, contratos 16: **275 en verde** |
| Pruebas con lo sin commit | Según el informe de los carriles: 4 más en la web y 3 más en el móvil. **No comprobado aquí con `verificar`** |

---

## 3. Avance por perfil

Los planes son acumulativos: Gratuito ⊂ Personal ⊂ Empresarial. Cada perfil cuenta los requisitos que le aplican.

### 3.1 Cifras

| Perfil | Requisitos que le aplican | Implementados | Con lo sin commit | El 5 de noviembre |
|---|---|---|---|---|
| **Usuario, plan Gratuito** | 57 | 29 (**51 %**) | 32 (**56 %**) | 56 % (sobre 54) |
| **Usuario, plan Personal** | 96 | 29 (**30 %**) | 32 (**33 %**) | 32 % (sobre 93) |
| **Colaborador** | ~112 | 32 (**29 %**) | 35 (**31 %**) | ~30 % |
| **Gerente / responsable** | 148 | 29 (**20 %**) | 32 (**22 %**) | 21 % |

**Por qué el Gratuito no sube aunque se avanzó:** el 6 de noviembre entraron tres requisitos nuevos (semana, mes y la franja «en espera»), y REQ-CUN01-01 y 13 volvieron a «en curso» al precisarse tras la prueba del equipo. Las dos cosas bajan el porcentaje commiteado. Con lo sin commit, el plan Gratuito vuelve al 56 %, ahora sobre una base mayor.

### 3.2 Qué puede hacer hoy cada uno

| Lo que se ve | Gratuito | Personal | Colaborador | Gerente |
|---|---|---|---|---|
| Entrar, primer ingreso con zona, conectar Google | ✔ | ✔ | ✔ | ✔ |
| Agenda de **hoy** con los compromisos reales | ✔ | ✔ | ✔ | ✔ |
| Agenda de **semana y mes** | ◐ sin commit | ◐ sin commit | ◐ sin commit | ◐ sin commit |
| Pedirle al asistente consultar, registrar, mover o cancelar, con tarjeta | ✔ | ✔ | ✔ | ✔ |
| **La conversación no se borra**; separadores; «Ver anteriores» | ✔ T-039 | ✔ | ✔ | ✔ |
| Ver lo que quedó **en espera** fuera de la conversación | ◐ sin commit | ◐ sin commit | ◐ sin commit | ◐ sin commit |
| «Mejor a las 5» tras confirmar; «¿qué hicimos?» | ✘ T-040 | ✘ | ✘ | ✘ |
| Tareas propias | ✘ hito 3 | ✘ | ✘ | ✘ |
| Planificar el día | — | ✘ hito 5 | ✘ | ✘ |
| Correo asistido | — | ✘ fase 5 | ✘ | ✘ |
| Su parte de equipo | — | — | ✘ CUN-09 | ✘ CUN-05 a 08 |

### 3.3 Lectura por perfil

| Perfil | Lectura | Lo que más pesaría |
|---|---|---|
| **Gratuito** | Es el más cerca de un producto completo. Con Semana y Mes commiteados y T-040, la agenda con asistente queda redonda. Lo que más se nota que falta son las tareas: el asistente guarda «recuérdame…» pero no puede crearla | Commitear el hito 2 y hacer T-040 |
| **Personal** | Hoy no se distingue del Gratuito: lo suyo (la jornada y el correo asistido) no tiene código. El plan por valor lo deja para el hito 5, después de las tareas | Hito 3 (tareas); después, D-5 y la jornada |
| **Colaborador** | Su cifra viene casi entera de lo que comparte con el usuario personal. Su flujo propio (recibir y responder tareas asignadas) está en 0 y no tiene ningún diseño de pantallas (INC-14) | Decidir el recorte de la fase 4 |
| **Gerente** | El perfil con menos avance relativo. Su parte diferencial (disponibilidad del equipo, delegar, seguimiento) está en 0 y depende de decisiones abiertas: rol por equipo, quién lee un reporte, el precio del colaborador | El recorte de la fase 4, para que el Entregable tenga algo del plan Empresarial |

**Una aclaración del informe de los carriles:** la franja «Esperando de alguien» de Tareas es del plan Personal, no del Empresarial. Son las tareas que dependen de que otra persona te responda (`REPLANTEO.md` §8). La del Empresarial es «Encargadas».

---

## 4. Avance por área

| Área | Vigentes | Implementados | En curso | Sin commit | Pendientes |
|---|---|---|---|---|---|
| 06 · Acceso | 17 | 15 | 0 | 0 | 2 (fase 4) |
| 02 · Agenda | 15 | 11 | 2 | 2 (semana, mes) | 0 |
| 07 · Agente | 5 | 2 | 1 | 0 | 2 (REQ-AGT-04, 05) |
| 01 · Captura | 25 | 4 | 3 | 1 (en espera visible) | 17 |
| 02 · Jornada | 24 | 0 | 0 | 0 | 24 |
| 03 · Tareas y delegación | 26 | 0 | 0 | 0 | 26 |
| 04 · Comunicaciones y encargo | 22 | 0 | 0 | 0 | 22 |
| 05 · Equipos | 17 | 0 | 0 | 0 | 17 |
| **Total** | **151** | **32** | **6** | **3** | **110** |

---

## 5. Avance frente al plan por valor

| Hito | Lo que gana la persona | Estado | Falta |
|---|---|---|---|
| 1 · El asistente lleva el hilo | La conversación no se borra; el asistente se acuerda de lo recién hecho | **A medias.** T-039 ✔ commiteada | T-043 (agenda al día, fin a medianoche), T-040 (nota de continuidad), el pulido de la tarjeta en conflicto y T-041 (caducidad a 24 h, retención) |
| 2 · Semana y mes | Ver la semana y el mes, no solo hoy | **Hecho, sin commit** (T-044) | Comprobar con `verificar`, hacer los commits, registrarlo en `SPEC.md` y marcar las tareas |
| — · Lo en espera visible | Ver lo que quedó guardado sin buscarlo en la conversación | **Hecho, sin commit** (T-045) | Lo mismo que el hito 2, y los motivos cortos, que necesitan un cambio de contrato |
| 3 · Tareas personales | Tareas de verdad (CUN-03) | No empezado | Especificar primero; unas 7 sesiones en total |
| 4 · Actividad | Lo que pasó y lo que hizo el asistente | No empezado | Depende del 3 |
| 5 · La jornada | El asistente propone el día | No empezado | Depende del 3 y de D-5 |

---

## 6. Por plataforma

| Qué | Web | Móvil |
|---|---|---|
| Acceso, agenda de hoy, Google | ✔ | ✔ (Google se conecta desde la web) |
| Asistente con tarjeta | ✔ con Groq | ✔; probado en un teléfono Android el 5 de noviembre |
| Conversación que no se vacía, separadores, «Ver anteriores» | ✔ commiteado | ✔ commiteado |
| Semana y Mes; franja «en espera» | ◐ sin commit | ◐ sin commit; la franja aparece en los tres niveles y debería ir solo en Hoy |
| Pruebas visuales A1 a A6 | 19 de 20 (`design/capturas/2026-11-06-t039/`); la que falla la corrige el pulido sin commit | Incluidas en A1 a A6 |

---

## 7. Calidad y método

| Indicador | Estado |
|---|---|
| `verificar` en `36a9551` | En verde, con la prueba intermitente del móvil repetida aparte |
| `verificar` con lo sin commit | **No corrido en este equipo** |
| Trazabilidad | 157 requisitos, 0 problemas |
| Integración continua | En rojo por `node-forge`, hasta que entre `actualizacion/error-npm` |
| Estado guardado del asistente (B2) | 7 777 bytes tras confirmar; la meta de 2 KB sigue sin cumplirse |
| Riesgo inmediato | **32 archivos sin commit**: un `git checkout` o un `git stash` descuidado los pierde. El respaldo son los parches de `entregas/` |
| Archivos que no deben entrar | `.nexoai-36a9551.tgz` (temporal). `.nexoai-9217a68.tgz` entró por error en `f7a6301` |

---

## 8. Próximos pasos

| Orden | Paso | Quién |
|---|---|---|
| 1 | Correr `verificar` con lo sin commit y hacer los commits del hito 2 y de la franja; registrarlo en `SPEC.md` | Claude Code, cuando el equipo lo pida |
| 2 | T-043: agenda al día y fin a medianoche | Claude Code |
| 3 | T-040: nota de continuidad, más la línea que quita el remate «¿Hay algo más…?» tras una consulta | Claude Code |
| 4 | Pruebas B5 a B10 con el simulado; la corrida contra Groq, una sola vez | Equipo |
| 5 | Pulido de la tarjeta en conflicto y T-041 | Claude Code |
| 6 | Especificar CUN-03 (hito 3) y decidir el recorte de la fase 4 | Equipo y Claude Code |
