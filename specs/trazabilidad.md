# Trazabilidad

**Generado por** `python tools/trazabilidad.py`. No edites las columnas Requisito, Área ni Origen: salen de los `spec.md`.
**Se editan a mano:** Fase, Tarea (`T-nnn` de `tasks.md`), Prueba (nombre de la prueba automática) y Estado.
**Estados válidos:** pendiente, en curso, implementado, verificado, retirado. «implementado» y «verificado» exigen una prueba.
**Verificar antes de dar algo por terminado:** `python tools/trazabilidad.py --check`.

## Resumen

| Área | Requisitos | pendiente | en curso | implementado | verificado | retirado |
|---|---|---|---|---|---|---|
| 01-captura | 25 | 17 | 3 | 5 | 0 | 0 |
| 02-agenda | 15 | 0 | 0 | 15 | 0 | 0 |
| 02-jornada | 35 | 25 | 0 | 10 | 0 | 0 |
| 03-tareas | 26 | 26 | 0 | 0 | 0 | 0 |
| 04-comunicaciones | 28 | 22 | 0 | 0 | 0 | 6 |
| 05-equipos | 19 | 1 | 16 | 2 | 0 | 0 |
| 06-acceso | 19 | 3 | 0 | 16 | 0 | 0 |
| 07-agente | 5 | 2 | 1 | 2 | 0 | 0 |
| 08-administracion | 32 | 15 | 4 | 13 | 0 | 0 |
| 09-tareas-personales | 27 | 8 | 1 | 18 | 0 | 0 |

## Requisitos

| Requisito | Área | Origen | Fase | Tarea | Prueba | Estado |
|---|---|---|---|---|---|---|
| REQ-CAP-01 | 01-captura | CUN-01 y CUN-03, flujo principal paso 1 | 2 | T-034, T-035 | movil.captura-propone-y-confirma | en curso |
| REQ-CAP-02 | 01-captura | CUN-01 paso 2, CUN-03 paso 2 | 2 | T-032, T-033 | agente.tarea-queda-en-espera | en curso |
| REQ-CAP-03 | 01-captura | RN-ER-03 | 2 | T-032, T-035 | agente.interrumpe-hasta-decidir | implementado |
| REQ-CAP-04 | 01-captura | CUN-01 y CUN-03, excepción «información insuficiente»; regla de producto R-20 | 2 | T-032, T-035 | agente.pregunta-de-uno-en-uno | implementado |
| REQ-CAP-05 | 01-captura | decisión de producto; RN-OP-01 | 2 | — | — | pendiente |
| REQ-CAP-06 | 01-captura | decisión de producto | 2 | T-032, T-035 | agente.contrato-del-proveedor | en curso |
| REQ-CAP-07 | 01-captura | regla de producto R-1; `../02-jornada/spec.md` REQ-CUN02-08 | 2 | — | — | pendiente |
| REQ-CAP-08 | 01-captura | CUN-03; `../04-comunicaciones/spec.md` REQ-CUN04-14; regla de producto R-12 | 2 | — | — | pendiente |
| REQ-CAP-09 | 01-captura | decisión de producto | 2 | — | — | pendiente |
| REQ-CAP-10 | 01-captura | decisión de producto; simetría con CUN-10 paso 5 | 2 | — | — | pendiente |
| REQ-CAP-11 | 01-captura | regla de producto R-10 | 2 | — | — | pendiente |
| REQ-CAP-12 | 01-captura | propuesta técnica §5, «confirmación del texto antes de ejecutar cualquier acción»; RN-ER-03 | 2 | — | — | pendiente |
| REQ-CAP-13 | 01-captura | regla de producto R-4; propuesta técnica §9, minimización | 2 | — | — | pendiente |
| REQ-CAP-14 | 01-captura | CUN-01 paso 2 | 2 | — | — | pendiente |
| REQ-CAP-15 | 01-captura | decisión de producto; regla de producto R-10 | 2 | — | — | pendiente |
| REQ-CAP-16 | 01-captura | regla de producto R-10 | 2 | — | — | pendiente |
| REQ-CAP-17 | 01-captura | decisión de producto; regla de producto R-7 | 2 | — | — | pendiente |
| REQ-CAP-18 | 01-captura | REQ-CAP-17; propuesta técnica §5, modo sin conexión | 2 | — | — | pendiente |
| REQ-CAP-19 | 01-captura | RN-OP-01; propuesta técnica §9, consentimientos independientes y revocables; regla de producto R-9 | 2 | — | — | pendiente |
| REQ-CAP-20 | 01-captura | regla de producto R-9 | 2 | — | — | pendiente |
| REQ-CAP-21 | 01-captura | regla de producto R-8; propuesta técnica §9, minimización | 2 | — | — | pendiente |
| REQ-CAP-22 | 01-captura | propuesta técnica §5, «las escrituras se encolan y se reintentan» | 2 | — | — | pendiente |
| REQ-CAP-23 | 01-captura | regla de producto derivada de los cuatro blancos; RN-OP-01 | 2 | T-033, T-034, T-035 | movil.captura-en-espera | implementado |
| REQ-CAP-24 | 01-captura | regla de producto R-42; `SPEC.md` P-11 | 2 | T-033, T-035 | agente.en-espera-desde-la-captura | implementado |
| REQ-CAP-25 | 01-captura | P-11 («lo pedido queda en cola, visible como en espera»); REQ-CAP-23; `design/ARQUITECTURA-VISUAL-WEB.md` §6 (lo en espera va al registro); hallazgo 4.1-d de `design/capturas/2026-11-04/INFORME-VISUAL-AGENTE.md` (hoy lo en espera solo vive en la conversación); `PLAN-VALOR-USUARIO.md` hito 1. Añadido el 6 de noviembre de 2026 | 2 | T-045 | web.en-espera-visible, movil.en-espera-visible | implementado |
| REQ-CUN01-01 | 02-agenda | CUN-01 flujo principal, pasos 1 y 2 | 2 | T-031, T-034, T-043 | agente.agenda.extrae-sin-inventar-fin, agente.agenda.fin-al-dia-siguiente | implementado |
| REQ-CUN01-02 | 02-agenda | CUN-01 flujo principal, paso 3 | 1 | T-016, T-017, T-019 | agenda.consulta-solapes-antes-de-proponer | implementado |
| REQ-CUN01-03 | 02-agenda | RN-ER-03 | 1 | T-012, T-017, T-032 | agenda.sin-confirmar-no-escribe-ni-notifica | implementado |
| REQ-CUN01-04 | 02-agenda | CUN-01 flujo principal, pasos 5 y 6 | 1 | T-017, T-019, T-032 | agenda.confirmar-registra-lo-mostrado | implementado |
| REQ-CUN01-05 | 02-agenda | CUN-01 FA-01 | 1 | T-016, T-018, T-032 | agenda.conflicto-identifica-causa-y-ofrece-alternativas | implementado |
| REQ-CUN01-06 | 02-agenda | CUN-01 FA-02 | 1 | T-019, T-021 | agenda.cancelar-requiere-confirmacion | implementado |
| REQ-CUN01-07 | 02-agenda | CUN-01 EX-01 | 1 | T-017, T-032 | agenda.datos-faltantes-no-crea-operacion | implementado |
| REQ-CUN01-08 | 02-agenda | CUN-01 EX-02, RN-OP-01, REQ-ACC-08 | 1 | T-015, T-017, T-031 | agenda.sin-permiso-no-invoca-proveedor | implementado |
| REQ-CUN01-09 | 02-agenda | RN-OP-01, RN-EST-01 | 1 | T-014, T-015 | agenda.solo-eventos-propios | implementado |
| REQ-CUN01-10 | 02-agenda | decisión de arquitectura AD-07; necesaria para CUN-05 y CUN-06 | 1 | T-014, T-015, T-021, T-025 | agenda.horas-con-zona-horaria | implementado |
| REQ-CUN01-11 | 02-agenda | regla de producto R-42; `SPEC.md` P-11 | 1 | T-015, T-019, T-021, T-033, T-034 | agente.sin-modelo-queda-en-espera | implementado |
| REQ-CUN01-12 | 02-agenda | derivado de la revisión de diseño de CUN-01 | 1 | T-021, T-025 | agenda.estado-vacio-abre-captura | implementado |
| REQ-CUN01-13 | 02-agenda | CUN-01, alcance «consultar»; `PROPUESTA-TECNICA.md` §7.3; añadido el 24 de octubre de 2026 al planificar el agente | 2 | T-031, T-034, T-043 | agente.agenda.consulta-tal-cual, acceso.google-conectar-sincroniza | implementado |
| REQ-CUN01-14 | 02-agenda | CUN-01, alcance «consultar»; `design/ARQUITECTURA-VISUAL-MOVIL.md` §5.1 (Semana: «los siete días uno debajo de otro, cada uno con sus bloques»); `design/ARQUITECTURA-VISUAL-WEB.md` §9, punto 2; `PLAN-VALOR-USUARIO.md` hito 2. Añadido el 6 de noviembre de 2026 | 2 | T-044 | web.agenda-semana-y-mes, movil.agenda-semana-y-mes | implementado |
| REQ-CUN01-15 | 02-agenda | CUN-01, alcance «consultar»; `design/ARQUITECTURA-VISUAL-MOVIL.md` §5.1 (Mes: «rejilla de calendario con un punto por cada dos compromisos»); `PLAN-VALOR-USUARIO.md` hito 2. Añadido el 6 de noviembre de 2026 | 2 | T-044 | web.agenda-semana-y-mes, movil.agenda-semana-y-mes | implementado |
| REQ-CUN02-01 | 02-jornada | CUN-02 flujo principal, pasos 1 a 3 | 3 | — | — | pendiente |
| REQ-CUN02-02 | 02-jornada | CUN-02 flujo principal, paso 4 | 3 | — | — | pendiente |
| REQ-CUN02-03 | 02-jornada | CUN-02 pasos 6 y 7; RN-ER-03 | 3 | — | — | pendiente |
| REQ-CUN02-04 | 02-jornada | CUN-02 pasos 7 y 8 | 3 | — | — | pendiente |
| REQ-CUN02-05 | 02-jornada | CUN-02 flujo alternativo | 3 | — | — | pendiente |
| REQ-CUN02-06 | 02-jornada | CUN-02 flujo alternativo | 3 | — | — | pendiente |
| REQ-CUN02-07 | 02-jornada | CUN-02 excepción | 3 | — | — | pendiente |
| REQ-CUN02-08 | 02-jornada | regla de producto R-1; CUN-02 excepción | 3 | — | — | pendiente |
| REQ-CUN02-09 | 02-jornada | CUN-02 excepción; regla de producto R-20 | 3 | — | — | pendiente |
| REQ-CUN02-10 | 02-jornada | regla de producto R-2 | 3 | — | — | pendiente |
| REQ-CUN02-11 | 02-jornada | regla de producto R-3 | 3 | — | — | pendiente |
| REQ-CUN02-12 | 02-jornada | regla de producto R-2; necesidad declarada del Plan Personal | 3 | — | — | pendiente |
| REQ-CUN02-13 | 02-jornada | necesidad declarada del Plan Personal | 3 | — | — | pendiente |
| REQ-CUN02-14 | 02-jornada | necesidad declarada del Plan Personal; CUN-01 y CUN-02 | 3 | — | — | pendiente |
| REQ-CUN02-15 | 02-jornada | necesidad declarada del Plan Personal | 3 | — | — | pendiente |
| REQ-CUN02-16 | 02-jornada | REQ-CUN02-15 | 3 | — | — | pendiente |
| REQ-CUN02-17 | 02-jornada | CUN-02 flujo principal, paso 4 | 3 | — | — | pendiente |
| REQ-CUN02-18 | 02-jornada | necesidad declarada del Plan Personal; RN-OP-01 | 3 | — | — | pendiente |
| REQ-CUN02-19 | 02-jornada | necesidad declarada del Plan Personal; decisión D-10 | 3 | — | — | pendiente |
| REQ-CUN02-20 | 02-jornada | CUN-02 flujo alternativo; regla de producto R-5 | 3 | — | — | pendiente |
| REQ-CUN02-21 | 02-jornada | regla de producto R-6 | 3 | — | — | pendiente |
| REQ-CUN02-22 | 02-jornada | regla de producto R-5 | 3 | — | — | pendiente |
| REQ-CUN02-23 | 02-jornada | CUN-02; EN-03 leída como «período determinado», decisión D-9 | 3 | — | — | pendiente |
| REQ-CUN02-24 | 02-jornada | regla de producto R-42; `SPEC.md` P-11 | 3 | — | — | pendiente |
| REQ-CUN02-25 | 02-jornada | `PLAN-VALOR-USUARIO.md` hito 4; `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 («Agenda y Actividad usan el mismo selector de período»; «el nivel día abre siempre por defecto») y §3 bis (el selector de período no tiene vuelta). Añadido el 7 de noviembre de 2026 | 2 | T-068, T-069, T-070, T-071 | actividad.periodos, actividad.compromisos-ocurridos, web.actividad, movil.actividad | implementado |
| REQ-CUN02-26 | 02-jornada | `PLAN-VALOR-USUARIO.md` hito 4 y §5 («compromisos pasados»); EN-02 Evento de Agenda; R-25 (lo cancelado no se borra, pero no ocurrió). Añadido el 7 de noviembre de 2026 | 2 | T-069, T-070, T-071 | actividad.compromisos-ocurridos, web.actividad, movil.actividad | implementado |
| REQ-CUN02-27 | 02-jornada | `PLAN-VALOR-USUARIO.md` hito 4 («qué hizo por ella, cuándo»); RN-ER-03 y P-03 (solo se ejecuta lo confirmado); DP-01 (controles directos). Añadido el 7 de noviembre de 2026 | 2 | T-069, T-070, T-071 | actividad.registro-del-asistente, web.actividad, movil.actividad | implementado |
| REQ-CUN02-28 | 02-jornada | `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 («El día es la costura, y por eso el nivel Hoy enseña las dos cosas: el plan y lo registrado»). Añadido el 7 de noviembre de 2026 | 2 | T-069, T-070, T-071 | actividad.compromisos-ocurridos, web.actividad, movil.actividad | implementado |
| REQ-CUN02-29 | 02-jornada | REQ-ACC-08 (un permiso que falta no bloquea lo demás); `SPEC.md` P-11 (lo existente sigue consultable). Añadido el 7 de noviembre de 2026 | 2 | T-069, T-070, T-071 | actividad.sin-calendario, web.actividad, movil.actividad | implementado |
| REQ-CUN02-30 | 02-jornada | REQ-CUN01-12 (el estado vacío es un requisito propio); `design/CONTEXTO.md` (listas llenas y listas vacías). Añadido el 7 de noviembre de 2026 | 2 | T-070, T-071 | web.actividad, movil.actividad | implementado |
| REQ-CUN02-31 | 02-jornada | `PLAN-VALOR-USUARIO.md` hito 4 («requisitos de consulta, sin acciones»); R-42 y DP-01 (los controles directos viven en Hoy de Agenda); REQ-CUN02-10 a 13 (el registro de tiempo llega después). Añadido el 7 de noviembre de 2026 | 2 | T-069, T-070, T-071 | web.actividad, movil.actividad | implementado |
| REQ-CUN02-32 | 02-jornada | `specs/09-tareas-personales/spec.md` (CUN-03, tareas personales); `PLAN-VALOR-USUARIO.md` hito 4 y §5 («tareas completadas»). Añadido el 7 de noviembre de 2026 para reservar su sitio: se construye cuando las tareas personales estén integradas (H-JOR-12) | 2 | T-072 | — | pendiente |
| REQ-CUN02-33 | 02-jornada | `design/ARQUITECTURA-VISUAL-MOVIL.md` §3 ter («Actividad contesta "cuánto"») y §3 bis; R-21 (los informes de horas quedan para después); `PLAN-VALOR-USUARIO.md` hito 4. Añadido el 7 de noviembre de 2026 | 2 | T-068, T-070, T-071 | web.actividad, movil.actividad | implementado |
| REQ-CUN02-34 | 02-jornada | REQ-CUN01-09, REQ-CUN01-10; `SPEC.md` P-04 y P-05; REQ-ACC-13. Añadido el 7 de noviembre de 2026 | 2 | T-069 | actividad.solo-lo-propio, web.actividad, movil.actividad | implementado |
| REQ-CUN02-35 | 02-jornada | `SPEC.md` P-11 («lo existente sigue consultable»); REQ-CUN02-24. Añadido el 7 de noviembre de 2026 | 2 | T-069 | actividad.sin-proveedor-de-modelo | implementado |
| REQ-CUN07-01 | 03-tareas | CUN-07 flujo principal, pasos 1 a 3 | 4 | — | — | pendiente |
| REQ-CUN07-02 | 03-tareas | CUN-07 flujo principal, paso 4 | 4 | — | — | pendiente |
| REQ-CUN07-03 | 03-tareas | CUN-07 flujo principal, pasos 6 y 7; RN-ER-02 | 4 | — | — | pendiente |
| REQ-CUN07-04 | 03-tareas | CUN-07 EX-03, RN-OP-03 | 4 | — | — | pendiente |
| REQ-CUN07-05 | 03-tareas | CUN-07 EX-01 | 4 | — | — | pendiente |
| REQ-CUN07-06 | 03-tareas | CUN-07 EX-02 | 4 | — | — | pendiente |
| REQ-CUN07-07 | 03-tareas | RN-ER-03 | 4 | — | — | pendiente |
| REQ-CUN07-08 | 03-tareas | CUN-07 FA-01 | 4 | — | — | pendiente |
| REQ-CUN07-09 | 03-tareas | regla de producto R-42; `SPEC.md` P-11 | 4 | — | — | pendiente |
| REQ-CUN07-10 | 03-tareas | RN-INF-02; regla de producto R-19 | 4 | — | — | pendiente |
| REQ-CUN07-11 | 03-tareas | CUN-09; RN-OP-04; decisión D-17 | 4 | — | — | pendiente |
| REQ-CUN07-12 | 03-tareas | regla de producto R-16; RN-ER-03; espíritu de RN-OP-04 | 4 | — | — | pendiente |
| REQ-CUN07-13 | 03-tareas | regla de producto R-18 | 4 | — | — | pendiente |
| REQ-CUN07-14 | 03-tareas | propuesta técnica §7.2, idempotencia por clave de operación; AD-09 | 4 | — | — | pendiente |
| REQ-CUN07-15 | 03-tareas | decisión D-14; regla de producto R-17 | 4 | — | — | pendiente |
| REQ-CUN07-16 | 03-tareas | RN-ER-02; decisión D-17; DP-03 | 4 | — | — | pendiente |
| REQ-CUN07-17 | 03-tareas | decisión D-17; RN-ER-02 | 4 | — | — | pendiente |
| REQ-CUN07-18 | 03-tareas | decisión del equipo del 23 de octubre de 2026 (rango del colaborador, pregunta 2); REQ-ACC-15 | 4 | — | — | pendiente |
| REQ-CUN07-19 | 03-tareas | decisión del equipo del 23 de octubre de 2026 (rango del colaborador, pregunta 3); R-16 | 4 | — | — | pendiente |
| REQ-CUN08-01 | 03-tareas | CUN-08; decisión del equipo del 23 de octubre de 2026 | 4 | — | — | pendiente |
| REQ-CUN08-02 | 03-tareas | decisión del equipo del 23 de octubre de 2026; REQ-ACC-15, REQ-ACC-16 | 4 | — | — | pendiente |
| REQ-CUN08-03 | 03-tareas | decisión del equipo del 23 de octubre de 2026 («reportar lo clave, sin bombardear») | 4 | — | — | pendiente |
| REQ-CUN08-04 | 03-tareas | decisión del equipo del 23 de octubre de 2026 («tiene que tener un formato, no solo una tabla»; «el PDF debe ser completo»); H-SEG-02, H-SEG-03 | 4 | — | — | pendiente |
| REQ-CUN08-05 | 03-tareas | P-02, AD-05 | 4 | — | — | pendiente |
| REQ-CUN08-06 | 03-tareas | decisión del equipo del 23 de octubre de 2026 («no hay que bombardear de información») | 4 | — | — | pendiente |
| REQ-CUN08-07 | 03-tareas | decisión del equipo del 23 de octubre de 2026 («en el chat solo una síntesis del archivo que se generó»); H-SEG-02 | 4 | — | — | pendiente |
| REQ-CUN04-01 | 04-comunicaciones | CUN-04 flujo principal | 5 | — | — | pendiente |
| REQ-CUN04-02 | 04-comunicaciones | CUN-04 excepciones; RN-ER-03 | 5 | — | — | pendiente |
| REQ-CUN04-03 | 04-comunicaciones | RN-ER-03; propuesta técnica §7.2, herramienta `comunicaciones.preparar` | 5 | — | — | pendiente |
| REQ-CUN04-04 | 04-comunicaciones | RN-ER-03; propuesta técnica §7.2, herramienta `comunicaciones.enviar`, confirmación «Sí, siempre» | 5 | — | — | pendiente |
| REQ-CUN04-05 | 04-comunicaciones | CUN-04 flujo principal | 5 | — | — | pendiente |
| REQ-CUN04-06 | 04-comunicaciones | CUN-04 flujo alternativo | 5 | — | — | pendiente |
| REQ-CUN04-07 | 04-comunicaciones | necesidad declarada del Plan Personal | 5 | — | — | pendiente |
| REQ-CUN04-08 | 04-comunicaciones | RN-OP-01 | 5 | — | — | pendiente |
| REQ-CUN04-09 | 04-comunicaciones | CUN-04; EN-07 incluye llamadas | 5 | — | — | pendiente |
| REQ-CUN04-10 | 04-comunicaciones | decisión de alcance; RN-ER-03 | 5 | — | — | pendiente |
| REQ-CUN04-11 | 04-comunicaciones | necesidad declarada del Plan Personal | 5 | — | — | pendiente |
| REQ-CUN04-12 | 04-comunicaciones | regla de producto R-1; enlace con `specs/02-jornada` REQ-CUN02-08 | 5 | — | — | pendiente |
| REQ-CUN04-13 | 04-comunicaciones | regla de producto R-12; propuesta técnica §9, minimización | 5 | — | — | pendiente |
| REQ-CUN04-14 | 04-comunicaciones | necesidad declarada del Plan Personal | 5 | — | — | pendiente |
| REQ-CUN04-15 | 04-comunicaciones | regla de producto R-42; `SPEC.md` P-11 | 5 | — | — | pendiente |
| REQ-ENC-01 | 04-comunicaciones | CUN-04, CUN-07 | 4 | — | — | pendiente |
| REQ-ENC-02 | 04-comunicaciones | CUN-04, CUN-07 | 4 | — | — | pendiente |
| REQ-ENC-03 | 04-comunicaciones | CUN-04, CUN-07; D-17 | 4 | — | — | pendiente |
| REQ-ENC-04 | 04-comunicaciones | CUN-04, CUN-07; D-17 | 4 | — | — | retirado |
| REQ-ENC-05 | 04-comunicaciones | CUN-04, CUN-07 | 4 | — | — | pendiente |
| REQ-ENC-06 | 04-comunicaciones | CUN-04, CUN-07; D-17 | 4 | — | — | retirado |
| REQ-ENC-07 | 04-comunicaciones | CUN-04, CUN-07; D-17 | 4 | — | — | retirado |
| REQ-ENC-08 | 04-comunicaciones | CUN-04, CUN-07; D-17 | 4 | — | — | retirado |
| REQ-ENC-09 | 04-comunicaciones | CUN-04, CUN-07; R-16; R-18 | 4 | — | — | pendiente |
| REQ-ENC-10 | 04-comunicaciones | CUN-04, CUN-07 | 4 | — | — | pendiente |
| REQ-ENC-11 | 04-comunicaciones | CUN-04, CUN-07; D-17 | 4 | — | — | retirado |
| REQ-ENC-12 | 04-comunicaciones | CUN-04, CUN-07; D-17 | 4 | — | — | pendiente |
| REQ-ENC-13 | 04-comunicaciones | CUN-04, CUN-07; D-17 | 4 | — | — | retirado |
| REQ-CUN05-01 | 05-equipos | CUN-05 flujo principal, pasos 1 y 2 | 4 | T-114 | CUN-05 - Seleccion de participantes HTTP; CUN-05 - Contratos compartidos de equipos; CUN-05 - Herramientas del agente | en curso |
| REQ-CUN05-02 | 05-equipos | CUN-05 flujo principal, paso 3; RN-OP-02 | 4 | T-108 | CUN-05 - Disponibilidad parcial; CUN-05 - Contratos compartidos de equipos; CUN-05 - Duracion opcional; CUN-05 - Herramientas del agente | en curso |
| REQ-CUN05-03 | 05-equipos | RN-INF-01, RN-CAL-01 punto 1 | 4 | T-108 | CUN-05 - Disponibilidad parcial; CUN-05 - Contratos compartidos de equipos; CUN-05 - Duracion opcional; CUN-05 - Disponibilidad mediante HTTP; CUN-05 - Disponibilidad individual | en curso |
| REQ-CUN05-04 | 05-equipos | RN-CAL-01 punto 1 | 4 | T-108 | CUN-05 - Disponibilidad común; CUN-05 - Contratos compartidos de equipos; CUN-05 - Duracion opcional; CUN-05 - Disponibilidad mediante HTTP; CUN-05 - Disponibilidad parcial; CUN-05 - Disponibilidad individual | en curso |
| REQ-CUN05-05 | 05-equipos | RN-CAL-01 punto 2 | 4 | T-109 | CUN-05 - Reglas de bandas horarias; CUN-05 - Contratos compartidos de equipos; CUN-05 - Disponibilidad individual | en curso |
| REQ-CUN05-06 | 05-equipos | RN-CAL-01 puntos 3 y 4 | 4 | T-109 | CUN-05 - Rango de disponibilidad por defecto; CUN-05 - Duracion opcional | en curso |
| REQ-CUN05-07 | 05-equipos | RN-CAL-01, consecuencia declarada; REQ-CUN01-10 | 4 | T-110 | CUN-05 - Seguridad de zona horaria; CUN-05 - Contratos compartidos de equipos; CUN-05 - Herramientas del agente | en curso |
| REQ-CUN05-08 | 05-equipos | CUN-05 EX-01 | 4 | T-108 | CUN-05 - Disponibilidad parcial; CUN-05 - Contratos compartidos de equipos; CUN-05 - Consentimiento individual mediante Operaciones; CUN-05 - Duracion opcional; CUN-05 - Disponibilidad individual; CUN-05 - Herramientas del agente | en curso |
| REQ-CUN05-09 | 05-equipos | CUN-05 EX-02, RN-ER-01 | 4 | T-116 | CUN-05 - Disponibilidad parcial; CUN-05 - Duracion opcional | en curso |
| REQ-CUN05-10 | 05-equipos | CUN-05 FA-01 | 4 | T-111 | CUN-05 - Seleccion de participantes | en curso |
| REQ-CUN05-11 | 05-equipos | RN-OP-01, RN-OP-02 | 4 | T-104 | CUN-05 - Autorizacion real por membresia HTTP; CUN-05 - Contratos compartidos de equipos; CUN-05 - Herramientas del agente | en curso |
| REQ-CUN05-12 | 05-equipos | decisión de alcance; RN-OP-02 | 4 | — | — | pendiente |
| REQ-CUN05-13 | 05-equipos | regla de producto R-13; propuesta técnica §9, minimización | 4 | T-107 | CUN-05 - Disponibilidad individual; CUN-05 - Herramientas del agente | en curso |
| REQ-CUN05-14 | 05-equipos | regla de producto R-14; RN-OP-01 | 4 | T-112 | CUN-05 - Revocacion de consentimiento; CUN-05 - Contratos compartidos de equipos; CUN-05 - Consentimiento individual mediante Operaciones; CUN-05 - Disponibilidad individual | en curso |
| REQ-CUN05-15 | 05-equipos | REQ-CUN05-12 y 14 | 4 | T-106 | CUN-05 - Disponibilidad parcial; CUN-05 - Contratos compartidos de equipos; CUN-05 - Consentimiento individual mediante Operaciones | en curso |
| REQ-CUN05-16 | 05-equipos | decisión D-17; RN-OP-02; R-14 | 4 | T-107 | CUN-05 - Disponibilidad parcial; CUN-05 - Consentimiento individual mediante Operaciones; CUN-05 - Disponibilidad individual | en curso |
| REQ-CUN05-17 | 05-equipos | decisión del equipo del 23 de octubre de 2026 (rango del colaborador, pregunta 1) | 4 | T-104 | CUN-05 - Autorizacion de bandas horarias; CUN-05 - Contratos compartidos de equipos; CUN-05 - Herramientas del agente | en curso |
| REQ-CUN05-18 | 05-equipos | `REPLANTEO.md` §4 (planes acumulativos), REQ-ADM-17 (nada de empresa aparece sin afiliación), H-ADM-06 (plan efectivo), P-04; revisión de Franco del 25 de noviembre de 2026 | 4 | T-120, T-124 | equipos.disponibilidad-sin-plan; equipos.disponibilidad-sin-equipo; equipos.asistente-sin-acceso; acceso.perfil-plan-efectivo; agenda.corte-disponibilidad-por-plan; equipos.escenario-reuniones; web.escenario-reuniones | implementado |
| REQ-CUN05-19 | 05-equipos | `SPEC.md` §8, «lo diferencial del responsable»; REQ-CUN05-17; revisión de Franco del 25 de noviembre de 2026 | 4 | T-120, T-124 | equipos.responsable-visible; agenda.corte-disponibilidad-por-plan; equipos.escenario-reuniones; web.escenario-reuniones | implementado |
| REQ-ACC-01 | 06-acceso | Requisito del sistema | 1 | T-002 | acceso.sin-registro-abierto | implementado |
| REQ-ACC-02 | 06-acceso | Requisito del sistema | 1 | T-004, T-011, T-024, T-028 | acceso.recorrido-web | implementado |
| REQ-ACC-03 | 06-acceso | Requisito del sistema | 1 | T-004, T-011, T-028 | acceso.error-no-revela-correo | implementado |
| REQ-ACC-04 | 06-acceso | Requisito del sistema | 1 | T-005, T-011, T-028 | acceso.primer-ingreso-bloquea-hasta-completar | implementado |
| REQ-ACC-05 | 06-acceso | Requisito del sistema; RN-CAL-01 | 1 | T-005, T-011, T-028 | acceso.zona-horaria-requiere-eleccion | implementado |
| REQ-ACC-06 | 06-acceso | Requisito del sistema | 1 | T-007, T-022 | acceso.conectar-google-por-permiso | implementado |
| REQ-ACC-07 | 06-acceso | Requisito del sistema | 1 | T-007 | acceso.solo-dos-alcances-sin-lectura-de-buzon | implementado |
| REQ-ACC-08 | 06-acceso | Requisito del sistema | 1 | T-008, T-033 | acceso.sin-google-no-agenda-ni-envia | implementado |
| REQ-ACC-09 | 06-acceso | Requisito del sistema | 1 | T-008 | acceso.revocacion-avisa-una-vez-y-no-reintenta | implementado |
| REQ-ACC-10 | 06-acceso | Requisito del sistema | 1 | T-006, T-009, T-027 | acceso.zona-horaria-modificable | implementado |
| REQ-ACC-11 | 06-acceso | Requisito del sistema | 1 | T-009, T-027 | acceso.cambio-zona-muestra-afectados-y-no-aplica-sin-confirmar | implementado |
| REQ-ACC-12 | 06-acceso | Requisito del sistema; R-45 | 1 | T-006 | acceso.cuenta-no-autogestionable | implementado |
| REQ-ACC-13 | 06-acceso | Requisito del sistema; D-17 | 1 | T-004, T-026 | acceso.colaborador-solo-ve-lo-suyo | implementado |
| REQ-ACC-14 | 06-acceso | Requisito del sistema; D-17 | 1 | T-007, T-026 | acceso.colaborador-con-los-dos-permisos | implementado |
| REQ-ACC-15 | 06-acceso | Requisito del sistema; D-17 | 1 | T-026 | acceso.solo-el-responsable-asigna-tareas | implementado |
| REQ-ACC-16 | 06-acceso | Requisito del sistema | 4 | — | — | pendiente |
| REQ-ACC-17 | 06-acceso | Requisito del sistema | 4 | — | — | pendiente |
| REQ-ACC-18 | 06-acceso | Requisito del sistema | 1 | T-121 | acceso.cambiar-contrasena; acceso.cambiar-contrasena-desde-ajustes; movil.cambiar-contrasena | implementado |
| REQ-ACC-19 | 06-acceso | Requisito del sistema | 1 | T-122, T-123 | — | pendiente |
| REQ-AGT-01 | 07-agente | `PROPUESTA-TECNICA.md` §7.4, memoria de conversación; H-AGT-16; `INFORME-MEMORIA-AGENTE.md` §6 y §8.1; glosario, «Episodio» y «Nota de continuidad» | 2 | T-032, T-034, T-038, T-040, T-041 | agente.conversacion-con-contexto, agente.episodio-caduca, agente.propuesta-caduca, agente.tope-del-grafo | en curso |
| REQ-AGT-02 | 07-agente | decisión del equipo, 24 de octubre de 2026; REQ-CAP-02, REQ-CAP-23; `09-tareas-personales` §10 (la tarea deja de esperar: REQ-CUN03-01); REQ-CUN03-16 (lo que las tareas personales no hacen) | 2 | T-033, T-034 | agente.tarea-queda-en-espera | implementado |
| REQ-AGT-03 | 07-agente | H-AGT-16; `INFORME-MEMORIA-AGENTE.md` §6.1 y §8.1; `design/ARQUITECTURA-VISUAL-WEB.md` §5 y §6 («lo cerrado no se pierde») | 2 | T-038, T-039, T-041 | agente.transcripcion-persiste, web.asistente-historial, agente.retencion-puntos-de-control, agente.retencion-transcripcion | implementado |
| REQ-AGT-04 | 07-agente | H-AGT-17; `INFORME-MEMORIA-AGENTE.md` §6.4.5; decisión 17 de `02-agenda` (las alternativas no pasan por el modelo); P-02, P-03 | 2 | T-042 | — | pendiente |
| REQ-AGT-05 | 07-agente | H-AGT-17; `INFORME-MEMORIA-AGENTE.md` §6.4.3 y §6.4.4; glosario, «Hilo» | 2 | — | — | pendiente |
| REQ-ADM-01 | 08-administracion | decisión del equipo del 6 de noviembre de 2026; REQ-ACC-01; glosario, «Organización» | 4 | T-058 | administracion.clases-de-organizacion | implementado |
| REQ-ADM-02 | 08-administracion | decisión del equipo del 6 de noviembre de 2026; REQ-ACC-16, REQ-ACC-17; P-10; glosario, «Gerente» (se es responsable de un equipo, no de la organización) | 4 | T-061 | administracion.administrar-no-es-ver | implementado |
| REQ-ADM-03 | 08-administracion | decisión de diseño (H-ADM-01) | 4 | T-061 | administracion.nunca-sin-administrador | implementado |
| REQ-ADM-04 | 08-administracion | REQ-ACC-01; H-ACC-01; decisión de diseño (H-ADM-02) | 4 | T-058 | administracion.primer-administrador-en-el-arranque | implementado |
| REQ-ADM-05 | 08-administracion | decisión de diseño (H-ADM-10); `SPEC.md` §1, «la web, para la coordinación y el seguimiento» | 4 | T-059, T-062 | web.administracion-solo-para-administradores | implementado |
| REQ-ADM-06 | 08-administracion | P-04; REQ-ACC-12 | 4 | T-059 | administracion.solo-el-administrador | implementado |
| REQ-ADM-07 | 08-administracion | decisión de diseño (H-ADM-11); P-04; P-11 | 4 | T-060 | administracion.el-asistente-no-administra | en curso |
| REQ-ADM-08 | 08-administracion | decisión del equipo del 6 de noviembre de 2026; REQ-ACC-17 | 4 | T-061, T-062 | administracion.lista-de-personas | implementado |
| REQ-ADM-09 | 08-administracion | REQ-ACC-01; decisión del equipo del 6 de noviembre de 2026 (el área sustituye al alta de arranque en el uso diario) | 4 | T-061, T-062 | administracion.alta-con-contrasena-una-vez | implementado |
| REQ-ADM-10 | 08-administracion | REQ-ACC-01; decisión de diseño (H-ADM-14) | 4 | T-061, T-062 | administracion.alta-con-contrasena-una-vez | implementado |
| REQ-ADM-11 | 08-administracion | REQ-ACC-12; R-45 | 4 | T-061, T-062 | administracion.cambio-de-plan | implementado |
| REQ-ADM-12 | 08-administracion | REQ-ACC-12 («darse de baja lo decide la organización»); decisión del equipo del 6 de noviembre de 2026 | 4 | T-059, T-061, T-062 | administracion.suspension-cierra-sesiones | implementado |
| REQ-ADM-13 | 08-administracion | REQ-ACC-12; decisión de diseño (H-ADM-15) | 4 | T-061, T-062 | administracion.baja-definitiva | en curso |
| REQ-ADM-14 | 08-administracion | REQ-ACC-04; `specs/06-acceso/spec.md` §4 (contraseña olvidada, pendiente); decisión de diseño (H-ADM-13) | 4 | T-061, T-062 | administracion.restablecer-contrasena | en curso |
| REQ-ADM-15 | 08-administracion | REQ-ACC-12 («lo decide la organización que creó la cuenta»); P-10 | 4 | T-061, T-062 | administracion.cuenta-afiliada-no-se-administra | implementado |
| REQ-ADM-16 | 08-administracion | P-03; P-07; RN-ER-03 | 4 | T-060, T-061 | administracion.toda-accion-confirmada-y-registrada | implementado |
| REQ-ADM-17 | 08-administracion | decisión del equipo del 6 de noviembre de 2026; `REPLANTEO.md` §4.3 (planes acumulativos) | 4 | T-059, T-063 | afiliacion.sin-afiliar-es-plan-personal | en curso |
| REQ-ADM-18 | 08-administracion | decisión del equipo del 6 de noviembre de 2026; DP-03; REQ-CUN07-16 (el correo solo avisa) | 4 | T-063, T-064 | — | pendiente |
| REQ-ADM-19 | 08-administracion | REQ-ACC-01 (sin registro abierto); decisión de diseño (H-ADM-14) | 4 | T-063, T-064 | — | pendiente |
| REQ-ADM-20 | 08-administracion | P-10; REQ-ACC-17; R-14; decisión de diseño (H-ADM-03) | 4 | T-064, T-065 | — | pendiente |
| REQ-ADM-21 | 08-administracion | decisión del equipo del 6 de noviembre de 2026; P-10; D-17 (el miembro de un equipo usa el Plan Empresarial) | 4 | T-063 | — | pendiente |
| REQ-ADM-22 | 08-administracion | R-14; decisión de diseño (H-ADM-03) | 4 | T-063 | — | pendiente |
| REQ-ADM-23 | 08-administracion | R-14; REQ-CUN05-14 («el consentimiento no se hereda del cargo»); P-10 | 4 | T-063 | — | pendiente |
| REQ-ADM-24 | 08-administracion | decisión de diseño (H-ADM-04) | 4 | T-063 | — | pendiente |
| REQ-ADM-25 | 08-administracion | decisión del equipo del 6 de noviembre de 2026; P-10; REQ-CUN05-14; decisión de diseño (H-ADM-08) | 4 | T-063, T-064 | — | pendiente |
| REQ-ADM-26 | 08-administracion | R-14 (revocable sin pasar por el gerente); P-10; decisión de diseño (H-ADM-07) | 4 | T-063, T-064, T-065 | — | pendiente |
| REQ-ADM-27 | 08-administracion | REQ-ACC-12 | 4 | T-063, T-064 | — | pendiente |
| REQ-ADM-28 | 08-administracion | EN-05 Equipo de Trabajo; REQ-ACC-16 | 4 | T-066, T-067 | — | pendiente |
| REQ-ADM-29 | 08-administracion | REQ-ACC-16 (una cuenta puede ser responsable de un equipo y miembro de otro) | 4 | T-066, T-067 | — | pendiente |
| REQ-ADM-30 | 08-administracion | REQ-ACC-16; decisión de diseño (H-ADM-09) | 4 | T-066, T-067 | — | pendiente |
| REQ-ADM-31 | 08-administracion | REQ-ACC-16; decisión de diseño (H-ADM-08) | 4 | T-066, T-067 | — | pendiente |
| REQ-ADM-32 | 08-administracion | REQ-ACC-15, REQ-ACC-16 | 4 | T-066, T-067 | — | pendiente |
| REQ-CUN03-01 | 09-tareas-personales | CUN-03 flujo principal, pasos 1 a 3; REQ-CAP-02, REQ-CAP-03; RN-ER-03 | 1, 2 | T-048, T-050 | tareas.sin-confirmar-no-registra, agente.tareas.registra-con-tarjeta | implementado |
| REQ-CUN03-02 | 09-tareas-personales | CUN-03 excepción «información insuficiente»; R-20; REQ-CAP-04; glosario, «Pendiente sin fecha» | 2 | T-050 | agente.tareas.registra-con-tarjeta | implementado |
| REQ-CUN03-03 | 09-tareas-personales | CUN-03; EN-04; R-38; `design/ARQUITECTURA-VISUAL-MOVIL.md` §2, «Tareas no tiene niveles de período» | 1 | T-047, T-049 | tareas.franja-y-orden, tareas.modificar-muestra-antes-y-ahora | implementado |
| REQ-CUN03-04 | 09-tareas-personales | CUN-03; REQ-CAP-08; R-12; REQ-CUN04-13 | 1 | T-048 | tareas.esperando-y-recibido | implementado |
| REQ-CUN03-05 | 09-tareas-personales | CUN-03; `design/ARQUITECTURA-VISUAL-MOVIL.md` §2, «se cierra o se convierte en otra cosa»; R-25 | 1 | T-048 | tareas.esperando-y-recibido | implementado |
| REQ-CUN03-06 | 09-tareas-personales | CUN-03, alcance «consultar»; R-38; R-41 (la sección se ve igual en las dos plataformas); P-05 | 1 | T-049, T-052, T-054 | tareas.franja-y-orden, web.tareas-por-franja, movil.tareas-por-franja | implementado |
| REQ-CUN03-07 | 09-tareas-personales | CUN-03; REQ-CUN04-14 («no es tarea del usuario pero sí es su problema»); P-02; P-05 | 1 | T-047, T-049 | tareas.franja-y-orden | implementado |
| REQ-CUN03-08 | 09-tareas-personales | REQ-CUN01-12 (por analogía); R-42; H-AG-10 | 1 | T-052, T-054 | web.tareas-por-franja, movil.tareas-por-franja | implementado |
| REQ-CUN03-09 | 09-tareas-personales | CUN-03, alcance «completar»; DP-01 (controles directos sobre lo que ya existe); P-11; glosario, «Acción sensible» | 1 | T-049, T-052, T-054 | tareas.hecha-y-reabrir, web.tareas-por-franja, movil.tareas-por-franja | implementado |
| REQ-CUN03-10 | 09-tareas-personales | CUN-03, alcance «modificar»; R-25 (nada desaparece en silencio); decisión H-TP-06 | 1 | T-049, T-052, T-054 | tareas.hecha-y-reabrir, web.tareas-por-franja, movil.tareas-por-franja | implementado |
| REQ-CUN03-11 | 09-tareas-personales | CUN-03; RN-ER-03; P-03; R-25 (el asistente no borra nada por su cuenta); DP-01 | 1 | T-048, T-052, T-054 | tareas.descartar-requiere-confirmacion, web.tareas-por-franja, movil.tareas-por-franja | implementado |
| REQ-CUN03-12 | 09-tareas-personales | CUN-03, alcance «modificar»; RN-ER-03; R-42 (no hay formulario para cambiarla a mano); REQ-CUN01-06 (por analogía) | 1, 2 | T-048, T-050 | tareas.modificar-muestra-antes-y-ahora, agente.tareas.completar-dice-cual | implementado |
| REQ-CUN03-13 | 09-tareas-personales | CUN-01 y CUN-03; R-23 (Agenda es lo que va a pasar); R-26 (Agenda contesta «qué»); REQ-CUN01-05; REQ-CUN01-14, REQ-CUN01-15; REQ-CAP-25; `PLAN-VALOR-USUARIO.md` §5 («como bloque distinto del compromiso; no va a Google») | 1 | T-049, T-053, T-055 | tareas.del-dia-con-vencidas, web.tareas-en-hoy, movil.tareas-en-hoy | implementado |
| REQ-CUN03-14 | 09-tareas-personales | CUN-03, alcance «consultar»; REQ-CUN01-13 (por analogía); `REPLANTEO.md` §6, `/pendientes`; P-02 | 2 | T-050 | agente.tareas.consulta-tal-cual | implementado |
| REQ-CUN03-15 | 09-tareas-personales | CUN-03; REQ-AGT-04 (alternativas de referente, que arma el código); RN-ER-03; P-03 | 2 | T-051 | agente.tareas.completar-dice-cual | implementado |
| REQ-CUN03-16 | 09-tareas-personales | CUN-03 (actor único: el propio usuario); CUN-07 y REQ-ACC-15 (delegar es del responsable del equipo, `03-tareas`); REQ-AGT-02; R-12 | 2 | T-050, T-051 | agente.tareas.no-delega | en curso |
| REQ-CUN03-17 | 09-tareas-personales | P-11 («al volver, lo encolado pasa por la confirmación de siempre»); REQ-AGT-02; REQ-CAP-24 (fechas relativas respecto de la captura); REQ-CAP-25; `SPEC.md` §10 («la conversión de las tareas en espera va en el hito 3»); decisión H-TP-11 | 2 | T-056, T-057 | agente.tareas-en-espera-se-convierten, web.tareas-por-confirmar, movil.tareas-por-confirmar | pendiente |
| REQ-CUN03-18 | 09-tareas-personales | R-42; P-11; DP-01; REQ-CAP-24; REQ-CUN01-11 (por analogía) | 1, 2 | T-049 | tareas.consulta-sin-proveedor-de-modelo | implementado |
| REQ-CUN03-19 | 09-tareas-personales | RN-OP-01; RN-EST-01; P-10; REQ-ACC-17 («nunca ve las tareas que el miembro se creó para sí») | 1 | T-047, T-049 | tareas.solo-las-propias, plataforma.aislamiento-entre-organizaciones | implementado |
| REQ-CUN03-20 | 09-tareas-personales | CUN-03 (no depende de EN-02); REQ-ACC-08 (el permiso de calendario solo bloquea lo que lo necesita) | 1 | T-049 | tareas.sin-calendario | implementado |
| REQ-CUN03-21 | 09-tareas-personales | R-27; propuesta de Franco del 25 de noviembre de 2026; REQ-CUN03-15 (candidatas); RN-ER-03; P-03 | 1 | T-126 | agente.tareas-anotar-avance | implementado |
| REQ-CUN03-22 | 09-tareas-personales | R-27; P-05; decisión 20 de `07-agente` (la transcripción, 90 días); propuesta de Franco del 25 de noviembre de 2026 (la fuente de verdad no es el chat) | 1 | T-125 | tareas.bitacora | implementado |
| REQ-CUN03-23 | 09-tareas-personales | R-27; REQ-CUN03-14 (la respuesta tal como está); H-AGT-15; P-02 | 1 | T-126, T-127, T-128 | agente.tareas-bitacora, web.tareas-bitacora, movil.tareas-bitacora | implementado |
| REQ-CUN03-24 | 09-tareas-personales | R-27; R-17 (el hilo vive dentro de la tarea, nunca como sección propia); R-41 (lo mismo en las dos plataformas) | 1 | T-125, T-127, T-128 | tareas.bitacora, web.tareas-bitacora, movil.tareas-bitacora | implementado |
| REQ-CUN03-25 | 09-tareas-personales | R-42; P-11; REQ-CUN03-18; H-TP-01 | 1 | T-125, T-126 | tareas.bitacora, agente.tareas-anotar-avance | implementado |
| REQ-CUN03-26 | 09-tareas-personales | H-TP-26, precisada por Franco el 25 de noviembre de 2026 (la ficha de la tarea); REQ-CUN03-21 | 1 | T-125, T-126, T-127, T-128 | tareas.aviso-al-vencer, agente.tareas-anotar-avance, web.tareas-bitacora, movil.tareas-bitacora | implementado |
| REQ-CUN03-27 | 09-tareas-personales | H-TP-28, decisión de Franco del 25 de noviembre de 2026 («pasada la fecha, una notificación para cerrar o mantener abierto»); R-27; H-TP-07; DP-01 | 1 | T-125, T-127, T-128 | tareas.aviso-al-vencer, web.tareas-bitacora, movil.tareas-bitacora | implementado |
