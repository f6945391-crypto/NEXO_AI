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
