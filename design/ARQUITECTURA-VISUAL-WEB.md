# Arquitectura visual — plataforma web

**Estado:** aprobada el 26 de septiembre de 2026. Sustituye la jerarquía con la que se generaron los 20 cuadros existentes de CUN-07 y CUN-05.
**Lectura obligatoria** antes de generar cualquier cuadro web. `CONTEXTO.md` apunta aquí.

---

## 1. Por qué se cambia

Los 20 cuadros web actuales están construidos con la jerarquía del móvil: la conversación manda y el trabajo aparece al costado, dentro de una sola columna de 1200 px junto a una navegación de 240 px con texto.

En 1440x900 eso desperdicia la pantalla y, sobre todo, contradice el trabajo del actor. El Gerente no conversa: mira estado. Un chat no deja ver estado.

---

## 2. Las tres columnas

```
┌────────┬──────────────────────┬─────────────────────┐
│  Nav   │   Conversación       │   Lienzo            │
│ 72 px  │      528 px          │      840 px         │
│        │                      │                     │
│ Solo   │ Las tarjetas SON la  │ Contexto vivo: lo   │
│ iconos │ interfaz: propuesta, │ que la conversación │
│        │ confirmación,        │ manipula, y el      │
│        │ resultado            │ registro de lo ya   │
│        │                      │ cerrado             │
│        │ DESECHABLE           │ MEMORIA             │
└────────┴──────────────────────┴─────────────────────┘
```

| Columna | Ancho | Papel | Duración de su contenido |
|---|---|---|---|
| Navegación | 72 | Cambiar de sujeto — tres secciones y Ajustes al pie | Permanente |
| Conversación | 528 | Área de trabajo | ~~Efímera: se vacía al cerrar~~ **Desde el 5 de noviembre de 2026 (avalada, REQ-AGT-03):** conserva la transcripción, con separadores entre episodios |
| Lienzo | 840 | Contexto y memoria | Persistente |

72 + 528 + 840 = 1440. El 528 mantiene la columna de tarjetas en ancho legible; el 840 es el mínimo donde la rejilla de disponibilidad sigue cabiendo.

### Anchos menores de 1440

*Añadido el 5 de noviembre de 2026, con el valor por defecto de `TRASPASO-CLAUDE-CODE.md` §7, decisión 10. Avalado por el equipo el 5 de noviembre de 2026. Responde a H-WEB-01 (`SPEC.md` §8).*

| Ancho | Qué hace |
|---|---|
| 1440 o más | 72 · 528 · resto |
| De 1024 a 1440 | **Cede primero la conversación**, hasta 400 px; después, el lienzo, que no baja de 500 px |
| Menos de 1024 | Una sola columna: el lienzo, con la conversación como capa encima, igual que en el móvil (R-36) |

### La regla que lo sostiene todo

**Un solo sujeto a la vez.** El lienzo muestra el sujeto de la operación en curso o, si no hay ninguna, el de la última cerrada. Nunca muestra algo que la conversación no esté tratando.

Esto no es una recomendación de cuidado: es lo que hace **estructuralmente imposible** que las dos columnas se contradigan. No hay que evitar los casos contradictorios uno por uno; no existen.

---

## 3. Estados de disposición

Dos, no tres.

| Estado | Nav | Conversación | Lienzo |
|---|---|---|---|
| **Normal** | 72 | 528 | 840 |
| **Lienzo expandido** | 72 | 0 | 1368 |

El usuario expande y contrae el lienzo. **No existe el estado inverso** —conversación expandida, lienzo colapsado—, y es una decisión, no un olvido: si el lienzo es la memoria, esconderlo es esconder el resultado; y una conversación más ancha invita a acumular turnos, que es justo el problema que la sección 5 resuelve.

Los anchos viven en la colección de variables `Disposición`, con un modo por estado. Cambiar de estado es cambiar de modo, no reescribir el cuadro.

---

## 4. El lienzo tiene dos modos

| Modo | Muestra | Cuándo |
|---|---|---|
| **Objeto** | El día, la agenda, la rejilla de disponibilidad, la lista del equipo, la tarea abierta | Mientras hay una operación en curso |
| **Registro** | Lo que el asistente hizo, con su resultado | Al cerrar una operación, y desde la navegación |

El paso de uno a otro es automático: cuando la conversación se cierra, el lienzo conserva lo que acaba de pasar. **El lienzo es la memoria, la conversación es el área de trabajo.**

### Estado inicial del lienzo

Cuando no hay nada que mostrar, el lienzo no queda en blanco: presenta ejemplos de lo que se puede pedir. Y ese estado **no puede parecerse** al de «no hay datos» ni al de «sin resultados».

---

## 5. Ciclo de vida de la conversación

El modelo de lenguaje no puede cargar contexto indefinido, así que la conversación es deliberadamente corta y desechable. Esto no es una limitación disimulada: es la separación que ya declara la propuesta técnica en §7.4, donde la conversación son «turnos recientes» y lo operativo vive en las tablas del dominio.

**El vaciado lo decide el usuario, no el sistema**, y siempre con advertencia previa. La advertencia dice qué se pierde concretamente —«se descartará la delegación a María Fernanda Quispe, sin confirmar»—, nunca «¿estás seguro?». Eso lo exige RN-ER-03, que `CONTEXTO.md` ya recoge.

Lo cerrado no se pierde al vaciar: queda en el registro.

> **Anterior.** Los tres párrafos de arriba son la versión del 26 de septiembre de 2026. Se conservan como registro.

### Revisión del 5 de noviembre de 2026 — la conversación conserva la transcripción

*Avalada por el equipo el 5 de noviembre de 2026. Sale de `INFORME-ESTRUCTURA-Y-REESTRUCTURACION-AGENTE.md` §4: el requisito tomó la mitad «desechable» de esta sección y perdió la otra mitad (quién vacía y a dónde va lo cerrado), y el código vaciaba solo, sin advertencia. Inconsistencia INC-16.*

| Qué | Cómo |
|---|---|
| Lo que ve la persona | La **transcripción**: todo lo que pidió y lo que pasó, también tras recargar (REQ-AGT-03) |
| Lo que lee el modelo | Solo el **episodio** abierto y la **nota de continuidad** (REQ-AGT-01 v2). Por eso la columna puede crecer sin que el modelo cargue más |
| Separador entre episodios | Línea fina, texto pequeño centrado y color secundario: «Jueves 29, 16:12 · Se registró «Dentista»». El verbo va primero para que concuerde con cualquier título (*cambiado en T-039, el 6 de noviembre de 2026; antes decía «Dentista registrado»*). Lo arma el código con el desenlace que manda el servidor: se registró, se movió, se canceló, se descartó, «Tarea guardada». Si el episodio se cerró sin acción, solo la fecha y la hora. No es un turno: se deduce del cambio de episodio |
| «Ver anteriores» | Botón secundario al inicio de la lista. Trae la página anterior, la pone arriba y **conserva la posición de lectura**. Desaparece cuando no hay más |
| Al abrir | Los últimos episodios con sus separadores. El blanco inicial con ejemplos solo aparece si la transcripción está vacía de verdad |
| Vaciado | No hay vaciado manual en esta fase (decisión 23 de `specs/07-agente/spec.md` §5) |
| Modo Registro del lienzo (§4) | Sigue siendo el destino de la historia completa, con filtros. Llega con la sección Actividad; no se construye en esta revisión |
| Textos | Sin vocabulario interno (R-40): en pantalla nunca aparecen «episodio», «turno» ni «transcripción» |

---

## 6. El registro

Es la interfaz de algo que la arquitectura ya declara: §9 de la propuesta técnica establece «registro de auditoría de toda acción ejecutada por el agente en nombre del usuario, consultable por el usuario», con la tabla `evento_auditoria` de §8. No es un elemento inventado para la interfaz.

### Dos alcances

| Plan | Alcance |
|---|---|
| Gratuito y Personal | Lo que el asistente hizo por mí. Un solo alcance, sin selector |
| Empresarial | Se añade el alcance de equipo, con selector de persona, visible solo si RN-OP-02 lo permite |

### Límite de privacidad — no negociable

El alcance de equipo se restringe a **acciones sobre objetos del equipo**: tareas delegadas, reuniones del equipo, autorizaciones. **Nunca** la agenda personal ni las comunicaciones del colaborador.

Que un gerente vea todo lo que el asistente hizo por un colaborador es vigilancia, no coordinación. El límite se apoya en RN-OP-02, que ya acota los datos al permiso, y en la minimización declarada en §9 de la propuesta técnica.

---

## 7. Navegación

**Tres destinos, los mismos que el móvil**: Agenda · Tareas · Actividad. Y **Ajustes al pie de la columna**, separado, porque no es trabajo.

### Por qué tres y no siete

La web llegó a tener seis destinos y a punto estuvo de tener siete. Eran demasiados, y sobre todo eran **otra gramática**: en móvil habíamos fusionado a tres y aquí se iba en dirección contraria. Una sola aplicación no puede organizarse de dos maneras.

El mapeo sale sin forzar nada:

| Sección | Qué es | Absorbe | Por qué |
|---|---|---|---|
| **Agenda** | Lo que va a pasar | Reuniones, Equipo | Coordinar una reunión es crear un evento. La disponibilidad del equipo es el **dato que se lee** para colocarlo, no un destino |
| **Tareas** | Lo que hay que hacer | Encargos | En móvil «esperando de alguien» ya era una franja dentro de Tareas; un encargo es su versión Empresarial |
| **Actividad** | Lo que pasó | Resúmenes | Un resumen de reunión es lo que pasó en ella |

**Equipo y permisos sale de la barra de trabajo.** Es configuración que se toca una vez y se revisa rara vez, no un sitio donde se trabaja a diario. Vive en **Ajustes**, al pie y separado por una línea.

Eso no lo esconde: el estado del permiso **aparece donde estorba**, al intentar encargar algo a quien todavía no ha aceptado. Es R-20 — el agente pide solo lo que falta, cuando falta.

> **Remisión del 7 de noviembre de 2026.** La administración de la organización y lo que el responsable tiene sobre su equipo **ya no viven en Ajustes**: van a la **zona de empresa**, aparte de la aplicación, con entrada propia (decisión del equipo del 6 de noviembre de 2026; §15). En Ajustes queda solo lo que es de la persona: la fila «Organización» (a qué empresa pertenece, sus equipos, salir si se sumó con su cuenta) y si comparte su libre/ocupado con cada equipo. La entrada a la zona va al pie de la navegación, encima de Ajustes, solo para quien administra o es responsable de un equipo, y abre otra pestaña. El párrafo de arriba se conserva como registro.

**La sección activa tiene que ser la del sujeto en pantalla.** Si el lienzo muestra un encargo, la activa es Tareas. Se incumplía en cuatro de doce cuadros y está corregido; el validador web tiene que comprobarlo.

**Iconografía:** en esta iteración son marcadores de posición geométricos, declarados como tales. Van montados como `INSTANCE_SWAP` dentro del componente de navegación, de modo que sustituir el juego real después no obligue a tocar ningún cuadro. Nunca una variante por icono.

### Regla del clic a media conversación

Pulsar un destino cambia el sujeto, y con él el lienzo.

- Si **no hay propuesta sin confirmar**, se navega sin preguntar.
- Si **hay una propuesta sin confirmar**, aparece la advertencia de descarte de la sección 5, con dos salidas: descartar y navegar, o quedarse.

Se eligió esta opción entre cuatro (descartar con aviso, conservar un hilo por sujeto, bloquear la navegación, o mover la propuesta al lienzo como «en espera»). Conservar hilos multiplica los contextos vivos, que es lo que la sección 5 evita; bloquear la navegación atrapa al usuario. Mover la propuesta al lienzo es mejor producto y queda como versión posterior: no pierde nada y no pregunta, pero añade un estado que hoy no hace falta.

**Un solo componente de advertencia sirve para los dos usos:** el vaciado manual y el clic en navegación.

---

## 8. Los cuatro blancos de la conversación

La columna central puede estar en blanco por cuatro razones que dicen cosas opuestas. **Ninguna puede parecerse a otra.**

| Estado | Significa | Debe sentirse como | Elementos obligatorios |
|---|---|---|---|
| Vacía tras cerrar | Terminó bien | Logro | Referencia a lo que quedó en el lienzo |
| Inicial | No sabe qué pedir | Invitación | Tres ejemplos concretos, pulsables |
| Asistente no disponible | El producto está caído | Disculpa | Banner de degradado, lo pedido en cola y lo que se puede seguir consultando. Sin formulario manual (§10 quater) |
| Fuera del plan | No la tiene contratada | Oferta | Qué función es, qué plan la incluye |

Es el mismo error que confundir «sin coincidencia» con «todavía no he calculado», pero en el estado más frecuente de la pantalla principal.

---

## 9. Componentes

### Nuevos

| Componente | Variantes | Propiedades |
|---|---|---|
| `Web / Icono` | Nombre = Agenda, Tareas, Equipo, Reuniones, Resúmenes, Actividad | — |
| `Web / Ítem de navegación` | Estado = Reposo, Activo | Icono (`INSTANCE_SWAP`) |
| `Web / Tarjeta` | Tipo = Propuesta, Confirmación, Resultado, Bloqueada, Error | Título, Cuerpo |
| `Web / Burbuja` | Autor = Usuario, Asistente | Mensaje |
| `Web / Barra de entrada` | Estado = Reposo, Activo, Deshabilitado | Texto |
| `Web / Panel de lienzo` | Modo = Objeto, Registro | Título, Subtítulo |
| `Web / Fila de registro` | Resultado = Hecho, Rechazado, Pendiente | Acción, Detalle, Momento |
| `Web / Advertencia de descarte` | — | Qué se pierde |

`Web / Tarjeta` es el componente que carga la propuesta entera. Si sale mal, la columna central es un chat con recuadros.

### Modificados

- `Web / Rejilla de disponibilidad` — de 1200 a 840 px, más el cuarto estado que exige RN-CAL-01 aprobada
- `Web / Fila de colaborador` — variante compacta para 840 px

### Sin cambios

`Web / Botón` y `Web / Campo`. Son átomos; la jerarquía no les afecta.

---

## 10. Variables nuevas

Los 39 tokens actuales son color, espaciado, radio y tipografía. No hay ninguno de dimensión, así que hoy los estados de disposición tendrían que cablearse a mano en cada cuadro.

Colección nueva `Disposición`, con dos modos:

| Variable | Modo Normal | Modo Lienzo expandido |
|---|---|---|
| `ancho/nav` | 72 | 72 |
| `ancho/conversacion` | 528 | 0 |
| `ancho/lienzo` | 840 | 1368 |

---

## 10 bis. Tres naturalezas, tres prefijos

La página ya no contiene solo pantallas de la aplicación. Hay tres cosas distintas y el nombre lo dice, para que a un cuadro sin navegación no se le tome por defectuoso:

| Prefijo | Qué es | Medida | Lleva navegación |
|---|---|---|---|
| `WEB-v2 /` | Pantalla de la aplicación | 1440x900 | Sí, salvo Acceso, que es anterior a ella |
| `PÚBLICO /` | Página que abre alguien **sin cuenta** | 1440x900 | **No, y es correcto** |
| `CORREO /` | Un correo, no una pantalla | 680 de ancho, alto al contenido | No |

Esto sale de §4.7: el colaborador no es usuario. Sus dos pantallas —aceptar y responder— no pueden llevar la navegación de una aplicación en la que no ha entrado.

---

## 10 ter. La interfaz nunca se nombra a sí misma

Regla que salió de una revisión de Franco y que atravesaba ocho cuadros sin que nadie la viera:

> **El texto de la pantalla habla de lo que la aplicación hace, nunca de cómo está montada.**

Tres cosas que no pueden aparecer nunca en la interfaz:

| Lo que se coló | Por qué no vale | Cómo quedó |
|---|---|---|
| «el panel de la derecha», «el registro de la derecha», «el lienzo» | Son nombres nuestros de la disposición. El usuario no los conoce, y si cambia la disposición el texto miente | «puedes seguir delegando a mano», «aquí queda todo lo que ya se cerró» |
| «Esto no es "no hay datos": es que aún no has pedido nada» | Cita el vocabulario de los estados del diseño | «Todavía no has pedido nada» |
| «(RN-CAL-01)», «(RN-OP-02)» | Un código de especificación impreso en pantalla | Fuera. La frase se queda, el código no |

El caso más claro era `Armazón / 02 Lienzo expandido`, que **llevaba un párrafo explicando el propio diseño como si fuera contenido de la pantalla**. Ese cuadro se eliminó: la disposición de lienzo expandido existe y está en §3, pero ese dibujo no cumplía.

---

## 10 quater. Una sección se ve igual en las dos plataformas

El móvil llegó antes a la forma buena de Actividad —informes con niveles Día · Semana · Mes, y el registro del asistente como segundo nivel— y la web se quedó con un listado de acciones del asistente y nada más. Eran dos productos distintos con el mismo nombre.

> **Lo que cambia entre plataformas es la disposición, nunca el contenido ni la jerarquía de la sección.**

En web eso se traduce así:

| Columna | Qué lleva en Actividad |
|---|---|
| Navegación | Actividad marcada |
| Conversación | Vacía, centrada, con su barra de entrada: aquí no se conversa con un informe |
| Lienzo | La cabecera con el selector de nivel, y debajo el informe con su misma gramática que en móvil |

Los dos alcances —lo tuyo y el equipo— dejan de ser dos cuadros y pasan a ser **un filtro dentro del registro**, que es donde tiene sentido: el límite de privacidad se aplica a las acciones, no al informe de tu tiempo.

### El modo degradado no ofrece un camino manual

`Blancos / 03` enseñaba un formulario de «delegar a mano» con los campos sin rellenar. Dos errores en uno: el relleno del componente se había quedado a la vista, y sobre todo **el planteamiento estaba mal**. El asistente es quien hace el trabajo; si se cae, lo que se pidió **queda en cola** y se puede seguir consultando lo que ya existe. Ofrecer un formulario que hace lo mismo a mano contradice el producto y duplica la interfaz.

---

## 11. Convención de nombres de esta sección

Los cuadros de arquitectura no pertenecen a un caso de uso, así que no siguen `CUN-XX / …`. Llevan su propia rama, declarada aquí para que la validación no los marque como fuera de convención:

```
WEB-v2 / <Grupo> / <NN Nombre>
```

Grupos: `Armazón`, `Blancos`, `Lienzo`, `Registro`, `Diálogos`.

Ejemplo: `WEB-v2 / Blancos / 03 Asistente no disponible`.

Cuando esta jerarquía se aplique a los casos de uso, esos cuadros vuelven a la convención `CUN-XX / …` de siempre.

---

## 12. Qué NO cambia

- **Los 13 cuadros de móvil.** La jerarquía móvil no se toca.
- **Los 20 cuadros web existentes.** Esta iteración añade una sección nueva; no los destruye. Se conservan para poder comparar y porque siguen siendo la única cobertura de CUN-07 y CUN-05 hasta que se rehagan.
- **El documento base del Entregable 1.** Ahí se modela el negocio, no la interfaz. Lo único que le toca es la segunda oración de RN-CAL-01.

De paso, la propuesta reduce divergencia entre plataformas: el móvil ya trabaja con tarjetas y burbujas, así que web y móvil pasan a compartir el **patrón**. Los componentes siguen sin compartirse, por el área táctil.

---

## 13. Trazabilidad

| Elemento visual | De dónde viene |
|---|---|
| Confirmación previa como tarjeta | RN-ER-03 |
| Estado «fuera del plan» | RN-OP-01, como caso de falta de permiso |
| Registro y sus dos alcances | Propuesta técnica §9 y tabla `evento_auditoria` de §8 |
| Límite del alcance de equipo | RN-OP-02 y minimización de §9 |
| Conversación desechable | Propuesta técnica §7.4 |
| Cola en modo degradado, sin camino manual | R-42 |
| Rejilla a 840 | `specs/05-equipos/spec.md` §3 |

---

## 14. Pendiente

Ordenado por lo que más pesa.

1. **La disposición de lienzo expandido se quedó sin cuadro.** El que había explicaba el diseño dentro de la pantalla y se eliminó. Hay que volver a dibujarla cumpliendo R-40, y llenando el lienzo con lo que de verdad se vería.
2. **Ninguna de las tres secciones tiene portada.** Agenda, Tareas y Actividad existen en la navegación y no hay un cuadro que enseñe cada una al entrar. En la página está declarado como la fila 3, vacía a propósito para que se vea. Dentro de Tareas falta además la franja de **encargadas**, que es la lista de lo que delegaste.
2. **Los niveles de período no están dibujados en web.** En móvil Agenda y Actividad tienen selector Hoy · Semana · Mes; en web no hay ni un cuadro con él. *6 de noviembre de 2026: Semana y Mes de Agenda quedan especificados (REQ-CUN01-14 y 15) y se construyen en T-044 con la misma forma que el móvil (§5.1 de `ARQUITECTURA-VISUAL-MOVIL.md`); el cuadro de Figma se regenera después con los scripts de `design/figma/`.*
3. **Rehacer los 20 cuadros de `05 Flujos · Web`**, que siguen en la jerarquía vieja —navegación de 240 con texto, una columna de 1200—. Mientras sigan ahí, el archivo cuenta dos productos web distintos, y eso pesa más que cualquier detalle visual.
4. **Estados del bucle sin cuadro**: encargo vencido, recordatorio, enlace caducado a los 7 días, colaborador que revoca a mitad. Están en `specs/04-comunicaciones` §7 sin forma.
5. **Caminos alternos del acceso sin cuadro**: credenciales incorrectas, permiso revocado, y cómo se ve la aplicación cuando alguien elige «ahora no». Están en `specs/06-acceso` sin forma.
6. **CUN-06, CUN-08 y CUN-10** siguen sin especificación y sin diseño.
7. **Juego de iconos real.** Lo de hoy son marcadores de posición, y el de Encargos además está prestado del de Tareas.
8. **Cifras de los límites del Plan Gratuito**, sin las cuales el blanco «fuera del plan» no puede decir qué se agotó.
9. **Extraer `Fundamentos` como biblioteca publicada.**
10. **La zona de empresa no tiene ningún cuadro** (§15.5). *Añadido el 7 de noviembre de 2026.*

---

## 15. La zona de empresa

*Añadido el 7 de noviembre de 2026. Sale de la decisión del equipo del 6 de noviembre de 2026 (`specs/08-administracion/plan.md` §7, H-ADM-22) y de `ESTRUCTURA-PERFIL-EMPRESARIAL.md`. Pendiente de aval del equipo.*

### 15.1 Qué es y qué no es

Un **sitio aparte de la aplicación**, con su propia entrada, para **mirar el estado del equipo y administrar la organización**. No es una cuarta sección (R-32) ni una página de Ajustes (§7). Se entra con las mismas credenciales, en otra pestaña y con otra sesión; cerrar una no cierra la otra.

| | La aplicación | La zona de empresa |
|---|---|---|
| Para qué | Actuar: pedir, delegar, responder, confirmar | Mirar el estado del equipo; administrar cuentas y equipos |
| Quién entra | Toda cuenta | Quien administra o es responsable de al menos un equipo |
| Plataforma | Web y móvil | Solo web (REQ-ADM-05) |
| Asistente | Sí: la conversación es el área de trabajo | **No.** Sin conversación ni barra de entrada (REQ-ADM-07) |
| Columnas | 72 · 528 · 840 | 72 · 1368 |

**La regla que la sostiene:** en la aplicación se actúa; en la zona se mira. Lo que crea o cambia trabajo del equipo pasa por el asistente, así que vive en la aplicación. En esta versión, «Mi equipo» es de lectura; las únicas acciones de la zona son las de administrar, que el asistente no hace (H-ADM-11).

### 15.2 Disposición

```
┌────────┬──────────────────────────────────────────────────┐
│  Nav   │   Lienzo                                         │
│ 72 px  │      1368 px                                     │
│        │                                                  │
│ Apar-  │   Cabecera: organización · apartado · (equipo)   │
│ tados  │   ──────────────────────────────────────────     │
│ de la  │   Tabla, tablero, panorama o documento           │
│ zona   │                                                  │
│        │                                                  │
│ ─────  │                                                  │
│ Ir a la│                                                  │
│ aplica-│                                                  │
│ ción   │                                                  │
│ Salir  │                                                  │
└────────┴──────────────────────────────────────────────────┘
```

| Elemento | Cómo |
|---|---|
| **Navegación propia** | Mismo ancho que la de la aplicación (72) para reutilizar la colección `Disposición` sin variables nuevas, pero **otros destinos**: los apartados de §15.3 que la cuenta puede ver. Como son destinos nuevos y poco frecuentes, cada icono lleva debajo su nombre corto. Al pie, separado por una línea: «Ir a la aplicación» (abre la aplicación, no comparte sesión) y «Salir» (cierra solo la sesión de la zona) |
| **Lienzo** | 1368, el ancho del modo «Lienzo expandido» (§3). Es el único modo de la zona: no hay conversación que mostrar |
| **Cabecera del lienzo** | Nombre de la organización y del apartado. En «Mi equipo», si la cuenta es responsable de varios equipos, un selector de equipo; con uno solo, su nombre sin selector |
| **Tarjeta de confirmación** | La misma `Web / Tarjeta` de tipo Confirmación (§9), como capa centrada sobre el lienzo, con lo que va a hacer, sobre quién y qué no se deshace (REQ-ADM-16). Solo en «Personas» y «Equipos» |
| **Anchos menores de 1440** | De 1024 a 1440, el lienzo ocupa lo que quede. Por debajo de 1024, **por decidir**: la zona trabaja con tablas y la rejilla, que no caben en una columna de teléfono |
| **Dirección** | Hoy, `/administracion` en la misma dirección que la aplicación. Publicarla en una dirección propia más adelante no cambia nada de esta disposición |

### 15.3 Los apartados

| Apartado | Quién lo ve | Qué hay | Acciones | Requisitos |
|---|---|---|---|---|
| **Mi equipo** | Responsable, por cada equipo del que lo es. Un administrador que no es responsable no lo ve | Tres cortes con el mismo selector que los niveles de una sección: **Tareas** (tablero por persona, lo atrasado primero, lo que espera su decisión marcado), **Disponibilidad** (panorama de la semana: libre, ocupado, sin datos, fuera de banda; nunca un título) y **Reporte** (el documento completo de un período, para leer y descargar). Encima de Tareas, por decidir, los mismos cinco puntos del resumen | Ninguna sobre el trabajo en esta versión. Abrir una tarea lleva a la aplicación | REQ-ACC-17, REQ-CUN08-01, 04, 05, REQ-CUN05-07, 08, 11, 13, 15; H-ADM-22 |
| **Personas** | Administrador | Tabla de cuentas e invitaciones, con estado, plan, equipos y si administra | Dar de alta, invitar y, por fila, solo lo que vale para su clase | REQ-ADM-08 a 19, 24, 25 |
| **Equipos** | Administrador: todos, con acciones. Responsable: los suyos, sin acciones | Una tarjeta por equipo con su responsable y sus miembros; «Sin responsable» destacado | Crear, añadir, quitar, nombrar responsable (solo el administrador) | REQ-ADM-28 a 32 |
| **Registro** | Administrador | Las acciones administrativas, de la más reciente a la más antigua, sin contenido de nadie | Ninguna | REQ-ADM-16 |

**Orden en la navegación:** Mi equipo · Personas · Equipos · Registro. Quien solo es responsable ve Mi equipo y Equipos; quien solo administra, Personas, Equipos y Registro. La zona abre en el primero que la cuenta pueda ver.

**Lo que cambia de §6.** El alcance de equipo del registro ya no se añade a la Actividad de la aplicación: lo del equipo no vuelve a la aplicación. Si llega, será un corte de «Mi equipo», con el mismo límite de privacidad de §6. No entra en esta versión.

### 15.4 Textos (R-40)

| Dónde | Texto |
|---|---|
| Entrada al pie de la navegación de la aplicación y nombre de la zona | **Por decidir** (H-EMP-11). «Administración» no vale para un responsable que no administra. Propuesta: «Empresa», o el nombre de la organización («Acme») |
| Apartados | «Mi equipo», «Personas», «Equipos», «Registro» |
| Cortes de Mi equipo | «Tareas», «Disponibilidad», «Reporte» |
| Estado vacío de Mi equipo | «Todavía no hay tareas en Ventas. Cuando le encargues algo a alguien desde la aplicación, aparecerá aquí.» Sin formulario (R-42) |
| Fila sin datos del panorama | «No comparte cuándo está libre», nunca «sin datos» ni «no hay datos» |
| Nunca | «afiliación», «cuenta propia», «pertenencia», «zona», «lienzo», «ámbito» |

### 15.5 Cuadros que faltan

Ninguno existe. La lista completa, con los del móvil del colaborador y el aviso de invitación, está en `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §6.6. Los de esta sección, con un grupo nuevo `Empresa` en la convención de §11:

| Cuadro | Qué muestra |
|---|---|
| `WEB-v2 / Empresa / 01 Entrada` | La entrada propia, con el mismo formulario que la de la aplicación |
| `WEB-v2 / Empresa / 02 Mi equipo · Todavía sin tareas` | Lo que ve un responsable recién nombrado |
| `WEB-v2 / Empresa / 03 Mi equipo · Tareas` | El tablero por persona, con una tarea atrasada y una respuesta por decidir |
| `WEB-v2 / Empresa / 04 Mi equipo · Reporte` | El reporte completo; la referencia es `design/reporte-equipo-muestra.html` |
| `WEB-v2 / Empresa / 05 Mi equipo · Disponibilidad` | La semana de cinco personas, una sin datos y una franja fuera de banda |
| `WEB-v2 / Empresa / 06 Personas` | La tabla, con una invitación pendiente arriba y una cuenta que se sumó con la suya |
| `WEB-v2 / Empresa / 07 Dar de alta` · `08 Invitar` · `09 Equipos` · `10 Confirmación` | Los que pide `specs/08-administracion/spec.md` §5 como `Administración / 02` a `05` |
| `WEB-v2 / Empresa / 11 Registro` | Las acciones administrativas |

El grupo `Empresa` se suma a los de §11 (`Armazón`, `Blancos`, `Lienzo`, `Registro`, `Diálogos`). Los cuadros de `Administración / 01` a `05` que pide `08-administracion` §5 pasan a este grupo con su número nuevo; si el equipo prefiere conservar el nombre `Administración`, basta con cambiar el prefijo.
