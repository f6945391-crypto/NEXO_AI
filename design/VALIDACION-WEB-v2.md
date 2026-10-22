# Validación — Arquitectura visual web v2

**Archivo de Figma:** página `06 Arquitectura · Web v2`
https://www.figma.com/design/mgmuPhGwkmvfhz7xk0QPl5

**Fecha:** 26 de septiembre de 2026
**Entradas:** `design/ARQUITECTURA-VISUAL-WEB.md` contra la estructura real leída desde Figma con `15-validar-web-v2.js`.

---

## Resumen

| Métrica | Resultado |
|---|---|
| Cuadros generados | 9 |
| Fuera de convención `WEB-v2 / Grupo / NN Nombre` | 0 |
| Cuadros sin las columnas de navegación y lienzo | 0 |
| Anchos vinculados a la colección `disposicion` | 8 de 9 |
| Instancias de componente | 166 |
| Nodos con color sin variable | 0 |
| Componentes nuevos | 7 |
| Variables nuevas | 4 |

---

## A. Cuadros

| Grupo | Cuadro | Qué demuestra |
|---|---|---|
| Armazón | 01 Normal | Las tres columnas con CUN-07 dentro. La confirmación de RN-ER-03 deja de ser panel lateral y pasa a ser tarjeta de la conversación |
| Armazón | 02 Lienzo expandido | Conversación a 0, lienzo a 1368, con la rejilla de disponibilidad y el asidero de vuelta |
| Blancos | 01 Vacía tras cerrar | Logro. El resultado está en el registro, a la derecha |
| Blancos | 02 Inicial | Invitación con tres ejemplos pulsables |
| Blancos | 03 Asistente no disponible | Disculpa, banner de degradado y el formulario manual operativo en el lienzo |
| Blancos | 04 Fuera del plan | Oferta, más lo que el usuario sí puede hacer ahora |
| Registro | 01 Alcance personal | La interfaz de `evento_auditoria` |
| Registro | 02 Alcance de equipo | Selector de alcance y el límite de privacidad escrito en pantalla |
| Diálogos | 01 Advertencia de descarte | Un solo componente para el vaciado manual y el clic en navegación |

## B. Componentes nuevos

| Componente | Variantes | Propiedades |
|---|---|---|
| `Web / Icono` | 6, por nombre | — |
| `Web / Ítem de navegación` | Reposo, Activo | Icono (`INSTANCE_SWAP`) |
| `Web / Tarjeta` | Propuesta, Confirmación, Resultado, Bloqueada, Error | Título, Cuerpo |
| `Web / Burbuja` | Usuario, Asistente | Mensaje |
| `Web / Barra de entrada` | Reposo, Activo, Deshabilitado | Texto |
| `Web / Panel de lienzo` | Objeto, Registro | Título, Subtítulo |
| `Web / Fila de registro` | Hecho, Rechazado, Pendiente | Acción, Detalle, Momento |
| `Web / Advertencia de descarte` | — | Qué se pierde |

`Web / Botón`, `Web / Campo`, `Web / Fila de colaborador` y `Web / Rejilla de disponibilidad` se reutilizan sin tocarlos.

## C. Variables nuevas

Colección `disposicion`, dos modos: Normal y Lienzo expandido.

| Variable | Normal | Lienzo expandido |
|---|---|---|
| `ancho/nav` | 72 | 72 |
| `ancho/conversacion` | 528 | 0 |
| `ancho/lienzo` | 840 | 1368 |

Más `superficie/velo` en la colección de color, en los dos modos, para el velo de los diálogos. La opacidad va en el relleno, no en el token.

Cambiar de disposición es cambiar de modo. Ningún cuadro tiene los anchos cableados, salvo el 02, que por definición no usa el modo Normal.

## D. Reglas de producto

| Regla | Verificación | Resultado |
|---|---|---|
| RN-ER-03 confirmación previa | La tarjeta de tipo Confirmación muestra la acción exacta, los datos y qué es irreversible | CUMPLE |
| RN-ER-03 en la advertencia | Dice qué se pierde con nombres y fechas, nunca «¿estás seguro?» | CUMPLE |
| RN-OP-01 permisos | El blanco «fuera del plan» se trata como falta de permiso, no como error | CUMPLE |
| RN-OP-02 alcance | El registro de equipo se limita a objetos del equipo, declarado en pantalla | CUMPLE |
| Doble camino | El formulario manual del cuadro 03 completa el caso de uso sin el asistente | CUMPLE |
| Un solo sujeto a la vez | Ningún cuadro muestra un lienzo que la conversación no esté tratando | CUMPLE |

---

## Defectos encontrados y corregidos durante la generación

**1. Las propiedades de texto del conjunto aplastaron el texto propio de cada variante.** Al declarar `Título`, `Cuerpo` y `Mensaje` en el conjunto con un valor por defecto, ese valor se aplicó a las cinco variantes de `Web / Tarjeta` y a las dos de `Web / Burbuja`: el turno del asistente mostraba el texto del usuario. Se corrige dando a cada **instancia** su texto, no tocando el componente. Es el mismo defecto que ya apareció en `Web / Campo` en la iteración anterior, y conviene recordarlo: declarar una propiedad de texto en un conjunto es destructivo para el contenido de las variantes.

**2. `Web / Burbuja` hacía hug horizontal.** Un mensaje largo estiraba la burbuja a 542 px dentro de una columna de 528. Se fijó el ancho por variante, 380 y 440.

**3. `addComponentProperty` sobre una variante falla.** Devuelve «Can only set component property definitions on a product component». La propiedad va en el conjunto.

**4. El velo del diálogo nacía con color suelto.** Se creó `superficie/velo` en los dos modos y se vinculó. La página quedó en cero colores sin variable.

---

## Lo que esta validación NO comprueba

**Que los cuatro blancos se distingan entre sí.** Estructuralmente los cuatro son idénticos: tres columnas y una conversación sin tarjetas. La única forma de verificarlo es mirarlos. Es exactamente el tipo de defecto que la validación estructural no ve, igual que pasó con `Web / Campo`, donde el recuento de instancias estaba perfecto y el defecto seguía ahí.

---

## Pendiente

1. **Los 20 cuadros de CUN-07 y CUN-05 siguen en la jerarquía v1.** Esta página es una sección nueva, no un reemplazo. Rehacerlos es lo que absorbe además la deriva de RN-CAL-01 sin trabajo extra.
2. **`Web / Rejilla de disponibilidad` sigue dimensionada para 1200 px.** En el cuadro 02 no llena los 1356 disponibles. Se ve en la captura.
3. **Iconografía de marcador de posición.** Seis formas geométricas. Van como `INSTANCE_SWAP`, así que sustituirlas no obliga a tocar ningún cuadro.
4. **El icono no cambia de color en el estado activo** de la navegación. El activo se marca solo con el fondo.
5. **Extraer `Fundamentos` como biblioteca publicada.** Sigue pendiente, y conviene hacerlo antes de generar más.
6. **Sin revisar en modo oscuro.** Las variables tienen los dos modos; ningún cuadro se ha mirado en Oscuro.

---

## Añadido: acceso y encargos

**10 cuadros nuevos** en `06 Arquitectura · Web v2`.

| Grupo | Cuadros | Qué cuenta |
|---|---|---|
| **Acceso** | 3 | Entrada con cuenta de la organización · Primer ingreso con zona horaria · Permisos de Google |
| **Encargos** | 5 | Equipo y permisos · Página de aceptación · Encargar con preguntas · Formulario de respuesta · Llega como propuesta |
| **Correo** | 2 | Invitación · Pedido. **Miden 680 de ancho**, no 1440: no son pantallas de la aplicación |

### Lo que estos cuadros resuelven

**La zona horaria por fin tiene dónde pedirse.** RN-CAL-01 depende de ella y hasta ahora aparecía de la nada. Va en el primer ingreso, preguntada y no deducida del navegador.

**El criterio de terminado deja de ser un campo suelto.** Es una de las preguntas declaradas del encargo, y eso cierra D-15: sin criterio declarado no hay forma de decir que algo está terminado.

**El tope de 400 caracteres se ve en los tres sitios donde tiene que verse**: al declararlo el gerente, anunciado en el correo, y con contador en el formulario. La respuesta que llega al gerente muestra «312 de 400», que es lo que hace creíble el tope.

**El caso feo está dibujado.** `Encargos / 05` enseña a la vez la respuesta buena por formulario y la respuesta cruda por correo, truncada y marcada «llegó sin estructura». Sin ese segundo bloque el diseño estaría contando solo el camino bonito.

### Lo que NO se comprobó

**El validador web no cubre estos cuadros todavía.** `15-validar-web-v2.js` está escrito contra el armazón de tres columnas y hay que enseñarle tres cosas: que los cuadros de Acceso no llevan navegación, que los de `Correo` miden 680, y que la navegación de los de Encargos tiene siete ítems y solo uno activo.

**El ícono de Encargos es prestado** del de Tareas. La iconografía sigue pendiente en las dos plataformas.

### Pendiente

1. Enseñar al validador web los tres casos de arriba.
2. **Variante móvil del acceso**, que es el mismo flujo más estrecho, y la pantalla de contraseña olvidada.
3. Añadir la variante `Encargos` al conjunto `Web / Icono` en vez de clonar la de Tareas.
4. Volcar estos 10 cuadros a un script `19-cuadros-acceso-encargos.js`; hoy solo existen en el archivo.
5. Decidir el repliegue si la verificación de Google no llega a tiempo: enviar desde dominio propio, con peor tasa de respuesta. Está escrito en `specs/04-comunicaciones/spec.md` §7.

---

## Análisis de la página completa · 26 de septiembre

Revisión de los 19 cuadros de `06 Arquitectura · Web v2` contra lo decidido. Lo visual estaba bien; el problema era de coherencia y de orden.

### Lo que estaba mal

**1. La navegación promete siete secciones y cinco no existen.** Solo Encargos y Actividad tienen pantalla. Agenda, Tareas, Equipo, Reuniones y Resúmenes no llevan a ningún sitio. Es exactamente lo que le pasaba al móvil antes de corregirlo, y aquí nadie lo había mirado porque los cuadros que sí existen están acabados y distraen. **Sigue abierto**: la página ahora lo declara con una fila 3 vacía a propósito.

**2. Cuatro de los doce cuadros de aplicación tenían activa una sección distinta de la que enseñaban.** Corregido:

| Cuadro | Estaba | Ahora |
|---|---|---|
| `Armazón / 01 Normal` | Equipo | **Encargos** — enseña una delegación |
| `Armazón / 02 Lienzo expandido` | Reuniones | **Equipo** — enseña disponibilidad |
| `Blancos / 01 Vacía tras cerrar` | Equipo | **Encargos** |
| `Blancos / 03 Asistente no disponible` | Equipo | **Agenda** — el cuadro es genérico |
| `Diálogos / 01 Advertencia` | Agenda | **Encargos** |

Queda como regla en `ARQUITECTURA-VISUAL-WEB.md` §7: *el marco dice la verdad sobre el contenido*. Es la misma familia del fondo del velo en móvil — un marco que en la aplicación real sería imposible.

**3. Tres naturalezas mezcladas sin declarar.** La página tiene pantallas de aplicación, páginas públicas que abre alguien sin cuenta, y correos. Las dos públicas estaban dentro del grupo Encargos y **sin navegación**, así que parecían cuadros rotos. Renombradas:

| Antes | Ahora |
|---|---|
| `WEB-v2 / Encargos / 02 Página de aceptación` | `PÚBLICO / 01 Aceptación del colaborador` |
| `WEB-v2 / Encargos / 04 Formulario de respuesta` | `PÚBLICO / 02 Formulario de respuesta` |
| `WEB-v2 / Correo / 01–02` | `CORREO / 01–02` |

Sale de §4.7: el colaborador no es usuario, así que sus pantallas no pueden llevar la navegación de una aplicación en la que no entró.

**4. No había recorrido y el orden iba al revés**: la página abría con el chasis y terminaba con el login, que es lo primero que pasa en el producto.

### El orden nuevo

| Fila | Cuadros | Qué cuenta |
|---|---|---|
| 1 · Acceso | 3 | Lo que pasa antes de la aplicación |
| 2 · Armazón | 2 | Cómo está hecha la pantalla |
| 3 · Secciones | **0** | Declarada vacía: 5 de 7 destinos sin pantalla |
| 4 · Recorrido del encargo | 7 | De izquierda a derecha: permisos → invitación → aceptación → encargar → pedido → formulario → llega como propuesta |
| 5 · Estados | 6 | Los cuatro blancos y los dos alcances del registro |
| 6 · Excepciones | 1 | Advertencia de descarte |

Cada fila lleva su rótulo en el lienzo. La fila 4 es la única historia completa del archivo web, y mezcla a propósito las tres naturalezas en el orden en que ocurren.

### Lo que este análisis NO arregla

Lo de la fila 3 y la portada de Encargos siguen pendientes: ordenar no crea pantallas. Y **los 20 cuadros de `05 Flujos · Web` siguen en la jerarquía vieja**, que es el riesgo de coherencia más serio del entregable — hoy el archivo cuenta dos productos web distintos.

---

### Corrección posterior: de siete secciones a tres

El análisis de arriba ordenó la página pero **dejó pasar lo más importante**, y Franco lo cortó en una frase: en móvil habíamos fusionado a tres secciones y en web yo mantuve seis y añadí una séptima. Dos gramáticas para la misma aplicación.

Corregido. La navegación web es ahora **Agenda · Tareas · Actividad**, con **Ajustes al pie**, separado por una línea.

| Antes | Ahora |
|---|---|
| Reuniones, Equipo | Dentro de **Agenda**: coordinar es crear un evento, la disponibilidad es el dato que se lee para colocarlo |
| Encargos | Franja dentro de **Tareas**, igual que «esperando de alguien» en Personal |
| Resúmenes | Dentro de **Actividad**: un resumen es lo que pasó |
| Equipo y permisos como sección | **Ajustes**, fuera de la barra de trabajo |

Renombres: `Encargos / 01 Equipo y permisos` → `Ajustes / 01`; `Encargos / 02 Encargar` → `Tareas / 01`; `Encargos / 03 Llega como propuesta` → `Tareas / 02`.

**Detalle técnico que costó una pasada:** la columna de navegación es auto-layout vertical, así que poner `y = 836` en el ítem de Ajustes no hace nada. Hay que empujarlo con un espaciador de `layoutGrow = 1` antes de él. Anotado para el validador y para quien reconstruya la página.

**Lo que esta corrección deja al descubierto:** ninguna de las tres secciones tiene portada en web, y los niveles de período —Hoy · Semana · Mes— que el móvil ya tiene no están dibujados aquí en ningún cuadro.

---

### Barrido de R-40 · la interfaz nunca se nombra a sí misma

Franco señaló un cuadro y avisó de que habría más. Los había: **ocho textos en seis cuadros** nombraban la disposición o citaban un código de regla dentro de la propia pantalla.

Lo que se corrigió: «el panel de la derecha», «el formulario de la derecha», «el registro de la derecha» y «el lienzo» salieron de los textos; «Esto no es "no hay datos"» dejó de citar el vocabulario del diseño; y «(RN-CAL-01)» y «(RN-OP-02)» desaparecieron de la interfaz, conservando la frase que sí le habla al usuario —«Coordinar no es vigilar» se queda, el código no—.

**`WEB-v2 / Armazón / 02 Lienzo expandido` se eliminó**: llevaba un párrafo entero explicando el diseño como si fuera contenido de pantalla. La disposición sigue existiendo y está escrita; lo que no cumplía era ese dibujo.

**Comprobación que hay que añadir al validador:** ningún texto de un cuadro puede contener un código entre paréntesis con la forma `(XX-…)`, ni las palabras `lienzo`, `panel de la derecha`, `registro de la derecha` o `no hay datos`. Es mecánica y habría encontrado los ocho.

---

### Actividad en web, con el formato del móvil

Franco: *no he visto que tomes el formato de actividades que se vio dentro de la parte móvil.* Cierto, y era el hueco que yo mismo había listado y no había cerrado.

**Los dos cuadros de `Registro` se sustituyen por cuatro de `Actividad`**: `01 Día`, `02 Semana`, `03 Mes` y `04 Registro del asistente`. Misma gramática que en móvil — denominador en cada cifra, barras que se llenan contra él, «sin categoría» visible, y el enlace «Qué hizo el asistente en este período» al pie de cada informe.

Los **dos alcances** dejan de ser dos cuadros y pasan a ser un filtro dentro del registro —«Lo tuyo» y «El equipo»—, que es donde el límite de privacidad tiene sentido: se aplica a las acciones, no al informe de tu tiempo.

Van en la **fila 3, que estaba vacía**: Actividad es la primera de las tres secciones que tiene sus niveles dibujados en web. Agenda y Tareas siguen sin portada.

### El modo degradado, replanteado

`Blancos / 03` ofrecía «Delegar a mano» con un formulario de tres campos **sin rellenar** —«Etiqueta / Valor / Texto de ayuda», el relleno del componente a la vista—. El barrido encontró que era el único cuadro con ese problema.

Pero el defecto de fondo era otro, y lo señaló Franco: **el agente es el encargado**. No hay camino manual en paralelo. El cuadro ahora enseña lo que se pidió **en cola**, con la garantía de que no se ha creado ni avisado nada, y qué se puede seguir haciendo mientras tanto: consultar la agenda, leer los hilos y seguir dictando, que también se encola. Queda como R-42.

### Dos regresiones que cometí al rehacer y tuve que corregir

Al vaciar la columna de conversación **me llevé por delante la barra de entrada**, y el estado vacío quedó pegado arriba porque la columna es auto-layout vertical y las coordenadas no aplican. Es la tercera vez en el proyecto que el auto-layout me come una posición fija: antes fue el ítem de Ajustes en la navegación web y el ancho de las filas horizontales. **Regla para el validador:** antes de dar por bueno un cuadro de tres columnas, comprobar que la conversación conserva su barra de entrada.

---

### Orden del lienzo · revisión de secuencia

Franco: *viendo la lógica secuencial, me parece que se mezcló con la versión base pasada y falta ordenar.* Al listar las coordenadas apareció por qué.

**En el móvil había tres pares de cuadros literalmente encimados** —`Tareas / 01` bajo `Captura / 01`, y los dos de rutinas bajo los dos nuevos de captura—, invisibles mirando el lienzo porque uno tapa al otro. Además **ninguna fila tenía rótulo**, mientras la web sí los tenía, y las filas seguían siendo las de la iteración anterior: los grupos nuevos se habían ido metiendo donde cabían.

La página del móvil queda en **diez filas, una por grupo**, en orden de lectura: Acceso *(vacía, declarada)* · Agenda · Tareas · Actividad · Ajustes · Recorrido · Captura · Día · Estados · Excepciones.

En la web se corrigieron **dos rótulos que ya mentían** —la fila de Estados seguía diciendo «y el registro» cuando el registro se había ido a Actividad, y la de Armazón no avisaba de que el lienzo expandido se quedó sin cuadro— y el paso vertical, que tras separar una fila hacía que se pisara con la siguiente.

**Tres comprobaciones nuevas para el validador**, las tres por haberlas incumplido: ningún cuadro con las mismas coordenadas que otro; paso vertical mayor que el alto del cuadro; y todo cuadro dentro de una fila rotulada.
