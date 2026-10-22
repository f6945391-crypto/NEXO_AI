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

### La barra de entrada no era una barra de entrada

Nunca se escribe dentro: al tocarla sube la capa de captura, que es donde pasa todo. O sea que **es un asa, no un campo**, y estaba dibujada como lo que no es, ocupando 65 px de ancho completo en todas las pantallas.

Pasa a ser `Móvil / Asa de captura`: un botón redondo de 56 px flotando abajo a la derecha. Gana los 57 px que la barra robaba al contenido, deja de empujar la lista hacia abajo cuando el día está cargado, y queda más honesta sobre lo que hace.

### Las tres capas de «Hoy»

La sección Hoy no es una lista, son tres cosas distintas que comparten el día y que **no pueden parecerse entre sí**:

| Capa | Qué es | Forma |
|---|---|---|
| **Planificado** | Lo que el plan dice que toca | `borde/base`, hora a la izquierda |
| **Registrado** | Lo que de verdad pasó, ya avalado por la persona | `borde/base` y marca de procedencia |
| **Apunte** | Algo que pensaste o que ocurrió, y que no pide nada | `superficie/hundida`, **sin borde** |

El apunte va sin borde a propósito: el borde en este lenguaje anuncia que hay algo que decidir (§3), y un apunte no lo tiene. Es el mismo criterio que deja la fila de extracción con `borde/fuerte` mientras espera confirmación.

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
