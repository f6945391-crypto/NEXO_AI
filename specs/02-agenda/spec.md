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

## Decisiones tomadas durante el diseño que no estaban en el Entregable 1

Estas se detectaron al construir la interfaz y deben revisarse con el equipo:

| # | Decisión | Afecta |
|---|---|---|
| 1 | La duración por defecto de un compromiso propuesto cuando el usuario no la indica es de una hora | REQ-CUN01-01 |
| 2 | La confirmación previa aplica también a la cancelación, no solo al registro | REQ-CUN01-03, REQ-CUN01-06 |
| 3 | El estado vacío es un requisito propio (REQ-CUN01-12), no un detalle visual | REQ-CUN01-12 |
| 4 | El conflicto de horario ofrece alternativas concretas, no solo el aviso de conflicto | REQ-CUN01-05 |
| ~~5~~ | ~~Ante falta de permiso, el sistema ofrece el camino manual en la misma pantalla~~ **Retirada el 22 de octubre de 2026** por R-42 y REQ-ACC-08 (INC-01) | REQ-CUN01-08 |

El punto 1 es el más relevante: es una regla de negocio que no existe y que alguien tiene que decidir.

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
| 13 | En la web, el estado vacío lleva a la barra de entrada de la conversación, porque la web no tiene capa de captura (H-AG-10, detectada en T-025) | REQ-CUN01-12 |
| 12 | La réplica cubre al menos 335 días por delante: se vuelve a leer completa cada 30 días (H-AG-09, detectada en T-014) | REQ-CUN01-09 |
| 12 | Sin decidir si una propuesta sin respuesta caduca (H-AG-08) | REQ-CUN01-03 |
