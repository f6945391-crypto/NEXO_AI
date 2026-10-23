# Especificación — Tareas (CUN-07 Delegar tarea)

**Origen:** Entregable 1. Caso de uso CUN-07, trabajador TN-02 Coordinador Empresarial Inteligente, entidades EN-01 Perfil de Usuario, EN-04 Tarea y EN-05 Equipo de Trabajo.
**Notación:** EARS.
**Plataforma:** web y móvil para los dos perfiles: el Gerente / Responsable de Equipo, que delega, y el Colaborador, que responde (§7, D-17; ampliado el 23 de octubre de 2026). Qué parte de la coordinación tiene el gerente en el móvil está por decidir (`SPEC.md` §8).

---

## Por qué este caso de uso primero en web

CUN-05 y CUN-06 dependían de **RN-CAL-01**, cuyo texto en el Entregable 1 dice cómo encontrar un intervalo común pero no cuál de varios se propone primero. Mientras ese criterio no existía no se podía escribir el requisito de ordenamiento ni diseñar la rejilla. Quedó aprobado el 26 de septiembre de 2026, después de este caso de uso.

CUN-07 no depende de ella, así que es el punto de entrada correcto para la plataforma web.

---

## Requisitos

### REQ-CUN07-01

**Requisito:** CUANDO el gerente solicite delegar una actividad, EL SISTEMA identificará al colaborador indicado y las condiciones de la tarea.

**Origen:** CUN-07 flujo principal, pasos 1 a 3
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un gerente con un equipo asignado
CUANDO indique una actividad y un colaborador del equipo
ENTONCES el sistema resuelve el colaborador a un Perfil de Usuario concreto y presenta la tarea propuesta con sus condiciones

---

### REQ-CUN07-02

**Requisito:** EL SISTEMA validará que la información de la tarea esté completa antes de registrarla.

**Origen:** CUN-07 flujo principal, paso 4
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una tarea propuesta
CUANDO falte el título, el responsable o la fecha límite
ENTONCES el sistema no habilita la confirmación y señala qué campo falta

---

### REQ-CUN07-03

**Requisito:** CUANDO la delegación sea registrada correctamente, EL SISTEMA comunicará la asignación al colaborador y confirmará la delegación al gerente.

**Origen:** CUN-07 flujo principal, pasos 6 y 7; RN-ER-02
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una delegación confirmada por el gerente
CUANDO el sistema registre la Tarea
ENTONCES el colaborador recibe la notificación de asignación y el gerente ve la confirmación con enlace a la tarea creada

---

### REQ-CUN07-04

**Requisito:** SI el gerente no está autorizado para delegar sobre ese equipo, ENTONCES EL SISTEMA rechazará la delegación e informará el motivo.

**Origen:** CUN-07 EX-03, RN-OP-03
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un gerente sin permiso de delegación sobre el equipo
CUANDO intente delegar una tarea a un colaborador de ese equipo
ENTONCES el sistema rechaza la operación, indica que falta autorización y no crea ningún registro de Tarea

> **Precisado el 23 de octubre de 2026 (D-17 a enmendada).** Un colaborador nunca está autorizado para delegar, aunque tenga el Plan Empresarial: solo el responsable del equipo asigna tareas (REQ-ACC-15).

---

### REQ-CUN07-05

**Requisito:** SI el colaborador indicado no es válido, ENTONCES EL SISTEMA informará la situación y no registrará la tarea.

**Origen:** CUN-07 EX-01
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un gerente delegando una tarea
CUANDO indique una persona que no pertenece a ninguno de sus equipos
ENTONCES el sistema informa que el colaborador no es válido y ofrece elegir uno del equipo

---

### REQ-CUN07-06

**Requisito:** SI la información de la actividad es insuficiente, ENTONCES EL SISTEMA solicitará los datos faltantes antes de registrar la tarea.

**Origen:** CUN-07 EX-02
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un gerente que describe la actividad sin fecha límite
CUANDO solicite delegarla
ENTONCES el sistema pregunta concretamente por la fecha límite y no registra la Tarea

---

### REQ-CUN07-07

**Requisito:** MIENTRAS la delegación no haya sido confirmada por el gerente, EL SISTEMA no registrará la tarea ni notificará al colaborador.

**Origen:** RN-ER-03
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO una delegación propuesta y pendiente de confirmación
CUANDO el gerente no confirme, o cancele
ENTONCES no existe Tarea creada y el colaborador no recibe ninguna notificación

---

### REQ-CUN07-08

**Requisito:** CUANDO el gerente modifique la información antes de confirmar, EL SISTEMA revalidará la tarea con los datos actualizados.

**Origen:** CUN-07 FA-01
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una propuesta de delegación pendiente
CUANDO el gerente cambie el colaborador o la fecha límite
ENTONCES el sistema vuelve a validar completitud y autorización con los datos nuevos antes de permitir confirmar

---

### REQ-CUN07-09

**Requisito:** MIENTRAS el asistente no esté disponible, EL SISTEMA encolará las solicitudes de delegación sin registrar la tarea ni notificar al colaborador.

**Origen:** regla de producto R-42; `SPEC.md` P-11
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO que el proveedor de modelo no responde
CUANDO el gerente pida delegar una actividad
ENTONCES la solicitud queda visible como en espera, con la garantía de que no se ha creado ni avisado nada
Y el gerente puede seguir consultando la agenda y los hilos de las tareas existentes
Y no se ofrece ningún formulario para delegar a mano
Y al recuperarse el asistente, la delegación pasa por las mismas validaciones y la misma confirmación que cualquier otra

> **Reescrito el 22 de octubre de 2026 (INC-01).** Antes decía «permitirá delegar tareas mediante el formulario manual». Coincide con el cuadro `WEB-v2 / Blancos / 03` ya rehecho (`design/VALIDACION-WEB-v2.md`, «El modo degradado, replanteado»).

---

### REQ-CUN07-10

**Requisito:** EL SISTEMA exigirá que toda delegación declare su criterio de terminado antes de registrarla.

**Origen:** RN-INF-02; regla de producto R-19
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una delegación con título, responsable y fecha límite
CUANDO falte declarar cuándo se considera hecha
ENTONCES el sistema lo pide, en una línea y en palabras de quien delega, antes de habilitar la confirmación

---

## 6. El término sin definir de RN-INF-02

RN-INF-02 dice: *«Si el colaborador responsable registra el **cumplimiento válido** de la tarea, esta se considera completada.»* El Entregable 1 **nunca define qué es un cumplimiento válido**.

Es el mismo problema que tenía RN-CAL-01 con «la mejor alternativa»: una regla que nombra un criterio que el documento no da. Con una diferencia importante:

| | RN-CAL-01 | RN-INF-02 |
|---|---|---|
| Naturaleza del criterio | Uno solo, para todos los casos | **Distinto en cada tarea** |
| Cómo se resuelve | Con un algoritmo declarado en la regla | Solo puede declararlo **quien delega**, tarea por tarea |
| Estado | Aprobada el 26/09/2026 | **Pendiente**, decisión D-15 |

Por eso REQ-CUN07-10 no es una comodidad de interfaz: **es lo que hace aplicable RN-INF-02.** Sin criterio de terminado, «válido» queda al juicio de cada quien y la mayoría de las delegaciones fallan por ahí —no por la fecha, sino porque el gerente pensaba una cosa y el colaborador entendió otra.

---

## 7. El ciclo de vuelta

**Reescrita el 22 de octubre de 2026 por D-17** (`SPEC.md` §8). El Colaborador **tiene cuenta**, con un rol propio limitado a sus tareas asignadas, y trabaja desde la **web o la aplicación móvil** (ampliado el 23 de octubre de 2026). Con eso CUN-09, *Gestionar tarea asignada*, vuelve a tener soporte de software, como lo modela el Entregable 1.

El recorrido completo es:

1. El gerente delega y confirma (REQ-CUN07-01 a 10).
2. El colaborador recibe una notificación y ve la tarea en su aplicación (REQ-CUN07-16).
3. El colaborador responde desde la aplicación (REQ-CUN07-11).
4. La respuesta llega al líder como propuesta, nunca como cambio aplicado (REQ-CUN07-12, 13).
5. El líder confirma, o modifica la tarea, y el resultado vuelve al colaborador (REQ-CUN07-17).

La versión anterior, con el colaborador sin cuenta y respondiendo por correo, se conserva en `REPLANTEO.md` §4.7.

### REQ-CUN07-11

**Requisito:** EL SISTEMA permitirá al colaborador responder sobre una tarea que tiene asignada desde la aplicación, con una acción de estado, con las preguntas declaradas del encargo o con un comentario.

**Origen:** CUN-09; RN-OP-04; decisión D-17
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un colaborador con una tarea asignada
CUANDO la abra en la aplicación
ENTONCES puede marcar un estado, contestar las preguntas declaradas del encargo (REQ-ENC-01) o escribir un comentario
Y las tres formas llegan al mismo sitio: la propuesta de actualización de REQ-CUN07-12

> **Reescrito el 22 de octubre de 2026 (D-17).** Antes decía: tres formas de responder sin cuenta, que eran botones en el correo, un formulario enlazado y la respuesta al propio correo.

---

### REQ-CUN07-12

**Requisito:** EL SISTEMA no modificará el estado de una tarea a partir de una respuesta del colaborador sin confirmación del gerente.

**Origen:** regla de producto R-16; RN-ER-03; espíritu de RN-OP-04
**Tipo:** ubicuo

**Criterio de aceptación**
DADO cualquier respuesta del colaborador desde la aplicación
CUANDO llegue al sistema
ENTONCES se presenta al gerente como propuesta de actualización, con lo que el colaborador dijo
Y el estado de la Tarea no cambia hasta que el gerente lo confirme

**Nota.** El responsable expresa, el usuario autorizado registra. Con D-17 el colaborador es usuario, pero la regla se mantiene: la confirmación sigue siendo del líder, que es quien pidió la tarea.

---

### REQ-CUN07-13

**Requisito:** EL SISTEMA indicará la procedencia de cada actualización propuesta, distinguiendo un dato declarado de una interpretación del asistente.

**Origen:** regla de producto R-18
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una actualización originada en una acción de estado pulsada en la aplicación
CUANDO se presente al gerente
ENTONCES se lee como un hecho: «María Fernanda pulsó Hecho»
Y DADO una originada en texto libre interpretado
ENTONCES se lee como interpretación, citando el original: «escribió *lo tengo casi listo*; entiendo que está en curso»
Y los dos casos **no se ven iguales**

---

### REQ-CUN07-14

**Requisito:** EL SISTEMA propondrá una sola vez cada respuesta del colaborador, aunque la aplicación la envíe varias veces.

**Origen:** propuesta técnica §7.2, idempotencia por clave de operación; AD-09
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un colaborador que pulsa la misma acción dos veces, o una respuesta que la aplicación reintenta tras perder la conexión
CUANDO las peticiones lleguen al sistema
ENTONCES la actualización se propone al gerente una sola vez

> **Reescrito el 22 de octubre de 2026 (D-17).** Antes cubría también los enlaces del correo abiertos por escáneres corporativos. Ya no hay enlaces de acción en el correo.

---

### REQ-CUN07-15

**Requisito:** EL SISTEMA mantendrá un único hilo de comentarios por Tarea, accesible para el gerente y para el colaborador, que se cierra con ella.

**Origen:** decisión D-14; regla de producto R-17
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una tarea delegada con comentarios del gerente
CUANDO el colaborador la abra en la aplicación
ENTONCES ve el hilo de esa tarea y puede añadir su respuesta
Y no ve las tareas de otros colaboradores, ni la lista del equipo (REQ-ACC-13)

**Nota de ubicación.** En la web del gerente, el hilo vive **en el lienzo, con la tarea abierta**, nunca en la columna de conversación. En el móvil del colaborador vive dentro de la tarea (R-24). En la web del colaborador, falta diseñarlo (INC-14).

> **Reescrito el 22 de octubre de 2026 (D-17).** Antes el colaborador accedía al hilo con un formulario enlazado desde el correo.

---

### REQ-CUN07-16

**Requisito:** CUANDO una delegación quede registrada, EL SISTEMA notificará al colaborador en la aplicación y le enviará un correo que solo avisa de la tarea nueva.

**Origen:** RN-ER-02; decisión D-17; DP-03
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una delegación confirmada por el gerente
CUANDO quede registrada
ENTONCES el colaborador recibe una notificación en la aplicación, en la web o en el móvil, y al abrirla ve la tarea con su criterio de terminado
Y recibe un correo que avisa de la tarea y remite a la aplicación, sin botones de acción ni posibilidad de responder por correo

---

### REQ-CUN07-17

**Requisito:** CUANDO el gerente confirme o modifique una tarea a partir de una respuesta del colaborador, EL SISTEMA notificará al colaborador el resultado, indicando qué cambió.

**Origen:** decisión D-17; RN-ER-02
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una respuesta del colaborador que proponía otra fecha
CUANDO el gerente la acepte, la rechace o cambie la tarea, y confirme (RN-ER-03)
ENTONCES el colaborador recibe una notificación con la decisión, y en la tarea ve qué campos cambiaron y quién los cambió

---

### ~~Reglas del enlace del formulario~~

**Retiradas el 22 de octubre de 2026 (D-17):** ya no hay formulario enlazado desde el correo. La tabla anterior se conserva en `REPLANTEO.md` §4.7.

---

### REQ-CUN07-18

**Requisito:** CUANDO un miembro de un equipo le pida algo a un compañero sin ser su responsable, EL SISTEMA se lo hará llegar como una petición que el compañero puede aceptar o rechazar, y no la convertirá en una tarea suya mientras no la acepte.

**Origen:** decisión del equipo del 23 de octubre de 2026 (rango del colaborador, pregunta 2); REQ-ACC-15
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO dos miembros del mismo equipo, ninguno responsable del otro
CUANDO uno le pida al otro «revisa el informe antes del jueves»
ENTONCES el compañero recibe una petición que puede aceptar o rechazar, y a quien pidió le queda como «esperando de alguien»
Y si el compañero la rechaza, a quien pidió se le avisa y no queda ninguna tarea creada

---

### REQ-CUN07-19

**Requisito:** CUANDO un miembro de un equipo le proponga una tarea a su responsable, EL SISTEMA se la presentará al responsable como propuesta, y solo el responsable decidirá si la crea y a quién la asigna.

**Origen:** decisión del equipo del 23 de octubre de 2026 (rango del colaborador, pregunta 3); R-16
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un colaborador de un equipo
CUANDO le proponga a su responsable «que alguien revise el contrato de Acme»
ENTONCES el responsable recibe la propuesta con quién la hizo, y no se crea ni se asigna ninguna tarea hasta que él lo confirme

---

## 8. Seguimiento del equipo (CUN-08) · borrador

**Estado:** borrador del 23 de octubre de 2026, a partir de lo que pidió el equipo. Lo diferencial del responsable es **ver el trabajo del equipo en conjunto**, cosa que un miembro no puede. Hay que revisarlo en sesión antes de planificarlo.

**Qué cuenta como trabajo del equipo:** las tareas que asignó el responsable, con su estado, sus fechas, sus retrasos y el tiempo registrado en ellas. Del hilo, solo lo destacable. Lo que cada miembro hace para sí no entra (REQ-ACC-17).

**Dos piezas con destino distinto.** El **resumen** es para consultar rápido en la conversación: corto, con lo clave. El **reporte** es un documento **completo**, que puede ser largo, para compartir o archivar; en la conversación solo se ve su síntesis, y el documento entero se abre aparte. Los dos dicen lo clave primero.

**Formato del reporte: aprobado por el equipo el 23 de octubre de 2026.** La referencia es `design/reporte-equipo-muestra.html`, con datos inventados: contexto, resumen ejecutivo, indicadores clave, lo destacado con su procedencia, retrasos y su causa, avance por persona, detalle de todas las tareas y cómo se calcularon las cifras. La síntesis que se ve en la conversación está en el mismo lienzo de diseño.

### REQ-CUN08-01

**Requisito:** MIENTRAS una cuenta sea responsable de un equipo, EL SISTEMA le permitirá consultar el estado del trabajo de ese equipo: qué tareas tiene cada miembro, en qué estado, con qué fecha, cuáles van atrasadas y cuánto tiempo se registró en ellas.

**Origen:** CUN-08; decisión del equipo del 23 de octubre de 2026
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO un responsable con cinco tareas asignadas en su equipo
CUANDO pregunte «¿cómo va el equipo?»
ENTONCES ve las tareas de su equipo con su estado, su fecha y su tiempo registrado, y ninguna tarea que un miembro se haya creado para sí

---

### REQ-CUN08-02

**Requisito:** SI una cuenta que no es responsable de un equipo pide su resumen, su reporte o el estado de sus tareas, ENTONCES EL SISTEMA lo rechazará y le mostrará solo lo suyo.

**Origen:** decisión del equipo del 23 de octubre de 2026; REQ-ACC-15, REQ-ACC-16
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un colaborador de un equipo
CUANDO pregunte «¿quién va atrasado en el equipo?»
ENTONCES el sistema le explica que eso lo consulta el responsable, y le ofrece el estado de sus propias tareas

---

### REQ-CUN08-03

**Requisito:** CUANDO el responsable pida un resumen del equipo, EL SISTEMA responderá en la conversación con como mucho cinco puntos clave (lo terminado, lo atrasado y lo bloqueado), y dará el detalle solo si se lo pide.

**Origen:** decisión del equipo del 23 de octubre de 2026 («reportar lo clave, sin bombardear»)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un equipo con veinte tareas en la semana
CUANDO el responsable pregunte «resúmeme la semana del equipo»
ENTONCES recibe como mucho cinco puntos clave, cada uno con a quién afecta, y no una lista de las veinte tareas
Y lo destacable de un hilo aparece resumido, con su procedencia (REQ-CUN07-13), nunca el hilo entero

---

### REQ-CUN08-04

**Requisito:** CUANDO el responsable pida un reporte de un período, EL SISTEMA generará un documento completo, que se ve en la web y se descarga en PDF, y que se entiende sin más contexto: dice de qué equipo y período es, en qué zona horaria están las fechas y cómo se calcularon las cifras, y sigue con el resumen ejecutivo, los indicadores, lo destacado, los retrasos con su causa, el avance por persona y el detalle de todas las tareas.

**Origen:** decisión del equipo del 23 de octubre de 2026 («tiene que tener un formato, no solo una tabla»; «el PDF debe ser completo»); H-SEG-02, H-SEG-03
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un responsable con un mes de trabajo de su equipo
CUANDO pida «el reporte de octubre de mi equipo»
ENTONCES recibe un documento que se lee de arriba abajo: primero el contexto y qué pasó en dos o tres frases, después las cifras clave y lo destacado, después lo atrasado con su causa y el avance de cada persona, y al final el detalle de todas las tareas del período, sin recortar
Y lo puede ver en la web y descargar en PDF, sin que el sistema lo envíe a nadie por su cuenta

> **Reescrito el 23 de octubre de 2026 (H-SEG-02 y 03).** Antes no decía que el reporte fuera completo ni en qué formato salía.

---

### REQ-CUN08-05

**Requisito:** EL SISTEMA calculará de forma determinista qué tareas están atrasadas y cuánto, y el asistente solo redactará el resumen o el reporte a partir de esos datos.

**Origen:** P-02, AD-05
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una tarea cuya fecha ya pasó y que no cumple su criterio de terminado
CUANDO el responsable pregunte quién va atrasado
ENTONCES la tarea aparece como atrasada, con los días de retraso calculados por el sistema, aunque el asistente no esté disponible

---

### REQ-CUN08-06

**Requisito:** EL SISTEMA no enviará resúmenes ni reportes que el responsable no haya pedido.

**Origen:** decisión del equipo del 23 de octubre de 2026 («no hay que bombardear de información»)
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un responsable que no ha pedido ningún reporte
CUANDO pase la semana
ENTONCES no recibe ningún resumen ni reporte por iniciativa del sistema

---

### REQ-CUN08-07

**Requisito:** CUANDO el sistema termine un reporte, EL SISTEMA mostrará en la conversación solo una síntesis del documento, con como mucho cinco puntos clave, y el acceso al reporte completo.

**Origen:** decisión del equipo del 23 de octubre de 2026 («en el chat solo una síntesis del archivo que se generó»); H-SEG-02
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un responsable que pidió el reporte de octubre
CUANDO el reporte esté listo
ENTONCES la conversación muestra una síntesis breve y un acceso para abrir o descargar el documento, y no el reporte entero

---

### Decisiones abiertas del seguimiento

| # | Pregunta | Propuesta mientras tanto |
|---|---|---|
| ~~H-SEG-01~~ | ~~Además de «atrasada», ¿existe «en riesgo»?~~ **Decidido el 23 de octubre de 2026: solo «atrasada»**, es decir, fecha vencida sin cumplir el criterio de terminado. El reporte da el contexto de cada retraso | REQ-CUN08-04, 05 |
| ~~H-SEG-02~~ | ~~¿Cuántos puntos clave lleva un resumen?~~ **Decidido: como mucho cinco en la conversación**, tanto en el resumen como en la síntesis de un reporte. **El reporte no se recorta**: es completo y puede ser largo | REQ-CUN08-03, 04, 07 |
| H-SEG-03 | ¿En qué formato sale el reporte y quién más puede leerlo? | **Formato decidido: se ve en la web y se descarga en PDF.** Sigue abierto quién más puede leerlo; mientras tanto, solo quien lo genera, que puede descargarlo y compartirlo por su cuenta |
| ~~H-SEG-04~~ | ~~¿Se pueden programar reportes?~~ **Decidido: queda como posibilidad futura y no se implementa.** REQ-CUN08-06 sigue vigente | REQ-CUN08-06 |

---

## Diferencias con la plataforma móvil

CUN-07 se diseña en web porque su actor es el Gerente y el trabajo de coordinación se hace en escritorio. Consecuencias de diseño:

| Aspecto | Móvil (CUN-01) | Web (CUN-07) |
|---|---|---|
| Entrada principal | Conversacional, barra inferior | Columna de conversación de 528 px; el lienzo muestra la tarea, sin formulario manual (R-42) |
| Densidad | Una tarea por pantalla | Lienzo de 840 px con la lista del equipo, en paralelo a la conversación |
| Confirmación | Tarjeta a pantalla completa | Tarjeta de tipo Confirmación dentro de la conversación, sin tapar el lienzo |
| Navegación | Pestañas inferiores | Navegación de 72 px, solo iconos |
| Tras confirmar | La tarjeta se convierte en resultado | La conversación queda vacía y el resultado pasa al registro, en el lienzo |

La jerarquía web está definida en `design/ARQUITECTURA-VISUAL-WEB.md`. **Los 12 cuadros de este caso de uso todavía están generados con la jerarquía anterior** (una columna de 1200 px y navegación de 240 px con texto); rehacerlos es trabajo pendiente.

Los componentes **no se comparten** entre plataformas: `Web / Botón` es un componente distinto de `Móvil / Botón` aunque compartan tokens. Lo que se comparte son las variables.

---

## Pendiente

Nada de este caso de uso. **RN-CAL-01** ya fue aprobada, así que CUN-05 y CUN-06 dejan de estar bloqueados; el criterio está en `specs/05-equipos/spec.md` sección 1.

**Lo que sí queda pendiente de este caso de uso:**

1. **RN-INF-02**, sección 6: hay que incorporar al Entregable 1 que el criterio de terminado lo declara quien delega, igual que se hizo con RN-CAL-01.
2. **Los 12 cuadros existentes** están generados con la jerarquía visual anterior, y ninguno cubre las secciones 6 y 7 de esta especificación.
3. **Forma del Participante externo** (D-8).
