# Prueba del boceto contra las directrices de interfaz de Vercel

**Proyecto:** NexoAI · Diseño de Software · Entregable 2
**Referencia usada:** `vercel-labs/agent-skills`, skill `web-design-guidelines`, que a su vez lee `vercel-labs/web-interface-guidelines`
**Fecha:** 22 de octubre de 2026
**Alcance:** las dos páginas vigentes — `06 Arquitectura · Web v2` (30 cuadros) y `07 Móvil v2 · Estructura y recorrido` (54 cuadros)

---

## 0. Qué se puede probar y qué no

Esas directrices están escritas para revisar **código**. Buena parte no aplica a un boceto: hidratación, `loading="lazy"`, virtualizar listas, `Intl.DateTimeFormat`, preconexiones. Lo que sí se puede comprobar en Figma es la parte de **interfaz**: puntuación, estados de los componentes, área táctil, estados vacíos, etiquetas de botón y modo oscuro.

Se pasaron siete comprobaciones. **Cuatro limpias, tres con hallazgos**, y uno de los tres es serio.

---

## 1. Lo que pasó limpio

| Regla | Resultado |
|---|---|
| «Usa el carácter … y no tres puntos» | **0 casos** en 2.133 textos |
| «Comillas tipográficas, no rectas» | **0 casos** |
| «Las acciones destructivas necesitan confirmación o deshacer» | Cumplido: `Captura / 03 Confirmar envío`, `Diálogos / 01 Advertencia de descarte`, y el aviso «esto no se puede deshacer» |
| «Los mensajes de error dicen el siguiente paso, no solo el problema» | Cumplido: «Fallé el procesamiento. El audio sigue guardado hasta que lo resuelvas» |
| Cobertura de modo oscuro en las variables | **20 de 20** con valor en los dos modos |

---

## 2. El hallazgo serio · el velo rompe en modo oscuro

Esto no lo habíamos mirado nunca, y es el tipo de cosa que solo aparece al probarla.

**Una sección normal en oscuro se ve bien.** `Agenda / 01 Hoy` en modo Oscuro es legible, las tres capas del día se distinguen, y el apunte sigue leyéndose como apunte por su tono hundido. El trabajo de variables está bien hecho.

**Pero cualquier cuadro con capa de captura se queda sin fondo.** En `Captura / 01 Qué abre el asa`, el antecedente desaparece por completo: negro liso. No se ve ni la cabecera ni los bloques del día.

### Por qué

| Variable | Claro | Oscuro |
|---|---|---|
| `superficie/base` | `#ffffff` | `#0f1419` |
| `superficie/velo` | `#0f1729` | `#03050a` |

El velo se pinta al **16 % de opacidad**, y esa opacidad vive **en la pintura, no en la variable**. En claro, un casi negro al 16 % sobre blanco da un gris suave: perfecto. En oscuro, un `#03050a` al 16 % sobre un `#0f1419` **oscurece lo ya oscuro** y aplasta todo el contraste del fondo.

### Por qué importa más de lo que parece

Rompe la regla que sostiene toda la capa de captura: **lo que se ve bajo el velo es el antecedente, y es lo que hace que una capa se lea como capa y no como otra pantalla.** En oscuro, los **36 nodos de velo** del archivo dejan de cumplirla. Es exactamente el defecto que corregimos en claro en septiembre, reaparecido por el otro modo.

### Cómo se arregla

El oscuro no se separa oscureciendo: **se separa aclarando la capa**. En oscuro la hoja ya es más clara que el fondo (`superficie/base` sobre un fondo más oscuro), así que el velo casi sobra.

Dos caminos:

1. **Llevar el alfa a la variable.** `superficie/velo` pasa a tener alfa propia por modo —claro al 16 %, oscuro al 5 %— y la pintura queda a opacidad 1. Es lo correcto a largo plazo, pero toca los 36 nodos.
2. **Un segundo token.** `superficie/velo-claro` y `superficie/velo-oscuro`, y que el modo elija. Más simple, menos elegante.

Recomiendo el primero: deja el velo parametrizado de verdad, que es lo que hoy no está.

---

## 3. Los componentes no tienen ningún estado de interacción

La directriz pide foco visible, estado al pasar por encima, y distingue el deshabilitado. **Nueve conjuntos de componentes, ninguno con foco, hover ni deshabilitado:**

| Componente | Variantes que tiene | Lo que falta |
|---|---|---|
| `Móvil / Botón` · `Web / Botón` | Primario · Secundario · Texto · Destructivo | foco, hover, **deshabilitado** |
| `Web / Campo` | Reposo · Activo · Error · Vacío | foco, deshabilitado |
| `Web / Ítem de navegación` | Reposo · Activo | foco, hover |
| `Móvil / Chip` | Reposo · Activo · Bloqueado | foco |
| `Móvil / Tarjeta de captura` · `Web / Tarjeta` · `Fila de registro` · `Fila de extracción` | variantes de contenido | foco si son tocables |

Lo que hay son **variantes de contenido y de estado del dato** —aceptada, dudosa, bloqueada— pero ninguna de **estado de interacción**. En un boceto se nota poco; en cuanto alguien lo implemente, cada estado se inventará por su cuenta.

El más urgente es **deshabilitado en el botón**, porque ya hay pantallas que lo necesitan: «Guardar la zona horaria» antes de cambiar nada, «Enviar a Franco» con el formulario vacío.

---

## 4. Área táctil · 97 elementos por debajo de 44

`CONTEXTO.md` ya fija el mínimo de 44×44 y no se cumple en 97 sitios:

| Elemento | Casos | Medida |
|---|---|---|
| Segmentos del selector de período | 78 | 115×**33** |
| Botones de cerrar `×` | 8 | menos de 44 de alto |
| Filas de volver `‹` | 5 | menos de 44 |
| Chips de comando | 4 | menos de 44 |

**El selector es el 80 % del problema y se arregla una sola vez**, porque es el mismo patrón repetido 26 veces. Subirlo de 33 a 44 de alto cumple la regla y de paso lo hace más fácil de acertar con el pulgar.

Para `×` y `‹` no hace falta agrandar el dibujo: basta con que el área tocable sea mayor que el glifo, que es lo que pide la directriz —«sin zonas muertas»— y no que el icono mida 44.

---

## 5. No hay un solo estado vacío en móvil

La web tiene cuatro blancos de la conversación. **El móvil no tiene ninguno** para sus tres secciones:

| Sección | Qué falta |
|---|---|
| Agenda | Un día sin nada. Hoy todos los cuadros tienen entre tres y cinco bloques |
| Tareas | Lista sin tareas. Es además el estado del primer día de uso |
| Actividad | Período sin registro. Y es el más probable: el informe no puede medir lo que todavía no existe |

La directriz lo dice en dos reglas: «maneja cadenas y listas vacías sin romper la interfaz» y «planifica contenido corto, medio y muy largo». De lo segundo sí tenemos un caso —`Día / 04 Apunte largo`—; de lo primero, ninguno.

---

## 6. Una etiqueta genérica

«Guardar», a secas, en `Ajustes / 04 Ajustar una categoría`. La directriz pide etiquetas específicas —el ejemplo que dan es «Save API Key» en vez de «Continue»—. En el resto del archivo ya se cumple: «Guardar la zona horaria», «Usar estas cinco», «Enviarme el enlace», «Aceptar los tres cambios».

Caso aparte: **«Continuar» en `Acceso / Primer ingreso`**. Es el ejemplo literal de etiqueta mala de la directriz. Diría «Guardar y entrar».

---

## 7. Qué haría, en orden

1. **El velo en modo oscuro.** Es el único hallazgo que rompe una regla propia, y afecta a 36 nodos.
2. **Deshabilitado en el botón**, en las dos plataformas. Hay pantallas que ya lo piden.
3. **El selector de período a 44 de alto.** Un cambio, 78 casos resueltos — y conviene hacerlo a la vez que convertirlo en componente, que ya estaba propuesto.
4. **Tres estados vacíos en móvil**, uno por sección.
5. Foco y hover en botón, campo e ítem de navegación.
6. Las dos etiquetas: «Guardar» y «Continuar».

---

## 8. Qué NO tomo de esa referencia

Son directrices de Vercel para producto web, y algunas chocan con decisiones nuestras ya tomadas:

- **«Title Case para encabezados y botones»** es una convención del inglés. En español va mayúscula inicial y punto, y así se queda.
- **«Refleja el estado en parámetros de consulta»** y **«enlaces profundos»** aplican a la web, no al móvil, y no cambian el boceto.
- **«Usa & en vez de and donde falte espacio»** no aplica.

La referencia sirve como lista de comprobación, no como norma: donde choca con `CONTEXTO.md` o con una regla del `REPLANTEO`, manda la nuestra.
