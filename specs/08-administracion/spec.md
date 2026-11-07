# Especificación — Administración de la organización (cuentas, afiliación y equipos)

**Origen:** decisión del equipo del 6 de noviembre de 2026: la afiliación de una cuenta Personal a una empresa no la pide el usuario ni la asume el sistema, **la concede un área de administración**. Se apoya en REQ-ACC-01, REQ-ACC-12, REQ-ACC-16 y REQ-ACC-17 (`specs/06-acceso/spec.md`), en D-17 y en el supuesto S-5 de `REPLANTEO.md` §4.4 («administrar permisos es autorización, no facturación»). Entidades: EN-01 Perfil de Usuario y EN-05 Equipo de Trabajo.
**Notación:** EARS.
**Estado:** borrador del 6 de noviembre de 2026, pendiente de revisión del equipo. **No es un caso de uso del negocio**, igual que `06-acceso`: no añade ni modifica ningún CUN del Entregable 1. Es lo que CUN-05 a CUN-09 necesitan para tener sobre qué apoyarse.

---

## Alcance

Quién administra una organización de empresa y qué puede hacer desde el área de administración: ver las cuentas de la organización, darlas de alta, cambiarles el plan, suspenderlas o darlas de baja y restablecer su contraseña; **afiliar** cuentas personales que ya existen; y armar los **equipos**, con sus miembros y su responsable.

**Por qué va antes de la fase 4.** Equipos, delegación, disponibilidad y seguimiento suponen que se sabe quién pertenece a qué empresa y quién es responsable de qué equipo. Hoy eso no existe: el rol está en la cuenta (`SPEC.md` §8, «Rol por equipo») y las cuentas se crean fuera de la aplicación (REQ-ACC-01). Esta área es lo primero de la fase 4.

**Regla de fondo.** Mientras una cuenta no esté afiliada a una empresa, ve exactamente su Plan Personal (o Gratuito): nada de empresa aparece en su aplicación (REQ-ADM-17).

Queda fuera lo que lista §6.

---

## 1. La organización y su administrador

### REQ-ADM-01

**Requisito:** EL SISTEMA distinguirá dos clases de organización: la **organización personal**, que tiene una sola cuenta y existe desde que esa cuenta se crea, y la **organización de empresa**, que tiene administradores, cuentas propias, cuentas afiliadas y equipos.

**Origen:** decisión del equipo del 6 de noviembre de 2026; REQ-ACC-01; glosario, «Organización»
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una cuenta Personal creada para una sola persona y una empresa con tres cuentas
CUANDO se consulten sus organizaciones
ENTONCES la primera pertenece a una organización personal, sin área de administración ni equipos
Y la segunda a una organización de empresa, que puede tener área de administración y equipos

---

### REQ-ADM-02

**Requisito:** EL SISTEMA tratará la condición de **administrador** como una autoridad sobre la organización de empresa (sus cuentas, sus afiliaciones y sus equipos), distinta de la de responsable de un equipo, y no dará con ella acceso al contenido de ninguna cuenta ni al trabajo de ningún equipo.

**Origen:** decisión del equipo del 6 de noviembre de 2026; REQ-ACC-16, REQ-ACC-17; P-10; glosario, «Gerente» (se es responsable de un equipo, no de la organización)
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una administradora que no es responsable de ningún equipo
CUANDO abra el área de administración
ENTONCES ve las cuentas y los equipos de su organización, con su estado
Y CUANDO pida ver las tareas de un equipo, la agenda de una persona o lo que una persona habló con el asistente
ENTONCES el sistema no se lo muestra: administrar no es ver el trabajo de nadie
Y si además es responsable de un equipo, en ese equipo tiene lo que REQ-ACC-17 le da a cualquier responsable, y nada más

---

### REQ-ADM-03

**Requisito:** EL SISTEMA admitirá más de un administrador por organización de empresa, y SI una acción dejara a la organización sin ningún administrador activo, ENTONCES la rechazará sin hacer nada.

**Origen:** decisión de diseño (H-ADM-01)
**Tipo:** complejo

**Criterio de aceptación**
DADO una organización con una sola administradora
CUANDO ella intente quitarse la condición de administradora, suspender su cuenta o darla de baja
ENTONCES el sistema lo rechaza y explica que antes tiene que nombrar a otra persona
Y DADO una organización con dos administradores
CUANDO uno nombre a una tercera persona administradora
ENTONCES la organización queda con tres

---

### REQ-ADM-04

**Requisito:** EL SISTEMA creará el primer administrador de una organización de empresa en su alta de arranque, fuera de la aplicación; a partir de ahí, solo un administrador nombrará a otros.

**Origen:** REQ-ACC-01; H-ACC-01; decisión de diseño (H-ADM-02)
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una empresa nueva
CUANDO se dé de alta con su primera cuenta
ENTONCES esa cuenta es administradora de la organización
Y ninguna cuenta puede hacerse administradora a sí misma ni pedirlo desde la aplicación

---

### REQ-ADM-05

**Requisito:** DONDE una cuenta sea administradora de una organización de empresa, EL SISTEMA le ofrecerá el área de administración en la web, y solo en la web.

**Origen:** decisión de diseño (H-ADM-10); `SPEC.md` §1, «la web, para la coordinación y el seguimiento»
**Tipo:** opcional

**Criterio de aceptación**
DADO una cuenta administradora
CUANDO entre en la web
ENTONCES ve la entrada a Administración
Y DADO una cuenta que no es administradora, o la misma cuenta en la aplicación móvil
ENTONCES no ve esa entrada

---

### REQ-ADM-06

**Requisito:** SI una cuenta que no es administradora de la organización pide una acción de administración, ENTONCES EL SISTEMA la rechazará sin hacer nada y explicará que eso lo hace quien administra la organización.

**Origen:** P-04; REQ-ACC-12
**Tipo:** no deseado

**Criterio de aceptación**
DADO un responsable de equipo que no es administrador
CUANDO pida, por cualquier vía, dar de alta una cuenta o añadir a alguien a un equipo
ENTONCES el sistema no crea nada y le explica quién puede hacerlo
Y la decisión la toma el servidor con la identidad de quien pide (P-04)

---

### REQ-ADM-07

**Requisito:** SI se le pide al asistente una acción de administración, ENTONCES EL SISTEMA no la propondrá y le dirá a la persona dónde se hace.

**Origen:** decisión de diseño (H-ADM-11); P-04; P-11
**Tipo:** no deseado

**Criterio de aceptación**
DADO una administradora en la conversación
CUANDO pida «suma a Lucía al equipo de ventas»
ENTONCES el asistente no prepara ninguna propuesta y le indica que eso se hace en Administración
Y no queda nada en espera

---

## 2. Las cuentas de la organización

Una organización de empresa tiene dos clases de cuenta: las **propias**, que dio de alta ella, y las **afiliadas**, que son cuentas personales de alguien que aceptó sumarse (§3). Sobre las propias decide la organización, como dice REQ-ACC-12. Sobre las afiliadas, no: esas cuentas siguen siendo de su titular.

### REQ-ADM-08

**Requisito:** CUANDO un administrador abra el área de administración, EL SISTEMA le mostrará las cuentas de su organización, propias y afiliadas, y las invitaciones pendientes, con el correo, si es propia o afiliada, su estado, su plan, sus equipos y si es administradora.

**Origen:** decisión del equipo del 6 de noviembre de 2026; REQ-ACC-17
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una organización con cuatro cuentas propias, dos afiliadas y una invitación pendiente
CUANDO la administradora abra el área
ENTONCES ve las siete, cada una con su estado: activa, con el primer ingreso pendiente, suspendida o con la invitación pendiente
Y no ve de ninguna su zona horaria, su agenda, sus tareas, sus permisos de Google ni lo que habló con el asistente

---

### REQ-ADM-09

**Requisito:** CUANDO un administrador dé de alta una cuenta con un correo y un plan, EL SISTEMA creará una cuenta propia de la organización con una contraseña temporal que muestra una sola vez, y la cuenta tendrá que completar el primer ingreso (REQ-ACC-04).

**Origen:** REQ-ACC-01; decisión del equipo del 6 de noviembre de 2026 (el área sustituye al alta de arranque en el uso diario)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una administradora
CUANDO dé de alta `lucia@acme.test` con el Plan Empresarial y lo confirme
ENTONCES la cuenta existe, es propia de la organización y aparece con el primer ingreso pendiente
Y la contraseña temporal se ve una sola vez; si se vuelve a pedir el resultado, ya no aparece
Y al entrar, Lucía tiene que elegir contraseña nueva y zona horaria antes de continuar

---

### REQ-ADM-10

**Requisito:** SI el correo de un alta ya pertenece a una cuenta, ENTONCES EL SISTEMA no creará nada y le ofrecerá al administrador invitar a esa persona a afiliarse.

**Origen:** REQ-ACC-01; decisión de diseño (H-ADM-14)
**Tipo:** no deseado

**Criterio de aceptación**
DADO una cuenta Personal con el correo `vasco@correo.test`
CUANDO una administradora intente darlo de alta
ENTONCES no se crea ninguna cuenta y se le ofrece invitarlo
Y no se le dice de qué organización es la cuenta ni qué plan tiene

---

### REQ-ADM-11

**Requisito:** CUANDO un administrador cambie el plan de una cuenta propia de la organización, EL SISTEMA aplicará el plan nuevo solo después de que lo confirme, y la cuenta lo verá desde su siguiente acceso.

**Origen:** REQ-ACC-12; R-45
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una cuenta propia con el Plan Personal
CUANDO la administradora le asigne el Plan Empresarial y confirme
ENTONCES la cuenta pasa a tener el Plan Empresarial
Y si la administradora no confirma, el plan no cambia

---

### REQ-ADM-12

**Requisito:** CUANDO un administrador suspenda una cuenta propia de la organización, EL SISTEMA cerrará sus sesiones abiertas, no la dejará entrar mientras siga suspendida y conservará todo lo suyo; CUANDO la reactive, la cuenta volverá a entrar como antes.

**Origen:** REQ-ACC-12 («darse de baja lo decide la organización»); decisión del equipo del 6 de noviembre de 2026
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una cuenta propia con una sesión abierta
CUANDO la administradora la suspenda y confirme
ENTONCES la sesión deja de valer en su siguiente petición
Y al intentar entrar con la contraseña correcta, la persona ve que su cuenta está suspendida y que hable con quien administra su organización
Y con una contraseña incorrecta ve el mismo mensaje que cualquier otra persona (REQ-ACC-03)
Y al reactivarla, entra con su contraseña de siempre y encuentra todo como estaba

---

### REQ-ADM-13

**Requisito:** CUANDO un administrador dé de baja una cuenta propia de la organización, EL SISTEMA la cerrará para siempre: no podrá entrar ni reactivarse, saldrá de sus equipos y sus tareas abiertas del equipo quedarán como dice REQ-ADM-25.

**Origen:** REQ-ACC-12; decisión de diseño (H-ADM-15)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una cuenta propia con dos tareas abiertas en un equipo
CUANDO la administradora la dé de baja y confirme, después de ver que no se puede deshacer
ENTONCES la cuenta no puede entrar ni reactivarse, y deja de figurar como activa
Y sus dos tareas quedan sin persona asignada, a la vista del responsable del equipo
Y nada de lo que tenía se borra en esta versión

---

### REQ-ADM-14

**Requisito:** CUANDO un administrador restablezca la contraseña de una cuenta propia de la organización, EL SISTEMA generará una contraseña temporal que muestra una sola vez, cerrará las sesiones abiertas de esa cuenta y le pedirá una contraseña nueva en su siguiente ingreso.

**Origen:** REQ-ACC-04; `specs/06-acceso/spec.md` §4 (contraseña olvidada, pendiente); decisión de diseño (H-ADM-13)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una cuenta propia que olvidó su contraseña
CUANDO la administradora la restablezca y confirme
ENTONCES ve una contraseña temporal una sola vez
Y la persona, al entrar con ella, tiene que elegir una contraseña nueva antes de continuar, y conserva la zona horaria que ya tenía
Y la contraseña anterior deja de valer

---

### REQ-ADM-15

**Requisito:** SI un administrador intenta cambiar el plan, suspender, dar de baja o restablecer la contraseña de una cuenta afiliada, ENTONCES EL SISTEMA lo rechazará sin hacer nada y le ofrecerá, en su lugar, desafiliarla.

**Origen:** REQ-ACC-12 («lo decide la organización que creó la cuenta»); P-10
**Tipo:** no deseado

**Criterio de aceptación**
DADO una cuenta Personal afiliada a la organización
CUANDO la administradora intente suspenderla
ENTONCES el sistema no la suspende y le explica que esa cuenta es de la persona
Y le ofrece desafiliarla (REQ-ADM-25)

---

### REQ-ADM-16

**Requisito:** EL SISTEMA presentará cada acción de administración con lo que va a hacer, sobre qué cuenta o equipo y qué no se puede deshacer, no la ejecutará sin la confirmación del administrador, y dejará registro de quién la hizo, sobre quién, qué cambió y cuándo.

**Origen:** P-03; P-07; RN-ER-03
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una administradora que va a dar de baja una cuenta
CUANDO pida la baja
ENTONCES ve qué cuenta es, qué le pasará a sus tareas del equipo y que no se puede deshacer, antes de confirmar
Y CUANDO confirme
ENTONCES queda registro de la acción con la administradora, la cuenta, el cambio y el momento
Y una acción rechazada por falta de autoridad (REQ-ADM-06) también queda registrada

---

## 3. Afiliación de una cuenta personal

**Qué es.** Una persona con su propia cuenta Personal (o Gratuita) pasa a pertenecer a una empresa **sin dejar de ser titular de su cuenta**: la empresa la puede poner en sus equipos y asignarle tareas, y mientras dure la afiliación tiene el Plan Empresarial. Lo suyo sigue siendo suyo y la empresa no lo ve (P-10, REQ-ACC-17).

**Quién la decide.** No la pide la persona ni la asume el sistema: la propone un administrador. Pero **la persona tiene que aceptarla** (H-ADM-03). REQ-ACC-12 dice que el usuario no administra su cuenta, y aceptar no es administrarla: no cambia el correo, ni se da de baja, ni cambia de plan por su cuenta. Lo que pesa es P-10 y R-14: afiliarse expone a la persona ante una empresa, y ese consentimiento es suyo, no del cargo de nadie, igual que en REQ-CUN05-14.

### REQ-ADM-17

**Requisito:** MIENTRAS una cuenta personal no esté afiliada a una organización de empresa, EL SISTEMA le ofrecerá exactamente su plan propio, sin ninguna función que dependa de pertenecer a una empresa, y SI pide una de ellas, ENTONCES le explicará que su cuenta no pertenece a ninguna organización.

**Origen:** decisión del equipo del 6 de noviembre de 2026; `REPLANTEO.md` §4.3 (planes acumulativos)
**Tipo:** complejo

**Criterio de aceptación**
DADO una cuenta con el Plan Personal y sin afiliación
CUANDO use la aplicación
ENTONCES ve lo mismo que cualquier cuenta del Plan Personal: ni equipos, ni la franja «Encargadas», ni disponibilidad de otros
Y CUANDO pida «asígnale a Juan el informe»
ENTONCES el asistente le explica que su cuenta no pertenece a una organización y no prepara nada

---

### REQ-ADM-18

**Requisito:** CUANDO un administrador invite a afiliarse a una persona por su correo, con los equipos a los que la sumaría, EL SISTEMA creará una invitación pendiente, se la mostrará a esa persona en su aplicación y le enviará un correo que solo avisa.

**Origen:** decisión del equipo del 6 de noviembre de 2026; DP-03; REQ-CUN07-16 (el correo solo avisa)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una cuenta Personal con el correo `vasco@correo.test`
CUANDO la administradora de Acme lo invite al equipo «Ventas» y confirme
ENTONCES la invitación figura como pendiente en el área
Y Vasco recibe un correo que dice que Acme lo invitó y que lo vea en la aplicación, sin botones, sin enlaces de respuesta y sin que se pueda responder por correo
Y nada cambia en la cuenta de Vasco hasta que él decida

---

### REQ-ADM-19

**Requisito:** SI el correo invitado no pertenece a ninguna cuenta, ENTONCES EL SISTEMA no enviará nada y le ofrecerá al administrador darla de alta como cuenta propia.

**Origen:** REQ-ACC-01 (sin registro abierto); decisión de diseño (H-ADM-14)
**Tipo:** no deseado

**Criterio de aceptación**
DADO un correo sin cuenta
CUANDO una administradora intente invitarlo
ENTONCES no se crea ninguna invitación ni sale ningún correo
Y se le ofrece darlo de alta (REQ-ADM-09)

---

### REQ-ADM-20

**Requisito:** MIENTRAS una cuenta tenga una invitación pendiente, EL SISTEMA le mostrará un aviso que dice qué organización la invita, a qué equipos, qué cambiaría y qué no, con la opción de aceptar o rechazar.

**Origen:** P-10; REQ-ACC-17; R-14; decisión de diseño (H-ADM-03)
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO Vasco con una invitación pendiente de Acme
CUANDO abra la aplicación, en la web o en el móvil
ENTONCES ve un aviso que dice que Acme quiere sumarlo al equipo «Ventas»
Y qué cambia: el responsable del equipo podrá asignarle tareas, Acme lo verá en su lista con su correo y sus equipos, y tendrá el Plan Empresarial mientras siga en Acme
Y qué no cambia: su agenda, sus tareas, lo que habla con el asistente y lo marcado como personal siguen siendo suyos y Acme no los ve; compartir su disponibilidad se le pregunta aparte (REQ-CUN05-16)
Y puede aceptar o rechazar, sin que el aviso le impida seguir usando la aplicación

---

### REQ-ADM-21

**Requisito:** CUANDO la persona acepte la invitación, EL SISTEMA la afiliará a la organización y a los equipos indicados, le dará el Plan Empresarial mientras dure la afiliación y no moverá ni hará visible nada de lo que ya era suyo.

**Origen:** decisión del equipo del 6 de noviembre de 2026; P-10; D-17 (el miembro de un equipo usa el Plan Empresarial)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO Vasco, con el Plan Personal y una agenda con compromisos personales
CUANDO acepte la invitación de Acme
ENTONCES figura como afiliado en el área de Acme y como miembro de «Ventas»
Y tiene el Plan Empresarial
Y su agenda, sus tareas y su conversación con el asistente siguen donde estaban; nadie de Acme los ve
Y su disponibilidad no se comparte hasta que él lo acepte (REQ-CUN05-16)

---

### REQ-ADM-22

**Requisito:** SI la persona rechaza la invitación o no responde en 14 días, ENTONCES EL SISTEMA la dará por cerrada sin afiliarla ni cambiar nada en su cuenta, y el administrador verá que se rechazó o que caducó, sin el motivo.

**Origen:** R-14; decisión de diseño (H-ADM-03)
**Tipo:** no deseado

**Criterio de aceptación**
DADO una invitación pendiente desde hace 14 días
CUANDO pase ese plazo sin respuesta
ENTONCES la invitación figura como caducada y la cuenta no está afiliada
Y DADO una persona que la rechaza
ENTONCES figura como rechazada, y el administrador puede volver a invitarla

---

### REQ-ADM-23

**Requisito:** EL SISTEMA no afiliará ninguna cuenta personal sin que su titular lo acepte, tampoco a petición de un administrador ni de un responsable de equipo.

**Origen:** R-14; REQ-CUN05-14 («el consentimiento no se hereda del cargo»); P-10
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un administrador
CUANDO intente, por cualquier vía, dejar afiliada una cuenta personal sin que su titular haya aceptado
ENTONCES el sistema no lo hace: la cuenta sigue con su plan propio y fuera de los equipos

---

### REQ-ADM-24

**Requisito:** MIENTRAS una cuenta esté afiliada a una organización de empresa, SI otra la invita, ENTONCES EL SISTEMA le mostrará la invitación pero no le dejará aceptarla hasta que salga de la primera.

**Origen:** decisión de diseño (H-ADM-04)
**Tipo:** complejo

**Criterio de aceptación**
DADO Vasco afiliado a Acme
CUANDO Bolsa lo invite
ENTONCES Vasco ve la invitación y que para aceptarla primero tiene que salir de Acme
Y la administradora de Bolsa solo ve la invitación como pendiente, sin saber que Vasco está en Acme

---

### REQ-ADM-25

**Requisito:** CUANDO un administrador desafilie una cuenta afiliada, EL SISTEMA, después de su confirmación, la sacará de la organización y de sus equipos, le devolverá su plan propio, dejará sin persona asignada sus tareas abiertas del equipo, a la vista del responsable, conservará con su nombre lo que escribió en los hilos del equipo, dejará de consultar su disponibilidad y le avisará; nada de lo suyo se toca.

**Origen:** decisión del equipo del 6 de noviembre de 2026; P-10; REQ-CUN05-14; decisión de diseño (H-ADM-08)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO Vasco afiliado a Acme, con una tarea abierta en «Ventas» y dos comentarios en su hilo
CUANDO la administradora lo desafilie y confirme
ENTONCES Vasco vuelve a su Plan Personal y ya no ve las tareas ni los hilos de Acme
Y la tarea queda sin persona asignada, y el responsable de «Ventas» la ve así y puede asignarla a otro
Y sus dos comentarios siguen en el hilo, con su nombre
Y su disponibilidad deja de consultarse de inmediato
Y Vasco ve un aviso de que ya no pertenece a Acme
Y su agenda, sus tareas propias y su conversación con el asistente siguen como estaban

---

### REQ-ADM-26

**Requisito:** CUANDO una persona afiliada decida salir de la organización, EL SISTEMA, después de su confirmación, hará lo mismo que en REQ-ADM-25 y avisará a los administradores.

**Origen:** R-14 (revocable sin pasar por el gerente); P-10; decisión de diseño (H-ADM-07)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO Vasco afiliado a Acme
CUANDO elija salir de Acme y confirme, después de ver qué pasará con sus tareas del equipo
ENTONCES queda como en REQ-ADM-25
Y los administradores de Acme ven que salió

---

### REQ-ADM-27

**Requisito:** SI una cuenta propia de la organización pide salir de ella, ENTONCES EL SISTEMA lo rechazará y explicará que esa cuenta la administra la organización.

**Origen:** REQ-ACC-12
**Tipo:** no deseado

**Criterio de aceptación**
DADO Lucía, con una cuenta propia de Acme
CUANDO busque salir de la organización
ENTONCES la aplicación no se lo ofrece, y si lo pide por otra vía, el sistema lo rechaza sin cambiar nada

---

## 4. Equipos

Lo mínimo para que CUN-05 (disponibilidad), CUN-07 (delegar) y CUN-08 (seguimiento) tengan un equipo, sus miembros y su responsable sobre los que apoyarse. La autoridad va **por equipo** (REQ-ACC-16).

### REQ-ADM-28

**Requisito:** CUANDO un administrador cree un equipo con un nombre, EL SISTEMA lo creará en su organización, sin miembros, y rechazará un nombre que ya use otro equipo de la misma organización.

**Origen:** EN-05 Equipo de Trabajo; REQ-ACC-16
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una organización sin equipos
CUANDO la administradora cree «Ventas» y confirme
ENTONCES el equipo existe, vacío y sin responsable
Y si intenta crear otro «Ventas», el sistema lo rechaza

---

### REQ-ADM-29

**Requisito:** CUANDO un administrador añada una cuenta a un equipo, EL SISTEMA la sumará solo si pertenece a la organización (propia y activa, o afiliada), y una misma cuenta podrá estar en varios equipos.

**Origen:** REQ-ACC-16 (una cuenta puede ser responsable de un equipo y miembro de otro)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO Lucía, cuenta propia activa, y Vasco, con una invitación todavía pendiente
CUANDO la administradora añada a los dos a «Ventas»
ENTONCES Lucía queda como miembro y Vasco no, porque todavía no aceptó; su invitación ya dice a qué equipos se sumaría (REQ-ADM-18)
Y Lucía puede estar también en «Soporte»

---

### REQ-ADM-30

**Requisito:** CUANDO un administrador nombre responsable de un equipo a uno de sus miembros, EL SISTEMA le dará en ese equipo la autoridad de responsable y en los demás solo la que tenga en cada uno; un equipo tendrá como mucho un responsable, y nombrar a otro le quitará la autoridad al anterior.

**Origen:** REQ-ACC-16; decisión de diseño (H-ADM-09)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO Lucía, miembro de «Ventas» y de «Soporte»
CUANDO la administradora la nombre responsable de «Ventas» y confirme
ENTONCES Lucía puede asignar tareas y ver el trabajo de «Ventas», y en «Soporte» sigue siendo un miembro más
Y si después nombra responsable de «Ventas» a Vasco, Lucía pasa a ser miembro de «Ventas» y las tareas que asignó siguen como estaban

---

### REQ-ADM-31

**Requisito:** CUANDO un administrador quite a una cuenta de un equipo, EL SISTEMA dejará sin persona asignada sus tareas abiertas de ese equipo, a la vista del responsable, conservará con su nombre lo que escribió en sus hilos y, si era su responsable, dejará el equipo sin responsable.

**Origen:** REQ-ACC-16; decisión de diseño (H-ADM-08)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO Lucía, responsable de «Ventas», con una tarea abierta en él
CUANDO la administradora la quite del equipo y confirme
ENTONCES Lucía ya no ve el trabajo de «Ventas»
Y el equipo queda sin responsable, y la tarea, sin persona asignada
Y nadie hereda la autoridad por su cuenta

---

### REQ-ADM-32

**Requisito:** MIENTRAS un equipo no tenga responsable, EL SISTEMA no dejará asignar tareas en él a nadie y se lo señalará a los administradores en el área.

**Origen:** REQ-ACC-15, REQ-ACC-16
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO «Ventas» sin responsable
CUANDO un miembro pida asignar una tarea a un compañero del equipo
ENTONCES el sistema lo rechaza como cuando no se es responsable, y le ofrece hacerle una petición (REQ-CUN07-18)
Y en el área, «Ventas» figura sin responsable

---

## 5. Diseño

**Plataforma:** solo web (REQ-ADM-05, H-ADM-10). El aviso de afiliación de la persona (REQ-ADM-20) aparece en la web **y** en el móvil, porque es de su aplicación, no del área.

**Dónde va.** No es una cuarta sección: las secciones son tres (R-32). Es un área aparte, a la que se llega desde una entrada al pie de la navegación, junto a Ajustes, visible solo para quien administra. Ocupa el ancho de la conversación y del lienzo, porque aquí no se habla con el asistente (REQ-ADM-07).

**Cuadros:** no existen. Se piden `WEB-v2 / Administración / 01 Personas`, `02 Dar de alta`, `03 Invitar`, `04 Equipos` y `05 Confirmación`, y el aviso de afiliación en `WEB-v2 / Avisos / 01` y su equivalente móvil.

**Textos de pantalla (R-40).** «Administración», «Personas», «Equipos», «Dar de alta», «Invitar», «Suspender», «Dar de baja», «Restablecer contraseña», «Quitar de la organización». Nunca «afiliación», «cuenta propia» ni «pertenencia», que son vocabulario del equipo: a la persona se le dice «Acme quiere sumarte a su organización».

---

## 6. Lo que esta área NO hace

| No hace | Por qué |
|---|---|
| **Facturación ni precio** | D-18 sigue abierta. El área sabe qué cuentas tienen el Plan Empresarial, pero no cobra ni cuenta asientos |
| **Registro abierto** | REQ-ACC-01. Ni el área ni la invitación crean cuentas para quien no tiene una sin que un administrador la dé de alta |
| **Administración desde el móvil** | El móvil es para la captura y el día a día (`SPEC.md` §1). Administrar se hace rara vez, sobre listas y con efectos sobre otras personas, y conviene hacerlo con calma y con la tabla delante (H-ADM-10) |
| **Administrar desde el asistente** | REQ-ADM-07, H-ADM-11 |
| **Cambiar el correo de una cuenta** | REQ-ACC-12 lo deja en manos de la organización, pero nadie lo ha pedido todavía. Queda para otra versión |
| **Borrar datos de una cuenta dada de baja** | Falta decidir cuánto tiempo se conservan (H-ADM-15) |
| **Ver la agenda, las tareas o la conversación de nadie** | REQ-ADM-02, P-10 |
| **Pertenecer a dos empresas a la vez** | REQ-ADM-24, H-ADM-04 |
| **Archivar o borrar un equipo** | No hace falta para la fase 4; se decide al especificar el seguimiento (CUN-08) |
| **Consultar el registro de acciones administrativas desde el área** | Queda registro (REQ-ADM-16), pero mostrarlo es parte de Actividad con alcance de equipo (`design/ARQUITECTURA-VISUAL-WEB.md` §6), sin especificar |

---

## 7. Decisiones tomadas durante el diseño

Detectadas al escribir esta especificación el 6 de noviembre de 2026. **Pendientes de revisión del equipo.** Lo que asume el plan mientras tanto está en `plan.md`.

| # | Decisión | Afecta |
|---|---|---|
| H-ADM-01 | **El administrador es una condición de la pertenencia a la organización, no un rol de la cuenta ni un tipo de gerente.** «Gerente» es responsable de un equipo (glosario); administrar es otra autoridad, sobre cuentas y equipos, sin ver el trabajo de nadie. Puede haber varios y nunca ninguno. Se descartó «la primera cuenta es la administradora para siempre»: si esa persona se va, la organización queda sin nadie que la administre | REQ-ADM-02, 03 |
| H-ADM-02 | El primer administrador lo crea el alta de arranque, fuera de la aplicación, igual que hoy se crean todas las cuentas (H-ACC-01). Después el área sustituye a ese alta en el uso diario | REQ-ADM-04, 09 |
| H-ADM-03 | **La afiliación necesita que la persona la acepte**, y la invitación caduca a los 14 días. El equipo decidió que no la pide el usuario ni la asume el sistema; aceptar no es pedirla. Pesa P-10: la cuenta es de la persona, y sumarla a una empresa sin su sí la expone ante ella | REQ-ADM-20 a 23 |
| H-ADM-04 | Una cuenta pertenece a **una sola empresa a la vez**. Dos empresas exigirían elegir en cada pedido para cuál se trabaja, y eso no está diseñado | REQ-ADM-24 |
| H-ADM-05 | **Cuentas propias y afiliadas.** Sobre las propias, la organización decide plan, suspensión, baja y contraseña (REQ-ACC-12). Sobre las afiliadas, solo puede desafiliarlas: la cuenta tiene otra titular | REQ-ADM-11 a 15 |
| H-ADM-06 | Mientras dura la afiliación, la cuenta tiene el **Plan Empresarial**; su plan propio se guarda y vuelve al salir. Sigue D-17 a enmendada: quien está en un equipo usa el Plan Empresarial | REQ-ADM-17, 21, 25 |
| H-ADM-07 | **La persona afiliada puede salir por su cuenta**; una cuenta propia no. El consentimiento es revocable sin pasar por nadie (R-14), y salir no es administrar la cuenta (REQ-ACC-12) | REQ-ADM-26, 27 |
| H-ADM-08 | Al salir alguien de un equipo, **sus tareas abiertas quedan sin persona asignada**, a la vista del responsable, y **los hilos se quedan con el equipo**, con lo que escribió firmado con su nombre. No se reasigna sola: a quién va una tarea lo decide el responsable (REQ-ACC-15) | REQ-ADM-13, 25, 31 |
| H-ADM-09 | **Un responsable por equipo, como mucho.** Los requisitos de `03-tareas` hablan de «el responsable», en singular | REQ-ADM-30 |
| H-ADM-10 | **Solo web**, y como área aparte, no como cuarta sección (R-32). El diseño web ya saca la configuración de la barra de trabajo y la lleva al pie (`design/ARQUITECTURA-VISUAL-WEB.md` §7) | REQ-ADM-05; §5 |
| H-ADM-11 | **El asistente no administra.** Administrar es autoridad sobre otras personas, y P-04 pide que el permiso lo decida el servidor con la identidad de quien pide, no lo que interprete el modelo. Por eso el área no es un camino manual paralelo al asistente (P-11): no hay camino por el asistente. Choca con la premisa de `SPEC.md` §1 («entre una pantalla más y pedírselo al agente, se elige el agente»); se anota para que el equipo lo confirme | REQ-ADM-07 |
| H-ADM-12 | Toda acción del área pide confirmación, con lo que es irreversible a la vista (P-03), aunque no salga de NexoAI: afecta a otra persona | REQ-ADM-16 |
| H-ADM-13 | Restablecer la contraseña **no vuelve a pedir la zona horaria**: REQ-ACC-04 la pide en el primer ingreso, y aquí ya está elegida | REQ-ADM-14 |
| H-ADM-14 | El área **sí le dice al administrador si un correo tiene cuenta**, al dar de alta o al invitar. Es inevitable en el alta, porque el correo es único, y ocultarlo en la invitación no protegería nada. Se limita a eso: nunca de qué organización es ni qué plan tiene. Alternativa descartada: responder lo mismo en los dos casos, como REQ-ACC-03 | REQ-ADM-10, 19, 24 |
| H-ADM-15 | **Dar de baja no borra datos** en esta versión: la cuenta se cierra y lo suyo se conserva hasta que se decida cuánto tiempo | REQ-ADM-13 |
