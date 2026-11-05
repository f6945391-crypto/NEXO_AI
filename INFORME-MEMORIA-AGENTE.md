# Informe — Memoria y contexto del agente: por qué la conversación «se borra» y cómo estructurarla

**Fecha:** 29 de octubre de 2026 · **§6.4 añadida el 5 de noviembre de 2026**
**Alcance:** el agente de NexoAI (fase 2, T-029 a T-037) y los documentos que lo gobiernan: `specs/07-agente/spec.md` (REQ-AGT-01, §6), `specs/07-agente/plan.md` (§4, §6, §10), `specs/glosario.md` («Conversación»), `design/ARQUITECTURA-VISUAL-WEB.md` §2 e `INFORME-LANGGRAPH.md` §1, §3 y §4.
**Qué es:** un análisis para decidir, con fuentes. **No es especificación.** Lo que el equipo acepte entra primero como hallazgo en `spec.md` §5 y `SPEC.md` §8, y después se planifica, como manda `SPEC.md` §2.1.
**Para quién:** el equipo (Aixa, Franco, Vasco) y, si hace falta sustentarlo, el docente. Está escrito para leerse de corrido; las tablas resumen, el texto explica.

---

## Índice

1. [El problema en una página](#1-el-problema-en-una-página)
2. [Qué pasa hoy, paso a paso](#2-qué-pasa-hoy-paso-a-paso)
3. [Diagnóstico: tres cosas distintas atadas a un mismo ciclo de vida](#3-diagnóstico-tres-cosas-distintas-atadas-a-un-mismo-ciclo-de-vida)
4. [Qué se considera buena práctica, con fuentes](#4-qué-se-considera-buena-práctica-con-fuentes)
5. [Las alternativas sobre la mesa, comparadas](#5-las-alternativas-sobre-la-mesa-comparadas)
6. [Estructura propuesta: tres capas y tres ciclos de vida](#6-estructura-propuesta-tres-capas-y-tres-ciclos-de-vida)
   - 6.4 [La unidad de memoria es la actividad, no el chat](#64-la-unidad-de-memoria-es-la-actividad-no-el-chat)
7. [Cómo se traduce a LangGraph y a la base de datos](#7-cómo-se-traduce-a-langgraph-y-a-la-base-de-datos)
8. [Qué cambia en los `.md` (el rumbo dentro del método SDD)](#8-qué-cambia-en-los-md-el-rumbo-dentro-del-método-sdd)
9. [Lo que no conviene hacer](#9-lo-que-no-conviene-hacer)
10. [Decisiones que le tocan al equipo](#10-decisiones-que-le-tocan-al-equipo)
11. [Fuentes](#11-fuentes)

---

## 1. El problema en una página

Al probar el agente con Groq, el equipo vio que **responde bien y modifica el calendario**, pero que tras cada acción confirmada la pantalla se vacía en la siguiente interacción y el asistente ya no sabe nada de lo que acaba de hacer. Se siente brusco y, preguntado «¿qué hicimos?», no puede responder.

La causa no es un error de implementación: **el código hace exactamente lo que dicen los documentos.** REQ-AGT-01 manda que «cuando se cierre la acción en curso, empezará la siguiente solicitud sin ese contexto»; la decisión H-AGT-05 cierra la conversación al cerrarse su Operación; y el glosario define «Conversación» como *desechable: se vacía al cerrar la operación*. La web lo implementa con una línea: si la conversación quedó cerrada, el siguiente mensaje reemplaza la lista de turnos en vez de añadirse (`conversacion.tsx`, línea 202).

El motivo original de esa decisión fue sano: **que el modelo no relacione una petición nueva con una acción ya cerrada** («mejor a las 5» no debe mover el dentista que ya se confirmó) y que no acumule contexto que lo lleve a inventar. Pero el remedio elegido confunde tres cosas que las guías de referencia tratan por separado:

| Lo que se mezcló | Qué es | A quién sirve |
|---|---|---|
| **Lo que lee el modelo** | La ventana de contexto de cada llamada | Al modelo, para interpretar bien |
| **Lo que ve la persona** | La transcripción en pantalla | A la persona, para entender y confiar |
| **Lo que el sistema recuerda** | Hechos y acciones que sobreviven a la conversación | A los dos, para dar continuidad |

Hoy las tres viven en el **mismo objeto** (el estado del grafo persistido en el punto de control) y mueren **al mismo tiempo** (al cerrarse la acción). Separarlas resuelve el síntoma, reduce el estado guardado (H-AGT-14) y abre el camino a la memoria que el equipo intuye que falta, sin tocar las defensas contra alucinación, que están en otro lado: herramientas tipadas (P-01), validación antes de ejecutar (P-07), confirmación en tarjeta (P-03) y resultado redactado por el código (REQ-CUN01-04).

**La recomendación en una frase:** no cambiar de método ni de framework, sino **evolucionar REQ-AGT-01 y el glosario** para separar transcripción, contexto de trabajo y memoria, con sus propios ciclos de vida, y que lo que «recuerda» el agente entre acciones lo escriba el código, no el modelo.

---

## 2. Qué pasa hoy, paso a paso

Leído en el repositorio el 29 de octubre de 2026.

1. **Un mensaje abre o reutiliza la conversación abierta** de la persona (`AsistenteService.enviar`). Cada persona tiene como mucho una abierta.
2. **El grafo acumula dos listas en su estado:** `mensajes` (lo que lee el modelo) y `turnos` (todo lo que la persona vio: textos, tarjetas, listas). Las dos se guardan completas en cada punto de control (`EstadoAsistente`, reductor `acumular`).
3. **Al interpretar, el modelo recibe los 20 últimos mensajes** (`recortar`), las instrucciones y la fecha de referencia. No recibe resumen ni lista de acciones.
4. **Cuando una herramienta propone una Operación, el grafo se interrumpe** y espera la tarjeta. Esto está bien resuelto y no cambia.
5. **Al confirmar o descartar, el nodo `comunicar` marca `cerrada: true`.** El servicio pasa la fila `conversacion_agente` a `cerrada`.
6. **El siguiente mensaje abre una conversación nueva, vacía.** En la web, `setTurnos(cerrada ? [provisional] : [...previos, provisional])` borra la pantalla. El modelo tampoco ve nada de lo anterior.
7. **La conversación cerrada no se borra de la base,** pero tampoco se vuelve a mostrar: queda como un punto de control de 36 a 46 KB que nadie lee (`INFORME-LANGGRAPH.md` §1). T-037 redujo los puntos conservados de 10 a 2, pero la transcripción sigue viviendo dentro del estado del grafo.

Dos observaciones que salen de esta lectura y que no están escritas en ningún documento:

- **El tamaño del punto de control no es solo un problema de LangGraph:** es consecuencia de guardar la transcripción (`turnos`) dentro del estado. Sacarla a su propia tabla resuelve a la vez la pantalla vacía y el crecimiento.
- **La «conversación» del glosario es un término de diseño visual** (columna de 528 px, `ARQUITECTURA-VISUAL-WEB.md` §2) que se usó como unidad de memoria del agente. Son dos conceptos que merecen dos nombres.

---

## 3. Diagnóstico: tres cosas distintas atadas a un mismo ciclo de vida

### 3.1 Lo que el cierre quería proteger, y lo que en realidad protege

REQ-AGT-01 tiene dos criterios. El primero (cambiar una propuesta **antes** de confirmar) funciona y no depende del cierre. El segundo («mejor a las 5» **después** de confirmar no debe moverse solo) es el que justificó vaciar el contexto. Pero hay una forma mejor de cumplirlo: que el modelo **sepa** que el dentista ya quedó registrado y, por tanto, que «mejor a las 5» solo puede significar *mover* un compromiso existente, lo cual exige consultar la agenda y proponer `agenda.modificar_evento` con el id real, que la persona vuelve a confirmar en una tarjeta. Esa es exactamente la conducta que el borrador de §6 del `spec.md` pide en su primer criterio, y es más útil que preguntar «¿qué quieres mover?» sin saber nada.

El riesgo de alucinación no crece por eso: el modelo no puede mover nada sin un id que venga de una herramienta (plan §5, H-AG-05) y nada se ejecuta sin la tarjeta (P-03). **Vaciar el contexto no era la defensa; la defensa es la arquitectura, y ya está.**

### 3.2 Lo que el cierre rompe

- **Confianza:** la persona pierde el rastro de lo que pidió y de lo que el sistema hizo. Las guías de interfaces conversacionales tratan la persistencia del historial como condición de una experiencia continua, no como un extra (§4.5).
- **Utilidad:** «¿qué hicimos?», «¿a qué hora quedó?», «cancélalo» (refiriéndose a lo recién creado) no pueden responderse.
- **Economía:** se guarda todo y no se usa nada: cada conversación cerrada conserva su transcripción completa en un formato que solo LangGraph sabe leer.

### 3.3 Por qué la propuesta de §6 no convenció

El borrador de §6 (cerrar tras 5 acciones o 30 minutos, resumen escrito por el modelo) alivia el síntoma pero **sigue atando las tres cosas a una conversación lineal**, solo que más larga. La nota del equipo lo dice bien: no apunta a una estructura escalable. Además introduce una dependencia nueva del modelo (el resumen) para algo que el código puede escribir con exactitud (qué acciones se confirmaron, con qué datos), lo que roza P-02.

---

## 4. Qué se considera buena práctica, con fuentes

Se marcan como **oficial** las fuentes del fabricante del framework o del proveedor del modelo, y como **referencia** las guías de diseño y los análisis de terceros con reputación. Las direcciones están en §11.

### 4.1 Separar memoria corta (por hilo) de memoria larga (por persona)

**LangGraph (oficial).** La documentación distingue dos tipos de memoria: la corta, atada a un hilo y gestionada por el punto de control, y la larga, que cruza hilos y vive en un almacén aparte organizado por espacios de nombres (por ejemplo, uno por usuario). Son dos APIs distintas porque resuelven dos preguntas distintas: «¿qué acabamos de decir?» y «¿qué sé ya de esta persona?».

**Google ADK (oficial).** El kit de Google separa explícitamente tres cosas: la **sesión** (historial de una conversación), el **estado** (datos de trabajo de esa sesión, con prefijos que fijan su alcance: sesión, usuario o aplicación) y la **memoria** (conocimiento de largo plazo recuperable entre sesiones). Es la misma separación con otros nombres, y confirma que no es un rasgo de LangGraph sino una práctica del sector.

**Qué significa para NexoAI.** Hoy solo existe la memoria corta, y además se destruye en cada acción. La memoria larga está prevista en `PROPUESTA-TECNICA.md` §7.4 y fuera de esta versión; conviene dejarle el sitio ahora para no volver a mezclarla con la conversación cuando llegue.

### 4.2 Gestionar la memoria corta: recortar, resumir, no acumular

**LangGraph (oficial).** Con memoria corta activa, las conversaciones largas desbordan la ventana del modelo; los remedios habituales son recortar los mensajes antiguos y resumirlos. La práctica más citada combina ambos: resumir lo que se va a recortar y después recortarlo.

**Anthropic, «Effective context engineering for AI agents» (oficial).** La guía parte de que la atención del modelo es un presupuesto finito y de que la precisión al recuperar información **cae a medida que el contexto crece** («context rot»). De ahí el principio rector: encontrar el conjunto más pequeño de tokens de alta señal que haga probable el resultado deseado. Para tareas largas propone tres técnicas: **compactación** (resumir y reiniciar con el resumen), **notas estructuradas** fuera de la ventana de contexto que el agente vuelve a leer, y subagentes. Y advierte que la forma más ligera de compactar es **descartar los resultados viejos de herramientas**.

**Qué significa para NexoAI.** El recorte a 20 mensajes está bien y se conserva. Lo que falta no es un contexto más largo, sino **una nota estructurada** que sobreviva al cierre de la acción: qué se confirmó, cuándo, con qué id. Esa nota es pequeña, exacta y la escribe el código a partir de las Operaciones, que es justo lo que P-02 pide. El resumen escrito por el modelo queda como segundo paso, solo para conversaciones que superen la ventana.

### 4.3 Recuperar justo a tiempo en vez de cargar todo

**Anthropic (oficial).** La guía describe el giro hacia la recuperación «justo a tiempo»: el agente guarda identificadores ligeros y usa herramientas para traer datos al contexto cuando los necesita, en lugar de recibirlo todo por adelantado. También pide herramientas pocas, claras y sin solapes, porque los conjuntos de herramientas inflados crean ambigüedad.

**Qué significa para NexoAI.** El agente ya hace esto con la agenda (`agenda.consultar` trae solo el rango pedido, H-AGT-12). La misma lógica vale para el pasado: en vez de meter toda la historia en el contexto, basta una nota corta con las últimas acciones y, si hiciera falta más, una herramienta de consulta (`conversacion.acciones_recientes`) que el modelo llama cuando la persona pregunta «¿qué hicimos la semana pasada?».

### 4.4 El modelo no debe ser la memoria de lo que pasó

**Anthropic (oficial)** pone como ejemplo de nota estructurada la lista de tareas de Claude Code, un registro de progreso que vive fuera del contexto y se relee. **LangGraph (oficial)** recuerda que el almacén de memoria larga no extrae ni depura recuerdos por sí solo: eso lo escribe el desarrollador.

**Qué significa para NexoAI.** Es la confirmación de que la «lista de acciones confirmadas» la debe escribir el código, con los datos que devolvió Google, y no el modelo. Coincide con REQ-CUN01-04 (el resultado sale de la Operación, no de lo propuesto) y con el principio ya adoptado de que el modelo «no redacta el resultado de una acción» (plan §4.2).

### 4.5 Lo que ve la persona no es lo que lee el modelo

**Patrones de diseño para IA generativa (referencia: Cloudscape, el sistema de diseño de AWS).** Recomienda un historial de conversaciones consultable, agrupado por tiempo («Hoy», «Ayer», «Últimos 7 días»), con enlace para abrir cada conversación y seguirla o repasarla, y con control de la persona sobre sus datos y una política de retención comunicada.

**Microsoft Dynamics 365 (referencia).** Introdujo la «persistencia» en el chat precisamente porque, al cerrarse una conversación, el historial quedaba en transcripciones pero no visible en la siguiente sesión, y eso rompía el contexto para la persona.

**Qué significa para NexoAI.** La transcripción es **de la persona**, no del modelo: debe seguir visible aunque el modelo ya no la lea. Y el borrador de §6 lo intuía («lo que la persona ve no se borra al cerrarse»). Separar las dos cosas permite además que lo que lee el modelo sea pequeño sin que la persona pierda nada.

### 4.6 Sobre el método: el rumbo se cambia en la especificación, no abandonando la especificación

**GitHub Spec Kit (referencia).** El método que inspira el repositorio define las especificaciones como **documentos vivos que evolucionan junto al código**, no como artefactos que se escriben una vez. Entre sus principios está la **retroalimentación bidireccional**: lo que se observa en el uso real (métricas, incidentes) vuelve a la especificación para refinarla. Y rechaza explícitamente la lectura de «planificación en cascada».

**Qué significa para NexoAI.** Lo que el equipo descubrió al probar con Groq es exactamente el caso que el método prevé: un requisito (REQ-AGT-01) que, implementado tal cual, produce una experiencia pobre. **Cambiar el rumbo es cambiar el requisito y el glosario, registrar por qué, y volver a planificar.** No es señal de que SDD falle; es SDD funcionando. Lo que sí conviene evitar es lo que pasó con «Conversación»: que un término de diseño visual fije, sin discutirlo, el modelo de memoria del agente.

---

## 5. Las alternativas sobre la mesa, comparadas

| | A. Como está | B. Borrador §6 del `spec.md` | C. Tres capas (este informe) | D. Memoria por entidad o tema (nota del equipo) |
|---|---|---|---|---|
| **Qué propone** | Cerrar y vaciar tras cada acción | Cerrar tras 5 acciones o 30 min; resumen por el modelo; la pantalla no se vacía | Separar transcripción, contexto de trabajo y memoria, cada una con su ciclo de vida; nota de acciones escrita por el código | Que el agente consulte memoria organizada por compromiso, persona o proyecto con herramientas |
| **«Mejor a las 5» tras confirmar** | Pregunta qué mover, sin pistas | Lo relaciona si cabe en el contexto | Lo relaciona por la nota de acciones; exige id real y tarjeta | Lo relaciona consultando la entidad |
| **«¿Qué hicimos?»** | No puede | Con el resumen del modelo | Con la nota del código y, si hace falta, una herramienta de consulta | Con herramientas |
| **Pantalla** | Se vacía | Persiste | Persiste, con episodios separados y paginación | No lo define |
| **Lo que lee el modelo** | 20 mensajes del episodio | 20 mensajes + resumen + lista | 20 mensajes del episodio + nota corta | Depende de lo que consulte |
| **Quién escribe la memoria** | Nadie | El modelo (resumen) y el código (lista) | El código; el modelo solo si se supera la ventana | A definir |
| **Estado guardado** | Grande: transcripción dentro del punto de control | Igual o mayor | Pequeño: el punto de control solo guarda el episodio; la transcripción va a su tabla | No lo define |
| **Ajuste a P-02** | Sí | Parcial (resumen por el modelo) | Sí | Sí |
| **Esfuerzo** | — | Medio | Medio; se puede hacer en tres tareas | Alto; necesita entidades que aún no existen (tareas, proyectos) |
| **Escala a las fases siguientes** | No | Poco | Sí: la capa de memoria larga ya tiene sitio | Sí, pero es la fase siguiente de C, no una alternativa |

**Lectura.** B corrige el síntoma pero deja la estructura. D es el destino correcto a largo plazo y, bien mirado, **es la capa 3 de C** con herramientas de consulta encima; no tiene sentido construirla antes de que existan las entidades (tareas, equipos, proyectos) que la harían útil. C es lo que se puede hacer ahora sin cerrar puertas.

---

## 6. Estructura propuesta: tres capas y tres ciclos de vida

### 6.1 Las capas

**Capa 1 — Transcripción (lo que ve la persona).**
Todo turno que la persona vio (sus mensajes, respuestas, tarjetas, listas, avisos de espera) se guarda en su propia tabla, por persona, con fecha, y **no se borra al cerrarse una acción**. Se muestra paginada, de lo más reciente hacia atrás, con separadores visuales entre episodios («Dentista registrado · jueves 29, 16:12»). Tiene una política de retención propia (por ejemplo, 90 días, a decidir), independiente del agente.

**Capa 2 — Contexto de trabajo (lo que lee el modelo).**
Se compone en cada llamada, no se guarda como tal:

- Las instrucciones y la fecha de referencia, como hoy.
- Los mensajes del **episodio en curso** (como mucho 20, como hoy).
- Una **nota de continuidad escrita por el código**, corta y determinista: las últimas *n* acciones confirmadas de esta persona (tipo, título, fecha y hora en su zona, id del evento, hace cuánto), y si hay algo en espera. Ejemplo:

  > Acciones recientes de la persona, confirmadas: registrado «Dentista», jueves 29 de octubre, 16:00–17:00 (evento `ev_8f2…`, hace 2 min). Si pide cambiar o cancelar algo sin nombrarlo, probablemente se refiere a la más reciente: confirma con una consulta y propón con el id.

- Si el episodio supera la ventana (raro en agenda), un **resumen del tramo recortado** escrito por el modelo, como describe la documentación de LangGraph. Es la única parte que escribe el modelo y es opcional.

**Capa 3 — Memoria larga (lo que el sistema sabe de la persona).**
Fuera de esta versión, pero con el sitio reservado: preferencias explícitas en el perfil («mis reuniones duran 30 minutos», «no me agendes antes de las 9») y, más adelante, memoria por entidad. Vive en tablas propias con filtro por organización (P-04), nunca en el almacén genérico de LangGraph (`INFORME-LANGGRAPH.md` §4). Entra al contexto como una línea más de la nota de continuidad, o por una herramienta.

### 6.2 Los ciclos de vida

| Unidad | Qué es | Empieza | Termina | Dónde vive |
|---|---|---|---|---|
| **Episodio** | Una intención con su acción: desde que la persona pide hasta que la tarjeta se confirma, se descarta o la petición se cierra sin acción | Con un mensaje sin episodio abierto | Al cerrarse su Operación, o por inactividad (por ejemplo, 30 min) | Hilo de LangGraph (`thread_id` = id del episodio), punto de control pequeño |
| **Sesión** | Lo que la persona ve como «esta conversación»: una sucesión de episodios sin pausa larga | Con el primer mensaje tras una pausa | Por inactividad (por ejemplo, 30 min) o cuando la persona lo pide | Solo como separador en la transcripción; no tiene estado propio |
| **Transcripción** | El historial completo de la persona | Con su primer mensaje | Por la política de retención | Tabla `turno_asistente` |
| **Nota de continuidad** | Las últimas acciones confirmadas y lo que está en espera | — | Rodante: siempre las últimas *n* | Se calcula desde `operacion`; no se guarda |

Con esto, **REQ-AGT-01 se cumple mejor que hoy**: dentro del episodio, el modelo tiene todo el contexto (criterio 1 vigente); al cerrarse, el episodio nuevo empieza limpio **pero informado** por la nota (lo que el borrador de §6 quería), y «mejor a las 5» después de confirmar produce una propuesta de modificación con id real y tarjeta, nunca una acción silenciosa.

### 6.3 Qué gana cada parte

- **La persona** ve siempre lo que pidió y lo que pasó; puede referirse a lo recién hecho; puede preguntar qué se hizo.
- **El modelo** lee menos (un episodio y una nota), con más señal, lo que según Anthropic mejora la precisión, no la empeora.
- **El sistema** guarda estados pequeños, puede borrar episodios cerrados sin perder la transcripción ni la continuidad, y tiene dónde poner la memoria larga cuando llegue.
- **El equipo** conserva todo lo construido: grafo, interrupción, herramientas, cola en espera, auditoría. Cambia la composición del contexto, la tabla de turnos y la pantalla.

### 6.4 La unidad de memoria es la actividad, no el chat

**Añadido el 5 de noviembre de 2026**, a partir de la discusión del equipo sobre cómo evitar que la conversación crezca sin forma.

#### 6.4.1 El problema que se discutió

Con la transcripción persistente (6.1, capa 1), la conversación deja de vaciarse, pero entonces **crece**: todas las peticiones y respuestas quedan en un solo flujo. La alternativa que se miró es la de los asistentes generales como Claude o ChatGPT: un chat por tema, que la persona crea y archiva. Y la intuición del equipo de que las **actividades** (compromisos, tareas, reuniones) son «ficheros» que van acumulando lo que se dijo sobre ellas.

#### 6.4.2 Por qué no copiar el chat por tema

En un asistente general cada chat es abierto y sin objeto, así que tiene sentido que la persona elija dónde hablar. En NexoAI casi todo lo que se dice termina en una entidad concreta. Si la persona tuviera que elegir el chat antes de hablar, se importaría un problema: a qué chat va «mejor a las 5», chats huérfanos, archivar a mano. La unidad correcta ya está en el glosario: **Hilo**, «conversación ligada a una tarea; vive dentro de la tarea, nunca como sección propia». Solo hay que generalizarlo de tarea a actividad.

#### 6.4.3 La estructura

| Pieza | Qué es | Quién la crea |
|---|---|---|
| **Una puerta de entrada** | Un solo flujo donde la persona habla sin clasificar antes. Es la capa de captura del diseño | Existe |
| **Transcripción** | Cronológica, paginada, por episodios (6.1, capa 1). Es un registro: puede crecer | Sistema (T-038) |
| **Hilo de actividad** | **Vista**, no copia: el filtro de la transcripción y de las Operaciones que tocaron esa actividad. Se abre desde el detalle de la actividad; se archiva solo cuando la actividad termina | Sistema, al enlazar cada turno con la entidad que resolvió |
| **Segunda entrada** | Desde el detalle de una actividad se puede hablar con el contexto ya fijado a ella | Diseño (lienzo o pantalla de detalle) |

La persona **nunca crea un chat**: las actividades nacen de las acciones y los hilos nacen de las actividades. No hay nada que archivar a mano.

#### 6.4.4 Qué lee el modelo en cada caso

| Dónde habla la persona | Contexto del modelo |
|---|---|
| En la puerta de entrada | Instrucciones + mensajes del episodio + **nota de continuidad** (6.1, capa 2) + una herramienta `actividad.contexto(id)` que trae el hilo de una actividad **cuando la persona se refiere a ella**. Mismo patrón justo a tiempo que `agenda.consultar` |
| Dentro de un hilo | Instrucciones + mensajes del episodio + nota de continuidad + ese hilo (sus operaciones y sus últimos turnos), ya cargado |

Así la memoria «por actividad» que el equipo pedía es la capa 3 de 6.1, y el contexto no engorda con el chat: lo que crece es el registro, no lo que lee el modelo.

#### 6.4.5 Cómo se resuelve a qué actividad se refiere la persona

Es la pieza delicada: «mueve el dentista» puede ser uno de dos dentistas. Se resuelve en **tres niveles**, del más seguro al menos:

1. **Enlace por herramienta.** El turno se liga a una actividad **solo** con un id que vino de una herramienta (`agenda.consultar`, la nota de continuidad, `actividad.contexto`). El modelo nunca inventa ni «recuerda» un id. Esto no cambia respecto de hoy (H-AG-05).
2. **Inferencia con contexto, permitida.** El modelo puede inferir el referente cuando el contexto lo hace razonable: la actividad más reciente de la nota de continuidad, la única que coincide con el título o la fecha mencionada, la del hilo abierto. La inferencia se **hace visible en la tarjeta** («Mover «Dentista», jueves 29, 16:00 → 17:00»), y como nada se ejecuta sin confirmar (P-03), una inferencia equivocada cuesta un «Descartar», nunca una acción.
3. **Ambigüedad: alternativas, no pregunta abierta.** Si hay más de un candidato razonable, el asistente no pregunta «¿cuál?» en texto libre: muestra **una lista de alternativas armada por el código** a partir del resultado de la consulta (título, fecha, hora, y de quién es), y la persona elige una. Es el mismo mecanismo que ya existe para las alternativas de horario en conflicto (decisión 17 de `02-agenda`): elegir no pasa por el modelo. Si la persona escribe en vez de elegir, el mensaje se interpreta con las alternativas como contexto.

| Situación | Qué pasa |
|---|---|
| Un solo candidato claro | Se propone directamente, con la inferencia visible en la tarjeta |
| Dos o más candidatos | Turno nuevo de tipo `alternativas_de_referente`: lista para elegir; nada se propone hasta elegir |
| Ningún candidato | «No encuentro ningún compromiso que coincida con «dentista» esta semana. ¿Cuál quieres mover?» y, si procede, una consulta más amplia |
| La persona escribió otra cosa mientras había alternativas | Se descartan las alternativas y se interpreta el mensaje nuevo (igual que con una propuesta pendiente, REQ-AGT-01) |

Lo que decide si hay ambigüedad es **código**, no el modelo: el modelo llama a la herramienta con lo que entendió («dentista», «jueves»), la herramienta devuelve los candidatos, y si son más de uno con puntuación parecida, el grafo va a `alternativas` en vez de a `esperar_decision`. Es coherente con P-02 y con el nodo `preguntar` que ya existe para el dato que falta.

#### 6.4.6 Lo que sigue chocando y hay que decidir

- **Varias intenciones en una frase** («agenda el dentista el jueves y recuérdame pagar el recibo»): el grafo impone una acción a la vez. Se atienden **en secuencia**, cada una con su tarjeta, y la segunda espera a que se decida la primera. Es el mismo choque que REQ-CAP-10 (voz) y debe resolverse una sola vez.
- **Qué actividades tienen hilo.** En esta fase, solo compromisos (lo único que existe). Tareas, reuniones y encargos entran cuando existan, con la misma regla.
- **Retención del hilo.** Sigue la de la actividad: un compromiso pasado conserva su hilo mientras conserve el compromiso.

#### 6.4.7 Borrador del hallazgo y de los requisitos

Para `specs/07-agente/spec.md` §5 y §3, si el equipo lo acepta:

> **H-AGT-17.** La conversación persistente (REQ-AGT-03) crece sin estructura. Se decide que la unidad de memoria del agente es la **actividad**: cada turno queda ligado a la actividad que resolvió, el hilo de una actividad es una vista sobre la transcripción y sus Operaciones, y hay una sola puerta de entrada más la entrada desde el detalle de cada actividad. La persona no crea ni archiva conversaciones.

> **REQ-AGT-04.** CUANDO una solicitud se refiera a una actividad existente, EL SISTEMA la identificará con un id devuelto por una herramienta; SI el contexto permite inferir una sola actividad razonable, ENTONCES la propondrá mostrando cuál infirió; SI hay más de una, ENTONCES mostrará las candidatas para que la persona elija, sin proponer nada hasta entonces.
>
> **Criterio de aceptación**
> DADO que la persona tiene «Dentista» el jueves 29 y «Dentista» el 12 de noviembre
> CUANDO escriba «mueve el dentista a las 5»
> ENTONCES el asistente muestra las dos como alternativas, con fecha y hora, y no propone nada
> Y CUANDO la persona elija la del jueves 29
> ENTONCES aparece la tarjeta de mover ese compromiso a las 17:00, pendiente de confirmar
> Y DADO que solo existe un «Dentista» en las próximas dos semanas
> CUANDO escriba «mueve el dentista a las 5»
> ENTONCES el asistente propone moverlo directamente y la tarjeta dice cuál es

> **REQ-AGT-05.** EL SISTEMA mostrará, desde el detalle de una actividad, el hilo de lo que se habló y se hizo sobre ella; y CUANDO la persona escriba desde ese detalle, interpretará la solicitud con esa actividad como contexto.


---

## 7. Cómo se traduce a LangGraph y a la base de datos

Sin escribir código: lo justo para que el plan pueda redactarse.

| Pieza | Hoy | Propuesto |
|---|---|---|
| `thread_id` | Id de `conversacion_agente` | Id de `episodio_asistente` (puede ser la misma tabla renombrada, con `sesion_id`) |
| `EstadoAsistente.turnos` | Acumula toda la transcripción en el estado | **Se quita del estado.** Los turnos se escriben en `turno_asistente` desde el servicio al terminar cada invocación del grafo |
| `EstadoAsistente.mensajes` | 20 últimos | Igual |
| `interpretar` | `sistema = instrucciones(referencia)` | `sistema = instrucciones(referencia) + notaDeContinuidad(perfil)`; la nota la arma un servicio desde `operacion` (estado `ejecutada`, `origen = agente` o controles directos, últimas *n*) |
| `comunicar` | Marca `cerrada` y la conversación se cierra | Marca el episodio como cerrado; el servicio abre otro en el siguiente mensaje **sin tocar la transcripción** |
| `GET /asistente/conversacion` | Turnos de la conversación abierta | Transcripción paginada de la persona (`desde`, `limite`), con el id del episodio abierto y lo pendiente |
| `punto_control_agente` | 2 puntos, con transcripción dentro | 2 puntos, solo mensajes del episodio; se pueden borrar los episodios cerrados tras un plazo sin perder nada visible |
| Pantalla web y móvil | Reemplaza la lista al cerrarse | Añade siempre; separador entre episodios; «ver anteriores» para paginar |
| Herramienta nueva (opcional, fase siguiente) | — | `conversacion.acciones_recientes(desde, hasta)`: devuelve acciones confirmadas en un rango, marcadas como datos (H-AGT-15), para «¿qué agendé esta semana?» |
| Evaluación (`evaluar-asistente`) | Casos de primera herramienta | Añadir casos con `historia` + nota: «mejor a las 5» tras confirmar debe consultar y proponer `agenda_modificar_evento` con el id; «¿qué hicimos?» debe responder con la nota sin inventar |

**Dos cuidados concretos:**

- La nota de continuidad entra al modelo como **datos, no instrucciones**, con la misma envoltura de H-AGT-15, porque incluye títulos escritos por la persona o por terceros.
- El resumen por el modelo, si se implementa, se dispara **solo** cuando el episodio supera la ventana, nunca en cada turno (coste y cuota de Groq, H-AGT-13).

---

## 8. Qué cambia en los `.md` (el rumbo dentro del método SDD)

Este es el «cambio de rumbo» traducido al método: qué documento cambia, en qué sentido, y en qué orden.

| Orden | Documento | Cambio | Tipo |
|---|---|---|---|
| 1 | `specs/07-agente/spec.md` §5 | Hallazgo nuevo **H-AGT-16**: «REQ-AGT-01 ata transcripción, contexto y memoria a un solo ciclo; la pantalla se vacía y el agente no puede referirse a lo recién hecho». Con la decisión del equipo | Hallazgo |
| 2 | `specs/07-agente/spec.md` §3 | **REQ-AGT-01 v2** (texto en §8.1 de este informe). Sustituye al vigente y al borrador de §6; §6 se cierra con la decisión | Requisito |
| 3 | `specs/07-agente/spec.md` §3 | **REQ-AGT-03** (nuevo): la transcripción persiste y es consultable | Requisito |
| 4 | `specs/glosario.md` | «Conversación» deja de ser *desechable*. Se separan **Transcripción**, **Episodio** y **Sesión** (definiciones en §8.2). «Hilo» (de tarea) no cambia | Glosario |
| 5 | `design/ARQUITECTURA-VISUAL-WEB.md` §2 y `ARQUITECTURA-VISUAL-MOVIL.md` | La columna de conversación muestra la transcripción con separadores de episodio y paginación; deja de vaciarse | Diseño |
| 6 | `specs/07-agente/plan.md` §4.1, §4.3, §6, §9, §10 | Estado sin `turnos`; nota de continuidad en §6; `GET /asistente/conversacion` paginado; tabla `turno_asistente`; episodio como unidad del hilo | Plan |
| 7 | `specs/07-agente/tasks.md` | **T-038** transcripción propia y pantalla que no se vacía · **T-039** nota de continuidad y evaluación ampliada · **T-040** retención de episodios cerrados (cierra lo pendiente de H-AGT-14) · **T-041** (opcional) herramienta de acciones recientes | Tareas |
| 8 | `SPEC.md` §8 y §11 | Registrar la decisión y el cambio de REQ-AGT-01 | Gobierno |
| 9 | `INFORME-LANGGRAPH.md` §3 | Marcar la recomendación 3 («nota de la última acción») como adoptada en esta forma | Informe |
| 10 | `specs/trazabilidad.md` | Se regenera | Automático |

Nada de esto toca `02-agenda`, `06-acceso` ni la cola en espera. Las pruebas existentes de REQ-AGT-01 cambian en un punto: `agente.conversacion-con-contexto` debe comprobar que «mejor a las 5» tras confirmar lleva a **consultar y proponer modificación**, no a «¿qué quieres mover?».

### 8.1 Texto propuesto de REQ-AGT-01 v2 y REQ-AGT-03

Borrador para que el equipo lo discuta; en EARS, como el resto del `spec.md`.

> **REQ-AGT-01 (v2).** MIENTRAS un episodio esté abierto, EL SISTEMA interpretará cada solicitud junto con los turnos de ese episodio; CUANDO el episodio se cierre, EL SISTEMA empezará el siguiente con una nota, escrita por el código, de las últimas acciones confirmadas de la persona y de lo que tiene en espera, y sin los turnos anteriores.
>
> **Criterio de aceptación**
> DADO que el asistente propuso «Dentista, jueves de 16:00 a 17:00» y la persona no ha confirmado
> CUANDO escriba «mejor a las 5»
> ENTONCES el asistente propone el mismo compromiso a las 17:00 y la propuesta anterior queda descartada
> Y DADO que esa propuesta ya se confirmó
> CUANDO la persona escriba «mejor a las 5»
> ENTONCES el asistente consulta la agenda y propone mover «Dentista» a las 17:00 en una tarjeta nueva, y nada cambia hasta que la persona la confirme
> Y CUANDO la persona pregunte «¿qué hicimos?»
> ENTONCES el asistente responde con las acciones confirmadas de la nota, sin inventar ninguna

> **REQ-AGT-03.** EL SISTEMA conservará la transcripción de lo que la persona y el asistente se dijeron, separada por episodios, y la mostrará al abrir la conversación aunque el episodio se haya cerrado; SI la persona pide ver más, ENTONCES EL SISTEMA mostrará los episodios anteriores por páginas.
>
> **Criterio de aceptación**
> DADO que la persona confirmó un compromiso y el episodio se cerró
> CUANDO escriba una solicitud nueva
> ENTONCES sigue viendo el episodio anterior, con un separador, y la solicitud nueva debajo
> Y CUANDO cierre y vuelva a abrir la aplicación
> ENTONCES ve lo mismo

### 8.2 Definiciones propuestas para el glosario

| Término | Definición | Fuente | No confundir con |
|---|---|---|---|
| **Transcripción** | Historial de lo que la persona y el asistente se dijeron, con sus tarjetas y resultados. Es de la persona: persiste y se puede repasar | REQ-AGT-03 | *Contexto* (lo que lee el modelo) |
| **Episodio** | Una intención con su acción, desde que se pide hasta que su tarjeta se confirma o descarta, o se cierra sin acción. Unidad de memoria corta del agente | REQ-AGT-01 v2 | *Sesión* |
| **Sesión** | Sucesión de episodios sin pausa larga, tal como la percibe la persona. Solo organiza la transcripción; no tiene estado propio | REQ-AGT-03 | *Episodio* |
| **Nota de continuidad** | Resumen determinista, escrito por el código, de las últimas acciones confirmadas y de lo que está en espera. Entra al contexto de cada episodio nuevo | REQ-AGT-01 v2; P-02 | Un resumen escrito por el modelo |
| **Conversación** (web) | Columna de 528 px donde se ve la transcripción y se confirman operaciones | `ARQUITECTURA-VISUAL-WEB.md` §2 | Ya no es «desechable» |

---

## 9. Lo que no conviene hacer

- **Enviar toda la transcripción al modelo.** Más contexto no es más precisión; es lo contrario, según la guía de Anthropic. El recorte a 20 y la nota corta son el diseño correcto.
- **Dejar que el modelo escriba la lista de acciones.** Es la única fuente de verdad de lo que pasó; si la escribe el modelo, un error se vuelve «memoria». La escribe el código desde las Operaciones.
- **Usar el almacén (`Store`) de LangGraph tal cual para la memoria larga.** Por la misma razón que el punto de control: debe pasar por Prisma y el filtro por organización (P-04).
- **Resumir en cada turno.** Solo cuando el episodio supere la ventana. Con Groq gratuito, cada llamada extra cuenta (H-AGT-13).
- **Construir la memoria por entidad ahora.** No hay tareas, equipos ni proyectos todavía; sería memoria sin nada que recordar. Reservarle el sitio basta.
- **Cambiar de framework.** El grafo, la interrupción y la persistencia funcionan y están probados; el problema es la composición del contexto y el ciclo de vida, no LangGraph.
- **Abandonar el método.** Lo que falló fue un requisito concreto y una definición del glosario; el método es justamente lo que permite cambiarlos con trazabilidad.

---

## 10. Decisiones que le tocan al equipo

Para registrar en `spec.md` §5 cuando se decidan.

1. **Adoptar la separación en tres capas y los tres ciclos de vida** (§6), o quedarse con el borrador de §6 del `spec.md`.
2. **Cierre del episodio por inactividad:** ¿30 minutos? ¿Otro valor? Hoy un episodio sin acción queda abierto para siempre (H-AGT-05).
3. **Cuántas acciones lleva la nota de continuidad:** propuesta, las últimas 5 o las de los últimos 7 días, lo que sea menor.
4. **Retención de la transcripción:** ¿90 días? ¿Indefinida mientras la cuenta exista? Afecta a lo que la persona espera ver y a P-10 (lo personal no visible para la empresa).
5. **Retención de episodios cerrados en el punto de control:** propuesta, borrarlos a los 7 días; la transcripción y la auditoría ya conservan lo que importa.
6. **Si entra la herramienta `conversacion.acciones_recientes`** en esta fase o en la siguiente.
7. **Preferencias explícitas en el perfil (capa 3):** confirmar que quedan para después de las tareas personales (CUN-03).
8. **Actividad como unidad de memoria (6.4):** aceptar H-AGT-17, REQ-AGT-04 y REQ-AGT-05; decidir si la lista de alternativas de referente entra en esta fase o cuando exista el detalle de actividad.
9. **Varias intenciones en una frase (6.4.6):** en secuencia con una tarjeta cada una, resuelto una sola vez para texto y voz.

---

## 11. Fuentes

**Oficiales (fabricantes de framework o de modelo)**

- LangGraph, «Add and manage memory» (memoria corta por hilo, memoria larga en el almacén, recortar y resumir): https://docs.langchain.com/oss/python/langgraph/add-memory
- LangGraph, guía de memoria (how-to, versión anterior de la documentación, mismo contenido): https://langchain-ai.github.io/langgraph/how-tos/memory
- Anthropic, «Effective context engineering for AI agents» (presupuesto de atención, *context rot*, compactación, notas estructuradas, recuperación justo a tiempo, diseño de herramientas): https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Google, «Remember this: Agent state and memory with ADK» (sesión, estado con prefijos de alcance y memoria de largo plazo): https://cloud.google.com/blog/topics/developers-practitioners/remember-this-agent-state-and-memory-with-adk
- Google ADK, documentación de memoria: https://google.github.io/adk-docs/sessions/memory

**Referencia (guías de diseño y método)**

- Cloudscape Design System (AWS), patrón «Conversational history» para IA generativa: https://cloudscape.design/patterns/genai/history
- Microsoft Dynamics 365, «Persistent messaging in chat» (por qué se hizo visible el historial anterior en la sesión nueva): https://learn.microsoft.com/en-us/previous-versions/dynamics365-release-plan/2020wave2/service/dynamics365-customer-service/persistent-messaging-chat
- Microsoft Developer Blog, «Diving into Spec-Driven Development with GitHub Spec Kit» (especificaciones vivas, no cascada): https://developer.microsoft.com/blog/spec-driven-development-spec-kit/
- Visual Studio Magazine, cobertura de los principios de Spec Kit (retroalimentación bidireccional, refinamiento continuo): https://visualstudiomagazine.com/articles/2025/09/16/github-spec-kit-experiment-a-lot-of-questions.aspx

**Del propio repositorio**

- `specs/07-agente/spec.md` §3, §5 y §6; `specs/07-agente/plan.md` §4, §6, §10; `specs/07-agente/tasks.md` T-032, T-034, T-037
- `apps/api/src/agente/grafo/grafo-asistente.ts`, `apps/api/src/agente/asistente.service.ts`, `apps/web/src/app/aplicacion/conversacion.tsx`
- `specs/glosario.md`, entradas «Conversación» e «Hilo»; `design/ARQUITECTURA-VISUAL-WEB.md` §2
- `INFORME-LANGGRAPH.md` §1, §3, §4; `PROPUESTA-TECNICA.md` §7.3 a §7.5; `SPEC.md` §2.1 y §3
