# Validación de diseño — Móvil v2

**Archivo de Figma:** página `07 Móvil v2 · Estructura y recorrido`
https://www.figma.com/design/mgmuPhGwkmvfhz7xk0QPl5

**Fecha:** 26 de septiembre de 2026
**Entradas:** `design/ARQUITECTURA-VISUAL-MOVIL.md`, `REPLANTEO.md` §5 y §6, `specs/01-captura/spec.md` y `specs/02-jornada/spec.md`, contra la estructura real de la página.

---

## Qué sustituye

Esta página reemplaza al boceto `CAP-v2`, que se abandona. Aquel tenía dos problemas de fondo:

1. **Era un catálogo, no un recorrido.** Mostraba funciones sueltas —entrada, voz, confirmación, foto— sin contar una historia, y sin que se viera nunca el resultado en su sitio.
2. **Se inventó un lenguaje visual distinto** del que los 13 cuadros de `04 Flujos · Móvil` ya habían establecido: fondo gris, cabecera dentro de una caja, botones pequeños en fila, «Cancelar» en rojo destructivo, datos en línea corrida con puntos.

La causa de las dos cosas era la misma: **el móvil nunca tuvo un documento de arquitectura.** Ahora lo tiene.

---

## Resumen

| Métrica | Resultado |
|---|---|
| Cuadros | 32 |
| Grupos | 11 |
| Fuera de convención `MOV-v2 /` | 0 |
| **Cuadros sin pestañas** | **0** |
| Cuadros con fondo distinto de blanco | 0 |
| Nodos con color sin variable | 0 |
| Nodos que se salen a lo ancho | 0 |
| **Fallos del script `18-validar-movil-v2.js`** | **0** |
| Avisos (contenido que sigue bajo el suelo: es scroll) | 1 |

---

## A. Los diez grupos

Los cuatro primeros cuentan cómo funciona el móvil. Los seis siguientes son las secciones y sus niveles.

| Grupo | Cuadros | Qué cuenta |
|---|---|---|
| **Recorrido** | 5 | Una sola historia: capturo por voz, encuentra tres cosas, confirmo y vuelvo a donde estaba |
| **Estados** | 3 | En espera, fallo y fuera del plan, que no pueden parecerse |
| **Excepciones** | 2 | No cabe ese día, y asistente no disponible |
| **Hoy** | 4 | Los estados del día: plan propuesto, día real, cierre, apunte largo |
| **Agenda** | 3 | Hoy · Semana (los siete días con su contenido) · Mes (rejilla de calendario) |
| **Tareas** | 2 | Lista · Hilo de una tarea |
| **Actividad** | 4 | Día · Semana · Mes · Registro del asistente |
| **Comunicar** | 4 | Correo preparado, confirmar envío, llamada preparada, al colgar |
| **Rutinas** | 2 | Mis rutinas · Recolocada |
| **Categorías** | 2 | Propuestas por el agente · Ajustar una |
| **Captura** | 1 | Qué abre el asa: las cuatro puertas y los comandos sugeridos |

## B. La iteración de las tres secciones

Franco leyó los cuadros y encontró seis cosas. Cinco eran defectos y una era una pregunta que resultó ser la buena.

| Lo que vio | Qué era | Qué se hizo |
|---|---|---|
| «Actividad está desactualizada respecto a lo del final» | La pestaña tenía dos sujetos peleándose: el registro del asistente y los informes | Actividad es tu tiempo —Día, Semana, Mes—; el registro es su segundo nivel, al que se baja desde el informe |
| «¿Cuál es la diferencia entre Hoy y Agenda?» | Ninguna de sujeto: era zoom | Fusionadas. Tres pestañas: Agenda · Tareas · Actividad |
| «En Hoy hace falta la vista semanal para recapitular» | Faltaba, y estaba en la lista de pendientes | Ya no hace falta inventarla: es el nivel Semana de Agenda |
| «Con muchos datos la barra de texto acaba estorbando» | La barra ni siquiera era un campo: nunca se escribe dentro | Pasa a ser `Móvil / Asa de captura`, un botón flotante. Gana 57 px en todas las pantallas |
| «Falta el conflicto entre eventos y la eliminación» | El registro solo tenía casos de alta y de movimiento | Tres casos nuevos, y uno que no habíamos pensado: **que el evento lo cancele otra persona** |
| «No veo la sección de hilos» | R-17 los puso en el lienzo, que es web. En móvil no se decidió nunca | El hilo vive dentro de la tarea, no como pestaña. `Tareas / 02` |

**La frontera que queda**, y que es mejor que la que había:

> Agenda es lo que va a pasar. Actividad es lo que pasó. El día es la costura.

**El caso que faltaba y nadie había nombrado.** Al listar lo que debía aparecer en el registro salió que un evento puede desaparecer porque lo cancela otra persona en su calendario. Ahí el asistente no puede replanificar en silencio: dice que se liberó el hueco y espera. Es R-25, y se ve en `Actividad / 04`.

---

### Lo que arreglaron los informes

Franco leyó los tres y encontró cuatro cosas, todas ciertas:

| Lo que falló | Por qué | Qué se hizo |
|---|---|---|
| No había cómo pasar de un período a otro | Dibujé tres informes y ningún control | Selector Día · Semana · Mes fijo bajo la cabecera |
| «126 h registradas» no significa nada | Sin denominador, y las barras escaladas contra la semana más alta — una decisión invisible para quien lee | Toda cifra lleva su denominador y toda barra se llena contra él (R-21) |
| El corte laboral / personal no lo puede producir el modelo | Es D-10, que sigue abierta. El diseño se adelantó | Reformulada como D-16: el ámbito viaja en la categoría. Ver `REPLANTEO.md` 4.9 |
| Las categorías del día salían de la nada | El cuadro enseñaba «Tesis, Reuniones, Correo» sin decir quién las decide | Dos cuadros nuevos, y la fila **«Sin categoría»** visible en el informe del día |

La prueba de que el problema era el denominador estaba dentro del mismo cuadro: las rutinas se entendían —«Gimnasio 1 de 3»— y las horas no. Mismo sitio, misma tipografía, misma barra. La única diferencia era el «de 3».

### La segunda pasada de Franco: cinco correcciones

La primera versión de la sección Agenda estaba mal, y el error tenía una sola causa.

| Lo que vio | Qué era | Qué se hizo |
|---|---|---|
| «No me sirve ver lo que falta, quiero saber qué hay en cada día» | Dibujé la semana con **barras de carga**, que son lenguaje de informe | La semana son los siete días con sus bloques. R-26 |
| «En el mes también quiero ver cómo está estructurado» | Mismo error, mismo sitio | Rejilla de calendario con un punto por cada dos compromisos |
| «El hilo lo estás viendo desde el Plan Empresarial y yo hablé del Personal» | Cierto: criterio de terminado y respuestas por correo son CUN-07 y CUN-08 | Rehecho en versión Personal, con un límite de tiempo en vez de criterio. La diferencia entre planes queda en tabla. R-27 |
| «No sé cuál es la funcionalidad del +» | El asa no explica lo que abre, y la barra al menos lo ponía | `Captura / 01`, con las cuatro puertas y tres comandos sugeridos |
| «No veo las notas de voz como anotaciones del día, ni cómo se salta a la grabadora» | El apunte solo existía en `Hoy / 02`, y la grabadora no tenía entrada visible | El apunte entra en el día por su hora, con la hora en tinte de agente. **Hablar** es la primera puerta de la capa |

**La causa común de los dos primeros:** usé la gramática de Actividad dentro de Agenda. Vale la pena dejarlo escrito porque es un error fácil de repetir ahora que las dos secciones comparten selector: **se parecen en la navegación y no se pueden parecer en la forma**.

---

## C. Cobertura de comandos

De los **25 comandos de nivel Gratuito y Personal** de `REPLANTEO.md` §6, antes de esta iteración tenían pantalla **6**. Ahora tienen **15**, y los tres de consulta de período (`/hoy`, `/semana`, `/mes`) dejan de ser callejones porque el selector los conecta.

| Comando | Cuadro | Estado |
|---|---|---|
| `/nota` | `Hoy / 04 Apunte largo` | Nuevo |
| `/agendar` | `Excepciones / 01 No cabe ese día` | Parcial: solo el caso en que no cabe |
| `/voz` | `Recorrido / 02–04` | Ya estaba |
| `/plan` | `Hoy / 01 Plan propuesto` | Nuevo |
| `/rutina` | `Rutinas / 01`, `02` | Nuevo |
| `/hice` | `Hoy / 02 Día real` | Parcial: se ve el resultado, no el acto de declararlo |
| `/cerrar-día` | `Hoy / 03 Cierre del día` | Nuevo |
| `/correo` | `Comunicar / 01`, `02` | Nuevo |
| `/llamar` | `Comunicar / 03`, `04` | Nuevo |
| `/hoy` | `Actividad / 01 Día` | Nuevo |
| `/semana` | `Actividad / 02 Semana` | Nuevo |
| `/mes` | `Actividad / 03 Mes` | Nuevo |
| `/pendientes` | `Tareas / 01 Lista` | Ya estaba |
| `/actividad` | `Actividad / 04 Registro del asistente` | Ya estaba |
| `/no-entra` | `Excepciones / 01` | Ya estaba |

**Los diez que siguen sin pantalla:**

| Comando | Por qué falta | Nivel de prioridad |
|---|---|---|
| `/foto` | Confirmación en conjunto sin resolver | 1 |
| `/horario` | Recurrencia y vigencia: toca el modelo | 1 |
| `/lugar` | Disparo único al llegar; toca el modelo | 1 |
| `/replanificar` | Es la variante de `/plan` cuando algo se cae | 1 |
| `/bloque` | Concentración + No molestar automático | 2 |
| `/objetivo` | Seguimiento con horizonte; depende de leer EN-03 como período (D-15 abierta) | 2 |
| `/empezar` · `/terminar` | Cronómetro en marcha: es un estado persistente, no una pantalla | 2 |
| `/esperando` | Vive en la sección Tareas, que existe pero no lo muestra | 2 |
| `/buscar` | Consulta transversal | 3 |
| `/revisar` | Coach como sesión con cierre; es el más caro de diseñar | 3 |

Los seis comandos Empresariales (`/disponibilidad`, `/reunión`, `/delegar`, `/delegadas`, `/mis-asignadas`, `/resumen`) se diseñan en web, no aquí. Los tres de sistema (`/permisos`, `/mi-plan`, `/ayuda`) no tienen cuadro en ninguna plataforma.

---

## D. Cobertura de las 23 funcionalidades del Plan Personal

| Estado | Números de `REPLANTEO.md` §5 | Cuenta |
|---|---|---|
| **Con cuadro** | 1, 2, 3, 6, 7, 11, 12, 16, 17, 20, 23 | 11 |
| **Con especificación, sin cuadro** | 4, 5, 8, 9, 10, 13, 14, 15, 18, 19, 21, 22 | 12 |
| Sin especificación | — | 0 |

Las doce que faltan están todas escritas en `specs/01-captura/`, `specs/02-jornada/` y `specs/04-comunicaciones/`. Falta forma, no decisión de producto — salvo el 21, que depende de D-15.

---

## E. Componentes

| Componente | Estado |
|---|---|
| `Móvil / Entrada de día` | **Nuevo.** Tres variantes: Planificado, Registrado, Apunte. Es el componente que da forma a las tres capas del día |
| `Móvil / Tarjeta de captura` | **Ampliado** con `Tipo = Apunte`, que era el destino que faltaba para `/nota` |
| `Móvil / Pestañas` | Nuevo en la iteración anterior. Cuatro variantes, una por sección activa |
| `Móvil / Chip` | Ajustado: sin borde y con texto en tono de texto |
| `Móvil / Fila de extracción` | Ajustada: borde graduado, sin tinte ámbar de fondo |
| `Móvil / Aviso` | Sin cambios |
| Botón, Tarjeta de evento, Burbuja, Barra de entrada | **Sin tocar.** Ya cumplían el lenguaje |

---

## Defectos encontrados y corregidos

**1. Reutilizar el mismo objeto de pintura entre nodos pierde la opacidad.** Creé una pintura de velo al 0,16 y la asigné a varios rectángulos; los primeros quedaron bien y el resto salió con opacidad 1, o sea un velo casi negro que tapaba la sección entera. Hay que **crear una pintura nueva por nodo**. Anotado en `figma/README.md`.

**2. `appendChild` no devuelve el nodo.** Encadenar `pon(cap, T(...)).layoutSizingHorizontal` falla con «cannot set property of null». Hay que guardar el nodo antes.

**3. Las propiedades TEXT declaradas en el conjunto aplastan la copia de cada variante.** Al declarar `Texto#105:4` en el `COMPONENT_SET` de `Entrada de día`, las tres variantes quedaron con el mismo texto por defecto. Es el tercer caso del mismo defecto en el proyecto —ya pasó con `Web / Campo` y con `Móvil / Tarjeta`— y hay que poner el valor **por instancia**, no en el conjunto.

**4. El velo opaco y el fondo vacío — encontrado por Franco mirando la página, no por el script.** Los cinco cuadros con capa de captura —`Hoy / 03` y los cuatro de `Comunicar`— tenían el velo a opacidad **1** en vez de 0,16, y debajo un `Contenido` de un solo bloque de relleno. El resultado era un bloque azul marino opaco que hacía leer la capa como una pantalla distinta, que es exactamente el defecto por el que se tiró el boceto `CAP-v2`.

Eran dos fallos encadenados, y el segundo es el de fondo: **aunque el velo hubiera estado bien, detrás no había nada que ver.** Corregido poniendo detrás de cada capa la sección real de la que se viene, clonada de su propio cuadro, y midiendo la opacidad de `Estados / 02` en vez de volver a deducirla. La regla queda escrita en `ARQUITECTURA-VISUAL-MOVIL.md` §2.

Lo que este defecto enseña del proceso: el error nº 1 de esta misma lista ya estaba anotado en el `README` desde la iteración anterior y aun así volvió a pasar. **Una nota en un README no impide nada.** La pintura hay que crearla dentro del bucle, y el velo tiene que ser una comprobación del script de validación, no una intención.

**5. El velo opaco, por cuarta vez — y la lección que importa.** Al crear `Categorías / 02` el velo volvió a salir a opacidad 1, con la misma línea de código que había funcionado en los cuatro cuadros anteriores de la misma sesión. Es la cuarta vez que este defecto entra, y en las tres anteriores ya estaba anotado en `figma/README.md` y en este mismo documento.

La conclusión no es «acordarse mejor». Es que **un defecto que se repite no se arregla documentándolo**. `18-validar-movil-v2.js` ahora comprueba dos cosas por máquina:

- todo nodo `Velo` tiene la pintura a 0,16, con variable, y sin opacidad en el nodo;
- todo cuadro con `Capa de captura` tiene debajo un `Contenido` con más de un hijo, y el velo por debajo de la capa.

La primera vez que se ejecutó encontró **dos cuadros más** con el fondo de relleno —`Recorrido / 03` y `04`— que llevaban ahí desde la iteración anterior y que nadie había visto, ni Franco ni yo. Corregidos clonando el fondo de `Recorrido / 02`, para que los tres cuadros de la misma captura compartan antecedente.

**6. El velo, quinta vez — y por fin la causa.** Volvió a salir opaco en `Captura / 01`. Esta vez **lo cazó el script antes que nadie**, y esa ejecución permitió aislarlo con una prueba controlada en el archivo:

`setBoundVariableForPaint` **descarta el campo `opacity` si el nodo todavía no tiene padre.** El mismo código daba 1 o 0,16 según si yo pintaba antes o después del `appendChild`. La regla es una línea: *mete el nodo en su padre primero, y píntalo después.* Queda en `figma/README.md` con la prueba.

Cuatro veces documentándolo no sirvieron de nada. La comprobación automática lo encontró a la primera y además dio el caso que faltaba para entenderlo.

**7. Fijar el ancho de una fila horizontal le congelaba la altura.** Mi ayudante `fija()` ponía `counterAxisSizingMode = "FIXED"` sin mirar la dirección del auto-layout. En una columna el eje contrario es el ancho —correcto—, pero en una fila es el **alto**: los selectores de período salieron de 134 px en vez de 39. Se ve enorme y es de una línea de código.

Los seis errores de forma del boceto anterior están listados en `ARQUITECTURA-VISUAL-MOVIL.md` §4, con la regla que corrige cada uno.

---

## Lo que esta validación NO comprueba

**Que los tres estados se distingan entre sí.** Estructuralmente son idénticos: una capa con un bloque de tinte y dos botones. Que «en espera», «fallo» y «fuera del plan» se lean como cosas distintas solo se ve mirándolos.

**Que las tres capas del día se distingan.** Mismo problema, y es más grave aquí: planificado y registrado comparten `borde/base` y se separan solo por la marca de procedencia. Si esa marca no se lee de un vistazo, R-18 no se cumple aunque el componente esté bien construido.

**Que el velo deje ver lo suficiente.** El script ya comprueba que esté a 0,16 y que haya una sección real debajo. Lo que no puede comprobar es que esa sección **sea la que corresponde**: que detrás del correo esté el bloque que lo dispara, y no un «Hoy» cualquiera. Eso se mira.

**Que las cifras de los informes sean coherentes entre cuadros.** Los tres informes llevan datos de ejemplo escritos a mano; que el día sume con la semana y la semana con el mes no está verificado.

---

## Pendiente

**Del diseño móvil**, en orden de prioridad:

1. **Añadir las pestañas a los 13 cuadros de `04 Flujos · Móvil`.** Es lo único que les falta para cumplir la arquitectura, y son los cuadros que el equipo ya presentó.
2. **Entrada avanzada**: `/foto`, `/horario` y `/lugar`. Las tres confirman en conjunto o al llegar y ninguna tiene forma resuelta. `/horario` además toca el modelo (recurrencia y vigencia).
3. **`/replanificar`**, que es `/plan` cuando algo se cae. Comparte casi todo con `Hoy / 01` y es barata.
4. **Vista semanal en la sección Agenda**, que hoy es una sola pantalla de días siguientes.
5. **Pantalla de la paleta de comandos**, especificada en `REPLANTEO.md` §6 y sin ni un cuadro.
6. **`/bloque`, `/objetivo`, `/esperando`, cronómetro en marcha.**
7. **`/revisar`** —el coach como sesión con cierre— y `/buscar`.
8. **Iconografía**: las marcas de las pestañas son geométricas y provisionales.
9. **Sin revisar en modo oscuro.**

**Del mantenimiento del archivo:**

10. Los cuadros de Hoy, Comunicar, Rutinas, Informes y Categorías, y el componente `Entrada de día`, están en Figma pero **todavía no volcados** a `figma/17-cuadros-movil-v2.js` y `figma/16-componentes-captura-movil.js`. Mientras no se vuelquen, la página no se puede reconstruir desde cero.
11. `figma/18-validar-movil-v2.js` está escrito contra 14 cuadros y hay que ampliarlo a los 8 grupos, **y añadirle dos comprobaciones que habrían cazado el defecto 4**: que todo nodo llamado `Velo` tenga opacidad 0,16, y que todo cuadro con `Capa de captura` tenga debajo un `Contenido` con más de un hijo.
12. Cuando esta capa se lleve a los flujos definitivos, los cuadros vuelven a la convención `CUN-XX / …` y esta página desaparece.

**Que no depende del diseño:** D-15 bloquea `/objetivo` y la funcionalidad 21. **D-16** —las categorías con el ámbito como propiedad suya— es la que decide si el corte laboral / personal de los informes es real o sigue siendo un dato de ejemplo, y arrastra una consecuencia de privacidad para Empresarial (R-22). Las dos esperan al equipo en `REPLANTEO.md` §9.

---

### Barrido de R-40 · la interfaz nunca se nombra a sí misma

Franco señaló un cuadro y avisó de que habría más. Los había: **ocho textos en seis cuadros** nombraban la disposición o citaban un código de regla dentro de la propia pantalla.

Lo que se corrigió: «el panel de la derecha», «el formulario de la derecha», «el registro de la derecha» y «el lienzo» salieron de los textos; «Esto no es "no hay datos"» dejó de citar el vocabulario del diseño; y «(RN-CAL-01)» y «(RN-OP-02)» desaparecieron de la interfaz, conservando la frase que sí le habla al usuario —«Coordinar no es vigilar» se queda, el código no—.

**`WEB-v2 / Armazón / 02 Lienzo expandido` se eliminó**: llevaba un párrafo entero explicando el diseño como si fuera contenido de pantalla. La disposición sigue existiendo y está escrita; lo que no cumplía era ese dibujo.

**Comprobación que hay que añadir al validador:** ningún texto de un cuadro puede contener un código entre paréntesis con la forma `(XX-…)`, ni las palabras `lienzo`, `panel de la derecha`, `registro de la derecha` o `no hay datos`. Es mecánica y habría encontrado los ocho.

---

### Orden del lienzo · revisión de secuencia

Franco: *viendo la lógica secuencial, me parece que se mezcló con la versión base pasada y falta ordenar.* Al listar las coordenadas apareció por qué.

**En el móvil había tres pares de cuadros literalmente encimados** —`Tareas / 01` bajo `Captura / 01`, y los dos de rutinas bajo los dos nuevos de captura—, invisibles mirando el lienzo porque uno tapa al otro. Además **ninguna fila tenía rótulo**, mientras la web sí los tenía, y las filas seguían siendo las de la iteración anterior: los grupos nuevos se habían ido metiendo donde cabían.

La página del móvil queda en **diez filas, una por grupo**, en orden de lectura: Acceso *(vacía, declarada)* · Agenda · Tareas · Actividad · Ajustes · Recorrido · Captura · Día · Estados · Excepciones.

En la web se corrigieron **dos rótulos que ya mentían** —la fila de Estados seguía diciendo «y el registro» cuando el registro se había ido a Actividad, y la de Armazón no avisaba de que el lienzo expandido se quedó sin cuadro— y el paso vertical, que tras separar una fila hacía que se pisara con la siguiente.

**Tres comprobaciones nuevas para el validador**, las tres por haberlas incumplido: ningún cuadro con las mismas coordenadas que otro; paso vertical mayor que el alto del cuadro; y todo cuadro dentro de una fila rotulada.

---

## Nota de versión · 22 de octubre de 2026

**La página vigente del móvil cambió de sitio.** Lo que era la copia de trabajo `07 Móvil v2 · Flujo revisado` pasa a ser la página buena y se queda con el nombre `07 Móvil v2 · Estructura y recorrido`.

| Página | Estado |
|---|---|
| `06 Arquitectura · Web v2` | **Vigente** · 30 cuadros |
| `07 Móvil v2 · Estructura y recorrido` | **Vigente** · 54 cuadros dentro del marco `MOV-v2 · Recorrido completo` |
| `04 Flujos · Móvil · versión anterior` | Anterior · 13 cuadros, jerarquía vieja |
| `05 Flujos · Web · versión anterior` | Anterior · 20 cuadros, jerarquía vieja |
| `07x Móvil v2 · versión anterior · no usar` | Anterior · 50 cuadros |

**Por qué la copia de trabajo era la buena.** Tenía los tres cuadros de Acceso construidos frente a recuadros en blanco, los cuatro huecos de la capa resueltos con nombre propio —`Foto · revisión`, `Tarea · confirmar`, `Hice · declarar actividad`, `Puerta a la llamada`—, los dos apartados de Ajustes que faltaban, `Actividad / 05 Revisar los jueves`, y nueve bandas de ruta que declaran el recorrido sobre el lienzo. **No quedaba ni un recuadro en blanco.**

Lo único que la página anterior tenía y la nueva no eran cuatro cuadros, y los cuatro están superados por su equivalente con mejor nombre.

Las páginas marcadas como anteriores **no se borraron**: quedan al final del archivo por si hay que volver a mirarlas.
