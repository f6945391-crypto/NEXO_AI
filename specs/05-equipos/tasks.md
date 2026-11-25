# Tareas — CUN-05 Equipos y consulta de disponibilidad

**Estado:** implementación parcial funcional; tareas pendientes de cierre formal, pruebas completas y trazabilidad.
**Fuente:** `specs/05-equipos/spec.md` (REQ-CUN05-01 a 17).
**Regla de avance:** no declarar una tarea hecha sin código integrado, prueba ejecutada y trazabilidad actualizada.

## Convenciones de seguimiento

- Numeración provisional: T-099 a T-119.
- Pendiente de coordinación con Franco y Aixa.
- Estados: pendiente, en curso, hecha.
- No cerrar tareas sin pruebas ejecutadas y trazabilidad.
- Base de integración: PR #1, commit 688da81.
- Rama actual: Vasco-cun05-correcciones.

## Preparación y acuerdos

### T-099 · Revisar convenciones del repositorio

- **Contenido:** Leer `AGENTS.md`, `SPEC.md`, esquema Prisma, módulos de identidad, operaciones, integraciones, agenda y contratos. **Evidencia:** lista de puntos de integración y decisiones. **Dep.:** ninguna.
- **Hecho cuando:** Las convenciones y puntos de integracion del repositorio estan identificados y documentados.
- **Pruebas:** pendientes de vincular con los casos exactos.
- **Estado:** en curso

- **Avance 25/11/2026:** Convenciones revisadas y puntos de integracion documentados.

### T-100 · Validar `plan.md` con Aixa y Tapia

- **Contenido:** Confirmar modelos, autoridad por equipo, rutas/operaciones y tratamiento de consentimiento sin interferir con tareas personales. **Evidencia:** decisiones anotadas en `SPEC.md` cuando corresponda. **Dep.:** T-099.
- **Hecho cuando:** El equipo ha revisado y aprobado el plan tecnico y las decisiones compartidas.
- **Pruebas:** pendientes de vincular con los casos exactos.
- **Estado:** pendiente

### T-101 · Resolver o registrar D-8

- **Contenido:** Definir modelo de participante externo e invitación por correo. **REQ:** 12, 15. **Evidencia:** decisión aprobada; si no, dejar T-113 bloqueada. **Dep.:** T-100.
- **Hecho cuando:** D-8 cuenta con una decision aprobada y registrada en SPEC.md.
- **Pruebas:** pendientes de vincular con los casos exactos.
- **Estado:** pendiente de decision del equipo


## Persistencia y seguridad

### T-102 · Diseñar modelos Prisma de equipos y miembros

- **Contenido:** Añadir relaciones con organización/perfiles, índices, unicidad y migración compatible. **REQ:** 01, 11, 17. **Pruebas:** integridad, pertenencia y aislamiento. **Dep.:** T-100.
- **Hecho cuando:** Existe un modelo unico de equipos y miembros, con aislamiento organizacional y migraciones verificadas.
- **Pruebas:** pendientes de vincular con los casos exactos.
- **Estado:** pendiente

### T-103 · Modelar consentimiento individual de compartir disponibilidad

- **Contenido:** Distinguirlo del OAuth de Google; soportar estados y revocación por persona/equipo. **REQ:** 08, 14, 15, 16. **Pruebas:** consentimiento propio, no concedible por gerente, revocación. **Dep.:** T-102.
- **Hecho cuando:** El consentimiento individual puede registrarse y revocarse independientemente de OAuth.
- **Pruebas:** `CUN-05 - Consentimiento individual mediante Operaciones`; `CUN-05 - Contratos compartidos de equipos`; `CUN-05 - Revocacion de consentimiento`.
- **Estado:** en curso

- **Notas de implementacion:** Consentimiento individual independiente de OAuth. Operacion propia, auditoria transaccional y control de concurrencia implementados. Pendiente de unificacion del modelo INC-33.

### T-104 · Implementar autorización contextual por equipo

- **Contenido:** Consultas solo para miembros autorizados; administración reservada al responsable del equipo; conservar denegación por defecto y probar regresión de guardas. **REQ:** 11, 17; **dependencia:** REQ-ACC-16. **Pruebas:** acceso cruzado, rol global insuficiente, colaborador lector. **Dep.:** T-102.
- **Hecho cuando:** Los miembros autorizados pueden consultar su equipo y los usuarios ajenos reciben una denegacion.
- **Pruebas:** `CUN-05 - Autorizacion real por membresia HTTP`; `CUN-05 - Autorizacion de bandas horarias`; `CUN-05 - Autenticacion HTTP real`.
- **Estado:** en curso


## Contratos y backend

### T-105 · Definir contratos Zod y operaciones

- **Contenido:** Validar equipo, participantes, rango, duración opcional, banda explícita y zona; respuesta con estado parcial, motivos y alternativas. **REQ:** 01–11, 15, 17. **Dep.:** T-100, T-104.
- **Hecho cuando:** Las solicitudes y respuestas utilizan contratos Zod compartidos y errores estandarizados.
- **Pruebas:** `CUN-05 - Contratos compartidos de equipos`; `CUN-05 - Disponibilidad mediante HTTP`; `CUN-05 - Autorizacion real por membresia HTTP`.
- **Estado:** en curso

- **Notas de implementacion:** A-2 implementada localmente.
  Contratos compartidos, validacion de solicitudes HTTP,
  respuestas tipadas en web y errores ErrorApi.
  41/41 pruebas de equipos en contratos y 63/63 pruebas API.
  Consentimiento mediante Operaciones incorporado.
  Pendientes: contratos de alternativas, aprobacion
  del plan e integracion.

- **Avance de estados 24/11/2026:** Estados diferenciados e intervalos comunes incorporados al contrato compartido. 71/71 pruebas especificas de contratos aprobadas. Pendientes alternativas; disponibilidad individual registrada en el avance posterior.

- **Diseno individual 24/11/2026:** Diseno de disponibilidadIndividual mediante union discriminada Zod y validaciones de coherencia.

- **Avance individual 24/11/2026:** Contrato de disponibilidad individual implementado mediante union discriminada Zod. 89/89 pruebas especificas y 105/105 del paquete completo. Pendientes alternativas e integracion.

- **Avance 25/11/2026:** Contratos de herramientas del agente incorporados. Compilacion correcta.

### T-106 · Implementar consulta de miembros y estados de consentimiento

- **Contenido:** Resolver nombres a perfiles concretos y no exponer eventos. **REQ:** 01, 11, 15, 17. **Pruebas:** miembros correctos, estados y acceso denegado. **Dep.:** T-103, T-104, T-105.
- **Hecho cuando:** Se identifican los integrantes autorizados y sus estados sin revelar eventos privados.
- **Pruebas:** `CUN-05 - Autorizacion real por membresia HTTP`; `CUN-05 - Seleccion de participantes HTTP`.
- **Estado:** en curso

### T-107 · Integrar obtención de libre/ocupado

- **Contenido:** Reutilizar el adaptador Google existente y comprobar permisos; no devolver títulos, ubicaciones ni asistentes. **REQ:** 02, 08, 13, 16. **Pruebas:** sin Google, sin consentimiento, revocado, minimización. **Dep.:** T-103, T-105.
- **Hecho cuando:** Se obtienen datos libre/ocupado exclusivamente de participantes con autorizacion vigente.
- **Pruebas:** `CUN-05 - Disponibilidad parcial`; `CUN-05 - Revocacion de consentimiento`.
- **Estado:** en curso

### T-108 · Implementar cálculo de intervalos comunes

- **Contenido:** Normalización, intersección y resultados parciales; no tratar falta de datos como libertad. **REQ:** 02, 03, 04, 08. **Pruebas:** intervalos contiguos, solapamientos, duración exacta, sin duración, parciales. **Dep.:** T-107.
- **Hecho cuando:** Se calculan intervalos comunes completos o parciales, respetando duracion, consentimiento y ausencia de datos.
- **Pruebas:** `CUN-05 - Disponibilidad común`; `CUN-05 - Disponibilidad parcial`; `CUN-05 - Duracion opcional`; `CUN-05 - Disponibilidad mediante HTTP`; `CUN-05 - Disponibilidad individual`
- **Estado:** en curso

- **Avance 24/11/2026:** Duracion opcional implementada localmente. 8/8 pruebas unitarias y cuatro nuevas pruebas HTTP aprobadas. Pendiente cierre integral.

- **Avance de estados 24/11/2026:** Clasificacion de cuatro estados implementada. Se conservan intervalos anteriores al filtro de duracion. 101/101 pruebas API CUN-05 aprobadas.

- **Diseno individual 24/11/2026:** Reutilizar unirOcupados y calcularLibres para intervalos individuales posteriores a la revalidacion del consentimiento.

- **Avance individual 24/11/2026:** Intervalos individuales normalizados y calculados despues de revalidar membresia y consentimiento. 15/15 pruebas individuales y 116/116 pruebas API. Pendiente cierre integral.

### T-109 · Aplicar RN-CAL-01

- **Contenido:** Bandas 08–20/20–22/exterior, petición explícita, mañana por defecto, orden por inicio y desempate por duración. **REQ:** 03–06. **Pruebas:** bordes de banda, inicio igual, petición nocturna/mismo día. **Dep.:** T-108.
- **Hecho cuando:** Se aplican las bandas horarias, solicitudes explicitas, orden y desempate definidos en RN-CAL-01.
- **Pruebas:** `CUN-05 - Reglas de bandas horarias`; `CUN-05 - Autorizacion de bandas horarias`; `CUN-05 - Rango de disponibilidad por defecto`; `CUN-05 - Advertencias de disponibilidad`.
- **Estado:** en curso

### T-110 · Resolver zonas horarias

- **Contenido:** Calcular con instantes y presentar en IANA del consultante. **REQ:** 07. **Pruebas:** Perú/España, horario de verano, cruce de fecha. **Dep.:** T-108.
- **Hecho cuando:** La respuesta identifica la zona IANA del consultante y supera pruebas de conversion horaria.
- **Pruebas:** `CUN-05 - Disponibilidad parcial`; `CUN-05 - Rango de disponibilidad por defecto`; `CUN-05 - Seguridad de zona horaria`.
- **Estado:** en curso

### T-111 · Manejar estados y repetición de consulta

- **Contenido:** Distinguir sin calcular, sin común, común insuficiente, parcial; permitir cambiar participantes, rango y duración. **REQ:** 08, 09, 10. **Pruebas:** recálculo y ausencia de datos obsoletos. **Dep.:** T-108, T-109, T-110.
- **Hecho cuando:** Los estados completos, parciales y vacios se distinguen correctamente y las consultas no muestran resultados obsoletos.
- **Pruebas:** `CUN-05 - Disponibilidad parcial`; `CUN-05 - Seleccion de participantes`.
- **Estado:** en curso

- **Avance de estados 24/11/2026:** Estados diferenciados implementados en API y web. La disponibilidad parcial permanece independiente. Pendiente completar recalculo y pruebas extremo a extremo.

- **Avance 25/11/2026:** Alternativas y recalculo individual implementados. Pendientes pruebas web.

### T-112 · Implementar consentimiento de colaborador

- **Contenido:** Solo el propio colaborador concede/revoca; calendario propio conectado; reflejar estados. **REQ:** 14, 15, 16. **Pruebas:** no suplantación, revocación efectiva. **Dep.:** T-103, T-107.
- **Hecho cuando:** Cada colaborador puede conceder o revocar exclusivamente su propio consentimiento, con registro de auditoria.
- **Pruebas:** `CUN-05 - Consentimiento individual mediante Operaciones`; `CUN-05 - Contratos compartidos de equipos`; `CUN-05 - Revocacion de consentimiento`.
- **Estado:** en curso

- **Notas de implementacion:** Backend y frontend implementados localmente. 18/18 pruebas de consentimiento aprobadas. Funcionamiento manual general confirmado por Vasco. Pendiente de revision e integracion.

### T-113 · Implementar invitación de externo

- **Contenido:** Enviar correo con alcance de consulta y estado pendiente; no consultar hasta autorización. **REQ:** 12, 14, 15. **BLOQUEADA hasta resolver D-8 y aprobar contratos.** **Dep.:** T-101, T-103.
- **Hecho cuando:** Los externos reciben una invitacion y sus datos solo se consultan tras obtener autorizacion valida.
- **Pruebas:** pendientes de vincular con los casos exactos.
- **Estado:** pendiente (bloqueada por D-8)


## Interfaz y verificación

### T-114 · Construir selector de equipo y participantes web

- **Contenido:** Mostrar únicamente equipos accesibles y estado de autorización. **REQ:** 01, 11, 15, 17. **Dep.:** T-106.
- **Hecho cuando:** La interfaz permite seleccionar equipos accesibles y participantes individuales, sin permitir selecciones vacias.
- **Pruebas:** `CUN-05 - Seleccion de participantes`; `CUN-05 - Seleccion de participantes HTTP`.
- **Estado:** en curso

### T-115 · Construir rejilla de disponibilidad

- **Contenido:** Lienzo de tres columnas; libre/ocupado; alternativas; banda atenuada; sin datos tramado; zona y duración visibles. **REQ:** 03–09, 13. **Dep.:** T-109, T-110, T-111, T-114.
- **Hecho cuando:** La rejilla presenta intervalos, bandas, zona horaria, duracion y participantes sin datos.
- **Pruebas:** `CUN-05 - Disponibilidad individual`; `CUN-05 - Contratos compartidos de equipos`. Pruebas visuales pendientes.
- **Estado:** en curso

- **Diseno individual 24/11/2026:** Iniciado el diseno de la fuente de datos de la rejilla. Pendiente implementar contratos, servicio y componente visual reutilizable desde CUN-06.

- **Avance individual 24/11/2026:** Fuente de datos de la rejilla implementada y verificada. Disponible mediante disponibilidadIndividual. Pendientes componente visual, accesibilidad y pruebas web.

- **Diseno visual 2026-11-25:** Componente reutilizable, eje temporal independiente, tokens oficiales, privacidad y adaptacion al lienzo. Ver plan 13.15. Implementacion pendiente.

- **Avance 25/11/2026:** Rejilla implementada y comprobada visualmente en disponibilidad parcial. Pendientes refinamientos y pruebas web.

### T-116 · Añadir ajustes y estados vacíos

- **Contenido:** Recalcular al modificar condiciones y ofrecer alternativas cuando no hay intervalo común; distinguir los tres estados visuales. **REQ:** 04, 08, 09, 10. **Dep.:** T-115.
- **Hecho cuando:** La interfaz distingue los estados de disponibilidad y permite ajustar las condiciones de consulta.
- **Pruebas:** `CUN-05 - Disponibilidad parcial`; `CUN-05 - Duracion opcional`; pruebas web pendientes.
- **Estado:** en curso

- **Avance 24/11/2026:** Selector de duracion opcional implementado. Diseno de estados diferenciados documentado. Pendientes alternativas y recalculo.

- **Avance de estados 24/11/2026:** Mensajes diferenciados, duracion maxima y advertencias parciales implementados. TypeScript sin errores y funcionamiento manual general confirmado. Pendientes alternativas interactivas y recalculo.

- **Avance 25/11/2026:** Alternativas interactivas y recalculo individual implementados. TypeScript correcto. Pendiente verificacion integral.

### T-117 · Pruebas de seguridad y privacidad extremo a extremo

- **Contenido:** Probar miembro, responsable, no miembro, organización ajena, consentimiento, revocación y ausencia de metadatos de eventos. **REQ:** 11, 13, 14, 16, 17. **Dep.:** T-104, T-112, T-115.
- **Hecho cuando:** Las pruebas extremo a extremo verifican aislamiento, permisos, consentimiento y privacidad.
- **Pruebas:** `CUN-05 - Autorizacion real por membresia HTTP`; `CUN-05 - Autenticacion HTTP real`; `CUN-05 - Revocacion de consentimiento`; `CUN-05 - Seguridad de zona horaria`.
- **Estado:** en curso

### T-118 · Integración, trazabilidad y revisión

- **Contenido:** Ejecutar comandos de verificación del repositorio, registrar resultados reales, actualizar `specs/trazabilidad.md`, preparar Pull Request desde `Vasco-cun05-correcciones`. **REQ:** 01–17 según alcance realmente completado. **Dep.:** tareas implementadas.
- **Hecho cuando:** Las verificaciones del repositorio pasan, la trazabilidad refleja resultados reales y el PR esta preparado.
- **Pruebas:** pendientes de vincular con los casos exactos.
- **Estado:** en curso

- **Avance 25/11/2026:** Navegacion integrada en Agenda. Documentacion actualizada. Pendiente verificar el repositorio y publicar PR.

## Integración con el agente

### T-119 · Herramienta de consulta de disponibilidad

- **Satisface:** REQ-CUN05-01, REQ-CUN05-02, REQ-CUN05-10, REQ-CUN05-11, REQ-CUN05-13, REQ-CUN05-17.
- **Depende de:** T-104, T-105, T-108, T-110.
- **Contenido:** incorporar una herramienta de solo lectura para consultar disponibilidad de equipos desde el asistente, reutilizando el servicio existente.
- **Hecho cuando:** El agente consulta disponibilidad mediante una herramienta de solo lectura que respeta autorizacion y privacidad.
- **Pruebas:** `CUN-05 - Herramientas del agente`
- **Estado:** en curso

- **Avance 25/11/2026:** Dos herramientas registradas. 6/6 pruebas especificas y 69/69 del agente aprobadas. Pendiente IA real e integracion.

### T-120 · Disponibilidad solo para quien corresponde, con el responsable visible

- **Satisface:** REQ-CUN05-18, REQ-CUN05-19 · H-ACC-07 (`specs/06-acceso/plan.md` §8)
- **Depende de:** T-104, T-114, T-119 · H-EQ-01 a 03 (`spec.md` §7), decididos el 25 de noviembre de 2026
- **Contenido:** `Perfil` gana `planEfectivo` y `equipos` (cuántos equipos integra); `GET /perfil` los calcula con `PertenenciasService.planEfectivo` y `miembro_de_equipo`. El controlador de equipos rechaza con 403 `SIN_PLAN_EMPRESARIAL` o `SIN_EQUIPO`, y conserva `@SobreLoPropio()`. `GET /equipos` lleva por equipo su responsable y cuántos integrantes tiene. En la web, «Disponibilidad de equipo» entra en los cortes de Agenda solo con plan efectivo Empresarial y algún equipo, y la misma condición decide «Encargadas»; bajo el selector, «Responsable: … · n integrantes» o «Sin responsable · n integrantes»
- **Hecho cuando:** una cuenta Personal y una Empresarial sin equipo no ven el corte y reciben 403; una en un equipo lo ve con su responsable; ninguna prueba de T-099 a T-119 cambia su expectativa (solo su semilla, si hace falta); `pnpm verificar` en verde y `trazabilidad.py --check` en 0; capturas de Agenda con la cuenta personal y con la de empresa
- **Pruebas:** `equipos.disponibilidad-sin-plan`, `equipos.disponibilidad-sin-equipo`, `equipos.disponibilidad-afiliada` (en `skip` mientras INC-37 lo impida), `equipos.responsable-visible`, `equipos.asistente-sin-acceso`, `acceso.perfil-plan-efectivo` · extremo a extremo web `agenda.corte-disponibilidad-por-plan`
- **Estado:** hecha · 25 de noviembre de 2026
- **Notas de implementación:**
  - El cierre vive en `EquiposService.comprobarAcceso`, al empezar `misEquipos` y `verificarMembresia`: así lo aplican la API y el asistente sin tocar las pruebas HTTP de CUN-05, que simulan ese servicio. El plan del contexto ya es el efectivo (H-ADM-06); `GET /perfil` lo calcula de nuevo con `PertenenciasRepositorio.planEfectivo`.
  - Los campos nuevos de `GET /equipos` (`responsable`, `integrantes`) son opcionales en el contrato, para que los ejemplos de las pruebas de contratos de CUN-05 sigan siendo válidos.
  - `membresia-http.spec.ts` (T-104) cambia solo su semilla: la persona «ajena al equipo» integra otro equipo; sin ninguno, el cierre la para antes con `SIN_EQUIPO`. Su expectativa, 403 `SOLICITUD_INVALIDA`, no cambia.
  - En la semilla de las pruebas web, la cuenta del armazón entra en un equipo para seguir viendo «Encargadas», que ahora pide lo mismo que el corte.
  - El consentimiento propio queda fuera del cierre (H-EQ-03): va por `POST /operaciones` y no pasa por `EquiposService`.
- **Origen:** revisión de las capturas de la fusión por Franco, 25 de noviembre de 2026 (`ENCARGO-CLAUDE-CODE-2026-11-25.md`)

## Orden sugerido de entregas

**Entrega A — Fundamentos:** T-099, T-100, T-102, T-104, T-105, T-106 (equipos, miembros, permisos y contratos).
**Entrega B — Disponibilidad:** T-103, T-107, T-108, T-109, T-110, T-111, T-112 (consentimiento y cálculo).
**Entrega C — Interfaz y cierre:** T-114, T-115, T-116, T-117, T-118, T-119.
**Bloqueada por decisión:** T-101 y T-113 (participantes externos, D-8).

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
| T-102, T-103 | Modelos Prisma, migraciones y consentimiento implementados | Parcial: falta cierre de pruebas |
| T-104, T-106 | Consulta de equipos e integrantes con autorización contextual | Parcial: faltan pruebas de acceso cruzado |
| T-107, T-108 | Google Calendar y cálculo de intervalos comunes probados con dos integrantes | Parcial: faltan casos límite |
| T-109, T-110 | Consulta normal 08:00–20:00 y presentación horaria | Parcial: faltan bandas especiales y DST |
| T-111, T-112 | Consulta repetible y actualización individual del consentimiento | Parcial: faltan estados y revocación |
| T-114, T-115, T-116 | Interfaz web funcional con equipo, fecha, duración y resultados | Parcial: falta rejilla completa |
| T-113 | Participantes externos | Bloqueada por D-8 |
| T-117, T-118 | Seguridad, pruebas completas, trazabilidad e integración | Pendiente |

**Evidencia manual:** dos cuentas de Google, dos integrantes y eventos superpuestos. El 11/11/2026 se obtuvieron intervalos comunes de 08:00–09:30 y 15:00–20:00, con dos participantes consultados.

**Criterio de cierre:** las casillas originales permanecen sin marcar hasta contar con pruebas ejecutadas, trazabilidad actualizada y revisión correspondiente.


## Registro de avance real - 24/11/2026

**Rama:** `Vasco-cun05-correcciones`.
**Base:** main, commit `688da81`.
**Estado:** cambios locales, sin nuevo commit ni PR.

| Tareas | Evidencia | Resultado |
|---|---|---|
| T-104, T-117 | Membresia HTTP | 8/8; seis denegaciones por rol y banda |
| T-106, T-114 | Seleccion de participantes | 8 pruebas API aprobadas |
| T-107, T-108, T-111 | Disponibilidad parcial | 14/14 pruebas aprobadas |
| T-109 | Autorizacion y bandas | Tres bandas comprobadas manualmente |
| T-110 | Zonas horarias | Rango 4/4; conversion web 12/12 |
| T-118 | Verificacion parcial | 59/59 pruebas API en 12 archivos |

La comprobacion web de conversion horaria se ejecuto
mediante Node.js y todavia no pertenece a una suite permanente.

No se cierran formalmente tareas: falta integracion,
revision y verificacion integral del repositorio.


## Registro de avance A-4 - 24/11/2026

**Rama:** `Vasco-cun05-correcciones`.
**Estado:** implementacion local, sin nuevo commit ni PR.

| Tareas | Evidencia | Resultado |
|---|---|---|
| T-103, T-112 | Consentimiento mediante Operaciones | 18/18 |
| T-105 | Nuevos contratos de consentimiento | 16/16 |
| T-105 | Contratos especificos de equipos | 57/57 |
| T-105 | Paquete completo de contratos | 73/73 |
| T-107, T-112 | Revocacion efectiva | Verificada en API |
| T-112, T-117 | Auditoria, concurrencia y rollback | Verificados en API |
| T-112, T-114 | Interfaz de consentimiento | Funcionamiento manual general confirmado |
| T-118 | Suite API CUN-05 | 81/81 |

Las tareas permanecen en curso hasta completar
revision, dependencias e integracion.


## Registro de avance - Duracion y estados

**Fecha:** 24/11/2026.

**Rama:** `Vasco-cun05-correcciones`.

| Tarea | Evidencia | Resultado |
|---|---|---|
| T-108 | Duracion opcional | 8/8 |
| T-105, T-108 | Disponibilidad HTTP | 13/13 |
| T-116 | Selector opcional | TypeScript correcto |
| T-118 | Suite API CUN-05 | 93/93 |
| T-105, T-116 | Estados diferenciados | Diseno propuesto |

Pendiente de comprobacion manual especifica, integracion
y revision del equipo. No se cierran tareas formalmente.

## Registro de avance real - 25/11/2026

| Tareas | Evidencia | Resultado |
|---|---|---|
| T-105, T-108 | Contratos especificos de equipos | 89/89 |
| T-108, T-117 | Suite API CUN-05 | 116/116 |
| T-115 | Rejilla visual | Implementada; comprobacion parcial |
| T-111, T-116 | Alternativas y recalculo | Implementados; TypeScript correcto |
| T-119 | Herramientas del agente | 6/6 |
| T-119 | Suite completa del agente | 69/69 |
| T-118 | Navegacion | Tres secciones principales visibles |
| T-118 | Trazabilidad | 151 requisitos, 0 problemas |

Total especifico CUN-05: 211 pruebas aprobadas en
ejecuciones previas, sin duplicar las pruebas del agente.

Las tareas permanecen en curso hasta completar
la verificacion final y la integracion.
