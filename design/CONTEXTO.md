# Contexto de diseño — NexoAI

Este bloque se pega ANTES de cualquier prompt de generación (P1, P3, P4). No se ejecuta solo.

---

## Producto

NexoAI es un asistente personal basado en inteligencia artificial para la organización del tiempo, la gestión de tareas y la coordinación de equipos.

Dos clientes, con audiencias distintas:

- **Móvil:** el Usuario Personal. Tres secciones —Agenda, Tareas, Actividad— cada una con sus niveles, y la captura como capa encima, nunca como pantalla aparte. En movimiento.
- **Web:** el Gerente / Responsable de Equipo. Disponibilidad, coordinación de reuniones, delegación y seguimiento. En escritorio.

## Marca

Marca ficticia propia. **No uses el nombre, logotipo, tipografía ni colores de ninguna institución, universidad o empresa real.**

## Tokens

<!-- Pegar aquí el contenido de design/tokens.json una vez generado con el prompt B -->

Usa exclusivamente estos tokens. No inventes colores, tamaños de texto, espaciados ni radios fuera de la escala. **Si falta un token para algo, dilo en lugar de inventarlo.**

## Plataforma

Genera para UNA sola plataforma por sesión. Nunca las dos juntas.

| Plataforma | Medidas del cuadro | Notas |
|---|---|---|
| Móvil | 390 x 844 | Área táctil mínima 44x44. **Fondo blanco, margen 20, cabecera sin caja, tres pestañas siempre visibles, asa de captura flotante abajo a la derecha.** Detalle en `design/ARQUITECTURA-VISUAL-MOVIL.md`, de lectura obligatoria |
| Web | 1440 x 900 | **Tres columnas: navegación 72 · conversación 528 · lienzo 840.** Densidad de información mayor |

### Jerarquía de la web

La navegación web tiene **siete secciones**: Agenda, Tareas, **Encargos**, Equipo, Reuniones, Resúmenes y Actividad. Encargos es lo que pediste y lo que volvió; Tareas es lo que tienes que hacer tú.

Antes de la aplicación va el **acceso**, que es universal a los dos planes: `WEB-v2 / Acceso / 01–03`.

La web NO es el móvil ensanchado. Tres columnas con papeles distintos:

- **Navegación, 72 px.** Solo iconos, sin texto.
- **Conversación, 528 px.** Las tarjetas SON la interfaz: propuesta, confirmación, resultado. Es un área de trabajo **desechable**: se vacía cuando el usuario cierra una operación. *Revisión del 5 de noviembre de 2026, propuesta: ya no se vacía; muestra la transcripción con separadores entre episodios (`ARQUITECTURA-VISUAL-WEB.md` §5).*
- **Lienzo, 840 px.** El contexto vivo: el objeto que la conversación está manipulando, y el registro de lo ya cerrado. Es la **memoria**.

**Un solo sujeto a la vez.** El lienzo muestra el sujeto de la operación en curso o de la última cerrada. Nunca algo que la conversación no esté tratando: eso es lo que hace imposible que las dos columnas se contradigan.

Dos estados de disposición, no tres: **Normal** (72/528/840) y **Lienzo expandido** (72/0/1368). No existe el inverso; esconder el lienzo es esconder el resultado.

El detalle completo está en `design/ARQUITECTURA-VISUAL-WEB.md`, que es de lectura obligatoria antes de generar cualquier cuadro web.

## Reglas de producto que afectan la interfaz

Vienen del modelado del negocio y no son negociables:

- **RN-ER-03.** Toda acción con efecto externo requiere confirmación previa explícita. La confirmación muestra la acción exacta, sus datos concretos y qué parte es irreversible. Un "¿estás seguro?" genérico no cumple.
- **RN-OP-01 y RN-OP-04.** No se muestra información ni controles para los que el usuario no tiene permiso. Cuando falte un permiso, se indica cuál y cómo concederlo.
- **Sin camino manual paralelo (R-42).** El asistente es quien hace el trabajo. No se dibuja ningún formulario que haga a mano lo mismo que hace el asistente.
- **Modo degradado.** Si el asistente no responde, lo pedido queda en cola, visible como en espera, y lo existente se sigue consultando. Nada se crea ni se envía hasta que vuelva y la persona confirme.
- **Zona horaria.** Toda hora mostrada debe permitir saber en qué huso está.

## Estados que no se pueden omitir

Cuando el cuadro lo admita, contempla: carga, vacío, error, sin permiso, y propuesta pendiente de confirmación.

### Los cuatro blancos de la conversación (solo web)

La columna de conversación puede estar en blanco por cuatro razones que dicen cosas OPUESTAS al usuario. **Nunca se pueden parecer entre sí.** Si dos de estas se ven igual, el producto miente:

| Estado | Significa | Lo que el usuario debe sentir |
|---|---|---|
| Vacía tras cerrar | Terminó bien, el resultado está en el lienzo | Logro |
| Inicial, nunca usada | No sabe qué pedir | Invitación, con ejemplos concretos |
| Asistente no disponible | El producto está caído | Disculpa, lo pedido en cola y lo que se puede seguir consultando |
| Función fuera del plan | No la tiene contratada | Oferta |

Es el mismo error que confundir «sin coincidencia» con «todavía no he calculado», pero en el estado más frecuente de la pantalla principal.

## Contenido

- Textos en español.
- **Datos realistas, no decorativos.** Nombres largos ("María Fernanda Quispe Huamán"), textos que desbordan, listas llenas y listas vacías.
- Prohibido "Juan Pérez", "Lorem ipsum" y cualquier relleno que oculte problemas de diseño.
- El microcopy de errores y confirmaciones es producto: escríbelo en lenguaje del usuario, no del sistema.

## Convención de nombres de cuadro

```
CUN-XX / <Plataforma> / <Flujo> / <NN Estado>
```

Ejemplos:

```
CUN-01 / Móvil / Principal / 03 Conflicto detectado
CUN-01 / Móvil / EX-01 / 01 Información insuficiente
CUN-01 / Móvil / Transversal / Modo degradado
```

El nombre va exacto: con las barras, con el número de dos dígitos y sin abreviar.

**Excepción: las páginas de arquitectura y de boceto.** Lo que no pertenece a un caso de uso concreto lleva su propia rama, declarada en su documento:

| Rama | Dónde se declara |
|---|---|
| `WEB-v2 / <Grupo> / <NN Nombre>` | `design/ARQUITECTURA-VISUAL-WEB.md` §11 |
| `MOV-v2 / <Grupo> / <NN Nombre>` | `design/ARQUITECTURA-VISUAL-MOVIL.md` §5 |
### El orden de las páginas de diseño

Las dos páginas se leen **de arriba abajo, una fila por grupo, y cada fila con su rótulo en el lienzo**. Una fila puede estar vacía a propósito: es como se declara un hueco conocido en vez de esconderlo en un documento.

| Página | Filas |
|---|---|
| `06 Arquitectura · Web v2` | Acceso · Armazón · Secciones · Recorrido del encargo · Estados · Excepciones |
| `07 Móvil v2` | Acceso *(vacía)* · Agenda · Tareas · Actividad · Ajustes · Recorrido · Captura · Día · Estados · Excepciones |

Tres reglas de higiene del lienzo, las tres por haberlas incumplido:

1. **Ningún cuadro encima de otro.** Llegó a haber tres pares superpuestos en el móvil, invisibles hasta que se listan las coordenadas.
2. **Paso vertical regular**, mayor que el alto del cuadro. Mover una fila sin mover las de abajo hace que se pisen.
3. **Todo cuadro pertenece a una fila rotulada.** Si no cabe en ninguna, el grupo está mal pensado.

| `WEB-v2 / Correo / <NN Nombre>` | **Excepción de medida**: no es una pantalla de la aplicación sino un correo. 680 de ancho y alto al contenido. El validador web lo salta |

Cuando esas capas se lleven a los flujos definitivos, sus cuadros vuelven a la convención `CUN-XX / …` de siempre.

## Prohibido

- Inventar requisitos que no estén en la especificación entregada.
- Omitir estados de error para que el resultado se vea mejor.
- Usar imágenes de archivo, ilustraciones genéricas o iconos de familias distintas.
- Mezclar patrones de escritorio en móvil o al revés.

## Al terminar cada generación

Entrega siempre, además del diseño:

1. La lista de cuadros que generaste.
2. Los que no generaste y por qué.
3. **Las decisiones que tuviste que tomar porque la especificación no las cubría.**

El punto 3 es obligatorio. Cada una de esas decisiones es un hueco de la especificación y vuelve a ella.

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
