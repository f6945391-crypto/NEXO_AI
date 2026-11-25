# Especificación — Tareas personales (CUN-03 Gestionar tareas personales)

**Origen:** Entregable 1. Caso de uso CUN-03, trabajador TN-01 Asistente Personal Inteligente, entidades EN-01 Perfil de Usuario y EN-04 Tarea. Reglas RN-OP-01, RN-ER-03, RN-EST-01 y RN-EST-02. Reglas de producto R-1, R-12, R-20, R-25, R-38, R-40 y R-42 (`REPLANTEO.md` §8).
**Notación:** EARS.
**Plataforma:** web y móvil, para toda cuenta: usuario personal, gerente y colaborador, cada uno sobre lo suyo (REQ-ACC-13).
**Estado:** propuesta del 6 de noviembre de 2026, pendiente de aval del equipo. Hito 3 de `PLAN-VALOR-USUARIO.md`.

---

## 1. Por qué existe esta área y qué no es

La captura ya reconoce una tarea (REQ-CAP-02), pero la deja **en espera** porque no existe dónde guardarla (REQ-AGT-02, decisión 2 de `01-captura` §11). La sección Tareas ya muestra sus tres franjas —con fecha, sin fecha y esperando de alguien (R-38)— sin nada dentro. Esta área completa CUN-03: registrar, ver, cambiar, completar, reabrir y descartar las tareas que una persona tiene para sí.

**Se numera aparte de `03-tareas`.** Aquella área es CUN-07 (delegar), CUN-08 (seguimiento) y CUN-09 (tarea asignada), del Plan Empresarial. Aquí no hay nadie más que la propia persona: no se asigna, no se delega y nadie recibe nada (§9). Resuelve en parte INC-05, que señalaba que `03-tareas` no cubría CUN-03.

**Se apoya en la captura.** Lo que dice cómo entra algo —una sola puerta, nada sin confirmar, el dato que falta de uno en uno— está en `01-captura` (REQ-CAP-01 a 04, 08, 23 a 25) y no se repite. Aquí va lo que pasa con la tarea después.

**Alcance mínimo**, el que propone `PLAN-VALOR-USUARIO.md` §5 para el hito 3: registrar, ver por franjas, completar, cambiar fecha o texto y descartar. Sin subtareas, recurrencia, categorías (D-16) ni duración.

---

## 2. Ciclo de vida de una tarea personal

```
              confirmar la propuesta
   (asistente) ──────────────────────▶ pendiente ──── «Hecho» / «Recibido» ───▶ hecha
                                         │  ▲                                    │
                                         │  └──────────── «Reabrir» ─────────────┘
                                         │
                                         └──── descartar, con confirmación ───▶ descartada
```

Una tarea pendiente está siempre en **una sola** de las tres franjas, y la franja la decide el código con sus datos (REQ-CUN03-03): cambiarle la fecha o decir de quién se espera la mueve de franja sin cambiar su estado.

### REQ-CUN03-01

**Requisito:** CUANDO el usuario pida al asistente algo que tiene que hacer o que espera de otra persona, EL SISTEMA propondrá una tarea personal con su texto y, si se dijeron, su fecha, su hora límite y de quién se espera, y solo la registrará cuando el usuario confirme la propuesta.

**Origen:** CUN-03 flujo principal, pasos 1 a 3; REQ-CAP-02, REQ-CAP-03; RN-ER-03
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO que hoy es lunes 9 de noviembre de 2026 y el asistente está disponible
CUANDO el usuario escriba «recuérdame pagar el recibo antes del sábado»
ENTONCES ve una tarjeta con la acción «Nueva tarea», el texto «Pagar el recibo» y «Para el sábado 14 de noviembre»
Y mientras no confirme, no existe ninguna tarea nueva
Y CUANDO confirme
ENTONCES la tarea aparece en la franja «Con fecha», y no se crea ningún compromiso ni se escribe nada en su calendario de Google
Y la tarjeta no promete ningún aviso (decisión H-TP-10)

---

### REQ-CUN03-02

**Requisito:** SI la solicitud no dice cuándo, ENTONCES EL SISTEMA propondrá la tarea sin fecha, sin preguntar por la fecha; y SI no se entiende qué hay que hacer, ENTONCES preguntará solo eso.

**Origen:** CUN-03 excepción «información insuficiente»; R-20; REQ-CAP-04; glosario, «Pendiente sin fecha»
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un usuario con el asistente disponible
CUANDO escriba «tengo que llamar al dentista»
ENTONCES la tarjeta propone «Llamar al dentista» sin fecha, y el asistente no pregunta para cuándo
Y CUANDO escriba «recuérdame lo del viernes»
ENTONCES el asistente pregunta qué hay que hacer, y no propone nada todavía

**Nota.** Para un compromiso, la fecha es un dato que falta (REQ-CUN01-07). Para una tarea no: sin fecha es una de sus tres franjas. Preguntarla siempre empujaría a la persona a inventar plazos.

---

### REQ-CUN03-03

**Requisito:** EL SISTEMA mantendrá cada tarea personal en uno de tres estados —pendiente, hecha o descartada— y, mientras esté pendiente, la situará en una sola franja: «Esperando de alguien» si tiene de quién se espera, «Con fecha» si tiene fecha y «Sin fecha» en otro caso.

**Origen:** CUN-03; EN-04; R-38; `design/ARQUITECTURA-VISUAL-MOVIL.md` §2, «Tareas no tiene niveles de período»
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una tarea «Presupuesto de Juan», que se espera de Juan para el lunes 16 de noviembre
CUANDO el usuario abra Tareas
ENTONCES la ve solo en «Esperando de alguien», con su fecha, y no en «Con fecha»
Y DADO que el usuario pide al asistente quitarle la fecha a «Pagar el recibo» y lo confirma
CUANDO abra Tareas
ENTONCES «Pagar el recibo» pasa de «Con fecha» a «Sin fecha», sigue pendiente y conserva su texto

---

### REQ-CUN03-04

**Requisito:** CUANDO el usuario registre algo que espera de otra persona, EL SISTEMA guardará qué se espera, de quién, tal como lo nombró, desde cuándo y, si lo dijo, para cuándo; y no guardará ningún dato de contacto ni ninguna nota sobre esa persona, ni le escribirá.

**Origen:** CUN-03; REQ-CAP-08; R-12; REQ-CUN04-13
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO que hoy es lunes 9 de noviembre de 2026
CUANDO el usuario escriba «Juan tiene que enviarme el presupuesto el lunes que viene» y confirme
ENTONCES en «Esperando de alguien» aparece «Presupuesto», de «Juan», desde el lunes 9 de noviembre, para el lunes 16 de noviembre
Y no se guarda correo, teléfono ni valoración de Juan
Y Juan no recibe ningún mensaje

**Nota.** «De quién» es texto libre: el nombre que la persona usó. Un contacto con su medio es CUN-04 (REQ-CUN04-13) y el participante externo como entidad está sin decidir (D-8).

---

### REQ-CUN03-05

**Requisito:** CUANDO el usuario marque como recibido algo que esperaba de otra persona, EL SISTEMA lo dará por hecho con el día en que lo marcó, y no creará ninguna tarea nueva por su cuenta.

**Origen:** CUN-03; `design/ARQUITECTURA-VISUAL-MOVIL.md` §2, «se cierra o se convierte en otra cosa»; R-25
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO «Presupuesto», de Juan, en «Esperando de alguien»
CUANDO el usuario pulse «Recibido»
ENTONCES deja de estar en la franja y aparece entre las hechas, con «Recibido el lunes 16 de noviembre»
Y no aparece ninguna tarea nueva, como «revisar el presupuesto», salvo que el usuario la pida

---

## 3. La lista

### REQ-CUN03-06

**Requisito:** CUANDO el usuario abra la sección Tareas, en la web o en el móvil, EL SISTEMA mostrará sus tareas pendientes en las tres franjas, cada una con su texto y, según la franja, su fecha con el día de la semana y su hora límite en la zona del usuario, o de quién se espera y desde cuándo; y las ordenará así: «Con fecha», por fecha y hora, las vencidas primero; «Sin fecha», de la más reciente a la más antigua; «Esperando de alguien», primero las que ya pasaron su fecha y después de la que lleva más tiempo esperando a la que menos.

**Origen:** CUN-03, alcance «consultar»; R-38; R-41 (la sección se ve igual en las dos plataformas); P-05
**Tipo:** dirigido por evento
**Plataforma:** web (lienzo) y móvil (sección Tareas)

**Criterio de aceptación**
DADO que hoy es lunes 9 de noviembre de 2026 y el usuario tiene «Pagar el recibo» para el sábado 14, «Renovar el DNI» para el viernes 6, «Llamar al dentista» sin fecha y «Presupuesto» de Juan desde el martes 3
CUANDO abra Tareas
ENTONCES en «Con fecha» ve primero «Renovar el DNI», marcada como vencida, y después «Pagar el recibo», con «Sábado 14 de noviembre»
Y en «Sin fecha» ve «Llamar al dentista»
Y en «Esperando de alguien» ve «Presupuesto · De Juan · Desde el martes 3 de noviembre, hace 6 días»
Y en la web y en el móvil ve las mismas tareas en el mismo orden
Y ningún texto de la pantalla nombra la disposición de la interfaz ni sus estados internos (R-40)

---

### REQ-CUN03-07

**Requisito:** MIENTRAS una tarea pendiente tenga su fecha ya pasada en la zona del usuario, EL SISTEMA la mostrará como vencida, con el día en que vencía; y lo mismo hará con lo que se espera de alguien cuando pase la fecha en que debía llegar.

**Origen:** CUN-03; REQ-CUN04-14 («no es tarea del usuario pero sí es su problema»); P-02; P-05
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO «Renovar el DNI» para el viernes 6 de noviembre de 2026, pendiente, y un usuario en la zona de Lima
CUANDO abra Tareas el lunes 9 de noviembre
ENTONCES la tarea dice «Vencía el viernes 6 de noviembre»
Y DADO «Presupuesto» de Juan, para el lunes 16 de noviembre
CUANDO abra Tareas el martes 17 de noviembre
ENTONCES dice «Debía llegar el lunes 16 de noviembre»
Y en ningún caso la tarea cambia de estado ni de fecha por haber vencido

**Nota.** Vencida es una marca que calcula el código con la fecha, la hora límite y la zona (P-02), no un estado. Una tarea vencida sigue pendiente hasta que la persona decida.

---

### REQ-CUN03-08

**Requisito:** MIENTRAS una franja no tenga tareas pendientes, EL SISTEMA mostrará en ella un estado vacío que diga qué va ahí y cómo pedírselo al asistente, sin ofrecer ningún formulario.

**Origen:** REQ-CUN01-12 (por analogía); R-42; H-AG-10
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO un usuario sin nada que espere de otra persona
CUANDO abra «Esperando de alguien»
ENTONCES ve un texto que explica que ahí aparece lo que espera de otra persona y un ejemplo de cómo pedirlo
Y su acción abre la capa de captura en el móvil, o pone el foco en la barra de entrada en la web
Y no hay ningún campo para escribir la tarea a mano

---

## 4. Completar, reabrir, descartar y cambiar

### REQ-CUN03-09

**Requisito:** CUANDO el usuario pulse «Hecho» sobre una tarea pendiente, o «Recibido» si espera de alguien, EL SISTEMA la dará por hecha al momento, sin tarjeta de confirmación, y le ofrecerá deshacerlo durante unos segundos; y este control funcionará aunque el asistente no esté disponible.

**Origen:** CUN-03, alcance «completar»; DP-01 (controles directos sobre lo que ya existe); P-11; glosario, «Acción sensible»
**Tipo:** dirigido por evento
**Plataforma:** web y móvil, en la lista y en el detalle de la tarea, y en la vista Hoy (REQ-CUN03-13)

**Criterio de aceptación**
DADO «Pagar el recibo», pendiente, y el asistente sin responder
CUANDO el usuario pulse «Hecho»
ENTONCES la tarea deja la franja y aparece entre las hechas, sin pasar por una tarjeta
Y ve «Deshacer» durante unos segundos; si lo pulsa, la tarea vuelve a su franja con todos sus datos
Y el cambio queda registrado como hecho por el usuario, no por el asistente (R-18)

**Nota.** No lleva tarjeta porque no es una acción sensible: no sale de NexoAI y se deshace con «Reabrir». Pasa igualmente por una operación con su registro (AD-09, P-07). Pedírselo al asistente sí lleva tarjeta (REQ-CUN03-15).

---

### REQ-CUN03-10

**Requisito:** EL SISTEMA mostrará al pie de cada franja las tareas que el usuario dio por hechas en los últimos siete días, con el día en que se hicieron; y CUANDO el usuario pulse «Reabrir» sobre una de ellas, la devolverá a pendiente, en su franja y con todos sus datos.

**Origen:** CUN-03, alcance «modificar»; R-25 (nada desaparece en silencio); decisión H-TP-06
**Tipo:** complejo

**Criterio de aceptación**
DADO «Pagar el recibo», hecha ayer
CUANDO el usuario abra «Con fecha»
ENTONCES la ve al pie, entre las hechas, con «Hecha el domingo 8 de noviembre», separada de las pendientes
Y CUANDO pulse «Reabrir»
ENTONCES vuelve a «Con fecha», con su fecha del sábado 14 de noviembre, pendiente
Y DADO una tarea hecha hace ocho días
CUANDO abra su franja
ENTONCES ya no aparece al pie

---

### REQ-CUN03-11

**Requisito:** CUANDO el usuario pida descartar una tarea, desde su control o al asistente, EL SISTEMA mostrará una tarjeta de confirmación con la tarea exacta y lo que no se podrá deshacer, y solo la quitará de sus franjas al confirmar.

**Origen:** CUN-03; RN-ER-03; P-03; R-25 (el asistente no borra nada por su cuenta); DP-01
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO «Llamar al dentista», sin fecha
CUANDO el usuario pulse «Descartar»
ENTONCES ve una tarjeta con «Descartar la tarea», «Llamar al dentista» y que ya no aparecerá en sus tareas
Y si elige no descartarla, la tarea sigue igual
Y CUANDO confirme
ENTONCES la tarea deja de aparecer en Tareas y en la vista Hoy, y tampoco aparece entre las hechas

---

### REQ-CUN03-12

**Requisito:** CUANDO el usuario pida al asistente cambiar el texto, la fecha, la hora límite o de quién se espera una tarea pendiente, EL SISTEMA propondrá el cambio en una tarjeta con el antes y el después, y solo lo aplicará al confirmarlo.

**Origen:** CUN-03, alcance «modificar»; RN-ER-03; R-42 (no hay formulario para cambiarla a mano); REQ-CUN01-06 (por analogía)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO «Pagar el recibo» para el sábado 14 de noviembre
CUANDO el usuario escriba «pasa lo del recibo al lunes»
ENTONCES la tarjeta muestra «Antes: sábado 14 de noviembre» y «Ahora: lunes 16 de noviembre»
Y mientras no confirme, la tarea sigue con su fecha
Y en la lista no existe ningún control para editar el texto ni la fecha a mano

---

## 5. Relación con la agenda

### REQ-CUN03-13

**Requisito:** MIENTRAS el día que muestra el nivel Hoy de la agenda tenga tareas pendientes con esa fecha, EL SISTEMA las mostrará en un grupo propio, «Tareas para este día», separado de los compromisos y debajo de ellos, sin situarlas en la línea de horas, con su hora límite si la tienen y con el control «Hecho»; CUANDO el día mostrado sea hoy, sumará las vencidas, marcadas; y EL SISTEMA no tratará una tarea como compromiso: no la escribirá en el calendario de Google, no la contará como conflicto ni la mostrará en los niveles Semana y Mes.

**Origen:** CUN-01 y CUN-03; R-23 (Agenda es lo que va a pasar); R-26 (Agenda contesta «qué»); REQ-CUN01-05; REQ-CUN01-14, REQ-CUN01-15; REQ-CAP-25; `PLAN-VALOR-USUARIO.md` §5 («como bloque distinto del compromiso; no va a Google»)
**Tipo:** complejo
**Plataforma:** web (lienzo, nivel Hoy) y móvil (Inicio, nivel Hoy)

**Criterio de aceptación**
DADO que hoy es sábado 14 de noviembre de 2026, el usuario tiene «Dentista» de 10:00 a 11:00, la tarea «Pagar el recibo» para hoy antes de las 18:00 y la tarea vencida «Renovar el DNI», y tiene una cosa en espera
CUANDO abra la agenda en Hoy
ENTONCES ve, en este orden, la franja «1 cosa en espera» (REQ-CAP-25), «Dentista» en su hora y el grupo «Tareas para este día» con «Pagar el recibo · Antes de las 18:00» y «Renovar el DNI», marcada como vencida
Y ninguna de las dos tareas ocupa un hueco en la línea de horas
Y CUANDO el usuario pida al asistente «agéndame una reunión hoy a las 17»
ENTONCES la tarea con hora límite a las 18:00 no aparece como conflicto
Y DADO que el usuario elige ver el martes 17 de noviembre
CUANDO abra Hoy en esa fecha
ENTONCES ve solo las tareas con fecha de ese día, sin las vencidas
Y en Semana y en Mes no aparece ninguna tarea
Y DADO un día sin compromisos pero con tareas
CUANDO abra Hoy
ENTONCES ve el estado vacío de los compromisos (REQ-CUN01-12) y debajo el grupo de tareas

---

## 6. El asistente

### REQ-CUN03-14

**Requisito:** CUANDO el usuario pregunte al asistente por sus tareas, EL SISTEMA responderá con las tareas pendientes que corresponden a lo preguntado, agrupadas por franja y tal como están registradas, sin añadir ni omitir ninguna.

**Origen:** CUN-03, alcance «consultar»; REQ-CUN01-13 (por analogía); `REPLANTEO.md` §6, `/pendientes`; P-02
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario con las cuatro tareas del criterio de REQ-CUN03-06
CUANDO pregunte «¿qué tengo pendiente?»
ENTONCES la respuesta lista las cuatro, agrupadas en «Con fecha», «Sin fecha» y «Esperando de alguien», con «Renovar el DNI» marcada como vencida
Y CUANDO pregunte «¿qué tengo pendiente esta semana?»
ENTONCES lista solo las de «Con fecha» cuya fecha cae entre el lunes 9 y el domingo 15 de noviembre, y las vencidas
Y no aparece ninguna tarea que no esté registrada, ni una hecha o descartada

---

### REQ-CUN03-15

**Requisito:** CUANDO el usuario pida al asistente dar por hecha, marcar como recibida, reabrir o descartar una tarea, EL SISTEMA lo propondrá en una tarjeta que diga qué tarea es, y solo lo aplicará al confirmar; y SI hay más de una tarea que encaja con lo dicho, ENTONCES mostrará las candidatas para que el usuario elija, sin proponer nada hasta entonces.

**Origen:** CUN-03; REQ-AGT-04 (alternativas de referente, que arma el código); RN-ER-03; P-03
**Tipo:** complejo

**Criterio de aceptación**
DADO «Pagar el recibo de la luz» y «Pagar el recibo del agua», pendientes
CUANDO el usuario escriba «ya pagué el recibo»
ENTONCES ve las dos como candidatas, y no se propone nada
Y CUANDO elija «Pagar el recibo de la luz»
ENTONCES ve la tarjeta «Dar por hecha · Pagar el recibo de la luz»
Y CUANDO confirme
ENTONCES esa tarea queda hecha y la del agua sigue pendiente
Y DADO una sola tarea que encaja
CUANDO el usuario escriba «ya me llegó el presupuesto de Juan»
ENTONCES la tarjeta propone marcar «Presupuesto», de Juan, como recibido

**Nota.** Por conversación lleva tarjeta, a diferencia de «Hecho» en la lista (REQ-CUN03-09): aquí es el asistente quien infiere de qué tarea se habla, y la tarjeta deja ver si se equivocó.

---

### REQ-CUN03-16

**Requisito:** SI el usuario pide asignar una tarea a otra persona, delegarla, ponerle una prioridad numérica, dividirla en subtareas, hacerla repetir o que se le avise a una hora, ENTONCES EL SISTEMA dirá que eso no lo hacen las tareas personales, sin intentarlo y sin crear ni enviar nada; y SI lo pedido es que otra persona haga algo, ENTONCES ofrecerá registrarlo como algo que espera de esa persona, sin escribirle.

**Origen:** CUN-03 (actor único: el propio usuario); CUN-07 y REQ-ACC-15 (delegar es del responsable del equipo, `03-tareas`); REQ-AGT-02; R-12
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un usuario personal con el asistente disponible
CUANDO escriba «pídele a María Fernanda el informe para el lunes»
ENTONCES el asistente dice que no le escribe a nadie, y ofrece una tarjeta para registrar «Informe», de «María Fernanda», para el lunes 16 de noviembre, en «Esperando de alguien»
Y María Fernanda no recibe nada
Y CUANDO escriba «ponle prioridad 1 a pagar el recibo» o «divídela en tres pasos»
ENTONCES el asistente dice que las tareas personales no tienen prioridades ni pasos, y no cambia nada

---

## 6 bis. La bitácora de una tarea

*Añadida el 25 de noviembre de 2026, a propuesta de Franco; pendiente de aval del equipo.* Se numera «6 bis» para no renumerar las secciones siguientes (como `02-jornada` §8 bis, H-JOR-01), y sus requisitos siguen desde REQ-CUN03-21.

**Por qué.** Hoy lo que la persona le cuenta al asistente sobre una tarea («ya hablé con Juan, me falta hablar con Rosa») solo queda en la transcripción: el asistente lo olvida al cerrar el episodio, y la transcripción se borra a los 90 días (decisión 20 de `07-agente`). La bitácora guarda esos avances **como datos de la tarea**, que son la fuente de verdad, y no como parte de la conversación. Es el hilo del Plan Personal que describe R-27: lo actualiza la propia persona.

**Lo que falta hacer va en el texto del avance**, sin una lista aparte de pendientes que se tachen (decisión de Franco del 25 de noviembre de 2026). Así las tareas personales siguen sin pasos ni subtareas (§9, REQ-CUN03-16).

**La ficha de la tarea.** Para saber de qué tarea se habla, el asistente no mira solo el título: mira la **ficha** de cada tarea pendiente, que lleva su texto, su contexto (REQ-CUN03-26), cuándo es o de quién se espera, y sus últimos avances. «Ya hablé con Rosa» encaja con «Presupuesto de la cocina» porque Rosa aparece en su contexto o en un avance (H-TP-26, precisada por Franco el 25 de noviembre de 2026).

**Al vencer, la persona decide** si la cierra o la mantiene abierta (REQ-CUN03-27): la bitácora no se cierra sola por tiempo (H-TP-28, decisión de Franco del 25 de noviembre de 2026).

### REQ-CUN03-21

**Requisito:** CUANDO el usuario le cuente al asistente un avance sobre una tarea pendiente, EL SISTEMA propondrá anotarlo en la bitácora de esa tarea, en una tarjeta que diga qué tarea es y el texto que se anotará, y solo lo anotará al confirmar; SI hay más de una tarea que encaja con lo dicho, ENTONCES mostrará las candidatas para que el usuario elija, sin proponer nada hasta entonces; y SI no encaja ninguna, ENTONCES lo dirá y preguntará a qué tarea corresponde, sin anotar nada.

**Origen:** R-27; propuesta de Franco del 25 de noviembre de 2026; REQ-CUN03-15 (candidatas); RN-ER-03; P-03
**Tipo:** complejo

**Criterio de aceptación**
DADO «Presupuesto de la cocina», pendiente y sin bitácora
CUANDO el usuario escriba «sobre el presupuesto de la cocina: ya hablé con Juan, me falta hablar con Rosa»
ENTONCES ve la tarjeta «Anotar avance · Presupuesto de la cocina» con el texto «Ya hablé con Juan, me falta hablar con Rosa»
Y CUANDO confirme
ENTONCES la bitácora de la tarea tiene ese avance, con la fecha y la hora de ahora, y la tarea sigue pendiente y en la misma franja
Y DADO también «Presupuesto del baño», pendiente
CUANDO escriba «avancé con el presupuesto: ya llamé al gasfitero»
ENTONCES ve las dos tareas como candidatas, y no se propone nada
Y CUANDO escriba «ya hablé con el contador» y ninguna tarea encaja
ENTONCES el asistente pregunta a qué tarea corresponde, y no se anota nada

---

### REQ-CUN03-22

**Requisito:** EL SISTEMA guardará cada avance con su texto, el momento en que se anotó con su zona horaria y la tarea a la que pertenece, en el orden en que se anotaron, y lo conservará mientras exista la tarea, aunque se cierre el episodio en que se contó o venza el plazo de la transcripción.

**Origen:** R-27; P-05; decisión 20 de `07-agente` (la transcripción, 90 días); propuesta de Franco del 25 de noviembre de 2026 (la fuente de verdad no es el chat)
**Tipo:** ubicuo

**Criterio de aceptación**
DADO el avance anotado en el criterio de REQ-CUN03-21
CUANDO el episodio se cierre, y más tarde se borre la transcripción de ese día
ENTONCES el avance sigue en la bitácora de «Presupuesto de la cocina», con su texto y su fecha
Y CUANDO se anote otro avance
ENTONCES los dos quedan en el orden en que se anotaron, y el primero no cambia

---

### REQ-CUN03-23

**Requisito:** CUANDO el usuario pregunte al asistente cómo va una tarea, EL SISTEMA responderá con la bitácora de esa tarea tal como está anotada, con la fecha de cada avance, sin añadir ni omitir ninguno; SI la tarea no tiene avances, ENTONCES lo dirá; y SI hay más de una tarea que encaja, ENTONCES mostrará las candidatas.

**Origen:** R-27; REQ-CUN03-14 (la respuesta tal como está); H-AGT-15; P-02
**Tipo:** complejo

**Criterio de aceptación**
DADO «Presupuesto de la cocina» con dos avances: «Ya hablé con Juan, me falta hablar con Rosa», del lunes 23, y «Rosa pasa el precio el viernes», del martes 24 de noviembre
CUANDO el usuario pregunte «¿cómo va el presupuesto de la cocina?»
ENTONCES la respuesta muestra los dos avances con su fecha, el más reciente primero, y nada que no esté anotado
Y CUANDO pregunte por «Renovar el DNI», que no tiene avances
ENTONCES el asistente dice que esa tarea no tiene avances anotados

---

### REQ-CUN03-24

**Requisito:** EL SISTEMA mostrará en la sección Tareas, en la web y en el móvil, el último avance de cada tarea que tenga bitácora, y permitirá desplegar en la misma tarea la bitácora completa, del avance más reciente al más antiguo.

**Origen:** R-27; R-17 (el hilo vive dentro de la tarea, nunca como sección propia); R-41 (lo mismo en las dos plataformas)
**Tipo:** ubicuo

**Criterio de aceptación**
DADO la tarea con dos avances del criterio de REQ-CUN03-23
CUANDO el usuario abra Tareas
ENTONCES bajo «Presupuesto de la cocina» ve «Martes 24 · Rosa pasa el precio el viernes»
Y CUANDO despliegue la bitácora
ENTONCES ve los dos avances con su fecha, sin salir de la sección
Y una tarea sin avances no muestra nada de bitácora

---

### REQ-CUN03-25

**Requisito:** MIENTRAS el asistente no esté disponible, EL SISTEMA seguirá mostrando la bitácora de cada tarea y encolará lo que se pida anotar, sin anotar nada; y SI la tarea está hecha o descartada, ENTONCES no admitirá avances nuevos.

**Origen:** R-42; P-11; REQ-CUN03-18; H-TP-01
**Tipo:** complejo

**Criterio de aceptación**
DADO que el proveedor de modelo no responde
CUANDO el usuario abra Tareas
ENTONCES ve el último avance de cada tarea y puede desplegar su bitácora
Y CUANDO escriba un avance sobre «Presupuesto de la cocina»
ENTONCES queda visible como en espera, no se anota nada y no se ofrece ningún formulario
Y DADO «Pagar el recibo de la luz», hecha
CUANDO el usuario le cuente un avance sobre ella
ENTONCES el asistente dice que la tarea ya está hecha y ofrece reabrirla, sin anotar nada

---

### REQ-CUN03-26

**Requisito:** DONDE el usuario diga, al pedir una tarea o al cambiarla, con quién o para qué es, EL SISTEMA lo guardará como contexto de la tarea, lo mostrará en la tarjeta y bajo la tarea en Tareas, y lo usará, junto con los avances, para reconocer de qué tarea se habla.

**Origen:** H-TP-26, precisada por Franco el 25 de noviembre de 2026 (la ficha de la tarea); REQ-CUN03-21
**Tipo:** opcional

**Criterio de aceptación**
DADO un usuario sin tareas
CUANDO escriba «recuérdame el presupuesto de la cocina, lo veo con Juan y Rosa» y confirme la tarjeta, que dice «Contexto · Lo veo con Juan y Rosa»
ENTONCES la tarea «Presupuesto de la cocina» queda con ese contexto, y en Tareas se lee bajo su texto
Y CUANDO escriba «ya hablé con Rosa: pasa el precio el viernes»
ENTONCES ve la tarjeta «Anotar avance · Presupuesto de la cocina», aunque el título no nombre a Rosa
Y una tarea registrada sin contexto no muestra ninguno

---

### REQ-CUN03-27

**Requisito:** CUANDO haya pasado la fecha de una tarea pendiente con fecha, EL SISTEMA mostrará sobre esa tarea, en Tareas, un aviso que ofrezca darla por hecha o mantenerla abierta; y SI el usuario la mantiene abierta, ENTONCES el aviso no volverá a mostrarse para esa fecha, y la tarea seguirá pendiente, marcada como vencida y admitiendo avances.

**Origen:** H-TP-28, decisión de Franco del 25 de noviembre de 2026 («pasada la fecha, una notificación para cerrar o mantener abierto»); R-27; H-TP-07; DP-01
**Tipo:** complejo

**Criterio de aceptación**
DADO «Renovar el DNI», pendiente, con fecha de ayer
CUANDO el usuario abra Tareas
ENTONCES sobre esa tarea ve «Venció el … ¿La das por hecha o la mantienes abierta?», con «Darla por hecha» y «Mantener abierta»
Y CUANDO pulse «Mantener abierta»
ENTONCES el aviso desaparece, también al volver a abrir Tareas, y la tarea sigue pendiente, con «Vencida»
Y CUANDO le cambie la fecha por conversación y esa nueva fecha también pase
ENTONCES el aviso vuelve a aparecer
Y CUANDO en otra tarea vencida pulse «Darla por hecha»
ENTONCES queda hecha como con «Hecho», con «Deshacer»

---

## 7. Lo que estaba en espera

### REQ-CUN03-17

**Requisito:** CUANDO existan las tareas personales, EL SISTEMA convertirá cada tarea que quedó en espera porque las tareas llegaban en una próxima versión en una propuesta de tarea, interpretada respecto del momento en que se capturó, y la mostrará en Tareas, en un grupo «Por confirmar», con lo que el usuario pidió y la tarea propuesta; no registrará ninguna sin su confirmación; y MIENTRAS no la confirme ni la descarte, la conservará: no caducará ni se descartará porque el usuario escriba otra cosa.

**Origen:** P-11 («al volver, lo encolado pasa por la confirmación de siempre»); REQ-AGT-02; REQ-CAP-24 (fechas relativas respecto de la captura); REQ-CAP-25; `SPEC.md` §10 («la conversión de las tareas en espera va en el hito 3»); decisión H-TP-11
**Tipo:** complejo
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO que el viernes 6 de noviembre de 2026 el usuario escribió «recuérdame pagar el recibo antes del sábado» y quedó en espera, y que las tareas personales llegan el lunes 9 de noviembre
CUANDO el usuario abra Tareas
ENTONCES ve «Por confirmar» con «Lo que pediste: recuérdame pagar el recibo antes del sábado» y la tarea «Pagar el recibo», para el sábado 7 de noviembre, marcada como vencida
Y la franja «en espera» de la agenda ya no la cuenta
Y no existe ninguna tarea nueva hasta que pulse «Confirmar»
Y CUANDO pulse «Confirmar»
ENTONCES la tarea aparece en «Con fecha» y desaparece de «Por confirmar»
Y DADO que no la confirma ni la descarta
CUANDO pasen dos días y escriba otras cosas al asistente
ENTONCES sigue en «Por confirmar»
Y SI no se pudo leer cuándo era, ENTONCES la propone sin fecha y la tarjeta lo dice

---

## 8. Sin asistente, privacidad y calendario

### REQ-CUN03-18

**Requisito:** MIENTRAS el asistente no esté disponible, EL SISTEMA mostrará las tareas existentes, mantendrá funcionando «Hecho», «Recibido», «Reabrir» y «Descartar» con su confirmación, y encolará las peticiones de crear o cambiar una tarea sin aplicar ninguna.

**Origen:** R-42; P-11; DP-01; REQ-CAP-24; REQ-CUN01-11 (por analogía)
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO que el proveedor de modelo no responde
CUANDO el usuario abra Tareas y pulse «Hecho» sobre «Pagar el recibo»
ENTONCES la lista se muestra completa y la tarea queda hecha
Y CUANDO pida «recuérdame comprar pan»
ENTONCES la petición queda visible como en espera, con el motivo de que el asistente no respondía, no se crea ninguna tarea y no se ofrece ningún formulario
Y al recuperarse el asistente, la petición pasa por la tarjeta de siempre

---

### REQ-CUN03-19

**Requisito:** EL SISTEMA mostrará las tareas personales únicamente a la persona que las tiene, y a nadie más de su organización, tampoco al responsable de su equipo.

**Origen:** RN-OP-01; RN-EST-01; P-10; REQ-ACC-17 («nunca ve las tareas que el miembro se creó para sí»)
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un colaborador con la tarea personal «Pedir cita médica» y el responsable de su equipo
CUANDO el responsable consulte el trabajo del equipo o le pregunte al asistente por las tareas del colaborador
ENTONCES no ve «Pedir cita médica» ni cuántas tareas personales tiene
Y CUANDO otro usuario de la organización consulte sus propias tareas
ENTONCES no aparece ninguna tarea del colaborador

---

### REQ-CUN03-20

**Requisito:** EL SISTEMA permitirá registrar, ver, completar, reabrir, cambiar y descartar tareas personales aunque el usuario no haya conectado su calendario de Google.

**Origen:** CUN-03 (no depende de EN-02); REQ-ACC-08 (el permiso de calendario solo bloquea lo que lo necesita)
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un usuario sin el calendario de Google conectado
CUANDO pida «recuérdame llamar al banco el jueves» y confirme
ENTONCES la tarea queda registrada y la ve en Tareas y en el nivel Hoy del jueves
Y el asistente no le pide conectar el calendario para eso

---

## 9. Lo que el Plan Personal no hace con las tareas

Dicho explícito para que no se cuele por analogía con `03-tareas`. Cubierto por REQ-CUN03-16 cuando la persona lo pide.

| No hace | Dónde está, si está |
|---|---|
| Asignar una tarea a otra persona, delegarla, pedirle algo a un compañero | CUN-07 (`03-tareas`, REQ-CUN07-01 a 19), solo el responsable del equipo (REQ-ACC-15) |
| Escribir o avisar a quien se espera | CUN-04 (`04-comunicaciones`) |
| Seguimiento del trabajo de otros | CUN-08 (`03-tareas` §8) |
| Estado «en curso», criterio de terminado, respuestas de terceros | CUN-07 y CUN-09 (R-16, R-19, RN-INF-02). Una tarea personal la da por hecha su dueño |
| Prioridades numéricas, subtareas, etiquetas | No están en ningún plan |
| Recurrencia | No en esta versión (las rutinas son de CUN-02) |
| Duración estimada y colocación en huecos del día | CUN-02 (`02-jornada`, REQ-CUN02-09) |
| Avisos a una hora («te lo recuerdo a las 9») | No en esta versión (decisión H-TP-10) |
| Categorías y ámbito laboral / personal | D-16, REQ-CUN02-19 |
| Hilo de la tarea | La **bitácora** (§6 bis) cubre lo que R-27 describe para el Plan Personal. El hilo de la conversación sobre la tarea sigue siendo REQ-AGT-05, sin plan |
| Apuntes (lo que se pensó o pasó y no pide nada) | `design/ARQUITECTURA-VISUAL-MOVIL.md` §2, sin requisito todavía |

---

## 10. Cambios que esta área pide en otras

No se aplican aquí: los edita quien integre, con su línea en `SPEC.md` §11.

| Dónde | Cambio propuesto |
|---|---|
| `07-agente`, REQ-AGT-02 | Versión 2: se quita la segunda oración («SI lo pedido es una tarea, la conservará en espera…») y su criterio sobre «recuérdame pagar el recibo». La versión 1 se conserva como anterior |
| `07-agente` §2 | La fila «Una tarea» pasa a citar esta área |
| `07-agente`, REQ-AGT-04 | La nota «en esta fase, la única actividad es el compromiso» suma la tarea personal (REQ-CUN03-15) |
| `07-agente` §5, decisión 27 | El desenlace `guardado` deja de producirse para tareas: registrar una tarea cierra el episodio como `registrado` |
| `02-agenda` §3.2 del plan y decisión 12 (H-AG-08) | Excepción: la propuesta que sale de convertir una tarea en espera no caduca (H-TP-11) |
| `01-captura`, REQ-CAP-25 | El ejemplo de motivo «las tareas llegan en una próxima versión» deja de existir; se cambia por otro motivo vigente |
| `04-comunicaciones`, REQ-CUN04-14 | Su efecto en el Plan Personal lo cumple REQ-CUN03-07; decidir si se marca cubierto o se reescribe para CUN-04 |
| `glosario.md`, «En espera» | Quitar «como una tarea (REQ-AGT-02)» del ejemplo de motivo cuando entre esta área |

---

## 11. Trazabilidad

| Sección | Caso de uso | Nivel de venta |
|---|---|---|
| 2, ciclo de vida (con fecha y sin fecha) | CUN-03 | Gratuito (`REPLANTEO.md` §4.3) |
| 2, esperando de alguien y recibido | CUN-03 | Personal según `REPLANTEO.md` §4.3; sin límite en esta versión (H-TP-12) |
| 3 y 4, lista y controles | CUN-03 | Gratuito |
| 5, tareas en Hoy | CUN-01, CUN-03 | Gratuito |
| 6, asistente | CUN-03 | Gratuito |
| 6 bis, bitácora, ficha y aviso al vencer | CUN-03 | Gratuito; R-27 la pone en el Plan Personal, sin marca de plan en esta versión (H-TP-12) |
| 7, conversión de lo en espera | Transversal | Gratuito |
| 8, sin asistente, privacidad y calendario | Transversal | Gratuito |

---

## Decisiones tomadas durante el diseño

Detectadas al escribir esta especificación el 6 de noviembre de 2026. **Pendientes de aval del equipo.** Lo que asume el plan mientras tanto está en `plan.md` §11.

| # | Decisión | Afecta |
|---|---|---|
| H-TP-01 | **Tres estados, no los de EN-04.** Una tarea personal está pendiente, hecha o descartada. «En curso» y el cumplimiento válido de RN-INF-02 son de la tarea delegada: aquí la da por hecha su dueño, sin criterio de terminado. La franja no es un estado: la calcula el código | REQ-CUN03-03 |
| H-TP-02 | **Sin fecha no es un dato que falta.** El asistente no pregunta por la fecha de una tarea; solo por qué hay que hacer, si no se entiende | REQ-CUN03-02 |
| H-TP-03 | **La fecha es un día del calendario de la persona**, con una hora límite opcional («antes de las 18:00»). Se guarda con la zona en que se dijo (P-05). Si la persona cambia de zona, la tarea conserva su día, igual que un compromiso conserva su instante (H-ACC-04); la hora límite se muestra con su zona cuando no es la del perfil | REQ-CUN03-01, 06, 07 |
| H-TP-04 | **Lo que se espera de alguien con fecha va solo a «Esperando de alguien»**: la fecha es cuándo debía llegar, no un plazo propio. Una tarea está en una sola franja | REQ-CUN03-03, 04 |
| H-TP-05 | **Orden de las franjas.** Con fecha: vencidas primero, después por fecha y hora. Sin fecha: la más reciente primero. Esperando: las pasadas de fecha primero, después la que más lleva esperando. Sin orden manual ni prioridades | REQ-CUN03-06 |
| H-TP-06 | **Las hechas se ven siete días al pie de su franja**, para reabrirlas; después solo quedan para la sección Actividad (hito 4). Las descartadas no se ven en ninguna parte de Tareas | REQ-CUN03-10, 11 |
| H-TP-07 | **«Hecho», «Recibido» y «Reabrir» desde la lista no llevan tarjeta**: no salen de NexoAI y se deshacen. Llevan «Deshacer» unos segundos. Pedidos al asistente, sí llevan tarjeta, porque él infiere la tarea. **Descartar lleva tarjeta siempre**, porque no se deshace | REQ-CUN03-09, 11, 15 |
| H-TP-08 | **Crear y cambiar solo por el asistente** (R-42), igual que registrar y modificar un compromiso. Lo que sí es control directo (DP-01): Hecho, Recibido, Reabrir y Descartar | REQ-CUN03-01, 12, 18 |
| H-TP-09 | **Una tarea con fecha no es un compromiso.** No va a Google, no cuenta como conflicto, no se sitúa en la línea de horas y no aparece en Semana ni en Mes: solo en el nivel Hoy, en un grupo propio debajo de los compromisos. Las vencidas solo se suman cuando el día mostrado es hoy. Revisable cuando entre CUN-02, que coloca tareas en huecos | REQ-CUN03-13 |
| H-TP-10 | **«Recuérdame» no programa un aviso.** En esta versión no hay notificaciones de tareas: la tarea aparece en Tareas y en Hoy en su fecha. La tarjeta no dice «te lo recordaré». Avisar es proactivo y, por la frontera de `REPLANTEO.md` §4.2, del Plan Personal; queda para después | REQ-CUN03-01, 16 |
| H-TP-11 | **La conversión de lo que estaba en espera no pasa por la conversación.** Las propuestas van a un grupo «Por confirmar» de Tareas, con «Confirmar» y «Descartar». Así no se encadenan tarjetas en la conversación ni se pierden cuando la persona escribe otra cosa (hoy, escribir otra cosa descarta la propuesta pendiente, REQ-AGT-01). **Es una excepción a H-AG-08**: estas propuestas no caducan a las 24 horas, porque quien se retrasó fue el sistema, no la persona. **Necesita aval expreso** | REQ-CUN03-17; H-AG-08 |
| H-TP-12 | **Sin límite por plan en esta versión.** `REPLANTEO.md` §4.3 pone «esperando de alguien» en el Plan Personal y las tareas en el Gratuito. Como no hay cifras ni marca de plan todavía (D-7, REQ-CAP-05), las tres franjas se ofrecen a todos; la marca entra con REQ-CAP-05 | §11 |
| H-TP-13 | **Las tareas asignadas (CUN-09) y los encargos (CUN-07) no son tareas personales** y no entran en las tres franjas. Dónde los ve el colaborador o el gerente lo dice `03-tareas`; la franja «Encargadas» de la web sigue siendo de esa área | REQ-CUN03-03, 06 |
| H-TP-14 | **«Pídele a alguien…» se ofrece como algo que se espera de esa persona**, sin escribirle. El ejemplo de la sección Tareas («Pídele a María Fernanda el informe para el lunes») tiene que llevar a eso en el Plan Personal, no a una delegación | REQ-CUN03-16 |
| H-TP-15 | **«Recibido» es dar por hecho** con su propio nombre y su propio texto («Recibido el…»). No convierte lo esperado en otra cosa: si hay que hacer algo después, la persona lo pide | REQ-CUN03-05 |
| H-TP-16 | **Mientras la conversión no termina**, la franja «en espera» de la agenda dice de esas tareas que se están preparando para confirmar, no que «llegan en una próxima versión», que ya no sería cierto | REQ-CUN03-17; REQ-CAP-25 |
| H-TP-17 | **Si al convertir no se puede leer cuándo era**, la tarea se propone sin fecha y la tarjeta lo dice, en vez de quedarse en espera para siempre o de inventar una fecha | REQ-CUN03-17 |
| H-TP-18 | **Con la petición «¿qué tengo pendiente esta semana?»**, las tareas sin fecha y lo que se espera de alguien no se listan, porque no caen en ningún período (R-38). Las vencidas, sí | REQ-CUN03-14 |
| H-TP-19 | **El modelo se llama `tarea_personal`** porque las tareas del equipo (CUN-07, con asignado y responsable) irán aparte, por REQ-ACC-17 y P-10 (H-EMP-10, responde a INC-24, antes numerada INC-21 en el informe del carril). Decisión del 7 de noviembre de 2026. Las rutas siguen siendo `/tareas` y los tipos de Operación `tareas.*`. Se aparta de `plan.md` §3.1, que la llamaba `tarea` | REQ-CUN03-19 |
| H-TP-20 | **Seis tipos de Operación, no cinco** (encargo de la cuarta tanda, 7 de noviembre de 2026). `tareas.modificar` se llama `tareas.cambiar`, y «Recibido» tiene su propio tipo, `tareas.recibido`, en vez de ser `tareas.completar` con otro texto: la auditoría distingue algo hecho de algo recibido. `tareas.completar` solo vale para lo que no se espera de nadie y `tareas.recibido` solo para lo que sí; el atajo «Hecho» y la herramienta eligen el tipo por la tarea | REQ-CUN03-05, 09, 15; H-TP-15 |
| H-TP-21 | **Los textos de una tarea los arma la API** («Sábado 14 de noviembre · Antes de las 18:00», «Vencía el…», «De Juan · Desde el…, hace 6 días», «Hecha el…», «Recibido el…»), en la zona del perfil, y la web y el móvil solo los pintan. Así las dos dicen lo mismo (R-41) sin copiar el formato dos veces. Se aparta de `plan.md` §8, que los formateaba en cada cliente | REQ-CUN03-06, 07, 10 |
| H-TP-22 | **Lo que se espera de alguien no entra en «Tareas para este día»**, aunque su fecha sea ese día: es cuándo debía llegar, no un plazo propio (H-TP-04). Solo las tareas de «Con fecha» | REQ-CUN03-13 |
| H-TP-23 | **Qué tareas encajan con lo dicho** se decide en código: se comparan las palabras con sentido por su comienzo (cinco letras) y ganan las que más comparten; con un empate entre varias, se muestran como candidatas. «Ya pagué el recibo» encaja con «Pagar el recibo de la luz» y «del agua» por «recibo». Revisable con la evaluación del modelo | REQ-CUN03-15 |
| H-TP-24 | **La tarjeta de algo que se espera de alguien dice «NexoAI no le escribe a …»**, armado por el código. Cumple lo que pide REQ-CUN03-16 («dice que no le escribe a nadie») sin otra vuelta del modelo, que no la hay porque la tarjeta detiene el grafo | REQ-CUN03-04, 16 |
| H-TP-26 | **Para anotar un avance, el modelo elige la tarea mirando la ficha de cada pendiente**: texto, contexto (REQ-CUN03-26), cuándo o de quién, y sus tres últimos avances, que le da el código marcados como datos (H-AGT-15). La tarjeta nombra la tarea para que la persona vea si se equivocó (REQ-CUN03-21). Si el modelo no da un id, el código compara lo dicho con el texto, el contexto y los avances de cada ficha (la regla de H-TP-23, ampliada); con un empate muestra candidatas, y sin ninguna, se pregunta a qué tarea corresponde. *Propuesto el 25 de noviembre de 2026; **precisado por Franco** el mismo día: la ficha se caracteriza más para que el asistente discierna el contexto* | REQ-CUN03-21, 23; H-TP-23 |
| H-TP-27 | **La bitácora no se corrige ni se borra avance por avance** en esta versión: un avance equivocado se corrige anotando otro. Se borra con la tarea. *Aceptada por Franco el 25 de noviembre de 2026* | REQ-CUN03-22 |
| H-TP-28 | **R-27 dice que el hilo del Plan Personal «se cierra con un límite de tiempo».** **Decidida por Franco el 25 de noviembre de 2026:** no se cierra sola. Cuando pasa la fecha de la tarea, un aviso le ofrece a la persona darla por hecha o mantenerla abierta (REQ-CUN03-27); la bitácora deja de admitir avances solo cuando la tarea queda hecha o descartada (REQ-CUN03-25). Una tarea sin fecha no tiene aviso | REQ-CUN03-25, 27; R-27 |
| H-TP-29 | **La respuesta a «¿cómo va X?» la arma el código** con los avances tal como están (REQ-CUN03-23), como la lista de REQ-CUN03-14. Un resumen redactado por el modelo («falta hablar con Rosa») queda para después: podría añadir u omitir algo. *Aceptada por Franco el 25 de noviembre de 2026* | REQ-CUN03-23; P-02 |
| H-TP-30 | **El aviso al vencer vale para toda tarea vencida de «Con fecha»**, tenga o no bitácora: decidir si cerrarla es lo mismo con o sin avances. Lo que se espera de alguien con la fecha pasada no lleva aviso: su fecha es cuándo debía llegar (H-TP-04) y ya se marca como pasada | REQ-CUN03-27 |
| H-TP-31 | **«Mantener abierta» es un control directo sin tarjeta**, como «Hecho» (H-TP-07): no sale de NexoAI y solo quita el aviso. Pasa por una Operación (AD-09) para que quede en la auditoría. Vale **para esa fecha**: si la fecha cambia y vuelve a pasar, el aviso vuelve. «Darla por hecha» es el mismo «Hecho» de la lista, con «Deshacer» | REQ-CUN03-27 |
| H-TP-32 | **El aviso no es una notificación del teléfono ni un correo**: en esta versión no hay avisos de tareas fuera de la aplicación (H-TP-10). Se ve en Tareas, sobre la tarea, en la web y en el móvil. Llevarlo a una notificación queda para cuando las haya | REQ-CUN03-27; H-TP-10 |
| H-TP-25 | **«Las hechas de los últimos siete días»** son las de las últimas 168 horas desde el momento de la consulta, no siete días de calendario | REQ-CUN03-10; H-TP-06 |
