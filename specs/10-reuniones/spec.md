# Especificación: Reuniones (CUN-06, coordinar reunión)

**Origen:** Entregable 1, caso de uso CUN-06. Trabajador TN-02 Coordinador Empresarial. Entidades EN-01 Perfil de Usuario, EN-02 Evento de Agenda y EN-06 Reunión. Reglas RN-CAL-01, RN-OP-01 y RN-ER-03. Reglas de producto R-16, R-32 y R-42 (`REPLANTEO.md` §8). Se apoya en CUN-05 (`05-equipos`): la disponibilidad, el consentimiento y la pertenencia ya existen y no se repiten aquí.
**Notación:** EARS.
**Plataforma:** web y móvil, solo con plan efectivo Empresarial y al menos un equipo (REQ-CUN05-18). El mapa de calor es solo de la web.
**Estado:** especificada el 25 de noviembre de 2026 a pedido de Franco, con base en `PROPUESTA-DISPONIBILIDAD-EQUIPO-2026-11-25.md` (§4 bis) y en sus bocetos (`design/bocetos/2026-11-25-reuniones/`). Las decisiones D-REU-01 a 23 se aplican así, **pendientes de aval del equipo**.

---

## 1. Qué es y qué no es

Una **reunión** es un encuentro que alguien pide al asistente con personas de uno de sus equipos. Primero queda **pendiente**: tiene grupo, tema, duración y días, pero no tiene horario. El asistente propone horarios en los que el grupo está libre. La persona elige uno y lo confirma, y entonces la reunión pasa a **agendada**: se crea un evento en su Google Calendar con los invitados, y Google les avisa.

**Lo que no es:**
- No es un compromiso con otro nombre. Un compromiso (EN-02) es de una sola persona y no avisa a nadie (H-AG-11). Una reunión tiene invitados y siempre les avisa (D-REU-16).
- No incluye participantes externos (D-8) ni enlace de videollamada (D-REU-12). Tampoco muestra las respuestas de los invitados (D-REU-13): todo eso queda para después.
- No reemplaza la consulta de disponibilidad de CUN-05: la usa por detrás. El corte de Agenda deja de mostrar el formulario y muestra la lista de reuniones (D-REU-07, D-REU-09).

```
                 elegir y confirmar               mover (con aviso)
 pendiente  ─────────────────────────►  agendada ◄──────────┐
 (ámbar)                                (verde)  ───────────┘
    │  pasan los días pedidos              │
    ├──────────────► vencida (gris)        │ cancelar (con aviso), o el evento
    │  cancelar                            │ se borra en Google
    └──────────────► cancelada ◄───────────┘
```

---

## 2. Pedir una reunión

### REQ-CUN06-01

**Requisito:** CUANDO el usuario pida al asistente una reunión con personas de un equipo, EL SISTEMA resolverá el grupo, calculará en código los horarios en que el grupo está libre, dejará la reunión **pendiente** sin pedir confirmación y mostrará hasta tres propuestas para elegir.

**Origen:** CUN-06 flujo principal, pasos 1 a 3; `SPEC.md` §1 (la facilidad está en el agente); P-02; D-REU-01, D-REU-02, D-REU-10
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO que Lucía es responsable del equipo «Proyecto Alfa», que tiene a Ana y a Beto, y que los tres autorizaron compartir su disponibilidad
CUANDO Lucía escriba «busca una hora con el equipo Proyecto Alfa esta semana para el avance»
ENTONCES la conversación muestra «Encontré 3 horarios en los que están libres los 3», con tres opciones pulsables y «Ver todos los horarios»
Y la reunión «Avance» aparece en su lista de reuniones como pendiente («Elegir horario»)
Y no se creó ningún evento en Google ni se avisó a nadie
Y Ana y Beto no ven la reunión mientras esté pendiente

---

### REQ-CUN06-02

**Requisito:** EL SISTEMA reconocerá el grupo de una reunión por el nombre de uno de los equipos del usuario, o por los nombres o correos de personas de un mismo equipo del usuario. SI el nombre encaja con más de un equipo o con más de una persona, o alguien no está en ningún equipo del usuario, ENTONCES lo dirá y preguntará, sin crear nada; y SI la solicitud no dice con quién, ENTONCES preguntará solo eso.

**Origen:** pregunta de Franco del 25 de noviembre de 2026 («¿equipo o proyecto?»); REQ-CUN01-07 (lo que falta se pregunta en orden); REQ-AGT-04; D-REU-17, D-REU-18, D-REU-22
**Tipo:** complejo

**Criterio de aceptación**
DADO que Lucía tiene los equipos «Proyecto Alfa» (Ana, Beto) y «Diseño» (Ana)
CUANDO escriba «reunión con Ana mañana»
ENTONCES el asistente responde «Ana está en dos de tus equipos: Proyecto Alfa y Diseño. ¿Con cuál es la reunión?» y no se crea ninguna reunión
Y CUANDO escriba «reunión con el proyecto Alfa»
ENTONCES se toma el equipo «Proyecto Alfa» completo, porque un proyecto es el nombre de un equipo (D-REU-17)
Y CUANDO escriba «reunión con Ana y Carlos», si Carlos no está en sus equipos
ENTONCES el asistente responde «No encuentro a Carlos en tus equipos.» y no crea nada
Y CUANDO escriba «agenda una reunión»
ENTONCES el asistente pregunta «¿Con quién es la reunión?»

---

### REQ-CUN06-03

**Requisito:** SI la solicitud no dice la duración, ENTONCES EL SISTEMA usará una hora; SI no dice los días, ENTONCES usará los próximos cinco días hábiles; SI no dice el tema, ENTONCES llamará a la reunión «Reunión de <equipo>»; y DONDE la solicitud diga «por la mañana» o «por la tarde», solo propondrá horarios dentro de esa franja.

**Origen:** H-AG-01 (una hora por defecto); D-REU-21; propuesta §4 bis.2, paso 1
**Tipo:** comportamiento no deseado + opcional

**Criterio de aceptación**
DADO que hoy es miércoles 25 de noviembre de 2026
CUANDO el usuario pida «una reunión con el equipo Diseño»
ENTONCES la reunión dura una hora, busca horarios desde el jueves 26 hasta el miércoles 2 de diciembre, sin sábado ni domingo, y se llama «Reunión de Diseño»
Y CUANDO pida «una reunión con Diseño el jueves por la tarde»
ENTONCES las propuestas son del jueves 26, entre las 13:00 y las 20:00

---

### REQ-CUN06-04

**Requisito:** EL SISTEMA propondrá como mucho tres horarios para una reunión, calculados en código: cada uno con la duración completa, dentro de la banda habitual de cada invitado en su propia zona (RN-CAL-01), con todos los invitados **obligatorios** libres entre los que tienen datos, nunca en el pasado y en múltiplos de 30 minutos. Ordenará primero los que tienen más invitados opcionales libres y luego los más cercanos, y preferirá días distintos.

**Origen:** RN-CAL-01; P-02, P-05; DP-02 (reparto de las alternativas); D-REU-02, D-REU-19
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un grupo con Ana y Beto obligatorios y Lucía opcional, todos con datos
CUANDO el asistente proponga horarios para una reunión de una hora en tres días hábiles
ENTONCES en cada propuesta Ana y Beto están libres durante toda la hora
Y si en dos horarios igual de cercanos solo en uno está libre Lucía, ese va primero
Y las tres propuestas son de días distintos, mientras haya días con algún horario
Y ninguna propuesta empieza antes de las 08:00 ni termina después de las 20:00 en la zona de ninguno de los invitados

---

### REQ-CUN06-05

**Requisito:** SI no hay ningún horario en el que estén libres todos los invitados obligatorios, ENTONCES EL SISTEMA lo dirá, mantendrá la reunión pendiente y ofrecerá buscar en otros días, en otra franja o con alguien como opcional, sin proponer ningún horario con un obligatorio ocupado.

**Origen:** CUN-06 excepción «sin horario común»; REQ-CUN05-03; propuesta §4 bis.2, paso 4
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO que Beto está ocupado toda la semana
CUANDO el usuario pida «una hora con Ana y Beto esta semana»
ENTONCES el asistente responde «No encontré un horario en el que estén libres todos. Puedo buscar en otros días, en otra franja o con alguien como opcional.»
Y la reunión queda pendiente en la lista, sin propuestas que elegir

---

### REQ-CUN06-06

**Requisito:** EL SISTEMA tratará a cada invitado como **obligatorio**, salvo que el usuario lo marque como **opcional** en su solicitud o en el detalle de la reunión. Un invitado opcional no impide un horario, pero recibe la invitación como opcional.

**Origen:** pregunta de Franco del 25 de noviembre de 2026 (muchos integrantes); boceto 02 (fichas con interruptor); D-REU-19
**Tipo:** opcional

**Criterio de aceptación**
DADO un equipo de diez personas
CUANDO el usuario pida «una reunión con Proyecto Alfa; Beto y Lucía, si pueden»
ENTONCES Beto y Lucía quedan como opcionales y los otros ocho como obligatorios
Y las propuestas no dependen de que Beto y Lucía estén libres
Y en la invitación de Google, Beto y Lucía figuran como asistentes opcionales

---

## 3. Lista y detalle

### REQ-CUN06-07

**Requisito:** EL SISTEMA mostrará en el corte «Reuniones» de Agenda la lista de reuniones del usuario: las que pidió, en cualquier estado salvo cancelada, y las agendadas a las que lo invitaron. Cada una tendrá su título, su grupo y su estado con color: **ámbar** «Elegir horario» si está pendiente, **verde** con el día y la hora si está agendada, y **gris** «Venció sin horario» si venció.

**Origen:** boceto 01 de Franco; R-32 (tres secciones); D-REU-07; propuesta §3.1 y §4 bis.1
**Tipo:** ubicuo

**Criterio de aceptación**
DADO que Lucía pidió una reunión que sigue pendiente y otra que ya agendó para el jueves 26 a las 14:00
CUANDO abra Agenda › Reuniones
ENTONCES ve «Elegir horario» en ámbar en la primera y «Jueves 26, 14:00» en verde en la segunda
Y Ana, invitada a la segunda, la ve en su lista como «Convocada por lucia@… · Jueves 26, 14:00», y no ve la pendiente
Y sin reuniones, la lista dice «Todavía no hay reuniones. Pídele al asistente que busque un horario con tu equipo.» con un ejemplo pulsable

---

### REQ-CUN06-08

**Requisito:** CUANDO el usuario abra una reunión pendiente en la web, EL SISTEMA mostrará un mapa de calor de los días de la reunión, en franjas de 30 minutos dentro de la banda habitual, con cuántos invitados están libres en cada franja, quiénes al pasar el cursor, el horario sugerido marcado y el aviso «Solo se muestran horas libres u ocupadas, sin títulos ni detalles».

**Origen:** boceto 02 de Franco; RN-CAL-01; P-10; propuesta §3.2
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una reunión pendiente con cuatro invitados, de los que tres autorizaron
CUANDO el usuario la abra en la web
ENTONCES ve una columna por día hábil y una fila por cada media hora entre las 08:00 y las 20:00
Y cada celda dice cuántos de los tres están libres, más verde cuanto más libres hay
Y al pasar el cursor sobre una celda ve la franja y quiénes están libres, o quiénes están ocupados si son menos
Y el horario sugerido tiene un borde
Y nunca ve el título ni el detalle de un evento de nadie

---

### REQ-CUN06-09

**Requisito:** EL SISTEMA mostrará a los invitados de una reunión en una línea de resumen («8 obligatorios · 2 opcionales · 1 sin autorizar»), que se despliega en una lista donde cada persona se puede marcar como obligatoria u opcional. Quien no autorizó o no tiene calendario aparecerá así una sola vez y no contará en «libres de n». Cambiar la duración o una marca volverá a calcular las celdas y el sugerido.

**Origen:** pregunta de Franco del 25 de noviembre de 2026 (con 5 o 10 personas, una fila de fichas es tediosa); D-REU-03, D-REU-08, D-REU-19, D-REU-20
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una reunión con diez invitados, uno sin autorización
CUANDO el usuario abra su detalle
ENTONCES ve una sola línea con «9 obligatorios · 0 opcionales · 1 sin autorizar» y no una fila de diez fichas
Y CUANDO la despliegue y marque a Beto como opcional
ENTONCES el sugerido y las celdas se recalculan sin contar a Beto como necesario
Y nada se guarda ni se envía hasta confirmar un horario

---

## 4. Agendar

### REQ-CUN06-10

**Requisito:** CUANDO el usuario elija un horario de una reunión pendiente, en la conversación o en el detalle, EL SISTEMA propondrá convocarla con una tarjeta que muestre el título, el día, la hora y la zona, la duración, los invitados obligatorios y opcionales con la dirección a la que les llegará la invitación, quién no autorizó («no se comprobó su disponibilidad») y lo irreversible: «Google enviará la invitación por correo a n personas».

**Origen:** P-03, P-05; RN-ER-03; DP-01 (elegir es un control sobre algo que ya existe); D-REU-05, D-REU-11; propuesta §4 bis.2, pasos 5 y 6
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una reunión pendiente con tres propuestas en la conversación
CUANDO el usuario pulse «Jueves 26, 14:00»
ENTONCES ve la tarjeta «Convocar esta reunión» con «Jueves 26 de noviembre, 14:00 a 15:00», la zona, los invitados con su dirección y «Google enviará la invitación por correo a 2 personas. Deshacerlo es cancelar la reunión, que también les avisa.»
Y elegir el horario no pasó por el modelo
Y CUANDO pulse «Confirmar horario» en el detalle
ENTONCES ve la misma tarjeta allí mismo

---

### REQ-CUN06-11

**Requisito:** CUANDO el usuario confirme convocar una reunión, EL SISTEMA volverá a comprobar la disponibilidad de los invitados obligatorios y, SI alguno ya no está libre o el horario ya pasó, ENTONCES no escribirá nada y lo dirá en la tarjeta; si no, creará un evento en el Google Calendar del usuario con los invitados y el aviso de Google, y dejará la reunión agendada.

**Origen:** H-AG-07 (comprobar de nuevo al confirmar); AD-09, AD-10; P-08 (la invitación la manda Google); D-REU-16
**Tipo:** complejo

**Criterio de aceptación**
DADO una tarjeta para convocar el jueves 26 a las 14:00
Y que, antes de confirmar, Beto registra otro compromiso a las 14:30
CUANDO el usuario confirme
ENTONCES la tarjeta dice «Beto ya no está libre a esa hora» y no se puede confirmar
Y no se crea nada en Google
Y CUANDO confirme un horario en que todos siguen libres
ENTONCES el evento aparece en su Google Calendar con los invitados y Google les envía la invitación
Y la reunión pasa a agendada, en verde, con ese día y hora
Y confirmar dos veces crea un solo evento

---

### REQ-CUN06-12

**Requisito:** EL SISTEMA enviará la invitación de cada invitado a la dirección de la cuenta de Google que conectó; SI el invitado no tiene Google conectado, ENTONCES la enviará a su correo de NexoAI, y la tarjeta lo dirá.

**Origen:** hallazgo de la propuesta §4 bis.4; D-REU-11
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO que Ana conectó la cuenta de Google ana.real@gmail.com y Beto no conectó Google
CUANDO el usuario vea la tarjeta para convocar
ENTONCES ve «Ana · ana.real@gmail.com» y «Beto · beto@empresa.test, sin Google conectado»

---

### REQ-CUN06-13

**Requisito:** MIENTRAS una reunión esté agendada, EL SISTEMA la mostrará en la lista de cada invitado y su evento en su Agenda, con la marca de invitado que ya existe. El invitado responderá a la invitación en Google, y su respuesta no cambiará la reunión.

**Origen:** P-09, R-16; REQ-CUN01-12 (marca de invitado); D-REU-13
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO una reunión agendada con Ana como invitada, que tiene Google conectado
CUANDO Ana abra su Agenda del jueves 26
ENTONCES ve el compromiso con la marca de invitada
Y en Reuniones ve «Convocada por lucia@… · Jueves 26, 14:00»
Y si Ana rechaza la invitación en Google, la reunión sigue agendada

---

## 5. Después de agendada

### REQ-CUN06-14

**Requisito:** CUANDO quien convocó una reunión agendada pida moverla, EL SISTEMA propondrá nuevos horarios para el mismo grupo y, al confirmar uno, cambiará el evento en Google con aviso a los invitados; el evento seguirá donde estaba hasta esa confirmación.

**Origen:** CUN-06; D-REU-15, D-REU-16; propuesta §4 bis.3
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una reunión agendada el jueves 26 a las 14:00
CUANDO quien la convocó escriba «pasa la reunión del avance al viernes»
ENTONCES ve propuestas del viernes 27 y la reunión sigue el jueves
Y CUANDO elija una y confirme la tarjeta «Mover esta reunión», que dice que Google avisará a los invitados
ENTONCES el evento queda el viernes y la reunión muestra el horario nuevo

---

### REQ-CUN06-15

**Requisito:** CUANDO quien convocó una reunión pida cancelarla, desde la conversación o desde su detalle, EL SISTEMA mostrará una tarjeta y, al confirmarla, borrará el evento de Google con aviso a los invitados si estaba agendada, y la dejará cancelada; una reunión pendiente se cancelará sin tocar Google.

**Origen:** DP-01 (cancelar es un control directo); P-03; D-REU-15, D-REU-16
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una reunión agendada
CUANDO quien la convocó pulse «Cancelar reunión» en el detalle
ENTONCES ve una tarjeta que dice «Google avisará a los 2 invitados de que se canceló»
Y al confirmar, el evento desaparece de Google y la reunión sale de la lista de todos

---

### REQ-CUN06-16

**Requisito:** SI alguien que no convocó la reunión pide moverla o cancelarla, ENTONCES EL SISTEMA no propondrá nada y dirá que solo puede hacerlo quien la convocó.

**Origen:** P-04; D-REU-15
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO que Ana es invitada a una reunión que convocó Lucía
CUANDO Ana pida «cancela la reunión del avance»
ENTONCES el asistente responde «Solo puede cancelarla quien la convocó: lucia@…. Tú puedes responder a la invitación en Google.»
Y no se propone ninguna Operación

---

### REQ-CUN06-17

**Requisito:** CUANDO el evento de una reunión agendada cambie o se borre en el Google Calendar de quien la convocó, EL SISTEMA tomará el horario de Google o dejará la reunión cancelada, sin preguntar.

**Origen:** AD-10 (Google es la fuente de verdad); R-25
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una reunión agendada el jueves 26 a las 14:00
CUANDO quien la convocó la mueva en Google a las 16:00
ENTONCES la lista muestra «Jueves 26, 16:00» la próxima vez que se consulte
Y CUANDO la borre en Google
ENTONCES la reunión pasa a cancelada

---

### REQ-CUN06-18

**Requisito:** CUANDO termine el último día del rango de una reunión pendiente sin que se haya elegido horario, EL SISTEMA la marcará como vencida; la tarjeta de convocar caduca a las 24 horas (H-AG-08), pero la reunión no.

**Origen:** H-AG-08; D-REU-14
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una reunión pendiente para los días 26 y 27 de noviembre
CUANDO pase el viernes 27 sin elegir horario
ENTONCES la reunión aparece en gris, «Venció sin horario», y no tiene propuestas para elegir
Y el asistente puede buscar de nuevo si el usuario lo pide con otros días

---

## 6. Acceso, plataformas y modo degradado

### REQ-CUN06-19

**Requisito:** EL SISTEMA ofrecerá las reuniones solo a quien tenga plan efectivo Empresarial y al menos un equipo, en la web y en el móvil; en el móvil mostrará la lista, las propuestas y la tarjeta, sin mapa de calor.

**Origen:** REQ-CUN05-18; H-EMP-03; propuesta §5
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una cuenta del Plan Personal
CUANDO abra Agenda
ENTONCES no ve el corte «Reuniones», y si pide una reunión al asistente, este responde que las reuniones son del Plan Empresarial
Y DADO una cuenta del Plan Empresarial en el móvil
CUANDO abra una reunión pendiente
ENTONCES ve sus propuestas con «Elegir», sin mapa de calor

---

### REQ-CUN06-20

**Requisito:** MIENTRAS el asistente no responda, EL SISTEMA dejará en espera lo que se pida por conversación, sin crear ninguna reunión, y seguirá mostrando la lista y el detalle; elegir un horario, confirmarlo y cancelar desde el detalle seguirán funcionando.

**Origen:** P-11; DP-01
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO que el asistente no responde
CUANDO el usuario pida «una reunión con Diseño»
ENTONCES ve el aviso de espera de siempre y no aparece ninguna reunión nueva
Y CUANDO abra una reunión pendiente y pulse «Confirmar horario»
ENTONCES ve la tarjeta y puede confirmarla

---

### REQ-CUN06-21

**Requisito:** SI se pide cambiar o cancelar con las acciones de la agenda un compromiso que es una reunión de NexoAI, ENTONCES EL SISTEMA no lo hará y dirá que se mueve o se cancela como reunión, para que los invitados reciban el aviso.

**Origen:** H-AG-11 (la agenda no avisa a los invitados); D-REU-16; propuesta §4 bis.3
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO que el jueves 26 a las 14:00 hay una reunión agendada de NexoAI
CUANDO el usuario intente cancelar ese compromiso desde su Agenda
ENTONCES ve «Es una reunión con invitados. Cancélala desde Reuniones, así Google les avisa.» y no se borra nada

---

## 7. Decisiones tomadas durante el diseño

D-REU-01 a 16 vienen de la propuesta (§7) y se aplican tal como están, **pendientes de aval del equipo**. D-REU-17 a 23 se añaden el 25 de noviembre de 2026 por las preguntas de Franco sobre los grupos grandes y sobre qué datos necesita el asistente.

| # | Decisión | Afecta |
|---|---|---|
| D-REU-01 | La reunión es una entidad propia, porque necesita existir antes de tener horario | §1; REQ-CUN06-01 |
| D-REU-02 | Hasta 3 propuestas: obligatorios libres, duración completa, la más cercana primero, en días distintos | REQ-CUN06-04 |
| D-REU-03 | Quien no autorizó o no tiene calendario no cuenta en «libres de n». La reunión se puede convocar igual, y la tarjeta lo dice | REQ-CUN06-09, 10 |
| D-REU-04 | Se elige tocando una celda, que fija el inicio con la duración de la reunión. Arrastrar queda para después | REQ-CUN06-08 |
| D-REU-05 | La invitación es de Google Calendar y sale del calendario de quien convoca. Los participantes externos quedan fuera (D-8) | REQ-CUN06-11 |
| D-REU-06 | Si alguien se ocupa después de agendar, no pasa nada automático (R-16, P-09) | REQ-CUN06-13 |
| D-REU-07 | El corte de Agenda se llama «Reuniones» | REQ-CUN06-07 |
| D-REU-08 | Sin color por persona: el verde solo significa disponibilidad | REQ-CUN06-09 |
| D-REU-09 | El formulario y la rejilla de CUN-05 salen de la pantalla. Su cálculo se reutiliza detrás | §1 |
| D-REU-10 | La reunión pendiente se crea **sin tarjeta**: no tiene efecto fuera de NexoAI y solo la ve quien la pidió. Queda auditada. **Se aparta de las tareas**, que se crean con tarjeta (H-TP-08) | REQ-CUN06-01 |
| D-REU-11 | La invitación va a la dirección del Google conectado. Sin Google conectado, va al correo de NexoAI | REQ-CUN06-12 |
| D-REU-12 | Sin enlace de videollamada en esta versión | §1 |
| D-REU-13 | Las respuestas de los invitados no se muestran en esta versión; se responde en Google | REQ-CUN06-13 |
| D-REU-14 | La reunión pendiente vence al terminar el último día de su rango, no a las 24 horas | REQ-CUN06-18 |
| D-REU-15 | Solo quien convocó mueve o cancela | REQ-CUN06-14 a 16 |
| D-REU-16 | Siempre se avisa a los invitados, por Google: al convocar, al mover y al cancelar. Es la excepción a H-AG-11 | REQ-CUN06-11, 14, 15, 21 |
| **D-REU-17** | **Un «proyecto» es el nombre de un equipo.** NexoAI no tiene una entidad «proyecto»: si la empresa organiza su trabajo por proyectos, cada proyecto es un equipo («Proyecto Alfa»). «Reunión con el proyecto Alfa» y «con el equipo Proyecto Alfa» se resuelven igual: se compara con los nombres de los equipos del usuario, sin mayúsculas, tildes ni la palabra «equipo» o «proyecto» si el nombre no la lleva | REQ-CUN06-02 |
| **D-REU-18** | **Cómo se reconoce a una persona.** El perfil no tiene nombre visible, solo correo. «Ana» se compara con la parte del correo antes de la arroba, por palabras («ana.perez@» encaja con «Ana» y con «Ana Pérez»), sin mayúsculas ni tildes, y también con el correo entero. Lo resuelve el código, no el modelo. **Hallazgo:** falta un nombre visible en el perfil; con él, la comparación sería por nombre. Queda para después | REQ-CUN06-02 |
| **D-REU-19** | **Obligatorio u opcional, en vez de activar o desactivar.** Las fichas con interruptor del boceto se reemplazan por una marca por persona: obligatorio u opcional. Se puede decir en la solicitud («Beto, si puede») o marcar en el detalle. Las propuestas exigen a los obligatorios. Para quitar a alguien del todo, se le pide al asistente («sin Beto») | REQ-CUN06-04, 06, 09 |
| **D-REU-20** | **Grupos grandes.** Sin fila de fichas: una línea de resumen que se despliega en una lista con buscador desde 8 personas. Al pasar el cursor, el detalle nombra a la lista más corta: los libres, o los ocupados si son menos («Libres 8 de 10 · Ocupados: Ana, Beto») | REQ-CUN06-08, 09 |
| **D-REU-21** | **Franja del día opcional:** «por la mañana» es de 08:00 a 13:00 y «por la tarde», de 13:00 a 20:00, en la zona de quien convoca | REQ-CUN06-03 |
| **D-REU-22** | **Una reunión es de un solo equipo.** La autorización para compartir disponibilidad es por equipo (REQ-CUN05-14), así que todos los invitados tienen que estar en el mismo equipo que quien convoca. Si los nombrados están repartidos, el asistente lo dice | REQ-CUN06-02 |
| **D-REU-23** | **Lo que necesita el asistente.** Solo es obligatorio **con quién**. Todo lo demás tiene un valor por defecto: los días, la duración, la franja, el tema y quién es opcional. El modelo pasa lo que entendió como texto (nombres de equipo o de personas, fechas en formato año-mes-día) y el código resuelve y calcula | REQ-CUN06-02, 03 |
