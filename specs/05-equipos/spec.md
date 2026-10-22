# Especificación — Equipos y reuniones (CUN-05 Consultar disponibilidad de equipo)

**Origen:** Entregable 1. Caso de uso CUN-05, trabajador TN-02 Coordinador Empresarial Inteligente, entidades EN-01 Perfil de Usuario, EN-05 Equipo de Trabajo y EN-02 Evento de Agenda.
**Notación:** EARS.
**Plataforma:** web.

---

## 1. RN-CAL-01 — criterio aprobado

**Estado: aprobado el 26 de septiembre de 2026.** Hasta esa fecha el criterio de selección era una propuesta escrita desde fuera del modelo. Queda incorporado como decisión del equipo y CUN-05 deja de estar bloqueado.

### Qué dice el Entregable 1 y qué faltaba

RN-CAL-01 está definida en la Actividad 9 como regla de cálculo, con este texto:

> La disponibilidad común se determina comparando los intervalos libres de los participantes.

Eso establece **cómo se encuentra** un intervalo común, pero no **cuál de varios es el que se propone primero**. Sin ese segundo tramo no se puede escribir el requisito de ordenamiento ni decidir qué resalta la rejilla, y CUN-05 y CUN-06 quedan sin poder especificarse.

### Criterio aprobado

Las alternativas se determinan y ordenan aplicando, en este orden:

1. **Duración.** Si el gerente indica una duración, solo son alternativa los intervalos libres comunes que la admitan. Si no la indica, se presentan los intervalos libres comunes tal como resultan, sin filtrar por longitud.
2. **Banda horaria admisible.** Un intervalo fuera de la banda laboral por defecto no es alternativa, aunque las agendas estén libres, salvo petición explícita del gerente.
3. **La más temprana primero.** Entre alternativas válidas, gana la de hora de inicio más temprana.
4. **Desempate por holgura.** A igual hora de inicio, gana el intervalo más largo, porque deja margen.
5. **A partir del día siguiente**, salvo que el gerente pida explícitamente el mismo día.

### Valores de la banda horaria

| Franja | Tratamiento |
|---|---|
| 08:00 – 20:00 | Alternativa normal |
| 20:00 – 22:00 | Solo si el gerente lo pide explícitamente |
| Fuera de 08:00 – 22:00 | Solo con petición explícita, y la interfaz advierte que está fuera de banda |

La banda es un parámetro de la plataforma, no un dato de cada participante. Cambiar los valores es cambiar esta tabla; no afecta ningún requisito.

### Por qué este criterio

- Es **verificable**: dos personas con los mismos datos obtienen el mismo orden. El desempate por holgura es lo que lo hace determinista; sin él, dos alternativas del mismo inicio quedaban sin resolver.
- Es **explicable al usuario** en una línea, lo que importa porque la interfaz debe poder decir por qué propuso ese horario.
- No requiere datos que el negocio no tenga, con una sola excepción declarada más abajo.

### Dos consecuencias declaradas

**No se añade horario laboral al Perfil de Usuario.** La banda es de la plataforma, así que el criterio no obliga a modelar el horario declarado de cada persona. El diagrama de clases del Entregable 1 no lleva atributos, y este criterio no lo cambia. El costo de esa decisión es que una persona con jornada atípica recibe propuestas dentro de una banda que no es la suya; se acepta en esta versión.

**Sí se añade zona horaria al Perfil de Usuario.** El punto 3 del criterio —la más temprana— no tiene sentido sin saber temprano para quién. La zona horaria pasa a ser dato del perfil, y la rejilla se presenta en la zona de quien consulta, convirtiendo las horas de los demás participantes. Es el único dato nuevo que este criterio introduce.

### Qué queda fuera de esta versión

Preferencias personales de horario, carga de trabajo del participante, fragmentación de agenda y jornadas atípicas por persona. Si el negocio quiere incorporarlos, es una revisión de esta regla, no un caso de uso nuevo.

### Cambio pendiente en el Entregable 1

El criterio debe incorporarse **extendiendo el texto de RN-CAL-01 con una segunda oración**, no creando una regla nueva. RN-CAL-01 está referenciada en cuatro lugares del Entregable 1: la tabla de reglas por tipo, la tabla caso de uso → reglas, la matriz de trazabilidad de la cabecera y el detalle de CUN-05 y CUN-06. Un identificador nuevo obligaría a editar los cuatro y arriesgaría dejar una regla que ningún caso de uso invoca. Extender el texto conserva el identificador y las cuatro referencias siguen siendo correctas sin tocarlas.

---

## 2. Requisitos

### REQ-CUN05-01

**Requisito:** CUANDO el gerente indique los participantes, EL SISTEMA identificará a cada uno como un Perfil de Usuario perteneciente a un Equipo de Trabajo.

**Origen:** CUN-05 flujo principal, pasos 1 y 2
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un gerente con un equipo asignado
CUANDO indique tres integrantes por nombre
ENTONCES el sistema resuelve cada nombre a un Perfil de Usuario concreto del equipo y los muestra como seleccionados

---

### REQ-CUN05-02

**Requisito:** EL SISTEMA consultará los Eventos de Agenda de todos los participantes indicados en el rango solicitado antes de determinar la disponibilidad.

**Origen:** CUN-05 flujo principal, paso 3; RN-OP-02
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un conjunto de participantes seleccionados
CUANDO se solicite la disponibilidad de un rango de fechas
ENTONCES el sistema ha consultado los compromisos de cada participante en ese rango antes de presentar resultado alguno

---

### REQ-CUN05-03

**Requisito:** DONDE el gerente haya indicado una duración, EL SISTEMA considerará alternativa únicamente el intervalo libre simultáneamente para todos los participantes cuya duración sea igual o mayor a la solicitada.

**Origen:** RN-INF-01, RN-CAL-01 punto 1
**Tipo:** funcionalidad opcional

**Criterio de aceptación**
DADO tres participantes y una duración solicitada de 60 minutos
CUANDO exista un intervalo de 45 minutos libre para los tres
ENTONCES ese intervalo no aparece como alternativa

---

### REQ-CUN05-04

**Requisito:** SI el gerente no indica una duración, ENTONCES EL SISTEMA presentará los intervalos libres comunes tal como resultan, sin filtrarlos por longitud, indicando la duración de cada uno.

**Origen:** RN-CAL-01 punto 1
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO una consulta de disponibilidad sin duración indicada
CUANDO existan intervalos libres comunes de 30, 45 y 120 minutos
ENTONCES los tres se presentan como alternativa, cada uno con su duración visible, y el sistema no pide la duración como requisito previo

---

### REQ-CUN05-05

**Requisito:** EL SISTEMA excluirá de las alternativas todo intervalo fuera de la banda horaria admisible, salvo que el gerente lo solicite explícitamente.

**Origen:** RN-CAL-01 punto 2
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un intervalo libre para todos los participantes de 23:00 a 00:00
CUANDO se consulte la disponibilidad sin petición explícita de horario nocturno
ENTONCES ese intervalo no aparece como alternativa, y la rejilla lo presenta como franja fuera de banda, no como franja ocupada

---

### REQ-CUN05-06

**Requisito:** EL SISTEMA ordenará las alternativas por hora de inicio más temprana, resolviendo la igualdad de inicio a favor del intervalo de mayor duración, y podrá indicar al usuario por qué una alternativa aparece primero.

**Origen:** RN-CAL-01 puntos 3 y 4
**Tipo:** ubicuo

**Criterio de aceptación**
DADO dos alternativas válidas, una a las 09:00 y otra a las 15:00 del mismo día
CUANDO se presenten al gerente
ENTONCES la de las 09:00 aparece primero y la interfaz permite conocer el criterio de orden
Y DADO dos alternativas que empiezan a las 09:00, una de 60 y otra de 120 minutos
ENTONCES la de 120 minutos aparece primero

---

### REQ-CUN05-07

**Requisito:** EL SISTEMA presentará toda disponibilidad en la zona horaria declarada en el Perfil de Usuario de quien consulta, indicándola explícitamente.

**Origen:** RN-CAL-01, consecuencia declarada; REQ-CUN01-10
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un gerente con zona horaria de Perú y un participante con zona horaria de España
CUANDO se presente la rejilla de disponibilidad
ENTONCES los horarios se muestran convertidos a la zona del gerente y la interfaz declara cuál es esa zona

---

### REQ-CUN05-08

**Requisito:** SI algún participante no tiene información de disponibilidad, ENTONCES EL SISTEMA lo indicará y presentará únicamente los resultados que sí puede calcular.

**Origen:** CUN-05 EX-01
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un participante sin permiso de calendario concedido
CUANDO se consulte la disponibilidad del grupo
ENTONCES el sistema señala a ese participante como sin datos, no lo cuenta como libre, y advierte que el resultado es parcial

---

### REQ-CUN05-09

**Requisito:** SI no existe ningún intervalo común válido, ENTONCES EL SISTEMA lo informará y ofrecerá modificar las condiciones o cancelar la consulta.

**Origen:** CUN-05 EX-02, RN-ER-01
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO participantes sin ningún intervalo libre común en el rango
CUANDO se consulte la disponibilidad
ENTONCES el sistema lo informa explícitamente y ofrece ampliar el rango, quitar participantes, reducir la duración o cancelar

---

### REQ-CUN05-10

**Requisito:** CUANDO el gerente modifique el conjunto de participantes, la duración o el rango, EL SISTEMA repetirá la consulta con las condiciones nuevas.

**Origen:** CUN-05 FA-01
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una consulta ya resuelta
CUANDO el gerente quite un participante o cambie la duración
ENTONCES el sistema recalcula y presenta las alternativas de las condiciones nuevas

---

### REQ-CUN05-11

**Requisito:** EL SISTEMA mostrará únicamente la disponibilidad de equipos sobre los que el gerente tiene permiso.

**Origen:** RN-OP-01, RN-OP-02
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un gerente sin permiso sobre un equipo
CUANDO intente consultar su disponibilidad
ENTONCES el sistema no muestra ningún compromiso de sus integrantes e indica que falta permiso

---

## 3. De dónde sale la disponibilidad de cada participante

**Reescrita el 22 de octubre de 2026 (D-17).** Ahora hay dos clases de participante:

| Participante | Tiene cuenta | De dónde sale su disponibilidad |
|---|---|---|
| **Colaborador** del equipo | Sí, rol `colaborador` | De su propio calendario de Google conectado, si acepta compartirla con su equipo (REQ-CUN05-16) |
| **Participante externo** | No | De una invitación por correo que acepta (REQ-CUN05-12) |

En los dos casos rigen las mismas reglas: solo libre u ocupado (REQ-CUN05-13), el consentimiento es de la persona y revocable (REQ-CUN05-14), y quien no ha aceptado aparece sin datos (R-15).

### REQ-CUN05-12

**Requisito:** CUANDO el gerente incorpore a un participante externo, sin cuenta, EL SISTEMA le enviará una invitación por correo solicitando autorización para consultar su disponibilidad. *(Revisado el 22 de octubre de 2026, D-17: decía «que no es usuario»; desde D-17 los colaboradores sí lo son.)*

**Origen:** decisión de alcance; RN-OP-02
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un participante nuevo, identificado por su correo
CUANDO el gerente lo incorpore al equipo
ENTONCES se envía una invitación que explica qué se va a consultar y qué no
Y hasta que responda, el participante figura **sin datos**

---

### REQ-CUN05-13

**Requisito:** EL SISTEMA consultará únicamente los intervalos libres y ocupados de otro participante, sea colaborador o externo, nunca el contenido de sus eventos. *(Revisado el 22 de octubre de 2026, D-17: decía «de un participante externo». Con cuenta propia, el colaborador mantiene la misma protección frente a su gerente, como pide R-22.)*

**Origen:** regla de producto R-13; propuesta técnica §9, minimización
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un participante que concedió la autorización
CUANDO el sistema determine la disponibilidad común
ENTONCES dispone de sus intervalos ocupados
Y en ninguna pantalla, informe ni registro aparece el título, el lugar ni los asistentes de sus compromisos

**Nota.** Es todo lo que CUN-05 necesita, y es lo que hace que la invitación sea aceptable para alguien que ni siquiera usa el producto. Pedir los títulos de las reuniones de un tercero es pedir demasiado, y la gente no acepta.

---

### REQ-CUN05-14

**Requisito:** EL SISTEMA requerirá que la autorización la conceda la propia persona, y permitirá revocarla en cualquier momento sin intervención del gerente.

**Origen:** regla de producto R-14; RN-OP-01
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un gerente con permiso sobre el equipo
CUANDO intente conceder por su cuenta el acceso al calendario de un integrante
ENTONCES el sistema no lo permite: el consentimiento no se hereda del cargo
Y DADO un participante que revoca su autorización
ENTONCES deja de consultarse su disponibilidad de inmediato, y pasa a figurar sin datos

---

### REQ-CUN05-15

**Requisito:** EL SISTEMA presentará al gerente el estado de autorización de cada participante, distinguiendo pendiente, concedida, rechazada y revocada.

**Origen:** REQ-CUN05-12 y 14
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un equipo con participantes en estados distintos
CUANDO el gerente consulte el equipo
ENTONCES ve el estado de cada uno, y entiende por qué el resultado de una consulta es parcial

---

### REQ-CUN05-16

**Requisito:** CUANDO un colaborador con cuenta acepte compartir su disponibilidad con su equipo, EL SISTEMA la obtendrá de su propio calendario conectado, sin invitación por correo.

**Origen:** decisión D-17; RN-OP-02; R-14
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO un colaborador que conectó su calendario de Google desde su aplicación (REQ-ACC-14)
CUANDO acepte compartir su disponibilidad con su equipo
ENTONCES el gerente ve sus intervalos libres y ocupados en la rejilla, sin títulos ni detalles
Y DADO un colaborador que no lo aceptó, o que lo retiró (REQ-ENC-12)
ENTONCES figura sin datos, igual que un externo pendiente

---

**Lo que ya estaba previsto sin saberlo.** La excepción EX-01 de CUN-05 —«algún participante no tiene información de disponibilidad»— describe exactamente el estado de quien aún no ha aceptado. `REQ-CUN05-08` ya lo exige y el cuadro `EX-01 Disponibilidad parcial` ya está diseñado. Lo único nuevo es el flujo de invitación que lleva hasta ahí.

---

## 4. La rejilla de disponibilidad

Vive en el **lienzo** de la jerarquía de tres columnas, así que su ancho de referencia es **840 px** en disposición Normal y **1368 px** en Lienzo expandido, no los 1200 de la versión anterior. Con cinco o más participantes, el lienzo expandido deja de ser una comodidad y es la disposición esperada. Ver `design/ARQUITECTURA-VISUAL-WEB.md` secciones 3 y 4.

Es el componente visual más difícil del producto y el que da identidad a la plataforma web. Tiene que resolver a la vez:

| Situación | Cómo se representa |
|---|---|
| Intervalo ocupado | Bloque relleno en la fila del participante |
| Intervalo libre | Fondo de la fila sin bloque |
| Intervalo común válido | Banda vertical resaltada que cruza todas las filas |
| Consulta sin duración indicada | Todas las bandas comunes resaltadas, cada una con su duración escrita |
| Consulta con duración indicada | Solo las bandas que admiten la duración; las demás quedan como libre, no como alternativa |
| Participante sin datos | Fila con tramado y etiqueta explícita, nunca fila vacía |
| Sin ningún intervalo común | Mensaje explícito, no una rejilla sin bandas |
| Fuera de banda horaria | Columnas atenuadas, porque no son alternativa aunque estén libres |
| Zona horaria | Declarada en el encabezado, en la zona de quien consulta |

**Tres estados que no pueden verse iguales:** «no he calculado todavía», «no hay ningún horario común» y «hay horarios comunes pero ninguno admite la duración que pediste». El tercero aparece con el criterio aprobado y es nuevo respecto de la versión anterior de esta especificación.

---

## 5. Relación con CUN-06

CUN-06 Coordinar reunión **incluye** a CUN-05: la consulta de disponibilidad no se reimplementa, se invoca. En la interfaz eso significa que la rejilla es el mismo componente en ambos casos de uso; lo que cambia es lo que viene después: en CUN-05 el gerente solo consulta, en CUN-06 selecciona una alternativa y se registra una Reunión.

---

## 6. Pendiente

1. **Incorporar la segunda oración a RN-CAL-01 en el Entregable 1**, según la sección 1.
2. **Forma del Participante externo** (D-8): la sección 3 necesita guardar estado de consentimiento, así que ya no basta un campo de texto. Mientras no se haga, el criterio vive solo en esta especificación.
3. **Zona horaria en el Perfil de Usuario.** Es el único dato nuevo que el criterio introduce. El sistema ya la recoge (REQ-ACC-04); falta declararla en EN-01 del Entregable 1.
4. **Deriva entre esta especificación y el diseño.** Los ocho cuadros de CUN-05 en Figma se generaron con la versión anterior del criterio: no representan la consulta sin duración indicada ni el estado «hay horarios comunes pero ninguno admite la duración». Hasta regenerarlos, el diseño va por detrás de la especificación en esos dos puntos.
