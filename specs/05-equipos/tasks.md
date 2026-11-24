# Tareas propuestas — CUN-05 Equipos y consulta de disponibilidad

**Estado:** implementación parcial funcional; tareas pendientes de cierre formal, pruebas completas y trazabilidad.
**Fuente:** `specs/05-equipos/spec.md` (REQ-CUN05-01 a 17).
**Regla de avance:** no marcar `[x]` sin código integrado, prueba ejecutada y trazabilidad actualizada.

## Preparación y acuerdos

- [ ] **EQ-001 — Revisar convenciones del repositorio.** Leer `AGENTS.md`, `SPEC.md`, esquema Prisma, módulos de identidad, operaciones, integraciones, agenda y contratos. **Evidencia:** lista de puntos de integración y decisiones. **Dep.:** ninguna.
- [ ] **EQ-002 — Validar `plan.md` con Aixa y Tapia.** Confirmar modelos, autoridad por equipo, rutas/operaciones y tratamiento de consentimiento sin interferir con tareas personales. **Evidencia:** decisiones anotadas en `SPEC.md` cuando corresponda. **Dep.:** EQ-001.
- [ ] **EQ-003 — Resolver o registrar D-8.** Definir modelo de participante externo e invitación por correo. **REQ:** 12, 15. **Evidencia:** decisión aprobada; si no, dejar EQ-015 bloqueada. **Dep.:** EQ-002.

## Persistencia y seguridad

- [ ] **EQ-004 — Diseñar modelos Prisma de equipos y miembros.** Añadir relaciones con organización/perfiles, índices, unicidad y migración compatible. **REQ:** 01, 11, 17. **Pruebas:** integridad, pertenencia y aislamiento. **Dep.:** EQ-002.
- [ ] **EQ-005 — Modelar consentimiento individual de compartir disponibilidad.** Distinguirlo del OAuth de Google; soportar estados y revocación por persona/equipo. **REQ:** 08, 14, 15, 16. **Pruebas:** consentimiento propio, no concedible por gerente, revocación. **Dep.:** EQ-004.
- [ ] **EQ-006 — Implementar autorización contextual por equipo.** Consultas solo para miembros autorizados; administración reservada al responsable del equipo; conservar denegación por defecto y probar regresión de guardas. **REQ:** 11, 17; **dependencia:** REQ-ACC-16. **Pruebas:** acceso cruzado, rol global insuficiente, colaborador lector. **Dep.:** EQ-004.

## Contratos y backend

- [ ] **EQ-007 — Definir contratos Zod y operaciones.** Validar equipo, participantes, rango, duración opcional, banda explícita y zona; respuesta con estado parcial, motivos y alternativas. **REQ:** 01–11, 15, 17. **Dep.:** EQ-002, EQ-006.
- [ ] **EQ-008 — Implementar consulta de miembros y estados de consentimiento.** Resolver nombres a perfiles concretos y no exponer eventos. **REQ:** 01, 11, 15, 17. **Pruebas:** miembros correctos, estados y acceso denegado. **Dep.:** EQ-005, EQ-006, EQ-007.
- [ ] **EQ-009 — Integrar obtención de libre/ocupado.** Reutilizar el adaptador Google existente y comprobar permisos; no devolver títulos, ubicaciones ni asistentes. **REQ:** 02, 08, 13, 16. **Pruebas:** sin Google, sin consentimiento, revocado, minimización. **Dep.:** EQ-005, EQ-007.
- [ ] **EQ-010 — Implementar cálculo de intervalos comunes.** Normalización, intersección y resultados parciales; no tratar falta de datos como libertad. **REQ:** 02, 03, 04, 08. **Pruebas:** intervalos contiguos, solapamientos, duración exacta, sin duración, parciales. **Dep.:** EQ-009.
- [ ] **EQ-011 — Aplicar RN-CAL-01.** Bandas 08–20/20–22/exterior, petición explícita, mañana por defecto, orden por inicio y desempate por duración. **REQ:** 03–06. **Pruebas:** bordes de banda, inicio igual, petición nocturna/mismo día. **Dep.:** EQ-010.
- [ ] **EQ-012 — Resolver zonas horarias.** Calcular con instantes y presentar en IANA del consultante. **REQ:** 07. **Pruebas:** Perú/España, horario de verano, cruce de fecha. **Dep.:** EQ-010.
- [ ] **EQ-013 — Manejar estados y repetición de consulta.** Distinguir sin calcular, sin común, común insuficiente, parcial; permitir cambiar participantes, rango y duración. **REQ:** 08, 09, 10. **Pruebas:** recálculo y ausencia de datos obsoletos. **Dep.:** EQ-010–012.
- [ ] **EQ-014 — Implementar consentimiento de colaborador.** Solo el propio colaborador concede/revoca; calendario propio conectado; reflejar estados. **REQ:** 14, 15, 16. **Pruebas:** no suplantación, revocación efectiva. **Dep.:** EQ-005, EQ-009.
- [ ] **EQ-015 — Implementar invitación de externo.** Enviar correo con alcance de consulta y estado pendiente; no consultar hasta autorización. **REQ:** 12, 14, 15. **BLOQUEADA hasta resolver D-8 y aprobar contratos.** **Dep.:** EQ-003, EQ-005.

## Interfaz y verificación

- [ ] **EQ-016 — Construir selector de equipo y participantes web.** Mostrar únicamente equipos accesibles y estado de autorización. **REQ:** 01, 11, 15, 17. **Dep.:** EQ-008.
- [ ] **EQ-017 — Construir rejilla de disponibilidad.** Lienzo de tres columnas; libre/ocupado; alternativas; banda atenuada; sin datos tramado; zona y duración visibles. **REQ:** 03–09, 13. **Dep.:** EQ-011–013, EQ-016.
- [ ] **EQ-018 — Añadir ajustes y estados vacíos.** Recalcular al modificar condiciones y ofrecer alternativas cuando no hay intervalo común; distinguir los tres estados visuales. **REQ:** 04, 08, 09, 10. **Dep.:** EQ-017.
- [ ] **EQ-019 — Pruebas de seguridad y privacidad extremo a extremo.** Probar miembro, responsable, no miembro, organización ajena, consentimiento, revocación y ausencia de metadatos de eventos. **REQ:** 11, 13, 14, 16, 17. **Dep.:** EQ-006, EQ-014, EQ-017.
- [ ] **EQ-020 — Integración, trazabilidad y revisión.** Ejecutar comandos de verificación del repositorio, registrar resultados reales, actualizar `specs/trazabilidad.md`, preparar Pull Request desde `Vasco`. **REQ:** 01–17 según alcance realmente completado. **Dep.:** tareas implementadas.

## Orden sugerido de entregas

**Entrega A — Fundamentos:** EQ-001, 002, 004, 006, 007, 008 (equipos, miembros, permisos y contratos).
**Entrega B — Disponibilidad:** EQ-005, 009, 010, 011, 012, 013, 014 (consentimiento y cálculo).
**Entrega C — Interfaz y cierre:** EQ-016, 017, 018, 019, 020.
**Bloqueada por decisión:** EQ-003 y EQ-015 (participantes externos, D-8).

## Registro de ejecución (rellenar con resultados reales)

| Tarea | Responsable | Commit/PR | Prueba ejecutada | Resultado | Estado |
|---|---|---|---|---|---|
| — | — | — | — | — | Pendiente |

**Nota:** no se asignan Story Points ni fechas de cierre en este archivo hasta que el equipo los acuerde. Las estimaciones de esfuerzo y el estado real deben quedar registrados, no inferidos de la existencia de código.

## Registro de avance real — 11/11/2026

**Rama:** `Vasco`
**Commit:** `8e1914c`

| Tareas | Avance comprobado | Estado |
|---|---|---|
| EQ-004, EQ-005 | Modelos Prisma, migraciones y consentimiento implementados | Parcial: falta cierre de pruebas |
| EQ-006, EQ-008 | Consulta de equipos e integrantes con autorización contextual | Parcial: faltan pruebas de acceso cruzado |
| EQ-009, EQ-010 | Google Calendar y cálculo de intervalos comunes probados con dos integrantes | Parcial: faltan casos límite |
| EQ-011, EQ-012 | Consulta normal 08:00–20:00 y presentación horaria | Parcial: faltan bandas especiales y DST |
| EQ-013, EQ-014 | Consulta repetible y actualización individual del consentimiento | Parcial: faltan estados y revocación |
| EQ-016, EQ-017, EQ-018 | Interfaz web funcional con equipo, fecha, duración y resultados | Parcial: falta rejilla completa |
| EQ-015 | Participantes externos | Bloqueada por D-8 |
| EQ-019, EQ-020 | Seguridad, pruebas completas, trazabilidad e integración | Pendiente |

**Evidencia manual:** dos cuentas de Google, dos integrantes y eventos superpuestos. El 11/11/2026 se obtuvieron intervalos comunes de 08:00–09:30 y 15:00–20:00, con dos participantes consultados.

**Criterio de cierre:** las casillas originales permanecen sin marcar hasta contar con pruebas ejecutadas, trazabilidad actualizada y revisión correspondiente.
