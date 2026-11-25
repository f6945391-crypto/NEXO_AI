# Plan técnico propuesto — CUN-05 Equipos y consulta de disponibilidad

**Estado:** implementación parcial integrada en main mediante PR #1. Correcciones en desarrollo en Vasco-cun05-correcciones. Pendiente de validación completa y coordinación con el equipo.
**Fuente normativa:** `specs/05-equipos/spec.md` (REQ-CUN05-01 a REQ-CUN05-17; RN-CAL-01 aprobada el 26/09/2026).
**Dependencias:** `SPEC.md`, `specs/06-acceso/plan.md`, `specs/02-agenda/plan.md`, `specs/03-tareas/spec.md`, `design/ARQUITECTURA-VISUAL-WEB.md`, `AGENTS.md`.

## 1. Objetivo y alcance

Implementar la consulta de disponibilidad de un equipo para sus miembros autorizados, con selección de participantes, cálculo de intervalos comunes, representación de resultados parciales y protección de la privacidad. La plataforma de CUN-05 es **web**. CUN-06 reutilizará el cálculo de CUN-05 para coordinar reuniones, sin duplicarlo.

**Incluye:** resolución de integrantes por equipo; permisos de lectura por pertenencia; consentimiento individual; obtención de intervalos libre/ocupado; cálculo determinista; manejo de datos ausentes; consulta repetible; rejilla web y pruebas.

**No incluye en este alcance:** implementar la delegación CUN-07, crear el modelo compartido de tareas de Aixa, facturación de colaboradores ni afirmar que CUN-06 está implementado. La invitación de externos (REQ-CUN05-12) queda bloqueada en su diseño definitivo por D-8; se documentará el estado y la dependencia, no se simulará como terminada.

## 2. Reglas de producto obligatorias

- **RN-CAL-01:** duración opcional; si se proporciona, un intervalo común debe admitirla; si no, se muestran intervalos comunes de cualquier longitud con duración visible (REQ-03, 04).
- Banda normal **08:00–20:00**; **20:00–22:00** solo ante solicitud explícita; fuera de **08:00–22:00** solo con solicitud explícita y advertencia (REQ-05).
- Ordenar por inicio más temprano y, a igual inicio, mayor duración (REQ-06). Por defecto comenzar **el día siguiente**, salvo solicitud explícita del mismo día.
- Presentar los horarios en la zona IANA de quien consulta e identificarla (REQ-07).
- Sin datos **no significa libre**. Si falta autorización o información de una persona, identificarla y marcar resultado parcial (REQ-08, 15, 16).
- No revelar títulos, lugares, asistentes ni otros detalles de eventos de terceros en API, interfaz, auditoría o registros (REQ-13).
- Solo la persona puede conceder o revocar su consentimiento (REQ-14).
- Cualquier miembro del equipo puede consultar su disponibilidad compartida; la administración/delegación requiere autoridad específica por equipo (REQ-11, 17 y REQ-ACC-16).

## 3. Arquitectura prevista (propuesta, sujeta a inspección del código)

| Componente | Responsabilidad | Condición |
|---|---|---|
| `apps/api/src/equipos/` — `EquiposModule` | Resolver miembros, verificar acceso, coordinar consultas | Crear solo tras revisar convenciones de módulos existentes |
| Servicio de disponibilidad | Combinar intervalos ocupados y calcular intersección libre | Reutilizable desde CUN-06 |
| Adaptador de calendario existente | Obtener solo datos mínimos de ocupación, con consentimiento | Verificar capacidades reales de `ClienteGoogle` antes de decidir si requiere ampliación |
| `packages/contratos/` | Esquemas Zod de solicitudes y respuestas | Seguir nombres y patrones ya presentes |
| `apps/web/` | Selector y rejilla de disponibilidad | Respetar arquitectura visual de tres columnas y estados diferenciados |
| `apps/api/test/equipos/` | Pruebas de permisos, cálculo y privacidad | Integrar con Vitest y convenciones existentes |

**Integración:** registrar `EquiposModule` en `AppModule` cuando exista y esté probado. No reemplazar las guardas globales de identidad; extenderlas con autorización contextual al equipo, conservando la denegación por defecto. No modificar módulos de Aixa sin coordinación.

## 4. Modelo de datos (diseño propuesto, no aprobado)

**`Equipo`**: `id`, `organizacionId`, `nombre`, marcas de creación/actualización si son consistentes con el esquema existente. La relación con la organización debe participar del aislamiento multiempresa.

**`MiembroDeEquipo`**: `id`, `equipoId`, `perfilId`, `rolEnEquipo` (responsable/miembro), y restricciones de unicidad por pareja equipo–perfil. La pertenencia y autoridad se verifican por equipo, no solo por `PerfilUsuario.rol` global.

**Consentimiento de disponibilidad**: modelar por **persona y equipo**, con estados necesarios para distinguir pendiente, concedido, rechazado y revocado; guardar trazabilidad de cambios sin datos de eventos. La forma exacta (tabla propia o extensión de modelo existente) se decidirá tras revisar el esquema Prisma y la gestión de consentimientos ya implementada. No confundir permiso OAuth de Google con autorización para compartir libre/ocupado con un equipo: son condiciones distintas.

**Participante externo**: pendiente de D-8. No crear tabla ni flujo de invitación definitivo sin resolución. Registrar `REQ-CUN05-12` como bloqueado, no implementado.

**Migración:** usar el procedimiento de Prisma del repositorio; no aplicar migraciones destructivas ni a bases compartidas sin respaldo y coordinación.

## 5. Contratos y operaciones (borrador de interfaz; rutas no aprobadas)

| Operación conceptual | Entrada | Salida mínima | Requisitos |
|---|---|---|---|
| Consultar equipos accesibles | contexto autenticado | identificadores y nombres autorizados | 01, 11, 17 |
| Listar participantes de equipo | `equipoId` | perfiles y estado de consentimiento, sin detalles de agenda | 01, 11, 15 |
| Consultar disponibilidad | `equipoId`, participantes, rango, duración opcional, solicitud explícita de banda/día | zona, intervalos libres/ocupados mínimos, alternativas ordenadas, participantes sin datos, indicador de parcialidad y motivo de ausencia de alternativas | 02–10, 11, 13, 17 |
| Conceder/revocar compartir disponibilidad | identidad del propio participante y equipo | estado actualizado | 14, 16 |
| Invitar externo | correo y equipo | estado pendiente | 12, 15; **bloqueado por D-8** |

**Las rutas HTTP, DTO y nombres exactos quedan pendientes de inspeccionar `apps/api/src/operaciones/registro.ts`, `operaciones.controller.ts`, `identidad/guardas.ts` y los contratos existentes.** Si el proyecto exige canalizar acciones mutables por `POST /operaciones`, se seguirá ese patrón; no crear endpoints paralelos por comodidad.

## 6. Algoritmo de disponibilidad

1. Autenticar solicitante, validar pertenencia/permiso sobre el equipo y verificar que cada participante pertenezca al equipo (REQ-01, 11, 17).
2. Validar rango, zona horaria IANA y duración opcional. Convertir instantes a una escala común para calcular; convertir al huso del consultante solo al presentar (REQ-07).
3. Comprobar **ambos** permisos: acceso vigente al calendario y consentimiento individual de compartir con el equipo. Para cada persona sin datos, devolver estado explícito, sin asumir que está libre (REQ-08, 14–16).
4. Consultar ocupación mínima en el rango para cada participante autorizado; normalizar intervalos y unir solapamientos por persona (REQ-02, 13).
5. Calcular intervalos libres dentro del rango/banda aplicable y su intersección entre participantes con datos. Si hay participantes sin datos, marcar el resultado como **parcial**, nunca como disponibilidad confirmada de todo el equipo (REQ-08).
6. Aplicar reglas RN-CAL-01 de duración, bandas, inicio desde mañana por defecto, orden y desempate (REQ-03–06).
7. Devolver estados diferenciados: **sin calcular**, **sin intervalo común**, **hay intervalos comunes pero ninguno admite duración**, y **resultado parcial** (REQ-08, 09).
8. Ante cambio de participantes, rango o duración, ejecutar nuevamente el cálculo con los nuevos parámetros (REQ-10).

**Casos límite para pruebas:** intervalo que cruza medianoche; cambios de horario de verano; zonas distintas; eventos contiguos; intervalos de duración exacta; inicio igual con diferente longitud; sin duración; todos ocupados; sin consentimiento; revocación; solicitudes a equipo ajeno.

## 7. Autorización y privacidad

- Denegar acceso a equipos ajenos aunque el solicitante tenga rol global `gerente` (REQ-11).
- Permitir lectura libre/ocupado a cualquier miembro autorizado del mismo equipo (REQ-17).
- Reservar acciones de administración/delegación a quien sea responsable **del equipo afectado**; coordinar el cambio de `@SoloResponsable()` previsto en REQ-ACC-16. No convertir por accidente todas las rutas con `@SobreLoPropio()` en rutas de lectura de equipos.
- No exponer detalles de eventos en respuestas, excepciones, logs o auditoría (REQ-13).
- Revocación efectiva antes de nuevas consultas y sin intervención del gerente (REQ-14).
- Respetar aislamiento por `organizacionId` y probar consultas cruzadas.

## 8. Interfaz web

La rejilla pertenece al lienzo de tres columnas, con referencias de **840 px normal** y **1368 px expandido** según la especificación. Representar ocupación por fila, alternativa común por banda vertical, franjas fuera de banda atenuadas, participantes sin datos tramados y zona horaria en encabezado. Mostrar duración en consultas sin duración solicitada. Distinguir visualmente ausencia de cálculo, ausencia de horarios y horarios insuficientes para la duración pedida.

**Bloqueo visual declarado:** los diseños existentes no contemplan todavía todos los estados introducidos por la revisión de RN-CAL-01. La implementación deberá incluir esos estados y pedir validación visual antes de declararse terminada.

## 9. Matriz de trazabilidad y pruebas propuestas

| Requisitos | Verificación mínima |
|---|---|
| 01, 11, 17 | Miembros correctos; miembro puede consultar; ajeno y gerente sin autoridad no pueden |
| 02, 13 | Consulta de todos los autorizados; solo libre/ocupado; ausencia de detalles en respuesta y logs |
| 03, 04 | Duración solicitada filtra; sin duración muestra todos los intervalos comunes |
| 05, 06 | Banda explícita, orden por inicio y desempate por holgura |
| 07 | Conversión entre zonas y encabezado correcto |
| 08, 09 | Sin datos es parcial; sin alternativas informa y ofrece ajustes |
| 10 | Cambiar parámetros recalcula sin resultados obsoletos |
| 12 | Invitación externa, **pendiente de D-8** |
| 14, 15, 16 | Consentimiento propio, revocación inmediata, estados visibles, Google propio |

Cada tarea terminada actualizará `specs/trazabilidad.md` con referencia al código y a una prueba **ejecutada**. La existencia de un archivo de test no equivale a prueba aprobada.

## 10. Riesgos, dependencias y decisiones abiertas

1. **D-8:** identidad y consentimiento de participantes externos sin cuenta; bloquea REQ-12 y parte del flujo externo.
2. **REQ-ACC-16:** migración de autorización global a autoridad por equipo; requiere pruebas de regresión de rutas existentes.
3. **Integración Google:** confirmar si el adaptador actual obtiene libre/ocupado sin detalles y cómo trata revocaciones.
4. **Diseño:** actualizar estados faltantes de la rejilla.
5. **CUN-06 y CUN-07:** consumir contratos compartidos, sin implementar aquí la reunión ni la delegación.
6. **Aprobación:** nombres de modelos, contratos, endpoints y alcance de administración de equipos son propuestas técnicas, no decisiones ya ratificadas.

## 11. Criterio de finalización del módulo

Una historia solo pasa a `Done` cuando: (a) cumple el requisito y criterio de aceptación; (b) tiene pruebas relevantes ejecutadas y registradas; (c) no vulnera aislamiento, consentimiento ni privacidad; (d) está integrada con los módulos existentes; (e) la trazabilidad está actualizada; y (f) el equipo revisó cualquier decisión nueva. Lo bloqueado por D-8 permanece explícitamente pendiente.

## 12. Avance de implementación — 11/11/2026

**Rama:** `Vasco`
**Commit funcional:** `8e1914c`
**Estado:** primera versión funcional; CUN-05 no está completamente terminado.

### Funcionalidades implementadas

- Modelos Prisma para equipos, integrantes y consentimiento.
- Migraciones de base de datos para equipos y consentimiento.
- Consulta de equipos e integrantes con autorización contextual.
- Endpoint para actualizar el consentimiento individual.
- Integración con Google Calendar mediante OAuth existente.
- Sincronización de eventos y cálculo de intervalos disponibles en común.
- Interfaz web con selección de equipo, fecha y duración.
- Visualización de integrantes, estados de consentimiento e intervalos disponibles.

### Evidencia de pruebas manuales

Se probaron dos cuentas de Google vinculadas a dos integrantes del mismo equipo.

Para el 11/11/2026, entre 08:00 y 20:00 (America/Lima), con duración mínima de 30 minutos, la aplicación identificó:

- 08:00–09:30 (90 minutos).
- 15:00–20:00 (300 minutos).

La respuesta indicó dos participantes consultados y disponibilidad completa para ese escenario.

También se comprobó una consulta del 12/11/2026 con un intervalo disponible de 08:00–20:00.

Estas pruebas verifican el flujo principal, pero no equivalen a cobertura completa de requisitos.

### Trabajo pendiente

- Completar reglas de bandas horarias y solicitudes explícitas.
- Validar zonas IANA, horario de verano y cruces de fecha.
- Completar selección individual de participantes y estados parciales.
- Mejorar la rejilla visual y las sugerencias sin disponibilidad.
- Probar revocación, ausencia de Google Calendar, aislamiento y privacidad.
- Incorporar pruebas automatizadas y actualizar trazabilidad.
- Resolver D-8 antes de implementar participantes externos.
- Revisar decisiones técnicas con el equipo antes de integrar a main.
## 13. Integración y plan de correcciones

### 13.1. Estado al 24/11/2026

- Rama original: `Vasco`.
- Último commit de la rama original: `7b90951`.
- Integración en main: PR #1, commit `688da81`.
- Rama de correcciones: `Vasco-cun05-correcciones`.
- Selección individual de participantes implementada localmente.
- La selección todavía no forma parte del código publicado en main.
- Numeración provisional de tareas: T-099 a T-119.

### 13.2. Evidencia de verificación

Resultados registrados antes de las nuevas correcciones:

- 37 pruebas automatizadas del CUN-05 aprobadas en 11 archivos.
- Compilación del backend satisfactoria.
- Compilación local del frontend satisfactoria.
- Verificación de trazabilidad: 151 requisitos, 0 problemas.

Estos resultados corresponden a verificaciones anteriores.
No acreditan el cierre completo de los requisitos ni sustituyen
las pruebas que deberán ejecutarse después de cada corrección.

La selección de participantes todavía requiere validación manual
en el navegador.

### 13.3. Observaciones bloqueantes

| Referencia | Observación | Acción prevista |
|---|---|---|
| B-1 | Duplicidad del modelo de equipos | Acordar un modelo compartido y una estrategia de migración con Franco |
| B-2 | Sección independiente de Equipo | Integrar disponibilidad dentro de Agenda, respetando R-32 |
| B-3 | Documentación SDD desactualizada | Actualizar tareas, plan, SPEC y trazabilidad |

No modificar migraciones existentes ni aplicar cambios destructivos
sin acordar previamente la estrategia de integración.

### 13.4. Correcciones de prioridad alta

| Referencia | Corrección | Tareas |
|---|---|---|
| A-1 | Calcular disponibilidad parcial | T-108, T-111 |
| A-2 | Contratos Zod y errores estandarizados | T-105 |
| A-3 | Permitir banda extendida a miembros autorizados | T-104, T-109 |
| A-4 | Consentimiento individual y auditoría | T-103, T-112 |
| A-5 | Zona horaria explícita en la respuesta | T-110 |
| A-6 | Regularizar selección de participantes | T-106, T-114, T-118 |

### 13.5. Disponibilidad parcial

La consulta debe calcular la intersección de disponibilidad
entre los participantes seleccionados que tengan datos válidos.

Cuando falten datos de uno o más participantes:

- Identificar a los participantes afectados y el motivo.
- Marcar la respuesta como incompleta o parcial.
- No considerar libres a quienes carezcan de información.
- No presentar los intervalos parciales como disponibilidad
  confirmada de todo el equipo.
- Excluir los datos de participantes que revoquen su consentimiento
  durante la consulta.
- Si ningún participante tiene datos válidos, no devolver
  intervalos disponibles.

Esta corrección desarrolla REQ-CUN05-08 y conserva las garantías
de privacidad y consentimiento de REQ-CUN05-13 y REQ-CUN05-14.

### 13.6. Integración con Agenda y el agente

- Respetar las tres secciones principales establecidas en R-32.
- Incorporar la consulta de disponibilidad en Agenda.
- Reutilizar el servicio de disponibilidad existente.
- Incorporar una herramienta de consulta de solo lectura
  para el asistente, respetando R-42.
- No crear un flujo manual paralelo que sustituya al agente.
- Mostrar zona horaria, duración, participantes sin datos
  y alternativas de disponibilidad.

### 13.7. Orden de ejecución

1. Actualización documental SDD.
2. Corrección de disponibilidad parcial.
3. Zona horaria y autorización de bandas.
4. Contratos compartidos y errores.
5. Consentimiento y auditoría.
6. Unificación del modelo de equipos.
7. Integración visual en Agenda.
8. Integración con el agente.
9. Pruebas completas y trazabilidad.
10. Revisión y nuevo Pull Request.

Las correcciones independientes pueden avanzar mientras se
coordina el modelo de datos compartido.

### 13.8. Decisiones pendientes

- Confirmar la numeración definitiva de tareas con Franco y Aixa.
- Aprobar el modelo compartido de equipos y miembros.
- Acordar una estrategia de migración compatible con bases
  existentes y bases nuevas.
- Sincronizar los cambios con la versión compartida de SPEC.md.
- Resolver D-8 antes de implementar participantes externos.
- Validar el diseño de la rejilla y su integración en Agenda.

Ninguna de estas decisiones se considera aprobada por el equipo
por el solo hecho de aparecer en este plan.


### 13.9. Resultados de las correcciones locales - 24/11/2026

**A-1:** disponibilidad parcial implementada.
Se calculan intervalos solo con participantes que disponen
de datos y consentimiento vigente. Se informa de los motivos
de ausencia de datos y se excluyen consentimientos revocados.

**A-3:** autorizacion de bandas por membresia.
Tapia confirma el alcance de REQ-CUN05-17. Las bandas
especiales requieren solicitud explicita.
Los usuarios ajenos reciben HTTP 403 en las tres bandas,
independientemente de su rol global.

**A-5:** zona horaria explicita.
La respuesta incluye `zonaHoraria`. La interfaz presenta
los intervalos en dicha zona. Se corrige la conversion
de horas locales a UTC durante transiciones horarias.

**A-6:** seleccion individual disponible localmente.
Pendiente de integracion mediante nuevo PR.

#### Evidencia ejecutada

- API: 59 pruebas aprobadas en 12 archivos.
- Membresia HTTP: 8/8.
- Disponibilidad parcial: 14/14.
- Rango predeterminado: 4/4.
- Conversion horaria web: 12/12 comprobaciones independientes.
- TypeScript y compilaciones de API y web satisfactorias.
- Prueba manual parcial: un participante con calendario
  disponible de dos seleccionados, zona America/Lima.
- Banda habitual: 08:00-09:30 y 13:30-20:00.
- Banda ampliada: 08:00-09:30 y 13:30-22:00.
- Dia completo: 00:00-09:30 y 13:30-00:00 del dia siguiente.

#### Pendientes tecnicos y de integracion

- Incorporar las comprobaciones horarias web a una suite
  permanente.
- Gestionar errores de conversion dentro del formulario.
- Definir tratamiento de horas locales ambiguas.
- Repetir la prueba manual con ambos calendarios conectados.
- Contratos Zod y errores estandarizados: avance local registrado en la seccion 13.11.
- Completar consentimiento individual y auditoria.
- Completar rejilla, alternativas y estados visuales.
- Resolver INC-33 e INC-34 con el equipo.
- Resolver D-8.
- Ejecutar la verificacion integral y preparar el PR.

El plan tecnico y el modelo compartido siguen pendientes
de aprobacion. No se modifican migraciones en esta etapa.


### 13.10. Contratos compartidos CUN-05 - T-105

Propuesta tecnica de implementacion local conforme a AD-08.

- Centralizar los esquemas en `packages/contratos/src/equipos.ts`.
- Utilizar objetos estrictos Zod y tipos inferidos.
- Reutilizar el esquema `ZonaHoraria` de acceso.
- Conservar las rutas HTTP y campos existentes.
- Validar fechas ISO 8601, rango, duracion opcional,
  banda horaria y seleccion sin duplicados.
- Transformar los parametros HTTP de duracion y participantes
  a sus tipos de dominio.
- Validar las respuestas antes de consumirlas en el cliente.
- Mantener las comprobaciones de membresia y consentimiento
  en los servicios.
- Reutilizar ValidarCon, ErrorApi y CodigoError.

Los contratos de alternativas y la Operacion de consentimiento
se completaran en sus etapas correspondientes.
El modelo compartido sigue pendiente de coordinacion.

### 13.11. Resultados de A-2 - 24/11/2026

La implementacion local de los contratos existentes de CUN-05
se encuentra operativa.

#### Implementacion

- Esquemas compartidos en `packages/contratos/src/equipos.ts`.
- Exportacion desde el indice de `@nexoai/contratos`.
- Validacion de consultas y cuerpos HTTP mediante `ValidarCon`.
- Validacion de identificadores UUID con errores estandarizados.
- Reutilizacion de `ErrorApi` y `CodigoError`.
- Validacion de respuestas mediante Zod en el cliente web.
- Conservacion de las comprobaciones de membresia,
  consentimiento y aislamiento organizacional.
- Sin nuevas dependencias ni cambios de migraciones.

#### Evidencias

- Contratos de equipos: 41/41 pruebas aprobadas.
- Paquete de contratos: 57/57 pruebas aprobadas.
- API CUN-05: 63/63 pruebas aprobadas en 12 archivos.
- HTTP de disponibilidad: 9/9 pruebas aprobadas.
- TypeScript de contratos y frontend satisfactorio.
- Compilaciones de contratos, API y web satisfactorias.
- Funcionamiento manual de la interfaz confirmado por Vasco.

Las pruebas de contratos comprueban estructura y validacion
de datos. No sustituyen las pruebas de autorizacion,
privacidad efectiva ni logica de negocio.

#### Pendientes

- Contratos de alternativas de disponibilidad.
- Operacion y auditoria del consentimiento implementadas
  posteriormente en la seccion 13.12.
- Reforzar las invariantes entre campos de las respuestas.
- Aprobacion del plan y coordinacion del modelo compartido.
- Verificacion integral del repositorio y nuevo PR.

A-2 queda atendida localmente para los endpoints existentes.
T-105 permanece en curso por su alcance restante.

### 13.12. Consentimiento individual mediante Operaciones

Propuesta tecnica local para T-103 y T-112.
Satisface REQ-CUN05-14, REQ-CUN05-15 y REQ-CUN05-16.

- Tipo de Operacion: `equipo.cambiar_consentimiento`.
- Origen inicial: `control_directo`.
- Carga: identificador del equipo y nuevo estado.
- Estados solicitables: concedida, rechazada y revocada.
- La identidad se obtiene exclusivamente del contexto autenticado.
- La carga no admite identificadores de otros participantes.
- Se verifica la membresia al proponer y al ejecutar.
- La tarjeta muestra el equipo, el estado actual y el nuevo estado.
- Proponer o descartar no modifica el consentimiento.
- La ejecucion registra el estado anterior y posterior en auditoria.
- El consentimiento y la auditoria se actualizan atomicamente.
- Se rechazan propuestas obsoletas si cambio el consentimiento
  o la membresia desde que fueron creadas.
- Confirmar nuevamente una Operacion ejecutada no repite su efecto.
- Una revocacion ejecutada impide nuevas consultas autorizadas
  sobre la disponibilidad de esa persona.
- El consentimiento del equipo es independiente del permiso OAuth.
- El endpoint PATCH de escritura directa fue eliminado.
  Los cambios se realizan mediante POST /operaciones,
  confirmacion y descarte de Operaciones.
- No se modifica el modelo Prisma hasta resolver INC-33.

Estado: implementado localmente y probado.
Pendiente de revision e integracion con el equipo.

#### Control de concurrencia

La propuesta conserva una referencia interna a la membresia,
su estado anterior y la fecha del ultimo cambio.

La ejecucion utiliza una actualizacion condicional dentro
de una transaccion del cliente aislado por organizacion.
Si la membresia o su version ya no coincide, la Operacion
falla y debe solicitarse nuevamente.

La auditoria se registra en la misma transaccion.
La carga publica sigue siendo estricta y no admite
identificadores de otros participantes ni datos internos.

Verificado mediante pruebas de integracion, concurrencia,
aislamiento organizacional y rollback de auditoria.


#### Interfaz web

- Gestion del consentimiento propio desde el equipo seleccionado.
- Identidad obtenida del perfil autenticado.
- Propuesta, confirmacion y descarte mediante Operaciones.
- Presentacion del estado actual y del nuevo consentimiento.
- Bloqueo de consultas durante una propuesta pendiente.
- Actualizacion de integrantes e invalidacion de resultados
  anteriores al ejecutar un cambio.
- Validacion de respuestas mediante contratos Zod compartidos.

#### Evidencias de implementacion

- 18/18 pruebas de consentimiento mediante Operaciones.
- 81/81 pruebas API CUN-05 en 13 archivos.
- 16 nuevas pruebas de contratos de consentimiento.
- 57/57 pruebas especificas de contratos de equipos.
- 73/73 pruebas del paquete completo de contratos.
- Compilacion de API y contratos satisfactoria.
- TypeScript del frontend sin errores.
- Funcionamiento manual general confirmado por Vasco.

#### Pendientes de cierre formal

- Verificacion de escenarios excepcionales de navegacion
  y errores de conexion en el frontend.
- Compilacion de produccion y verificacion integral.
- Unificacion del modelo de equipos (INC-33).
- Integracion de la interfaz en Agenda (INC-34).
- Revision del equipo y nuevo Pull Request.

A-4 queda implementada localmente.
T-103 y T-112 permanecen en curso hasta completar
sus dependencias y el proceso de integracion.


### 13.13 Duracion opcional y estados de disponibilidad

**Fecha:** 24/11/2026.

**Rama:** `Vasco-cun05-correcciones`.

**Requisitos relacionados:** REQ-CUN05-03, REQ-CUN05-04,
REQ-CUN05-06, REQ-CUN05-08, REQ-CUN05-09 y REQ-CUN05-10.

**Tareas relacionadas:** T-105, T-108, T-111, T-115 y T-116.

#### Duracion opcional: implementada localmente

- La duracion minima deja de ser obligatoria en la interfaz.
- La opcion inicial no aplica un filtro de duracion.
- Si se indica una duracion, solo se muestran intervalos
  iguales o superiores al minimo solicitado.
- Se conservan los limites completos de los intervalos.
- Los cambios de duracion invalidan el resultado anterior.

Evidencias:

- 8/8 pruebas unitarias de duracion opcional.
- 13/13 pruebas de disponibilidad HTTP, incluidas cuatro
  nuevas pruebas de transmision de duracion.
- 93/93 pruebas API CUN-05 en 14 archivos.
- TypeScript del frontend sin errores.
- 57/57 pruebas especificas de contratos verificadas
  anteriormente.

Pendiente: comprobacion manual especifica del selector,
desempate por holgura y verificacion integral.

#### Estados de disponibilidad: implementados localmente

El contrato compartido de respuesta incorpora:

- estadoDisponibilidad: disponible,
  sin_intervalos_comunes, duracion_insuficiente o sin_datos.
- intervalosComunes: intervalos libres comunes posteriores
  al filtro de banda horaria y anteriores al de duracion.

El campo intervalos conserva las alternativas que
cumplen todas las condiciones solicitadas.

Reglas de clasificacion, en orden:

1. Sin calendarios validos consultados: sin_datos.
2. Con datos pero sin intervalos dentro de la banda:
   sin_intervalos_comunes.
3. Con intervalos en la banda pero ninguno que cumpla
   la duracion solicitada: duracion_insuficiente.
4. Con al menos un intervalo valido: disponible.

La disponibilidad completa o parcial es independiente
del estado calculado.

Sin datos validos, ambas listas de intervalos son vacias.

Los resultados parciales solo utilizan calendarios
autorizados y con consentimiento vigente.

#### Interfaz implementada

- Diferenciar consulta no realizada, disponibilidad,
  ausencia de horarios comunes, duracion insuficiente
  y ausencia de informacion suficiente.
- Mostrar mensajes comprensibles sin exponer los
  identificadores internos de los estados.
- Indicar el mayor intervalo comun cuando la duracion
  solicitada no pueda satisfacerse.
- Mantener visibles las advertencias de resultados parciales.
- No presentar resultados parciales como disponibilidad
  confirmada de todos los participantes.

#### Criterios de verificacion

- Validar los cuatro estados mediante contratos Zod.
- Comprobar coherencia entre estado, calendarios consultados
  e intervalos devueltos.
- Verificar el servicio con disponibilidad completa y parcial.
- Verificar ausencia de datos y revocacion de consentimiento.
- Adaptar las respuestas simuladas de las pruebas HTTP.
- Verificar que no se exponen metadatos privados.
- Validar la interfaz mediante TypeScript y pruebas manuales.

No se modifican modelos Prisma ni migraciones.
No se cierran INC-33 ni INC-34.
El diseno permanece pendiente de revision del equipo.


#### Resultados de implementacion local

- Cuatro estados diferenciados implementados en API y web.
- Intervalos comunes anteriores al filtro de duracion.
- Validacion de coherencia mediante contratos Zod.
- Disponibilidad parcial independiente del estado calculado.
- Mensajes comprensibles y duracion maxima disponible.
- Invalidacion de resultados anteriores al cambiar condiciones.
- 101/101 pruebas API CUN-05 aprobadas.
- 71/71 pruebas especificas de contratos de equipos aprobadas.
- TypeScript del frontend sin errores.
- Funcionamiento manual general confirmado por Vasco.

#### Pendientes de cierre

- Verificacion individual documentada de escenarios manuales.
- Cuadricula de disponibilidad individual.
- Alternativas interactivas y recalculo.
- Pruebas de extremo a extremo.
- Verificacion integral del repositorio.
- Revision del equipo e integracion mediante Pull Request.

T-105, T-108, T-111 y T-116 permanecen en curso.
No se modifican requisitos funcionales ni migraciones.
INC-33 e INC-34 permanecen abiertas.


### 13.14 Disponibilidad individual para la rejilla

**Fecha:** 24/11/2026.

**Estado:** contratos y servicio implementados y verificados
localmente. Pendientes componente visual, revision e integracion.

**Requisitos relacionados:** REQ-CUN05-03, REQ-CUN05-04,
REQ-CUN05-05, REQ-CUN05-07, REQ-CUN05-08,
REQ-CUN05-14 y REQ-CUN05-16.

#### Contrato propuesto

Ampliar DisponibilidadEquipoRespuesta con el campo obligatorio
disponibilidadIndividual.

Cada participante seleccionado tendra exactamente un registro:

- perfilId: identificador del participante.
- estado: consultado o sin_datos.
- intervalosOcupados: intervalos ocupados normalizados.
- intervalosLibres: intervalos libres dentro del rango.
- motivo: obligatorio exclusivamente para sin_datos.

Los estados se representaran mediante una union discriminada
en los contratos compartidos Zod.

#### Reglas de coherencia

- No se permiten participantes duplicados.
- Los participantes consultados coinciden con el contador
  participantesConsultados.
- Los participantes sin datos coinciden con los identificadores
  y motivos declarados en la respuesta.
- Un participante sin datos no contiene intervalos.
- Los intervalos se limitan al rango consultado.
- Los intervalos libres y ocupados no se superponen.
- Los intervalos de un calendario consultado cubren el rango.
- No se incluyen campos privados de eventos.

#### Implementacion del servicio

Reutilizar ocupadosPorParticipante despues de comprobar
la vigencia de membresias y consentimientos.

Recortar los intervalos ocupados al rango solicitado y
normalizarlos mediante unirOcupados.

Reutilizar calcularLibres para determinar los intervalos
individuales sin aplicar el filtro de duracion minima.

Un calendario consultado sin eventos tiene todo el rango libre.
Un calendario no consultable no tiene intervalos libres ni ocupados.

La disponibilidad individual no requiere nuevas consultas
a Google Calendar, tablas ni migraciones.

La duracion minima y la banda horaria afectan las alternativas
comunes, no el estado real libre u ocupado de cada participante.

#### Integracion visual posterior

- Una fila por participante seleccionado.
- Intervalos libres y ocupados diferenciados.
- Filas sin informacion con tramado y etiqueta.
- Bandas comunes resaltadas verticalmente.
- Horarios fuera de banda atenuados.
- Zona horaria del solicitante.
- Duracion de las alternativas visible.
- Coincidencias parciales identificadas como tales.
- Componente reutilizable desde CUN-06.
- Anchos de referencia de 840 y 1368 px.

Se evaluara ampliar el rango consultado por la interfaz para
representar las franjas fuera de banda, manteniendo la banda
como filtro independiente de las alternativas.

#### Pruebas previstas

- CUN-05 - Contratos compartidos de equipos.
- CUN-05 - Disponibilidad individual.

Verificar normalizacion, limites temporales, cobertura,
participantes seleccionados, consentimiento, revocacion,
ausencia de datos y exclusion de informacion privada.

#### Alcance

T-105, T-108 y T-115.

No modifica los requisitos funcionales aprobados.
No resuelve INC-33 ni INC-34.
No introduce cambios en el modelo persistente.

#### Resultados de implementacion (24/11/2026)

- Contrato DisponibilidadIndividualEquipo implementado.
- Respuesta individual por participante seleccionado.
- Intervalos ocupados recortados y normalizados.
- Intervalos libres calculados dentro del rango consultado.
- Participantes sin datos con motivo y sin intervalos.
- Revalidacion de membresia y consentimiento antes de responder.
- Sin exposicion de titulos, descripciones ni ubicaciones.
- Sin nuevas consultas a Google Calendar ni migraciones.

#### Evidencias de verificacion

- CUN-05 - Disponibilidad individual: 15/15.
- CUN-05 - Contratos compartidos de equipos: 89/89.
- Pruebas HTTP relacionadas: 35/35.
- API CUN-05: 116/116 en 15 archivos.
- Paquete completo de contratos: 105/105.
- Total especifico CUN-05: 205 pruebas aprobadas.
- Reejecucion de pruebas corregidas: 33/33.
- Compilacion de contratos y backend: correcta.
- TypeScript backend y frontend: sin errores.
- Trazabilidad: 151 requisitos, 0 problemas.

Las pruebas HTTP y las pruebas reejecutadas forman parte
del total de API; no se contabilizan dos veces.

#### Pendientes

- Implementar la rejilla visual reutilizable desde CUN-06.
- Verificar accesibilidad, bandas y presentacion horaria.
- Incorporar alternativas y recalculo.
- Ejecutar la verificacion integral del repositorio.
- Resolver INC-33 e INC-34 con el equipo.
- Revisar e integrar mediante Pull Request.

### 13.15 Rejilla visual de disponibilidad

**Fecha:** 2026-11-25

**Estado:** implementado localmente; verificacion visual parcial y revision pendientes.

**Requisitos relacionados:** REQ-CUN05-03, REQ-CUN05-04,
REQ-CUN05-05, REQ-CUN05-07, REQ-CUN05-08, REQ-CUN05-13.

**Tarea:** T-115.

#### Arquitectura

- Componente reutilizable rejilla-disponibilidad.tsx.
- Funciones temporales independientes en rejilla-tiempo.ts.
- Integracion en disponibilidad-equipo.tsx.
- Estilos en globales.css mediante tokens existentes.
- Sin dependencias graficas adicionales.
- Sin modificaciones al backend ni migraciones.

#### Representacion

- Una fila por participante seleccionado.
- Fondo libre mediante superficie-base.
- Bloques ocupados mediante borde-fuerte.
- Participantes sin informacion mediante tramado y texto.
- Bandas comunes validas mediante estado-exito y estado-exito-suave.
- Resaltar exclusivamente los intervalos que cumplen la duracion solicitada.
- Advertencia visible cuando la disponibilidad es parcial.
- Mostrar la zona horaria devuelta por el backend.
- Distinguir periodos fuera de banda de periodos libres.
- No ampliar silenciosamente el rango consultado.
- Los periodos no consultados no se presentan como libres.
- No mostrar titulos ni metadatos privados de eventos.

#### Disposicion y accesibilidad

- Adaptacion al lienzo normal de 840 px y expandido de 1368 px.
- Ancho flexible y desplazamiento horizontal cuando sea necesario.
- Posiciones calculadas mediante instantes absolutos.
- Etiquetas temporales en la zona horaria de la respuesta.
- Alternativa textual accesible para los intervalos.
- No depender exclusivamente del color.

#### Verificacion prevista

- Pruebas de posiciones y recorte temporal.
- Pruebas de cambios de dia y horario de verano.
- Pruebas de disponibilidad completa, parcial y sin datos.
- Pruebas de duracion minima y bandas comunes.
- Pruebas de privacidad de la representacion.
- Verificacion manual en ambos modos del lienzo.
- TypeScript, compilacion y trazabilidad.

#### Limites

La integracion definitiva en Agenda permanece pendiente
de coordinacion con el equipo (INC-34).
La unificacion del modelo de equipos permanece pendiente
(INC-33).

### 13.16 Cierre funcional de interfaz y agente

**Fecha:** 25/11/2026.
**Rama:** Vasco-cun05-correcciones.
**Estado:** implementacion local, pendiente de integracion.

#### Rejilla de disponibilidad

- Componente reutilizable con eje temporal independiente.
- Filas individuales con intervalos libres y ocupados.
- Tramado para participantes sin informacion.
- Bandas comunes, duracion y zona horaria visibles.
- Advertencia de disponibilidad parcial.
- Comprobacion visual de una consulta parcial realizada.
- TypeScript web sin errores antes del cambio de navegacion.

#### Alternativas y recalculo

- Duracion minima opcional.
- Recalculo al cambiar la duracion o un participante individual.
- Alternativas para ampliar la banda, consultar otro dia,
  retirar participantes, eliminar la duracion minima o cancelar.
- Confirmacion explicita antes de consultar fuera de banda.
- Invalidacion de resultados al modificar condiciones.

#### Herramientas del agente

- equipo.listar.
- equipo.consultar_disponibilidad.
- Contratos Zod compartidos.
- Reutilizacion de servicios de membresia y disponibilidad.
- Consulta de solo lectura desde la perspectiva del usuario.
- Zona horaria del solicitante y dia siguiente por defecto.
- Resultados agregados sin detalles privados de eventos.
- Advertencia cuando la disponibilidad es parcial.

#### Navegacion

Disponibilidad de equipo se integra como una vista de Agenda.
Se conservan las tres secciones principales: Agenda, Tareas
y Actividad. Se reutiliza el componente existente sin modificar
la persistencia ni las rutas del backend.

La estructura de navegacion se ha comprobado visualmente.
Queda pendiente confirmar la consulta tras el cambio.

#### Evidencias acumuladas

- API CUN-05: 116/116 pruebas aprobadas.
- Contratos especificos de equipos: 89/89.
- Herramientas del agente CUN-05: 6/6.
- Suite completa del agente: 69/69.
- Total especifico CUN-05: 211 pruebas aprobadas.
- Compilacion de contratos y API correcta.
- TypeScript API sin errores.
- Trazabilidad: 151 requisitos, 0 problemas.

Los resultados corresponden a ejecuciones previas.
No sustituyen la verificacion integral final.

#### Limitaciones pendientes

- INC-33: compatibilidad con el modelo de equipos de Franco.
- D-8: participantes externos e invitaciones.
- Pruebas web automatizadas y extremo a extremo.
- Verificacion con un proveedor real de IA.
- Validacion independiente de la ampliacion explicita
  de banda solicitada mediante el agente.
- Resolucion de participantes por nombre desde el agente.
- Recalculo automatico de cambios masivos y de todo el rango.
- Atenuacion visual de franjas fuera de banda.
- Verificacion de accesibilidad y equipos numerosos.
- Revision e integracion mediante Pull Request.

Se adopta como base el modelo existente en main para evitar
modificaciones incompatibles de migraciones. No se afirma
que exista una aprobacion explicita de Franco ni que su
implementacion haya sido verificada.

### 13.17 Verificacion integral final

**Fecha:** 25/11/2026.
**Rama:** Vasco-cun05-correcciones.
**Comando:** npx pnpm@12.10.1 verificar.
**Resultado:** satisfactorio, codigo de salida 0.

| Componente | Pruebas aprobadas |
|---|---:|
| API | 348/348 |
| Contratos compartidos | 105/105 |
| Web | 16/16 |
| Movil | 8/8 |
| Total | 477/477 |

- 13/13 tareas de Turbo completadas.
- TypeScript y compilacion correctos en los cuatro paquetes.
- 151 requisitos en trazabilidad, 0 problemas.
- 211 pruebas especificas de CUN-05 aprobadas.
- Sin regresiones detectadas por las suites existentes.

Los primeros intentos fueron bloqueados por un servidor
Next.js activo. Tras detenerlo, la verificacion termino
correctamente sin cambios adicionales de codigo.

Se mantienen las limitaciones registradas en 13.16.
Las pruebas existentes no cubren todos los escenarios
pendientes de CUN-05.

Estado: verificacion integral aprobada; pendiente revision
e integracion mediante Pull Request.

---

## 14. Dónde vive cada cosa desde el 7 de noviembre de 2026 (línea de la zona de empresa)

**Añadida en la fusión del 25 de noviembre de 2026** (rama `version_parcial`). Viene del esbozo que la tanda 4 escribió para este archivo antes de conocer el plan de CUN-05. **El modelo de datos es el de este plan (§4 y §12), no el de `08-administracion`:** las tablas son `equipo` y `miembro_de_equipo`, con el consentimiento en sus columnas (D-F1). Donde esta sección habla de `consentimiento_disponibilidad` o de `miembro_equipo`, se lee `miembro_de_equipo.estado_consentimiento`. Lo que sigue vale como propuesta para pasar el panorama del responsable a «Mi equipo» de la zona de empresa, **tarea posterior al 26 de noviembre de 2026** (D-F4): hoy la disponibilidad es un corte de Agenda (INC-36).

**Decisión del equipo del 6 de noviembre de 2026** (`specs/08-administracion/plan.md` §7, H-ADM-22): la disponibilidad que el responsable consulta de su equipo vive en la **zona de empresa**, en «Mi equipo». REQ-CUN05-17 da además a **cualquier miembro** libre/ocupado para convocar, y el colaborador no entra en la zona. De ahí salen **dos usos de la misma lectura** (H-EMP-05; reparto completo en `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §3):

| Uso | Dónde | Quién | Cómo se pide | Requisitos |
|---|---|---|---|---|
| **Panorama del equipo** | Zona de empresa, «Mi equipo», solo web | Responsable | Al abrir el apartado; rango y navegación por decidir (§6.3 del documento de la raíz) | REQ-CUN05-07, 08, 11, 13, 15; REQ-ACC-17 |
| **Para convocar** | Aplicación: rejilla en el lienzo (web); alternativas en la tarjeta (móvil, por decidir) | Responsable y colaborador | Por el asistente, con participantes, rango y duración | REQ-CUN05-01 a 10, 13, 17 |
| **Compartir mi libre/ocupado** | Aplicación, Ajustes, fila «Organización», por equipo (propuesta, H-EMP-12) | Cada miembro, sobre sí | Aceptar o retirar; retirar es inmediato | REQ-CUN05-14, 16; REQ-ENC-12 |

### 14.1 Lo que esta área espera de `08-administracion`

| Necesita | Qué es en `08-administracion` | Para | Estado en su plan |
|---|---|---|---|
| Miembros de un equipo | La misma lectura exportada que pide `03-tareas` (`EquiposLectura`: `miembros(equipoId)`, `esMiembro(perfilId, equipoId)`), fuera de `AdministracionModule` | Resolver participantes por nombre (REQ-CUN05-01); filas del panorama | **Pedido nuevo** (H-EMP-20; `specs/03-tareas/plan.md` §1.1) |
| Autoridad del responsable en su equipo | `@SoloResponsable(resolverEquipo)` | El panorama de la zona (REQ-CUN05-11) | Previsto, T-066 |
| Ser miembro del equipo | `@MiembroDelEquipo(resolverEquipo)` | La consulta para convocar de un colaborador (REQ-CUN05-17) | **Pedido nuevo** (H-EMP-21) |
| Lectura entre organizaciones, justificada | `PertenenciasRepositorio`, el único sitio con `sinAislar` del área (§4.3) | Libre/ocupado de una cuenta afiliada: su `evento_agenda` está en su organización personal (H-ADM-16) | **Fila nueva en `08-administracion/plan.md` §4.3**: «Libre/ocupado de un miembro que lo compartió: solo `inicio`, `fin` y si ocupa, de `evento_agenda`, por `perfil_id` y rango; nunca título, lugar ni asistentes (REQ-CUN05-13)». La pide esta área |
| Al salir alguien de un equipo | Oyente de `SalidaDeEquipo` | Retirar su consentimiento y dejar de leer su libre/ocupado de inmediato (REQ-ADM-25, REQ-CUN05-14) | Evento previsto, T-063 (§5.4). El oyente es T-103 |
| Rutas de la zona | Prefijo `/administracion/*` con `ambito: 'empresa'` | `GET /administracion/mi-equipo/:equipoId/disponibilidad?desde&hasta`, con `@SoloResponsable`; página bajo `app/(empresa)/administracion/mi-equipo/` | Prefijo previsto (§7.3). La ruta es propuesta de esta área |
| Pertenencia en el contexto | `ContextoSolicitud.empresa` y `@EnEmpresa()` | La consulta para convocar desde la aplicación (`ambito: 'propio'`): `GET /disponibilidad?equipoId&participantes&desde&hasta&duracion` y la herramienta del asistente `disponibilidad.consultar` | Previsto, T-059 |

### 14.2 Notas para el plan completo

- **No se guarda la disponibilidad de nadie.** Se calcula al consultar desde `evento_agenda`, que ya es una réplica (AD-10). Así REQ-ENC-12 («borra los datos de disponibilidad que hubiera guardado») se cumple por construcción. El consentimiento sí se guarda: `consentimiento_disponibilidad` (`perfil_id`, `equipo_id`, `estado` pendiente · concedido · rechazado · revocado, `cambiado_en`) en la organización de la empresa, en `MODELOS_CON_ORGANIZACION`. REQ-CUN05-15 lo lee.
- **El cálculo es una función pura**, `calcularDisponibilidadComun()`, con el criterio de RN-CAL-01 (`spec.md` §1) y la banda como parámetro de la plataforma (R-44). No reutiliza `generarAlternativas()` de `02-agenda`: aquella aplica DP-02 (alternativas ante un conflicto propio), con otras reglas.
- **Quien no compartió, o no tiene el calendario conectado, figura sin datos**, nunca libre (R-15, REQ-CUN05-08).
- **CUN-06 (convocar)** no se planifica hasta que se especifique. T-107 queda reservada.
