# Glosario

**Para qué existe.** Para que cada término signifique una sola cosa en especificaciones, diseño, código y sustentación. Si un `spec.md` usa una palabra con otro sentido, el defecto está en el `spec.md`, no aquí.
**Cómo se cambia.** Igual que un requisito: primero aquí, después donde se use, y una línea en `SPEC.md` §11.
**Nombres en código.** Las entidades conservan su nombre de negocio en español (`evento_agenda`, `tarea`), según `PROPUESTA-TECNICA.md` §8.

---

## 1. Actores y roles

| Término | Definición | Origen | No confundir con |
|---|---|---|---|
| **Usuario Personal** | Persona que usa NexoAI para organizar sus propias actividades. Los planes Gratuito y Personal son el mismo actor | E1 Act. 2 | — |
| **Gerente** | Abreviatura de *Gerente / Responsable de Equipo*: persona de una organización cliente que coordina a un equipo. También es Usuario Personal de su propia agenda, porque los planes son acumulativos. **Se es responsable de un equipo, no de la organización entera**: una misma persona puede ser responsable de un equipo y colaboradora en otro (REQ-ACC-16) | E1 Act. 2; `REPLANTEO.md` §4.3 | — |
| **Colaborador** | Persona de un equipo que recibe encargos. **Tiene cuenta**, con el rol `colaborador`: usa el agente como el Plan Empresarial sobre lo suyo, desde la web o el móvil, ve las tareas que tiene asignadas y responde en la aplicación. **No asigna tareas a otros**: eso solo lo hace el responsable del equipo | E1 Act. 2; D-17; REQ-ACC-13 | *Participante externo*, que no tiene cuenta |
| **Participante externo** | Persona **sin cuenta** cuya disponibilidad se necesita para coordinar. Solo se lee de ella libre u ocupado, y solo con su consentimiento por invitación. Si es entidad o atributo está por decidir (D-8) | `REPLANTEO.md` §4.8; R-13, R-14; D-17 | *Colaborador*, que sí tiene cuenta |
| **Organización** | Cliente que crea las cuentas, asigna roles y decide el plan. No es actor del negocio | E1 Act. 2; R-45 | — |
| **Organización personal** | Organización de una sola cuenta, que existe desde que esa cuenta se crea. No tiene administrador ni equipos. Es donde vive lo de esa persona, y no cambia al afiliarse. *Propuesto el 6 de noviembre de 2026* | REQ-ADM-01 | *Organización de empresa* |
| **Organización de empresa** | Organización con administradores, cuentas propias, cuentas afiliadas y equipos. *Propuesto el 6 de noviembre de 2026* | REQ-ADM-01 | *Organización personal* |
| **Administrador** | Cuenta con autoridad sobre una organización de empresa: sus cuentas, sus afiliaciones y sus equipos. **No es un tipo de gerente**: no le da acceso al trabajo de ningún equipo ni al contenido de ninguna cuenta. Puede haber varios y nunca ninguno. *Propuesto el 6 de noviembre de 2026* | REQ-ADM-02, 03 | *Gerente*, que es responsable de un equipo |
| **Cuenta propia** | Cuenta que dio de alta la organización de empresa. Sobre ella la organización decide plan, suspensión, baja y contraseña (REQ-ACC-12). *Propuesto el 6 de noviembre de 2026* | REQ-ADM-09, 15 | *Cuenta afiliada* |
| **Afiliación** | Pertenencia de una cuenta personal a una organización de empresa, que propone un administrador y **acepta la persona**. La cuenta sigue siendo de su titular, lo suyo sigue donde estaba y la empresa no lo ve; mientras dura, tiene el Plan Empresarial. Se la llama **cuenta afiliada**. *Propuesto el 6 de noviembre de 2026* | REQ-ADM-17 a 27 | *Cuenta propia*; *Participante externo*, que no tiene cuenta |

## 2. Agentes

| Término | Definición | Origen | No confundir con |
|---|---|---|---|
| **Asistente** | Nombre que ve el usuario para el agente de NexoAI. En las especificaciones, «el asistente no está disponible» significa que **el proveedor del modelo no responde** | `SPEC.md` P-11 | *Asistente Personal Inteligente*, que es uno de los dos agentes |
| **TN-01 Asistente Personal Inteligente** | Configuración del agente para la organización individual: CUN-01 a 04 y 10 | E1 Act. 5 | — |
| **TN-02 Coordinador Empresarial Inteligente** | Configuración del agente para coordinar personas: CUN-05 a 09 | E1 Act. 5 | — |
| **Herramienta** | Operación tipada con la que el agente actúa sobre los datos. Es la única forma que tiene de hacerlo | AD-04; `PROPUESTA-TECNICA.md` §7.2 | — |
| **Modo degradado** | Estado en el que el asistente no está disponible. Lo pedido queda **en espera** y lo existente se sigue consultando | R-42; P-11 | *Sin permiso*: falta una autorización y el asistente funciona |
| **En espera** | Estado de una solicitud guardada que todavía no se puede atender. No ha creado ni enviado nada. Tiene un motivo: el asistente no responde o falta un permiso (REQ-CAP-23). Hasta el 7 de noviembre de 2026 había un tercero, la tarea que esperaba a las tareas personales (REQ-AGT-02 v1); desde esa fecha una tarea se propone (REQ-AGT-02 v2, REQ-CUN03-01), y las que quedaron en espera antes se muestran como «se está preparando para que la confirmes en Tareas» (H-TP-16) hasta convertirse en propuestas (REQ-CUN03-17). Se ve en la conversación y en la franja sobre la agenda de hoy (REQ-CAP-25) | REQ-CAP-23, REQ-CAP-24, REQ-CAP-25; REQ-AGT-02; REQ-CUN03-17 | *Error*; *fuera del plan*. Los tres no pueden verse igual. *Por confirmar*: la tarea ya convertida en propuesta, en Tareas |
| **Transcripción** | Historial de lo que la persona y el asistente se dijeron, con sus tarjetas y resultados, separado por episodios. Es de la persona: persiste y se puede repasar por páginas (REQ-AGT-03). *Avalado el 5 de noviembre de 2026* | REQ-AGT-03; H-AGT-16 | *Contexto*, lo que lee el modelo, que no crece con ella |
| **Registro del asistente** | Lo que el asistente hizo por la persona: cada acción que ella confirmó y que se ejecutó, con la hora de ejecución, qué se hizo y desde dónde se pidió (la conversación o un control de la pantalla). Lo descartado, lo que espera y lo que falló no entra. Es una vista sobre las acciones ya ejecutadas, no una copia. Se ve en la sección Actividad. *Propuesto el 7 de noviembre de 2026* | REQ-CUN02-27; H-JOR-04 a 07 | *Transcripción*, que es lo que se dijo; *Tiempo registrado*, que lo avala la persona; *Registro*, modo del lienzo web |
| **Episodio** | Una intención con su acción: desde que se pide hasta que su tarjeta se confirma o se descarta, o se cierra sin acción por inactividad. Es la memoria corta del asistente: lo único de la transcripción que lee el modelo. *Avalado el 5 de noviembre de 2026* | REQ-AGT-01 v2; H-AGT-16 | *Sesión*; *Conversación* |
| **Sesión** | Sucesión de episodios sin una pausa larga, tal como la percibe la persona. Solo organiza la transcripción; no tiene estado propio. *Avalado el 5 de noviembre de 2026* | REQ-AGT-03 | *Episodio*; la sesión de acceso (REQ-ACC-02) |
| **Nota de continuidad** | Texto corto que escribe el código, no el modelo, con las últimas acciones confirmadas de la persona y lo que tiene en espera. Entra al contexto de cada episodio nuevo, marcada como datos (H-AGT-15). *Avalado el 5 de noviembre de 2026* | REQ-AGT-01 v2; P-02 | Un resumen escrito por el modelo |
| **Actividad** (memoria del asistente) | Objeto del dominio sobre el que el asistente actúa y al que se liga lo que se habló: hoy, el compromiso; después, la tarea, la reunión y el encargo. Es la unidad de memoria del asistente (H-AGT-17). *Avalado el 5 de noviembre de 2026; tercer sentido de la palabra, ver §6, C-2* | REQ-AGT-04, REQ-AGT-05; H-AGT-17 | **Actividad**, la sección; *actividad* como tarea en el Entregable 1 |
| **Alternativa de referente** | Una de las actividades candidatas cuando la persona se refiere a «el dentista» y hay más de uno. La lista la arma el código y elegir no pasa por el modelo. *Avalado el 5 de noviembre de 2026* | REQ-AGT-04 | *Alternativa*, que es un horario libre |

## 3. Objetos del dominio

| Término | Definición | Origen | No confundir con |
|---|---|---|---|
| **Compromiso** | Algo con fecha y hora en la agenda del usuario. Es un **Evento de Agenda** (EN-02) | E1 EN-02 | *Compromiso de reunión*: ver §6, conflicto C-1 |
| **Tarea** | Algo que hay que hacer y que tiene un responsable (EN-04). Puede ser personal o delegada | E1 EN-04; RN-EST-02 | *Apunte*, que no pide nada |
| **Tarea personal** | Tarea que una persona tiene para sí: ella es su responsable y la única que la ve, también frente al responsable de su equipo (REQ-ACC-17). Está pendiente, hecha o descartada, y mientras está pendiente cae en una sola franja: con fecha, sin fecha o esperando de alguien. No se asigna ni se delega. *Propuesto el 6 de noviembre de 2026* | CUN-03; REQ-CUN03-03, REQ-CUN03-19 | *Tarea asignada* y *Encargo* (CUN-07, CUN-09); *Compromiso*, que tiene hora en la agenda |
| **Bitácora de la tarea** | Lo que la persona contó sobre cómo va una tarea personal suya, avance por avance y en orden. Es un dato de la tarea, no una conversación: no depende de que el episodio siga abierto ni del plazo de la transcripción, y el asistente la lee cuando se le pregunta cómo va esa tarea. Lo que falta hacer va escrito dentro del avance, sin lista aparte. *Propuesto el 25 de noviembre de 2026* | R-27; REQ-CUN03-21 a 25 | *Hilo*, que es la conversación sobre la tarea; *Transcripción* |
| **Ficha de la tarea** | Lo que el asistente mira de cada tarea pendiente para saber de cuál se habla: su texto, su contexto, cuándo es o de quién se espera, y sus últimos avances. La arma el código y le llega al modelo marcada como datos. *Propuesto el 25 de noviembre de 2026* | H-TP-26; REQ-CUN03-26 | — |
| **Contexto de la tarea** | Con quién o para qué es una tarea, dicho por la persona al pedirla («lo veo con Juan y Rosa»). Es opcional y forma parte de la ficha | REQ-CUN03-26 | *Avance*, que dice cómo va |
| **Avance** | Cada anotación de la bitácora de una tarea: el texto que la persona confirmó y cuándo se anotó. No cambia el estado ni la franja de la tarea | REQ-CUN03-21, REQ-CUN03-22 | *Paso*, que las tareas personales no tienen (REQ-CUN03-16) |
| **Pendiente sin fecha** | Tarea sin fecha, ya sea porque no se le dio o porque no cabía en el día pedido (R-1) | REQ-CAP-02, REQ-CAP-07 | — |
| **Petición** | Algo que un miembro le pide a un compañero de su equipo sin ser su responsable. El compañero la acepta o la rechaza; mientras no la acepta, no es una tarea suya (REQ-CUN07-18) | Decisión del equipo, 23 de octubre de 2026 | *Encargo*, que solo hace el responsable |
| **Esperando de alguien** | Tarea cuyo avance depende de un tercero. Solo se guarda qué se espera y de quién (R-12). *Precisado el 6 de noviembre de 2026:* «de quién» es el nombre tal como lo dijo la persona, sin contacto; se guarda también desde cuándo y, si se dijo, para cuándo | REQ-CAP-02; R-12; REQ-CUN03-04 | *Encargo*, donde a esa persona sí se le asigna algo |
| **Recibido** | Forma de dar por hecha una tarea que esperaba de alguien: lo esperado llegó. Guarda el día en que se marcó y no crea nada más. *Propuesto el 6 de noviembre de 2026* | REQ-CUN03-05 | — |
| **Encargo** | Tarea delegada a un colaborador, vista desde quien la delegó. Declara sus preguntas, y una de ellas es el criterio de terminado. El colaborador la ve en su aplicación como **tarea asignada** | `REPLANTEO.md` §4.11; REQ-ENC-01, 02; D-17 | — |
| **Correo de aviso** | Correo que solo informa al colaborador de una tarea nueva y remite a la aplicación. No tiene botones y no se puede responder | REQ-CUN07-16; DP-03 | *Correo asistido* (CUN-04), que redacta el asistente y sale desde el Gmail del usuario |
| **Apunte** | Algo que la persona pensó o que ocurrió y que no pide nada. Se ancla al día en que se capturó, no aparece en Tareas y no requiere confirmación | `design/ARQUITECTURA-VISUAL-MOVIL.md` «La regla que separa tarea de apunte» | *Tarea* |
| **Memo por lugar** | Recordatorio que se dispara una sola vez al llegar a un lugar | R-7; REQ-CAP-17 | — |
| **Planificación de Jornada** | Propuesta que distribuye compromisos y tareas en un período (EN-03). Si «período» puede ser más largo que un día está por decidir (D-9) | E1 EN-03 | — |
| **Bloque** | Tramo de tiempo dentro de una planificación o del registro de tiempo | 02-jornada | — |
| **Tiempo registrado** | Lo que la persona avala que hizo. El sistema lo propone y nunca lo registra solo (R-2) | R-2, R-3 | *Tiempo planificado* |
| **Equipo de Trabajo** | Conjunto de perfiles de una organización que se consideran juntos al coordinar (EN-05) | E1 EN-05 | — |
| **Reunión** | Encuentro coordinado entre participantes (EN-06) | E1 EN-06 | — |
| **Comunicación** | Correo o llamada gestionados con ayuda del asistente (EN-07). Una llamada consiste en **marcar**: el asistente no habla por el usuario | E1 EN-07; `REPLANTEO.md` §10 | — |
| **Resumen de Reunión** | Síntesis de temas, decisiones y compromisos de una reunión (EN-08). Se borra con su reunión | E1 EN-08; RN-EST-04 | — |
| **Resumen del equipo** | Respuesta breve, en la conversación, con los puntos clave del trabajo del equipo: lo terminado, lo atrasado y lo bloqueado. El detalle solo se da si se pide. Solo para el responsable (REQ-CUN08-03) | CUN-08 | *Reporte del equipo* |
| **Reporte del equipo** | Documento con formato, sobre un período, pensado para compartirlo o archivarlo: resumen ejecutivo, indicadores, retrasos con su causa y el detalle. Solo para el responsable (REQ-CUN08-04) | CUN-08 | *Resumen del equipo* |
| **Hilo** | Conversación ligada a una tarea. Vive dentro de la tarea, nunca como sección propia, y el asistente solo lo lee si se le pide. *Avalada el 5 de noviembre de 2026: REQ-AGT-05 lo extiende a toda actividad (memoria del asistente), como una vista sobre la transcripción y las Operaciones de esa actividad, no como una copia* | R-17, R-24, R-37; REQ-AGT-05 | *Conversación* (web); *Transcripción*, que es de todas las actividades |
| **Categoría** | Agrupación de compromisos que el agente deriva de títulos repetidos y que el usuario confirma. Su **ámbito** (laboral o personal) lo heredan los bloques. Está en propuesta (D-16) | `REPLANTEO.md` §4.9 | — |
| **Ámbito** | Propiedad de una categoría: laboral o personal. Lo personal no es visible para la empresa (R-22) | `REPLANTEO.md` §4.9; R-22 | — |

## 4. Interfaz

| Término | Definición | Origen | No confundir con |
|---|---|---|---|
| **Sección** | Uno de los tres destinos de trabajo, iguales en web y móvil: **Agenda** (lo que va a pasar), **Tareas** (lo que hay que hacer) y **Actividad** (lo que pasó) | R-23, R-32 | *Actividad* como sinónimo de tarea: ver §6, conflicto C-2 |
| **Nivel** | Escala dentro de una sección: Hoy · Semana · Mes | `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 | *Franja* |
| **Franja** | Corte de Tareas que no es temporal: con fecha, sin fecha, esperando de alguien, encargadas | R-38 | *Nivel* |
| **Por confirmar** | Grupo de Tareas, encima de las franjas, con las tareas que el asistente propuso al convertir lo que estaba en espera y que la persona todavía no confirmó ni descartó. No es una franja. *Propuesto el 6 de noviembre de 2026* | REQ-CUN03-17; H-TP-11 | *Franja*; la franja «en espera» de la agenda (REQ-CAP-25) |
| **Capa de captura** | Hoja que sube sobre la sección actual para pedir algo al asistente. No es una sección ni lleva a otra pantalla | R-36 | — |
| **Asa** | Control flotante del móvil que abre la capa de captura | `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 | — |
| **Conversación** | Columna web de 528 px, y capa de captura en el móvil, donde se crean y confirman operaciones. Muestra la transcripción con un separador entre episodios; **no se vacía al cerrar una operación** (REQ-AGT-03). *Definición del 5 de noviembre de 2026, avalada. La anterior decía «desechable: se vacía al cerrar la operación»* | `design/ARQUITECTURA-VISUAL-WEB.md` §2 y §5; REQ-AGT-03 | *Hilo*; *Episodio* |
| **Lienzo** | Columna web de 840 px con el objeto en curso y el registro de lo cerrado | `design/ARQUITECTURA-VISUAL-WEB.md` §2 | — |
| **Tarjeta de confirmación** | Presentación de la acción exacta, sus datos y lo que es irreversible, antes de ejecutarla | RN-ER-03; P-03 | Un «¿estás seguro?» genérico, que no la cumple |
| **Ajustes** | Configuración que se fija una vez. No es sección: se abre por encima, sin barra de pestañas | R-33, R-34, R-43 | — |
| **Área de administración** | Página de la web, solo para administradores, con las cuentas, las invitaciones y los equipos de la organización. **No es una sección** (R-32): se entra desde el pie de la navegación, junto a Ajustes, y no tiene conversación. En pantalla se llama «Administración». *Propuesto el 6 de noviembre de 2026* | REQ-ADM-05; `specs/08-administracion/spec.md` §5 | *Sección*; *Ajustes* |

**Regla de redacción (R-40):** ninguno de los términos de esta sección aparece en textos dirigidos al usuario. Son vocabulario del equipo.

## 5. Reglas y criterios

| Término | Definición | Origen |
|---|---|---|
| **Acción sensible** | Acción con efecto fuera de NexoAI, o que no se puede deshacer: enviar, crear en el calendario, delegar, cancelar | RN-ER-03; `PROPUESTA-TECNICA.md` §7.2 |
| **Confirmación previa** | Aval explícito del usuario a una tarjeta de confirmación, sin el cual no se ejecuta una acción sensible | RN-ER-03 |
| **Disponibilidad común** | Intervalo libre en las agendas de todos los participantes. Se calcula en código | RN-CAL-01, RN-INF-01 |
| **Alternativa** | Disponibilidad común que respeta la duración pedida y la banda horaria, ordenada según el criterio aprobado | `specs/05-equipos/spec.md` §1 |
| **Banda horaria** | 08:00–20:00 normal, 20:00–22:00 solo si se pide. Es un parámetro de la plataforma, no un dato del perfil | `05-equipos` §1; R-44 |
| **Criterio de terminado** | Condición, en una línea, que declara quien delega y que hace aplicable RN-INF-02 | R-19, R-29; REQ-ENC-02 |
| **Procedencia** | Si una actualización es un dato («Juan pulsó Hecho») o una interpretación del asistente. Siempre se ve | R-18 |
| **Vencida** | Marca de una tarea pendiente cuya fecha, o la fecha en que debía llegar lo esperado, ya pasó en la zona de la persona. La calcula el código; no es un estado y no cambia nada de la tarea. *Propuesto el 6 de noviembre de 2026* | REQ-CUN03-07; P-02 |

## 6. Conflictos de vocabulario abiertos

| # | Conflicto | Recomendación |
|---|---|---|
| C-1 | **«Compromiso» tiene dos sentidos.** En EN-02 es un evento con hora. En CUN-10 y CUN-11 es algo acordado en una reunión que debería convertirse en tarea | En especificaciones, «compromiso» es siempre un Evento de Agenda. El otro sentido necesita su propio término, que tiene que decidir el equipo al especificar CUN-10 |
| C-2 | **«Actividad» tiene dos sentidos.** El Entregable 1 la usa como sinónimo de tarea («delegar una actividad»). La interfaz la usa como nombre de la sección de lo que pasó. **Desde el 5 de noviembre de 2026, un tercero:** H-AGT-17, REQ-AGT-04 y REQ-AGT-05 la usan como unidad de memoria del asistente (compromiso, tarea, reunión, encargo). Anotado como INC-17 | En especificaciones nuevas se escribe «tarea». «Actividad», con mayúscula, es solo la sección. Los requisitos que ya dicen «actividad» por tarea no se reescriben salvo que se toquen por otro motivo. **El tercer sentido queda pendiente del equipo:** conservarlo con su entrada de §2 o buscar otra palabra |
| C-3 | **«Jornada» o «período».** EN-03 dice «período determinado» y su nombre dice «jornada» | Depende de D-9 |
