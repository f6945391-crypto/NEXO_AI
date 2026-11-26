# Plan por valor para la persona que usa NexoAI

**Fecha:** 6 de noviembre de 2026
**Qué es:** el orden de trabajo de aquí en adelante, decidido por **lo que la persona ve y puede hacer**, no por la arquitectura. Cada hito dice qué podrá hacer alguien con el plan Personal al terminarlo, qué hace falta para construirlo y cuánto cuesta en sesiones de trabajo (una tarea = una sesión, regla de `tasks.md`).
**Base:** `AVANCE-NEXOAI-2026-11-05.md`, `SPEC.md` 2.19.x, los `spec.md` de `02-agenda`, `01-captura`, `02-jornada` y `07-agente`, y `design/ARQUITECTURA-VISUAL-MOVIL.md`.
**No es especificación.** Cada hito entra por el método (`AGENTS.md`): los requisitos nuevos se escriben primero, en un solo lote por hito (como P0), y después las tareas son código.

---

## Índice

1. [La idea en una página](#1-la-idea-en-una-página)
2. [Dónde está hoy la persona](#2-dónde-está-hoy-la-persona)
3. [Los hitos, en orden](#3-los-hitos-en-orden)
4. [Lo que se deja fuera a propósito](#4-lo-que-se-deja-fuera-a-propósito)
5. [Decisiones que hay que tomar para arrancar cada hito](#5-decisiones-que-hay-que-tomar-para-arrancar-cada-hito)
6. [Cómo se demuestra cada hito](#6-cómo-se-demuestra-cada-hito)

---

## 1. La idea en una página

Hoy la persona puede entrar, ver **su día** y pedirle al asistente que registre, mueva o cancele compromisos. Eso es un buen núcleo, pero se queda corto en tres cosas que cualquiera espera de una agenda con asistente, y las tres están a la mano:

| Lo que falta y se nota | Por qué está a la mano | Costo |
|---|---|---|
| **Que la conversación no se borre y el asistente se acuerde** de lo que acaba de hacer | T-038 ya está; T-039 y T-040 son dos sesiones | 2 sesiones |
| **Ver la semana y el mes**, no solo hoy. Las pestañas ya están en pantalla y no hacen nada | La réplica del calendario ya consulta rangos de hasta 31 días; el diseño del móvil ya define cómo se ven (§5.1) | 3 sesiones |
| **Tareas personales:** el asistente ya reconoce «recuérdame pagar el recibo» y solo puede decir «llegan en una próxima versión» | El modelo de datos y las Operaciones existen; falta especificar CUN-03 y construir la entidad y sus pantallas | 7 sesiones |

Ordenadas así, en **doce sesiones** la persona pasa de «una agenda de hoy con asistente» a «agenda de semana y mes, tareas, y un asistente que lleva el hilo de las dos cosas». La planificación de la jornada (lo que distingue al plan Personal) viene después, apoyada en eso.

---

## 2. Dónde está hoy la persona

| Puede | No puede | Causa |
|---|---|---|
| Entrar, elegir zona, conectar Google | — | — |
| Ver los compromisos de hoy en web y móvil | Ver la semana ni el mes: las pestañas «Semana» y «Mes» existen y no responden | Sin requisito en `02-agenda`; la web solo tiene el corte «Hoy» (`secciones.ts`) |
| Pedir al asistente consultar, registrar, mover y cancelar | Seguir la conversación después de una acción; preguntar «¿qué hicimos?» | T-039 y T-040 pendientes |
| Decirle una tarea al asistente | Verla, completarla ni editarla: queda «en espera» | CUN-03 sin especificar; no existe la entidad Tarea ni la sección Tareas con contenido |
| Cancelar un compromiso desde su detalle (móvil) | Ver qué hizo el asistente por ella (sección Actividad) | Actividad sin contenido; modo Registro del lienzo sin construir |
| — | Que el asistente le proponga cómo organizar el día | CUN-02 especificado (24 requisitos) pero sin plan, y depende de las tareas y de D-5 |

---

## 3. Los hitos, en orden

### Hito 1 · El asistente lleva el hilo

**Lo que verá la persona:** confirma un compromiso, escribe «mejor a las 5» y el asistente propone mover ese mismo compromiso; la conversación de la mañana sigue ahí al volver; «¿qué hicimos?» responde con lo hecho.

| Qué | Estado | Sesiones |
|---|---|---|
| T-039: la conversación no se vacía; separadores; «Ver anteriores» (web y móvil) | Pendiente, especificada | 1 |
| T-040: nota de continuidad; «mejor a las 5» tras confirmar; «¿qué hicimos?» | Pendiente, especificada | 1 |
| Pulido que se nota: tarjeta en conflicto más corta; lienzo que muestra el día de la propuesta | Documentado en el informe visual | 0,5 |

**Prerrequisito:** las dos decisiones ya anotadas (tarea en espera cierra el episodio; plazo de una propuesta sin respuesta). **Total: 2,5 sesiones.**

### Hito 2 · Semana y mes

**Lo que verá la persona:** en Agenda, «Semana» muestra los siete días uno debajo de otro con sus compromisos (hoy resaltado); «Mes» muestra la rejilla del mes con un punto por cada dos compromisos; tocar un día lleva a ese día. Igual en web y móvil. El asistente responde «¿qué tengo esta semana?» con la lista.

| Qué | Estado | Sesiones |
|---|---|---|
| Especificar: dos requisitos nuevos en `02-agenda` (REQ-CUN01-14 semana, REQ-CUN01-15 mes) con sus criterios; el diseño del móvil §5.1 ya dice cómo se ve; la web adopta el mismo selector (lo pide `ARQUITECTURA-VISUAL-WEB.md` §9, punto 2) | Por escribir | 0,5 |
| API: `GET /agenda?desde&hasta` ya existe por la réplica (`ConsultaAgendaService`, hasta 31 días); solo falta exponer el rango y agrupar por día | Casi hecho | 0,5 |
| Web: cortes «Semana» y «Mes» en el lienzo; navegar entre semanas y meses | Por hacer | 1 |
| Móvil: lo mismo en la pantalla Agenda | Por hacer | 1 |
| Asistente: `agenda.consultar` ya admite rangos; solo cambia la lista que arma el código para una semana (agrupada por día) | Casi hecho | incluido |

**Prerrequisito:** ninguno. **Total: 3 sesiones.** Es el hito de más valor por sesión.

### Hito 3 · Tareas personales (CUN-03)

**Lo que verá la persona:** «recuérdame pagar el recibo antes del sábado» crea una tarea (con tarjeta, como todo); la sección Tareas la muestra en sus franjas: **con fecha, sin fecha, esperando de alguien**; puede completarla, cambiarle la fecha o el texto, y el asistente responde «¿qué tengo pendiente?». Las tareas que hoy están «en espera» aparecen solas el día que esto entre (el trabajador las convierte, P-11).

| Qué | Estado | Sesiones |
|---|---|---|
| Especificar CUN-03: unos 8 a 10 requisitos (registrar, consultar por franja, completar, modificar, posponer, cancelar, tarea con fecha en la agenda, qué pasa con lo que estaba en espera). Entrada «Tarea» en el glosario ya existe parcialmente | Por escribir | 1 |
| Plan: entidad `tarea` con Operaciones `tareas.registrar`, `tareas.actualizar`, `tareas.completar`; nada escribe fuera de una Operación (AD-09) | Por escribir | incluido |
| API y dominio: migración, servicio, Operaciones, pruebas | Por hacer | 2 |
| Asistente: herramientas `tareas.consultar`, `tareas.registrar`, `tareas.completar`; `captura.guardar_tarea` pasa a proponer de verdad; la nota de continuidad incluye tareas | Por hacer | 1 |
| Web: sección Tareas con las tres franjas y el detalle; completar desde la lista (control directo, DP-01) | Por hacer | 1 |
| Móvil: lo mismo | Por hacer | 1 |
| Conversión de lo que estaba en espera | Ya previsto en T-033 | incluido |

**Prerrequisito:** decidir el alcance mínimo de CUN-03 (§5). **Total: 7 sesiones.** Es el hueco más visible del producto y el que más preguntas va a recibir en la sustentación.

### Hito 4 · Actividad: lo que pasó

**Lo que verá la persona:** la sección Actividad con **Día · Semana · Mes** de lo que se hizo (compromisos cumplidos, tareas completadas) y el **registro del asistente** (qué hizo por ella, cuándo). En la web, el lienzo pasa a modo Registro al cerrar una acción, como decía el diseño.

| Qué | Estado | Sesiones |
|---|---|---|
| Especificar: dos o tres requisitos de consulta (sin acciones) | Por escribir | 0,5 |
| API: lectura de `operacion` ejecutadas y de la transcripción; ya existe la auditoría | Casi hecho | 0,5 |
| Web y móvil: la sección y el modo Registro del lienzo | Por hacer | 2 |

**Prerrequisito:** hitos 1 y 3 (sin tareas, Actividad solo mostraría compromisos). **Total: 3 sesiones.**

### Hito 5 · La jornada (lo propio del plan Personal)

**Lo que verá la persona:** «organízame el día» produce una propuesta que coloca sus tareas en los huecos de su agenda según sus preferencias (horario de trabajo, duración por defecto), la ve como tarjeta, la ajusta y la acepta; nada cambia hasta aceptar.

| Qué | Estado | Sesiones |
|---|---|---|
| CUN-02 ya tiene 24 requisitos | Especificado | 0 |
| Decidir D-5 / PT-5 (si el plan Personal se modela) y recortar a una primera versión: proponer el día de hoy con tareas con fecha, sin rutinas ni categorías (D-16) | Por decidir | — |
| Preferencias en el perfil (horario, duración por defecto): es la capa 3 de memoria del agente, que ya tiene sitio reservado | Por hacer | 1 |
| Plan y tareas: el cálculo de huecos es código (P-02); el modelo solo redacta | Por escribir | 1 |
| API, asistente, web y móvil | Por hacer | 5 |

**Prerrequisito:** hito 3 (sin tareas no hay nada que colocar) y D-5. **Total: 7 sesiones.**

### Resumen

| Hito | Lo que gana la persona | Sesiones | Acumulado |
|---|---|---|---|
| 1 | Conversación continua; asistente que se acuerda | 2,5 | 2,5 |
| 2 | Semana y mes | 3 | 5,5 |
| 3 | Tareas de verdad | 7 | 12,5 |
| 4 | Actividad y registro | 3 | 15,5 |
| 5 | La jornada propuesta por el asistente | 7 | 22,5 |

Entre hito y hito, media sesión de mantenimiento que no se ve pero evita sustos: la retención de T-041, la prueba en teléfono real, la integración continua en verde.

---

## 4. Lo que se deja fuera a propósito

| Qué | Por qué no ahora |
|---|---|
| T-042, alternativas de referente («¿cuál dentista?») | Útil, pero solo cuando haya muchos compromisos o tareas parecidos. Después del hito 3 |
| Voz (PT-2) | Es otra puerta al mismo flujo; no añade nada que la persona no pueda hacer ya escribiendo. Después del hito 5 |
| Equipos, delegación, seguimiento (fase 4) | Es el plan Empresarial; no entra en «afinar el plan Personal». Se decide aparte cuánto recortar para el Entregable |
| Correo asistido (CUN-04) | Depende de PT-3 (correo real o simulado) y del permiso de Gmail; sin tareas ni jornada no tiene contexto |
| Memoria larga del agente más allá de las preferencias | Sin tareas ni proyectos no hay nada que recordar |
| Cambios de arquitectura | Nada de lo anterior los necesita: Operaciones, réplica, grafo y transcripción ya sostienen los cinco hitos |

---

## 5. Decisiones que hay que tomar para arrancar cada hito

| Para | Decisión | Propuesta |
|---|---|---|
| Hito 1 | Tarea en espera ¿cierra el episodio? · Plazo de una propuesta sin respuesta (H-AG-08) | Sí, con «Tarea guardada» como separador · 24 h, con aviso visible al caducar |
| Hito 2 | ¿La semana empieza en lunes? ¿El mes muestra puntos o cifras? | Lunes (configurable después) · Puntos, como el diseño móvil §5.1 |
| Hito 3 | Alcance mínimo de CUN-03 | Registrar, ver por franjas, completar, cambiar fecha o texto, cancelar. **Sin** subtareas, recurrencia ni categorías (D-16) |
| Hito 3 | ¿Una tarea con fecha y hora aparece en la agenda? | Sí, como bloque distinto del compromiso; no va a Google |
| Hito 4 | Qué entra en Actividad en esta versión | Compromisos pasados, tareas completadas, registro del asistente. Sin informes de horas (R-21 queda para después) |
| Hito 5 | D-5 / PT-5 y el recorte de CUN-02 | Modelar; primera versión: el día de hoy, tareas con fecha, preferencias de horario y duración |

---

## 6. Cómo se demuestra cada hito

Un guion corto por hito, para la revisión del equipo y para la sustentación. Todos con el simulado o con Groq, en web y en móvil.

| Hito | Guion de dos minutos |
|---|---|
| 1 | «Agéndame dentista el jueves a las 4» → confirmar → «mejor a las 5» → aparece la tarjeta de mover → confirmar → «¿qué hicimos?» → lista de las dos acciones. Recargar: todo sigue |
| 2 | Agenda → Semana: los siete días con sus compromisos → tocar el viernes → el día → Mes: la rejilla → «¿qué tengo esta semana?» al asistente |
| 3 | «Recuérdame pagar el recibo antes del sábado» → tarjeta → confirmar → Tareas: aparece en «con fecha» → completarla desde la lista → «¿qué tengo pendiente?» |
| 4 | Actividad → Semana: lo cumplido y lo completado → Registro: las acciones del asistente con su hora |
| 5 | «Organízame el día» → propuesta con las tareas colocadas en los huecos → cambiar una → aceptar → la agenda de hoy con los bloques |
