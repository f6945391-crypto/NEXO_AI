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
| Proveedor del modelo | **Simulado por ahora.** El proveedor real se elige más adelante, detrás de la interfaz propia (P-06). **Para probar, desde el 29 de octubre de 2026: Groq, en su nivel gratuito** |
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
| 14 | Del estado guardado de cada conversación se conservan los 2 últimos puntos, no 10. **Aceptada por el equipo el 29 de octubre de 2026** (H-AGT-14) | P-07, almacenamiento |
| 15 | Lo que devuelven las herramientas, y en especial los títulos de compromisos escritos por otras personas, llega al modelo marcado como datos que no son instrucciones. **Aceptada por el equipo el 29 de octubre de 2026** (H-AGT-15) | P-01, P-03 |
| 13 | Con el proveedor de prueba, su límite de uso por minuto cuenta como «no disponible»: lo pedido queda en espera. Lo que se le envía puede quedar en sus servidores, así que se prueba con un calendario sin datos personales (H-AGT-13, 29 de octubre de 2026) | REQ-CUN01-11, P-10 |

---

## 6. Propuesta de cambio de REQ-AGT-01 — borrador, no aprobado

**Estado:** propuesta del 29 de octubre de 2026. **No está aprobada y no cambia el requisito vigente.** REQ-AGT-01 sigue como está en §3 hasta que el equipo decida.

### Por qué

Al probar el agente con Groq, el equipo vio dos cosas:

1. Tras cada acción confirmada, la conversación se cierra y la pantalla se vacía. Lo que la persona vio y lo que lee el modelo se pierden juntos, y se siente brusco.
2. Preguntado «¿cuál es el resumen?», el asistente responde que solo sabe de agenda: las instrucciones no le dejan responder sobre la propia conversación.

### Texto propuesto

> **REQ-AGT-01 (propuesta).** MIENTRAS una conversación esté abierta, EL SISTEMA interpretará cada solicitud con los turnos recientes de esa conversación, un resumen de los anteriores y la lista de las acciones confirmadas en ella; y la mantendrá abierta hasta que se confirmen **5 acciones** o pasen **30 minutos sin actividad**. Lo que la persona ve de la conversación no se borra al cerrarse.
>
> **Criterio de aceptación**
> DADO que la persona registró «Dentista, jueves 16:00 – 17:00» y lo confirmó
> CUANDO escriba «mejor a las 5»
> ENTONCES el asistente propone mover ese mismo compromiso a las 17:00
> Y DADO una conversación con más mensajes de los que caben en el contexto
> CUANDO la persona pregunte «¿qué hicimos?»
> ENTONCES el asistente responde con el resumen y la lista de acciones, sin inventar ninguna
> Y DADO que se cerró la conversación
> CUANDO la persona abra la aplicación
> ENTONCES sigue viendo la conversación anterior, separada de la nueva

### Piezas

| Pieza | Propuesta | Costo |
|---|---|---|
| Cierre | Tras 5 acciones confirmadas o 30 minutos sin uso, cifras ajustables (idea del equipo: «un máximo de cambios») | Ninguno |
| Lo que se ve | Toda la conversación; la anterior queda arriba, separada | Bajo, en la web y el móvil |
| Lo que lee el modelo | Los 20 últimos mensajes, un resumen de lo recortado (lo escribe el modelo) y la lista de acciones confirmadas (la escribe el código) | Una llamada más de vez en cuando; algo más de contexto |
| Preguntas sobre la conversación | Las instrucciones permiten responder «¿qué hicimos?» o «resúmeme» | Ninguno |
| Lo que no cambia | Cada acción pide confirmación (P-03); 2 puntos de control (H-AGT-14) | — |

### Nota del equipo, 29 de octubre de 2026

> No convence: **no parece apuntar a una estructura escalable y útil para el usuario.** Queda solo como consideración.

Lo que la nota deja abierto, para cuando se retome:

- **Qué estructura de memoria escala.** Esta propuesta sigue girando alrededor de una conversación lineal. Otras direcciones, sin evaluar: memoria estructurada por tema o por entidad (por compromiso, por persona, por proyecto), que el agente consulta con herramientas en vez de releer la conversación; memoria larga por usuario (preferencias y hechos), separada de las conversaciones (`INFORME-LANGGRAPH.md` §4).
- **Qué es útil para la persona.** Falta saber qué espera ver y recuperar: el historial completo, lo que se hizo, o lo que queda pendiente.
- **Referencia del equipo:** el agente de la universidad, que organiza la información de cada curso y sostiene varias preguntas largas.
