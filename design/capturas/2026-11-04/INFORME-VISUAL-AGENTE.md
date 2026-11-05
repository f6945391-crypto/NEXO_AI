# Informe visual — Cómo se ve y se siente el asistente hoy, en web y móvil, y qué cambiar paso a paso

**Fecha:** 4 de noviembre de 2026
**Alcance:** recorrido exploratorio de la interfaz del asistente tal como está en `main` (fase 2, hasta T-037), en la web (Next.js) y en el móvil (Expo web), con el **modelo simulado** y el calendario simulado. Se capturó, se anotó y se contrastó con `design/ARQUITECTURA-VISUAL-WEB.md`, `design/ARQUITECTURA-VISUAL-MOVIL.md`, `specs/01-captura/spec.md` y los dos informes anteriores (`INFORME-MEMORIA-AGENTE.md`, `INFORME-ESTRUCTURA-Y-REESTRUCTURACION-AGENTE.md`).
**Qué es:** evidencia y propuesta. **No es especificación.** No se cambió ninguna línea de código ni de diseño. Todo corrió sobre una copia del repositorio en un contenedor aparte.
**Dónde está la evidencia:** esta carpeta. `web/` y `movil/` tienen las capturas anotadas; `crudo/` las originales sin anotar; `herramientas/` los scripts que las produjeron, para repetir el recorrido cuando cambie algo.

---

## Índice

1. [Resumen](#1-resumen)
2. [Cómo se hizo y qué no se probó](#2-cómo-se-hizo-y-qué-no-se-probó)
3. [Inventario de capturas](#3-inventario-de-capturas)
4. [Hallazgos por capa de la interfaz](#4-hallazgos-por-capa-de-la-interfaz)
   - 4.1 [Capa de conversación (lo que la persona ve de lo que pidió)](#41-capa-de-conversación)
   - 4.2 [Capa de confirmación (la tarjeta)](#42-capa-de-confirmación-la-tarjeta)
   - 4.3 [Capa de resultado: lienzo en web, agenda de fondo en móvil](#43-capa-de-resultado-lienzo-en-web-agenda-de-fondo-en-móvil)
   - 4.4 [Capa de entrada (barra, asa, estados de espera)](#44-capa-de-entrada)
   - 4.5 [Consistencia y anchos](#45-consistencia-y-anchos)
5. [Cómo influye lo visual en el problema del agente](#5-cómo-influye-lo-visual-en-el-problema-del-agente)
6. [Cambios propuestos, paso a paso](#6-cambios-propuestos-paso-a-paso)
7. [Voz (STT): cómo encaja en estas capas](#7-voz-stt-cómo-encaja-en-estas-capas)
8. [Decisiones para el equipo](#8-decisiones-para-el-equipo)
9. [Cómo repetir el recorrido](#9-cómo-repetir-el-recorrido)

---

## 1. Resumen

La interfaz **hace bien lo difícil**: la tarjeta de confirmación muestra la acción exacta, sus datos y lo que puso el sistema por su cuenta (la hora de fin); el conflicto se explica y ofrece alternativas; lo que queda en espera se distingue de un fallo; el mensaje de la persona aparece al instante. Web y móvil usan los mismos componentes y el mismo lenguaje. Eso se conserva.

Lo que **se ve mal** no es un problema de estilo sino de **ciclo de vida**: en cuanto una acción se confirma o se descarta, el siguiente mensaje borra todo lo anterior (W06→W08, M06→M08), al recargar no queda nada (W13), y al reabrir la capa del móvil tampoco (M10). La persona ve desaparecer su propia petición, la tarjeta que acaba de confirmar y el «Listo». El único rastro es una fila en la agenda. No hay separador, historial ni registro, aunque el diseño (§4 y §5 de la arquitectura web) preveía las tres cosas.

A eso se suman hallazgos menores de densidad y consistencia: la tarjeta en conflicto repite las alternativas dos veces y en móvil deja de caber (W10, M11); el lienzo no reacciona a lo que pasa en la conversación (W04); la invitación al asistente aparece dos veces en pantalla (W02); por debajo de 1440 px el lienzo cede todo el ancho y la conversación nada (W19); el asa del móvil usa un color que no existe en el resto (M02).

**Conclusión:** los cambios visuales necesarios son pocos y acotados, y **la mayoría son consecuencia directa de la reestructuración de tres capas** ya propuesta (transcripción persistente, episodios, nota de continuidad). No conviene retocar la interfaz antes de decidir eso; sí conviene corregir en paralelo los tres o cuatro detalles de densidad que no dependen de nada (§6, pasos 3 y 7).

---

## 2. Cómo se hizo y qué no se probó

| | Detalle |
|---|---|
| Entorno | Copia del repositorio en un contenedor Linux aparte; PostgreSQL 16 y Redis locales; migraciones aplicadas con `psql` (el binario de Prisma no se podía descargar desde ahí) |
| API | `apps/web/e2e/arrancar-api.mjs`, con dos bases de prueba (`nexoai_e2e_prueba`, `nexoai_e2e_movil_prueba`) y las cuentas de `e2e/cuentas.json`. `MODELO_PROVEEDOR=simulado`, calendario simulado |
| Web | `next dev` en 3101 contra la API en 3102. Chromium de Playwright, 1440×900 y 1024×768 |
| Móvil | `expo start --web` en 3201 contra la API en 3103. Chromium de Playwright emulando 390×844 a escala 2, táctil |
| Frases | Las del guion de demostración (`guion-demostracion.ts`): registrar, consultar, recordar; más «Mejor a las 5», «Agéndame algo con Vasco» y «Mándale un correo a Juan» |
| Anotación | Llamadas numeradas en rojo y leyenda al pie, generadas con un script (`herramientas/anotar.py`) |

**Lo que no se probó y por qué:**

- **Groq.** Gasta cuota y lo que ve el equipo con Groq ya está descrito en `spec.md` §6. El simulado reproduce el mismo ciclo de vida; solo cambia el texto de la respuesta tras el vaciado («No sé hacer eso todavía» en lugar de «¿qué quieres mover?»).
- **Teléfono real con Expo Go.** Pendiente desde T-035. Lo que depende del teclado nativo, el área segura y el gesto de cerrar la capa no se ve en Expo web.
- **Google Calendar real.** No aporta nada visual que el simulado no muestre.
- **Voz.** No existe en el código (PT-2). §7 la trata como diseño.
- **Lienzo en modo Registro, sección Actividad, Tareas.** No existen todavía; se anota su ausencia.

---

## 3. Inventario de capturas

Las anotadas están en `web/` y `movil/`; todas las originales, en `crudo/web/` (W01–W19) y `crudo/movil/` (M01–M16).

| Archivo anotado | Qué muestra | Hallazgos |
|---|---|---|
| `web/W02-blanco-inicial.png` | Tres columnas tras entrar, agenda vacía | 4.3-c, 4.4-a |
| `web/W03-pensando.png` | Mensaje enviado, «Pensando…» | 4.4-b |
| `web/W04-tarjeta.png` | Tarjeta de confirmación | 4.2-a, 4.3-a |
| `web/W06-W08-vaciado.png` | Antes y después: confirmar y escribir el siguiente mensaje | **4.1-a**, 4.3-b |
| `web/W10-conflicto.png` | Conflicto con alternativas; consulta previa | 4.2-b, 4.2-c |
| `web/W13-recarga.png` | Recarga tras cerrar una acción | **4.1-b** |
| `web/W14-pregunta.png` | Dato que falta | 4.4-c |
| `web/W16-en-espera.png` | Tarea en espera | 4.1-d |
| `web/W19-1024.png` | Ancho 1024 | 4.5-a |
| `movil/M02-inicio.png` | Inicio con agenda vacía | 4.4-d |
| `movil/M05-tarjeta.png` | Tarjeta en la capa de captura | 4.2-a, 4.4-e |
| `movil/M06-M08-vaciado.png` | Antes y después en móvil | **4.1-a** |
| `movil/M10-reabierta.png` | Capa reabierta tras cerrar | **4.1-c** |
| `movil/M11-conflicto.png` | Conflicto en móvil | 4.2-b |
| `movil/M15-en-espera.png` | Tarea en espera en móvil | 4.1-d |

---

## 4. Hallazgos por capa de la interfaz

Severidad: **alta** (rompe la continuidad o la confianza), **media** (dificulta o confunde), **baja** (pulido). Cada hallazgo cita su causa en el código o en los documentos, para que el cambio tenga dueño.

### 4.1 Capa de conversación

Lo que la persona ve de lo que pidió y de lo que pasó.

| # | Hallazgo | Severidad | Evidencia | Causa |
|---|---|---|---|---|
| a | **Tras confirmar o descartar, el siguiente mensaje borra toda la conversación.** La petición, la tarjeta y el «Listo» desaparecen de golpe, sin transición ni separador. La persona pierde el hilo justo después de haber hecho algo | **Alta** | W06→W08, M06→M08 | `conversacion.tsx` línea 202 y `captura.tsx` línea 168 (`cerrada ? [provisional] : …`), por REQ-AGT-01 y H-AGT-05 |
| b | **Al recargar la web tras un cierre, vuelve el blanco inicial.** No hay forma de repasar lo pedido ese día | **Alta** | W13 | `GET /asistente/conversacion` solo devuelve la abierta |
| c | **Al cerrar y reabrir la capa del móvil, lo anterior no está.** Solo sobrevive el episodio que no cerró ninguna acción | **Alta** | M10 | Misma causa que b |
| d | **Lo que está en espera solo vive en la conversación**, que se vaciará. No se ve en el lienzo, ni en Tareas, ni en Actividad | Media | W16, M15 | El estado `en_espera` de `operacion` no tiene vista propia; diseño §6 lo asigna al registro, que no existe |
| e | Sin separadores ni fechas entre episodios: aunque se conservaran, hoy no habría cómo distinguir «lo de esta mañana» de «lo de ahora» | Media | W10 (varios episodios seguidos antes de un cierre) | No hay `episodioId` en los turnos del contrato |
| f | El mensaje de la persona lleva hora; las respuestas del asistente no. Al repasar, no se sabe cuánto tardó ni cuándo quedó hecho | Baja | W04, W06 | `Turno` solo pinta `en` en los de tipo `persona` |

### 4.2 Capa de confirmación (la tarjeta)

| # | Hallazgo | Severidad | Evidencia | Causa |
|---|---|---|---|---|
| a | **Bien resuelto:** título con la acción exacta, datos en pares etiqueta–valor, lo que puso el sistema por su cuenta dicho en claro, botones con jerarquía. Igual en web y móvil | — | W04, M05 | `VistaConfirmacion` + `Turno` tipo `propuesta` |
| b | **Las alternativas aparecen dos veces:** como fila de texto corrido con fechas largas repetidas y como botones. En web la tarjeta ocupa toda la columna; en móvil hay que desplazar para ver de qué acción se trata | Media | W10, M11 | La fila «Alternativas» viene en `vistaConfirmacion.datos` **y** `conflicto.alternativas` se pinta como botones. Es cosa de la vista, no del contrato |
| c | En conflicto no hay «Confirmar», pero nada dice «no se puede confirmar en este horario». La persona puede buscar el botón | Baja | W10 | La tarjeta omite el botón sin sustituirlo por una frase |
| d | No hay forma de corregir un dato desde la tarjeta (hora, título): hay que escribir otro mensaje, que descarta la propuesta y vuelve a pasar por el modelo | Media | W11 (propuesta reemplazada) | Decisión de alcance; coherente con P-02, pero cuesta una llamada al modelo por corrección |

### 4.3 Capa de resultado: lienzo en web, agenda de fondo en móvil

| # | Hallazgo | Severidad | Evidencia | Causa |
|---|---|---|---|---|
| a | **El lienzo no reacciona a la propuesta.** Con una tarjeta para el miércoles 23:00, el lienzo sigue en «Hoy no tienes compromisos» en lugar de mostrar el día con el hueco. El diseño §4 lo llama modo Objeto | Media | W04 | `aplicacion.tsx` solo refresca tras `resultado` |
| b | **No existe el modo Registro.** Al cerrar una acción, el diseño dice que «el lienzo conserva lo que acaba de pasar». Hoy solo cambia la lista de Hoy | **Alta** (en combinación con 4.1-a) | W06→W08 | Modo Registro y sección Actividad no implementados; dependen de `evento_auditoria` |
| c | La invitación al asistente está dos veces en pantalla: el blanco de la conversación y el botón «Pedírselo al asistente» del lienzo vacío. Ambas llevan al mismo campo | Baja | W02 | REQ-CUN01-12 pide que el estado vacío lleve al asistente; con la conversación visible al lado, el botón sobra |
| d | En móvil la capa cubre la agenda; el resultado («Revisión» en Hoy) queda detrás hasta cerrar la capa | Baja | M06, M09 | Diseño de la capa de captura (§ móvil); aceptable, pero refuerza que la capa debe conservar su historial |

### 4.4 Capa de entrada

| # | Hallazgo | Severidad | Evidencia | Causa |
|---|---|---|---|---|
| a | Barra de entrada fija al pie, enviar deshabilitado con el campo vacío. Correcto | — | W02 | — |
| b | «Pensando…» es texto plano sin indicador de progreso. Con el simulado dura milisegundos; con Groq, segundos; con un modelo lento, más. No hay respuesta en flujo (H-AGT-07) | Baja ahora, media con un proveedor lento | W03, M04 | `role="status"` con texto; decisión H-AGT-07 |
| c | La pregunta por un dato que falta («¿Qué día?») no ofrece atajos (hoy, mañana, elegir día). La persona vuelve a escribir | Baja | W14, M13 | `preguntar` devuelve solo texto y `campo`; la vista podría usar `campo` para ofrecer opciones generadas por código |
| d | El asa «Pedir algo» del móvil es violeta; el resto de acciones primarias son azules. Dos acentos para la misma acción | Baja | M02 | `tokens.ts` |
| e | «Enviar» en gris claro con el campo vacío se lee como deshabilitado permanente, sobre todo bajo una tarjeta larga | Baja | M05, M11 | Estilo del estado deshabilitado |

### 4.5 Consistencia y anchos

| # | Hallazgo | Severidad | Evidencia | Causa |
|---|---|---|---|---|
| a | A 1024 px la conversación conserva 528 px y el lienzo baja a ~345 px: la agenda se vuelve la columna estrecha. El diseño define 72/528/840 para 1440 y no dice qué ceder por debajo | Media | W19 | `globales.css` línea 186: `72px minmax(300px, 528px) minmax(340px, 1fr)` |
| b | Web y móvil comparten tarjeta, avisos, textos y jerarquía. Es una fortaleza para la sustentación | — | W04/M05, W16/M15 | Contratos compartidos (AD-08) |
| c | El indicador «N» abajo a la derecha es de Next.js en desarrollo; no aparece en producción | — | todas las web | — |

---

## 5. Cómo influye lo visual en el problema del agente

Los dos informes anteriores explican el problema desde el requisito y desde el código. Las capturas muestran **cómo lo vive la persona**, y eso cambia tres cosas en la lectura:

1. **El vaciado no se percibe como «empezar limpio», sino como pérdida.** En W06→W08 la persona acaba de confirmar algo, escribe una corrección y ve desaparecer su propia confirmación. En un producto cuya promesa es «antes de hacer nada que no se pueda deshacer, te lo enseño», que el rastro de lo hecho desaparezca contradice la promesa. No es un detalle de memoria del modelo; es de confianza.

2. **El lienzo no está cumpliendo el papel de memoria que el diseño le dio.** El diseño resolvió la tensión «conversación corta vs. no perder nada» con el par *área de trabajo / registro*. Se construyó el área de trabajo y no el registro. Por eso el vaciado duele: no hay a dónde mirar. Con transcripción persistente (T-038) y, más adelante, el modo Registro, el vaciado deja de ser necesario y el lienzo recupera su función.

3. **Lo que está en espera es invisible fuera de la conversación.** Es la pieza más frágil: una tarea guardada «para una próxima versión» vive en una conversación que se vaciará (W16). Cuando se implemente la transcripción persistente, hay que decidir además una vista de «en espera» (lienzo o Tareas), porque P-11 promete que lo encolado se ve.

Lo demás (alternativas duplicadas, lienzo que no reacciona, anchos, colores) son ajustes de densidad y consistencia que **no dependen de la reestructuración** y pueden ir en paralelo.

---

## 6. Cambios propuestos, paso a paso

Ordenados para que cada paso se vea y se pueda revisar solo. Se indica de qué tarea de `INFORME-ESTRUCTURA-Y-REESTRUCTURACION-AGENTE.md` §6 depende, si depende de alguna. Nada de esto se implementa hasta que el equipo decida y el cambio entre por `spec.md` → `SPEC.md` → plan → tareas.

| Paso | Cambio | Dónde | Depende de | Qué se vería después |
|---|---|---|---|---|
| 1 | **Dejar de vaciar.** Los turnos siempre se añaden; `cerrada` deja de borrar y pasa a pintar un **separador** con hora y resumen de la acción («Dentista registrado · 16:12») | `conversacion.tsx`, `captura.tsx`, contrato `RespuestaAsistente` (`episodioCerrado`, `episodioId` por turno) | T-038 (para que sobreviva a la recarga); puede hacerse antes solo en cliente como prueba de concepto | W08 con la petición, la tarjeta y el «Listo» todavía arriba, un separador y «Mejor a las 5» debajo |
| 2 | **Historial al abrir y «ver anteriores».** La conversación carga la transcripción reciente (últimos 2–3 episodios) y un botón arriba trae los anteriores por páginas. En móvil, la capa abre con el episodio actual y el anterior | `lib/asistente.ts`, `conversacion.tsx`, `captura.tsx`; `GET /asistente/conversacion` paginado | T-038 | W13 y M10 con lo anterior visible tras recargar o reabrir |
| 3 | **Tarjeta en conflicto más corta.** Quitar la fila «Alternativas» en texto; dejar el motivo en ámbar, los botones de alternativa y una frase «No se puede confirmar en este horario». En móvil, el título de la acción fijo arriba de la tarjeta mientras se desplaza | Vista `Turno` tipo `propuesta` en web y móvil | Nada | W10 y M11 con la tarjeta cabiendo sin desplazar |
| 4 | **Lienzo en modo Objeto.** Al llegar una propuesta, el lienzo muestra el día de la propuesta con el hueco o el solape marcado; al confirmar, vuelve a Hoy con la fila nueva resaltada unos segundos | `aplicacion.tsx` (web); en móvil, la agenda de fondo salta al día propuesto | Nada técnico; es una decisión de diseño §4 ya tomada | W04 con el lienzo en el miércoles y la franja 23:00–00:00 marcada |
| 5 | **Vista de «en espera» fuera de la conversación.** Una franja en el lienzo (web) y en Hoy (móvil): «2 cosas en espera», que al abrirse lista lo encolado con su motivo y permite retirarlo (cierra la decisión abierta de `SPEC.md` §8) | Lienzo y pantalla de inicio; `OperacionesService.listar(['en_espera'])` ya existe | T-038 no; decisión del equipo sobre retirar de la cola | W16 con la tarea visible también a la derecha |
| 6 | **Modo Registro del lienzo.** Al cerrar una acción, el lienzo muestra «lo que acaba de pasar» con resultado y hora, y un enlace a Actividad. Es lo que el diseño §4 y §6 ya describen | Lienzo; se apoya en `evento_auditoria` y `operacion` | Sección Actividad (fase posterior) | W06 con el lienzo en modo Registro en lugar de solo la fila en Hoy |
| 7 | **Pulido de entrada:** «Pensando» con un indicador animado y, si pasan más de 3 s, «sigo en ello»; atajos generados por código bajo «¿Qué día?» (Hoy · Mañana · Otro día); asa del móvil en el azul primario; estado deshabilitado de «Enviar» más claro | `conversacion.tsx`, `captura.tsx`, `tokens.ts` | Nada | W03, W14, M02, M05 |
| 8 | **Regla para anchos menores de 1440.** Entre 1024 y 1440, ceder primero la conversación hasta 400 px y después el lienzo; por debajo de 1024, una sola columna con la conversación como capa, como en móvil | `globales.css`; anotar la regla en `ARQUITECTURA-VISUAL-WEB.md` §2 | Decisión de diseño | W19 con el lienzo por encima de 500 px |
| 9 | **Quitar la invitación duplicada.** En web, con la conversación visible, el lienzo vacío solo dice «Hoy no tienes compromisos»; el botón se conserva en móvil, donde la capa está cerrada | `aplicacion.tsx` | Nada | W02 con un solo punto de entrada |

**Qué revisar en cada paso:** antes y después con las mismas frases del guion, en los mismos tamaños, usando `herramientas/capturar-web.mjs` y `capturar-movil.mjs`; las capturas nuevas van a una carpeta con la fecha, sin borrar estas.

---

## 7. Voz (STT): cómo encaja en estas capas

La voz ya está especificada (REQ-CAP-09 a 13) y aplazada (PT-2, decisión 1 de `01-captura`). Lo que sigue es cómo entraría en la interfaz **sin romper lo que las capturas muestran que funciona**, y qué conviene decidir antes de implementarla.

### 7.1 Principio

**La voz es otra puerta de entrada a la misma conversación, no otra conversación.** Lo que se dice por voz se convierte en texto antes de llegar al agente; el agente no sabe que vino de voz. Así:

- Las herramientas, el grafo, la tarjeta y la cola en espera no cambian.
- El texto transcrito es un turno `persona` normal en la transcripción persistente, marcado con su origen (`origen: 'voz'`) para mostrar un icono y para la evaluación.
- El proveedor de reconocimiento de voz vive detrás de un puerto propio, como el modelo (P-06): `ProveedorTranscripcion` con un simulado para pruebas. Nunca un SDK fuera de su módulo.
- El audio **no se guarda** (REQ-CAP-13): solo el texto. La transcripción persistente de T-038 conserva el texto, no el audio.

### 7.2 Estados visibles que faltan hoy

| Estado | Web | Móvil | Requisito |
|---|---|---|---|
| **Listo para hablar** | Un micrófono junto al botón de enviar | El asa «Pedir algo» ofrece dos gestos: toque = texto, mantener = voz | REQ-CAP-01 |
| **Escuchando** | El campo se convierte en una franja con nivel de audio y cronómetro (máximo 5:00, REQ-CAP-09); botón «Parar» | Igual, a pantalla completa dentro de la capa | REQ-CAP-09 |
| **Transcribiendo** | «Transcribiendo…» con indicador; se puede cancelar | Igual | — |
| **Transcripción editable** | El texto aparece **en el campo de entrada**, no enviado todavía, con el icono de voz. La persona lo corrige y pulsa Enviar. **Nada se manda al agente sin este paso** | Igual | **REQ-CAP-12** (corregir antes de registrar) y P-03 |
| **Varias intenciones** | Si la nota trae más de una, el campo muestra una **lista de líneas**, cada una con su casilla: la persona quita las que no quiere y envía las demás **una a una** | Igual | **REQ-CAP-10**; ver 7.3 |
| **Dudoso** | Una línea marcada «¿oí bien?» con lo que se oyó, que hay que confirmar o corregir antes de enviar | Igual | REQ-CAP-11 |
| **Sin conexión** | El audio se transcribe cuando vuelva la red o, si hay reconocimiento en el dispositivo, al momento; lo pendiente se ve como «en espera» | Igual | REQ-CAP-22, REQ-CAP-24 |

Lo esencial es la fila «Transcripción editable»: convierte la voz en **texto que la persona aprueba**, y a partir de ahí todo es el flujo de hoy. Es lo que hace que la voz no añada riesgo de alucinación: el agente recibe exactamente lo que la persona dejó escrito.

### 7.3 Un choque que hay que resolver en la especificación

REQ-CAP-10 dice que una nota con varias intenciones se presenta como lista y **cada elemento se acepta o descarta por separado**. El grafo actual impone **una acción a la vez** (`UNA_ACCION_A_LA_VEZ`, T-032) y una sola tarjeta pendiente por conversación. Son compatibles solo si la lista de intenciones se resuelve **antes** del agente (la persona elige qué líneas enviar, y se envían en secuencia, cada una con su tarjeta) y no dentro de él. Conviene registrarlo como hallazgo en `01-captura` cuando se planifique la voz, porque decide dónde vive la separación de intenciones: en el cliente, en un paso de «segmentación» del agente, o en el modelo de lenguaje con una herramienta nueva.

### 7.4 Dónde vive el reconocimiento

| Opción | A favor | En contra |
|---|---|---|
| **En el dispositivo** (reconocimiento del sistema: iOS, Android, Web Speech API) | Sin costo, sin enviar audio a nadie (minimización, P-10), funciona sin red en algunos dispositivos | Calidad variable en español; Web Speech API no está en todos los navegadores; cada plataforma con su API |
| **En el servidor** (proveedor de transcripción detrás del puerto) | Calidad uniforme, un solo adaptador, se puede evaluar con un conjunto fijo de audios | Costo por minuto, el audio sale del dispositivo, latencia |
| **Híbrido** | Dispositivo por defecto; servidor cuando no hay reconocimiento local o la persona lo pide | Dos caminos que probar |

Recomendación para decidir después: empezar por el **dispositivo** en el móvil (donde está la capa de captura y donde la voz tiene más sentido) y dejar la web para después, con el puerto preparado para un proveedor en servidor. La evaluación (`evaluar-asistente`) no cambia: evalúa texto.

### 7.5 Qué cambiaría en los documentos cuando se retome

- `specs/01-captura/plan.md` (no existe aún): puerto `ProveedorTranscripcion`, estados de 7.2, segmentación de intenciones (7.3), política de audio (7.1).
- `design/ARQUITECTURA-VISUAL-MOVIL.md`: los estados del asa y de la capa.
- `specs/07-agente/spec.md`: nada, salvo el hallazgo de 7.3 si se decide que la segmentación vive en el agente.

---

## 8. Decisiones para el equipo

1. **Confirmar que los pasos 1 y 2 de §6 van con T-038/T-039** y no antes, para no hacer dos veces el trabajo del cliente.
2. **Si los pasos 3, 7 y 9 (densidad y consistencia) se adelantan** como una tarea pequeña de interfaz, independiente del agente.
3. **Dónde se ve lo que está en espera** (paso 5): lienzo, Tareas o ambos.
4. **Regla de anchos menores de 1440** (paso 8), para `ARQUITECTURA-VISUAL-WEB.md`.
5. **Voz:** confirmar el principio «voz → texto aprobado → mismo flujo» (7.1 y 7.2) y dónde vive la separación de intenciones (7.3), antes de abrir el plan de `01-captura`.
6. **Probar en teléfono real** antes de cerrar cualquiera de los pasos del móvil.

---

## 9. Cómo repetir el recorrido

Los scripts de `herramientas/` corrieron en un contenedor Linux; en Windows cambian solo las rutas y el arranque de la base.

1. Levantar la API de pruebas de la web: desde `apps/web`, `PUERTO_API_E2E=3102 node e2e/arrancar-api.mjs` (usa `DATABASE_URL_PRUEBA` del `.env` y el simulado).
2. Levantar la API del móvil: desde `apps/movil`, con `PUERTO_API_E2E=3103 BASE_E2E=nexoai_e2e_movil_prueba CUENTAS_E2E=e2e/cuentas.json CORS_ORIGENES=http://localhost:3201`.
3. `npx next dev -p 3101` con `API_URL=http://localhost:3102`; `npx expo start --web --port 3201` con `EXPO_PUBLIC_API_URL=http://localhost:3103`.
4. `node herramientas/capturar-web.mjs` y `node herramientas/capturar-movil.mjs` (necesitan `playwright` resoluble; el del monorepo sirve). Dejan las capturas en `salida/`.
5. `python herramientas/anotar.py` genera las anotadas. Las llamadas tienen coordenadas fijas: si cambia la interfaz, se ajustan en el script.

`herramientas/arrancar-api-local.mjs` es la variante usada en el contenedor (migraciones con `psql`); en el equipo del proyecto no hace falta.
