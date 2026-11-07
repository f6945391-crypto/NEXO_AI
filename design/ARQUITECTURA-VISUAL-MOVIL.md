# Arquitectura visual — plataforma móvil

**Estado:** aprobada el 26 de septiembre de 2026.
**Lectura obligatoria** antes de generar cualquier cuadro móvil. `CONTEXTO.md` apunta aquí.

---

## 1. Por qué existe este documento

A la web se le definió una arquitectura antes de dibujar nada. **Al móvil nunca.** La consecuencia fue doble:

- `04 Flujos · Móvil` salió bien, pero **solo cubre la conversación**: ninguna de sus trece pantallas muestra que existan otras secciones, ni cómo llegar a ellas.
- La página de captura v2 salió como un catálogo de funciones sueltas y, peor, **se inventó un estilo distinto** del que el `04` ya había establecido: fondo gris en vez de blanco, cabecera dentro de una caja, botones pequeños uno al lado de otro, «Cancelar» en rojo destructivo, datos en una línea corrida con puntos.

Este documento arregla las dos cosas: define la estructura que faltaba, y **escribe el lenguaje visual que el `04` ya había inventado**, medido directamente del archivo, para que ninguna página nueva vuelva a improvisar otro.

---

## 2. Estructura

```
┌────────────────────────┐
│  Hoy                   │  ← cabecera, sin caja
│  Jueves 25 · GMT-5     │
│  [ Hoy ][Semana][ Mes ]│  ← selector de nivel
│                        │
│  [ contenido ]         │  ← la SECCIÓN, a pantalla completa
│                        │
├────────────────────────┤
│                  ( + )│  ← asa: sube la capa de captura
├────────────────────────┤
│  Agenda  Tareas  Activ.│  ← pestañas
└────────────────────────┘
```

### La regla que lo ordena todo

> **La captura es una capa que sube sobre la sección. Nunca te lleva a otra pantalla.** Al confirmar, vuelves a donde estabas y ves ahí el resultado.

Dicho de otra manera, por si al describirlo se cuela la palabra «sección»: la capa es **la cuarta cosa que hace la aplicación, pero no un cuarto sitio**. Esa distinción es exactamente la que sostiene que haya tres pestañas y no cuatro.

Es la traducción móvil de lo que ya decidimos para la web —un solo sujeto a la vez—: **la sección es el sujeto, la captura actúa sobre él.** Y explica por qué la conversación no es una pestaña: es la capa.

### El fondo de la capa es el antecedente

De la regla anterior sale una consecuencia que es fácil pasar por alto al dibujar:

> **Lo que se ve bajo el velo no es relleno: es la pantalla de la que vienes, y no es la misma en todos los cuadros.**

Un velo sobre un fondo vacío, o sobre un «Hoy» genérico copiado de otro cuadro, convierte la capa en una pantalla nueva y rompe justo lo que la capa existe para demostrar. Cada cuadro con capa tiene que llevar detrás la sección que explica su contenido:

| Capa | Antecedente | Por qué |
|---|---|---|
| Cierre del día | Hoy en estado **día real** | Confirmas lo que viviste, no el plan de la mañana |
| Correo preparado · Confirmar envío | **Hoy**, con el bloque que lo dispara a la vista | El bloque «Responder a Juan Carlos» es el origen, y se ve medio tapado por la hoja |
| Llamada preparada · Al colgar | **Tareas**, en la franja *esperando de alguien* | Lo que la capa dice —«le pediste el presupuesto hace 5 días»— es esa tarjeta. Si el fondo fuera Hoy, ese dato no vendría de ninguna parte |

Dos cuadros consecutivos de la misma capa llevan **el fondo idéntico**: que no cambie entre «Correo preparado» y «Confirmar envío» es la prueba visual de que no hubo navegación.

Y el velo se mide de `Estados / 02`, que ya lo tiene bien: opacidad **0,16** sobre `superficie/velo`. No se vuelve a deducir.

| Web | Móvil |
|---|---|
| Navegación de 72 px | Tres pestañas inferiores: Agenda · Tareas · Actividad |
| Lienzo | La sección, a pantalla completa |
| Conversación | Capa de captura, encima de la sección |
| Lienzo expandido | No aplica: la sección ya ocupa todo |

### Las tres secciones

Eran cuatro. Son tres, y la que desapareció es «Hoy».

| Sección | Qué muestra | Niveles | Caso de uso |
|---|---|---|---|
| **Agenda** | Lo que va a pasar | Hoy · Semana · Mes | CUN-01, CUN-02 |
| **Tareas** | Tareas, pendientes sin fecha y lo que esperas de alguien | Lista · Hilo de una tarea | CUN-03 |
| **Actividad** | Lo que pasó | Día · Semana · Mes · Registro del asistente | Consulta |

### Por qué Hoy y Agenda eran la misma sección

La diferencia que les dábamos —Hoy es el día en curso, Agenda son los días que vienen— **es de zoom, no de sujeto.** Las dos son el calendario. Y las acciones que solo tienen sentido hoy —aceptar el plan, apuntar, registrar tiempo real, cerrar el día— no son otra sección: son lo que ofrece el nivel «día».

Lo que queda es una frontera mucho más limpia, y se puede decir en una línea:

> **Agenda es lo que va a pasar. Actividad es lo que pasó. El día es la costura, y por eso el nivel «Hoy» enseña las dos cosas: el plan y lo registrado.**

Consecuencias:

- **Un solo idioma de navegación.** Agenda y Actividad usan el mismo selector de período. Antes el mismo movimiento —cambiar de zoom— se hacía de dos maneras distintas según la sección.
- **La vista semanal no hay que inventarla**: es el segundo nivel de Agenda. Sirve para recapitular, y además es donde se ve qué pendiente sin fecha cabría dónde (R-1).
- **El nivel «día» abre siempre por defecto**, nunca recordando el último que miraste. Si no, se pierde el ancla que daba la pestaña «Hoy», que es lo único que la fusión nos quita.

### Ajustes, y por qué no es una cuarta pestaña

La configuración no compite con el trabajo. **La puerta va en la cabecera de las secciones**, la misma en las tres; añadir una cuarta pestaña desharía la decisión de bajar a tres, y esa pestaña además no sería trabajo.

Dentro, ocho grupos y **Cuenta al final**: perfil y horario, categorías, conexiones, equipo y permisos, cómo te acompaño, privacidad y datos, plan, cuenta. En web la misma lista vive al pie de la barra de navegación, separada por una línea.

Regla que ordena qué entra: **en Ajustes va lo que se configura una vez y se revisa rara vez.** Lo que se mira a diario es una sección; lo que se decide sobre la marcha es una capa.

### Los grupos de la página no pueden sugerir secciones

La página llegó a tener **once grupos para tres secciones**, y uno de ellos —`Rutinas`— enseñaba una cabecera con un nombre que no era ningún destino. Es el mismo error que los siete iconos en web, en otra forma.

| Grupo | Qué es |
|---|---|
| `Agenda` · `Tareas` · `Actividad` | Las tres secciones y sus niveles |
| `Día` | Estados del nivel día |
| `Captura` | Estados de la capa: lo que abre el asa, el correo, la llamada |
| `Recorrido` · `Estados` · `Excepciones` | Cómo funciona el móvil |
| `Ajustes` | Configuración |

Correo y llamada **no son una sección**: nadie «va a Comunicar». Salen de decirle al asistente «manda un correo a Juan», así que son estados de la capa.

---

### El hilo es de la negociación; el resultado vive en su sección

Regla que resuelve dónde cae cada cosa cuando un asunto pasa por varias manos:

> **Mientras se negocia, es una tarea con hilo. Cuando se cierra, el resultado va a la sección que le toca.**

| Asunto | Mientras se negocia | Cuando se cierra |
|---|---|---|
| Coordinar una reunión | Tarea con hilo: propones horas, esperas respuestas | **Evento en Agenda** |
| Un encargo | Tarea con hilo: preguntas, respuestas, criterio | **Fecha acordada en Agenda**, encargo cerrado en Tareas |
| Algo que esperas de alguien | Tarea con hilo | Se cierra o se convierte en otra cosa |

Sin esta regla, «coordinar una reunión» parece que tiene que estar en Agenda porque una reunión es un evento, y a la vez en Tareas porque es algo pendiente con idas y venidas. Está en las dos, en momentos distintos.

### Tareas no tiene niveles de período, y es a propósito

Agenda y Actividad se cortan por Hoy · Semana · Mes. Tareas no, porque **una tarea sin fecha no cae en ningún período**. Sus cortes son franjas: con fecha, sin fecha, esperando de alguien y —en Empresarial— encargadas.

---

### Dónde vive el hilo de una tarea

R-17 dice que el hilo vive en el lienzo, y el lienzo es web. En móvil no hay lienzo, y esto es lo que se decide:

> **El hilo vive dentro de la tarea. Se abre tocándola, no es una pestaña.** Un hilo es una propiedad de una tarea, no un sujeto por derecho propio.

**El hilo no es igual en los dos planes**, y conviene no mezclarlos:

| | Personal | Empresarial |
|---|---|---|
| Qué guarda | Lo que esperas de alguien y lo que ha pasado | Lo mismo, más las respuestas que llegan por correo |
| Quién lo actualiza | Tú, o una nota de voz | También quien tiene la tarea, desde el correo |
| Cierre | Un límite: «si el viernes no hay respuesta, te lo recuerdo» | El criterio de terminado que declara quien delega (R-19) |

La bandeja de lo que ha vuelto es un filtro dentro de Tareas —la franja *esperando de alguien*, que ya existía—, no una sección nueva. Y el motivo de fondo sigue siendo el mismo que en web, dicho con precisión: **el hilo mantiene al agente con poco contexto y un propósito claro, y eso es lo que evita que alucine.** No es solo ahorro de coste, es fiabilidad. El asistente lee el hilo solo si se lo pides. En móvil se cumple solo, porque la conversación es la capa de captura y se descarta al confirmar.

> **Revisión del 5 de noviembre de 2026 (avalada, REQ-AGT-03).** La capa de captura ya no se descarta al confirmar: abre con el episodio en curso y el anterior, separados por una línea con la hora y lo que se hizo, «Ver anteriores» arriba y la lista abajo del todo. Lo que el asistente lee sigue siendo poco: el episodio abierto y la nota de continuidad (REQ-AGT-01 v2). Detalle en `ARQUITECTURA-VISUAL-WEB.md` §5, revisión del 5 de noviembre.

### La barra de entrada no era una barra de entrada

Nunca se escribe dentro: al tocarla sube la capa de captura, que es donde pasa todo. O sea que **es un asa, no un campo**, y estaba dibujada como lo que no es, ocupando 65 px de ancho completo en todas las pantallas.

Pasa a ser `Móvil / Asa de captura`: un botón redondo de 56 px flotando abajo a la derecha. Gana los 57 px que la barra robaba al contenido, deja de empujar la lista hacia abajo cuando el día está cargado, y queda más honesta sobre lo que hace.

> **Remisión, 7 de noviembre de 2026.** Esto sigue valiendo para la sección: fuera de la capa no se escribe. **Dentro de la capa sí hay un campo**, y su forma —una sola fila con el envío dentro— está en §8, «Revisión del 7 de noviembre de 2026». §8.6 añade al asa un indicador cuando algo espera tu decisión, y anota que el asa construida no es la de este párrafo (hallazgo MC-13).

### Las tres capas de «Hoy»

La sección Hoy no es una lista, son tres cosas distintas que comparten el día y que **no pueden parecerse entre sí**:

| Capa | Qué es | Forma |
|---|---|---|
| **Planificado** | Lo que el plan dice que toca | `borde/base`, hora a la izquierda |
| **Registrado** | Lo que de verdad pasó, ya avalado por la persona | `borde/base` y marca de procedencia |
| **Apunte** | Algo que pensaste o que ocurrió, y que no pide nada | `superficie/hundida`, **sin borde** |

El apunte va sin borde a propósito: el borde en este lenguaje anuncia que hay algo que decidir (§3), y un apunte no lo tiene. Es el mismo criterio que deja la fila de extracción con `borde/fuerte` mientras espera confirmación.

> **Remisión, 7 de noviembre de 2026.** Estas tres «capas» son formas de los bloques del día, no la capa de captura. Cuando §8 dice «la capa», habla siempre de la capa de captura. El criterio del borde de este párrafo es el mismo que §8.4 aplica a la tarjeta ya decidida, que pasa de `borde/fuerte` a `borde/base`.

### La regla que separa tarea de apunte

> **Si hay algo que hacer, es una tarea. Si es algo que pensaste o que pasó, es un apunte — y vive en su día.**

Esta regla resuelve una ambigüedad que arrastraban `/nota` y `/tarea`: las dos capturaban texto suelto y no se distinguían en pantalla. Consecuencias de diseño:

- Un apunte **no aparece en la sección Tareas**. No es un pendiente y no debe engordar una lista de cosas por hacer.
- Un apunte **se ancla al día en que se capturó**, no a una fecha que haya que elegir. Por eso no necesita confirmación (§6 de `REPLANTEO.md`: `/nota` es el único comando de captura que no confirma).
- Un apunte largo se lee **en su propio cuadro**, no truncado dentro de la lista del día.
- En el informe del período los apuntes no cuentan como cumplimiento: son contexto de lo que pasó, no unidades de plan.

---

## 3. El lenguaje visual

**Todo lo de esta sección está medido de los cuadros del `04`, no inventado.** Si algo aquí contradice a aquellos cuadros, manda el `04` y este documento está mal.

### Lienzo y márgenes

| Elemento | Valor |
|---|---|
| Marco | 390 × 844 |
| Fondo de pantalla | `superficie/base` — **blanco**. Nunca `superficie/hundida` |
| Margen lateral | **20 px**. Ancho de contenido: 350 |
| Cabecera | Sin caja, sin relleno y sin borde. Espaciado 56 / 20 / 16 / 20, separación 4 |
| Título de cabecera | `tam/titulo`, Semi Bold, `texto/fuerte` |
| Línea de estado | `tam/etiqueta`, Regular, `texto/suave` |
| Asa de captura | Botón redondo de 56, flotante abajo a la derecha, con sombra suave. Sustituye a la barra de entrada, que nunca fue un campo |

### El borde está graduado — esta es la regla más útil

No es que no haya bordes: es que **el borde dice cuánta atención pide el elemento.**

| Elemento | Relleno | Borde |
|---|---|---|
| Bloque pasivo (evento, tarea, fila) | `superficie/elevada` | `borde/base`, 1 px |
| **Lo que hay que decidir** (tarjeta de confirmación) | `superficie/elevada` | **`borde/fuerte`**, 1 px |
| Bloque de estado (éxito, error, aviso) | El tinte suave del estado | **Ninguno**. El color ya separa |
| Burbuja del usuario | `marca/suave` | Ninguno |

### Botones

Siempre **a ancho completo y apilados**, nunca dos pequeños uno al lado del otro. Espaciado 16 / 20, `radio/md`, separación 8 entre ellos.

| Jerarquía | Relleno | Borde |
|---|---|---|
| Primario | `marca/base` | — |
| Secundario | `superficie/base` | `borde/fuerte` |
| Texto | `superficie/base` | Ninguno |

**«Cancelar» es un botón de texto, nunca rojo.** El rojo destructivo se reserva para borrar algo que existe, no para abandonar algo que todavía no existe.

### Datos estructurados

En **pares etiqueta / valor alineados**, uno por línea, con la etiqueta en `texto/suave` y el valor en `texto/fuerte` Semi Bold:

```
Con            Vasco Bustamante
Cuándo         Viernes 26 de septiembre, 10:00 – 11:00
Zona horaria   GMT-5 (Lima)
```

**Nunca en una línea corrida con puntos** del tipo «Compromiso · jueves 2, 16:00». Esa forma sirve para un pie de apoyo, no para los datos que el usuario tiene que revisar antes de confirmar.

### Dato de apoyo dentro de un bloque

La hora va **arriba, pequeña, en `marca/base` Semi Bold**; el contenido debajo en `texto/fuerte` Regular. Es lo que hace que la lista del día se lea de un vistazo.

### Color

| Regla | Por qué |
|---|---|
| **El color de marca marca una pieza por pantalla**: el botón primario, o el dato de apoyo | Tres bloques con texto azul apilados se leen como tres enlaces, no como tres sugerencias |
| **Un solo color semántico por pantalla** | En `Foto / 01` del v2 había verdes, ámbar y azul a la vez: cuando todo señala, nada señala |
| **El tinte de estado se usa completo solo en el bloque de estado** | Si además se tiñen filas y avisos, la pantalla se vuelve un semáforo |
| En móvil **separa el espacio, no el color** | Las tres superficies están dentro del 5 % de luminancia entre sí: apiladas en una columna estrecha son una sopa gris |

### Texto

- **Nada de anotaciones de especificación dentro de la pantalla.** «Al confirmar, el audio se descarta (REQ-CAP-13)» es una nota para el equipo: va en la descripción del cuadro, no en la interfaz.
- El pie aclaratorio existe, pero dice **consecuencias para el usuario**: «No se enviará ninguna invitación hasta que confirmes».
- Datos realistas, nombres largos, listas llenas y listas vacías, como ya exige `CONTEXTO.md`.

---

## 3 ter. La gramática de Agenda no es la de Actividad

Es el error que más caro salió de esta iteración: dibujé la semana y el mes de Agenda con **barras de carga**, que son lenguaje de informe. Franco lo cortó en una frase — *no me sirve ver lo que falta, quiero saber qué hay en cada día*.

> **Actividad contesta «cuánto». Agenda contesta «qué».** Una barra es una respuesta a «cuánto», y en Agenda no pinta nada.

Cómo se resuelve cada nivel:

| Nivel | Forma | Por qué |
|---|---|---|
| **Hoy** | Lista de bloques con su hora | Es el día, entero |
| **Semana** | Los siete días uno debajo de otro, **cada uno con sus bloques** | Recapitular es leer contenido, no medir carga. El día de hoy lleva `borde/fuerte` |
| **Mes** | **Rejilla de calendario** con un punto por cada dos compromisos | A ese tamaño el contenido no cabe, así que lo que se enseña es la forma del mes: dónde se acumula y dónde hay hueco |

Los apuntes —lo que entra por nota de voz— aparecen **dentro del día, en su hora**, con la hora en `agente/base` en vez de `marca/base`. Así se distinguen de un compromiso sin necesidad de una sección aparte: un apunte no es una cita, pero pasó a esa hora.

### El asa tiene que enseñar lo que abre

Un botón redondo con un `+` no dice nada por sí mismo — la barra al menos ponía «escribe o pulsa el micrófono». La capa que abre es la que carga con esa explicación: campo de texto, cuatro puertas (**Hablar**, Foto, Comando, Tarea) y tres comandos sugeridos por contexto. `Captura / 01`.

**Hablar va primero y en tinte de agente** porque es la puerta a la grabadora, que de otro modo no tiene entrada visible en ninguna pantalla.

---

## 3 bis. La gramática de los informes

Un informe no es una pantalla de adorno: es donde el registro de tiempo real demuestra que sirve. Tres reglas, y las tres salieron de mirar un cuadro que no se entendía.

**Toda cifra lleva su denominador.** «126 h registradas» no se puede leer: un mes tiene 720 horas y el número no dice si eso es mucho o poco. «126 h de 140 planificadas» sí. Es R-21, y la prueba de que funciona ya estaba en pantalla: las rutinas se entendían —«Gimnasio 1 de 3»— y las horas no, por esto exactamente.

**Toda barra se llena contra ese denominador**, nunca contra el valor más alto de la lista. Escalar contra el máximo es una decisión que el lector no ve y que hace que todas las barras parezcan llenas.

**Lo no atribuido se muestra.** «Sin categoría» es una fila del informe, con su tono apagado y su barra en `borde/fuerte`. Repartirlo por criterio del sistema haría cuadrar la suma y falsearía el dato.

Y la navegación de Actividad son **dos controles que no se pueden confundir**:

| Movimiento | Control | Tiene vuelta |
|---|---|---|
| Cambiar de período — día, semana, mes | Selector fijo bajo la cabecera | No |
| Bajar a un caso concreto — «revisar los jueves» | La acción que lo abre | Sí, hace falta volver |

---

## 4. Los seis errores del v2, para no repetirlos

| # | Error | Regla que lo corrige |
|---|---|---|
| 1 | Fondo gris de pantalla | El fondo es blanco, sección 3 |
| 2 | Cabecera metida en una caja con borde | La cabecera no tiene caja |
| 3 | Todo con el mismo borde, sin jerarquía | El borde está graduado |
| 4 | Botones pequeños uno al lado del otro | Ancho completo y apilados |
| 5 | «Cancelar» en rojo destructivo | Cancelar es botón de texto |
| 6 | Datos en línea corrida con puntos | Pares etiqueta / valor |

Y el séptimo, que no es de forma: **diez píldoras idénticas apiladas en la paleta de comandos.** Una lista sin jerarquía no es una lista, es un muro. Los comandos van agrupados, con el grupo como rótulo pequeño y los elementos sin caja propia.

---

## 5. Convención de nombres

Los cuadros de un caso de uso siguen la de siempre:

```
CUN-XX / Móvil / <Flujo> / <NN Estado>
```

Los de arquitectura o boceto, que atraviesan varios casos de uso, llevan su propia rama:

```
MOV-v2 / <Grupo> / <NN Nombre>
```

Grupos: `Estructura`, `Recorrido`, `Estados`, `Excepciones`.

Sustituye a la rama `CAP-v2`, que se abandona: era un catálogo de funciones, no un recorrido.

---

## 6. Qué no cambia

- **Los 13 cuadros de `04 Flujos · Móvil`.** Su lenguaje visual es el bueno y es de donde sale este documento. Cuando esta arquitectura se aplique, lo único que les faltará es añadir las pestañas.
- **Tres de los cuatro componentes móviles originales** —Botón, Tarjeta de evento y Burbuja—, que ya cumplen todo lo de arriba. `Móvil / Barra de entrada` queda retirada del móvil v2 y solo sigue viva en `04 Flujos`.
- **La paleta.** No hay ningún problema con los tokens: el problema era cómo se aplicaban.

---

## 7. Pendiente

1. **Los 13 cuadros de `04 Flujos · Móvil`** siguen con las cuatro pestañas viejas y con la barra de entrada. Hay que pasarlos a tres pestañas y al asa, o marcarlos como versión anterior.
2. **Entrada avanzada sin cuadro**: `/foto`, `/horario` y `/lugar`.
3. **`/replanificar`**, que es `/plan` cuando algo se cae.
4. **La paleta de comandos** no tiene ni un cuadro.
5. **`/bloque`, `/objetivo`, `/esperando`, cronómetro en marcha, `/revisar`, `/buscar`.**
6. **Iconografía**: pestañas y asa llevan marcas geométricas provisionales.
7. **Sin revisar en modo oscuro.**

El inventario completo está en `VALIDACION-MOVIL-v2.md`.

---

## 8. Revisión del 7 de noviembre de 2026: la conversación dentro de la capa

*Propuesta del 7 de noviembre de 2026, pendiente de aval del equipo. Sale de la prueba del equipo de ese día —una sola petición de guardado llenaba la pantalla— y de la auditoría `design/capturas/2026-11-07-movil-auditoria/INFORME-AUDITORIA-MOVIL.md` (hallazgos MC-01 a MC-19). No cambia ninguna regla anterior salvo la de los datos estructurados de §3, que §8.4 precisa para la tarjeta plegada, y lo dice allí.*

La capa nació para una cosa breve: pedir, confirmar y volver. Desde el 5 de noviembre conserva lo hablado (REQ-AGT-03), así que ya es una conversación, y se estaba dibujando como un formulario que sube. Medido en 390 × 844: la tarjeta con cruce ocupaba 659 px, el 78 % del alto; la barra de escritura, 160 px; y la capa, al crecer, cortaba la cabecera de la sección por la mitad.

> **La capa es una conversación: la lista manda, la cabecera y la barra se encogen, y lo que pide decisión cabe entero en la lista sin taparla.**

### 8.1 Estructura de la capa

| Parte | Cómo es | Por qué |
|---|---|---|
| **Cabecera fina** | Una fila: título a la izquierda, «Cerrar» a la derecha. Debajo, si hace falta, una línea de apoyo (§8.5). Línea `borde/base` abajo | Una sola acción en la cabecera: la capa no tiene menú. La línea es la frontera con la lista, que hoy pasa por debajo sin límite (MC-16) |
| **Lista de mensajes** | Todo el alto entre la cabecera y la barra. «Ver anteriores» fijo arriba mientras quede algo; los separadores de T-039, sin cambios | Es lo que se lee. Todo lo demás le quita sitio |
| **«Pensando…»** | Último elemento de la lista, alineado como una respuesta del asistente | Entre la lista y la barra empujaba la barra dos veces por mensaje (MC-15) |
| **Barra de composición** | Una fila fija abajo (§8.3). Sube con el teclado; al subir se acorta la lista, nunca la cabecera | El campo es la puerta: tiene que estar siempre en el mismo sitio |

**Dos altos, y ninguno corta una cabecera.**

| Alto | Cuándo | Qué se ve detrás |
|---|---|---|
| **Baja** | Mientras lo que hay en la lista cabe sin que el borde de la capa suba por encima del final de la cabecera de la sección | La sección entera, bajo el velo: es el antecedente de §2 y se lee sin competir, porque las dos cabeceras están separadas |
| **Completa** | En cuanto no cabe, o con el teclado abierto | Una franja de **12 px** del antecedente bajo el velo, arriba: basta para saber que la sección sigue ahí, no para leer nada |

> **La capa nunca corta una cabecera: o la deja entera a la vista, o la tapa entera.** Lo que se vio el 7 de noviembre —«Agenda» y «Ajustes» legibles a través del velo, «Lo que va a pasar» partido— es el alto intermedio que esta regla prohíbe (MC-02). Y la capa no cambia de alto en cada turno: salta de baja a completa una vez y se queda (MC-19).

**El velo pasa a ser un token**, `superficie/velo`, con su opacidad. Hoy hay tres valores: 0,16 en §2, medido de `Estados / 02`; 0,4 en el código; y ninguno en los tokens (MC-14). Con la regla de los dos altos, el velo solo tiene que hacer una cosa: que la franja de 12 px se lea como fondo. El valor lo decide el equipo; lo que no puede pasar es que vuelva a escribirse a mano.

**Colocación al llegar algo.** Al enviar, la lista baja hasta el final. Si lo que llega es una tarjeta y cabe entera, se ve entera con la petición encima. Si no cabe —solo puede pasar desplegada—, la lista se coloca en el **principio de la tarjeta**, no en su final: lo primero que se lee es la acción (P-03, MC-07).

### 8.2 Referencia de estructura, y lo que no se toma de ella

La estructura sigue el **patrón común de las aplicaciones de conversación móviles** maduras: cabecera fina con título y una acción, mensajes a todo el alto, una barra de composición de una sola fila con el envío dentro del mismo contorno, que crece unas líneas y sube con el teclado, y las acciones que piden decisión como tarjetas compactas dentro del flujo, con lo esencial a la vista y el detalle plegado. Se adopta porque la persona ya sabe usarlo: no hay que enseñárselo.

> **De ninguna de esas aplicaciones se toma el color, la tipografía ni la iconografía.** Los colores, tamaños, radios y espaciados son los tokens de NexoAI (`tokens.json`, §3 de este documento). Si un cuadro o una pantalla se parece a otra aplicación en algo más que la disposición, está mal.

| Se toma | No se toma |
|---|---|
| Dónde va cada parte y cuánto ocupa | Colores, fondos de burbuja, degradados |
| Que el envío esté dentro del contorno del campo | La forma o el dibujo del icono de envío |
| Que el campo crezca hasta cuatro líneas y suba con el teclado | Tipografías, pesos y tamaños |
| Que lo que pide decisión sea compacto y se despliegue | Animaciones propias, sombras, radios |

### 8.3 La barra de composición

| Elemento | Valor |
|---|---|
| Contorno | Uno solo, `radio/md`, que contiene el campo y el envío. El contorno de un control necesita 3:1 frente al fondo: `borde/fuerte` da 1,7:1 (MC-10), así que la barra pide un token de contorno de campo, que decide el equipo |
| Campo | Empieza en **una línea** y crece hasta **cuatro**; desde ahí, se desplaza por dentro. Texto `tam/cuerpo`; indicación «Pídele algo al asistente» en `texto/suave` |
| Envío | Dentro del contorno, a la derecha, alineado con la última línea. Área táctil de **44 × 44**. Nombre accesible **«Enviar»**, siempre el mismo |
| Campo vacío | El envío se atenúa; la barra **no cambia de tamaño** ni de forma. Nunca un botón gris a ancho completo, que se leía como deshabilitado para siempre (MC-04) |
| Alto | Con una línea, unos 56 px más el margen inferior y la zona segura. Hoy son 160 px (MC-03) |
| Teclado | La barra sube con él; la lista se acorta por arriba de la barra |
| Sitio reservado | A la izquierda del envío, dentro del contorno, cabe una puerta más (Hablar, §3 ter). Hoy no se dibuja: la voz está fuera (PT-2). Dónde va y qué pasa mientras se transcribe queda como pregunta abierta en el informe del carril |

### 8.4 La tarjeta de confirmación en el móvil

> **Plegada por defecto: se ve lo que hace falta para decidir. El detalle, en la misma tarjeta y a demanda.**

**Lo que no se pliega nunca.** Es lo que P-03 obliga a mostrar antes de ejecutar y lo que otras reglas exigen ver:

| Qué | Ejemplo | Por qué no se pliega |
|---|---|---|
| La acción | «Registrar este compromiso en tu calendario de Google» | P-03: la acción exacta |
| **El qué** | «Reunión» | La acción no dice cuál: el nombre solo está en un dato (MC-17) |
| **El cuándo, con su zona** | «sábado, 7 de noviembre de 2026 · 10:00 – 11:00 · Hora de Lima (GMT-5)» | P-05: toda fecha se muestra con zona (MC-18) |
| **Lo que puso el sistema por su cuenta** | «1 hora, porque no indicaste la hora de fin» | REQ-CUN01-01 y su decisión 19: la tarjeta lo dice (MC-18) |
| Lo irreversible y las consecuencias | «No se avisa a nadie de este cambio», «Solo esta vez: el resto de la serie queda igual» | P-03 |
| El cruce | «Se cruza con «Llamada con proveedores»» | Decisión 27 de `02-agenda` |
| Las decisiones | Alternativas, «Confirmar», «Descartar» | Son la tarjeta |

**Lo que se pliega** es la forma en pares etiqueta / valor apilados y los datos que la línea esencial ya dice. Nada más.

**La línea esencial** son dos renglones como mucho: el qué, y el cuándo con la zona. Se arma **con los valores de los datos tal como vienen**, sin abreviar ni reescribir en la pantalla: si algún día se quiere «sáb 7 nov», esa forma corta la tiene que dar el sistema junto con los datos, igual que da el texto del cruce. Según la acción:

| Acción | Primer renglón | Segundo renglón |
|---|---|---|
| Registrar | El título | Fecha · hora · zona |
| Mover | El compromiso | «Antes» → «Ahora» · zona |
| Cancelar | El compromiso | Cuándo · zona |

**Las decisiones** siguen §3: **«Confirmar» primario a ancho completo y «Descartar» secundario a ancho completo debajo**. Las alternativas, si las hay, van debajo de la línea de cruce y antes de «Confirmar», cada una como botón secundario, y **la fila «Alternativas» en texto no se pinta** (MC-06). En un cruce no hay «Confirmar»: las alternativas son las decisiones.

**«Ver detalles» es un control de texto, no un botón de decisión.** Va a la derecha del qué, sin borde, en `marca/base`, con 44 px de área táctil, y pasa a «Ocultar detalles». No va en una fila junto a «Descartar»: ponerlo al lado da el mismo peso a decidir y a mirar, y §3 no admite dos botones pequeños uno al lado del otro.

**Desplegada**, la línea esencial se sustituye por los pares de siempre (Título, Fecha, Hora, Zona horaria, Duración…), dentro de la misma tarjeta. Lo supuesto, lo irreversible, el cruce y las decisiones se quedan donde estaban.

**Tope de alto.** Plegada, con el cruce y **una** alternativa, la tarjeta no pasa del **40 % del alto** de la pantalla (338 px en 390 × 844). Cada alternativa más añade una fila de 52 px; con tres, sigue cabiendo con la petición a la vista. Desplegada no tiene tope: es la persona quien lo pidió.

**La tarjeta ya decidida** se queda plegada, sin decisiones y con `borde/base` en lugar de `borde/fuerte`: ya no pide nada (§3, el borde graduado). «Ver detalles» sigue ahí. Hoy conserva todos los datos y no dice que ya se decidió (MC-08).

**Por qué no contradice REQ-CAP-01.** El requisito pide que las tres puertas terminen en «la misma tarjeta, con los mismos datos y las mismas salidas». Plegar no quita ningún dato: los pone a un toque, dentro de la misma tarjeta; y las salidas —confirmar, descartar, elegir alternativa— son las mismas, en el mismo orden. Lo que se confirma es idéntico plegado o desplegado. Y lo que P-03 obliga a ver antes de ejecutar está siempre en la parte que no se pliega.

**Lo que esto precisa de §3.** «Datos estructurados» dice que los datos que se revisan antes de confirmar van en pares, nunca en una línea corrida con puntos. Esa regla sigue valiendo para la tarjeta desplegada y para cualquier pantalla donde se revisan datos completos. **En la tarjeta plegada del móvil se admite la línea esencial** con tres condiciones: cada valor se entiende solo (el día lleva el día de la semana, la hora es un intervalo, la zona va nombrada); nunca mezcla el tipo de cosa con sus datos («Compromiso · jueves 2, 16:00» era el error 6 de §4); y los pares están a un toque. El error del v2 era no tener dónde revisar; aquí está en la misma tarjeta.

### 8.5 El título de la capa

El título dice **en qué estamos**, sin vocabulario interno (R-40: nunca «episodio» ni «turno»).

| Estado | Título | Línea de apoyo |
|---|---|---|
| No hay nada en la conversación | «¿Qué hacemos?» | — (debajo, el blanco con ejemplos) |
| Hay conversación anterior y nada abierto | «¿Qué hacemos?» | — |
| Hay algo abierto: se está pidiendo o decidiendo algo | «Asistente» | La primera petición de lo que está abierto, en una línea, recortada al final |

«¿Qué hacemos?» es una invitación, y solo vale cuando no hay nada a medias (MC-05). Con algo abierto, el título nombra a quien habla —el asa dice «Pedir algo al asistente»— y la línea de apoyo dice de qué va, que es lo que se pierde de vista cuando la petición sube con el desplazamiento.

### 8.6 El asa, con indicador

El asa sigue donde está y sigue haciendo lo mismo: sube la capa. Lo que cambia es que **dice cuándo hay algo esperando tu decisión**: si hay una propuesta abierta, lleva un **punto** pequeño en `texto/inverso` en su esquina, y su nombre accesible pasa a «Pedir algo al asistente. Tienes algo por confirmar». Al confirmar, descartar o caducar la propuesta (decisión 28 de `07-agente`, 24 horas), el punto desaparece.

| Por qué así | |
|---|---|
| Punto y no número | Hay como mucho una propuesta pendiente a la vez (decisión 24 de `07-agente`, en secuencia) |
| No ámbar | El ámbar es la franja «en espera» (decisión 26 de `02-agenda`): lo que espera a que el sistema pueda hacerlo. Esperar **tu** decisión es otra cosa, y REQ-CAP-23 pide que no se parezcan |
| No rojo | No es un error |

**El asa construida no es la de §2.** §2 y §3 dicen botón redondo de 56 px con un signo; la aplicación tiene una píldora «Pedir algo» de 48 px en `agente/base` (MC-13). Este documento no lo resuelve: queda para el equipo. El indicador vale para las dos formas.

### 8.7 Relación con lo ya decidido

| Lo decidido | Qué cambia con esta revisión |
|---|---|
| Revisión del 5 de noviembre (REQ-AGT-03), T-039: la capa no se vacía, separadores con hora y desenlace, «Ver anteriores» arriba | Nada en su comportamiento. Pasan a vivir dentro de la lista a todo el alto, con la cabecera fina encima |
| Franja «en espera» (REQ-CAP-25, decisión 26 de `02-agenda`): en el nivel Hoy, fuera de la capa | Nada. La franja es lo que espera al sistema; el punto del asa es lo que espera a la persona. Viven en sitios distintos y con colores distintos |
| Cruce en una línea (decisión 27 de `02-agenda`) | Se conserva tal cual: es la forma que la línea esencial imita |
| Alternativas de referente (REQ-AGT-04) | Se pintan como las alternativas de horario: botones dentro de la tarjeta, sin repetirlas en texto |
| Anchos menores de 1024 en la web (H-WEB-01) | La conversación es allí una capa: le valen las mismas reglas |
| §2, el fondo de la capa es el antecedente | Se precisa: el antecedente se ve entero con la capa baja, o como franja con la capa completa; nunca cortado |

### 8.8 Esquemas

Tarjeta **plegada**, con cruce y una alternativa, en la capa completa:

```
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← 12 px del antecedente, bajo el velo
├──────────────────────────────────────┤
│ Asistente                     Cerrar │ ← cabecera fina: título + una acción
│ Agéndame una reunión mañana a las…   │ ← apoyo: la petición abierta, una línea
├──────────────────────────────────────┤
│          ( Ver anteriores )          │ ← fijo arriba mientras haya más
│ ─── Viernes 6, 22:22 · Tarea guard… ─│ ← separador de T-039
│                                      │
│              Agéndame una reunión ▐  │ ← la petición, visible
│              mañana a las 10      ▐  │
│ ┌──────────────────────────────────┐ │
│ │ Registrar este compromiso en tu  │ │ ← la acción
│ │ calendario de Google             │ │
│ │ Reunión             Ver detalles │ │ ← el qué · control de texto
│ │ sábado, 7 de noviembre de 2026 · │ │ ← el cuándo, con la zona
│ │ 10:00 – 11:00 · Hora de Lima (…) │ │
│ │ 1 hora, porque no indicaste la h…│ │ ← lo que puso el sistema
│ │ Se cruza con «Llamada con prove… │ │ ← el cruce, una línea
│ │ [ lunes, 9 de noviembre, 12:00 ] │ │ ← alternativa
│ │ [          Descartar           ] │ │
│ └──────────────────────────────────┘ │ ← como mucho el 40 % del alto
├──────────────────────────────────────┤
│ ( Pídele algo al asistente      ↑ )  │ ← una fila; el envío, dentro
└──────────────────────────────────────┘
```

La misma tarjeta **desplegada** (la lista se coloca en su principio):

```
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
├──────────────────────────────────────┤
│ Asistente                     Cerrar │
│ Agéndame una reunión mañana a las…   │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Registrar este compromiso en tu  │ │ ← la acción, arriba de la vista
│ │ calendario de Google             │ │
│ │                Ocultar detalles  │ │
│ │ Título         Reunión           │ │ ← los pares de §3, como hoy
│ │ Fecha          sábado, 7 de nov… │ │
│ │ Hora           10:00 – 11:00     │ │
│ │ Zona horaria   Hora de Lima (G…) │ │
│ │ Duración       1 hora, porque no │ │
│ │                indicaste la hora │ │
│ │                de fin            │ │
│ │ Se cruza con «Llamada con prove… │ │ ← lo que no se pliega, donde estaba
│ │ [ lunes, 9 de noviembre, 12:00 ] │ │
│ │ [          Descartar           ] │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ ( Pídele algo al asistente      ↑ )  │
└──────────────────────────────────────┘
```

Sin cruce, en el lugar de la alternativa va «Confirmar», primario, y «Descartar» sigue debajo. Desplegada, sin «Alternativas» en texto: los botones ya lo dicen.

### 8.9 Lo que esta revisión deja abierto

Va en `entregas/INFORME-CARRIL-MOVIL-DISENO.md`: el requisito nuevo que convendría escribir (la tarjeta plegada), si la web también pliega, el valor del velo y el token de contorno, la forma del asa, el dictado en la barra de una fila, la foto, y si la capa completa debe ocupar la pantalla entera cuando lo abierto es largo.
