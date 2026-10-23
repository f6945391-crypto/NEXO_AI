# Trazabilidad

**Generado por** `python tools/trazabilidad.py`. No edites las columnas Requisito, Área ni Origen: salen de los `spec.md`.
**Se editan a mano:** Fase, Tarea (`T-nnn` de `tasks.md`), Prueba (nombre de la prueba automática) y Estado.
**Estados válidos:** pendiente, en curso, implementado, verificado, retirado. «implementado» y «verificado» exigen una prueba.
**Verificar antes de dar algo por terminado:** `python tools/trazabilidad.py --check`.

## Resumen

| Área | Requisitos | pendiente | en curso | implementado | verificado | retirado |
|---|---|---|---|---|---|---|
| 01-captura | 24 | 24 | 0 | 0 | 0 | 0 |
| 02-agenda | 12 | 9 | 3 | 0 | 0 | 0 |
| 02-jornada | 24 | 24 | 0 | 0 | 0 | 0 |
| 03-tareas | 17 | 17 | 0 | 0 | 0 | 0 |
| 04-comunicaciones | 28 | 22 | 0 | 0 | 0 | 6 |
| 05-equipos | 16 | 16 | 0 | 0 | 0 | 0 |
| 06-acceso | 14 | 1 | 2 | 11 | 0 | 0 |

## Requisitos

| Requisito | Área | Origen | Fase | Tarea | Prueba | Estado |
|---|---|---|---|---|---|---|
| REQ-CAP-01 | 01-captura | CUN-01 y CUN-03, flujo principal paso 1 | 2 | — | — | pendiente |
| REQ-CAP-02 | 01-captura | CUN-01 paso 2, CUN-03 paso 2 | 2 | — | — | pendiente |
| REQ-CAP-03 | 01-captura | RN-ER-03 | 2 | — | — | pendiente |
| REQ-CAP-04 | 01-captura | CUN-01 y CUN-03, excepción «información insuficiente»; regla de producto R-20 | 2 | — | — | pendiente |
| REQ-CAP-05 | 01-captura | decisión de producto; RN-OP-01 | 2 | — | — | pendiente |
| REQ-CAP-06 | 01-captura | decisión de producto | 2 | — | — | pendiente |
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
| REQ-CAP-23 | 01-captura | regla de producto derivada de los cuatro blancos; RN-OP-01 | 2 | — | — | pendiente |
| REQ-CAP-24 | 01-captura | regla de producto R-42; `SPEC.md` P-11 | 2 | — | — | pendiente |
| REQ-CUN01-01 | 02-agenda | CUN-01 flujo principal, pasos 1 y 2 | 2 | — | — | pendiente |
| REQ-CUN01-02 | 02-agenda | CUN-01 flujo principal, paso 3 | 1 | T-016, T-017, T-019 | agenda.consulta-solapes-antes-de-proponer | en curso |
| REQ-CUN01-03 | 02-agenda | RN-ER-03 | 1 | T-012, T-017 | agenda.sin-confirmar-no-escribe-ni-notifica | implementado |
| REQ-CUN01-04 | 02-agenda | CUN-01 flujo principal, pasos 5 y 6 | 1 | T-017, T-019 | agenda.confirmar-registra-lo-mostrado | en curso |
| REQ-CUN01-05 | 02-agenda | CUN-01 FA-01 | 1 | T-016, T-018 | alternativas.dp02 | en curso |
| REQ-CUN01-06 | 02-agenda | CUN-01 FA-02 | 1 | T-019, T-021 | — | pendiente |
| REQ-CUN01-07 | 02-agenda | CUN-01 EX-01 | 1 | T-017 | agenda.datos-faltantes-no-crea-operacion | implementado |
| REQ-CUN01-08 | 02-agenda | CUN-01 EX-02, RN-OP-01, REQ-ACC-08 | 1 | T-015, T-017 | agenda.sin-permiso-no-invoca-proveedor | implementado |
| REQ-CUN01-09 | 02-agenda | RN-OP-01, RN-EST-01 | 1 | T-014, T-015 | agenda.solo-eventos-propios | implementado |
| REQ-CUN01-10 | 02-agenda | decisión de arquitectura AD-07; necesaria para CUN-05 y CUN-06 | 1 | T-014, T-015, T-021, T-025 | agenda.horas-con-zona-horaria | en curso |
| REQ-CUN01-11 | 02-agenda | regla de producto R-42; `SPEC.md` P-11 | 1 | T-015, T-019, T-021 | agenda.consulta-sin-proveedor-de-modelo | en curso |
| REQ-CUN01-12 | 02-agenda | derivado de la revisión de diseño de CUN-01 | 1 | T-021, T-025 | agenda.estado-vacio-abre-captura | en curso |
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
| REQ-ACC-01 | 06-acceso | Requisito del sistema | 1 | T-002 | acceso.sin-registro-abierto | implementado |
| REQ-ACC-02 | 06-acceso | Requisito del sistema | 1 | T-004, T-011, T-024 | acceso.recorrido-web | implementado |
| REQ-ACC-03 | 06-acceso | Requisito del sistema | 1 | T-004, T-011 | acceso.error-no-revela-correo | implementado |
| REQ-ACC-04 | 06-acceso | Requisito del sistema | 1 | T-005, T-011 | acceso.primer-ingreso-bloquea-hasta-completar | implementado |
| REQ-ACC-05 | 06-acceso | Requisito del sistema; RN-CAL-01 | 1 | T-005, T-011 | acceso.zona-horaria-requiere-eleccion | implementado |
| REQ-ACC-06 | 06-acceso | Requisito del sistema | 1 | T-007, T-022 | acceso.conectar-google-por-permiso | implementado |
| REQ-ACC-07 | 06-acceso | Requisito del sistema | 1 | T-007 | acceso.solo-dos-alcances-sin-lectura-de-buzon | implementado |
| REQ-ACC-08 | 06-acceso | Requisito del sistema | 1 | T-008 | acceso.sin-google-no-agenda-ni-envia | implementado |
| REQ-ACC-09 | 06-acceso | Requisito del sistema | 1 | T-008 | acceso.revocacion-avisa-una-vez-y-no-reintenta | implementado |
| REQ-ACC-10 | 06-acceso | Requisito del sistema | 1 | T-006, T-009 | acceso.cuenta-no-autogestionable | en curso |
| REQ-ACC-11 | 06-acceso | Requisito del sistema | 1 | T-009 | — | pendiente |
| REQ-ACC-12 | 06-acceso | Requisito del sistema; R-45 | 1 | T-006 | acceso.cuenta-no-autogestionable | implementado |
| REQ-ACC-13 | 06-acceso | Requisito del sistema; D-17 | 1 | T-004 | acceso.colaborador-solo-ve-lo-suyo | en curso |
| REQ-ACC-14 | 06-acceso | Requisito del sistema; D-17 | 1 | T-007 | acceso.colaborador-solo-calendario | implementado |
