# Especificación — Captura

**Origen:** Entregable 1. Casos de uso CUN-01 Gestionar agenda personal y CUN-03 Gestionar tareas personales, trabajador TN-01 Asistente Personal Inteligente, entidades EN-01 Perfil de Usuario, EN-02 Evento de Agenda y EN-04 Tarea. Reglas RN-OP-01, RN-ER-03, RN-EST-01 y RN-EST-02.
**Notación:** EARS.
**Plataforma:** móvil.

---

## 1. Por qué esta especificación existe y por qué se numera aparte

**La captura no es un caso de uso: es la capa de entrada que comparten dos.** «Agéndame algo el viernes» es CUN-01 y «acordarme de llamar al dentista» es CUN-03, pero para el usuario es el mismo gesto y debe serlo también en la interfaz.

Escribirla dentro de CUN-01 dejaría a CUN-03 sin la mitad de sus requisitos, y al revés. Por eso los requisitos de este documento se numeran `REQ-CAP-nn` y cada uno declara a qué caso de uso responde.

**El cuello de botella que ataca.** Una persona tiene hoy cuatro aplicaciones para cuatro cosas que ocurren en el mismo instante: un compromiso, una tarea, un memo y algo que espera de alguien. El valor del Plan Personal no es hacer mejor ninguna de las cuatro: es que **sean una sola captura**.

---

## 2. Las tres puertas

### REQ-CAP-01

**Requisito:** EL SISTEMA ofrecerá tres formas de capturar —escribir, hablar y fotografiar— y las tres terminarán en la misma confirmación.

**Origen:** CUN-01 y CUN-03, flujo principal paso 1
**Tipo:** ubicuo

**Criterio de aceptación**
DADO cualquiera de las tres entradas
CUANDO el sistema interprete lo capturado
ENTONCES presenta la misma tarjeta de confirmación, con los mismos datos y las mismas salidas
Y ninguna de las tres exige al usuario declarar de antemano qué tipo de cosa está registrando

---

### REQ-CAP-02

**Requisito:** CUANDO el usuario capture algo, EL SISTEMA determinará si corresponde a un compromiso, a una tarea, a un pendiente sin fecha o a algo que espera de un tercero, y lo presentará clasificado antes de registrar.

**Origen:** CUN-01 paso 2, CUN-03 paso 2
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO la frase «el jueves a las 4 tengo dentista»
ENTONCES se propone como compromiso con fecha y hora
Y DADO «hay que pagar el recibo antes del sábado»
ENTONCES se propone como tarea con fecha límite
Y en ambos casos el usuario puede cambiar la clasificación antes de confirmar

---

### REQ-CAP-03

**Requisito:** MIENTRAS el usuario no confirme, EL SISTEMA no registrará nada de lo capturado.

**Origen:** RN-ER-03
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO una captura interpretada y presentada
CUANDO el usuario cierre la aplicación sin confirmar
ENTONCES no existe ningún compromiso ni tarea nueva

---

### REQ-CAP-04

**Requisito:** SI la información capturada es insuficiente, ENTONCES EL SISTEMA solicitará únicamente el dato que falta, de uno en uno.

**Origen:** CUN-01 y CUN-03, excepción «información insuficiente»; regla de producto R-20
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO «reunión con Vasco» sin día ni hora
CUANDO se interprete
ENTONCES el sistema pregunta por el día, y no despliega un formulario con todos los campos

---

### REQ-CAP-05

**Requisito:** DONDE el usuario invoque la paleta de comandos, EL SISTEMA presentará las acciones disponibles filtrables por texto, marcando las que no incluye su plan.

**Origen:** decisión de producto; RN-OP-01
**Tipo:** funcionalidad opcional

**Criterio de aceptación**
DADO un usuario del Plan Gratuito
CUANDO abra la paleta
ENTONCES ve también las acciones del Plan Personal, marcadas
Y al elegir una marcada, el sistema explica qué plan la incluye en vez de fallar en silencio

---

### REQ-CAP-06

**Requisito:** EL SISTEMA aceptará por lenguaje natural cualquier acción disponible en la paleta, sin exigir la sintaxis del comando.

**Origen:** decisión de producto
**Tipo:** ubicuo

**Criterio de aceptación**
DADO la frase «manda un correo a Juan»
CUANDO se interprete
ENTONCES produce el mismo resultado que el comando correspondiente
Y en la entrada por voz nunca se exige pronunciar un comando

---

## 3. Destinos de la captura

### REQ-CAP-07

**Requisito:** SI lo capturado no cabe en el día indicado, ENTONCES EL SISTEMA no lo situará a la fuerza: lo registrará como pendiente sin fecha e informará del motivo.

**Origen:** regla de producto R-1; `../02-jornada/spec.md` REQ-CUN02-08
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un jueves sin ningún intervalo libre de la duración pedida
CUANDO el usuario capture una actividad de dos horas para ese jueves
ENTONCES queda como pendiente sin fecha, con el motivo declarado
Y no se desplaza ningún compromiso existente sin permiso

---

### REQ-CAP-08

**Requisito:** CUANDO el usuario registre algo que espera de un tercero, EL SISTEMA lo guardará como pendiente asociado a esa persona.

**Origen:** CUN-03; `../04-comunicaciones/spec.md` REQ-CUN04-14; regla de producto R-12
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO «Juan tiene que enviarme el presupuesto el lunes»
CUANDO se interprete
ENTONCES se registra qué se espera y de quién, y aparece entre los pendientes del usuario
Y no se guarda ninguna valoración ni nota sobre esa persona

---

## 4. Nota de voz

### REQ-CAP-09

**Requisito:** EL SISTEMA permitirá grabar notas de voz de hasta cinco minutos, y funcionará igual con grabaciones breves que largas.

**Origen:** decisión de producto
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una nota de ocho segundos y otra de cuatro minutos
CUANDO ambas se procesen
ENTONCES las dos se presentan de forma legible, sin que la corta parezca un error ni la larga desborde

---

### REQ-CAP-10

**Requisito:** CUANDO una nota de voz contenga más de una intención, EL SISTEMA las presentará como una lista en la que cada elemento se acepta o se descarta por separado.

**Origen:** decisión de producto; simetría con CUN-10 paso 5
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una nota que menciona una cita, un pago y un cambio de rutina
CUANDO se procese
ENTONCES se presentan tres elementos independientes
Y aceptar uno no obliga a aceptar los demás

---

### REQ-CAP-11

**Requisito:** SI el sistema no logra determinar con certeza uno de los elementos extraídos, ENTONCES lo marcará como dudoso en lugar de darlo por bueno.

**Origen:** regla de producto R-10
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO una frase ambigua dentro de una nota larga
CUANDO se presente el resultado
ENTONCES ese elemento aparece señalado como dudoso, con lo que se oyó
Y no queda mezclado con los que sí son seguros

---

### REQ-CAP-12

**Requisito:** EL SISTEMA presentará la transcripción y permitirá corregirla antes de registrar nada.

**Origen:** propuesta técnica §5, «confirmación del texto antes de ejecutar cualquier acción»; RN-ER-03
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una transcripción que confundió un nombre
CUANDO el usuario lo corrija
ENTONCES lo que se registra parte del texto corregido, no del original

---

### REQ-CAP-13

**Requisito:** CUANDO el usuario confirme lo extraído de una nota de voz, EL SISTEMA descartará el audio, salvo que el usuario haya pedido conservar esa nota.

**Origen:** regla de producto R-4; propuesta técnica §9, minimización
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO una nota de voz confirmada sin petición de conservarla
CUANDO se complete el registro
ENTONCES el audio deja de existir y solo queda lo extraído

**Nota.** El audio arrastra lo que hay alrededor: otras voces, ruido, cosas que no se querían guardar. Y es lo más caro del producto. El valor de NexoAI no es guardar la grabación, es entenderla.

---

## 5. Cámara

### REQ-CAP-14

**Requisito:** EL SISTEMA extraerá compromisos y tareas del texto contenido en una imagen aportada por el usuario.

**Origen:** CUN-01 paso 2
**Tipo:** ubicuo

**Criterio de aceptación**
DADO la foto de un cartel con tres fechas
CUANDO se procese
ENTONCES se proponen tres compromisos, cada uno aceptable por separado

---

### REQ-CAP-15

**Requisito:** CUANDO la imagen contenga un horario, EL SISTEMA propondrá bloques recurrentes con su vigencia, y los presentará para validar en conjunto.

**Origen:** decisión de producto; regla de producto R-10
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO la foto de un horario con quince bloques semanales
CUANDO se procese
ENTONCES se presentan agrupados y editables, y se aplican con una sola confirmación
Y el sistema **no** pide quince confirmaciones separadas

---

### REQ-CAP-16

**Requisito:** SI los bloques propuestos desde una imagen chocan con compromisos existentes, ENTONCES EL SISTEMA lo advertirá antes de aplicarlos.

**Origen:** regla de producto R-10
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO un horario importado que pisa dos compromisos ya registrados
CUANDO se presente para validar
ENTONCES los dos choques se señalan antes de aplicar, no después

---

## 6. Memo por lugar

### REQ-CAP-17

**Requisito:** DONDE el usuario asocie un memo a un lugar, EL SISTEMA lo presentará la primera vez que detecte la llegada a ese lugar, y no volverá a presentarlo.

**Origen:** decisión de producto; regla de producto R-7
**Tipo:** funcionalidad opcional

**Criterio de aceptación**
DADO un memo asociado a la biblioteca
CUANDO el usuario llegue y el dispositivo cruce el límite varias veces por oscilación de la señal
ENTONCES el memo se presenta una sola vez
Y una vez mostrado, no reaparece en visitas posteriores

---

### REQ-CAP-18

**Requisito:** EL SISTEMA mantendrá disponible el contenido de un memo por lugar aunque no haya conexión en el momento de la llegada.

**Origen:** REQ-CAP-17; propuesta técnica §5, modo sin conexión
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un memo por lugar y un dispositivo sin cobertura
CUANDO se detecte la llegada
ENTONCES el memo se muestra igual

---

## 7. Sensores y permisos

### REQ-CAP-19

**Requisito:** EL SISTEMA solicitará cada permiso de sensor por separado, explicando para qué lo usa, y permitirá revocarlo.

**Origen:** RN-OP-01; propuesta técnica §9, consentimientos independientes y revocables; regla de producto R-9
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un usuario que concede la cámara y niega la ubicación
CUANDO use la aplicación
ENTONCES la captura por foto funciona y la de lugar no, y el sistema dice cuál falta y para qué servía

---

### REQ-CAP-20

**Requisito:** SI el usuario niega un permiso de sensor, ENTONCES EL SISTEMA mantendrá la función que dependía de él con el dato que aporte la persona o con una estimación declarada como tal.

**Origen:** regla de producto R-9
**Tipo:** comportamiento no deseado

**Criterio de aceptación**
DADO la ubicación denegada
CUANDO se planifique un día con desplazamientos
ENTONCES el sistema usa una estimación declarada como tal, y permite corregirla

> **Reescrito el 22 de octubre de 2026 (INC-01).** Antes decía «ofrecerá el camino manual equivalente». Un sensor denegado no es el asistente caído, así que R-42 no aplica: lo que sigue funcionando es la misma función con otro origen del dato, no un formulario paralelo.

---

### REQ-CAP-21

**Requisito:** EL SISTEMA usará la ubicación únicamente cuando exista un compromiso o un memo asociado a un lugar, y con la precisión mínima necesaria.

**Origen:** regla de producto R-8; propuesta técnica §9, minimización
**Tipo:** ubicuo

**Criterio de aceptación**
DADO un usuario sin ningún compromiso con lugar y sin memos por lugar
CUANDO transcurra el día
ENTONCES el sistema no consulta su ubicación

**Nota.** Registrar límites concretos en el sistema operativo no es lo mismo que rastrear la posición en continuo: el sistema despierta a la aplicación solo al cruzar un punto declarado. Es más barato en batería y mucho más defendible.

---

## 8. Sin conexión y modo degradado

### REQ-CAP-22

**Requisito:** MIENTRAS no haya conexión, EL SISTEMA permitirá capturar por texto y por voz, y encolará lo capturado para procesarlo al recuperarla.

**Origen:** propuesta técnica §5, «las escrituras se encolan y se reintentan»
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO un usuario sin cobertura
CUANDO grabe una nota de voz
ENTONCES la nota queda guardada y señalada como pendiente de procesar

---

### REQ-CAP-23

**Requisito:** EL SISTEMA distinguirá visualmente una captura pendiente de procesar, un fallo de procesamiento y una función no incluida en el plan.

**Origen:** regla de producto derivada de los cuatro blancos; RN-OP-01
**Tipo:** ubicuo

**Criterio de aceptación**
DADO una nota encolada por falta de cobertura
CUANDO el usuario la vea
ENTONCES entiende que está en espera y que no ha fallado nada
Y ese estado **no se parece** al de un error ni al de una función fuera de su plan

**Nota.** Es el mismo problema que en la web con los cuatro blancos de la conversación: tres situaciones que se parecen y significan cosas opuestas.

---

### REQ-CAP-24

**Requisito:** MIENTRAS el asistente no esté disponible, EL SISTEMA encolará las capturas de texto y de voz sin registrar ningún compromiso ni tarea.

**Origen:** regla de producto R-42; `SPEC.md` P-11
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO que el proveedor de modelo no responde
CUANDO el usuario capture «llamar al dentista mañana a las 9»
ENTONCES la captura queda visible como en espera, no se crea ningún compromiso ni tarea, y no se ofrece ningún formulario para registrarla a mano
Y al recuperarse el asistente, la captura pasa por la misma tarjeta de confirmación que cualquier otra (RN-ER-03)
Y «mañana» se resuelve respecto del momento en que se capturó, no del momento en que se procesa

> **Reescrito el 22 de octubre de 2026 (INC-01).** Antes decía «permitirá registrar compromisos y tareas mediante el formulario manual». La última línea del criterio es una decisión nueva, registrada en `SPEC.md` §8.

---

### REQ-CAP-25

**Requisito:** MIENTRAS el usuario tenga capturas en espera, EL SISTEMA las mostrará fuera de la conversación, como una franja sobre la agenda de hoy con la cantidad; CUANDO el usuario abra la franja, verá cada captura con lo que pidió y el motivo de la espera en palabras llanas; y CUANDO no quede nada en espera, la franja no se mostrará.

**Origen:** P-11 («lo pedido queda en cola, visible como en espera»); REQ-CAP-23; `design/ARQUITECTURA-VISUAL-WEB.md` §6 (lo en espera va al registro); hallazgo 4.1-d de `design/capturas/2026-11-04/INFORME-VISUAL-AGENTE.md` (hoy lo en espera solo vive en la conversación); `PLAN-VALOR-USUARIO.md` hito 1. Añadido el 6 de noviembre de 2026
**Tipo:** dirigido por estado
**Plataforma:** web (lienzo) y móvil (Inicio)

**Criterio de aceptación**
DADO un usuario con una tarea que quedó en espera antes del 7 de noviembre de 2026, cuando las tareas todavía no se registraban, y una solicitud encolada porque el asistente no respondía
CUANDO abra la agenda
ENTONCES ve «2 cosas en espera» sobre la lista de hoy
Y CUANDO abra la franja
ENTONCES ve las dos, cada una con la frase que escribió y su motivo: «se está preparando para que la confirmes en Tareas» y «el asistente no respondía»
Y no hay ningún control para retirarlas (sigue abierto en `SPEC.md` §8)
Y CUANDO el trabajador atienda la solicitud encolada
ENTONCES la franja dice «1 cosa en espera»
Y DADO que no queda nada en espera
CUANDO abra la agenda
ENTONCES la franja no aparece

**Nota del 7 de noviembre de 2026.** El ejemplo decía «las tareas llegan en una próxima versión». Desde esa fecha una tarea capturada no queda en espera: se propone (REQ-AGT-02 v2, REQ-CUN03-01 de `09-tareas-personales`). El motivo «función por llegar» solo lo conservan las capturas anteriores, y su texto es el de H-TP-16, hasta que REQ-CUN03-17 las convierta en propuestas (T-056, pendiente). Los dos motivos que siguen produciéndose son «el asistente no respondía» y «falta el permiso de tu calendario».

---

## 9. Trazabilidad

| Sección | Caso de uso | Nivel de venta |
|---|---|---|
| 2, puerta de texto y comandos | CUN-01, CUN-03 | Gratuito |
| 2, puertas de voz y cámara | CUN-01, CUN-03 | Personal |
| 3, destinos | CUN-01, CUN-03 | Gratuito, salvo el pendiente sin fecha por no caber, que necesita CUN-02 |
| 4, nota de voz | CUN-01, CUN-03 | Personal |
| 5, cámara y horario | CUN-01 | Personal |
| 6, memo por lugar | CUN-01 | Personal |
| 7, sensores | Transversal | Según la función |
| 8, sin conexión | Transversal | Gratuito |
| 8, REQ-CAP-25, lo en espera fuera de la conversación | Transversal | Gratuito |

---

## 10. Pendiente

1. **Atributo de disparo por lugar** en Evento de Agenda (decisión pendiente): lo necesita REQ-CAP-17.
2. **Recurrencia y vigencia** en Evento de Agenda: lo necesita REQ-CAP-15.
3. **Forma del Participante externo** (D-8): lo necesita REQ-CAP-08.
4. **Cifras del Plan Gratuito** (D-7): sin ellas no se puede decir qué parte de esta captura queda limitada en el nivel gratuito.

---

## 11. Decisiones del 24 de octubre de 2026, al planificar el agente

Decididas por el equipo antes de escribir `../07-agente/plan.md`.

| # | Decisión | Afecta |
|---|---|---|
| 1 | **Sin voz en la primera versión (PT-2 resuelta).** Solo la puerta de texto; la de voz y la de cámara quedan para después | REQ-CAP-01, REQ-CAP-09 a 13, REQ-CAP-22 (la parte de voz) |
| 2 | **Solo agenda.** Una captura que es tarea, pendiente sin fecha o algo que se espera de alguien se reconoce y se dice, pero queda **en espera** sin registrarse, hasta que existan las tareas personales (CUN-03). Es REQ-AGT-02. *Superada el 7 de noviembre de 2026: con `09-tareas-personales` (T-050) la captura se propone como tarea personal (REQ-AGT-02 v2, REQ-CUN03-01)* | REQ-CAP-02, REQ-CAP-07, REQ-CAP-08 |
| 3 | REQ-CAP-23 suma un caso: lo que espera a una función que llega en una próxima versión. Se ve como en espera, con su motivo, y no como un error ni como algo fuera del plan (H-AGT-09) | REQ-CAP-23 |
| 4 | La paleta de comandos (REQ-CAP-05) y la captura sin conexión del móvil (REQ-CAP-22) no entran en la primera versión del agente | REQ-CAP-05, REQ-CAP-22 |

---

## 12. Decisiones tomadas durante el diseño

### Detectadas al rehacer la conversación del móvil · 7 de noviembre de 2026

En el móvil, una sola tarjeta de confirmación llenaba la capa y tapaba la conversación; la cabecera de la sección se leía a través del velo y la barra de escritura gastaba dos filas. Se adopta la estructura común de las aplicaciones de conversación: cabecera fina, mensajes a todo el alto, barra de una fila abajo y tarjetas compactas. **No son definitivas** hasta que el equipo las acepte; van también para `SPEC.md` §8.

| # | Decisión | Afecta |
|---|---|---|
| H-CAP-01 | **La tarjeta de confirmación abre plegada.** A la vista quedan siempre: la acción; el compromiso del que se habla, si la acción no lo nombra; cuándo, con su zona horaria (P-05), en una línea con los datos tal como llegan; todo dato que el sistema puso por su cuenta, entero y con su explicación (decisión 19 de `02-agenda`: «1 hora, porque no indicaste la hora de fin»); lo irreversible; la línea de cruce y las salidas: «Confirmar» a ancho completo y debajo, en una fila, «Descartar» y «Ver detalles». Se pliegan las etiquetas y lo que la persona ya dijo y no añade nada. «Ver detalles» despliega todos los datos, apilados, en la misma tarjeta. Cuando hay botones de alternativa, el dato «Alternativas» no se repite en texto. Al llegar una propuesta, la lista se desplaza hasta que la tarjeta entera, con sus botones, queda a la vista; si no cabe, se alinea su parte de arriba. Una tarjeta ya decidida queda plegada, sin botones, con el borde de un bloque pasivo y una línea que dice qué se decidió. Sigue siendo la misma tarjeta con los mismos datos: lo que cambia es qué se ve primero. Revisada el 7 de noviembre de 2026 con la auditoría MC-17 y MC-18 del carril de diseño. Contradice dos reglas de `design/ARQUITECTURA-VISUAL-MOVIL.md` §3: los botones siempre apilados y los datos nunca en una línea corrida con puntos; los pares etiqueta y valor siguen bajo «Ver detalles» | REQ-CAP-01, P-03, P-05 |
| H-CAP-02 | **La barra de escritura es una sola fila**: el campo y el botón de enviar dentro del mismo contorno. El campo empieza en una línea y crece hasta cuatro; con el campo vacío el botón se atenúa sin cambiar el alto. La barra queda fija abajo, sube con el teclado y la lista de mensajes ocupa el resto | REQ-CAP-01 |
| H-CAP-03 | **El velo tapa la cabecera de la sección.** La capa arranca justo debajo de la zona de estado y el velo es más opaco, para que nunca se lean dos cabeceras a la vez. La sección sigue detrás como antecedente. Contradice la opacidad de 0,16 de `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 | REQ-CAP-01, R-36 |
| H-CAP-04 | **El título de la capa depende de la conversación en curso.** Sin nada dicho en lo que se está pidiendo ahora, «¿Qué hacemos?». Con algo dicho, «Asistente» y debajo la primera petición, recortada a una línea. Cuando hay una propuesta esperando decisión y la capa ya se abrió una vez, el asa lo señala con un punto | REQ-CAP-01, REQ-AGT-03 |
