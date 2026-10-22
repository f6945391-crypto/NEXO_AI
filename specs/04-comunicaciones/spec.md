# Especificación — Comunicaciones asistidas (CUN-04)

**Origen:** Entregable 1. Caso de uso CUN-04, trabajador TN-01 Asistente Personal Inteligente, entidades EN-01 Perfil de Usuario y EN-07 Comunicación. Reglas RN-OP-01 y RN-ER-03.
**Notación:** EARS.
**Plataforma:** móvil para el Usuario Personal; el Gerente lo usa también desde la plataforma grande.
**Nivel de venta:** Plan Personal.

---

## 1. Por qué este caso de uso importa más de lo que parece

EN-07 está descrita en el Entregable 1 como «las comunicaciones gestionadas con asistencia de NexoAI, incluyendo principalmente **correos y llamadas**». Es decir: redactar correos y preparar llamadas **ya estaba modelado desde el principio**, con su entidad y sus reglas.

Y es, de todo el Plan Personal, el caso de uso con más peso y **cero diseño hecho**.

Además sostiene el ciclo de delegación del Plan Empresarial: como el Colaborador no es usuario del aplicativo, el correo es el canal por el que recibe su tarea y por el que responde. La misma maquinaria sirve a los dos planes.

---

## 2. Correo

### REQ-CUN04-01

**Requisito:** CUANDO el usuario solicite preparar una comunicación, EL SISTEMA identificará el destinatario, el asunto y la intención a partir de la solicitud.

**Origen:** CUN-04 flujo principal
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario que dice «escríbele a Juan que no llego a la reunión del jueves»
CUANDO el sistema interprete la solicitud
ENTONCES resuelve a Juan como destinatario concreto y presenta un borrador con asunto y cuerpo

---

### REQ-CUN04-02

**Requisito:** SI el destinatario no puede resolverse de forma inequívoca, ENTONCES EL SISTEMA lo informará y ofrecerá elegir entre los candidatos, sin enviar nada.

**Origen:** CUN-04 excepciones; RN-ER-03
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO dos contactos llamados Juan
CUANDO el usuario pida escribirle a Juan
ENTONCES el sistema pregunta a cuál, y no elige por su cuenta

---

### REQ-CUN04-03

**Requisito:** EL SISTEMA presentará el borrador completo —destinatario, asunto y cuerpo— antes de cualquier envío.

**Origen:** RN-ER-03; propuesta técnica §7.2, herramienta `comunicaciones.preparar`
**Tipo:** ubicuo

**Criterio de aceptación**
DADO cualquier comunicación preparada
CUANDO se presente al usuario
ENTONCES se ve exactamente lo que se va a enviar y a quién, no un resumen de ello

---

### REQ-CUN04-04

**Requisito:** MIENTRAS el usuario no confirme el envío, EL SISTEMA no enviará la comunicación ni la registrará como enviada.

**Origen:** RN-ER-03; propuesta técnica §7.2, herramienta `comunicaciones.enviar`, confirmación «Sí, siempre»
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO un borrador preparado
CUANDO el usuario cierre la aplicación sin confirmar
ENTONCES no se ha enviado nada y el borrador sigue disponible

**Nota.** Esta es la regla que el resto del mercado no cumple. De los asistentes revisados, ninguno describe una compuerta de confirmación sistemática antes de actuar. Aquí no es opcional: **el envío confirma siempre, sin excepción.**

---

### REQ-CUN04-05

**Requisito:** CUANDO el usuario confirme el envío, EL SISTEMA enviará la comunicación y registrará la Comunicación correspondiente con su resultado.

**Origen:** CUN-04 flujo principal
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un borrador confirmado
CUANDO el sistema lo envíe
ENTONCES queda registrado quién, cuándo y con qué resultado, y el usuario lo ve en su registro de actividad

---

### REQ-CUN04-06

**Requisito:** CUANDO el usuario modifique el borrador antes de confirmar, EL SISTEMA conservará la modificación y volverá a pedir confirmación sobre el texto nuevo.

**Origen:** CUN-04 flujo alternativo
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un borrador editado por el usuario
CUANDO se confirme
ENTONCES se envía exactamente el texto que el usuario dejó, no el que el sistema propuso

---

### REQ-CUN04-07

**Requisito:** EL SISTEMA podrá ordenar las comunicaciones pendientes de atención según su urgencia y su relación con los compromisos del usuario, y podrá explicar por qué una aparece primero.

**Origen:** necesidad declarada del Plan Personal
**Tipo:** ubicuo

**Criterio de aceptación**
DADO varias comunicaciones pendientes
CUANDO se presenten al usuario
ENTONCES las relacionadas con compromisos próximos aparecen antes, y la interfaz permite conocer el criterio

---

### REQ-CUN04-08

**Requisito:** SI el usuario no ha concedido autorización sobre su correo, ENTONCES EL SISTEMA lo indicará, señalará qué permiso falta, y no accederá a ninguna comunicación.

**Origen:** RN-OP-01
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un usuario sin autorización de correo concedida
CUANDO solicite gestionar sus comunicaciones
ENTONCES el sistema dice qué permiso falta y cómo concederlo, y no muestra ningún dato de correo

---

## 3. Llamada

### REQ-CUN04-09

**Requisito:** CUANDO el usuario solicite llamar a alguien, EL SISTEMA resolverá el contacto y preparará la llamada mostrando el contexto disponible antes de iniciarla.

**Origen:** CUN-04; EN-07 incluye llamadas
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario que dice «llama a Juan»
CUANDO el sistema prepare la llamada
ENTONCES muestra a qué Juan, su número, y el contexto pertinente —lo que se acordó la última vez, lo que está pendiente de él— antes de marcar

---

### REQ-CUN04-10

**Requisito:** EL SISTEMA no realizará la llamada por su cuenta ni hablará en nombre del usuario: al confirmar, abrirá el marcador del dispositivo.

**Origen:** decisión de alcance; RN-ER-03
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una llamada preparada y confirmada
CUANDO el sistema actúe
ENTONCES la llamada la inicia y la sostiene la persona, no el asistente

**Nota.** Lo difícil de llamar no es marcar: es acordarse y tener el contexto delante. Un asistente que conversa con terceros es otro producto, con problemas de consentimiento que este alcance no asume.

---

### REQ-CUN04-11

**Requisito:** CUANDO una llamada preparada por el sistema termine, EL SISTEMA podrá ofrecer registrar lo que haya quedado de ella, una sola vez y de forma descartable.

**Origen:** necesidad declarada del Plan Personal
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una llamada iniciada desde el asistente
CUANDO el usuario vuelva a la aplicación
ENTONCES se le ofrece anotar acuerdos, compromisos o pendientes de la llamada
Y descartarlo no deja nada pendiente ni vuelve a preguntar por esa llamada

---

### REQ-CUN04-12

**Requisito:** SI lo que el usuario quiere agendar tras una llamada no cabe en el día indicado, ENTONCES EL SISTEMA lo registrará como pendiente sin fecha e informará del motivo.

**Origen:** regla de producto R-1; enlace con `specs/02-jornada` REQ-CUN02-08
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un acuerdo de llamada que requiere dos horas el martes
CUANDO el martes no tenga ese hueco
ENTONCES queda como pendiente sin fecha, y el sistema lo dice en vez de forzarlo

---

## 4. Terceros

### REQ-CUN04-13

**Requisito:** EL SISTEMA almacenará de un tercero únicamente lo necesario para comunicarse con él y para saber qué se espera de él.

**Origen:** regla de producto R-12; propuesta técnica §9, minimización
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un contacto que no es usuario de NexoAI
CUANDO se registre una comunicación o un pendiente relacionado con él
ENTONCES se guarda su nombre, su medio de contacto y el pendiente concreto
Y no se guardan valoraciones ni notas sobre la persona

---

### REQ-CUN04-14

**Requisito:** CUANDO el usuario registre algo que espera de un tercero, EL SISTEMA lo mantendrá visible entre sus pendientes hasta que se resuelva o el usuario lo descarte.

**Origen:** necesidad declarada del Plan Personal
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un pendiente «Juan tiene que enviarme el presupuesto»
CUANDO pase el plazo acordado sin resolverse
ENTONCES el sistema lo señala entre los pendientes, porque no es tarea del usuario pero sí es su problema

---

## 5. Modo degradado

### REQ-CUN04-15

**Requisito:** MIENTRAS el asistente no esté disponible, EL SISTEMA encolará las solicitudes de comunicación sin redactar ni enviar nada.

**Origen:** regla de producto R-42; `SPEC.md` P-11
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO que el proveedor de modelo no responde
CUANDO el usuario pida «escríbele a Juan que no llego a la reunión del jueves»
ENTONCES la solicitud queda visible como en espera, no se envía nada, y no se ofrece ningún formulario para escribir el correo a mano
Y al recuperarse el asistente, el borrador pasa por la confirmación de envío de siempre (R-11)
Y ese estado no se parece al de una función fuera de su plan

> **Reescrito el 22 de octubre de 2026 (INC-01).** Antes decía «permitirá redactar y enviar comunicaciones de forma manual».

---

## 6. Riesgo de integración — hay que declararlo ahora

La propuesta técnica ya lo levanta en §11 y conviene repetirlo aquí, porque afecta a la mitad de esta especificación:

**Los permisos de lectura de correo son de categoría restringida en Google** y exigen una evaluación de seguridad que un proyecto de curso no va a obtener. Para la implementación académica corresponde trabajar en modo de prueba con usuarios autorizados, o **simular el proveedor de correo tras la misma interfaz**, según la decisión D-3 de la propuesta técnica.

Los requisitos de esta especificación se escriben contra la interfaz, no contra el proveedor, precisamente para que esa decisión no los invalide.

---

## 7. Relación con el Plan Empresarial

El correo es también el canal del ciclo de delegación, porque el Colaborador no es usuario del aplicativo:

| Momento | Qué usa de aquí |
|---|---|
| El gerente delega | REQ-CUN04-03 y 04: el correo de asignación se presenta y confirma como cualquier otro |
| El colaborador responde | Las tres puertas de `specs/03-tareas` sección 6 |
| El gerente recibe la respuesta | Llega como propuesta de actualización, nunca como cambio aplicado |

---

## 8. Pendiente

1. **Forma del Participante externo** (D-8): REQ-CUN04-13 y 14 necesitan saber si es entidad o atributo.
2. **Integración de correo real o simulada** (propuesta técnica D-3).
3. **Sin diseño.** Ningún cuadro cubre todavía este caso de uso, en ninguna plataforma.

---

## 7. El encargo con preguntas declaradas

Añadido tras la revisión de acceso y encargos. Numerado aparte porque cruza CUN-04 (el envío) y CUN-07 (la delegación).

**REQ-ENC-01** · Ubicuo — Todo encargo declara la lista de preguntas que se le harán al colaborador, y cada pregunta declara su tipo: opción, fecha, número o texto libre.

**REQ-ENC-02** · Ubicuo — Una de las preguntas declaradas es el criterio de terminado. El sistema no marca un encargo como terminado si ese criterio no se cumple, aunque el colaborador afirme que lo está.

**REQ-ENC-03** · Ubicuo — Toda pregunta de texto libre tiene un tope de caracteres, por defecto 400, y el formulario muestra el contador.

**REQ-ENC-04** · CUANDO el gerente envía un encargo, el sistema envía el correo desde la cuenta de Google del gerente usando únicamente el permiso de envío, y fija como dirección de respuesta una dirección irrepetible de esa tarea.

**REQ-ENC-05** · Ubicuo — El sistema no solicita en ningún momento permiso de lectura sobre el buzón del gerente.

**REQ-ENC-06** · CUANDO el colaborador pulsa un botón de opción dentro del correo, el sistema abre una página de confirmación y no registra nada hasta que la persona confirma en ella.

**REQ-ENC-07** · SI un enlace del correo se abre sin interacción humana —escáner de seguridad corporativo—, ENTONCES el sistema no registra ninguna respuesta.

**REQ-ENC-08** · CUANDO llega una respuesta al correo de la tarea en lugar del formulario, el sistema descarta la cita del hilo y la firma, trunca el texto al tope declarado y marca la respuesta como recibida sin estructura.

**REQ-ENC-09** · Ubicuo — Ninguna respuesta, estructurada o no, cambia el estado del encargo por sí sola: llega al gerente como propuesta, con su procedencia y su hora (R-16, R-18).

**REQ-ENC-10** · SI la fecha que propone el colaborador es distinta de la pedida, ENTONCES el sistema la señala como discrepancia y no modifica ni el encargo ni la agenda del gerente hasta que este decida.

**REQ-ENC-11** · MIENTRAS un colaborador no haya aceptado la invitación, el sistema no le envía ningún correo de encargo, aunque el gerente lo pida.

**REQ-ENC-12** · CUANDO un colaborador retira su permiso, el sistema deja de enviarle correos y borra los datos de disponibilidad que hubiera guardado de él.

**REQ-ENC-13** · DONDE el colaborador acepta solo la parte de correos, el sistema le envía encargos pero no consulta su disponibilidad.

### Riesgo que esto no elimina

El permiso de envío en nombre del usuario sigue siendo un ámbito restringido de Google y exige verificación con evaluación de seguridad. Lo que esta decisión consigue es **quedarse en uno solo** en vez de dos: sin lectura de buzón, la superficie de revisión y el coste bajan, pero no desaparecen. Si la verificación no se obtiene a tiempo, el repliegue es enviar desde el dominio propio, con peor tasa de respuesta, y eso hay que decidirlo antes de comprometer fechas.
