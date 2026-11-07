# Plan técnico — Comunicaciones asistidas (CUN-04) y correos que solo avisan

**Especificación:** `specs/04-comunicaciones/spec.md` (REQ-CUN04-01 a 15; el encargo, REQ-ENC-01 a 13, en §9)
**Fase:** 5 para el correo asistido (CUN-04); 4 para los correos que solo avisan del Plan Empresarial (`ESTRUCTURA-PERFIL-EMPRESARIAL.md` §5, bloques 2 y 4)
**Decisiones que aplica:** P-03, P-08, P-09 · R-11, R-31 · DP-03 · PT-3 (abierta) · H-ADM-18
**Depende de:** `specs/08-administracion/plan.md` §8 (puerto `CorreoPlataforma`), `specs/06-acceso/plan.md` (permiso `gmail.send`), `specs/03-tareas/plan.md` (la tarea del equipo y sus preguntas)
**Estado:** **esbozo** del 7 de noviembre de 2026. Solo contiene la nota de ubicación de §1. El plan del correo asistido se escribe al entrar la fase 5; el de los avisos depende de PT-3

Este plan dice **dónde y cómo** se cumple cada requisito. No añade comportamiento: lo que tuvo que decidir y la especificación no decía vuelve a ella como hallazgo.

---

## 1. Dónde vive cada cosa desde el 7 de noviembre de 2026

**Decisión del equipo del 6 de noviembre de 2026** (`specs/08-administracion/plan.md` §7): la administración es una zona aparte. En el Plan Empresarial el correo **solo avisa** (D-17 c) y nunca se responde por él; toda respuesta se da en la aplicación. El reparto completo está en `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §3. Para esta área hay **dos clases de correo que no se mezclan**:

| Correo | Sale desde | Lo pide | Dónde se especifica | Dónde se construye |
|---|---|---|---|---|
| **Correo asistido** (CUN-04): lo redacta el asistente y la persona lo confirma | El Gmail de la persona, con `gmail.send` (P-08, R-31) | La persona, en la conversación | Esta área, §2 a §5 | Esta área, fase 5 |
| **Invitación a sumarse a una empresa** | La dirección de la plataforma (DP-03) | El administrador, en la zona de empresa | REQ-ADM-18 | `08-administracion`, T-063 |
| **Aviso de tarea nueva** | La dirección de la plataforma (DP-03) | El sistema, al confirmarse una delegación | REQ-CUN07-16 | `03-tareas`, T-092 |

Las **preguntas declaradas del encargo** (§9, REQ-ENC-01 a 03, 09, 10) son datos de la tarea del equipo y se contestan en la aplicación: se construyen en `03-tareas` (T-090, T-093), no aquí. Lo que queda de §9 en esta área es REQ-ENC-05 (nunca lectura del buzón), que ya cumple `06-acceso` (REQ-ACC-07).

### 1.1 Lo que esta área espera de `08-administracion`

| Necesita | Qué es en `08-administracion` | Para | Estado en su plan |
|---|---|---|---|
| Un solo puerto para los correos que solo avisan | `CorreoPlataforma.avisar({ para, asunto, cuerpo })` en `AvisosModule`; sin botones, sin enlaces con token, `Reply-To` a una dirección que no se lee | Invitación y aviso de tarea nueva | Previsto, T-063 (§8) |
| Implementación simulada que deja registro | `correo.aviso` en `evento_auditoria` con destinatario y asunto | Probar el ciclo sin enviar nada | Previsto, T-063 |
| El correo de una cuenta afiliada | `PertenenciasRepositorio` (correo y estado, §4.3) | El destinatario del aviso de tarea nueva | Previsto, T-059 |

**La implementación real** del puerto depende de PT-3 y es **una sola**, en `AvisosModule`, para los dos avisos. No se crea otro puerto en esta área. El correo asistido de CUN-04 **no** usa `CorreoPlataforma`: va por el cliente de Google de `IntegracionesModule`, desde la organización de la persona, y nunca por la empresa.
