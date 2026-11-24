# Plan técnico propuesto — CUN-05 Equipos y consulta de disponibilidad

**Estado:** implementación parcial funcional en rama Vasco. Pendiente de revisión del equipo, pruebas completas y aprobación para integración.
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
