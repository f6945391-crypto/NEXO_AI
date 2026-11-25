# Trazabilidad

**Generado por** `python tools/trazabilidad.py`. No edites las columnas Requisito, Área ni Origen: salen de los `spec.md`.
**Se editan a mano:** Fase, Tarea (`T-nnn` de `tasks.md`), Prueba (nombre de la prueba automática) y Estado.
**Estados válidos:** pendiente, en curso, implementado, verificado, retirado. «implementado» y «verificado» exigen una prueba.
**Verificar antes de dar algo por terminado:** `python tools/trazabilidad.py --check`.

## Resumen

| Área | Requisitos | pendiente | en curso | implementado | verificado | retirado |
|---|---|---|---|---|---|---|
| 01-captura | 25 | 18 | 3 | 4 | 0 | 0 |
| 02-agenda | 15 | 2 | 2 | 11 | 0 | 0 |
| 02-jornada | 24 | 24 | 0 | 0 | 0 | 0 |
| 03-tareas | 26 | 26 | 0 | 0 | 0 | 0 |
| 04-comunicaciones | 28 | 22 | 0 | 0 | 0 | 6 |
| 05-equipos | 17 | 17 | 0 | 0 | 0 | 0 |
| 06-acceso | 17 | 2 | 0 | 15 | 0 | 0 |
| 07-agente | 5 | 2 | 2 | 1 | 0 | 0 |
| 08-tareas-personales | 10 | 0 | 10 | 0 | 0 | 0 |

## Requisitos

| Requisito | Área | Origen | Fase | Tarea | Prueba | Estado |
|---|---|---|---|---|---|---|
| REQ-CAP-01 | 01-captura | CUN-01 y CUN-03, flujo principal paso 1 | 2 | T-034, T-035 | movil.captura-propone-y-confirma | en curso |
| REQ-CAP-02 | 01-captura | CUN-01 paso 2, CUN-03 paso 2 | 2 | T-032, T-033 | agente.en-espera-tarea-a-propuesta | en curso |
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
| REQ-CAP-25 | 01-captura | P-11 («lo pedido queda en cola, visible como en espera»); REQ-CAP-23; `design/ARQUITECTURA-VISUAL-WEB.md` §6 (lo en espera va al registro); hallazgo 4.1-d de `design/capturas/2026-11-04/INFORME-VISUAL-AGENTE.md` (hoy lo en espera solo vive en la conversación); `PLAN-VALOR-USUARIO.md` hito 1. Añadido el 6 de noviembre de 2026 | 2 | T-045 | web.en-espera-visible, movil.en-espera-visible | pendiente |
| REQ-CUN01-01 | 02-agenda | CUN-01 flujo principal, pasos 1 y 2 | 2 | T-031, T-034, T-043 | agente.agenda.extrae-sin-inventar-fin | en curso |
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
| REQ-CUN01-13 | 02-agenda | CUN-01, alcance «consultar»; `PROPUESTA-TECNICA.md` §7.3; añadido el 24 de octubre de 2026 al planificar el agente | 2 | T-031, T-034, T-043 | agente.agenda.consulta-tal-cual | en curso |
| REQ-CUN01-14 | 02-agenda | CUN-01, alcance «consultar»; `design/ARQUITECTURA-VISUAL-MOVIL.md` §5.1 (Semana: «los siete días uno debajo de otro, cada uno con sus bloques»); `design/ARQUITECTURA-VISUAL-WEB.md` §9, punto 2; `PLAN-VALOR-USUARIO.md` hito 2. Añadido el 6 de noviembre de 2026 | 2 | T-044 | web.agenda-semana-y-mes, movil.agenda-semana-y-mes | pendiente |
| REQ-CUN01-15 | 02-agenda | CUN-01, alcance «consultar»; `design/ARQUITECTURA-VISUAL-MOVIL.md` §5.1 (Mes: «rejilla de calendario con un punto por cada dos compromisos»); `PLAN-VALOR-USUARIO.md` hito 2. Añadido el 6 de noviembre de 2026 | 2 | T-044 | web.agenda-semana-y-mes, movil.agenda-semana-y-mes | pendiente |
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
| REQ-CUN05-01 | 05-equipos | CUN-05 flujo principal, pasos 1 y 2 | 4 | — | — | pendiente |
| REQ-CUN05-02 | 05-equipos | CUN-05 flujo principal, paso 3; RN-OP-02 | 4 | — | — | pendiente |
| REQ-CUN05-03 | 05-equipos | RN-INF-01, RN-CAL-01 punto 1 | 4 | — | — | pendiente |
| REQ-CUN05-04 | 05-equipos | RN-CAL-01 punto 1 | 4 | — | — | pendiente |
| REQ-CUN05-05 | 05-equipos | RN-CAL-01 punto 2 | 4 | — | — | pendiente |
| REQ-CUN05-06 | 05-equipos | RN-CAL-01 puntos 3 y 4 | 4 | — | — | pendiente |
| REQ-CUN05-07 | 05-equipos | RN-CAL-01, consecuencia declarada; REQ-CUN01-10 | 4 | — | — | pendiente |
| REQ-CUN05-08 | 05-equipos | CUN-05 EX-01 | 4 | — | — | pendiente |
| REQ-CUN05-09 | 05-equipos | CUN-05 EX-02, RN-ER-01 | 4 | — | — | pendiente |
| REQ-CUN05-10 | 05-equipos | CUN-05 FA-01 | 4 | — | — | pendiente |
| REQ-CUN05-11 | 05-equipos | RN-OP-01, RN-OP-02 | 4 | — | — | pendiente |
| REQ-CUN05-12 | 05-equipos | decisión de alcance; RN-OP-02 | 4 | — | — | pendiente |
| REQ-CUN05-13 | 05-equipos | regla de producto R-13; propuesta técnica §9, minimización | 4 | — | — | pendiente |
| REQ-CUN05-14 | 05-equipos | regla de producto R-14; RN-OP-01 | 4 | — | — | pendiente |
| REQ-CUN05-15 | 05-equipos | REQ-CUN05-12 y 14 | 4 | — | — | pendiente |
| REQ-CUN05-16 | 05-equipos | decisión D-17; RN-OP-02; R-14 | 4 | — | — | pendiente |
| REQ-CUN05-17 | 05-equipos | decisión del equipo del 23 de octubre de 2026 (rango del colaborador, pregunta 1) | 4 | — | — | pendiente |
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
| REQ-AGT-01 | 07-agente | `PROPUESTA-TECNICA.md` §7.4, memoria de conversación; H-AGT-16; `INFORME-MEMORIA-AGENTE.md` §6 y §8.1; glosario, «Episodio» y «Nota de continuidad» | 2 | T-032, T-034, T-038, T-040, T-041 | agente.conversacion-con-contexto | en curso |
| REQ-AGT-02 | 07-agente | decisión del equipo, 24 de octubre de 2026; REQ-CAP-02, REQ-CAP-23 | 2 | T-033, T-034, T-052 | web.asistente-en-espera, agente.en-espera-tarea-a-propuesta | en curso |
| REQ-AGT-03 | 07-agente | H-AGT-16; `INFORME-MEMORIA-AGENTE.md` §6.1 y §8.1; `design/ARQUITECTURA-VISUAL-WEB.md` §5 y §6 («lo cerrado no se pierde») | 2 | T-038, T-039, T-041 | agente.transcripcion-persiste, web.asistente-historial | implementado |
| REQ-AGT-04 | 07-agente | H-AGT-17; `INFORME-MEMORIA-AGENTE.md` §6.4.5; decisión 17 de `02-agenda` (las alternativas no pasan por el modelo); P-02, P-03 | 2 | T-042 | — | pendiente |
| REQ-AGT-05 | 07-agente | H-AGT-17; `INFORME-MEMORIA-AGENTE.md` §6.4.3 y §6.4.4; glosario, «Hilo» | 2 | — | — | pendiente |
| REQ-CUN03-01 | 08-tareas-personales | CUN-03 flujo principal; REQ-CAP-02; REQ-CAP-07; R-38; P-03; REQ-CUN01-03 | 1 | T-048, T-051 | tareas.registrar-propone-y-confirma, tareas.sin-fecha-no-inventa, agente.herramientas-de-tareas, web.tareas-completar | en curso |
| REQ-CUN03-02 | 08-tareas-personales | regla «tarea o apunte» de `design/ARQUITECTURA-VISUAL-MOVIL.md`; REQ-CAP-02 | 1 | T-051 | agente.apunte-no-es-tarea | en curso |
| REQ-CUN03-03 | 08-tareas-personales | R-38; R-23; P-02 | 1 | T-047, T-049, T-053, T-054 | tareas.franjas-y-atrasadas, tareas.rutas-de-consulta, web.tareas-franjas, movil.tareas-franjas | en curso |
| REQ-CUN03-04 | 08-tareas-personales | hito 3 de `PLAN-VALOR-USUARIO.md`; REQ-CUN01-13 (misma regla para la agenda) | 1 | T-051 | agente.consultar-pendientes | en curso |
| REQ-CUN03-05 | 08-tareas-personales | CUN-03; DP-01; R-25 | 1 | T-048, T-049, T-053, T-054 | tareas.completar-y-reabrir, web.tareas-completar, movil.tareas-completar | en curso |
| REQ-CUN03-06 | 08-tareas-personales | CUN-03; R-25; P-03; REQ-CUN01-02 | 1 | T-048 | tareas.actualizar-muestra-antes-y-despues, tareas.cancelar-no-borra, tareas.cambios | en curso |
| REQ-CUN03-07 | 08-tareas-personales | R-12; REQ-CAP-02; P-09 | 1 | T-048 | tareas.esperando-no-contacta | en curso |
| REQ-CUN03-08 | 08-tareas-personales | hito 3 de `PLAN-VALOR-USUARIO.md` (tarea con fecha y hora en la agenda); R-23; REQ-CUN01-02 | 1 | T-050 | agenda.tarea-no-es-conflicto | en curso |
| REQ-CUN03-09 | 08-tareas-personales | REQ-AGT-02; REQ-CAP-24; P-11; decisión 27 de `07-agente` | 1 | T-052 | agente.en-espera-tarea-a-propuesta | en curso |
| REQ-CUN03-10 | 08-tareas-personales | P-04; P-10; R-22; REQ-ACC-17 | 1 | T-049 | tareas.aislamiento-por-perfil | en curso |
