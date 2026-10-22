# Análisis de flujo y parametrización — y el cajón lateral

**Proyecto:** NexoAI · Diseño de Software · Entregable 2
**Archivo:** `mgmuPhGwkmvfhz7xk0QPl5`, página `07 Móvil v2 · Flujo revisado`
**Fecha:** 22 de octubre de 2026
**Medido sobre:** 54 cuadros, 3.142 nodos

> **Nota del 22 de octubre, al cierre.** La página sobre la que está medido este análisis se llamaba `07 Móvil v2 · Flujo revisado` y era una copia de trabajo. **Pasa a ser la página vigente del móvil** y hereda el nombre `07 Móvil v2 · Estructura y recorrido`; la que llevaba ese nombre queda como `07x Móvil v2 · versión anterior · no usar`. El marco contenedor se llama ahora `MOV-v2 · Recorrido completo`.

---

## 1. El tramo de acceso, completado

Los tres cuadros ya estaban construidos en la copia de trabajo. Lo que faltaba era el camino cuando algo no sale bien.

### 1.1 Una corrección antes de añadir nada

`Primer ingreso` pedía **FRANJA LABORAL** como campo editable. Eso contradice **R-44**, acordado la semana pasada: *la franja horaria de trabajo es parámetro de la plataforma, no dato del perfil.* Venía de `06-acceso` REQ-ACC-04, que ya se corrigió, pero el boceto se había quedado con la versión antigua.

Ahora la franja aparece como **nota informativa**, no como campo: «Las reuniones se proponen de 08:00 a 20:00. Esa franja la fija la plataforma, no tu perfil.» Y el subtítulo deja de prometer tres pasos, porque son dos.

### 1.2 Las tres ramas nuevas

| Cuadro | Qué resuelve |
|---|---|
| **Credenciales incorrectas** | `REQ-ACC-03`. Dice que no coinciden sin revelar si el correo existe. Campo en rojo y aviso, nada más |
| **Contraseña olvidada** | Hallazgo 2.8 de inconsistencias, y el pendiente que `06-acceso` §4 ya anotaba. Enlace que caduca en una hora, y una nota: si el correo no está en la organización tampoco se dice |
| **Sin Google** | `REQ-ACC-08`. Qué sigue funcionando y qué no, en dos listas. Y la promesa de no insistir: «te lo recuerdo solo cuando lo intentes» |

La banda `Ruta ACCESO` ya declara las tres ramas.

---

## 2. Análisis del flujo · qué deriva en qué

La copia de trabajo declara **nueve rutas** en bandas de texto sobre el lienzo. Eso ya es más de lo que suele tener un boceto: el recorrido está escrito, no solo dibujado.

### 2.1 Mapa de derivaciones

| Origen | Deriva a | Cómo se vuelve |
|---|---|---|
| **Agenda · Hoy** | Semana · Mes *(selector)* · capa de captura *(asa)* · Ajustes *(engranaje)* · Día 01–04 *(estados del propio día)* | El selector no vuelve: cambia de nivel |
| Agenda · Mes | Un día cualquiera | `‹` |
| Agenda · Semana | Mis rutinas → Rutina recolocada | `‹` |
| **Tareas · Lista** | Hilo de una tarea | `‹ Tareas` |
| Hilo de una tarea | Puerta a la llamada → Llamada preparada → Al colgar | capa, cierra al confirmar |
| **Actividad · Día** | Semana · Mes *(selector)* · Registro del asistente *(enlace al pie)* | `‹ Tu semana` |
| Actividad · Mes | Revisar los jueves | `‹` |
| **Ajustes · Portada** | Perfil y horario · Categorías · Conexiones · Plan | `×`, no `‹` |
| **Capa de captura** | Hablar → Grabando → Extracciones → Confirmar · Foto → Revisión · Tarea → Confirmar · Comando → `/hice`, `/correo`, `/cerrar-día` | vuelve a la sección de origen |
| Día · Plan propuesto | Día real → Cierre del día → Día cerrado | lineal |

**La respuesta a tu pregunta es que sí: Agenda · Hoy deriva a seis sitios distintos**, y son de tres clases que no se pueden confundir —cambio de nivel (selector, no vuelve), bajada (`‹`, vuelve), y capa (se cierra y te deja donde estabas)—. Esa distinción ya está respetada en los cuadros; lo que no estaba era escrita. Queda arriba.

### 2.2 Lo que el mapa deja ver

**Hoy es el nudo del grafo.** Seis salidas, y además es a donde vuelven la capa de captura y las cuatro pantallas de Día. Si algo se rompe ahí, se rompe el recorrido entero.

**Ajustes es el único sitio que sale con `×` y no con `‹`.** Es correcto —no cuelga de ninguna sección, R-43— pero conviene que sea la única excepción, porque dos formas de salir es lo máximo que una aplicación puede enseñar sin confundir.

**El selector no es navegación, es zoom.** Por eso no tiene vuelta. Mezclarlo con las bajadas en el mismo mapa es lo que hacía que el flujo pareciera incoherente.

---

## 3. Parametrización · la mitad está hecha

Aquí está el hallazgo que importa, y es una mitad muy limpia y otra muy sucia.

### 3.1 El color está perfecto

**1.825 rellenos, los 1.825 atados a una variable. Cero valores sueltos.** No hay nada que arreglar.

### 3.2 La tipografía no está parametrizada en absoluto

| Medida | Valor |
|---|---|
| Estilos de texto en el archivo | **0** |
| Textos que usan un estilo | **0 de 1.169** |
| Variables `tam/` definidas | 6 |
| Combinaciones de tamaño y peso **realmente en uso** | **19** |

Hay seis tamaños declarados —`titulo`, `subtitulo`, `cuerpo-grande`, `cuerpo`, `etiqueta`, `micro`— y el boceto usa diecinueve combinaciones distintas, todas escritas a mano. Las de la cola larga delatan la deriva: `12/Bold` dos veces, `14/Bold` una, `16/Bold` una, `26/Regular` siete, `22/Bold` cuatro.

**Cambiar el tamaño del cuerpo hoy significa tocar 210 nodos a mano.**

La forma de arreglarlo es crear seis u ocho **estilos de texto** y aplicarlos, no atar variables numéricas al `fontSize`: un estilo lleva tamaño, peso e interlineado juntos, que es lo que de verdad se repite.

### 3.3 El espaciado tampoco

Hay diez variables `esp/` definidas y **ninguna atada**: todos los `itemSpacing` y `padding` son números escritos a mano.

### 3.4 Los componentes cubren el 8 % de los nodos

189 instancias sobre 2.496 nodos. Y hay patrones hechos a mano que se repiten muchísimo:

| Repeticiones | Patrón | Debería ser |
|---|---|---|
| 73× | `Línea` | **Fila con chevron** — la unidad de toda lista |
| 35× | `Celda` + `Num` + `Puntos` | **Celda de calendario** del mes |
| 29× | `Tarjeta` | **Tarjeta de grupo** |
| 26× | `Selector` + sus tres segmentos | **Selector de período**, que además aparece en las dos plataformas |
| 19× | `Capa de captura` | **Capa**, con su velo y su asa |
| 36× | `Encabezado` | **Cabecera de sección** |
| 13× | `Métrica` + `Pista` | **Barra con denominador** |

**Siete componentes nuevos absorberían 231 repeticiones.** El selector es el más rentable: 26 usos, idéntico en móvil y en web, y es la pieza que más veces se ha tocado a mano en las últimas iteraciones.

### 3.5 Orden recomendado

1. **Estilos de texto** — seis u ocho, aplicados a los 1.169 textos. Es lo que más duele hoy.
2. **Selector de período** como componente, compartido entre plataformas.
3. **Fila con chevron** — 73 usos y es la unidad de Ajustes, Tareas y Conexiones.
4. **Celda de calendario**, **Tarjeta**, **Cabecera**, **Barra con denominador**.
5. **Atar el espaciado** a las variables `esp/` ya definidas.

---

## 4. El cajón lateral · propuesta

Referencia: el cajón de ChatGPT y Perplexity en móvil — se desliza desde el borde izquierdo, lleva el historial agrupado por fecha y, al pie, la cuenta.

### 4.1 Lo que NO puede llevar, y por qué

**Historial de conversaciones, no.** Nuestra conversación es **efímera por decisión**: la capa se descarta al confirmar, y eso es lo que mantiene al agente con poco contexto y un propósito claro (**R-24**, **R-39**). Un cajón de conversaciones pasadas reintroduce exactamente lo que quitamos, y con ello el riesgo de alucinación que el diseño evita hoy.

Copiar el patrón sin copiar el contenido es la única forma de que sume.

### 4.2 Lo que sí debería llevar

Hay algo persistente, con propósito acotado y que hoy no tiene índice: **los hilos**.

```
┌──────────────────┐
│  Buscar          │
│                  │
│  EN CURSO        │
│  · Correo a Juan │
│    sin enviar    │
│  · Rutina del    │
│    jueves        │
│                  │
│  HILOS ABIERTOS  │
│  · Presupuesto   │
│    del taller    │
│    hace 5 días   │
│  · Informe de    │
│    cierre        │
│                  │
│  ESTA SEMANA     │
│  · …             │
├──────────────────┤
│  ⚙ Ajustes       │
│  franco@utec     │
└──────────────────┘
```

- **En curso** — lo que el asistente prepara o tiene en cola. Es lo que hoy solo se ve si estás en la pantalla correcta.
- **Hilos abiertos** — uno por tarea compartida, agrupados por antigüedad como agrupa ChatGPT por fecha. Esto es **R-39 hecho navegable**: cada hilo es contexto acotado con un propósito, no una conversación suelta.
- **Al pie, la cuenta y Ajustes.**

### 4.3 Lo que esto arregla de paso

**El cajón resuelve el problema de Ajustes mejor que el parche actual.** Hoy Ajustes entra por un engranaje repetido en doce cabeceras, y tuvimos que inventar R-43 —sin barra de pestañas, salida con `×`— precisamente porque no cuelga de ninguna sección. Con el cajón, Ajustes vive al pie del cajón, que es donde vive en todas las aplicaciones que usan este patrón, y el engranaje desaparece de las cabeceras.

### 4.4 Lo que NO recomiendo

**Que el cajón sustituya a las pestañas.** ChatGPT puede permitírselo porque solo tiene un destino. Nosotros tenemos tres secciones que se usan constantemente, y esconderlas tras un toque es pagar un peaje en cada cambio. Las pestañas y el cajón son **dos ejes distintos**: las pestañas dicen *dónde estás*, el cajón dice *qué tienes en marcha*.

### 4.5 La regla que hace falta antes de dibujarlo

El cajón y la capa de captura son los dos capas sobre la sección, con entradas en bordes opuestos —asa abajo a la derecha, cajón desde la izquierda—.

> **Nunca las dos a la vez.** Abrir una cierra la otra. Dos capas superpuestas no tienen antecedente visible, y el antecedente es lo que hace que una capa se lea como capa.

### 4.6 Cómo se parametriza

| Pieza | Qué es |
|---|---|
| `Móvil / Cajón` | Componente con variantes **Cerrado · Abierto** |
| `Móvil / Fila de hilo` | Variantes por estado: **En curso · Esperando · Sin leer** |
| Velo | El mismo de la capa de captura, `superficie/velo` al 0,16 |
| Ancho | Variable nueva `ancho/cajon`, junto a las tres de la web |
| Asa | El gesto de borde, más una marca en la cabecera |

Se apoya en lo que ya existe: velo, variables de color, y el patrón de capa con antecedente visible.

---

## 5. Qué decidir

1. **¿Se dibuja el cajón?** Serían tres cuadros: cerrado con la marca en la cabecera, abierto, y el hilo abierto desde él.
2. **Si entra, ¿el engranaje sale de las doce cabeceras?** Si Ajustes vive al pie del cajón, el engranaje sobra y R-43 se simplifica.
3. **¿Se hacen los estilos de texto antes o después?** Hacerlos antes significa que todo lo nuevo nace parametrizado; después significa migrar 1.169 textos.
