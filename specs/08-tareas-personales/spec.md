# Especificación — Tareas personales (CUN-03 Gestionar tareas personales)

**Origen:** Entregable 1, modelado del negocio. Caso de uso CUN-03, trabajador TN-01 Asistente Personal Inteligente, entidad EN-04 Tarea. Hito 3 de `PLAN-VALOR-USUARIO.md`.
**Notación:** EARS.
**Estado:** **borrador del 8 de noviembre de 2026, ajustado el 11 de noviembre de 2026 a 10 requisitos, pendiente de aval del equipo.** Hasta que se avale, ningún requisito de este archivo se implementa.

---

## Alcance

Las tareas que una persona se pide a sí misma: anotarlas, verlas por franjas, completarlas, cambiarlas, posponerlas y cancelarlas. Se piden al asistente (R-42); los controles directos sobre algo que ya existe funcionan también sin él (DP-01).

**Alcance mínimo decidido en `PLAN-VALOR-USUARIO.md`:** registrar, ver por franjas, completar, cambiar fecha o texto, cancelar. **Sin** subtareas, recurrencia ni categorías (D-16).

**Fuera de esta especificación:**

- Las tareas delegadas y las peticiones entre compañeros: `../03-tareas/spec.md`.
- Proponer el día con las tareas dentro: `../02-jornada/spec.md`.
- El hilo de una tarea (REQ-AGT-05) y la sección Actividad (hito 4).
- Recordatorios y notificaciones de tareas. El Entregable 1 los prevé; en esta versión no hay (decisión 6).

**Qué es una tarea y qué no (regla del diseño).** Si hay algo que hacer, es una tarea. Si es algo que la persona pensó o que pasó, es un apunte: vive en su día y no aparece en Tareas (`design/ARQUITECTURA-VISUAL-MOVIL.md`, «La regla que separa tarea de apunte»).

---

## Requisitos

### REQ-CUN03-01

**Requisito:** CUANDO la persona pida anotar algo que hay que hacer, EL SISTEMA propondrá una tarea con su título y, solo si la persona la dijo, su fecha, y no la creará hasta que la persona confirme; si la persona no indica fecha, la propondrá sin fecha y no inventará ninguna.

**Origen:** CUN-03 flujo principal; REQ-CAP-02; REQ-CAP-07; R-38; P-03; REQ-CUN01-03
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario con el asistente disponible
CUANDO escriba «recuérdame pagar el recibo el viernes»
ENTONCES el asistente muestra una tarjeta con el título «Pagar el recibo» y el viernes como fecha, y todavía no existe ninguna tarea
Y CUANDO la persona confirme
ENTONCES la tarea existe y aparece en la franja «con fecha»
Y DADO que escribe «tengo que renovar mi pasaporte» y confirma la tarjeta
ENTONCES la tarea queda en la franja «sin fecha»
Y ninguna fecha fue puesta por el sistema

---

### REQ-CUN03-02

**Requisito:** SI lo que la persona dice no pide hacer nada, ENTONCES EL SISTEMA no creará una tarea.

**Origen:** regla «tarea o apunte» de `design/ARQUITECTURA-VISUAL-MOVIL.md`; REQ-CAP-02
**Tipo:** no deseado

**Criterio de aceptación**
DADO un usuario con el asistente disponible
CUANDO escriba «hoy me encontré con Juan en el banco»
ENTONCES no se propone ninguna tarea
Y no aparece nada nuevo en la sección Tareas

---

### REQ-CUN03-03

**Requisito:** EL SISTEMA mostrará las tareas pendientes de la persona en tres franjas, «con fecha», «sin fecha» y «esperando de alguien», sin niveles de período, y marcará como atrasada la tarea cuya fecha ya pasó.

**Origen:** R-38; R-23; P-02
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un usuario con una tarea para el viernes, una sin fecha y una que espera a Marta
CUANDO abra la sección Tareas
ENTONCES ve cada una en su franja, y la sin fecha no aparece asociada a ningún día
Y DADO una tarea cuya fecha fue ayer
ENTONCES aparece marcada como atrasada, calculado por el código y no por el modelo

---

### REQ-CUN03-04

**Requisito:** CUANDO la persona pregunte por lo que tiene pendiente, EL SISTEMA responderá con la lista de sus tareas pendientes tal como están en ese momento, armada con los datos reales y no con texto del modelo.

**Origen:** hito 3 de `PLAN-VALOR-USUARIO.md`; REQ-CUN01-13 (misma regla para la agenda)
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario con tres tareas pendientes y una completada
CUANDO escriba «¿qué tengo pendiente?»
ENTONCES el asistente lista exactamente las tres pendientes, con su fecha si la tienen
Y la completada no aparece

---

### REQ-CUN03-05

**Requisito:** CUANDO la persona marque una tarea como hecha, EL SISTEMA la pasará a completada con la fecha y la hora del cierre y dejará de mostrarla en las franjas; y EL SISTEMA permitirá reabrirla.

**Origen:** CUN-03; DP-01; R-25
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario con una tarea pendiente
CUANDO pulse «Hecho» en la lista, sin el asistente disponible
ENTONCES la tarea queda completada con su fecha y hora de cierre y sale de las franjas
Y CUANDO la reabra
ENTONCES vuelve a su franja
Y DADO que pide al asistente «marca como hecha la del recibo»
ENTONCES el asistente propone la acción con una tarjeta y no la ejecuta hasta que la persona confirme

---

### REQ-CUN03-06

**Requisito:** CUANDO la persona pida cambiar el texto o la fecha de una tarea, posponerla o cancelarla, EL SISTEMA propondrá el cambio mostrando cómo está y cómo quedaría, y no lo aplicará hasta que la persona confirme; una tarea cancelada quedará como cancelada, sin borrarse.

**Origen:** CUN-03; R-25; P-03; REQ-CUN01-02
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una tarea «Pagar el recibo» para el viernes
CUANDO la persona escriba «pásala al lunes»
ENTONCES la tarjeta muestra viernes y lunes, y la tarea sigue para el viernes
Y CUANDO confirme
ENTONCES la tarea queda para el lunes
Y DADO que pide «quítale la fecha»
ENTONCES, tras confirmar, la tarea pasa a la franja «sin fecha»
Y DADO que pide cancelarla y confirma
ENTONCES la tarea deja de aparecer en las franjas
Y sigue existiendo, marcada como cancelada, para poder consultarse después

---

### REQ-CUN03-07

**Requisito:** CUANDO una tarea dependa de que otra persona responda, EL SISTEMA guardará solo qué se espera y de quién, y la mostrará en la franja «esperando de alguien»; no escribirá nada más sobre esa persona ni se pondrá en contacto con ella.

**Origen:** R-12; REQ-CAP-02; P-09
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un usuario con el asistente disponible
CUANDO escriba «estoy esperando que Marta me mande el contrato» y confirme
ENTONCES la tarea aparece en «esperando de alguien», con «contrato» y «Marta»
Y no se envía ningún mensaje a Marta
Y no se guarda ninguna nota sobre Marta

---

### REQ-CUN03-08

**Requisito:** SI una tarea tiene fecha, ENTONCES EL SISTEMA la mostrará en la agenda de ese día como un bloque distinto de un compromiso, sin crear nada en el calendario conectado y sin tratarla como un choque de horario.

**Origen:** hito 3 de `PLAN-VALOR-USUARIO.md` (tarea con fecha y hora en la agenda); R-23; REQ-CUN01-02
**Tipo:** no deseado

**Criterio de aceptación**
DADO una tarea con fecha y hora y un compromiso a la misma hora
CUANDO la persona abra Hoy
ENTONCES ve los dos, y la tarea se distingue visualmente del compromiso
Y no existe ningún evento nuevo en el calendario conectado
Y el sistema no declara conflicto entre ellos al proponer o confirmar

---

### REQ-CUN03-09

**Requisito:** CUANDO las tareas estén disponibles, EL SISTEMA propondrá, para que la persona confirme, cada tarea que quedó guardada en espera, usando como referencia de «mañana», «el viernes» y similares el momento en que la persona la escribió, y no creará ninguna por su cuenta.

**Origen:** REQ-AGT-02; REQ-CAP-24; P-11; decisión 27 de `07-agente`
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO «recuérdame pagar el recibo el viernes», escrito un miércoles y guardado en espera
CUANDO las tareas estén disponibles
ENTONCES la persona ve una propuesta con ese título y el viernes de esa semana
Y ninguna tarea existe hasta que confirme
Y DADO que descarta la propuesta
ENTONCES no se crea nada y la solicitud deja de estar en espera

---

### REQ-CUN03-10

**Requisito:** EL SISTEMA mostrará las tareas personales de una persona solo a ella, y no al responsable de su equipo ni a la organización que paga la cuenta.

**Origen:** P-04; P-10; R-22; REQ-ACC-17
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un colaborador con tareas personales y un gerente de su equipo
CUANDO el gerente consulte las tareas del equipo
ENTONCES no ve ninguna de las tareas personales del colaborador
Y DADO que el colaborador consulta sus tareas
ENTONCES ve las suyas personales y las que le asignaron, separadas

---

## Decisiones tomadas al redactar, que el equipo debe confirmar

| # | Decisión propuesta | Afecta |
|---|---|---|
| 1 | Una tarea personal tiene tres estados: **pendiente, completada y cancelada**. La enumeración de estados de EN-04 del Entregable 1 no se contrastó al redactar este borrador: **hay que compararla** antes de avalar | REQ-CUN03-03, 05, 06 |
| 2 | **Completar desde la lista es de un toque, sin tarjeta**, porque no sale de la aplicación y se puede reabrir. **Completar pidiéndoselo al asistente sí lleva tarjeta**, como todo lo que él propone | REQ-CUN03-05 |
| 3 | Orden dentro de las franjas: «con fecha» por fecha, la más próxima arriba y las atrasadas primero; «sin fecha» y «esperando de alguien», la más reciente arriba | REQ-CUN03-03 |
| 4 | Una fecha sin hora es **un día del calendario, no un instante**: no cambia si la persona cambia de zona horaria. Una tarea con fecha y sin hora aparece en la agenda de su día, sin horario, después de lo de todo el día | REQ-CUN03-08 |
| 5 | Las tareas **no cuentan** en los puntos de Mes (decisión 25 de `02-agenda`: Agenda contesta «qué», no «cuánto») ni generan conflictos | REQ-CUN03-08 |
| 6 | **Sin recordatorios ni notificaciones** de tareas en esta versión | Alcance |
| 7 | Las tareas están disponibles en todos los planes (Gratuito ⊂ Personal ⊂ Empresarial). Si D-7 fija un límite de tareas para el Gratuito, se añade un requisito | D-7 |
| 8 | Marcar como hecha una tarea «esperando de alguien» solo la completa; el sistema no pregunta ni avisa a la otra persona | REQ-CUN03-05, 07 |
| 9 | **De 12 a 10 requisitos (11 de noviembre de 2026).** Anotar con y sin fecha es un solo requisito (antes 01 y 02); cambiar, posponer y cancelar es un solo requisito (antes 07 y 08). No se perdió ningún criterio de aceptación | REQ-CUN03-01, 06 |

## Cambios que este spec provoca en otros archivos

- `../07-agente/spec.md`: **REQ-AGT-02** deja de decir que una tarea se conserva en espera «hasta que pueda registrarse». Las tareas pasan a registrarse; en espera solo queda lo que sigue sin existir (por ejemplo, el correo).
- `../01-captura/spec.md`: la decisión 2 del §11 («Solo agenda… una tarea queda en espera») se retira cuando se implemente.
- `../glosario.md`: completar la entrada **Tarea** con «personal» y los tres estados.
- `SPEC.md`: §5 (fila nueva), §6 (CUN-03 pasa de «Parcial» a «Especificado») y una línea en §11.
- `tools/trazabilidad.py`: añadir `"CUN03": "1"` a `FASE_POR_PREFIJO`.
