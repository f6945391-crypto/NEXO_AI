# Especificación — Tareas (CUN-07 Delegar tarea)

**Origen:** Entregable 1. Caso de uso CUN-07, trabajador TN-02 Coordinador Empresarial Inteligente, entidades EN-01 Perfil de Usuario, EN-04 Tarea y EN-05 Equipo de Trabajo.
**Notación:** EARS.
**Plataforma:** web. Es el caso de uso del Gerente / Responsable de Equipo.

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

El Colaborador **no es usuario del aplicativo**: no tiene cuenta, no instala nada y no ocupa un puesto de pago. Participa por correo. Ver `../../REPLANTEO.md` sección 4.7.

Eso deja CUN-09 y parte de CUN-08 sin soporte de software, y hay que taparlo aquí.

### REQ-CUN07-11

**Requisito:** EL SISTEMA ofrecerá al colaborador tres formas de responder sobre una tarea delegada: acciones directas desde el correo, un formulario enlazado desde él, y la respuesta al propio correo.

**Origen:** decisión D-13
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un colaborador que recibe el correo de una tarea
CUANDO quiera responder
ENTONCES puede pulsar una acción, abrir el formulario, o simplemente responder el correo, y las tres llegan al mismo sitio
Y ninguna de las tres le exige registrarse, instalar nada ni recordar una contraseña

---

### REQ-CUN07-12

**Requisito:** EL SISTEMA no modificará el estado de una tarea a partir de una respuesta del colaborador sin confirmación del gerente.

**Origen:** regla de producto R-16; RN-ER-03; espíritu de RN-OP-04
**Tipo:** ubicuo

**Criterio de aceptación**
DADO cualquier respuesta recibida por cualquiera de las tres vías
CUANDO llegue al sistema
ENTONCES se presenta al gerente como propuesta de actualización, con lo que el colaborador dijo
Y el estado de la Tarea no cambia hasta que el gerente lo confirme

**Nota.** El responsable expresa, el usuario autorizado registra. Así se respeta RN-OP-04 sin convertir al colaborador en usuario.

---

### REQ-CUN07-13

**Requisito:** EL SISTEMA indicará la procedencia de cada actualización propuesta, distinguiendo un dato declarado de una interpretación del asistente.

**Origen:** regla de producto R-18
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una actualización originada en un botón pulsado
CUANDO se presente al gerente
ENTONCES se lee como un hecho: «María Fernanda pulsó Hecho»
Y DADO una originada en texto libre interpretado
ENTONCES se lee como interpretación, citando el original: «escribió *lo tengo casi listo*; entiendo que está en curso»
Y los dos casos **no se ven iguales**

---

### REQ-CUN07-14

**Requisito:** EL SISTEMA aplicará una sola vez cada acción recibida, aunque el enlace o el botón se activen varias veces.

**Origen:** propuesta técnica §7.2, idempotencia por clave de operación
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un filtro de seguridad corporativo que visita todos los enlaces del correo
CUANDO abra el enlace de una acción
ENTONCES no se registra ninguna actualización: la acción exige una confirmación explícita en la página
Y DADO un colaborador que pulsa el mismo botón dos veces
ENTONCES la actualización se propone una sola vez

---

### REQ-CUN07-15

**Requisito:** EL SISTEMA mantendrá un único hilo de comentarios por Tarea, accesible para el gerente y para el colaborador, que se cierra con ella.

**Origen:** decisión D-14; regla de producto R-17
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una tarea delegada con comentarios del gerente
CUANDO el colaborador abra el formulario enlazado
ENTONCES ve el hilo de esa tarea y puede añadir su respuesta
Y no ve ninguna otra tarea, ni la lista del equipo, ni nada del resto del espacio de trabajo

**Nota de ubicación.** En la plataforma grande, el hilo vive **en el lienzo, con la tarea abierta**, nunca en la columna de conversación. La conversación es donde se crea y se delega; el lienzo es donde se lee lo que ya existe.

---

### Reglas del enlace del formulario

| Punto | Decisión |
|---|---|
| Testigo | Largo e impredecible, válido **solo para esa tarea** |
| Alcance | Esa tarea y nada más |
| Sesión | No inicia sesión ni deja nada abierto |
| Caducidad | Deja de funcionar cuando la tarea se cierra |
| Suplantación | Se comprueba que el remitente coincide con la dirección invitada |
| Si lo reenvían | El enlace vale lo que vale el correo. Aceptable para una tarea de trabajo, pero se declara |

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
