# Especificación — Agente (capa transversal)

**Origen:** `SPEC.md` P-01, P-03, P-06, P-07 y P-11; `PROPUESTA-TECNICA.md` §7; decisiones del equipo del 24 de octubre de 2026.
**Notación:** EARS.
**Plataforma:** web y móvil.
**Estado:** fase 2. REQ-AGT-01 y REQ-AGT-02 **aprobados** por el equipo el 25 de octubre de 2026, junto con `plan.md`.
**Revisión del 5 de noviembre de 2026** (rama `modificacion/vision-nexoai`, `TRASPASO-CLAUDE-CODE.md`): **REQ-AGT-01 v2** y **REQ-AGT-03 a 05**, con los hallazgos H-AGT-16 y H-AGT-17 y los valores por defecto de §5. **Avalados por el equipo el 5 de noviembre de 2026**, con la enmienda del mismo día. La versión anterior de REQ-AGT-01 se conserva debajo del texto nuevo.

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

**Requisito:** MIENTRAS un episodio esté abierto, EL SISTEMA interpretará cada solicitud junto con los turnos de ese episodio; CUANDO el episodio se cierre, porque su acción se confirmó o se descartó o porque pasó el tiempo sin actividad de §5, EL SISTEMA empezará el siguiente sin esos turnos y con una nota de continuidad, escrita por el código, de las últimas acciones confirmadas de la persona y de lo que tiene en espera.

**Origen:** `PROPUESTA-TECNICA.md` §7.4, memoria de conversación; H-AGT-16; `INFORME-MEMORIA-AGENTE.md` §6 y §8.1; glosario, «Episodio» y «Nota de continuidad»
**Tipo:** complejo
**Versión:** 2, del 5 de noviembre de 2026. Avalada por el equipo el 5 de noviembre de 2026

**Criterio de aceptación**
DADO que el asistente propuso «Dentista, jueves de 16:00 a 17:00» y la persona no ha confirmado
CUANDO escriba «mejor a las 5»
ENTONCES el asistente propone el mismo compromiso a las 17:00, y la propuesta anterior queda descartada
Y DADO que esa propuesta ya se confirmó
CUANDO la persona escriba «mejor a las 5»
ENTONCES el asistente consulta la agenda y propone mover «Dentista» a las 17:00 en una tarjeta nueva, y nada cambia hasta que la persona la confirme
Y CUANDO la persona pregunte «¿qué hicimos?»
ENTONCES el asistente responde con las acciones confirmadas de la nota, sin inventar ninguna y sin llamar a ninguna herramienta que escriba

> **Versión 1, del 24 de octubre de 2026 (anterior, aprobada el 25 de octubre de 2026).** MIENTRAS una conversación esté abierta, EL SISTEMA interpretará cada solicitud junto con los turnos anteriores de esa conversación, y CUANDO se cierre la acción en curso, empezará la siguiente solicitud sin ese contexto. *Su segundo criterio decía que, tras confirmar, «mejor a las 5» no se relaciona con el dentista y el asistente pregunta qué quiere mover. Queda sustituida por la versión 2 por H-AGT-16.*

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

### REQ-AGT-03

**Requisito:** EL SISTEMA conservará la transcripción de lo que la persona y el asistente se dijeron, separada por episodios, y la mostrará al abrir la conversación aunque el episodio se haya cerrado; SI la persona pide ver más, ENTONCES EL SISTEMA mostrará los episodios anteriores por páginas.

**Origen:** H-AGT-16; `INFORME-MEMORIA-AGENTE.md` §6.1 y §8.1; `design/ARQUITECTURA-VISUAL-WEB.md` §5 y §6 («lo cerrado no se pierde»)
**Tipo:** complejo
**Versión:** 1, del 5 de noviembre de 2026. Avalada por el equipo el 5 de noviembre de 2026

**Criterio de aceptación**
DADO que la persona confirmó un compromiso y el episodio se cerró
CUANDO escriba una solicitud nueva
ENTONCES sigue viendo el episodio anterior, con un separador que dice cuándo fue y qué se hizo, y la solicitud nueva debajo
Y CUANDO cierre y vuelva a abrir la aplicación
ENTONCES ve lo mismo
Y CUANDO pida ver lo anterior
ENTONCES aparecen los episodios previos, sin perder lo que estaba leyendo
Y lo que lee el modelo no crece con la transcripción: solo el episodio abierto y la nota de continuidad (REQ-AGT-01)

---

### REQ-AGT-04

**Requisito:** CUANDO una solicitud se refiera a una actividad existente, EL SISTEMA la identificará con un id devuelto por una herramienta; SI el contexto permite inferir una sola actividad razonable, ENTONCES la propondrá mostrando en la tarjeta cuál infirió; SI hay más de una, ENTONCES mostrará las candidatas, armadas por el código, para que la persona elija, sin proponer nada hasta entonces.

**Origen:** H-AGT-17; `INFORME-MEMORIA-AGENTE.md` §6.4.5; decisión 17 de `02-agenda` (las alternativas no pasan por el modelo); P-02, P-03
**Tipo:** complejo
**Versión:** 1, del 5 de noviembre de 2026. Avalada por el equipo el 5 de noviembre de 2026. En esta fase, la única actividad es el compromiso

**Criterio de aceptación**
DADO que la persona tiene «Dentista» el jueves 29 y «Dentista» el 12 de noviembre
CUANDO escriba «mueve el dentista a las 5»
ENTONCES el asistente muestra las dos como alternativas, con fecha y hora, y no propone nada
Y CUANDO la persona elija la del jueves 29
ENTONCES aparece la tarjeta de mover ese compromiso a las 17:00, pendiente de confirmar
Y DADO que solo existe un «Dentista» en las próximas dos semanas
CUANDO escriba «mueve el dentista a las 5»
ENTONCES el asistente propone moverlo directamente y la tarjeta dice cuál es
Y DADO que hay alternativas a la vista
CUANDO la persona escriba otra cosa en vez de elegir
ENTONCES las alternativas se descartan y se interpreta el mensaje nuevo

---

### REQ-AGT-05

**Requisito:** EL SISTEMA mostrará, desde el detalle de una actividad, el hilo de lo que se habló y se hizo sobre ella; y CUANDO la persona escriba desde ese detalle, interpretará la solicitud con esa actividad como contexto.

**Origen:** H-AGT-17; `INFORME-MEMORIA-AGENTE.md` §6.4.3 y §6.4.4; glosario, «Hilo»
**Tipo:** complejo
**Versión:** 1, del 5 de noviembre de 2026. Avalada por el equipo el 5 de noviembre de 2026. **Sin plan en esta rama:** necesita el detalle de actividad, que es una pantalla nueva y no entra sin decisión del equipo (`TRASPASO-CLAUDE-CODE.md` §10.4). T-042 deja preparado el enlace de cada turno con su actividad

**Criterio de aceptación**
DADO que la persona registró «Dentista» y después lo movió por conversación
CUANDO abra el detalle de ese compromiso
ENTONCES ve el hilo: la petición, la tarjeta y el resultado de cada acción sobre él, y nada de otras actividades
Y CUANDO escriba «mejor a las 6» desde ese detalle
ENTONCES el asistente propone mover ese compromiso, sin preguntar cuál

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

### Revisión del 5 de noviembre de 2026

Del traspaso del equipo (`TRASPASO-CLAUDE-CODE.md` §7) y de `INFORME-MEMORIA-AGENTE.md` §10. Se toman **los valores por defecto del traspaso**; quedan **avalados por el equipo el 5 de noviembre de 2026**, salvo el plazo de una propuesta pendiente, que sigue abierto (decisión 18, H-AG-08). Lo que asume el plan está en `plan.md` §14.

| # | Decisión | Afecta |
|---|---|---|
| 16 | **H-AGT-16.** REQ-AGT-01 (versión 1) ataba tres cosas distintas a un mismo ciclo de vida: lo que ve la persona, lo que lee el modelo y lo que el sistema recuerda. Por eso la pantalla se vaciaba y el agente no podía referirse a lo recién hecho. Se separan en **tres capas**: transcripción (lo que ve la persona, persiste), contexto de trabajo (lo que lee el modelo: el episodio abierto y la nota de continuidad) y memoria larga (fuera de esta versión, con su sitio reservado). Sustituye al borrador de §6 | REQ-AGT-01, REQ-AGT-03 |
| 17 | **H-AGT-17.** La transcripción persistente crece sin forma. **La unidad de memoria del agente es la actividad**: cada turno queda ligado a la actividad que resolvió, el hilo de una actividad es una **vista** sobre la transcripción y sus Operaciones, y hay una sola puerta de entrada más la entrada desde el detalle de cada actividad. La persona no crea ni archiva conversaciones. «Actividad» se usa aquí en un tercer sentido, anotado en el glosario (C-2) y en `SPEC.md` §9 (INC-17) | REQ-AGT-04, REQ-AGT-05 |
| 18 | Un episodio sin actividad se cierra a los **30 minutos**, al llegar el siguiente mensaje. **No se cierra si espera una propuesta:** cuánto puede esperar una propuesta es una **decisión abierta**, H-AG-08 (`02-agenda`, decisión 12), y no se fija aquí (enmienda del 5 de noviembre de 2026) | REQ-AGT-01, REQ-CUN01-03 |
| 19 | La nota de continuidad lleva **las últimas 5 acciones confirmadas o las de los últimos 7 días, lo que sea menor**, y lo que está en espera. Llega al modelo marcada como datos, igual que H-AGT-15 | REQ-AGT-01 |
| 20 | La transcripción se conserva **90 días**; la cifra será configurable más adelante | REQ-AGT-03, P-10 |
| 21 | El estado guardado de un episodio cerrado se borra a los **7 días**. La transcripción y la auditoría ya conservan lo que importa. Cierra lo que H-AGT-14 dejó pendiente | P-07, H-AGT-14 |
| 22 | **Dónde se ve lo pasado:** en la columna de conversación, con separadores entre episodios y «Ver anteriores». El modo Registro del lienzo llega después, con la sección Actividad | REQ-AGT-03; `design/ARQUITECTURA-VISUAL-WEB.md` §4 y §5 |
| 23 | **No hay vaciado manual** de la conversación en esta fase | REQ-AGT-03 |
| 24 | **Varias intenciones en una frase** («agenda el dentista y recuérdame pagar el recibo») se atienden **en secuencia**, una tarjeta cada una, y la segunda espera a que se decida la primera. Se resuelve una vez para texto y voz (REQ-CAP-10) | REQ-AGT-01, REQ-CAP-10 |
| 25 | **Voz:** fuera de esta revisión. Solo queda escrito el principio: voz → texto que la persona aprueba → el mismo flujo | PT-2, REQ-CAP-09 a 13 |
| 27 | **Abierta.** **¿Una tarea guardada en espera cierra el episodio?** Hoy no: el episodio sigue abierto y la tarea no tiene separador propio. Si lo cierra, el `cierre` necesita un desenlace nuevo («guardado»). Se decide antes de T-039 | REQ-AGT-03, REQ-AGT-02 |
| 26 | Las alternativas de referente (REQ-AGT-04) **las arma el código** con el resultado de la consulta; el modelo nunca elige entre candidatas parecidas. Entran en esta rama solo si hay tiempo (T-042) | REQ-AGT-04, P-02 |

---

## 6. Propuesta de cambio de REQ-AGT-01 — borrador, no aprobado

**Estado:** propuesta del 29 de octubre de 2026. **No está aprobada y no cambia el requisito vigente.** REQ-AGT-01 sigue como está en §3 hasta que el equipo decida.

> **Superado el 5 de noviembre de 2026** por REQ-AGT-01 v2 y REQ-AGT-03 (§3, H-AGT-16). Queda como registro: de él se conservan el historial visible y la respuesta a «¿qué hicimos?»; se descartan el cierre tras 5 acciones y el resumen escrito por el modelo como pieza central.

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
