# Informe del carril «conversación móvil» — diseño y especificación

**Fecha:** 7 de noviembre de 2026
**Rama:** `carril-movil-diseno`, sobre `base-tanda2`. Sin push.
**Qué es:** propuesta para el equipo. **No toca ningún `spec.md`** (el carril de código anota a la vez sus decisiones en `specs/01-captura/spec.md`) **ni `SPEC.md`**. Lo que haría falta escribir en ellos está aquí, redactado para copiar.
**Material producido:**

| Qué | Dónde |
|---|---|
| Auditoría con 19 hallazgos MC-01 a MC-19 y seis capturas anotadas | `design/capturas/2026-11-07-movil-auditoria/INFORME-AUDITORIA-MOVIL.md`, `anotadas/` |
| Revisión del documento de arquitectura | `design/ARQUITECTURA-VISUAL-MOVIL.md` §8, y remisiones en §2 |
| Boceto de la capa con la tarjeta plegada | `design/capturas/2026-11-07-movil-auditoria/boceto-capa.html` y `.png` |
| Este informe | `entregas/INFORME-CARRIL-MOVIL-DISENO.md` |

---

## 1. Resumen para el equipo

1. La capa del móvil se diseñó como un formulario que sube y ya es una conversación. La revisión del documento (§8) la ordena como tal: cabecera fina, lista a todo el alto, barra de una fila y tarjeta plegada. El boceto lo cumple con la tarjeta en **320 px (38 % del alto)** y la barra en **78 px**; hoy son 659 px y 160 px.
2. **Plegar la tarjeta tiene un límite que no es de diseño sino de principios.** P-03, P-05 y REQ-CUN01-01 obligan a ver antes de confirmar el qué, el cuándo **con su zona** y lo que el sistema puso por su cuenta. La primera versión del carril de código pliega la zona y la explicación de la duración (§2, H-CAP-01). Es lo único de este informe que considero **bloqueante** antes de dar por buena la tarjeta.
3. Tres decisiones del carril de código contradicen el documento de diseño, y lo dicen ellas mismas. La revisión §8 resuelve dos (línea esencial con condiciones; velo como token) y propone otra cosa para la tercera (Descartar y Ver detalles en una fila). Lo tiene que avalar el equipo.

---

## 2. Decisiones H-CAP que anota el carril de código, vistas juntas

Leídas de su commit `830e5e3` (`specs(01-captura): decisiones de la conversación del móvil (H-CAP-01 a 04)`), en `/home/claude/nexoai-b2-ui`, a media tarde del 7 de noviembre de 2026. Si cambian después, manda su texto.

| # | Qué decide | Contra el diseño | Mi lectura |
|---|---|---|---|
| H-CAP-01 | Tarjeta plegada: acción, línea esencial con «título, fecha, hora o cuándo, y **la duración sin su explicación**», lo irreversible, cruce, «Confirmar» a ancho completo y debajo, en una fila, «Descartar» y «Ver detalles». «Alternativas» no se repite en texto | Lo dice: §3, botones apilados y datos en pares | **De acuerdo con plegar y con quitar «Alternativas».** **En desacuerdo con dos cosas:** (a) la línea esencial **no lleva zona** —en su captura `despues/3-tarjeta.png`: «Revisión · sábado, 7 de noviembre de 2026 · 23:00 – 00:00 · 1 hora»—, lo que rompe P-05, y quita «porque no indicaste la hora de fin», que REQ-CUN01-01 (decisión 19) pide que la tarjeta diga (MC-18, **alta**); (b) «Descartar» y «Ver detalles» en una fila: §8.4 propone «Descartar» a ancho completo y «Ver detalles» como control de texto junto al qué. Con eso la tarjeta sigue bajo el 40 % (boceto: 38 %) |
| H-CAP-02 | Barra de una fila, envío dentro, crece hasta cuatro líneas, atenuado sin cambiar el alto, fija y sube con el teclado | No | De acuerdo. Coincide con §8.3. Falta el contorno con 3:1 (MC-10), que pide un token |
| H-CAP-03 | La capa arranca bajo la zona de estado y el velo es más opaco | Lo dice: 0,16 de §2 | De acuerdo con el fin. §8.1 lo precisa: **dos altos** (baja, al contenido sin pasar de la cabecera de la sección; completa, con 12 px del antecedente) y **nunca uno intermedio que corte una cabecera**. Si la capa arranca siempre arriba, el antecedente desaparece también cuando cabría entero, que es lo que §2 quiere ver. Y el velo, como token `superficie/velo` |
| H-CAP-04 | Título «¿Qué hacemos?» sin nada dicho en lo que se está pidiendo; si no, «Asistente» y la primera petición. El asa señala con un punto una propuesta pendiente **cuando la capa ya se abrió una vez** | No | De acuerdo con el título (§8.5 dice lo mismo). El asa: la limitación «cuando ya se abrió una vez» viene de no hacer otra llamada al abrir la sección; está bien como primer paso, pero tras recargar la aplicación una propuesta pendiente no se ve hasta abrir la capa, y puede caducar a las 24 horas sin aviso (decisión 28 de `07-agente`). Hace falta que la sección sepa si hay una propuesta abierta: es una consulta que la API ya admite para «en espera» y podría admitir para «propuesta». Hallazgo para el carril del agente |

**Errata del encargo de código.** Pide la línea de título de `vistaConfirmacion.titulo`; el campo del contrato se llama `accion` (`packages/contratos/src/operaciones.ts`). El título del compromiso no es un campo: es el dato «Título» o «Compromiso». No cambia nada si el código usa `accion`, pero el criterio de §8.4 depende de ello: **la acción no dice cuál** (MC-17), así que el qué tiene que salir de los datos.

### Lo que convendría que el carril de código ajuste antes de cerrar, o en el siguiente

| Prioridad | Ajuste | Hallazgo |
|---|---|---|
| Antes de cerrar | La línea esencial lleva la zona y, cuando la hay, la explicación de lo supuesto | MC-18 |
| Antes de cerrar | El qué (título o compromiso) va primero en la línea esencial | MC-17 |
| Siguiente | «Descartar» a ancho completo; «Ver detalles» como control de texto | §8.4 |
| Siguiente | Dos altos de la capa, sin alto intermedio | MC-02, MC-19 |
| Siguiente | «Pensando…» dentro de la lista | MC-15 |
| Siguiente | La tarjeta ya decidida, plegada y con `borde/base` | MC-08 |

---

## 3. Lo que convendría elevar a requisito

La tarjeta plegada cambia lo que la persona ve antes de confirmar, que es exactamente lo que regula P-03. Eso no debería vivir solo en una decisión de diseño: **propongo `REQ-CAP-26`** (el último es REQ-CAP-25), en `specs/01-captura/spec.md` §2, después de REQ-CAP-01.

> ### REQ-CAP-26
>
> **Requisito:** DONDE la conversación se muestre en una pantalla estrecha —el móvil, o la web por debajo de 1024 px—, EL SISTEMA presentará la tarjeta de confirmación plegada, con la acción, qué y cuándo con su zona horaria, lo que el sistema puso por su cuenta, lo irreversible, el cruce y las salidas; y CUANDO la persona pida el detalle, mostrará en la misma tarjeta todos sus datos en pares etiqueta y valor.
>
> **Origen:** REQ-CAP-01 («la misma tarjeta, con los mismos datos y las mismas salidas»); P-03; P-05; REQ-CUN01-01 (decisión 19 de `02-agenda`); prueba del equipo del 7 de noviembre de 2026; `design/ARQUITECTURA-VISUAL-MOVIL.md` §8.4; hallazgos MC-01, MC-17 y MC-18. Añadido el 7 de noviembre de 2026
> **Tipo:** complejo
> **Plataforma:** móvil, y web por debajo de 1024 px
>
> **Criterio de aceptación**
> DADO la propuesta de registrar «Reunión» el sábado 7 de noviembre de 2026 de 10:00 a 11:00, hora de Lima, pedida sin hora de fin
> CUANDO aparezca en la capa de captura del móvil
> ENTONCES la tarjeta muestra la acción, «Reunión», el día, el horario, la zona y que la duración la puso el sistema, con «Confirmar» y «Descartar»
> Y la tarjeta no supera el 40 % del alto de la pantalla
> Y CUANDO la persona toque «Ver detalles»
> ENTONCES ve Título, Fecha, Hora, Zona horaria y Duración en pares, dentro de la misma tarjeta, y el control pasa a «Ocultar detalles»
> Y DADO una propuesta que se cruza con «Llamada con proveedores» y tiene una alternativa
> ENTONCES la tarjeta plegada muestra «Se cruza con «Llamada con proveedores»» y la alternativa como una salida, y las alternativas no aparecen además como texto
> Y lo que se registra al confirmar es lo mismo con la tarjeta plegada o desplegada

**Por qué es «complejo» y no solo «funcionalidad opcional»:** combina la condición de plataforma (DONDE) con el evento de pedir el detalle (CUANDO).

**Por qué el 40 % va en el criterio:** es medible en una prueba y es lo que el equipo vio fallar. Si el equipo prefiere no fijar una cifra en el requisito, puede ir al plan y el criterio decir «sin ocultar la petición de la persona».

**Glosario.** No hace falta un término nuevo. Convendría precisar «Tarjeta de confirmación» en `specs/glosario.md` con una frase: «En pantallas estrechas se presenta plegada: lo esencial a la vista y los datos en pares a demanda (REQ-CAP-26)». «Línea esencial» se queda como término de diseño, no de especificación.

**Decisión que acompaña al requisito** (para la tabla de decisiones de `01-captura`, tras las H-CAP del carril de código; numeración a continuación de la última que haya):

| # | Decisión | Afecta |
|---|---|---|
| H-CAP-05 | **Lo que no se pliega nunca.** En la tarjeta plegada siempre se ven: la acción; el qué (el dato Título o Compromiso); el cuándo con su zona; lo que el sistema puso por su cuenta, con su explicación; lo irreversible y las consecuencias (Aviso, Repetición); el cruce; y las salidas. La línea esencial usa los valores de los datos tal como llegan; una forma abreviada («sáb 7 nov») la tendría que dar el sistema con la vista, no armarla la pantalla | REQ-CAP-26, P-03, P-05, REQ-CUN01-01 |

---

## 4. Impacto en la web

**Pregunta:** ¿la tarjeta de la web, en su columna de 528 px, también debería plegar el detalle?

**Respuesta: no a 1440 ni entre 1024 y 1440; sí por debajo de 1024.** Argumentos:

1. **El problema es de alto, no de contenido.** En la web la columna mide 528 de ancho y unos 780 de alto útil. La tarjeta sin cruce, en pares, ocupa unos 400 px, la mitad, y deja ver la petición y lo anterior. Con cruce llegaba a la columna entera (W10, 4 de noviembre), pero la mitad de ese exceso era la fila «Alternativas» en texto y el motivo largo, que el pulido del 6 de noviembre y la decisión 27 ya acortaron o que esta propuesta quita.
2. **Los pares son la forma buena de revisar.** §3 del documento móvil los exige para lo que se revisa antes de confirmar, y la revisión solo admite la línea esencial como compromiso del móvil. Donde hay sitio, no hay motivo para ceder.
3. **`ARQUITECTURA-VISUAL-WEB.md` §10 quater:** «lo que cambia entre plataformas es la disposición, nunca el contenido ni la jerarquía». Plegar es una decisión de disposición, y se aplica donde la disposición lo pide: por debajo de 1024 px la web ya es una columna con la conversación como capa (H-WEB-01), y ahí tiene el mismo problema que el móvil. Por eso REQ-CAP-26 nombra los dos casos.
4. **Lo que sí se comparte ya:** quitar la fila «Alternativas» cuando hay botones (MC-06), el cruce en una línea (decisión 27), lo que no se pliega nunca (H-CAP-05) y el orden de la tarjeta (acción, qué, cuándo, supuesto, cruce, salidas). La jerarquía es la misma en las dos.

**Cambio que convendría en la API, para las dos plataformas:** que la vista de confirmación no mande el dato «Alternativas» cuando manda las alternativas (`revision-horario`), en lugar de que cada pantalla lo esconda. Hallazgo para el carril del agente o de agenda.

---

## 5. Líneas para `SPEC.md`

### §8, decisiones abiertas (filas nuevas)

| # | Decisión | Bloquea |
|---|---|---|
| — | **La conversación del móvil dentro de la capa** (`design/ARQUITECTURA-VISUAL-MOVIL.md` §8, propuesta del 7 de noviembre de 2026, y hallazgos H-CAP-01 a 05 de `specs/01-captura/spec.md`). Pendiente de aval: tarjeta plegada con lo que no se pliega nunca, barra de una fila, dos altos de la capa, título según haya algo abierto, asa con indicador. **Abierto:** si se escribe REQ-CAP-26; si «Descartar» y «Ver detalles» comparten fila (H-CAP-01) o «Ver detalles» es un control de texto (§8.4); el valor del velo y el token de contorno de campo; la forma del asa (MC-13); el dictado en la barra de una fila; si la capa completa ocupa toda la pantalla | REQ-CAP-01, REQ-CAP-26 (propuesto); carril de código móvil |
| — | **La sección no sabe si hay una propuesta abierta sin abrir la capa** (H-CAP-04). Para el punto del asa tras recargar hace falta consultar las operaciones en estado propuesta | Asa con indicador; decisión 28 de `07-agente` |

### §9, inconsistencias (filas nuevas)

| # | Inconsistencia | Dónde |
|---|---|---|
| INC-nn | El velo: 0,16 sobre `superficie/velo` en el diseño móvil §2; 0,4 escrito a mano en el código; ningún token de velo en `tokens.json` ni en `tokens.ts` (MC-14) | `design/ARQUITECTURA-VISUAL-MOVIL.md` §2; `apps/movil/src/pantallas/captura.tsx`, `inicio.tsx` |
| INC-nn | El asa: botón redondo de 56 con signo en el diseño (§2 y §3); píldora «Pedir algo» de 48 en `agente/base` en el código (MC-13) | `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 y §3; `apps/movil/src/pantallas/inicio.tsx` |
| INC-nn | H-CAP-01 pliega la zona horaria y la explicación de la duración, que P-05 y REQ-CUN01-01 (decisión 19) piden ver en la tarjeta (MC-18) | `specs/01-captura/spec.md`, H-CAP-01; `SPEC.md` P-05 |

### §11, registro de cambios (una línea; versión de parche si no se añade REQ-CAP-26, menor si se añade; el número, el siguiente al que haya al aplicarlo)

| Fecha | Versión | Cambio | Archivos | Quién |
|---|---|---|---|---|
| 2026-11-07 | 2.20.2 | **Diseño de la conversación en la capa del móvil, propuesto y pendiente de aval.** Auditoría con 19 hallazgos (MC-01 a MC-19) y seis capturas anotadas: la tarjeta con cruce medía 659 px de 844 y la barra de escritura 160. Nueva §8 del diseño móvil: cabecera fina, lista a todo el alto, barra de una fila, dos altos de la capa que nunca cortan una cabecera, tarjeta plegada con lo que no se pliega nunca, título según haya algo abierto y asa con indicador; precisa la regla de datos estructurados de §3 para la tarjeta plegada. Boceto de referencia. Propuesta de REQ-CAP-26 y H-CAP-05 en el informe del carril, sin aplicar. Sin cambios de código | `design/ARQUITECTURA-VISUAL-MOVIL.md`, `design/capturas/2026-11-07-movil-auditoria/`, `entregas/INFORME-CARRIL-MOVIL-DISENO.md` | Equipo (prueba), redactado por Claude |

Si el equipo aplica REQ-CAP-26: versión **2.21.0**, §5 con un requisito más (155), `specs/trazabilidad.md` regenerado y `--check` en 0.

---

## 6. Preguntas abiertas

### 6.1 Dictado por voz en la barra de una fila (REQ-CAP-01, «hablar»)

La voz está fuera (PT-2, decisión 1 de `01-captura`), pero la barra de una fila decide dónde cabrá, y conviene no cerrarle la puerta.

| Opción | A favor | En contra |
|---|---|---|
| **A. Botón «Hablar» fijo dentro del contorno, a la izquierda del envío** | El envío no cambia nunca de sitio ni de nombre («Enviar», que buscan las pruebas); Hablar se ve siempre, como pide §3 ter («Hablar va primero») | Dos botones de 44 dentro de la fila: el campo pierde 52 px de ancho |
| B. El envío se convierte en micrófono con el campo vacío | Patrón conocido; no gasta ancho | El mismo sitio hace dos cosas; el nombre accesible cambia según el estado; Hablar no se ve con texto escrito |
| C. Hablar en el asa (mantener pulsado), no en la barra | La barra queda como está | Un gesto oculto; no sirve con la capa ya abierta |

**Recomendación: A.** Mientras se escucha, el campo se convierte en una franja con el tiempo y «Parar» (REQ-CAP-09, cinco minutos como mucho); mientras se transcribe, «Transcribiendo…» con «Cancelar». **El texto transcrito aparece en el campo, sin enviar**, y la persona lo corrige y pulsa «Enviar» (REQ-CAP-12; `INFORME-VISUAL-AGENTE.md` §7.2). La barra crece hasta cuatro líneas como con texto escrito; si la transcripción trae varias intenciones, se envían en secuencia (decisión 24 de `07-agente`). Falta decidir con REQ-CAP-10 si la lista de intenciones se ve en la barra o en la lista.

### 6.2 Foto

REQ-CAP-01 pide la misma tarjeta para la foto y §3 ter dibuja cuatro puertas en la capa (Hablar, Foto, Comando, Tarea) que la aplicación no tiene. **Pregunta:** ¿la foto entra por un botón en la barra (que ya no tendría sitio con Hablar y Enviar) o por un menú de puertas en el mismo hueco, a la izquierda del campo? Mi propuesta: un solo control «Más» a la izquierda del campo, dentro del contorno, que abre Foto, Comando y Tarea; Hablar se queda fuera de ese menú por §3 ter. No se dibuja hasta que la foto tenga plan.

### 6.3 ¿La capa completa debe ocupar toda la pantalla cuando lo abierto es largo?

§8.1 deja 12 px del antecedente arriba en el alto completo. **Pregunta:** ¿se quita también esa franja cuando la conversación es larga, o con el teclado abierto? A favor de quitarla: 12 px más de lista. En contra: sin franja, la capa parece otra pantalla y deja de demostrar que no hubo navegación (§2, «la captura es una capa… nunca te lleva a otra pantalla»). **Recomendación: conservarla siempre.** Lo que hay que probar en un teléfono real es si la zona segura de arriba ya hace ese papel; en Expo web no se ve.

### 6.4 Otras, más pequeñas

1. **Valor del velo** (`superficie/velo`): el boceto usa 0,48 provisional. Lo decide el equipo con una captura en teléfono.
2. **Token de contorno de campo** con 3:1 frente al blanco: el boceto usa `#8397A3` (3,0:1) como propuesto. Falta decidir si es un token nuevo o si se oscurece `borde/fuerte`, que afecta a todas las tarjetas.
3. **Tintes de resultado y de espera** (`#E6F4EC`, `#FDF3E0`, `#7A4F00`) están escritos a mano en el código; el verde del «Listo» queda en 4,4:1 (MC-10). Convendría llevarlos a tokens y subir el contraste.
4. **El «Listo» repite la tarjeta** y está mal escrito («de 10:00 – 11:00 (hora de Lima (GMT-5))», MC-09). Con la tarjeta decidida plegada, podría bastar «Listo: quedó en tu calendario». Lo arma la API.
5. **Forma del asa** (MC-13): redonda de 56 como dice el documento, o píldora «Pedir algo» como está construida. La píldora dice lo que hace, que era la objeción de §3 ter al «+»; si se queda, hay que corregir §2 y §3.

---

## 7. Comprobaciones

- El boceto (`boceto-capa.html`) se renderizó a 390 × 844 con el Chromium de `/opt/pw-browsers/`: tarjeta plegada con cruce y una alternativa, **320 px (38 %)**; barra, **78 px**. Usa solo los tokens de `apps/movil/src/tokens.ts` y dos valores marcados como propuestos.
- Las medidas de la auditoría coinciden con las del carril de código (`antes/medidas.json`: tarjeta con cruce 658 px, sin cruce 418; barra 128 sin margen inferior).
- Sus capturas «después» (vistas a mitad del trabajo, solo el punto 1 hecho): tarjeta plegada de 226 px y con cruce de 358; la línea esencial sin zona ni explicación de la duración (§2).
- No se tocó `apps/`, ningún `spec.md` ni `SPEC.md`. No se corrió la trazabilidad: no cambia ningún requisito.
