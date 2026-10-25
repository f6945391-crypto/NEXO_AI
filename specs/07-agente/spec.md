# Especificación — Agente (capa transversal)

**Origen:** `SPEC.md` P-01, P-03, P-06, P-07 y P-11; `PROPUESTA-TECNICA.md` §7; decisiones del equipo del 24 de octubre de 2026.
**Notación:** EARS.
**Plataforma:** web y móvil.
**Estado:** fase 2. REQ-AGT-01 y REQ-AGT-02 **aprobados** por el equipo el 25 de octubre de 2026, junto con `plan.md`.

---

## 1. Por qué existe esta área

El agente no es un caso de uso: es la capa que interpreta lo que la persona pide y lo convierte en consultas y en Operaciones (AD-09). Lo que hace con la agenda lo dicen `02-agenda` (REQ-CUN01-*) y la captura `01-captura` (REQ-CAP-*). Aquí solo va lo que es del agente en sí y no está en ninguna de las dos: el contexto de la conversación y qué hace con lo que todavía no sabe hacer.

## 2. Alcance de la primera versión

Decidido por el equipo el 24 de octubre de 2026.

| Decisión | Valor |
|---|---|
| Entrada | **Solo texto.** La voz queda para una versión posterior (PT-2). REQ-CAP-09 a 13 siguen especificados, sin plan |
| Proveedor del modelo | **Simulado por ahora.** El proveedor real se elige más adelante, detrás de la interfaz propia (P-06) |
| Qué hace | **Solo agenda:** consultar, registrar, modificar y cancelar compromisos por conversación, en la web y en la capa de captura del móvil |
| Una tarea | El asistente la reconoce, lo dice y la deja **en espera**, sin registrarla, hasta que existan las tareas personales (CUN-03) |

---

## 3. Requisitos

### REQ-AGT-01

**Requisito:** MIENTRAS una conversación esté abierta, EL SISTEMA interpretará cada solicitud junto con los turnos anteriores de esa conversación, y CUANDO se cierre la acción en curso, empezará la siguiente solicitud sin ese contexto.

**Origen:** `PROPUESTA-TECNICA.md` §7.4, memoria de conversación; glosario, «Conversación»
**Tipo:** complejo

**Criterio de aceptación**
DADO que el asistente propuso «Dentista, jueves de 16:00 a 17:00» y la persona no ha confirmado
CUANDO escriba «mejor a las 5»
ENTONCES el asistente propone el mismo compromiso a las 17:00, y la propuesta anterior queda descartada
Y DADO que esa propuesta ya se confirmó
CUANDO la persona escriba «mejor a las 5»
ENTONCES el asistente no lo relaciona con el dentista y pregunta qué quiere mover

---

### REQ-AGT-02

**Requisito:** SI la persona pide algo que el asistente todavía no hace en esta versión, ENTONCES EL SISTEMA lo dirá sin intentarlo y sin crear ni enviar nada; y SI lo pedido es una tarea, ENTONCES EL SISTEMA la conservará en espera hasta que pueda registrarse.

**Origen:** decisión del equipo, 24 de octubre de 2026; REQ-CAP-02, REQ-CAP-23
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un usuario con el asistente disponible
CUANDO escriba «manda un correo a Juan»
ENTONCES el asistente dice que el correo todavía no está disponible, y no se crea ni se envía nada
Y CUANDO escriba «recuérdame pagar el recibo antes del sábado»
ENTONCES el asistente dice que lo reconoce como tarea, que lo guarda y que las tareas llegan en una próxima versión
Y no existe ninguna tarea ni ningún compromiso nuevo
Y lo guardado se ve como en espera, distinto de un error y de una función que su plan no incluye

---

## 4. Requisitos de otras áreas que implementa esta capa

| REQ | Qué le toca al agente |
|---|---|
| REQ-CUN01-01 | Extraer fecha, inicio, fin y título; el fin que falta lo pone el código |
| REQ-CUN01-06, 07 | Identificar el compromiso; preguntar el dato que falta |
| REQ-CUN01-11 | Dejar lo pedido en espera cuando el asistente no responde |
| REQ-CUN01-13 | Responder a una consulta con la agenda tal como está |
| REQ-CAP-01 a 04, 06 | La puerta de texto, la clasificación, nada sin confirmar, de uno en uno, sin sintaxis de comando |
| REQ-CAP-23, 24 | En espera visible y distinto de un error; «mañana» respecto del momento de la captura |

---

## 5. Decisiones tomadas durante el diseño

Detectadas al escribir `plan.md` el 24 de octubre de 2026. Lo que asume el plan mientras tanto está en `plan.md` §13. **Aceptadas por el equipo el 25 de octubre de 2026** tal como están.

| # | Decisión | Afecta |
|---|---|---|
| 1 | Sin proveedor real configurado, el asistente cuenta como no disponible y todo queda en espera (H-AGT-01) | REQ-CUN01-11, REQ-CAP-24 |
| 2 | Para demostrar sin clave, el simulado responde según un guion de frases conocidas (H-AGT-02) | Demostración |
| 3 | Cuándo el asistente «no responde»: 30 segundos y dos reintentos (H-AGT-03) | REQ-CUN01-11 |
| 4 | Una solicitud en espera que al interpretarse no es una acción se cierra sin efecto (H-AGT-04) | REQ-CAP-24 |
| 5 | La conversación se cierra al cerrarse su acción; como mucho 20 turnos de contexto (H-AGT-05) | REQ-AGT-01 |
| 6 | Un solo modelo para todo en esta versión (H-AGT-06) | Costo |
| 7 | Sin respuesta en flujo: la respuesta llega entera (H-AGT-07) | Latencia |
| 8 | Sin presupuesto por usuario; se registra el costo para poder fijarlo (H-AGT-08) | P-07, D-7 |
| 9 | La cola en espera tiene tres motivos: asistente caído, permiso que falta y función por llegar (H-AGT-09) | REQ-AGT-02, REQ-ACC-08, REQ-CAP-23 |
| 10 | Como mucho cuatro llamadas al modelo por mensaje (H-AGT-10) | Costo, fallos |
| 11 | Las fechas relativas las resuelve el modelo con la fecha de referencia; la tarjeta muestra el día de la semana para que la persona lo compruebe (H-AGT-11) | REQ-CUN01-01, REQ-CAP-24 |
| 12 | El modelo solo ve título y horas del rango que pide (H-AGT-12) | P-10, minimización |
