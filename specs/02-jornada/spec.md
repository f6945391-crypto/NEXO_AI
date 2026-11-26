# Especificación — Jornada (CUN-02 Planificar jornada)

**Origen:** Entregable 1. Caso de uso CUN-02, trabajador TN-01 Asistente Personal Inteligente, entidades EN-01 Perfil de Usuario, EN-02 Evento de Agenda, EN-03 Planificación de Jornada y EN-04 Tarea. Reglas RN-EST-01 y RN-EST-02.
**Notación:** EARS.
**Plataforma:** móvil.
**Nivel de venta:** Plan Personal, salvo el registro de tiempo real de la sección 5, que es Gratuito.

---

## 1. Por qué este caso de uso define el Plan Personal

La frontera acordada entre niveles es: **el Gratuito responde a lo que le piden; el Personal propone sin que se lo pidan.** CUN-02 es el primer caso de uso del modelo que propone. Todo lo demás del Plan Personal se apoya en él o lo alimenta.

Y trae, ya escrito en el Entregable 1, el cuello de botella más caro de la vida de una persona: su excepción dice «actividades imposibles de acomodar bajo las condiciones disponibles». Es decir, **el modelo ya previó el caso de que el día no entre**, que es justo lo que un calendario corriente nunca dice.

---

## 2. Alcance

Organizar las actividades del usuario dentro de una jornada: proponer un orden, avisar cuando no cabe, rehacerlo cuando algo se cae, y **verificar después qué ocurrió de verdad**.

Desde el 7 de noviembre de 2026 incluye también **consultar lo que pasó** en la sección Actividad (§8 bis), que es la cara visible de esa verificación.

Queda fuera la coordinación entre varias personas, que es CUN-05 y CUN-06.

---

## 3. La propuesta de jornada

### REQ-CUN02-01

**Requisito:** CUANDO el usuario solicite organizar su jornada, EL SISTEMA consultará sus compromisos existentes y sus tareas pendientes antes de generar ninguna propuesta.

**Origen:** CUN-02 flujo principal, pasos 1 a 3
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario con compromisos y tareas registradas
CUANDO solicite organizar su día
ENTONCES el sistema ha consultado ambas fuentes antes de presentar resultado alguno

---

### REQ-CUN02-02

**Requisito:** EL SISTEMA considerará las restricciones y preferencias declaradas del usuario al generar la propuesta.

**Origen:** CUN-02 flujo principal, paso 4
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un usuario que declaró no trabajar antes de las 09:00
CUANDO se genere la propuesta
ENTONCES ninguna actividad propuesta empieza antes de esa hora

---

### REQ-CUN02-03

**Requisito:** MIENTRAS la propuesta no haya sido aceptada por el usuario, EL SISTEMA no modificará su agenda.

**Origen:** CUN-02 pasos 6 y 7; RN-ER-03
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO una propuesta presentada y no aceptada
CUANDO el usuario cierre la aplicación o la descarte
ENTONCES la agenda queda exactamente como estaba

---

### REQ-CUN02-04

**Requisito:** CUANDO el usuario acepte la propuesta, EL SISTEMA la registrará como Planificación de Jornada y quedará disponible para su consulta.

**Origen:** CUN-02 pasos 7 y 8
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una propuesta aceptada
CUANDO el usuario vuelva a abrir su día
ENTONCES ve la planificación registrada, no una propuesta nueva

---

### REQ-CUN02-05

**Requisito:** CUANDO el usuario solicite modificaciones, EL SISTEMA regenerará la propuesta con las condiciones nuevas.

**Origen:** CUN-02 flujo alternativo
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una propuesta presentada
CUANDO el usuario mueva una actividad o declare que algo no puede ir a esa hora
ENTONCES el sistema recalcula el resto del día con esa condición

---

### REQ-CUN02-06

**Requisito:** CUANDO una actividad ya planificada deje de ocurrir, EL SISTEMA ofrecerá rehacer lo que queda de la jornada.

**Origen:** CUN-02 flujo alternativo
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una jornada aceptada con una reunión de dos horas a mediodía
CUANDO el usuario indique que esa reunión se canceló
ENTONCES el sistema ofrece redistribuir lo que quedaba, sin tocar lo ya ocurrido

---

## 4. Cuando el día no entra

### REQ-CUN02-07

**Requisito:** SI existen actividades imposibles de acomodar bajo las condiciones disponibles, ENTONCES EL SISTEMA lo informará indicando cuáles y ofrecerá qué sacar, qué mover o qué condición relajar.

**Origen:** CUN-02 excepción
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un día con nueve horas de compromisos y cinco horas de tareas con vencimiento ese mismo día
CUANDO se solicite organizar la jornada
ENTONCES el sistema declara explícitamente que no entra, nombra las actividades que sobran, y ofrece al menos una salida concreta
Y no presenta una jornada aparentemente válida que omita lo que no cabía

---

### REQ-CUN02-08

**Requisito:** SI el usuario solicita situar una actividad en un día donde no cabe, ENTONCES EL SISTEMA no la colocará a la fuerza: la registrará como pendiente sin fecha e informará del motivo.

**Origen:** regla de producto R-1; CUN-02 excepción
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un jueves sin ningún intervalo libre de la duración pedida
CUANDO el usuario pida situar ahí una actividad de dos horas
ENTONCES el sistema no desplaza nada sin permiso, registra la actividad como pendiente sin fecha, y dice por qué

**Nota.** Meter algo donde no entra es lo que hace que la gente deje de confiar en su calendario. Un pendiente sin fecha es honesto; una jornada imposible no.

---

### REQ-CUN02-09

**Requisito:** SI la información de una actividad es insuficiente para planificarla, ENTONCES EL SISTEMA solicitará únicamente el dato que falta, de uno en uno.

**Origen:** CUN-02 excepción; regla de producto R-20
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO una tarea sin duración estimada
CUANDO se intente planificar la jornada
ENTONCES el sistema pregunta solo por la duración, y no despliega un formulario con todos los campos

---

## 5. Lo que de verdad ocurrió

Esta sección es la que sostiene los informes, el seguimiento de rutinas, el seguimiento con horizonte y el acompañamiento. **Sin ella, todo eso compara el plan contra nada.**

### REQ-CUN02-10

**Requisito:** EL SISTEMA no registrará tiempo dedicado sin confirmación explícita del usuario.

**Origen:** regla de producto R-2
**Tipo:** ubicuo

**Criterio de aceptación**
DADO cualquier señal disponible —ubicación, modo concentración, bloque planificado—
CUANDO el sistema deduzca que una actividad ocurrió
ENTONCES lo presenta como propuesta y no lo da por registrado hasta que el usuario lo confirme o ajuste

**Nota.** Es RN-ER-03 por otra razón. Allí se confirma porque la acción es irreversible; aquí porque **el registro solo vale si es verdadero**. En cuanto el usuario ve una hora mal puesta, deja de mirar los informes para siempre.

---

### REQ-CUN02-11

**Requisito:** CUANDO termine la jornada, EL SISTEMA presentará los bloques planificados en una sola interacción para que el usuario los confirme, los descarte o ajuste su duración real.

**Origen:** regla de producto R-3
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una jornada con cinco bloques planificados
CUANDO llegue el cierre del día
ENTONCES el sistema pregunta una sola vez por los cinco, no cinco veces por uno

---

### REQ-CUN02-12

**Requisito:** CUANDO el usuario declare tiempo dedicado a una actividad que no estaba planificada, EL SISTEMA propondrá el intervalo correspondiente y pedirá confirmación de la hora antes de registrarlo.

**Origen:** regla de producto R-2; necesidad declarada del Plan Personal
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario que dice «estudié dos horas esta tarde»
CUANDO el sistema interprete la declaración
ENTONCES propone un intervalo concreto —por ejemplo 15:00 a 17:00—, permite corregirlo, y solo registra tras la confirmación

---

### REQ-CUN02-13

**Requisito:** DONDE el usuario inicie un cronómetro de actividad, EL SISTEMA registrará el intervalo al cerrarlo, y advertirá si permanece abierto más allá de una duración razonable.

**Origen:** necesidad declarada del Plan Personal
**Tipo:** funcionalidad opcional

**Criterio de aceptación**
DADO un cronómetro iniciado y no cerrado
CUANDO hayan pasado más horas de las plausibles para esa actividad
ENTONCES el sistema pregunta si sigue en curso en vez de registrar una duración falsa

---

## 6. Rutinas, desplazamiento y concentración

### REQ-CUN02-14

**Requisito:** DONDE el usuario haya declarado una rutina recurrente sin hora fija, EL SISTEMA la situará en un intervalo libre que cumpla su frecuencia declarada, y la recolocará cuando la jornada cambie.

**Origen:** necesidad declarada del Plan Personal; CUN-01 y CUN-02
**Tipo:** funcionalidad opcional

**Criterio de aceptación**
DADO una rutina de «tres veces por semana, una hora»
CUANDO se planifique la semana y el martes se llene
ENTONCES el sistema la sitúa en otro día de esa semana, no la pierde ni la duplica

---

### REQ-CUN02-15

**Requisito:** EL SISTEMA considerará el tiempo de desplazamiento entre compromisos consecutivos que ocurran en lugares distintos.

**Origen:** necesidad declarada del Plan Personal
**Tipo:** ubicuo

**Criterio de aceptación**
DADO dos compromisos seguidos en direcciones distintas
CUANDO se genere la propuesta
ENTONCES el intervalo entre ambos contempla el desplazamiento, y no se propone ninguna actividad en ese hueco

---

### REQ-CUN02-16

**Requisito:** SI el desplazamiento no cabe entre dos compromisos consecutivos, ENTONCES EL SISTEMA lo advertirá antes de que el usuario acepte la propuesta.

**Origen:** REQ-CUN02-15
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO una reunión que termina a las 15:00 en un sitio y otra que empieza a las 15:10 en otro a 40 minutos
CUANDO se presente la propuesta
ENTONCES el sistema lo señala como imposible antes de aceptar, no después

---

### REQ-CUN02-17

**Requisito:** DONDE el usuario haya declarado necesidad de concentración, EL SISTEMA reservará intervalos continuos de al menos la duración mínima declarada, sin fragmentarlos.

**Origen:** CUN-02 flujo principal, paso 4
**Tipo:** funcionalidad opcional

**Criterio de aceptación**
DADO una necesidad declarada de bloques de noventa minutos
CUANDO el día solo permita tres huecos de treinta
ENTONCES el sistema no los presenta como bloque de concentración, y lo dice

---

### REQ-CUN02-18

**Requisito:** MIENTRAS un bloque de concentración esté en curso, EL SISTEMA podrá activar el modo de no interrupción del dispositivo si el usuario concedió ese permiso, y lo restaurará al terminar.

**Origen:** necesidad declarada del Plan Personal; RN-OP-01
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO un permiso concedido y un bloque en curso
CUANDO el bloque termine o el usuario lo cancele
ENTONCES el dispositivo vuelve al estado que tenía antes, sin dejar el modo activado

---

### REQ-CUN02-19

**Requisito:** EL SISTEMA distinguirá el ámbito laboral o personal de cada compromiso y cada tarea.

**Origen:** necesidad declarada del Plan Personal; decisión D-10
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un conjunto de actividades de ambos ámbitos
CUANDO el usuario consulte su semana
ENTONCES puede distinguir cuáles son de trabajo y cuáles no, sin tener que recordarlo

---

## 7. Acompañamiento

### REQ-CUN02-20

**Requisito:** DONDE se cumpla una condición de acompañamiento —el día no entra, cierre de semana, o un patrón repetido detectado en el registro—, EL SISTEMA podrá ofrecer una sesión de acompañamiento, descartable en un gesto.

**Origen:** CUN-02 flujo alternativo; regla de producto R-5
**Tipo:** funcionalidad opcional

**Criterio de aceptación**
DADO que el usuario ha desplazado la misma rutina tres veces seguidas
CUANDO abra la aplicación
ENTONCES el sistema puede ofrecer revisarlo, y descartarlo no deja nada pendiente ni vuelve a insistir ese día

---

### REQ-CUN02-21

**Requisito:** MIENTRAS una sesión de acompañamiento esté abierta, EL SISTEMA solo afirmará hechos verificables desde el registro de actividad del usuario.

**Origen:** regla de producto R-6
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO una sesión abierta
CUANDO el sistema comente el avance
ENTONCES dice «moviste esto tres veces» o «cumpliste cuatro de seis bloques», y no emite valoraciones sobre la persona ni sobre su estado de ánimo

---

### REQ-CUN02-22

**Requisito:** CUANDO una sesión de acompañamiento termine, EL SISTEMA registrará el cambio acordado sobre el plan, o declarará explícitamente que no hubo cambio.

**Origen:** regla de producto R-5
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una sesión que concluye sin acuerdo
CUANDO se cierre
ENTONCES el sistema lo dice, y no deja la impresión de que algo cambió

---

### REQ-CUN02-23

**Requisito:** DONDE el usuario lo solicite al registrar un compromiso futuro, EL SISTEMA generará una planificación del período hasta esa fecha y la revisará con la periodicidad acordada.

**Origen:** CUN-02; EN-03 leída como «período determinado», decisión D-9
**Tipo:** funcionalidad opcional

**Criterio de aceptación**
DADO un compromiso dentro de veinte días y una revisión semanal solicitada
CUANDO llegue cada revisión
ENTONCES el sistema presenta bloques cumplidos frente a planificados y tiempo dedicado, y propone redistribuir si va por detrás
Y en ningún caso afirma si el usuario está preparado o no

---

## 8. Modo degradado

### REQ-CUN02-24

**Requisito:** MIENTRAS el asistente no esté disponible, EL SISTEMA mostrará la jornada planificada y el tiempo ya registrado, y encolará las nuevas declaraciones de tiempo sin registrarlas.

**Origen:** regla de producto R-42; `SPEC.md` P-11
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO que el proveedor de modelo no responde
CUANDO el usuario abra su día y declare «de 10 a 12 estuve con la tesis»
ENTONCES ve su jornada y lo registrado, la declaración queda visible como en espera, y el sistema declara que no hay propuestas automáticas
Y no se registra ese tiempo hasta que la persona lo avale al recuperarse el asistente (R-2)
Y confirmar un bloque ya propuesto se registra en el momento, porque no necesita al asistente (DP-01, provisional)
Y ese estado **no se parece** al de una función que no está incluida en su plan

> **Reescrito el 22 de octubre de 2026 (INC-01).** Antes decía «registrar tiempo dedicado de forma manual».

---

## 8 bis. Consultar lo que pasó (sección Actividad)

**Añadida el 7 de noviembre de 2026.** Origen: `PLAN-VALOR-USUARIO.md` hito 4 («Actividad: lo que pasó») y §5 (qué entra en esta versión: compromisos pasados, tareas completadas y registro del asistente; sin informes de horas); `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 («Agenda es lo que va a pasar. Actividad es lo que pasó. El día es la costura») y §3 ter. Se numera «8 bis» y empieza en REQ-CUN02-25 porque §8 y REQ-CUN02-24 ya existían (H-JOR-01).

**Plataforma:** web y móvil. **Nivel de venta:** todos los planes; es consulta de lo propio.

Esta sección es la primera parte visible de §5: enseña lo que ya ocurrió sin pedirle nada a la persona. El registro de tiempo de REQ-CUN02-10 a 13 llega después y se sumará al mismo día; hasta entonces Actividad muestra lo que el sistema ya sabe con certeza: los compromisos que terminaron y lo que el asistente hizo con confirmación.

### REQ-CUN02-25

**Requisito:** CUANDO el usuario abra la sección Actividad, EL SISTEMA mostrará lo ocurrido en el período del nivel elegido —Día, Semana o Mes—, con el mismo selector de nivel que Agenda; abrirá siempre en Día con la fecha de hoy, y permitirá pasar al período anterior, volver al siguiente hasta el actual y volver al actual en un gesto.

**Origen:** `PLAN-VALOR-USUARIO.md` hito 4; `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 («Agenda y Actividad usan el mismo selector de período»; «el nivel día abre siempre por defecto») y §3 bis (el selector de período no tiene vuelta). Añadido el 7 de noviembre de 2026
**Tipo:** dirigido por evento
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un usuario que ayer miró Actividad en el nivel Mes
CUANDO vuelva a abrir la sección
ENTONCES ve el nivel Día con la fecha de hoy, y el selector ofrece Día, Semana y Mes como en Agenda
Y CUANDO elija Semana y pase a la semana anterior
ENTONCES ve lo ocurrido en esa semana, con un control para volver a esta semana
Y desde el período actual no puede pasar a uno futuro: lo que va a pasar está en Agenda (H-JOR-08)

---

### REQ-CUN02-26

**Requisito:** EL SISTEMA mostrará en Actividad los compromisos del período que ya terminaron, cada uno con su hora de inicio y de fin y su duración; no mostrará los cancelados ni los que todavía no han terminado.

**Origen:** `PLAN-VALOR-USUARIO.md` hito 4 y §5 («compromisos pasados»); EN-02 Evento de Agenda; R-25 (lo cancelado no se borra, pero no ocurrió). Añadido el 7 de noviembre de 2026
**Tipo:** ubicuo
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un usuario con tres compromisos hoy —uno de 09:00 a 10:00, otro de 11:00 a 11:30 que se canceló y otro de 18:00 a 19:00— y son las 12:00
CUANDO abra Actividad en el nivel Día
ENTONCES ve solo el de 09:00 a 10:00, con «09:00 – 10:00» y «1 h»
Y no ve el cancelado ni el de las 18:00
Y un compromiso que empezó y todavía no termina tampoco aparece hasta que termine

---

### REQ-CUN02-27

**Requisito:** EL SISTEMA mostrará en Actividad el registro del asistente del período: cada acción que la persona confirmó y que se ejecutó, con la hora en que se ejecutó, qué se hizo y desde dónde se pidió —la conversación o un control de la pantalla—; no mostrará lo descartado, lo que espera confirmación, lo que está en espera ni lo que no llegó a ejecutarse.

**Origen:** `PLAN-VALOR-USUARIO.md` hito 4 («qué hizo por ella, cuándo»); RN-ER-03 y P-03 (solo se ejecuta lo confirmado); DP-01 (controles directos). Añadido el 7 de noviembre de 2026
**Tipo:** ubicuo
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un usuario que hoy confirmó en la conversación registrar «Dentista», canceló «Demo con el cliente» desde la pantalla y descartó una propuesta de mover «Comité»
CUANDO abra Actividad en el nivel Día
ENTONCES ve dos acciones, cada una con su hora de ejecución: «Registró un compromiso», con los datos que confirmó y «En la conversación», y «Canceló un compromiso», con «Desde la pantalla»
Y no ve la propuesta descartada
Y lo que sigue en espera o esperando su confirmación tampoco aparece

---

### REQ-CUN02-28

**Requisito:** MIENTRAS el nivel Día de Actividad muestre la fecha de hoy, EL SISTEMA mostrará solo lo ocurrido hasta ese momento y lo dirá, y lo que queda del día seguirá en el nivel Hoy de Agenda.

**Origen:** `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 («El día es la costura, y por eso el nivel Hoy enseña las dos cosas: el plan y lo registrado»). Añadido el 7 de noviembre de 2026
**Tipo:** dirigido por estado
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un compromiso de 09:00 a 10:00 y otro de 18:00 a 19:00, y son las 12:00
CUANDO el usuario abra Actividad en Día
ENTONCES ve el de las 09:00 bajo un rótulo que dice que es lo ocurrido hasta ahora
Y CUANDO abra Agenda en Hoy
ENTONCES ve los dos, como siempre
Y cuando exista el registro de tiempo (REQ-CUN02-10 a 13), lo registrado de hoy se sumará a este mismo día, sin otra pantalla

---

### REQ-CUN02-29

**Requisito:** SI el usuario no tiene el calendario conectado, ENTONCES EL SISTEMA mostrará igualmente el registro del asistente del período y, en el lugar de los compromisos, explicará que aparecen al conectar el calendario, sin presentarlo como un error.

**Origen:** REQ-ACC-08 (un permiso que falta no bloquea lo demás); `SPEC.md` P-11 (lo existente sigue consultable). Añadido el 7 de noviembre de 2026
**Tipo:** comportamiento no deseado
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un usuario sin el calendario conectado que hoy confirmó el cambio de su zona horaria
CUANDO abra Actividad en Día
ENTONCES ve esa acción en el registro del asistente
Y en lugar de los compromisos lee que aparecen cuando conecte su calendario
Y SI el calendario está conectado pero no responde, ve la última copia de sus compromisos (H-JOR-10)

---

### REQ-CUN02-30

**Requisito:** SI en el período elegido no hay ni compromisos terminados ni acciones del asistente, ENTONCES EL SISTEMA mostrará un estado vacío que nombre ese período; y SI solo uno de los dos bloques está vacío, lo dirá dentro de ese bloque.

**Origen:** REQ-CUN01-12 (el estado vacío es un requisito propio); `design/CONTEXTO.md` (listas llenas y listas vacías). Añadido el 7 de noviembre de 2026
**Tipo:** comportamiento no deseado
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un usuario sin compromisos terminados ni acciones esta semana
CUANDO elija Semana en Actividad
ENTONCES ve un estado vacío que habla de esta semana, distinto del de Día y del de Mes
Y el estado vacío no ofrece crear nada (REQ-CUN02-31)
Y DADO un día con compromisos y sin acciones del asistente, el bloque del asistente dice que ese día no hizo nada por él, y el de compromisos se ve completo

---

### REQ-CUN02-31

**Requisito:** EL SISTEMA no ofrecerá desde Actividad ninguna acción que cree, cambie, cancele o registre algo; Actividad solo muestra.

**Origen:** `PLAN-VALOR-USUARIO.md` hito 4 («requisitos de consulta, sin acciones»); R-42 y DP-01 (los controles directos viven en Hoy de Agenda); REQ-CUN02-10 a 13 (el registro de tiempo llega después). Añadido el 7 de noviembre de 2026
**Tipo:** ubicuo
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un compromiso terminado y una acción del asistente visibles en Actividad
CUANDO el usuario los mire
ENTONCES no hay botón para cancelar, mover, repetir, deshacer ni registrar tiempo
Y la conversación en la web, y el asa en el móvil, siguen disponibles como en cualquier sección

---

### REQ-CUN02-32

**Requisito:** CUANDO existan tareas personales, EL SISTEMA mostrará en Actividad las tareas completadas en el período, con la hora en que se completaron.

**Origen:** `specs/09-tareas-personales/spec.md` (CUN-03, tareas personales); `PLAN-VALOR-USUARIO.md` hito 4 y §5 («tareas completadas»). Añadido el 7 de noviembre de 2026 para reservar su sitio: se construye cuando las tareas personales estén integradas (H-JOR-12)
**Tipo:** dirigido por evento
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un usuario que el martes completó «Pagar el recibo de luz»
CUANDO abra Actividad en Semana
ENTONCES ve esa tarea en el martes, con la hora en que la completó
Y una tarea descartada o todavía pendiente no aparece

---

### REQ-CUN02-33

**Requisito:** EL SISTEMA presentará cada nivel de Actividad en dos bloques, «Compromisos» y «Lo que hizo el asistente», cada uno con cuántos elementos tiene; en Día, por hora; en Semana y en Mes, agrupados por día y por hora dentro de cada día, mostrando solo los días con algo, de la misma forma en web y móvil.

**Origen:** `design/ARQUITECTURA-VISUAL-MOVIL.md` §3 ter («Actividad contesta "cuánto"») y §3 bis; R-21 (los informes de horas quedan para después); `PLAN-VALOR-USUARIO.md` hito 4. Añadido el 7 de noviembre de 2026
**Tipo:** ubicuo
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO una semana con dos compromisos terminados el lunes, ninguno el martes y una acción del asistente el miércoles
CUANDO el usuario elija Semana en Actividad
ENTONCES el bloque «Compromisos» dice «2» y muestra el lunes con sus dos compromisos, y no muestra el martes
Y el bloque «Lo que hizo el asistente» dice «1» y muestra el miércoles con su acción
Y no hay barras ni horas sumadas (H-JOR-09)

---

### REQ-CUN02-34

**Requisito:** EL SISTEMA mostrará en Actividad solo lo de la propia persona, con las horas en su zona horaria y la zona a la vista, también para la cuenta del colaborador.

**Origen:** REQ-CUN01-09, REQ-CUN01-10; `SPEC.md` P-04 y P-05; REQ-ACC-13. Añadido el 7 de noviembre de 2026
**Tipo:** ubicuo
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO dos personas de la misma organización, cada una con compromisos terminados y acciones del asistente
CUANDO una abra Actividad
ENTONCES ve solo lo suyo
Y las horas están en la zona de su perfil, con la zona dicha («Hora de Lima (GMT-5)»)

---

### REQ-CUN02-35

**Requisito:** MIENTRAS el asistente no esté disponible, EL SISTEMA seguirá mostrando Actividad completa.

**Origen:** `SPEC.md` P-11 («lo existente sigue consultable»); REQ-CUN02-24. Añadido el 7 de noviembre de 2026
**Tipo:** dirigido por estado
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO que el proveedor del modelo no responde
CUANDO el usuario abra Actividad
ENTONCES ve sus compromisos terminados y el registro del asistente igual que con el asistente disponible

---

## 9. Lo que NO hace el asistente en este caso de uso

Delimitarlo es decisión de arquitectura, no detalle. Coherente con AD-05 y §7.3 de la propuesta técnica:

- **No calcula la disponibilidad** ni la intersección de intervalos: eso es código determinista.
- **No decide si una actividad se cumplió**: eso lo declara el usuario (REQ-CUN02-10).
- **No evalúa a la persona.** Ni su desempeño, ni su preparación, ni su estado.
- **No registra nada por inferencia.** Propone; la persona confirma.

El modelo interpreta la solicitud, ordena, redacta y explica. Lo que tiene consecuencia lo decide el código o la persona.

---

## 10. Pendiente

1. **Ámbito como propiedad de la categoría** (D-16, que reemplaza a D-10): REQ-CUN02-19 lo necesita declarado en el modelo.
2. **EN-03 como período** (D-9): REQ-CUN02-23 se apoya en esa lectura.
3. **Cifras del Plan Gratuito** (D-7): sin ellas no se puede decir qué parte de esta especificación queda fuera del nivel gratuito.
4. **Sin diseño.** Ningún cuadro de Figma cubre todavía este caso de uso.

---

## 11. Decisiones tomadas durante el diseño

Lo que la especificación no decía y hubo que decidir. **Pendientes de revisión del equipo**; se listan para `SPEC.md` §8.

### Detectadas al especificar Actividad · 7 de noviembre de 2026

| # | Decisión | Afecta |
|---|---|---|
| H-JOR-01 | **Numeración.** El encargo pedía una sección «8» desde REQ-CUN02-24, pero §8 (modo degradado) y REQ-CUN02-24 ya existían. Como los identificadores no se reutilizan ni se renumeran, la sección nueva es «8 bis» y empieza en REQ-CUN02-25 | REQ-CUN02-25 a 35 |
| H-JOR-02 | Los períodos se cuentan en la **zona del perfil**: Día de medianoche a medianoche; Semana de lunes a domingo (como la decisión 20 de `02-agenda`); Mes del día 1 al último | REQ-CUN02-25, 34 |
| H-JOR-03 | Un compromiso **ocurrió** cuando no está cancelado y su fin ya pasó. Entra en el período si lo toca, y se agrupa en el día en que empezó (o en el primer día del período, si empezó antes). Uno de todo el día aparece cuando el día terminó. La duración es la del compromiso entero | REQ-CUN02-26, 33 |
| H-JOR-04 | Lo que **falló al ejecutarse** no entra en el registro del asistente, igual que lo descartado: no tuvo efecto. Lo que está en espera o esperando confirmación tampoco | REQ-CUN02-27 |
| H-JOR-05 | La hora de una acción del asistente es **la de su ejecución**, no la de la propuesta ni la de la captura | REQ-CUN02-27 |
| H-JOR-06 | «Qué se hizo» es una frase corta en pasado según el tipo de acción («Registró un compromiso», «Cambió un compromiso», «Canceló un compromiso», «Cambió tu zona horaria») y debajo **los datos de la tarjeta que se confirmó**, porque lo hecho es lo mostrado (REQ-CUN01-04). Un tipo sin frase propia usa el título de su tarjeta | REQ-CUN02-27 |
| H-JOR-07 | «Desde dónde» se dice en palabras llanas: «En la conversación» si lo propuso el asistente, «Desde la pantalla» si fue un control directo (DP-01) | REQ-CUN02-27 |
| H-JOR-08 | No se avanza más allá del período actual: lo que va a pasar está en Agenda. Con otro período elegido hay un control para volver al actual («Volver a hoy», «Esta semana», «Este mes») | REQ-CUN02-25 |
| H-JOR-09 | Semana y Mes son **listas por día**, solo con los días que tienen algo; el Mes no es la rejilla de Agenda. La cantidad de cada bloque es el «cuánto» de esta versión; no hay barras ni horas sumadas hasta que existan el registro de tiempo y los informes (R-21) | REQ-CUN02-33 |
| H-JOR-10 | Con el calendario conectado pero sin respuesta se muestra la **última copia**, como en Agenda; si nunca se leyó, el bloque de compromisos dice que no se pudo leer y el registro del asistente se ve igual | REQ-CUN02-29 |
| H-JOR-11 | La copia local del calendario empieza 30 días antes de conectarlo: un período anterior a eso muestra solo lo que haya en la copia. No se pide a Google el pasado lejano en esta versión | REQ-CUN02-26 |
| H-JOR-12 | Las tareas completadas (REQ-CUN02-32) se construyen al integrar `09-tareas-personales`; esta versión deja su hueco, sin bloque vacío en pantalla que prometa algo que todavía no existe | REQ-CUN02-32 |
| H-JOR-13 | El **modo Registro del lienzo** de la web (`design/ARQUITECTURA-VISUAL-WEB.md`, «al cerrar una operación») no entra en esta versión: la sección Actividad es su destino, y abrirla sola al cerrar una acción es otro cambio de la conversación | REQ-CUN02-27 |

