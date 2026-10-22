# Informe de estructura del diseño — móvil y web

**Proyecto:** NexoAI · Diseño de Software · Entregable 2
**Archivo:** `mgmuPhGwkmvfhz7xk0QPl5` — https://www.figma.com/design/mgmuPhGwkmvfhz7xk0QPl5
**Fecha:** 17 de octubre de 2026
**Alcance:** únicamente la estructura de las dos plataformas. No cubre el modelo de negocio, los CUN ni las especificaciones EARS, que viven en `REPLANTEO.md` y en `specs/`.

---

## 1. Qué contiene el archivo

| Página | Cuadros | Estado |
|---|---|---|
| `00 Portada` | 0 | Vacía |
| `01 Fundamentos` | 0 | Solo componentes y variables |
| `02 Componentes · Móvil` | 0 | 12 componentes |
| `03 Componentes · Web` | 0 | 12 componentes |
| `04 Flujos · Móvil` | 13 | **Jerarquía anterior.** Cuatro pestañas viejas y barra de entrada |
| `05 Flujos · Web` | 20 | **Jerarquía anterior.** Navegación de 240 con texto, columna única de 1200 |
| **`06 Arquitectura · Web v2`** | **20** | **Vigente** |
| **`07 Móvil v2 · Estructura y recorrido`** | **35** | **Vigente** |

Las dos páginas vigentes suman **55 cuadros**. Los **33 de las páginas de flujos anteriores** siguen publicados con la jerarquía vieja y son, hoy, el mayor riesgo de coherencia del entregable: el archivo cuenta dos productos distintos según la página que se abra.

### Fundamentos compartidos

**43 variables** en cinco colecciones:

| Colección | Modos | Variables | Para qué |
|---|---|---|---|
| `color` | 2 (claro / oscuro) | 20 | Superficies, texto, borde, marca, agente, estado |
| `espaciado` | 1 | 10 | Escala de separaciones |
| `radio` | 1 | 4 | Redondeos |
| `tipografia` | 1 | 6 | Tamaños |
| `disposicion` | 2 (Normal / Lienzo expandido) | 3 | Anchos de las columnas de la web |

**24 componentes**, doce por plataforma:

| Móvil | Web |
|---|---|
| Asa de captura · Acceso a ajustes · Pestañas (3 variantes) | Ítem de navegación · Icono (6 variantes) · Panel de lienzo |
| Botón · Chip · Tarjeta de evento · Entrada de día (3) | Botón · Campo · Tarjeta (5) · Fila de colaborador |
| Tarjeta de captura (6) · Fila de extracción (3) · Aviso (3) | Rejilla de disponibilidad (3) · Fila de registro (3) · Advertencia de descarte |
| Burbuja · Barra de entrada *(retirada del v2)* | Burbuja · Barra de entrada |

---

## 2. Plataforma móvil — `07 Móvil v2`

### 2.1 Modelo de navegación

El móvil tiene **tres secciones y una capa**, más una puerta a configuración. Esa distinción es la que sostiene todo lo demás.

```
┌────────────────────────┐
│  Hoy              (⚙)  │  ← cabecera, sin caja · acceso a Ajustes
│  Jueves 25 · GMT-5     │
│  [ Hoy ][Semana][ Mes ]│  ← selector de nivel
│                        │
│  [ contenido ]         │  ← la SECCIÓN, a pantalla completa
│                        │
│                  ( + ) │  ← asa: sube la capa de captura
├────────────────────────┤
│  Agenda  Tareas  Activ.│  ← tres pestañas
└────────────────────────┘
```

| Sección | Qué es | Niveles |
|---|---|---|
| **Agenda** | Lo que va a pasar | Hoy · Semana · Mes |
| **Tareas** | Lo que hay que hacer | Sin niveles de período: franjas (con fecha, sin fecha, esperando, encargadas) |
| **Actividad** | Lo que pasó | Día · Semana · Mes, y el registro del asistente como segundo nivel |

**Lo que no es una sección:**

- **La capa de captura.** Sube sobre la sección y nunca navega; al confirmar vuelves donde estabas. Es la cuarta cosa que hace la aplicación, pero no un cuarto sitio, y de ahí salen tres pestañas y no cuatro.
- **Ajustes.** Se entra desde la cabecera, no desde las pestañas. Añadir una cuarta pestaña habría deshecho la fusión a tres.

### 2.2 Las diez filas de la página

Cada fila es un grupo, con su rótulo escrito en el lienzo. Una fila puede estar vacía a propósito: así se declara un hueco conocido en vez de esconderlo.

| # | Fila | Cuadros | Qué cuenta |
|---|---|---|---|
| 0 | **Acceso** | **0** | Vacía y declarada: el móvil no tiene el flujo de entrada, la web sí |
| 1 | Agenda | 3 | Los tres niveles de la sección |
| 2 | Tareas | 2 | La lista y el hilo de una tarea |
| 3 | Actividad | 4 | Tres niveles y el registro del asistente |
| 4 | Ajustes | 5 | Portada y tres apartados |
| 5 | Recorrido | 5 | Una captura por voz de principio a fin |
| 6 | Captura | 7 | La capa y todo lo que sale de ella |
| 7 | Día | 4 | Los estados del nivel día |
| 8 | Estados | 3 | En espera, fallo y fuera del plan |
| 9 | Excepciones | 2 | Lo que corta al usuario |

### 2.3 Inventario, cuadro por cuadro

Las **piezas** de cada pantalla son: `selector` de nivel, `asa` de captura, `capa+velo` cuando la capa está abierta, `volver` en las bajadas y `ajustes` en la cabecera de las secciones.

**Fila 1 · Agenda**

| Cuadro | Pestaña | Piezas | Título |
|---|---|---|---|
| `01 Hoy` | Agenda | selector · asa · ajustes | Hoy |
| `02 Semana` | Agenda | selector · asa · ajustes | Tu semana |
| `03 Mes` | Agenda | selector · asa · ajustes | Septiembre |

**Fila 2 · Tareas**

| Cuadro | Pestaña | Piezas | Título |
|---|---|---|---|
| `01 Lista` | Tareas | asa · ajustes | Tareas |
| `02 Hilo de una tarea` | Tareas | asa · volver | Presupuesto del taller |

**Fila 3 · Actividad**

| Cuadro | Pestaña | Piezas | Título |
|---|---|---|---|
| `01 Día` | Actividad | selector · asa · ajustes | Tu jueves |
| `02 Semana` | Actividad | selector · asa · ajustes | Tu semana |
| `03 Mes` | Actividad | selector · asa · ajustes | Septiembre |
| `04 Registro del asistente` | Actividad | asa · volver | Qué pasó con tu semana |

**Fila 4 · Ajustes** — todos marcan Actividad en las pestañas, porque Ajustes no es un destino

| Cuadro | Piezas | Título |
|---|---|---|
| `01 Portada` | asa · volver | Ajustes |
| `02 Categorías propuestas` | asa · volver | Tus categorías |
| `03 Ajustar una categoría` | capa+velo | Tus categorías |
| `04 Conexiones` | asa · volver | Conexiones |
| `05 Plan` | asa · volver | Tu plan |

**Fila 5 · Recorrido** — `01` y `05` con asa; `02`, `03` y `04` con la capa abierta sobre el mismo fondo

**Fila 6 · Captura** — los siete llevan capa abierta. `01` a `03`, `06` y `07` sobre fondo de Agenda; `04` y `05` sobre fondo de **Tareas**, porque el contexto de la llamada sale de la franja *esperando de alguien*

**Fila 7 · Día** — `01` y `02` con asa, `03` con capa, `04` es una bajada con volver

**Filas 8 y 9 · Estados y Excepciones** — todos sobre fondo de Agenda; solo `Excepciones / 02` va sin capa

### 2.4 Reglas que gobiernan esta estructura

| Regla | Qué dice |
|---|---|
| **R-36** | La captura es una capa, no una sección |
| **R-23** | Agenda es lo que va a pasar, Actividad lo que pasó; el día es la costura |
| **R-38** | Tareas no tiene niveles de período: una tarea sin fecha no cae en ningún período |
| **R-24 / R-39** | El hilo vive dentro de la tarea y mantiene al agente con poco contexto y un propósito claro |
| **R-34** | En Ajustes va lo que se configura una vez; su puerta está en la cabecera |
| **R-35** | Ningún grupo de la página puede llamarse como una sección que no existe |
| **R-40** | La interfaz nunca se nombra a sí misma |
| **Fondo de la capa** | Lo que se ve bajo el velo es el antecedente real, no relleno, y el velo va a opacidad 0,16 |

---

## 3. Plataforma web — `06 Arquitectura · Web v2`

### 3.1 Modelo de tres columnas

```
┌────┬──────────────────┬────────────────────────────┐
│ 72 │        528       │            840             │
│nav │   conversación   │          lienzo            │
│    │  área de trabajo │   contexto y memoria       │
│    │     efímera      │       persistente          │
│(⚙) │  [barra entrada] │                            │
└────┴──────────────────┴────────────────────────────┘
```

72 + 528 + 840 = 1440. La navegación lleva **las mismas tres secciones que el móvil** —Agenda, Tareas, Actividad— y **Ajustes al pie**, separado por una línea.

Lo que en su día fueron destinos propios y hoy no lo son:

| Antes | Ahora |
|---|---|
| Reuniones, Equipo | Dentro de **Agenda** |
| Encargos | Franja dentro de **Tareas** |
| Resúmenes | Dentro de **Actividad** |
| Equipo y permisos | **Ajustes** |

### 3.2 Tres naturalezas, tres prefijos

| Prefijo | Qué es | Medida | Navegación |
|---|---|---|---|
| `WEB-v2 /` | Pantalla de la aplicación | 1440x900 | Sí, salvo Acceso |
| `PÚBLICO /` | Página que abre alguien **sin cuenta** | 1440x900 | **No, y es correcto** |
| `CORREO /` | Un correo | 680 de ancho | No |

Sale de que el colaborador no es usuario: sus dos pantallas no pueden llevar la navegación de una aplicación en la que no ha entrado.

### 3.3 Las seis filas

| # | Fila | Cuadros | Contenido |
|---|---|---|---|
| 1 | **Acceso** | 3 | Entrada · Primer ingreso · Conectar Google |
| 2 | **Armazón** | 1 | Normal. *Pendiente: el lienzo expandido se quedó sin cuadro* |
| 3 | **Secciones** | 4 | Actividad: Día · Semana · Mes · Registro. *Pendiente: Agenda y Tareas sin portada* |
| 4 | **Recorrido del encargo** | 7 | De izquierda a derecha, de principio a fin |
| 5 | **Estados** | 4 | Los cuatro blancos de la conversación |
| 6 | **Excepciones** | 1 | Advertencia de descarte |

### 3.4 El recorrido del encargo, en orden

| # | Cuadro | Naturaleza | Qué pasa |
|---|---|---|---|
| 1 | `Ajustes / 01 Equipo y permisos` | App | Quién ha aceptado y quién no. Sin aceptar no se le escribe |
| 2 | `CORREO / 01 Invitación a colaborar` | Correo | Sale a nombre del gerente, desde su Gmail |
| 3 | `PÚBLICO / 01 Aceptación del colaborador` | Página pública | Acepta sin crear cuenta. Puede dar solo los correos |
| 4 | `Tareas / 01 Encargar con preguntas` | App | El encargo declara sus preguntas; el criterio de terminado es una de ellas |
| 5 | `CORREO / 02 Pedido de encargo` | Correo | Preguntas cerradas como botones; el texto libre al formulario |
| 6 | `PÚBLICO / 02 Formulario de respuesta` | Página pública | Contador de 400 caracteres a la vista |
| 7 | `Tareas / 02 Llega como propuesta` | App | Llega como propuesta, nunca como estado. Incluye el caso sin estructura |

### 3.5 Reglas propias de la web

| Regla | Qué dice |
|---|---|
| **R-32** | Web y móvil tienen las mismas tres secciones |
| **R-33** | La configuración no ocupa sitio en la barra de trabajo |
| **R-41** | Una sección se ve igual en las dos plataformas: cambia la disposición, no el contenido |
| **R-42** | No hay camino manual en paralelo al asistente |
| **R-37** | El hilo es de la negociación; el resultado vive en su sección |
| **Sección activa** | El marco dice la verdad sobre el contenido |

---

## 4. Paridad entre las dos plataformas

| | Móvil | Web |
|---|---|---|
| Secciones | Agenda · Tareas · Actividad | Las mismas |
| Puerta a Ajustes | Cabecera | Pie de la navegación |
| Entrada de captura | Asa flotante de 56 | Barra de entrada en la columna de conversación |
| Niveles de período dibujados | 6 (Agenda 3 + Actividad 3) | 3 (solo Actividad) |
| Portadas de sección | 3 de 3 | **1 de 3** |
| Flujo de acceso | **0** | 3 |
| Recorrido completo | Captura por voz (5) | El encargo (7) |
| Estados | 3 | 4 |
| Excepciones | 2 | 1 |
| Hilo | `Tareas / 02` | `Tareas / 02 Llega como propuesta` |

**Siguen siendo espejos invertidos en un punto:** el móvil tiene portadas y niveles pero no acceso; la web tiene acceso pero le faltan dos portadas y los niveles de Agenda.

---

## 5. Huecos detectados

### 5.1 Dos cuadros que ya no están en el archivo

`MOV-v2 / Agenda / 04 Mis rutinas` y `MOV-v2 / Agenda / 05 Rutina recolocada` **no existen en ninguna página**. La fila de Agenda tiene hoy tres cuadros, no cinco.

Con eso, **las rutinas se quedan sin ninguna pantalla**, pese a ser la funcionalidad número 7 de las 23 del Plan Personal y pese a que su seguimiento sí aparece en `Actividad / 02 Semana` —«Leer 30 minutos 5 de 5», «Gimnasio 1 de 3»—. El informe mide algo que no tiene dónde definirse.

### 5.2 Estructura

| Hueco | Plataforma |
|---|---|
| Flujo de acceso | Móvil |
| Portada de Agenda y de Tareas | Web |
| Niveles de período de Agenda | Web |
| Disposición de lienzo expandido | Web |
| Rutinas: definirlas y recolocarlas | Móvil |

### 5.3 Deuda de componentes

- **`Web / Icono` sigue con seis variantes** —Agenda, Tareas, Equipo, Reuniones, Resúmenes, Actividad— cuando la navegación usa tres. Sobran tres y falta la de Ajustes, que hoy toma prestada la de Tareas.
- **`Móvil / Barra de entrada` está retirada del v2** pero sigue viva porque la usan los 13 cuadros de `04 Flujos · Móvil`.
- **Iconografía provisional** en las dos plataformas: marcadores geométricos.

### 5.4 Deuda de proceso

| Qué | Dónde |
|---|---|
| Los 55 cuadros vigentes **no están volcados a scripts**: la página no se reconstruye desde cero | `design/figma/` |
| El validador web no cubre Acceso, PÚBLICO ni CORREO | `15-validar-web-v2.js` |
| Comprobaciones pendientes: cuadros encimados, paso vertical, fila rotulada, R-40, barra de entrada presente | Ambos validadores |
| Sin revisar en modo oscuro | Ambas plataformas |
| `Fundamentos` sin publicar como biblioteca | Archivo |

---

## 6. Lo que esta estructura resuelve

Tres cosas que no estaban resueltas cuando empezó el entregable y hoy sí lo están:

1. **La navegación no promete nada que no exista.** Llegó a haber siete destinos en web y once grupos para tres secciones en móvil. Hoy son tres secciones en las dos plataformas, y cada grupo de la página de diseño es o una sección, o un nivel, o un estado.
2. **La captura tiene una forma propia y no compite con las secciones.** Es una capa con su antecedente visible detrás, y eso es lo que permite que haya tres pestañas en vez de cuatro.
3. **Los huecos se ven en el lienzo.** Una fila vacía con su rótulo —el acceso en móvil, las portadas en web— vale más que un apartado de pendientes que nadie abre.

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
