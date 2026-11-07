# Auditoría visual — La conversación en la capa del móvil

**Fecha:** 7 de noviembre de 2026
**Alcance:** la capa de captura del móvil tal como está en `base-tanda2` (tras T-039 y el pulido del 6 de noviembre de 2026), en 390 × 844. Material: `design/capturas/2026-11-04/movil/` y `crudo/movil/`, `design/capturas/2026-11-06-pulido/movil/`, `design/capturas/2026-11-06-t039/movil/` y las capturas «antes» del carril de código (`/home/claude/capturas/salida/movil-chat/antes/`, revisadas al empezar y a mitad del trabajo; en las dos visitas eran las del pulido del 6 de noviembre).
**Qué es:** evidencia y propuesta. **No es especificación.** No se cambió código. Las reglas que salen de aquí están en `design/ARQUITECTURA-VISUAL-MOVIL.md`, «Revisión del 7 de noviembre de 2026».
**Cómo se midió:** sobre los píxeles de las capturas (transiciones de color en una columna) y con el alto de la caja de la tarjeta de las capturas de elemento del carril de código, comprobado sumando filas. Contrastes con la fórmula de WCAG 2.2 sobre los valores de `tokens.ts`.
**Cómo repetirlo:** `python3 -I herramientas/anotar-auditoria.py <raíz del repositorio> <carpeta «antes»>`. Usa las funciones de `design/capturas/2026-11-04/herramientas/anotar.py` sin cambiarlas.

---

## Índice

1. [Resumen](#1-resumen)
2. [Capturas anotadas](#2-capturas-anotadas)
3. [Medidas](#3-medidas)
4. [Hallazgos](#4-hallazgos)
5. [Lo que se conserva](#5-lo-que-se-conserva)
6. [Reparto por carril](#6-reparto-por-carril)

---

## 1. Resumen

La capa hace bien lo que T-039 le pidió: no se vacía, separa los episodios y trae lo anterior. Lo que falla es **la disposición**: una sola petición con cruce llena la pantalla (659 px de 844), la capa cambia de alto con cada turno y, cuando llega arriba, corta la cabecera de la sección, que se sigue leyendo a través del velo. La barra de escritura gasta 160 px en dos filas. El título invita a empezar aunque ya se esté decidiendo algo.

Hay además un riesgo que no está en las capturas sino en el encargo de hoy: **plegar la tarjeta puede hacer desaparecer lo que P-03, P-05 y REQ-CUN01-01 exigen ver antes de confirmar** (MC-17 y MC-18). La revisión del documento fija qué no se pliega nunca.

---

## 2. Capturas anotadas

| Archivo | Qué muestra | Hallazgos |
|---|---|---|
| `anotadas/A1-capa-conflicto.png` | Tarjeta con cruce en la capa, estado actual | MC-01 a MC-07 |
| `anotadas/A2-medida-tarjeta.png` | La tarjeta entera frente a la pantalla, a la lista y al tope del 40 % | MC-01 |
| `anotadas/A3-tarjeta-sin-cruce.png` | Tarjeta sin cruce (4 de noviembre; no ha cambiado) | MC-01, MC-03, MC-17, MC-18, MC-19 |
| `anotadas/A4-capa-con-historia.png` | Capa reabierta tras T-039, con dos episodios | MC-05, MC-08, MC-09, MC-10, MC-16 |
| `anotadas/A5-asa-y-seccion.png` | Agenda, nivel Hoy, con la franja en espera y el asa | MC-11, MC-12, MC-13 |
| `anotadas/A6-pensando.png` | Mensaje enviado, esperando al asistente | MC-10, MC-15, MC-19 |

---

## 3. Medidas

En 390 × 844, sobre `movil-conflicto-despues.png` salvo donde se indica.

| Medida | Valor | % del alto |
|---|---|---|
| Borde superior de la capa en su alto máximo (92 %) | y = 68 | — |
| Cabecera de la capa (título y «Cerrar») | de 84 a 128 | 5 % |
| Lista de la capa con la tarjeta de cruce | de 140 a 672: 532 px | 63 % |
| **Tarjeta con cruce y tres alternativas, hoy** | **659 px** (empieza en y = 12, detrás de las dos cabeceras) | **78 %** |
| Tarjeta con cruce antes del pulido | 699 px | 83 % |
| Tarjeta sin cruce (M05) | 416 px | 49 % |
| Tarjeta ya confirmada (A-M06) | 314 px, más 83 px del «Listo» | 47 % las dos |
| Fila «Alternativas» en texto | unos 100 px (cuatro líneas y su etiqueta) | 12 % |
| Barra de escritura | campo 72 + separación 12 + «Enviar» 44 + margen inferior 32 = 160 px | 19 % |
| Borde superior de la capa según el turno | 524 (mensaje enviado), 130 (tarjeta sin cruce), 68 (con cruce) | — |
| **Tope propuesto para la tarjeta plegada con una alternativa** | **338 px** | **40 %** |

Contrastes (WCAG 2.2):

| Par | Contraste | Mínimo |
|---|---|---|
| Título de la sección a través del velo (0,4) | 6,7:1 | — (se lee: ese es el problema) |
| `texto/suave` sobre `superficie/base` | 5,3:1 | 4,5:1 |
| `estado/advertencia` sobre `superficie/base` (línea de cruce) | 5,0:1 | 4,5:1 |
| Blanco sobre `borde/fuerte` («Enviar» vacío) | 1,7:1 | exento si está deshabilitado |
| `borde/fuerte` sobre `superficie/base` (contorno del campo) | 1,7:1 | 3:1 para el límite de un control |
| `estado/exito` sobre `#E6F4EC` («Listo») | 4,4:1 | 4,5:1 |
| `#7A4F00` sobre `#FDF3E0` (en espera) | 6,5:1 | 4,5:1 |

---

## 4. Hallazgos

Severidad: **alta** (rompe una regla de confirmación o deja decidir sin ver qué), **media** (dificulta o confunde), **baja** (pulido). «Hoy» es el carril de código de hoy (`ENCARGO-MOVIL-CHAT-CODIGO.md`); «futuro», otro carril; «decisión», del equipo.

| # | Captura | Qué pasa | Por qué importa | Regla o requisito | Sev. | Quién |
|---|---|---|---|---|---|---|
| MC-01 | A1, A2, A3 | La tarjeta con cruce mide 659 px (78 % del alto) y la lista solo tiene 532: no cabe. Sin cruce, 416 px (49 %) | Una petición tapa la conversación: no se ve lo que se pidió ni lo anterior. Es lo que el equipo vio el 7 de noviembre | REQ-CAP-01 (la tarjeta); diseño móvil §2 (la capa); revisión del 7 de noviembre, tope del 40 % | Alta | Hoy |
| MC-02 | A1, A6 | La capa llega a y = 68 y corta la cabecera de la sección: «Agenda» y «Ajustes» se leen a través del velo (6,7:1) y «Lo que va a pasar» queda partido | Dos cabeceras a la vez; no se sabe cuál manda. Con la capa baja (A6) la sección se ve entera y no molesta: el problema es el corte, no el antecedente | Diseño móvil §2, «El fondo de la capa es el antecedente» | Media | Hoy |
| MC-03 | A1, A3 | La barra de escritura son dos filas: campo de 72 px y «Enviar» a ancho completo; 160 px con márgenes | Un 19 % del alto fijo que no es conversación, y más cuando suba el teclado | Revisión del 7 de noviembre, barra de una fila | Media | Hoy |
| MC-04 | A1 | «Enviar» vacío: blanco sobre gris claro (1,7:1) | Se lee como deshabilitado para siempre (ya visto en 4.4-e del 4 de noviembre) | Diseño móvil §3, botones | Baja | Hoy (desaparece con la barra de una fila) |
| MC-05 | A1, A4 | El título es «¿Qué hacemos?» siempre, también con una propuesta abierta o sobre dos episodios | El título invita a empezar cuando se está a mitad de algo, y no dice de qué va lo que se lee | Revisión del 7 de noviembre, título según el episodio | Media | Hoy |
| MC-06 | A1 | La fila «Alternativas» repite en texto (unos 100 px) los tres botones que vienen debajo | Duplica lo que hay que decidir y empuja la tarjeta. Ya visto el 4 de noviembre (4.2-b); el pulido no lo quitó | Decisión 27 de `02-agenda` (las alternativas, cada una para elegirla); REQ-CUN01-05 | Media | Hoy en la vista; futuro en la API, que no debería mandarla (afecta a la web) |
| MC-07 | A1 | La lista baja hasta el final; con una tarjeta más alta que la lista, lo primero visible son datos sueltos y botones, y la acción («Registrar…») queda arriba, fuera | Se puede decidir sin ver qué acción se decide | P-03 (mostrar la acción exacta antes de ejecutarla) | Alta | Hoy (la tarjeta plegada cabe; regla de colocación en la revisión) |
| MC-08 | A4 | La tarjeta ya confirmada conserva todos los datos (314 px) y nada dice que ya se decidió | Lo decidido ocupa lo mismo que lo pendiente; al repasar no se distingue | REQ-AGT-03 (la transcripción se lee); diseño móvil §3, borde graduado | Media | Futuro (la revisión fija que lo decidido se pinta plegado) |
| MC-09 | A4 | «Listo» repite fecha y hora con «de 10:00 – 11:00» y paréntesis dentro de paréntesis | Redundante con la tarjeta y mal escrito | R-40; estilo de `AGENTS.md` | Baja | Futuro (lo arma la API) |
| MC-10 | A4, A6 | El contorno del campo da 1,7:1 frente al blanco; el verde del «Listo» sobre su tinte, 4,4:1. Los tintes de resultado y espera son valores sueltos en el código, no tokens | El campo casi no se distingue del fondo; el texto de éxito queda justo por debajo del mínimo | WCAG 2.2, 1.4.3 y 1.4.11; regla de tokens del encargo común | Baja | Decisión (token de contorno de campo y tintes de estado) y futuro |
| MC-11 | A5 | El selector Hoy · Semana · Mes mide 36 px de alto | Por debajo de los 44 px de área táctil que exige el resto del móvil | `componentes.tsx` (44 px mínimo, T-028) | Baja | Futuro |
| MC-12 | A5 | El asa no indica si hay una propuesta esperando decisión | Una tarjeta abierta solo se descubre abriendo la capa; puede caducar a las 24 horas sin que se vea (decisión 28 de `07-agente`) | Revisión del 7 de noviembre, asa con indicador | Media | Hoy, si se sabe sin otra llamada; si no, futuro |
| MC-13 | A5 | El asa es una píldora «Pedir algo» de 48 px en `agente/base`; el documento dice botón redondo de 56 con signo | Documento y código no dicen lo mismo | Diseño móvil §2 y §3 | Baja | Decisión (cuál vale; anotar en `SPEC.md` §9) |
| MC-14 | — (código) | El velo es un valor suelto, opacidad 0,4; el documento dice 0,16 sobre `superficie/velo`, y ese token no existe en `tokens.json` ni en `tokens.ts` | Nadie puede subirlo o bajarlo con criterio; hay tres valores distintos según dónde se mire | Diseño móvil §2; regla de tokens | Baja | Hoy (token) y decisión (valor) |
| MC-15 | A6 | «Pensando…» aparece entre la lista y la barra y la empuja unos 32 px | La barra salta dos veces por mensaje | Revisión del 7 de noviembre, barra fija | Baja | Hoy (va como último elemento de la lista) |
| MC-16 | A4 | El primer separador pasa por debajo de la cabecera sin límite y se lee cortado | La cabecera y la lista no tienen frontera | Revisión del 7 de noviembre, cabecera fina con línea | Baja | Hoy |
| MC-17 | A3 | La acción de la tarjeta («Registrar este compromiso en tu calendario de Google») no dice cuál; el nombre del compromiso solo está en el dato «Título» | Si al plegar solo se ve la acción y una línea de fecha, la persona confirma sin ver qué compromiso | P-03; REQ-CAP-01 | Alta | Hoy (la línea esencial empieza por el qué) |
| MC-18 | A3 | La zona horaria y «porque no indicaste la hora de fin» van como datos apilados; la línea esencial que propone el encargo de código («sáb 7 nov · 10:00 – 11:00 · 1 h») los pierde | Sin zona se rompe P-05; sin la marca de lo supuesto se rompe REQ-CUN01-01 (decisión 19: la tarjeta lo dice) | P-05; REQ-CUN01-01 | Alta | Hoy (no se pliegan nunca) |
| MC-19 | A3, A6 | El borde de la capa cambia con cada turno: 524, 130, 68 | La pantalla salta en cada respuesta y la cabecera de la sección se ve, se corta o se tapa según el turno | Revisión del 7 de noviembre, dos altos de la capa | Media | Hoy |

---

## 5. Lo que se conserva

- **Separadores y «Ver anteriores»** (T-039): la forma es buena. Solo cambian de sitio dentro de la nueva estructura.
- **Línea de cruce en una frase** (decisión 27 de `02-agenda`): ocupa 20 px y nombra la causa. Es el modelo de lo que debe ser la línea esencial.
- **El aviso de en espera** (6,5:1) y su diferencia con el fallo (REQ-CAP-23).
- **«Cerrar» y los botones de 44 px** de la capa.
- **La capa baja con la sección entera detrás** (A6): es el antecedente del §2 funcionando.

---

## 6. Reparto por carril

| Quién | Hallazgos |
|---|---|
| Carril de código de hoy | MC-01, MC-02, MC-03, MC-04, MC-05, MC-06 (vista), MC-07, MC-12 (si es posible), MC-14 (token), MC-15, MC-16, MC-17, MC-18, MC-19 |
| Carril futuro | MC-06 (API), MC-08, MC-09, MC-10, MC-11, MC-12 (si necesita otra llamada) |
| Decisión del equipo | MC-10 (tokens), MC-13, MC-14 (valor del velo) |
