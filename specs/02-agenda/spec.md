# Especificación — Agenda (CUN-01 Gestionar agenda personal)

**Origen:** Entregable 1, modelado del negocio. Caso de uso CUN-01, trabajador TN-01 Asistente Personal Inteligente, entidades EN-01 Perfil de Usuario y EN-02 Evento de Agenda.
**Notación:** EARS.
**Estado:** fase 1 y 2. Los requisitos derivan del flujo principal, los flujos alternativos y las excepciones ya documentados.

---

## Alcance

Gestión de los compromisos de un usuario individual: consultar, registrar, modificar y cancelar eventos de su agenda a través del asistente. No hay camino manual paralelo (R-42); el comportamiento cuando el asistente no responde está en REQ-CUN01-11.

Queda fuera de esta especificación la coordinación de reuniones entre varias personas, que corresponde a CUN-05 y CUN-06.

---

## Requisitos

### REQ-CUN01-01

**Requisito:** CUANDO el usuario solicite gestionar un compromiso, EL SISTEMA identificará la fecha, la hora de inicio, la hora de fin y el título del compromiso a partir de la solicitud.

**Origen:** CUN-01 flujo principal, pasos 1 y 2
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario habilitado
CUANDO solicite «Agéndame una reunión con Vasco el viernes a las 10»
ENTONCES el sistema extrae fecha, hora de inicio, hora de fin estimada y título, y los presenta al usuario antes de registrar

> **Precisado el 22 de octubre de 2026 (H-AG-01, decisión 1).** Si la solicitud no indica la hora de fin, la hora de fin estimada es una hora después del inicio. La calcula el código, no el modelo.
>
> **Precisado el 6 de noviembre de 2026 (decisión 19).** Si la hora de fin dicha es igual o anterior a la de inicio, termina **al día siguiente**: «de 11 pm a 12» va de 23:00 a 00:00 del día siguiente. La tarjeta dice «porque no indicaste la hora de fin» **solo** cuando la solicitud no la indicó.
>
> DADO un usuario habilitado
> CUANDO solicite «Agéndame una reunión hoy de 11 pm a 1 am»
> ENTONCES la propuesta va de 23:00 a 01:00 del día siguiente, y la tarjeta lo muestra sin decir que faltó la hora de fin

---

### REQ-CUN01-02

**Requisito:** EL SISTEMA consultará los compromisos existentes del usuario en el rango solicitado antes de registrar o actualizar un Evento de Agenda.

**Origen:** CUN-01 flujo principal, paso 3
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un usuario con compromisos registrados
CUANDO se prepare el registro de un nuevo compromiso
ENTONCES el sistema ha consultado los eventos existentes que se solapan con el rango antes de proponer la operación

---

### REQ-CUN01-03

**Requisito:** MIENTRAS el usuario no haya confirmado la operación propuesta, EL SISTEMA no registrará, modificará ni cancelará ningún Evento de Agenda.

**Origen:** RN-ER-03
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO un compromiso propuesto y pendiente de confirmación
CUANDO el usuario no confirme, o cancele la propuesta
ENTONCES no existe ningún Evento de Agenda creado ni modificado, y no se envía ninguna notificación

---

### REQ-CUN01-04

**Requisito:** CUANDO el usuario confirme la operación propuesta, EL SISTEMA registrará o actualizará el Evento de Agenda y comunicará el resultado al usuario.

**Origen:** CUN-01 flujo principal, pasos 5 y 6
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un compromiso propuesto y pendiente de confirmación
CUANDO el usuario confirme
ENTONCES el Evento de Agenda queda registrado con los datos mostrados en la confirmación, y el sistema informa el resultado

---

### REQ-CUN01-05

**Requisito:** SI el compromiso solicitado se superpone con un Evento de Agenda existente, ENTONCES EL SISTEMA informará el conflicto y solicitará una alternativa antes de registrar.

**Origen:** CUN-01 FA-01
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un usuario con un compromiso de 10:00 a 11:00 el viernes
CUANDO solicite agendar otro de 10:00 a 11:00 ese mismo viernes
ENTONCES el sistema informa el conflicto, identifica el compromiso que lo causa, ofrece alternativas y no registra nada

---

### REQ-CUN01-06

**Requisito:** CUANDO el usuario solicite modificar o cancelar un compromiso existente, EL SISTEMA identificará el Evento de Agenda correspondiente y aplicará la operación solicitada tras su confirmación.

**Origen:** CUN-01 FA-02
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un compromiso existente del usuario
CUANDO solicite cancelarlo y confirme la operación
ENTONCES el Evento de Agenda queda cancelado y el sistema informa el resultado

---

### REQ-CUN01-07

**Requisito:** SI la información proporcionada es insuficiente para identificar el compromiso, ENTONCES EL SISTEMA solicitará al usuario los datos faltantes y no registrará el evento.

**Origen:** CUN-01 EX-01
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un usuario habilitado
CUANDO solicite «Agéndame algo con Vasco» sin indicar fecha ni hora
ENTONCES el sistema pregunta por el dato faltante de forma concreta y no crea ningún Evento de Agenda

---

### REQ-CUN01-08

**Requisito:** SI el usuario no ha concedido autorización sobre su calendario, ENTONCES EL SISTEMA no registrará el compromiso e indicará qué permiso falta y cómo concederlo.

**Origen:** CUN-01 EX-02, RN-OP-01, REQ-ACC-08
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un usuario sin permiso de calendario concedido
CUANDO solicite registrar un compromiso
ENTONCES el sistema no invoca ninguna herramienta de agenda, indica qué permiso falta y cómo concederlo, conserva lo capturado como captura (REQ-ACC-08), y no ofrece registrarlo por otra vía

> **Reescrito el 22 de octubre de 2026 (INC-01).** Antes decía «ofrecerá el camino manual». Sin permiso de calendario no hay agenda en la que escribir, ni por el asistente ni a mano, según REQ-ACC-08. Que falte un permiso no es lo mismo que el asistente caído: aplica ACC-08, no R-42.

---

### REQ-CUN01-09

**Requisito:** EL SISTEMA mostrará únicamente los Eventos de Agenda cuyo propietario sea el usuario autenticado.

**Origen:** RN-OP-01, RN-EST-01
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un usuario autenticado y otro usuario con compromisos propios
CUANDO consulte su agenda
ENTONCES no aparece ningún Evento de Agenda perteneciente al otro usuario

---

### REQ-CUN01-10

**Requisito:** EL SISTEMA almacenará y mostrará las fechas y horas de todo Evento de Agenda con su zona horaria explícita.

**Origen:** decisión de arquitectura AD-07; necesaria para CUN-05 y CUN-06
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un usuario en la zona horaria GMT-5
CUANDO consulte o confirme un compromiso
ENTONCES la interfaz permite determinar en qué zona horaria está expresada la hora mostrada

---

### REQ-CUN01-11

**Requisito:** MIENTRAS el asistente no esté disponible, EL SISTEMA mostrará la agenda existente y encolará las solicitudes de registro, modificación o cancelación sin aplicar ninguna.

**Origen:** regla de producto R-42; `SPEC.md` P-11
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO que el proveedor de modelo no responde
CUANDO el usuario abra su agenda y pida mover un compromiso
ENTONCES la agenda se muestra completa, la solicitud queda visible como en espera, el compromiso no cambia, y no se ofrece ningún formulario para hacerlo a mano
Y los controles sobre un compromiso existente, como cancelar, siguen funcionando con su confirmación previa, porque no necesitan al asistente (DP-01, provisional)
Y al recuperarse el asistente, la solicitud pasa por la confirmación previa de siempre

> **Reescrito el 22 de octubre de 2026 (INC-01).** Antes decía «permitirá consultar, registrar, modificar y cancelar compromisos mediante la interfaz manual», con origen en una «constitución del proyecto» que no existía (INC-04).

---

### REQ-CUN01-12

**Requisito:** MIENTRAS el usuario no tenga compromisos registrados en el día consultado, EL SISTEMA presentará un estado vacío que indique cómo crear el primero.

**Origen:** derivado de la revisión de diseño de CUN-01
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO un usuario sin compromisos el día de hoy
CUANDO abra su agenda
ENTONCES ve un estado vacío con una acción explícita para crear un compromiso

---

### REQ-CUN01-13

**Requisito:** CUANDO el usuario pregunte al asistente por su agenda, EL SISTEMA responderá con los compromisos del rango preguntado tal como están registrados, con su hora en la zona del usuario, sin añadir ni omitir ninguno.

**Origen:** CUN-01, alcance «consultar»; `PROPUESTA-TECNICA.md` §7.3; añadido el 24 de octubre de 2026 al planificar el agente
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario con tres compromisos mañana por la tarde, uno de ellos cancelado
CUANDO pregunte «¿Qué tengo mañana por la tarde?»
ENTONCES la respuesta lista los tres, con su hora y su zona, y marca el cancelado como tal
Y no aparece ningún compromiso que no esté en su agenda

> **Precisado el 6 de noviembre de 2026 (decisión 18).** «Tal como están registrados» es tal como están **en el calendario de Google en ese momento**: la consulta del asistente actualiza la copia local antes de responder, sin margen de tiempo. Detectado al probar: un compromiso creado en Google menos de 2 minutos después de la última lectura no aparecía.
>
> DADO que la persona creó «Mirar» en su calendario de Google hace 30 segundos
> CUANDO pregunte «¿qué tengo hoy?»
> ENTONCES la respuesta incluye «Mirar»

---

### REQ-CUN01-14

**Requisito:** CUANDO el usuario elija el nivel Semana de la agenda, EL SISTEMA mostrará los siete días de esa semana, de lunes a domingo, uno debajo de otro, cada uno con sus compromisos en la zona del usuario y el día de hoy destacado, y permitirá pasar a la semana anterior y a la siguiente.

**Origen:** CUN-01, alcance «consultar»; `design/ARQUITECTURA-VISUAL-MOVIL.md` §5.1 (Semana: «los siete días uno debajo de otro, cada uno con sus bloques»); `design/ARQUITECTURA-VISUAL-WEB.md` §9, punto 2; `PLAN-VALOR-USUARIO.md` hito 2. Añadido el 6 de noviembre de 2026
**Tipo:** dirigido por evento
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un usuario con un compromiso el martes y dos el jueves de esta semana, y ninguno los demás días
CUANDO elija «Semana»
ENTONCES ve los siete días en orden, el martes con su compromiso, el jueves con los dos, y los otros cinco con «Sin compromisos»
Y el día de hoy está destacado
Y CUANDO pase a la semana siguiente
ENTONCES ve los siete días de esa semana, y puede volver
Y un compromiso cancelado se marca como en Hoy (REQ-CUN01-10)

---

### REQ-CUN01-15

**Requisito:** CUANDO el usuario elija el nivel Mes de la agenda, EL SISTEMA mostrará la rejilla del mes, con las semanas en filas de lunes a domingo y una marca por cada dos compromisos del día, hasta tres; permitirá pasar al mes anterior y al siguiente; y CUANDO el usuario elija un día de la rejilla, lo mostrará en el nivel Hoy para esa fecha, con un control para volver al día de hoy.

**Origen:** CUN-01, alcance «consultar»; `design/ARQUITECTURA-VISUAL-MOVIL.md` §5.1 (Mes: «rejilla de calendario con un punto por cada dos compromisos»); `PLAN-VALOR-USUARIO.md` hito 2. Añadido el 6 de noviembre de 2026
**Tipo:** dirigido por evento
**Plataforma:** web y móvil

**Criterio de aceptación**
DADO un usuario con un compromiso el día 3, tres el día 12 y ninguno el día 20
CUANDO elija «Mes»
ENTONCES el día 3 tiene una marca, el día 12 dos y el día 20 ninguna
Y los días del mes anterior y siguiente que completan las filas se ven atenuados
Y CUANDO elija el día 12
ENTONCES ve el nivel Hoy con los tres compromisos de ese día y un control «Volver a hoy»
Y CUANDO pase al mes siguiente
ENTONCES ve su rejilla, y puede volver

---

## Decisiones tomadas durante el diseño que no estaban en el Entregable 1

Estas se detectaron al construir la interfaz y deben revisarse con el equipo:

| # | Decisión | Afecta |
|---|---|---|
| 1 | La duración por defecto de un compromiso propuesto cuando el usuario no la indica es de una hora. **Decidida por el equipo el 22 de octubre de 2026** (H-AG-01) | REQ-CUN01-01 |
| 2 | La confirmación previa aplica también a la cancelación, no solo al registro | REQ-CUN01-03, REQ-CUN01-06 |
| 3 | El estado vacío es un requisito propio (REQ-CUN01-12), no un detalle visual | REQ-CUN01-12 |
| 4 | El conflicto de horario ofrece alternativas concretas, no solo el aviso de conflicto | REQ-CUN01-05 |
| ~~5~~ | ~~Ante falta de permiso, el sistema ofrece el camino manual en la misma pantalla~~ **Retirada el 22 de octubre de 2026** por R-42 y REQ-ACC-08 (INC-01) | REQ-CUN01-08 |

El punto 1 era el más relevante, porque era una regla de negocio que no existía. El equipo la decidió el 22 de octubre de 2026: una hora.

### Detectadas al escribir `plan.md` · 22 de octubre de 2026

Pendientes de revisión. Lo que asume el plan mientras tanto está en `plan.md` §9.

| # | Decisión | Afecta |
|---|---|---|
| 6 | Qué alternativas se ofrecen ante un conflicto: **DP-02**, provisional (H-AG-02) | REQ-CUN01-05 |
| 7 | Los eventos de todo el día no cuentan como conflicto (H-AG-03) | REQ-CUN01-02, 05 |
| 8 | Modificar o cancelar un evento recurrente afecta solo a la instancia elegida (H-AG-04) | REQ-CUN01-06 |
| 9 | Un evento al que se fue invitado no se modifica ni se cancela desde NexoAI (H-AG-05) | REQ-CUN01-06 |
| 10 | Solo se usa el calendario principal de Google (H-AG-06) | REQ-CUN01-02, 09 |
| 11 | Los solapes se vuelven a comprobar al confirmar (H-AG-07) | REQ-CUN01-02, 04 |
| 14 | Al mover o cancelar un compromiso con invitados, no se les avisa, y la tarjeta de confirmación lo dice (H-AG-11, detectada en T-019) | REQ-CUN01-06 |
| 13 | En la web, el estado vacío lleva a la barra de entrada de la conversación, porque la web no tiene capa de captura (H-AG-10, detectada en T-025) | REQ-CUN01-12 |
| 12 | La réplica cubre al menos 335 días por delante: se vuelve a leer completa cada 30 días (H-AG-09, detectada en T-014) | REQ-CUN01-09 |
| 12 | ~~Sin decidir si una propuesta sin respuesta caduca (H-AG-08)~~ **Decidida por el equipo el 6 de noviembre de 2026:** Una propuesta sin respuesta **caduca a las 24 horas**: el trabajador la pasa a `descartada` (no espera al siguiente mensaje, para que no quede una propuesta zombi en la agenda ni en la cola) y deja en la transcripción un turno visible: «Esta propuesta caducó; no se hizo nada». Nunca desaparece en silencio. Vale para toda propuesta, salga del asistente o no. *Hay dos decisiones con el número 12 (INC-18); esta es la de H-AG-08* | REQ-CUN01-03 |

### Detectadas al planificar el agente · 24 de octubre de 2026

Las del agente en sí están en `../07-agente/spec.md` §5. Estas son las que tocan la agenda.

| # | Decisión | Afecta |
|---|---|---|
| 15 | La consulta por conversación necesita su propio requisito: se añade REQ-CUN01-13. La lista de compromisos la arma el código con los datos de la réplica; el modelo solo la introduce | REQ-CUN01-13 |
| 16 | El modelo da la fecha y la hora en la zona del perfil, sin desfase; el código las convierte (P-05). Así nunca escribe un desfase equivocado | REQ-CUN01-01, 10 |
| 17 | Elegir una alternativa en la tarjeta no pasa por el modelo: el código descarta la propuesta y propone otra con ese horario | REQ-CUN01-05 |

### Detectadas al probar el agente · 6 de noviembre de 2026

| # | Decisión | Afecta |
|---|---|---|
| 18 | La consulta **del asistente** actualiza la copia del calendario antes de responder, sin el margen de 2 minutos; las pantallas lo conservan. Al conectar o volver a conectar Google, la copia se actualiza en seguida | REQ-CUN01-13 |
| 19 | Una hora de fin igual o anterior a la de inicio termina al día siguiente; la tarjeta solo dice que faltó la hora de fin si de verdad faltó | REQ-CUN01-01 |

### Detectadas al especificar Semana y Mes · 6 de noviembre de 2026

| # | Decisión | Afecta |
|---|---|---|
| 20 | La semana empieza en **lunes**; configurable más adelante con la zona y el idioma del perfil | REQ-CUN01-14, 15 |
| 21 | En Mes, la marca es **un punto por cada dos compromisos, hasta tres**; sin cifras ni barras (diseño móvil §5.1: Agenda contesta «qué», no «cuánto») | REQ-CUN01-15 |
| 22 | Semana y Mes leen la **copia local** con el mismo margen de 2 minutos que Hoy (decisión 18: solo la consulta del asistente fuerza la lectura). Una semana es una lectura; un mes, una lectura de la rejilla completa (hasta 42 días, con los de relleno), dentro del máximo de la ruta (`RANGO_MAXIMO_DIAS`, 366) | REQ-CUN01-14, 15 |
| 23 | Los niveles Semana y Mes son **solo de consulta**: registrar, mover y cancelar siguen pasando por la conversación y por los controles directos de Hoy (R-42, DP-01) | REQ-CUN01-14, 15 |
| 24 | Los tres niveles giran sobre **una sola fecha de foco**: Semana y Mes muestran el período de esa fecha; Hoy muestra el día del foco y ofrece «Volver a hoy» cuando no es hoy. Se navega con «Anterior» y «Siguiente» (nombres accesibles «Semana anterior», «Mes siguiente», etc.) y, en la web, «Esta semana» / «Este mes» cuando no se está en el actual. *Tomada al construir T-044, 6 de noviembre de 2026* | REQ-CUN01-14, 15 |
| 25 | En Mes, **los cancelados no cuentan** para los puntos; un compromiso de varios días cuenta en cada día que toca; los días de otros meses también se pueden elegir. *Tomada al construir T-044* | REQ-CUN01-15 |
| 26 | La franja «en espera» se muestra **en el nivel Hoy** (también con otra fecha elegida) y también sin calendario conectado; se abre y se cierra en el sitio. *La web lo hace así; el móvil la mostraba en los tres niveles y se unificó al nivel Hoy el 6 de noviembre de 2026 (pulido de interfaz).* La frase y el motivo salen de `vistaConfirmacion` («Lo que pediste», `motivoNoConfirmable`) porque `OperacionRespuesta` no expone `motivoEspera` ni `solicitudOriginal`; los textos cortos de REQ-CAP-25 necesitan esos dos campos en el contrato y en la API (hallazgo para el carril del agente) | REQ-CAP-25 |

### Detectadas en el pulido de interfaz · 6 de noviembre de 2026

| # | Decisión | Afecta |
|---|---|---|
| 27 | El choque de horario se avisa en la tarjeta de confirmación con **una sola línea** que nombra el compromiso que lo causa: «Se cruza con «título»» (con varios, «Se cruza con «A» y «B»»). Si no cabe, se corta al final. Las alternativas siguen debajo, cada una para elegirla. La explicación larga que arma el sistema (horario del otro compromiso e indicación de elegir otro) no se repite en la tarjeta; en la web queda como texto al pasar el puntero. *Tomada durante el pulido de interfaz: el requisito no fijaba el texto* | REQ-CUN01-05 |
