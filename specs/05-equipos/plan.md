# Plan técnico — Equipos y reuniones (CUN-05, CUN-06)

**Especificación:** `specs/05-equipos/spec.md` (REQ-CUN05-01 a 17) y, del encargo, REQ-ENC-12 (`specs/04-comunicaciones/spec.md` §9)
**Fase:** 4, bloque 6 de `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §5 (tareas propuestas T-103 a T-107)
**Decisiones que aplica:** AD-05, AD-08, AD-10 · P-02, P-04, P-05, P-10 · RN-CAL-01 (criterio aprobado el 26 de septiembre de 2026) · R-13, R-14, R-15, R-44 · H-ADM-16, H-ADM-17
**Depende de:** `specs/08-administracion/plan.md` (pertenencia, equipos, autoridad por equipo, zona de empresa), `specs/02-agenda/plan.md` (réplica `evento_agenda`, AD-10), `specs/06-acceso/plan.md` (permiso de calendario)
**Estado:** **esbozo** del 7 de noviembre de 2026. Solo contiene la nota de ubicación de §1. El plan técnico completo se escribe cuando el equipo decida el panorama de disponibilidad de la zona y especifique CUN-06 (`ESTRUCTURA-PERFIL-EMPRESARIAL.md` §6.3 y §6.7)

Este plan dice **dónde y cómo** se cumple cada requisito. No añade comportamiento: lo que tuvo que decidir y la especificación no decía vuelve a ella como hallazgo.

---

## 1. Dónde vive cada cosa desde el 7 de noviembre de 2026

**Decisión del equipo del 6 de noviembre de 2026** (`specs/08-administracion/plan.md` §7, H-ADM-22): la disponibilidad que el responsable consulta de su equipo vive en la **zona de empresa**, en «Mi equipo». REQ-CUN05-17 da además a **cualquier miembro** libre/ocupado para convocar, y el colaborador no entra en la zona. De ahí salen **dos usos de la misma lectura** (H-EMP-05; reparto completo en `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §3):

| Uso | Dónde | Quién | Cómo se pide | Requisitos |
|---|---|---|---|---|
| **Panorama del equipo** | Zona de empresa, «Mi equipo», solo web | Responsable | Al abrir el apartado; rango y navegación por decidir (§6.3 del documento de la raíz) | REQ-CUN05-07, 08, 11, 13, 15; REQ-ACC-17 |
| **Para convocar** | Aplicación: rejilla en el lienzo (web); alternativas en la tarjeta (móvil, por decidir) | Responsable y colaborador | Por el asistente, con participantes, rango y duración | REQ-CUN05-01 a 10, 13, 17 |
| **Compartir mi libre/ocupado** | Aplicación, Ajustes, fila «Organización», por equipo (propuesta, H-EMP-12) | Cada miembro, sobre sí | Aceptar o retirar; retirar es inmediato | REQ-CUN05-14, 16; REQ-ENC-12 |

### 1.1 Lo que esta área espera de `08-administracion`

| Necesita | Qué es en `08-administracion` | Para | Estado en su plan |
|---|---|---|---|
| Miembros de un equipo | La misma lectura exportada que pide `03-tareas` (`EquiposLectura`: `miembros(equipoId)`, `esMiembro(perfilId, equipoId)`), fuera de `AdministracionModule` | Resolver participantes por nombre (REQ-CUN05-01); filas del panorama | **Pedido nuevo** (H-EMP-20; `specs/03-tareas/plan.md` §1.1) |
| Autoridad del responsable en su equipo | `@SoloResponsable(resolverEquipo)` | El panorama de la zona (REQ-CUN05-11) | Previsto, T-066 |
| Ser miembro del equipo | `@MiembroDelEquipo(resolverEquipo)` | La consulta para convocar de un colaborador (REQ-CUN05-17) | **Pedido nuevo** (H-EMP-21) |
| Lectura entre organizaciones, justificada | `PertenenciasRepositorio`, el único sitio con `sinAislar` del área (§4.3) | Libre/ocupado de una cuenta afiliada: su `evento_agenda` está en su organización personal (H-ADM-16) | **Fila nueva en `08-administracion/plan.md` §4.3**: «Libre/ocupado de un miembro que lo compartió: solo `inicio`, `fin` y si ocupa, de `evento_agenda`, por `perfil_id` y rango; nunca título, lugar ni asistentes (REQ-CUN05-13)». La pide esta área |
| Al salir alguien de un equipo | Oyente de `SalidaDeEquipo` | Retirar su consentimiento y dejar de leer su libre/ocupado de inmediato (REQ-ADM-25, REQ-CUN05-14) | Evento previsto, T-063 (§5.4). El oyente es T-103 |
| Rutas de la zona | Prefijo `/administracion/*` con `ambito: 'empresa'` | `GET /administracion/mi-equipo/:equipoId/disponibilidad?desde&hasta`, con `@SoloResponsable`; página bajo `app/(empresa)/administracion/mi-equipo/` | Prefijo previsto (§7.3). La ruta es propuesta de esta área |
| Pertenencia en el contexto | `ContextoSolicitud.empresa` y `@EnEmpresa()` | La consulta para convocar desde la aplicación (`ambito: 'propio'`): `GET /disponibilidad?equipoId&participantes&desde&hasta&duracion` y la herramienta del asistente `disponibilidad.consultar` | Previsto, T-059 |

### 1.2 Notas para el plan completo

- **No se guarda la disponibilidad de nadie.** Se calcula al consultar desde `evento_agenda`, que ya es una réplica (AD-10). Así REQ-ENC-12 («borra los datos de disponibilidad que hubiera guardado») se cumple por construcción. El consentimiento sí se guarda: `consentimiento_disponibilidad` (`perfil_id`, `equipo_id`, `estado` pendiente · concedido · rechazado · revocado, `cambiado_en`) en la organización de la empresa, en `MODELOS_CON_ORGANIZACION`. REQ-CUN05-15 lo lee.
- **El cálculo es una función pura**, `calcularDisponibilidadComun()`, con el criterio de RN-CAL-01 (`spec.md` §1) y la banda como parámetro de la plataforma (R-44). No reutiliza `generarAlternativas()` de `02-agenda`: aquella aplica DP-02 (alternativas ante un conflicto propio), con otras reglas.
- **Quien no compartió, o no tiene el calendario conectado, figura sin datos**, nunca libre (R-15, REQ-CUN05-08).
- **CUN-06 (convocar)** no se planifica hasta que se especifique. T-107 queda reservada.
