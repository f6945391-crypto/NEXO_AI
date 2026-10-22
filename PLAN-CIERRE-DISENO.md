# Plan de cierre del diseño — para discutir

**Fecha:** 26 de septiembre de 2026
**Base:** auditoría de los 32 cuadros de `07 Móvil v2` y los 19 de `06 Arquitectura · Web v2`.

El diseño ha avanzado mucho, pero **avanzó por tandas** y cada tanda trajo su propia forma de construir. Este documento no propone funciones nuevas: propone **cerrar lo que está abierto** y dejar las dos plataformas contando lo mismo.

---

## A. Lo que la auditoría del móvil encontró

### A.1 Conviven dos armazones distintos

| Armazón | Cuadros | Cómo está hecho |
|---|---|---|
| `Encabezado` + `Contenido` sueltos | 27 | Posicionados a mano, a coordenadas fijas |
| `Cuerpo` en auto-layout | 5 | Cabecera, selector y contenido dentro de una columna que se ajusta sola |

Son `Actividad / 01–03` y `Categorías / 01–02` contra todo lo demás. No se nota mirando, pero **cada arreglo de densidad hay que hacerlo dos veces**, y ya pasó: cuando apreté los informes tuve que tratar los dos casos por separado.

### A.2 El título tiene dos tamaños

**25 cuadros a 28 px y 7 a 30 px.** Y lo peor es dónde cae el corte: `Agenda / 01 Hoy` es 28 y `Agenda / 02 Semana` es 30. **Dos niveles de la misma sección con dos tamaños de título.**

### A.3 El selector de período falta en 14 cuadros

El nivel día lleva selector en `Agenda / 01`, `Hoy / 01` y `Hoy / 02`. No lo llevan:

`Recorrido / 01–05` · `Estados / 01–03` · `Excepciones / 01–02` · `Hoy / 03` · `Comunicar / 01–02` · `Rutinas / 02`

Todos enseñan el día. En los que tienen capa de captura el selector se vería igual a través del velo, así que su ausencia no se explica por la capa.

### A.4 Tres defectos sueltos

- **`Hoy / 01 Plan propuesto` no tiene asa ni barra.** Es el único cuadro del móvil sin ninguna forma de capturar.
- **`Categorías / 02` tiene asa *y* capa.** Los otros diez cuadros con capa no llevan asa.
- **Falta el «volver» en tres bajadas**: `Hoy / 04 Apunte largo`, `Rutinas / 01 Mis rutinas` y `Categorías / 01`. `Tareas / 02` y `Actividad / 04` sí lo tienen, así que la regla existe y se incumple.

### A.5 Los grupos sugieren secciones que no existen

La página tiene **11 grupos** para **3 secciones**. `Rutinas / 01` enseña una cabecera que dice «Rutinas», que no es ningún destino de la navegación. Es el mismo error que acabamos de corregir en web con los siete iconos, en otra forma.

| Grupo | ¿Qué es en realidad? |
|---|---|
| `Hoy / *` | Estados del **nivel día de Agenda** |
| `Rutinas / *` | **Sin sitio.** Ver decisión D-A |
| `Comunicar / *` | Acciones que salen de la **capa de captura** |
| `Categorías / *` | Configuración. En web se fue a **Ajustes**. Ver decisión D-B |

---

## B. Las dos plataformas no cuentan lo mismo

| | Móvil | Web |
|---|---|---|
| Acceso | **0** | 3 |
| Portada de cada sección | 3 | **0** |
| Niveles de período dibujados | 6 | **0** |
| Recorrido completo | 5 — captura por voz | 7 — el encargo |
| Estados | 3 | 6 |
| Excepciones | 2 | 1 |
| Ajustes | **no existe** | 1 |
| Cuadros en jerarquía vieja | 13 (`04 Flujos`) | 20 (`05 Flujos`) |

**Son espejos invertidos**: el móvil tiene portadas y niveles y no tiene acceso; la web tiene acceso y no tiene ni portadas ni niveles. Un lector que mire las dos páginas no ve el mismo producto.

Y **33 cuadros viejos** siguen publicados con la jerarquía anterior. Es el riesgo más serio del entregable, porque son los que el equipo ya presentó.

---

## C. Plan, en cuatro fases

### Fase 0 · Coherencia del móvil
*No añade contenido. Es barato y quita ruido de todo lo que venga después.*

| # | Qué | Cuadros |
|---|---|---|
| 0.1 | Unificar el armazón en `Cuerpo` auto-layout | 27 |
| 0.2 | Título a 28 px en todos | 7 |
| 0.3 | Selector de período donde falta | 14 |
| 0.4 | Asa en `Hoy / 01`; quitarla de `Categorías / 02` | 2 |
| 0.5 | «Volver» en las tres bajadas | 3 |

### Fase 1 · Taxonomía alineada con las tres secciones
*Depende de las decisiones D-A y D-B.*

Renombrar los grupos para que ninguno sugiera una sección inexistente, y que las dos páginas usen el mismo esqueleto:

`Acceso` · `Armazón` · `Secciones` · `Recorrido` · `Estados` · `Excepciones` · `Ajustes`

### Fase 2 · Paridad entre plataformas

| Qué falta | Dónde | Cuadros |
|---|---|---|
| Acceso | Móvil | 3 |
| Portada de Agenda, Tareas y Actividad | Web | 3 |
| Niveles de período | Web | 4 |
| Franja «encargadas» dentro de Tareas | Web | 1 |

### Fase 3 · Lo que falta de producto

**Móvil** — 10 comandos sin pantalla: `/foto`, `/horario`, `/lugar`, `/replanificar`, `/bloque`, `/objetivo`, `/esperando`, cronómetro, `/revisar`, `/buscar`. Y la paleta de comandos, que está especificada y no tiene ni un cuadro.

**Web** — CUN-06 Coordinar reunión, CUN-08 Seguimiento, CUN-10 Resúmenes: sin especificación **y** sin diseño. Más los estados del encargo (vencido, recordatorio, enlace caducado, revocación a mitad) y los caminos alternos del acceso, que sí están especificados.

### Fase 4 · Higiene
Volcar los cuadros nuevos a scripts · ampliar el validador web · iconografía real · modo oscuro · `Fundamentos` como biblioteca publicada.

---

## D. Las cinco decisiones — **tomadas**

| | Decisión | Estado |
|---|---|---|
| **D-A** | **Las rutinas viven en Agenda.** Ocupan tiempo en el calendario y su cumplimiento ya se ve en Actividad; en Tareas serían un pendiente que nunca se cierra | Aplicado: `Agenda / 04 Mis rutinas`, `05 Rutina recolocada` |
| **D-B** | **Se añade Ajustes**, con ocho grupos y Cuenta al final. La puerta va **en la cabecera de las secciones**, no como cuarta pestaña | Aplicado: 5 cuadros y acceso en 7 cabeceras |
| **D-C** | Migrar **los principales** de los 33 cuadros viejos | Pendiente |
| **D-D** | **Título a 28 px** | Aplicado en los 35 cuadros |
| **D-E** | **`Comunicar` no es una sección**: son estados de la capa de captura | Aplicado: pasan a `Captura / 02–05` |

### Lo que contiene Ajustes

Ocho grupos, todos trazables a una decisión ya tomada. Ninguno es invención.

| # | Grupo | De dónde sale |
|---|---|---|
| 1 | Perfil y horario — zona horaria, franja laboral | RN-CAL-01; se captura en el primer ingreso |
| 2 | Categorías — con su ámbito y su visibilidad | D-16 / §4.9 |
| 3 | Conexiones — Google, y micrófono, cámara, ubicación, avisos | `REQ-ACC-06/07` y los sensores de `01-captura`. Destino de `/permisos` |
| 4 | Equipo y permisos — quién aceptó, invitar, revocar | §4.8. Solo Empresarial |
| 5 | Cómo te acompaño — una pregunta al cerrar el día, No molestar | R-3, R-2 |
| 6 | Privacidad y datos — qué se comparte, el audio que se descarta | R-22, R-4, §9 técnica |
| 7 | Plan — qué tienes y qué añade el siguiente | Destino de `/mi-plan` y de la tarjeta **Bloqueada** |
| 8 | Cuenta — correo, contraseña, cerrar sesión | **Al final** |

**Dos huecos que este inventario destapó**, y que no estaban en ninguna lista anterior: `/mi-plan` y la tarjeta **Bloqueada** no llevaban a ningún sitio —o sea, el momento de conversión del producto no tenía pantalla—, y los permisos del teléfono no tenían dónde verse pese a estar especificados. Los dos quedan cubiertos por `Ajustes / 05 Plan` y `Ajustes / 04 Conexiones`.

---

## D bis. Fase 0 y Fase 1 — hechas

**La página del móvil pasa de 32 a 35 cuadros, y de 11 grupos a 9**, todos con significado:

`Agenda 5` · `Tareas 2` · `Actividad 4` — las tres secciones
`Día 4` — estados del nivel día · `Captura 5` — estados de la capa
`Recorrido 5` · `Estados 3` · `Excepciones 2` · `Ajustes 5`

Ningún grupo sugiere ya una sección que no existe, que era el defecto de fondo.

| Arreglo | Cuadros |
|---|---|
| Título a 28 px | 7 |
| Selector de período donde faltaba | 14 |
| Asa añadida a `Día / 01`, quitada de `Ajustes / 03` | 2 |
| «Volver» en las tres bajadas | 3 |
| Acceso a Ajustes en la cabecera | 7 |

**Validación: 35 cuadros, 0 fallos.**

**Lo único de la Fase 0 que queda pendiente** es unificar el armazón: 30 cuadros siguen con `Encabezado` + `Contenido` a coordenadas fijas y 5 con `Cuerpo` en auto-layout. No se ve, pero obliga a hacer cada arreglo de densidad dos veces. Lo dejé fuera a propósito: tocar 30 cuadros por una mejora que no se ve tiene más riesgo que valor ahora mismo.

### Un falso positivo que vale la pena recordar

La primera pasada del validador dio **21 fallos de «texto de ancho cero»** y los 21 eran mentira: la regla marcaba cualquier texto de menos de 10 px, y un chevron «›» mide 7 px con toda la razón. Corregida a *texto de más de dos caracteres con menos de 24 px de ancho*, que es el defecto real —un texto largo aplastado—. Es la segunda vez en el proyecto que un validador mío da falsos positivos por una regla demasiado cruda; la primera fue `R-\d+` casando dentro de `RN-ER-01`.

---

## E. Qué NO propone este plan

- **No propone funciones nuevas.** Todo lo de la Fase 3 ya está especificado o ya está decidido en `REPLANTEO.md`.
- **No toca el Entregable 1.** Ninguna de estas fases añade o modifica un CUN.
- **No propone rehacer lo que funciona.** El lenguaje visual, las tres columnas, las tres secciones y el ciclo de la conversación se quedan como están.
