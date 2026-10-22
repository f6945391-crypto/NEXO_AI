# Diseño reproducible — scripts de Figma

Todo lo que hay en el archivo de Figma se construyó con estos scripts. No son documentación de lo que se hizo: **son la fuente.** Si el archivo se pierde o se corrompe, se regenera corriéndolos en orden.

Esa es la razón de tenerlos aquí, versionados junto a la especificación: el diseño deja de vivir solo en la nube y pasa a tener historial, igual que el código.

**Archivo de Figma:** https://www.figma.com/design/mgmuPhGwkmvfhz7xk0QPl5

---

## Cómo se ejecutan

Se pegan como parámetro `code` de la herramienta `use_figma` del MCP de Figma, desde Claude Code con el archivo abierto en la app de escritorio.

Los que construyen cuadros llevan la marca:

```
// >>> Pegar aquí el contenido de _helpers.js <<<
```

`use_figma` no admite `import`, así que el bloque de ayudantes va copiado al inicio de cada uno. Si cambias algo en `_helpers.js`, cámbialo en todos.

---

## Orden

| # | Script | Qué hace | Se puede repetir |
|---|---|---|---|
| 01 | `01-variables.js` | 39 variables en 4 colecciones, con scopes y code syntax WEB | Sí, borra y recrea |
| 02 | `02-cuadros-principal.js` | Cuadros 01 a 06 del flujo principal | Sí, vacía la página primero |
| 03 | `03-cuadros-alternos.js` | FA-01, FA-02, EX-01, EX-02 y transversales | No vacía: añade a lo de 02 |
| 04 | `04-limpieza.js` | Quita el relleno blanco por defecto de los contenedores | Sí |
| 05 | `05-componentes.js` | Los 4 componentes con variantes y propiedades | Sí, borra por nombre |
| 06 | `06-instanciar.js` | Sustituye las copias por instancias | No: una vez hecho, ya no hay copias |
| 07 | `07-validar.js` | Informe de cobertura y consistencia de móvil. No muta nada | Sí, cuantas veces quieras |
| 08 | `08-componentes-web.js` | Botón, Campo y Fila de colaborador de web | Sí, borra por nombre |
| 09 | `09-rejilla-disponibilidad.js` | La rejilla de CUN-05, con sus tres estados | Sí, borra por nombre |
| 10 | `10-cuadros-cun07-web.js` | Los 12 cuadros de CUN-07 Delegar tarea | Sí, borra los CUN-07 |
| 11 | `11-cuadros-cun05-web.js` | Los 8 cuadros de CUN-05 Consultar disponibilidad | Sí, borra los CUN-05 |
| 12 | `12-validar-web.js` | Informe de la página web v1. No muta nada | Sí |
| 13 | `13-componentes-web-v2.js` | Los 7 componentes de la jerarquía de tres columnas | Sí, borra por nombre |
| 14 | `14-cuadros-web-v2.js` | Los 9 cuadros de `06 Arquitectura · Web v2` | Sí, borra los WEB-v2 |
| 15 | `15-validar-web-v2.js` | Informe de la página v2. No muta nada | Sí |
| 16 | `16-componentes-captura-movil.js` | Pestañas, Chip, Fila de extracción, Tarjeta de captura y Aviso | Sí, borra por nombre |
| 17 | `17-cuadros-movil-v2.js` | Los 14 cuadros de `07 Móvil v2` | Sí, borra los MOV-v2 |
| 18 | `18-validar-movil-v2.js` | Informe de la página móvil v2. No muta nada | Sí |

Los scripts 06, 10 y 11 necesitan IDs que devuelven 05, 08 y 09. Están marcados como `PEGAR_ID_…` al inicio de cada archivo.

Los de web usan `_helpers-web.js`, no `_helpers.js`: la pantalla es de 1440×900, lleva navegación lateral y los contenedores nacen sin relleno.

Los de la v2 usan `_helpers-web-v2.js`: armazón de tres columnas (72 · 528 · 840), anchos vinculados a la colección `disposicion` y navegación de solo iconos. `_helpers-web.js` sigue siendo el de los 20 cuadros de CUN-07 y CUN-05, que todavía están en la jerarquía anterior.

**Regeneración completa desde cero**

- Móvil: 01 → 02 → 03 → 04 → 05 → 06 → 07
- Web v1: 01 → 08 → 09 → 10 → 11 → 12
- Web v2: 01 → 13 → 14 → 15
- Móvil v2: 01 → 16 → 17 → 18

La v2 no sustituye a la v1: es una sección nueva en su propia página. Los 20 cuadros de CUN-07 y CUN-05 se conservan hasta que se rehagan con la jerarquía nueva.

El 01 es común a las dos: las variables viven en el archivo, no en la página.

---

## Convenciones

**Nombres de cuadro**

```
CUN-XX / <Plataforma> / <Flujo> / <NN Estado>
```

Por ejemplo `CUN-01 / Móvil / EX-01 / 01 Información insuficiente`. El script 07 valida este formato con una expresión regular; un cuadro fuera de convención aparece en el informe.

**Nombres de componente**

Prefijo de plataforma obligatorio: `Móvil / Botón`, `Web / Botón`. Los componentes **no se comparten entre plataformas**: `Web / Botón` tiene menos relleno porque en escritorio no aplica el área táctil mínima de 44 px. Lo que comparten es el juego de variables.

**Colores**

Ninguno suelto. Todo relleno, borde y tamaño de texto va vinculado a una variable. El script 07 falla si aparece uno sin vincular.

---

## Historial de límites del plan

El trabajo empezó en plan Starter y topó cuatro muros. Se dejan documentados porque explican decisiones que de otro modo parecen arbitrarias, y porque si alguien regenera esto en una cuenta gratuita se los va a encontrar igual.

| Límite del Starter | Consecuencia | Estado |
|---|---|---|
| 3 páginas por archivo | Móvil y web tuvieron que compartir páginas | Resuelto: 6 páginas |
| 1 modo por colección | Sin tema oscuro | Resuelto: modo Oscuro cargado |
| Sin bibliotecas publicadas | No se puede extraer `Fundamentos` a archivo propio | **Pendiente**: sigue todo en un archivo |
| 3 páginas por archivo | — | Resuelto: 7 páginas, con `06 Arquitectura · Web v2` |
| Llamadas MCP limitadas | Se agotaban a media sesión | Resuelto |

Las llamadas MCP vienen con el puesto **Full**, no con Collab ni Dev: la tarifa lo dice en letra chica. El plan educativo da Professional con puesto Full gratis con correo institucional.

**Lo que queda por hacer con el plan ya activo:** extraer variables y componentes a un archivo `NexoAI · Fundamentos` y publicarlo como biblioteca. Mientras no se haga, el archivo único sigue siendo la frontera del sistema.

---

## Errores que ya costaron tiempo

Documentados para no repetirlos:

- **`FILL` solo funciona en hijos de contenedores auto-layout.** El marco de pantalla es un `FRAME` normal, así que sus hijos necesitan ancho y posición fijos. De ahí el ayudante `fija()`.
- **`figma.createAutoLayout()` deja relleno blanco por defecto.** En contenedores estructurales eso produce nodos con color sin variable. Por eso existe `04-limpieza.js`.
- **`figma.root.name` no se puede escribir.** El nombre del archivo se cambia a mano en Figma.
- **El contexto de página se reinicia en cada llamada.** Siempre `await figma.setCurrentPageAsync(pagina)` al inicio, y una sola vez por script.
- **Las claves de propiedad de componente llevan sufijo** (`Etiqueta#14:0`). Hay que leerlas en tiempo de ejecución, nunca escribirlas a mano.
- **`addComponentProperty` sobre una variante falla.** «Can only set component property definitions on a product component». La propiedad va en el CONJUNTO, y las referencias en los hijos de cada variante.
- **Declarar una propiedad de texto en un conjunto aplasta el texto propio de sus variantes.** El valor por defecto se aplica a todas. El contenido distinto va en cada instancia, nunca en el componente. Pasó con `Web / Campo` y volvió a pasar con `Web / Tarjeta` y `Web / Burbuja`.
- **Reutilizar el mismo objeto de pintura entre varios nodos pierde la opacidad.** `setBoundVariableForPaint` devuelve una pintura; si la asignas a varios nodos, unos conservan la opacidad y otros la pierden. Hay que crear una pintura **nueva por nodo**. Se vio con el velo de la capa de captura, que salió casi negro.
- **`appendChild` no devuelve el nodo.** Encadenar `padre.appendChild(T(...)).layoutSizingHorizontal` falla con «cannot set property of null». Guarda el nodo antes.
- **Cualquier contenedor que hace hug horizontal se sale de su columna** en cuanto el texto crece. Ancho fijo en el componente y el texto en `FILL` con `textAutoResize = "HEIGHT"`. Ha pasado ya con `Web / Campo`, `Web / Burbuja` y `Móvil / Chip`: es el error más repetido del proyecto.

---

## Trazabilidad

| Artefacto | Dónde |
|---|---|
| Requisitos EARS · CUN-01 móvil | `../../specs/02-agenda/spec.md` |
| Requisitos EARS · CUN-07 web | `../../specs/03-tareas/spec.md` |
| Requisitos EARS · CUN-05 web | `../../specs/05-equipos/spec.md` |
| Cuadros esperados · móvil | `../manifiesto-esperado.movil.json` |
| Cuadros esperados · web | `../manifiesto-esperado.web.json` |
| Tokens | `../tokens.json` |
| Validación · móvil | `../VALIDACION-CUN-01-movil.md` |
| Validación · web | `../VALIDACION-CUN-07-web.md` |
| Contexto para prompts | `../CONTEXTO.md` |
| Arquitectura visual web v2 | `../ARQUITECTURA-VISUAL-WEB.md` |
| Validación · web v2 | `../VALIDACION-WEB-v2.md` |
| Validación · móvil v2 | `../VALIDACION-MOVIL-v2.md` |
| Arquitectura visual móvil | `../ARQUITECTURA-VISUAL-MOVIL.md` |
| Requisitos · captura | `../../specs/01-captura/spec.md` |
| Requisitos · jornada | `../../specs/02-jornada/spec.md` |
| Requisitos · comunicaciones | `../../specs/04-comunicaciones/spec.md` |
| Replanteo de producto | `../../REPLANTEO.md` |

**RN-CAL-01 quedó aprobada el 26 de septiembre de 2026.** El criterio final está en `specs/05-equipos/spec.md` sección 1. Falta incorporar la segunda oración al texto de la regla en el Entregable 1.

**Deriva conocida:** `11-cuadros-cun05-web.js` generó los ocho cuadros con la versión anterior del criterio. No representan la consulta sin duración indicada ni el estado «hay horarios comunes pero ninguno admite la duración». Hasta regenerarlos, el diseño va por detrás de la especificación en esos dos puntos.

---

## El fallo del velo, resuelto después de cinco veces

`setBoundVariableForPaint` **pierde el campo `opacity` si el nodo todavía no tiene padre.** Probado en el archivo:

```js
const pintura = () => figma.variables.setBoundVariableForPaint(
  {type:"SOLID", color:{r:0,g:0,b:0}, opacity:0.16}, "color", V["superficie/velo"]);

const r = figma.createRectangle();
r.fills = [pintura()];          // opacidad resultante: 1
page.appendChild(r);
r.fills = [pintura()];          // opacidad resultante: 0.16
```

Por eso el mismo código funcionaba unas veces y otras no: dependía de si yo asignaba el relleno antes o después del `appendChild`. La regla:

> **Mete el nodo en su padre primero, y píntalo después.**

Cinco veces entró este defecto. Las cuatro primeras estaban anotadas aquí y volvió a pasar igual, porque una nota no comprueba nada. La quinta la cazó `18-validar-movil-v2.js` antes de que la viera nadie, y fue esa ejecución la que permitió aislar la causa.

