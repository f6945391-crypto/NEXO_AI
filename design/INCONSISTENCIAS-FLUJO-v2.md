# Inconsistencias de flujo — v2 móvil y web

**Proyecto:** NexoAI · Diseño de Software · Entregable 2
**Archivo:** `mgmuPhGwkmvfhz7xk0QPl5`
**Páginas revisadas:** `06 Arquitectura · Web v2` (20 cuadros) y `07 Móvil v2 · Estructura y recorrido` (35 cuadros)
**Fecha:** 17 de octubre de 2026
**Alcance:** solo coherencia del recorrido. Se contrasta lo dibujado contra `INFORME-ESTRUCTURA-DISENO.md`. No se modificó nada en el archivo.

---

## 0. Punto de partida

Las dos páginas tienen **cero interacciones de prototipo**: `flowStartingPoints` vacío y ningún nodo con `reactions`. El recorrido no está declarado en el archivo; la única pista es el orden de los cuadros en el lienzo y los botones dibujados dentro de cada uno.

Eso significa que todo lo que sigue se midió así: para cada botón, fila con chevron o chip, ¿existe en la página el cuadro al que debería llevar? Y al revés: para cada cuadro, ¿existe el cuadro desde el que se llega?

---

## 1. Móvil

### 1.1 El asa promete cuatro modos y solo dos tienen pantalla

`Captura / 01 Qué abre el asa` ofrece cuatro entradas:

| Modo | Destino |
|---|---|
| Hablar · hasta 5 minutos | `Recorrido / 02 Grabando` |
| Comando · escribe / para la lista | los chips del mismo cuadro |
| **Foto · horario o pizarra** | **ninguna pantalla en la página** |
| **Tarea · algo que hay que hacer** | **ninguna pantalla en la página** |

### 1.2 Uno de los tres chips no tiene pantalla

Los chips dibujados son `/cerrar-día`, `/hice` y `/correo`.

- `/cerrar-día` → `Día / 03 Cierre del día`
- `/correo` → `Captura / 02 Correo preparado`
- **`/hice` → nada**

### 1.3 La llamada entra sin puerta

`Captura / 04 Llamada preparada` y `05 Al colgar` van sobre fondo de Tareas, franja *esperando de alguien*. Pero:

- en `Tareas / 01 Lista` la fila de Juan Carlos Ramos («Enviarme el presupuesto · pedido hace 5 días») no tiene ninguna acción;
- en `Captura / 01` no hay chip ni modo de llamar.

No existe forma de llegar a `04`. Es el caso más claro de sección que aparece de la nada.

### 1.4 El fondo del velo en `Captura / 02` y `03` es el cuadro equivocado

Estructura comprobada de los dos cuadros: `Encabezado · Contenido · Pestañas · Selector · Velo · Capa de captura`. El `Contenido` que queda bajo el velo no es `Agenda / 01 Hoy` sino `Día / 01 Plan propuesto`: mismo subtítulo «Jueves 25 de septiembre · GMT-5» y mismo trío de botones «Aceptar el día / Ajustar / Así no».

Dos consecuencias:

1. Contradice §2.3 del informe, que coloca `01` a `03` sobre fondo de Agenda.
2. El antecedente es una pantalla con una decisión sin resolver. El usuario no pudo haber escrito `/correo` desde una pantalla que está esperando que acepte el plan del día. La regla «lo que se ve bajo el velo es el antecedente real» se cumple en la forma y se rompe en el fondo.

### 1.5 `Captura / 06 Modificar un bloque` no se puede terminar

Único botón: «Cancelar». Hay una fila «Pasarlo a otro día» y un campo libre («O dímelo normal: muévelo a las 4»), pero ninguna acción de confirmar. El único camino desde ese cuadro es salir sin hacer nada.

### 1.6 `Captura / 07 Replanificar` presenta como opciones cosas que no son botones

El grupo `Acciones` contiene cuatro textos pero solo dos son botones: «Aceptar los tres cambios» y «Dejarlo todo como está». «Solo mover la tesis» y «Lo demás se queda como está» están escritos con forma de opción y no lo son.

### 1.7 `Ajustes / 01 Portada` lista ocho filas con chevron y solo tres tienen destino

| Fila | Pantalla |
|---|---|
| Perfil y horario › | no existe |
| Categorías › | `Ajustes / 02` |
| Conexiones › | `Ajustes / 04` |
| Equipo y permisos › | no existe en móvil (**sí en web**: `WEB-v2 / Ajustes / 01`) |
| Cómo te acompaño › | no existe |
| Privacidad y datos › | no existe |
| Plan › | `Ajustes / 05` |
| franco@utec.edu.pe › | no existe |

Cinco chevrones que no llevan a ningún sitio en la misma pantalla.

### 1.8 `Actividad / 04 Registro del asistente` aparece de la nada

Vuelve a «‹ Tu semana», así que es una bajada de `Actividad / 02 Semana`. Pero `Actividad / 02` no tiene ninguna fila, enlace ni botón que lo abra: solo el selector de nivel y dos tarjetas de resumen. **El mismo hueco está en web** (`WEB-v2 / Actividad / 04` vuelve a «‹ Tu semana» y `02 Semana` no lo abre), así que es un solo arreglo en las dos plataformas.

### 1.9 El engranaje de Ajustes falta en cinco pantallas de sección

`Móvil / Acceso a ajustes` está presente en 7 cuadros: Agenda 01–03, Tareas 01, Actividad 01–03. Falta en cinco cuadros que son esa misma pantalla de sección a pantalla completa, con selector y asa:

- `Día / 01 Plan propuesto`
- `Día / 02 Día real`
- `Recorrido / 01 Hoy antes`
- `Recorrido / 05 Hoy después`
- `Excepciones / 02 Asistente no disponible`

Según §2.3 el engranaje es pieza de la cabecera de las secciones. Tal como está, la puerta a Ajustes desaparece según en qué estado esté el día.

### 1.10 La cabecera de Ajustes miente si no entraste desde Actividad

`Ajustes / 01 Portada` vuelve a «‹ Actividad», y los cinco cuadros de Ajustes marcan la pestaña Actividad. El informe lo declara a propósito («Ajustes no es un destino»), pero el efecto es que si entras desde Agenda o desde Tareas, tanto el botón de volver como la pestaña activa dicen algo falso. Choca de frente con la regla de la web «el marco dice la verdad sobre el contenido» (§3.5).

### 1.11 `Agenda / 03 Mes` invita a algo que no tiene pantalla

El subtítulo dice «78 compromisos · toca un día para abrirlo». Las cuatro pantallas de la fila Día son todas «Hoy / Jueves 25»: no hay vista de un día cualquiera del mes.

### 1.12 Tres estados de la misma pantalla sin disparador declarado

`Agenda / 01 Hoy` («el día entra»), `Día / 01 Plan propuesto` (aviso «Te propongo este orden») y `Día / 02 Día real` son la misma pantalla en tres momentos. Nada en la página dice qué hace aparecer el aviso del plan propuesto ni cuándo se pasa de plan a día real.

### 1.13 Botones sin destino

| Cuadro | Botón |
|---|---|
| `Actividad / 03 Mes` | Revisar los jueves |
| `Día / 01 Plan propuesto` | Ajustar · Así no |
| `Día / 03 Cierre del día` | Confirmar · Lo hago después |
| `Captura / 05 Al colgar` | las cuatro (Anotar un apunte · Crear una tarea · Algo que espero de él · Nada, gracias) |
| `Estados / 01 En espera` | Grabar otra · Escribirlo ahora |
| `Estados / 02 No pude procesarla` | Reintentar · Escribirlo a mano |
| `Excepciones / 01 No cabe ese día` | Buscar otro día |

`Captura / 05` además no tiene botón primario: cuatro secundarios y uno de texto, sin jerarquía.

### 1.14 Un mismo sitio con dos nombres

`Estados / 03 Fuera del plan` → botón «Ver el Plan Personal». La pantalla que existe se titula «Tu plan» (`Ajustes / 05`).

### 1.15 Rutinas medidas y nunca definidas

`Actividad / 02 Semana` muestra «Leer 30 minutos · 5 de 5», «Gimnasio · 1 de 3», «Llamar a casa · 0 de 2». No existe ninguna pantalla donde una rutina se cree o se recoloque. Confirma §5.1 del informe.

---

## 2. Web

### 2.1 Ninguna pantalla marca la sección activa

Esta es la mayor ruptura de flujo de la web, porque afecta a los 11 cuadros de aplicación.

- En `Armazón / 01 Normal` la navegación son cuatro instancias de `Web / Icono` con `Nombre = Agenda, Tareas, Actividad, Tareas`. La cuarta es Ajustes usando prestado el icono de Tareas, y ninguna tiene propiedad de estado activo.
- En `Ajustes / 01 Equipo y permisos` la navegación está construida de otra forma: cuatro instancias llamadas «Agenda», «Tareas», «Actividad», «Ajustes», cada una envolviendo un `Web / Icono` — también sin propiedad de activo.

Dos construcciones distintas de la misma barra, y en ninguna el usuario sabe dónde está. Rompe la regla «Sección activa» de §3.5 y es la asimetría más fuerte con móvil, donde `Móvil / Pestañas` sí lleva la variante `Activa` puesta correctamente en los 35 cuadros.

### 2.2 `Armazón / 01 Normal` no es un armazón

Muestra la delegación a María Fernanda a medio confirmar, con «Confirmar delegación / Modificar / Cancelar» — contenido idéntico al de `Diálogos / 01 Advertencia de descarte`. El cuadro que debía demostrar la disposición de tres columnas vacía está ocupado por un estado concreto de una tarea concreta.

De paso, eso deja el recorrido de la delegación repartido entre tres filas que no se declaran como recorrido:

`Armazón / 01` (decisión) → `Diálogos / 01` (descarte) · `Blancos / 01 Vacía tras cerrar` (ya la muestra registrada como «Hecho»)

### 2.3 El paso 1 del recorrido del encargo no tiene botón

`Ajustes / 01 Equipo y permisos` no tiene ni un botón: solo la navegación. El paso 2 del recorrido (§3.4) es `CORREO / 01 Invitación a colaborar`, y en el paso 1 no hay nada que invite. El recorrido documentado arranca con un salto.

### 2.4 `CORREO / 02 Pedido de encargo` no dibuja las preguntas cerradas

Tiene un solo botón: «Contestar las otras dos preguntas». §3.4 paso 5 dice «preguntas cerradas como botones; el texto libre al formulario». Los botones de las preguntas cerradas no existen en el cuadro, así que el correo solo ofrece el enlace al formulario y la mitad del paso no está representada.

### 2.5 El colaborador nunca recibe acuse

- Tras `PÚBLICO / 01` → «Acepto las dos cosas»: no hay pantalla de confirmación.
- Tras `PÚBLICO / 02` → «Enviar a Franco»: no hay pantalla de confirmación.

Para alguien que no tiene cuenta, esa pantalla es la única señal de que su respuesta llegó. Son las dos únicas pantallas del recorrido sin salida.

Además, en `PÚBLICO / 01` «No, gracias» está escrito dentro del grupo de acciones pero no existe como botón.

### 2.6 Un botón destructivo apunta a una pantalla que no está en su fila

`Diálogos / 01` → «Descartar e ir a Mi agenda». No hay portada de Agenda en la fila de Secciones. La única vista de agenda de la web está en `Blancos / 04 Fuera del plan`, cuyo título es «Mi agenda · Jueves 2 de octubre · 4 compromisos».

Matiza §5.2 del informe: la portada de Agenda no falta, está archivada como un blanco. Lo que falta es ponerla en Secciones.

### 2.7 Un botón que en móvil lleva a una pantalla y en web a ninguna

`Blancos / 04 Fuera del plan` → «Ver el Plan Personal». En web, Ajustes solo tiene `01 Equipo y permisos`: no hay pantalla de plan. En móvil sí (`Ajustes / 05 Plan`). Es el mismo botón con el mismo texto en las dos plataformas, resuelto en una sola.

### 2.8 Botones sin destino

| Cuadro | Botón |
|---|---|
| `Acceso / 01 Entrada` | ¿Olvidaste tu contraseña? |
| `Acceso / 03 Conectar Google` | Conectar con Google · Ahora no (el destino natural, `Blancos / 02 Inicial`, está tres filas más abajo y nada lo declara) |
| `Armazón / 01 Normal` | Modificar |
| `Tareas / 01 Encargar con preguntas` | Guardar sin enviar |
| `Tareas / 02 Llega como propuesta` | las tres ramas finales (Aceptar la nueva fecha · Mantener el viernes y avisarle · Preguntarle otra cosa) |
| `Blancos / 01 Vacía tras cerrar` | Ver lo anterior |

`Tareas / 02` es el paso 7 y último del recorrido del encargo: termina en tres ramas abiertas y ninguna tiene cuadro.

### 2.9 Dos fechas distintas en la misma página

- Acceso y Actividad: semana del 22 al 28 de septiembre, «Tu jueves», «Septiembre».
- Delegación y blancos: «vence el 2 de octubre», «Jueves 2 de octubre».
- Recorrido del encargo: «para el viernes», respuesta que pide «el martes 30».

Móvil está entero en el jueves 25 de septiembre. La web cuenta dos semanas a la vez.

### 2.10 Nueve rótulos para seis filas

Los seis correctos son los `Rótulo de fila` en y = 130, 1230, 2330, 3430, 4530 y 5630. Sobran tres:

| Nodo | Posición | Problema |
|---|---|---|
| `Rótulo` (62:119) | (0, 140) | encima del rótulo de la fila de Acceso |
| `Rótulo 02` (67:179) | (1540, 140) | mismo caso, desplazado a la derecha |
| `Rótulo diálogos` (70:629) | (3080, 2240) | nombra la fila de Diálogos, que está en y = 5630 — a 3.390 px |

---

## 3. Diferencias entre el informe y el archivo

| Informe | Archivo |
|---|---|
| §1: `02 Componentes · Móvil` con 12 componentes | la página tiene 10 nodos de primer nivel, frente a los 12 de la web — por verificar si son sets o faltan dos |
| §1: `01 Fundamentos` «solo componentes y variables», 0 cuadros | la página tiene 2 nodos de primer nivel |
| §1: ocho páginas en orden 00 a 07 | el orden real de páginas es 00, 01, 02, 03, **05**, 06, 07, **04**: `04 Flujos · Móvil` está al final, después de `07` |
| §2.3: Captura 01–03 sobre fondo de Agenda | `02` y `03` llevan debajo `Día / 01 Plan propuesto` (ver 1.4) |
| §3.4 paso 5: preguntas cerradas como botones en el correo | un solo botón en `CORREO / 02` (ver 2.4) |
| §5.2: falta la portada de Agenda en web | existe como `Blancos / 04 Fuera del plan` (ver 2.6) |

Lo demás del informe se sostiene: rutinas sin pantalla, lienzo expandido sin cuadro, `Web / Icono` con seis variantes y Ajustes prestando la de Tareas, y los 33 cuadros de `04 Flujos · Móvil` y `05 Flujos · Web` con la jerarquía vieja.

---

## 4. Orden sugerido para cerrarlo

De mayor a menor efecto sobre la coherencia del recorrido, sin contar lo que ya estaba en la lista de huecos del informe:

1. **Estado activo en la navegación de la web** (2.1). Afecta a los 11 cuadros de aplicación y a la paridad con móvil.
2. **Cerrar el recorrido del encargo por los dos extremos** (2.3 y 2.5): botón de invitar en el paso 1, acuse al colaborador en `PÚBLICO / 01` y `02`.
3. **Corregir el fondo de `Captura / 02` y `03`** (1.4): que debajo del velo esté `Agenda / 01 Hoy`.
4. **Decidir qué abre el asa** (1.1, 1.2, 1.3): o se dibujan Foto, Tarea, `/hice` y la entrada a la llamada, o se quitan de `Captura / 01` y se declara el hueco como en la fila de Acceso.
5. **Recortar `Ajustes / 01 Portada` a lo que existe** (1.7), o declarar los cinco chevrones pendientes.
6. **Engranaje en las cinco pantallas que lo perdieron** (1.9).
7. **Resolver la contradicción de la cabecera de Ajustes** (1.10): o el volver y la pestaña reflejan de dónde vienes, o se acepta que ahí la regla del marco no aplica y se escribe así en el informe.
8. **Mover `Blancos / 04` a Secciones como portada de Agenda** (2.6) y dar destino a «Descartar e ir a Mi agenda».
9. **Unificar la fecha de la web** (2.9) y el nombre del plan entre plataformas (1.14, 2.7).
10. **Limpiar los tres rótulos sueltos** (2.10) y reordenar las páginas para que `04` vuelva a su sitio.
11. **Mover `Armazón / 01` a su fila y dibujar el armazón de verdad** (2.2).

Lo de 1.13 y 2.8 (botones sin destino) no exige un cuadro por botón: basta decidir, por fila, cuáles ramas se dibujan y cuáles se declaran fuera del alcance del boceto.

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
