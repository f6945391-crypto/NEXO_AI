# Observación — la puerta de configuración y lo que arrastra al perfil

**Proyecto:** NexoAI · Diseño de Software · Entregable 2
**Archivo:** `mgmuPhGwkmvfhz7xk0QPl5`, páginas `06 Arquitectura · Web v2` y `07 Móvil v2`
**Fecha:** 17 de octubre de 2026
**Estado:** observación y propuesta. No se modificó nada en el archivo ni en los specs.
**Complementa:** `INCONSISTENCIAS-FLUJO-v2.md` (hallazgos 1.7, 1.9 y 2.1)

---

## 1. La observación

Falta el botón de configuración. Pero el hueco no está donde parecía: el sitio existe en las dos plataformas y lo que falta es el icono, la portada y, detrás de eso, el destino. Y ese destino es justamente donde se modifica el perfil, que es el único sitio del diseño donde se puede corregir un dato del que depende una regla de negocio.

---

## 2. Lo que hay en el archivo

### 2.1 Web — el sitio está, el icono no

La navegación de los **11 cuadros de aplicación** tiene cuatro ítems en la misma posición en todos:

| Ítem | y | Icono |
|---|---|---|
| Agenda | 62 | `Agenda` |
| Tareas | 116 | `Tareas` |
| Actividad | 170 | `Actividad` |
| Separador | 824 | — |
| **Ajustes** | **831** | **`Tareas`** |

El cuarto ítem está bien colocado y bien separado, exactamente como lo pide `ARQUITECTURA-VISUAL-MOVIL.md` («en web la misma lista vive al pie de la barra de navegación, separada por una línea»), pero se dibuja con el icono de Tareas. A la vista, el botón de configuración es un segundo Tareas al pie.

La causa está en el componente: **`Web / Icono` tiene seis variantes** —Agenda, Tareas, Equipo, Reuniones, Resúmenes, Actividad— y **ninguna de Ajustes**. Sobran tres de secciones que ya no existen y falta la única que la barra necesita. El informe lo anota en §5.3 como deuda de componentes; su efecto real es un botón ilegible repetido en 11 pantallas.

Ningún ítem de los cuatro tiene estado activo.

### 2.2 Móvil — el engranaje falta en cinco pantallas

`Móvil / Acceso a ajustes` está en 7 cuadros: Agenda 01–03, Tareas 01, Actividad 01–03. Falta en cinco que son la misma pantalla de sección a pantalla completa, con selector y asa:

`Día / 01 Plan propuesto` · `Día / 02 Día real` · `Recorrido / 01 Hoy antes` · `Recorrido / 05 Hoy después` · `Excepciones / 02 Asistente no disponible`

La regla es explícita: «la puerta va en la cabecera de las secciones, la misma en las tres». Tal como está, la puerta a Ajustes desaparece según en qué estado esté el día.

### 2.3 Las dos plataformas entran a configuración de forma distinta

| | Móvil | Web |
|---|---|---|
| Puerta | engranaje en la cabecera (en 7 de 12 cuadros) | cuarto ítem al pie (en los 11) |
| Portada | `Ajustes / 01 Portada`, ocho filas | **no existe** |
| Apartados dibujados | Categorías, Conexiones, Plan | Equipo y permisos |

En web el botón de configuración no abre una portada: abre directamente un apartado interno. Y es el único apartado que tiene. En móvil pasa lo contrario: hay portada con ocho filas y solo tres llevan a algún sitio.

---

## 3. Cómo esto afecta a modificar el perfil

Aquí está el problema de fondo, y no es de dibujo.

### 3.1 La cadena

1. `specs/05-equipos` §51 decide que **la zona horaria pasa a ser dato del Perfil de Usuario**, y lo declara como «el único dato nuevo que este criterio introduce».
2. `specs/05-equipos` §153 hace depender de ese dato la presentación de toda la disponibilidad: se muestra en la zona de quien consulta, convirtiendo las horas de los demás.
3. `specs/06-acceso` REQ-ACC-04 lo recoge **una sola vez**, en el primer ingreso, y REQ-ACC-05 lo ata a RN-CAL-01: es lo que usa el sistema para elegir la hora de una reunión, y no se deduce del navegador sin confirmar.
4. En el diseño, ese dato se pide en `WEB-v2 / Acceso / 02 Primer ingreso` (campo «Zona horaria · América / Lima · GMT-5»).
5. El único sitio donde se podría corregir después es la fila **«Perfil y horario ›»** de `MOV-v2 / Ajustes / 01 Portada`. **Esa fila no tiene pantalla.** En web no hay ni portada donde ponerla.

**Resultado:** un dato del que depende una regla de negocio se fija una vez y no se puede cambiar en ninguna de las dos plataformas. Si alguien viaja, cambia de país o se equivoca al entrar, el diseño no ofrece camino. No es un botón que falta: es un caso de uso sin pantalla.

### 3.2 La contradicción que hay que resolver antes de dibujar

La tarjeta de «Perfil y horario» en `Ajustes / 01 Portada` anuncia **«América / Lima · trabajas de 08:00 a 20:00»**. Es decir, promete una franja horaria por persona.

Pero:

- `specs/05-equipos` §49 dice expresamente: **«No se añade horario laboral al Perfil de Usuario. La banda es de la plataforma»**, y acepta el costo de que una persona con jornada atípica reciba propuestas fuera de la suya.
- `specs/06-acceso` REQ-ACC-04 sí pide «franja horaria de trabajo» en el primer ingreso.

Los dos specs no dicen lo mismo, y el diseño ya eligió uno de los dos sin declararlo. Si se dibuja «Perfil y horario» tal como lo anuncia la portada, se añade al modelo un atributo que el Entregable 1 no tiene y que 05-equipos descartó por escrito.

**Esto se decide antes de dibujar la pantalla, no después.** Es la única parte de esta observación que toca el modelado y no solo el boceto.

### 3.3 Lo demás que la portada promete y no existe

De las ocho filas de `Ajustes / 01 Portada`, cinco no tienen pantalla:

| Fila | Qué arrastra |
|---|---|
| **Perfil y horario ›** | zona horaria (dato de RN-CAL-01) y la franja en disputa |
| Equipo y permisos › | existe en web (`WEB-v2 / Ajustes / 01`), no en móvil |
| Cómo te acompaño › | sin especificación conocida |
| Privacidad y datos › | REQ-ACC-07 y REQ-ACC-09 viven aquí (permisos, revocación) |
| Cuenta (franco@utec.edu.pe) › | contraseña y cerrar sesión; `06-acceso` §4 ya anota «pendiente: la pantalla de contraseña olvidada» |

Tres de las cinco cargan requisitos ya escritos. No son huecos cosméticos.

---

## 4. Qué habría que redirigir

La parte que hay que reorientar hacia este uso, en orden de dependencia:

1. **Variante `Ajustes` en `Web / Icono`**, y apuntar ahí el cuarto ítem de los 11 cuadros. De paso, retirar las tres variantes de secciones que ya no existen (Equipo, Reuniones, Resúmenes), que es lo que deja el componente en seis para una barra de cuatro.
2. **`Móvil / Acceso a ajustes` en los cinco cuadros que lo perdieron.** Es copiar la pieza de cabecera, no diseñar nada.
3. **Portada de Ajustes en web**, espejo de la móvil: las mismas ocho filas con Cuenta al final, para que el cuarto ítem abra una portada y no un apartado. Hoy `WEB-v2 / Ajustes / 01 Equipo y permisos` es un apartado sin su índice.
4. **Pantalla `Perfil y horario` en las dos plataformas**, con la zona horaria editable y la indicación explícita del huso, que es lo que pide `CONTEXTO.md` («toda hora mostrada debe permitir saber en qué huso está»). Esta es la pantalla que cierra la cadena de 3.1.
5. **Estado activo en los cuatro ítems de la navegación web**, Ajustes incluido. Sin eso, entrar a configuración no se distingue de no haber entrado.
6. **Decidir el alcance de las otras cuatro filas**: o se dibujan, o se declaran como hueco conocido igual que la fila de Acceso en móvil. Lo que no puede quedarse es el chevron prometiendo un destino que no existe.

Nota aparte, del mismo origen: `ARQUITECTURA-VISUAL-MOVIL.md` menciona un cuadro `Foto / 01` del v2 que ya no está en ninguna página, y `Captura / 01 Qué abre el asa` sigue ofreciendo el modo Foto. Es el mismo patrón —una puerta sin habitación— pero fuera de configuración.

---

## 5. Lo que hay que decidir antes de construir

1. **¿La franja horaria de trabajo es dato del perfil o parámetro de la plataforma?** `06-acceso` REQ-ACC-04 y `05-equipos` §49 se contradicen, y la portada de Ajustes ya promete lo primero. De esto depende qué campos lleva la pantalla de Perfil y horario y si el Entregable 1 necesita una nota.
2. **¿La portada de Ajustes de la web replica las ocho filas o solo las que tienen pantalla?** Lo primero mantiene la paridad con móvil y hace visible el hueco; lo segundo no promete nada que no exista.
3. **¿Qué pasa con las cuatro filas restantes?** Dibujarlas es cuatro pantallas por plataforma. Declararlas como hueco es una línea de rótulo.
4. **¿«Equipo y permisos» se dibuja también en móvil**, o se acepta que ese apartado sea solo de web y se retira la fila de la portada móvil?

---

## 6. Resuelto · 17 de octubre

### Las cuatro decisiones

| # | Decisión | Efecto |
|---|---|---|
| 1 | **La franja horaria es parámetro de la plataforma** (R-44) | Perfil lleva solo zona horaria. `REQ-ACC-04` corregido; la portada ya no promete «trabajas de 08:00 a 20:00». No toca el Entregable 1 |
| 2 | **La portada replica las ocho filas**, marcando lo que no existe (R-46) | Tres activas, cuatro marcadas, una reducida |
| 3 | **La cuenta no es autogestionable** (R-45) | «Cuenta» queda en cerrar sesión; «Plan» es informativo |
| 4 | **Equipo y permisos solo en web** | La fila se queda en la portada móvil, marcada «Solo en web» |

### El problema de fondo de la entrada a Ajustes

Franco lo cortó antes de que dibujáramos nada: *«cómo se pasa de ajustes desde la sección actividad no tiene sentido»*. Tenía razón, y la causa era forzar una pantalla que no es sección a marcar una pestaña y a volver a un sitio del que no viene.

> **R-43 · La barra de pestañas solo aparece dentro de una sección.** Ajustes se presenta encima, sin barra, y se cierra con una equis.

Eso resuelve de paso el hallazgo 1.10 de `INCONSISTENCIAS-FLUJO-v2.md`, que quedaba como contradicción sin salida.

### Lo aplicado en el archivo

**Móvil**
- Los diez cuadros de Ajustes pierden la barra de pestañas y cierran con **×**.
- **`Ajustes / 02 Perfil y horario` dibujado.** Cierra la cadena de §3.1: la zona horaria deja de ser un dato que se fija una vez y no se puede corregir. Avisa de que cambiarla no mueve nada sin confirmación, y declara en pantalla que la banda horaria es de la plataforma.
- El **engranaje vuelve a los cinco cuadros** que lo habían perdido: `Día / 01`, `Día / 02`, `Recorrido / 01`, `Recorrido / 05`, `Excepciones / 02`.
- **Portada rehecha**: Perfil, Categorías y Conexiones con chevron; Equipo y permisos «Solo en web»; Cómo te acompaño y Privacidad y datos «No disponible»; Plan informativo; Cuenta «Sin cambios» más Cerrar sesión.
- Fila renumerada a ocho cuadros, con dos recuadros en blanco para los apartados que siguen sin decidirse.

**Web**
- **Variante `Ajustes` creada en `Web / Icono`** y apuntada en los 13 cuadros. El botón de configuración deja de ser un segundo Tareas al pie.
- **Retiradas las tres variantes de secciones que ya no existen** —Equipo, Reuniones, Resúmenes—, comprobando antes que ninguna instancia las usaba. El componente pasa de seis variantes a cuatro, que son las que la barra necesita.
- **Sección activa puesta en los 13 cuadros de aplicación**, Ajustes incluido. Era el punto 2.1 de las inconsistencias, el que más pantallas afectaba.

### Lo que sigue abierto

1. **Portada de Ajustes en web** y **Perfil y horario en web**: hay recuadro en blanco para las dos. Sin la portada, el cuarto ítem sigue abriendo un apartado suelto en vez de un índice.
2. **Cómo te acompaño** y **Privacidad y datos**: marcadas como no disponibles, con recuadro. Privacidad arrastra `REQ-ACC-07` y `REQ-ACC-09`, que ya están escritos.
3. **La comprobación del validador cambia**: «todo cuadro lleva pestañas» deja de ser cierto. La regla pasa a ser *todo cuadro de sección lleva pestañas; los que no son sección, no*.

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
