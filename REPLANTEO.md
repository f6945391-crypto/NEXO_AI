# Replanteo del producto — decisiones para el equipo

**Para:** Franco, Aixa, Vasco
**Última revisión:** 26 de septiembre de 2026
**Qué no es:** no es un cambio al Entregable 1. Es el material para decidir si hay que cambiarlo.

La arquitectura visual de la web, que sí está decidida, vive aparte en `design/ARQUITECTURA-VISUAL-WEB.md`. Aquí solo hay producto.

**Cómo leer este documento.** Lo marcado como **acordado** ya se decidió en sesión de trabajo. Lo marcado como **supuesto** lo decidí yo para poder avanzar y necesita que alguien lo confirme o lo tumbe. Lo de la sección 9 no está decidido por nadie.

---

## 1. El diagnóstico

El producto modelado tiene dos mitades que no se conectan.

**Mitad de reuniones:** CUN-05 consultar disponibilidad, CUN-06 coordinar reunión, CUN-10 obtener resumen.
**Mitad de trabajo:** CUN-03 tareas personales, CUN-07 delegar, CUN-08 seguimiento, CUN-09 gestionar asignada.

Entre las dos no hay ningún caso de uso. Y el punto exacto donde se rompe está dentro de CUN-10: su flujo principal, paso 5, dice que se identifican «temas, decisiones y **compromisos**». Esos compromisos se presentan al usuario y ahí mueren. Nadie los convierte en tareas, nadie las delega, nadie las sigue.

**La consecuencia comercial:** si el producto solo agenda reuniones, Google Calendar hace eso y es gratis. El puente compromiso → tarea delegada es lo que Calendar no hace.

---

## 2. Candidatos que cierran el hueco

| # | Caso de uso | Qué hace | Recomendación |
|---|---|---|---|
| CUN-11 | Convertir compromisos de reunión en tareas | Del resumen de CUN-10, cada compromiso se propone como Tarea con responsable y fecha; el gerente confirma | **Entra.** Es el puente, y no necesita entidad nueva: usa EN-04 y EN-08 |
| CUN-12 | Gestionar documentos de trabajo | El asistente localiza, resume y relaciona archivos ligados a una reunión o tarea | Depende de EN-09 y de la decisión de escritorio |
| CUN-13 | Preparar reunión con el material previo | Junta agenda, tareas abiertas y documentos antes de la reunión | Solo si entran 11 y 12 |

**Entidad nueva que implican CUN-12 y CUN-13:** `EN-09 Documento`. Es la novena entidad y obliga a revisar el diagrama de clases.

---

## 3. Escritorio como plataforma

Capacidades que no existen en web ni en móvil:

| Capacidad | Para qué sirve aquí |
|---|---|
| Ve tus archivos locales | CUN-12, sin subir nada a ninguna nube |
| Corre en segundo plano | Recordatorios y planificación sin pestaña abierta |
| Atajo global de teclado | Capturar en dos segundos desde cualquier aplicación |
| Sabe qué ventana está activa | Contexto sin que el usuario lo escriba |
| Procesa en local | Documentos que la empresa no quiere que salgan |

| Plataforma | Papel | Estado |
|---|---|---|
| Móvil | Captura y vida diaria | 13 cuadros, CUN-01 |
| Escritorio | Estación de trabajo de coordinación | No existe |
| Web | Superficie delgada y compartible | 20 cuadros, CUN-07 y CUN-05 |

**Decisión abierta:** ¿el escritorio **reemplaza** a la web como plataforma grande, o **se suma**? Si se suma, son tres familias de componentes.

---

## 4. Los tres niveles de venta

### 4.1 Lo que el Entregable 1 dice, y lo que no

Los tres planes aparecen una sola vez, en la Actividad 1, y no vuelven a mencionarse. El documento **descarta explícitamente** distinguirlos en el modelo, porque el usuario gratuito y el de pago «representan el mismo rol». No existe trazabilidad plan → caso de uso.

Todo el reparto de esta sección es, por tanto, construcción nuestra.

### 4.2 La frontera Gratuito / Personal — **acordado**

**Gratuito: el sistema responde a lo que le piden.** Registrar, consultar, modificar, anotar.
**Personal: el sistema propone sin que se lo pidan.** Planifica, anticipa, automatiza, acompaña.

Reactivo contra proactivo. Con esa línea, CUN-01 tal como está diseñado es Gratuito: interpretar «agéndame algo el viernes» sigue siendo reacción a una petición.

### 4.3 Qué tiene cada plan

**Plan Gratuito — anotar y consultar**

| Función | Origen |
|---|---|
| Registrar, consultar, modificar y cancelar compromisos | CUN-01 |
| Tareas personales | CUN-03 |
| **Registrar tiempo real**: confirmar bloques, declarar hacia atrás, cronómetro | CUN-01, CUN-03 |
| Informes del día y de la semana | Consulta |
| Buscar en compromisos, tareas y notas | Consulta |
| Notas sin fecha | CUN-01, CUN-03 |

**Por qué el registro de tiempo va en el gratuito y no en el de pago** — *supuesto mío, revisable*: anotar lo que hiciste es anotación, no propuesta, así que cae del lado reactivo de la frontera. Además el nivel gratuito necesita ser útil de verdad para retener, y los datos que genera son exactamente los que hacen que el Plan Personal valga la pena después. Un gratuito inútil no convierte a nadie.

**Plan Personal — que el sistema trabaje por ti**

| Función | Origen |
|---|---|
| Plan del día, replanificar, «el día no entra» | CUN-02 |
| Rutinas y hábitos con colocación flexible | CUN-01, CUN-02 |
| Bloques de concentración y No molestar automático | CUN-02 |
| Tiempo de desplazamiento con ubicación real | CUN-02 |
| Nota de voz de hasta 5 minutos | CUN-01, CUN-03 |
| Foto → compromisos, e importación de horario completo | CUN-01 |
| Memo por lugar | CUN-01 |
| **Correo asistido**: redactar, ordenar, previa, enviar confirmando | CUN-04 |
| **Llamada asistida**: resolver contacto, marcar, preguntar al colgar | CUN-04 |
| Esperando de alguien, y preguntar al terminar una actividad | CUN-03 |
| Seguimiento con horizonte | CUN-02, EN-03 |
| Coach como sesión con cierre | CUN-02 FA |
| Informe del mes | Consulta |
| Ámbito laboral / personal | CUN-01, CUN-03 |

**Plan Empresarial — todo lo anterior, más personas a cargo**

**Acordado:** los niveles son **acumulativos**. El Empresarial incluye entero el Personal, y el Personal entero el Gratuito. Lo que añade el Empresarial no es otra forma de organizarse: es **manejar personal y hacer el seguimiento correspondiente**. El gerente sigue teniendo su plan del día, su correo asistido y su registro de tiempo; encima de eso gana la capa de coordinación.

| Función | Origen |
|---|---|
| Consultar disponibilidad de equipo | CUN-05 |
| Coordinar reunión | CUN-06 |
| Delegar tarea | CUN-07 |
| Seguimiento de lo delegado | CUN-08 |
| Tarea asignada, vía respuesta de correo | CUN-09, ver 4.7 |
| **Invitar participantes y obtener su disponibilidad** | Ver 4.8 |
| Resúmenes de reunión | CUN-10, según 4.5 |
| Compromiso → tarea | CUN-11, si entra |
| Actividad con **alcance de equipo** | Propuesta técnica §9 |
| Administración del equipo | Propuesta técnica §6 |
| Plataforma grande: web, o escritorio si se decide | — |

### 4.4 Supuestos que hay que confirmar

| # | Supuesto | Qué pasa si es falso |
|---|---|---|
| ~~S-1~~ | ~~Los niveles son acumulativos~~ | **RESUELTO: sí son acumulativos.** Ver 4.3 |
| ~~S-2~~ | ~~¿Hay tipos de puesto dentro del Empresarial?~~ | **RESUELTO: el Colaborador no es usuario del aplicativo.** Ver 4.7 |
| S-3 | El registro de tiempo real es Gratuito | Ver el argumento de 4.3 |
| S-4 | Informe del día y la semana en Gratuito; el del mes en Personal | Corte arbitrario, puesto para que haya algo que ganar al pagar |
| S-5 | La administración del equipo entra pese a que el Entregable excluye la facturación | Se sostiene porque administrar permisos es autorización (RN-OP-01 a 04), no facturación |

### 4.7 El Colaborador no es usuario del aplicativo — **acordado**

**La decisión:** el aplicativo está enfocado en la gestión de actividades de quien **maneja personas**. El colaborador no tiene cuenta, no instala nada y no aparece como usuario.

**El argumento es de costo, y es el que manda.** Dar la capa Personal a cada colaborador significa un puesto de pago por cada empleado de la empresa cliente. En una organización de cincuenta personas eso multiplica el precio del contrato por cincuenta para vender, en realidad, una herramienta de coordinación que usan cinco gerentes. El producto se vuelve imposible de colocar. Estructurarlo alrededor del gerente mantiene el precio en proporción a quién obtiene el valor. Y el colaborador, en la práctica, ya reporta a su gerente por los canales de la empresa.

**Distinción que conviene no perder:** que la empresa no le pague un puesto **no** significa que el colaborador no pueda ser cliente del Plan Personal por su cuenta. Son dos relaciones comerciales distintas, y de hecho la segunda se alimenta de la primera: el colaborador recibe un enlace de delegación, ve que la herramienta funciona, y puede contratar el Personal por su lado sin que la empresa pague nada. **El correo de delegación es, además de una notificación, el canal de adquisición más barato que tiene el producto.**

**El matiz que salva el Entregable 1.** Actor del negocio y usuario del aplicativo no son lo mismo. El Entregable 1 modela el **negocio**, y en el negocio el Colaborador sí participa: recibe tareas, las ejecuta y comunica su estado. Lo que cambia es el **alcance del aplicativo**, que es más estrecho que el del negocio. Con esa lectura, el Entregable 1 no se toca: lo que hay que declarar en el Entregable 2 es **cómo se realiza** la participación del Colaborador sin que sea usuario.

**El agujero que abre, y hay que taparlo.** CUN-09 «Gestionar tarea asignada» se queda sin soporte de software, y con él RN-OP-04 —«una tarea asignada solo puede ser actualizada por su responsable o por un usuario autorizado»— y buena parte de CUN-08, porque el seguimiento necesita que el estado de la tarea cambie. Si solo el gerente puede moverlo, el seguimiento deja de ser coordinación y pasa a ser la contabilidad privada del gerente.

**Cómo se tapa — acordado: tres puertas, una sola tarea.** El correo de delegación lleva el contexto completo en el cuerpo, **botones de acción rápida** para lo frecuente, y **un enlace a un formulario** en nuestro dominio para cuando hay algo que escribir o hay que ver el hilo. Y si la persona simplemente **responde al correo**, eso también funciona. El colaborador sigue sin cuenta, sin contraseña y sin instalar nada: el formulario es una página, no una aplicación.

Es la misma decisión que en la captura del móvil: texto, voz o comando, tres puertas y una sola confirmación.

**Por qué en este orden, mirado desde el agente.** Lo que determina la calidad no es la comodidad del usuario sino **la forma de la entrada**:

| Puerta | Qué recibe el sistema | Interpretación | Costo |
|---|---|---|---|
| Botón | Un valor tipado, una de cuatro acciones | **Ninguna** | Cero llamadas al modelo |
| Formulario | Campos estructurados: estado, fecha propuesta, comentario | Solo el comentario, y es opcional | Casi cero |
| Responder al correo | Prosa con citas y firma pegadas | Toda | Una llamada por respuesta |

Eso es **AD-04 y AD-05**: lo determinista en código, el modelo solo donde aporta. Un botón «Hecho» no necesita un modelo de lenguaje.

Y es una **inversión del doble camino**: en el resto del producto el asistente es el camino principal y el formulario el respaldo; aquí lo estructurado es lo principal y el texto libre es el degradado.

**La regla que lo hace válido:** una respuesta de correo **nunca cambia el estado de la tarea por sí sola**. Llega al gerente como propuesta de actualización, con el texto original citado, y el gerente confirma. Así se mantiene RN-ER-03 y se respeta el espíritu de RN-OP-04: el responsable expresa, el usuario autorizado registra.

**Cuatro cosas que hay que resolver para que funcione:**

| Punto | Decisión |
|---|---|
| Emparejar la respuesta con su tarea | Dirección de respuesta distinta e **impredecible por tarea**. Es lo que ya hace cualquier gestor de incidencias |
| Suplantación | Se comprueba que el remitente coincide con la dirección invitada; la dirección de respuesta no se puede adivinar |
| Texto citado y firmas | El correo llega con el hilo pegado detrás. Hay que limpiarlo antes de interpretar |
| Interpretación | «¿Lo tengo para el viernes» no es un estado. El agente propone qué significa y el gerente decide |
| Idempotencia | Un botón pulsado dos veces no puede aplicar la acción dos veces. La pareja testigo-tarea sirve de clave de operación, como pide §7.2 |
| **Escáneres corporativos** | Los filtros de seguridad de las empresas **visitan todos los enlaces de un correo**. Por eso un botón nunca ejecuta al abrirse: pide una confirmación en la página. Sin esto, las tareas se marcarían solas |

**Reglas del enlace del formulario**

| Punto | Decisión |
|---|---|
| Testigo | Largo e impredecible, **válido solo para esa tarea** |
| Alcance | Muestra **esa tarea y nada más**. Nunca la lista del equipo ni otras tareas |
| Sesión | No inicia sesión ni deja nada abierto |
| Caducidad | Deja de funcionar cuando la tarea se cierra |
| Si lo reenvían | El enlace vale lo que vale el correo. Aceptable para una tarea de trabajo, pero se declara |

**Reutiliza CUN-04.** La misma maquinaria de comunicaciones asistidas sirve para el asistente personal y para el ciclo de delegación. No hay que construir un canal aparte.

### 4.8 Obtener la disponibilidad de gente que no es usuaria — **acordado**

Si el colaborador no es usuario, su agenda no está en NexoAI. Y sin agendas no hay CUN-05 ni CUN-06. La solución acordada: **el gerente invita por correo, cada persona acepta, y a partir de ahí se lee su disponibilidad.**

**Cómo lo haría, y los límites que van escritos:**

| Punto | Decisión |
|---|---|
| Qué se lee | **Solo libre / ocupado. Nunca el contenido de los eventos.** Es todo lo que CUN-05 necesita, y es lo que hace la invitación aceptable |
| Quién consiente | La persona, no su gerente. El consentimiento no se hereda del cargo |
| Cómo | Autorización contra su propio proveedor de calendario, con alcance mínimo |
| Revocable | Sí, en cualquier momento y sin pasar por el gerente |
| Mientras no acepta | El participante aparece **sin datos**, no como libre. Ya está especificado: `REQ-CUN05-08` y el cuadro `EX-01 Disponibilidad parcial` |
| Si rechaza o revoca | Igual que lo anterior, y el gerente lo ve declarado |

**Lo que ya estaba previsto sin saberlo:** la excepción EX-01 de CUN-05 —«algún participante no tiene información de disponibilidad»— describe exactamente el estado de alguien que no ha aceptado todavía. El requisito está escrito y el cuadro está diseñado. Lo único nuevo es el flujo de invitación.

**Lo que sí es nuevo:** un concepto de **Participante externo** —nombre, correo, estado de consentimiento y conexión de calendario— que no es un Perfil de Usuario. Esto absorbe y agranda la decisión D-8: ya no basta un campo de texto, porque hay que guardar estado de consentimiento.

### 4.9 Categorías, y el ámbito como propiedad suya — **propuesta**

El informe de la semana enseña «laboral 27 h 40 contra personal 3 h 30». Al dibujarlo se vio que el modelo no puede producir ese corte: **nada dice de qué tipo es un bloque.** D-10 lo resolvía con un atributo *ámbito* en cada Evento de Agenda, que obliga a etiquetar uno por uno.

La propuesta que lo sustituye:

> **El ámbito no se declara por bloque. Es una propiedad de la categoría.**

Declaras una vez que *Tesis* es personal y que *Comité de arquitectura* es laboral, y todo lo que caiga ahí lo hereda. Unas cinco preguntas en total en vez de una por evento.

**De dónde salen las categorías.** No las crea el usuario. Ese es el punto exacto donde esta función muere en las demás aplicaciones: te dan una lista vacía y un botón de «crear categoría», y a las dos semanas nadie etiqueta. Aquí **el agente las deriva de los títulos que ya se repiten en la agenda** —«Comité de arquitectura» cada jueves, «Revisión de avances» cada semana— y propone cuatro o cinco con su evidencia. El usuario confirma, renombra o fusiona, una vez.

**Por qué no se pelea con AD-04 y AD-05.** El modelo propone una vez; lo que el usuario acepta se guarda como **regla determinista**. A partir de ahí un título conocido se resuelve por tabla, sin llamada de inferencia. El modelo solo toca lo que nunca ha visto, y cuando lo toca pregunta una vez.

**Dos condiciones para que el informe no mienta**

1. La categoría propuesta **se ve como propuesta** y se corrige con un toque (R-18, procedencia visible).
2. **«Sin categoría» aparece en el informe.** No se reparte por criterio del sistema. Si lo escondiéramos, la suma cuadraría y el dato sería falso.

**Qué cambia en Empresarial.** Los planes son acumulativos, así que un gerente tiene las dos clases de categoría: las de trabajo y las suyas. De ahí sale un límite que hay que respetar desde ahora:

> **Lo que el usuario marca como personal no es visible para la empresa, aunque la empresa pague la cuenta.**

Es el mismo límite de privacidad que ya decidimos para el registro en web, y encaja con §9 de la propuesta técnica (minimización). La consecuencia de modelo es que **la categoría lleva ámbito y lleva visibilidad**, no solo ámbito.

**Diseñado:** `MOV-v2 / Categorías / 01 Propuestas` y `02 Ajustar una`.

---

### 4.10 Tres secciones en vez de cuatro — **acordado**

Hoy y Agenda eran dos pestañas para el mismo sujeto a distinto zoom. Se fusionan en **Agenda**, con selector Hoy · Semana · Mes, y el móvil baja a tres pestañas: **Agenda · Tareas · Actividad**.

Lo que se gana:

- **Un solo idioma de navegación.** Agenda y Actividad cambian de período con el mismo control. Antes el mismo movimiento se hacía de dos maneras.
- **La vista semanal deja de ser una funcionalidad pendiente** y pasa a ser el segundo nivel de Agenda. Ahí es donde se ve qué pendiente sin fecha cabría dónde, que es R-1 hecho visible.
- **Actividad deja de ser dos cosas.** Tenía el registro del asistente y los informes peleándose la misma pestaña, que son sujetos distintos. Ahora Actividad es tu tiempo —Día, Semana, Mes— y el registro del asistente es el segundo nivel, al que se baja desde el informe. Eso es lo correcto porque el registro contesta a la pregunta que el informe provoca: *¿y por qué dice que hice 3 h 40?* Es R-18 con forma.

Lo que se pierde, y hay que compensarlo: «Hoy» deja de estar escrito en la barra de pestañas. Se compensa haciendo que el nivel día abra **siempre** por defecto, nunca recordando el último nivel mirado.

**Coste:** obliga a tocar las pestañas de los 31 cuadros del móvil. Hecho. Los 13 de `04 Flujos` siguen con las cuatro viejas.

---

### 4.11 Acceso universal y sección Encargos — **acordado**

Dos añadidos que no rompen nada de lo anterior.

**El acceso es universal y no es un CUN.** Autenticarse no es un caso de uso del negocio, es un requisito del sistema: **no hay que tocar el Entregable 1**. Entra en la propuesta técnica y en el diseño como flujo antecedente.

- Se entra con **cuentas creadas en la base, cada una con su rol**. No hay registro abierto: el rol de la cuenta decide dónde aterrizas, Personal o Empresarial.
- El **primer ingreso** pide contraseña nueva, **zona horaria** y franja laboral. Ahí es donde RN-CAL-01 consigue por fin el dato del que depende, sin pedirlo a mitad de una conversación.
- **Google no es la identidad.** Se conecta después, y solo pide dos permisos: ver y editar el calendario, y **enviar correo en nombre del usuario**.

**El permiso de Google vive en el otro extremo: el colaborador.** Cada persona del grupo acepta **una vez**, por un enlace, y esa aceptación es la que habilita todos los correos posteriores. Aceptar **no es tener cuenta**, así que §4.7 sigue en pie sin un solo cambio. La aceptación se puede dar completa o solo para los correos, sin ceder disponibilidad, y se retira desde el pie de cualquier correo.

**Un encargo es una franja dentro de Tareas**, no una sección. Se probó como séptimo destino y era un error: el móvil ya había fusionado a tres secciones y la web no puede organizarse de otra manera (R-32). «Esperando de alguien» en Personal y «encargadas» en Empresarial son la misma franja a distinta escala.

**El encargo declara sus preguntas.** Y esto cierra D-15 mejor de lo que lo teníamos: **el criterio de terminado es una de las preguntas declaradas**, no un campo aparte. Cuatro tipos bastan:

| Tipo | Se contesta | Dónde |
|---|---|---|
| Opción | Un botón | En el propio correo |
| Fecha | Selector | Formulario |
| Número | Campo corto | Formulario |
| Texto libre | **Máximo 400 caracteres, con contador** | Formulario |

**El tope de 400 tiene tres motivos, y ninguno es estético:** acota lo que entra al contexto del agente —el mismo motivo de R-24—, obliga a contestar en vez de narrar, y hace la respuesta encajable en campos en vez de prosa.

**Lo que se envía y lo que no se lee.** El correo sale **a nombre del gerente desde su Gmail**, porque un correo de un dominio desconocido preguntando por trabajo no lo contesta nadie. Pero la respuesta **no vuelve a su buzón**: vuelve a la dirección única de esa tarea. Por eso pedimos `gmail.send` y **nunca** `gmail.readonly`, que es el permiso caro en la verificación de Google. Esto hay que escribirlo tal cual en la propuesta técnica.

**Tres restricciones que salen de cómo funciona el correo de verdad**

1. Los escáneres de enlaces corporativos abren los enlaces antes que la persona, así que **el botón del correo no puede actuar al abrirse**: lleva a una página de confirmación de un clic.
2. Quien responde dándole a Responder manda la cita del hilo, la firma y prosa. Esa respuesta se corta por encima de la cita, se trunca a 400 y **se marca «llegó sin estructura»**.
3. Por R-16 nada de eso cambia el estado: llega al gerente como **propuesta**, con su procedencia y su hora.

**Diseñado:** `WEB-v2 / Acceso / 01–03`, `WEB-v2 / Encargos / 01–05` y `WEB-v2 / Correo / 01–02`.

---

### 4.5 La contradicción de CUN-10 — **sin resolver**

**CUN-10 tiene dos actores distintos según dónde se lea.** La Actividad 4 lo lista entre los casos de uso del **Usuario Personal**; la matriz de trazabilidad de la cabecera lo asigna al **Gerente**. La Actividad 5 lo pone bajo el Asistente Personal Inteligente, que es el trabajador personal.

No es redacción: decide si «resumen de reunión» es Plan Personal o Empresarial, y con ello a qué nivel pertenece el puente de CUN-11.

### 4.6 Lo visual de los planes

Hoy, de 33 cuadros, **cero** muestran nada de los tres niveles.

| Pieza | ¿Entra en el modelo? |
|---|---|
| Estado de función bloqueada | **Sí**, es falta de permiso, RN-OP-01. Ya diseñado en web |
| Indicador de plan activo | Sí |
| Momento de conversión al topar el límite | Sí |
| Cifras de los límites del Gratuito | Sí, pero el equipo tiene que fijarlas |
| Administración del equipo | Sí, ver S-5 |
| Comparación de planes y pasarela de pago | **No.** El Entregable excluye la facturación |

La distinción que resuelve el alcance: **cobrar es facturación y está excluido; que el sistema te deje o no te deje es autorización y ya está en el modelo.**

---

## 5. Plan Personal móvil — las 23 funcionalidades

**Diecinueve de veintitrés no tocan el modelo.**

### Base — nada funciona sin esto

| # | Funcionalidad | CUN | Modelo |
|---|---|---|---|
| 1 | **Captura única**: texto, voz, comando o cámara, todo a la misma tarjeta de confirmación | CUN-01, CUN-03 | — |
| 2 | **Registro de tiempo real**: confirmar el bloque, declararlo después, cronómetro, o proponerlo por señales | CUN-01, CUN-03 | **+2 atributos en Evento de Agenda** |
| 3 | Plan del día propuesto | CUN-02 | — |

**El número 2 es el que sostiene a los números 7, 20, 21 y 22.** Sin él, informes, hábitos, seguimiento y coach comparan el plan contra nada.

### Núcleo de gestión del tiempo

| # | Funcionalidad | CUN | Modelo |
|---|---|---|---|
| 4 | El día no entra: qué sacar, qué mover | CUN-02 excepción | — |
| 5 | Replanificar cuando algo se cae | CUN-02 FA | — |
| 6 | Si no cabe ese día, queda como pendiente sin fecha | CUN-02 | — |
| 7 | Rutinas y hábitos, con su seguimiento | CUN-01, CUN-02 | — |
| 8 | Bloques de concentración + No molestar automático | CUN-02 | — |
| 9 | Desplazamiento con ubicación real | CUN-02 | — |
| 10 | Ámbito laboral / personal | CUN-01, CUN-03 | Atributo |
| 11 | Mis tareas y recordatorios con contexto | CUN-01, CUN-03 | — |

### Entrada avanzada

| # | Funcionalidad | CUN | Modelo |
|---|---|---|---|
| 12 | Nota de voz hasta 5 min, audio descartado al confirmar | CUN-01, CUN-03 | — |
| 13 | Foto → texto → compromisos propuestos | CUN-01 | — |
| 14 | **Importar horario desde foto**: bloques recurrentes con vigencia, validados en conjunto | CUN-01 | Recurrencia y vigencia |
| 15 | Memo por lugar, un solo disparo al llegar | CUN-01 | Atributo de disparo |

### Comunicaciones — CUN-04, el de más peso y sin diseñar

| # | Funcionalidad | CUN | Modelo |
|---|---|---|---|
| 16 | Correo: redactar, ordenar, previa, **enviar siempre confirma** | CUN-04 | — |
| 17 | Llamar: resolver contacto, marcar, preguntar al colgar | CUN-04 | Contacto |
| 18 | Esperando de alguien: qué te debe quién | CUN-03 | Contacto |
| 19 | Preguntar al terminar una actividad con terceros | CUN-03 | — |

### Encima de lo real — depende del número 2

| # | Funcionalidad | CUN | Modelo |
|---|---|---|---|
| 20 | Informes del día, semana y mes | Consulta | — |
| 21 | Seguimiento con horizonte, a petición del usuario. Progreso, no ánimo | CUN-02, EN-03 | Si se lee EN-03 como período |
| 22 | Coach como sesión con cierre | CUN-02 FA | — |

### Transversal

| # | Funcionalidad | Modelo |
|---|---|---|
| 23 | Apertura con sugerencias derivadas del estado real, y paleta de comandos | — |

**Descartado:** nutrición y conteo de macros por foto. Caro (un modelo de visión por foto y por usuario), de precisión discutible, es dato de salud, y compite con aplicaciones con una década de ventaja. Lo que sí se queda es **comer como actividad que ocupa tiempo**, que sale gratis.

**Pendiente:** gasto acoplado a la actividad.

---

## 6. La paleta de comandos

Se invoca con `/` o con el botón de más. **No es un menú**: se filtra escribiendo, muestra cinco sugeridos según contexto y uso reciente, y todo lo que hace se puede hacer también hablando o escribiendo normal.

**Capturar**

| Comando | Qué hace | CUN | Confirma | Nivel |
|---|---|---|---|---|
| `/nota` | Consideración sin fecha | CUN-01, 03 | No | Gratuito |
| `/tarea` | Crea una tarea | CUN-03 | Sí | Gratuito |
| `/agendar` | Crea un compromiso; si no cabe, queda pendiente | CUN-01 | Sí | Gratuito |
| `/voz` | Graba hasta 5 min y extrae lo que haya | CUN-01, 03 | Sí, en lista | Personal |
| `/foto` | Saca compromisos de una imagen | CUN-01 | Sí, en conjunto | Personal |
| `/horario` | Importa un horario completo con vigencia | CUN-01 | Sí, en conjunto | Personal |
| `/lugar` | Memo que salta al llegar a un sitio | CUN-01 | Sí | Personal |

**Planificar**

| Comando | Qué hace | CUN | Confirma | Nivel |
|---|---|---|---|---|
| `/plan` | Propone el plan del día | CUN-02 | Sí | Personal |
| `/replanificar` | Rehace lo que queda del día | CUN-02 | Sí | Personal |
| `/bloque` | Reserva tiempo de concentración | CUN-02 | Sí | Personal |
| `/rutina` | Crea o ajusta un hábito recurrente | CUN-01, 02 | Sí | Personal |
| `/objetivo` | Seguimiento con horizonte | CUN-02 | Sí | Personal |

**Registrar lo que pasó**

| Comando | Qué hace | CUN | Confirma | Nivel |
|---|---|---|---|---|
| `/hice` | Declara tiempo dedicado hacia atrás | CUN-01, 03 | Sí, ajustando hora | Gratuito |
| `/empezar` · `/terminar` | Cronómetro de una actividad | CUN-01 | Al cerrar | Gratuito |
| `/cerrar-día` | Confirma todos los bloques del día de una vez | CUN-01 | Sí | Gratuito |

**Comunicar**

| Comando | Qué hace | CUN | Confirma | Nivel |
|---|---|---|---|---|
| `/correo` | Redacta, ordena y muestra previa | CUN-04 | **Siempre al enviar** | Personal |
| `/llamar` | Resuelve el contacto y marca | CUN-04 | Sí | Personal |
| `/esperando` | Registra algo que esperas de alguien | CUN-03 | Sí | Personal |

**Consultar**

| Comando | Qué hace | CUN | Confirma | Nivel |
|---|---|---|---|---|
| `/hoy` · `/semana` | Informe del período | Consulta | No | Gratuito |
| `/mes` | Informe del mes | Consulta | No | Personal |
| `/pendientes` | Tareas y pendientes sin fecha | CUN-03 | No | Gratuito |
| `/buscar` | Busca en compromisos, tareas y notas | Consulta | No | Gratuito |
| `/actividad` | Registro de lo que hizo el asistente | Consulta | No | Gratuito |

**Acompañar**

| Comando | Qué hace | CUN | Confirma | Nivel |
|---|---|---|---|---|
| `/revisar` | Sesión de coach sobre la semana | CUN-02 FA | Al cerrar | Personal |
| `/no-entra` | Sesión sobre el día que no cabe | CUN-02 | Al cerrar | Personal |

**Empresarial** — visibles pero marcadas si no se tienen

| Comando | Qué hace | CUN |
|---|---|---|
| `/disponibilidad` | Consultar disponibilidad de equipo | CUN-05 |
| `/reunión` | Coordinar reunión | CUN-06 |
| `/delegar` | Delegar tarea | CUN-07 |
| `/delegadas` | Seguimiento de lo delegado | CUN-08 |
| `/mis-asignadas` | Tareas que me asignaron | CUN-09 |
| `/resumen` | Resumen de reunión | CUN-10 |

**Sistema:** `/permisos` · `/mi-plan` · `/ayuda`

**Tres decisiones que trae la paleta**

1. **Los comandos de otro nivel se ven, pero marcados.** Al pulsarlos sale la tarjeta **Bloqueada**. Es descubrimiento de la oferta sin perseguir a nadie, y es el momento de conversión que al producto le faltaba.
2. **Cada comando es una o más herramientas de §7.2.** La columna «Confirma» no es preferencia de interfaz: sale de si esa herramienta lleva confirmación previa en la propuesta técnica. Eso hace la paleta trazable hasta la arquitectura.
3. **En voz no se dicen comandos.** Se dice «manda un correo a Juan», no «barra correo». La paleta es un atajo para el pulgar, no un idioma que aprender.

---

## 7. Plan Empresarial — estado

| Caso de uso | Especificación | Diseño |
|---|---|---|
| CUN-05 Disponibilidad | 11 requisitos EARS | 8 cuadros web, con deriva respecto al criterio final |
| CUN-07 Delegar | 9 requisitos EARS | 12 cuadros web |
| CUN-06 Coordinar reunión | — | — |
| CUN-08 Seguimiento | — | — |
| CUN-09 Gestionar asignada | — | — (por correo, ver 4.7) |
| Invitación y consentimiento de calendario | — | — (ver 4.8) |
| CUN-10 Resúmenes | — | — |
| Administración del equipo | — | — |
| Actividad con alcance de equipo | Definida en `ARQUITECTURA-VISUAL-WEB.md` §6 | 2 cuadros |

**Lo más urgente del empresarial sigue siendo CUN-09**, porque hoy el gerente delega y **la pantalla donde el colaborador recibe no existe**. Con la decisión de 4.7, esa pantalla **ya no es del colaborador sino del gerente**: es la tarjeta que le llega cuando alguien responde al correo de una tarea, con el texto citado y la actualización propuesta. Sin ella el ciclo sigue construido a la mitad.

**Y hay un bloque nuevo, el de 4.8**, que no existía en ninguna lista: invitar, consentir, y ver el estado del consentimiento por persona. Sin eso, CUN-05 y CUN-06 no tienen datos que leer.

**El límite de privacidad del alcance de equipo es no negociable** y está escrito en `ARQUITECTURA-VISUAL-WEB.md` §6: solo acciones sobre objetos del equipo, nunca la agenda personal ni las comunicaciones del colaborador. Coordinar no es vigilar.

---

## 8. Reglas de producto acordadas en esta revisión

Son nuevas respecto del Entregable 1 y aplican al diseño, no al modelo del negocio.

| # | Regla | Dónde aplica |
|---|---|---|
| R-1 | **Si no cabe ese día, no se fuerza**: queda como pendiente sin fecha, y se dice | Toda la captura |
| R-2 | **El sistema nunca registra tiempo real sin que la persona lo avale.** Propone; la persona confirma o ajusta la hora | Registro de tiempo |
| R-3 | **Una sola pregunta al final del día** con todos los bloques, no una por bloque | Registro de tiempo |
| R-4 | **El audio de las notas de voz se descarta** al confirmar la transcripción, con opción de conservar por nota | Notas de voz |
| R-5 | **Toda sesión de coach termina en un cambio del plan o en nada.** Si no puede cambiar nada, no debió abrirse | Coach |
| R-6 | El coach habla de **progreso, no de ánimo**, y solo afirma lo verificable desde los datos | Coach, seguimiento |
| R-7 | **El memo por lugar se dispara una sola vez**, al llegar | Memos |
| R-8 | **La ubicación solo se usa cuando hay un compromiso con lugar**, y a precisión gruesa. Sin rastreo continuo | Sensores |
| R-9 | **Cada permiso de sensor es un consentimiento aparte y revocable**, y si se niega, la función degrada al camino manual | Sensores |
| R-10 | **Las importaciones en bloque se validan en conjunto**, con los choques avisados antes de aplicar y lo dudoso marcado como dudoso | Foto, horario |
| R-11 | **El envío de correo confirma siempre**, sin excepción | CUN-04 |
| R-12 | De un tercero se guarda **solo qué esperas y de quién**. No notas sobre la persona | Esperando de alguien |
| R-13 | **De un participante externo solo se lee libre / ocupado**, nunca el contenido de sus eventos | Invitación, CUN-05 |
| R-14 | **El consentimiento lo da la persona, no su gerente**, y es revocable sin pasar por él | Invitación |
| R-15 | **Quien no ha aceptado aparece sin datos, nunca como libre** | CUN-05, `REQ-CUN05-08` |
| R-16 | **Una respuesta de correo nunca cambia el estado de una tarea por sí sola.** Llega como propuesta al gerente, con el texto original citado | CUN-09 por correo |
| R-17 | **El hilo de una tarea vive en el lienzo, con la tarea abierta; nunca en la columna de conversación.** La conversación es dónde se crea y se delega; el lienzo es dónde se lee lo que ya existe | D-14, arquitectura visual |
| R-18 | **La procedencia de una actualización es visible y se distingue.** «Juan pulsó Hecho» es un dato; «Juan escribió: *lo tengo casi listo* — entiendo que está en curso» es una interpretación. Las dos no pueden verse igual | Ciclo de vuelta |
| R-19 | **Toda delegación declara su criterio de terminado**, en una línea, puesta por quien delega. Es lo que hace aplicable RN-INF-02 | CUN-07 |
| R-20 | **El agente pide solo lo que falta, de uno en uno.** Nunca despliega un formulario completo salvo que el usuario lo pida | Toda la captura |

R-2 merece una nota: es RN-ER-03 por otra razón. Allí se confirma porque la acción es **irreversible**; aquí porque el registro solo vale si es **verdadero**. Un informe hecho de horas inventadas no lo cree nadie, y en cuanto el usuario ve una hora mal puesta deja de mirar los informes para siempre.

---

**R-21** · Toda cifra de un informe lleva su denominador, y toda barra se llena contra él. «126 h registradas» no dice nada; «126 h de 140 planificadas» sí. Las rutinas ya lo cumplían con su «5 de 5», y por eso eran lo único que se entendía.

**R-22** · Lo que el usuario marca como personal no es visible para la empresa que paga la cuenta.

---

**R-23** · Agenda es lo que va a pasar; Actividad es lo que pasó. El día es la costura, y por eso el nivel «Hoy» enseña el plan y lo registrado a la vez.

**R-24** · El hilo de una tarea vive dentro de la tarea, nunca como sección propia, y el asistente solo lo lee si se le pide. Es la versión móvil de R-17 y tiene el mismo motivo: que el contexto del agente no crezca sin límite.

**R-25** · El asistente no borra nada por su cuenta, y cuando lo borra otra persona lo dice en vez de rellenar el hueco.

---

**R-26** · Agenda contesta «qué» y Actividad contesta «cuánto». Una barra de carga en Agenda es lenguaje prestado del informe y no responde a lo que ahí se pregunta.

**R-27** · El hilo del Plan Personal lo actualizas tú o una nota de voz, y se cierra con un límite de tiempo. El del Empresarial recibe además las respuestas por correo y declara criterio de terminado (R-19). No son la misma pantalla.

---

**R-28** · Aceptar no es tener cuenta. El colaborador autoriza por enlace, una vez, y puede retirarlo desde el pie de cualquier correo; al retirarlo se borra lo que se hubiera guardado de su disponibilidad.

**R-29** · Todo encargo declara sus preguntas, y el criterio de terminado es una de ellas. Sin criterio declarado no se puede decir que algo está terminado (cierra D-15).

**R-30** · El texto libre de una respuesta tiene tope y contador. Lo que llega por respuesta de correo se trunca al mismo tope y se marca como llegado sin estructura.

**R-31** · Se pide `gmail.send` y nunca `gmail.readonly`: el correo sale a nombre del gerente, pero la respuesta vuelve a la dirección propia de la tarea, no a su buzón.

---

**R-32** · Web y móvil tienen **las mismas tres secciones**: Agenda, Tareas y Actividad. Lo que en web parecían destinos propios —Reuniones, Equipo, Resúmenes, Encargos— son niveles o franjas dentro de ellas. Una aplicación no puede organizarse de dos maneras según la pantalla.

**R-33** · La configuración no ocupa sitio en la barra de trabajo: vive en Ajustes, al pie. Su estado aparece donde estorba, no como destino permanente.

---

**R-34** · En Ajustes va lo que se configura una vez y se revisa rara vez. Su puerta está en la cabecera en móvil y al pie de la navegación en web, nunca como destino de trabajo.

**R-35** · Ningún grupo de la página de diseño puede llamarse como una sección que no existe. Correo y llamada son estados de la capa de captura; las rutinas viven en Agenda.

---

**R-36** · La captura es una **capa**, no una sección. Es la cuarta cosa que hace la aplicación, pero no un cuarto sitio: sube sobre la sección en la que estás y no navega. De ahí salen tres pestañas y no cuatro.

**R-37** · **El hilo es de la negociación; el resultado vive en su sección.** Coordinar una reunión es una tarea con hilo mientras se proponen horas y se espera respuesta; cuando se cierra, el resultado es un evento en Agenda. Con un encargo pasa igual: el hilo está en Tareas y la fecha acordada cae en Agenda.

**R-38** · Tareas no tiene niveles de período, y es a propósito: **una tarea sin fecha no cae en ningún período**. Sus cortes son franjas —con fecha, sin fecha, esperando de alguien, encargadas—, no días y meses.

**R-39** · El hilo mantiene al agente con **poco contexto y un propósito claro**, y eso es lo que evita que alucine. No es solo una cuestión de coste: es de fiabilidad.

---

**R-40** · **La interfaz nunca se nombra a sí misma.** Ni su disposición —«el panel de la derecha», «el registro de la derecha», «el lienzo», «la conversación»—, ni sus estados internos —«no hay datos»—, ni códigos de regla entre paréntesis. El usuario no sabe qué es nada de eso: se le habla de lo que hace, no de cómo está montado.

---

**R-41** · **Una sección se ve igual en las dos plataformas.** Si en móvil Actividad son informes con niveles y el registro del asistente debajo, en web es lo mismo, no un listado distinto. Lo que cambia entre plataformas es la disposición, nunca el contenido ni la jerarquía de la sección.

**R-42** · **No hay camino manual en paralelo al asistente.** Cuando el asistente no responde, lo que pediste queda en cola y se puede seguir consultando lo que ya existe; no se ofrece un formulario que haga el mismo trabajo a mano. El asistente es quien hace el trabajo, y lo que no puede hacer ahora lo hace después.

---

**R-43** · **La barra de pestañas solo aparece dentro de una sección.** Ajustes no lo es: se presenta encima, sin barra, y se cierra con una equis. Un «volver» que nombra un destino inventa una jerarquía que no existe, y era lo que hacía que Ajustes pareciera colgar de Actividad.

**R-44** · **La franja horaria de trabajo es parámetro de la plataforma, no dato del perfil.** Del perfil es solo la zona horaria, que es de lo que depende RN-CAL-01. Resuelve la contradicción entre `05-equipos` §49 y `06-acceso` REQ-ACC-04 a favor del primero, y no añade ningún atributo al Entregable 1.

**R-45** · **La cuenta no es autogestionable.** La organización la crea, le asigna el rol y decide el plan; desde Ajustes no se cambia el correo ni el plan. Lo único que el usuario hace con su cuenta es cerrar sesión.

**R-46** · **Un apartado que todavía no existe se ve marcado, no con un chevron muerto.** Es el mismo trato que los comandos de otro nivel en la paleta: se descubre la oferta sin prometer un destino que no está.

---

## 9. Decisiones abiertas

| # | Decisión | Recomendación |
|---|---|---|
| D-1 | ¿Entra CUN-11, compromiso → tarea? | Sí. Es el puente y no necesita entidad nueva |
| D-2 | ¿El escritorio reemplaza a la web o se suma? | — |
| D-3 | ¿Entra EN-09 Documento, y con ella CUN-12 y CUN-13? | — |
| D-4 | ¿A qué actor pertenece CUN-10? | Hay que elegir uno de los dos que el Entregable declara |
| D-5 | ¿El Plan Personal se modela o se declara como visión? | Declararlo, y especificar CUN-02 y CUN-04, que ya están modelados |
| D-6 | ¿Existe automatización de compras sin confirmación? | No |
| D-7 | ¿Cuáles son las cifras de los límites del Gratuito? | — |
| D-8 | **Participante externo: ¿entidad propia?** Ya no basta un campo: hay que guardar estado de consentimiento y conexión de calendario | Sí, entidad. Lo obliga 4.8 |
| ~~D-13~~ | ~~¿Cómo responde el colaborador?~~ | **RESUELTO: botones y formulario, con la respuesta al correo de respaldo.** Ver 4.7 |
| ~~D-14~~ | ~~Comentarios del gerente~~ | **RESUELTO: un hilo por Tarea, en el lienzo.** Ver R-17 |
| D-9 | **¿Se lee EN-03 como «período» y no como «jornada»?** | Sí. Su definición dice «período determinado», lo que desbloquea el seguimiento con horizonte sin entidad nueva |
| ~~D-10~~ | ~~¿Entra el atributo **ámbito** laboral / personal en cada Evento?~~ | **REFORMULADA como D-16.** Un atributo por evento obliga a etiquetar bloque por bloque, y eso no lo mantiene nadie |
| **D-16** | **¿Entran las categorías, con el ámbito como propiedad suya?** | Sí. Resuelve D-10 más barato: declaras una vez que *Tesis* es personal y que *Comité de arquitectura* es laboral, y cada bloque hereda. Pasas de una pregunta por evento a unas cinco en total. Ver 4.9 |
| D-11 | ¿Entra `EN-10 Gasto`, acoplado a la actividad? | Solo acoplado. Suelto es una app de finanzas mediocre |
| D-12 | **Los supuestos S-2 a S-5 de la sección 4.4** (S-1 ya resuelto) | Confirmar o tumbar |
| ~~D-15~~ | **RN-INF-02 tiene un término sin definir**, igual que RN-CAL-01: dice que la tarea se completa con el «**cumplimiento válido**», y el Entregable 1 nunca define qué es válido | A diferencia de RN-CAL-01, este no se resuelve con un algoritmo: el criterio es distinto en cada tarea, así que **lo declara quien delega** (R-19). Eso hay que incorporarlo al Entregable 1 como se hizo con RN-CAL-01. **RESUELTO en 4.11: el criterio es una de las preguntas declaradas del encargo** (R-29) |

---

## 10. Estado

**Decidido y ya aplicado en el repositorio**

- Criterio de RN-CAL-01 → `specs/05-equipos/spec.md` §1
- Arquitectura visual de tres columnas → `design/ARQUITECTURA-VISUAL-WEB.md`
- Los cuatro blancos de la conversación → `design/CONTEXTO.md`
- Arquitectura visual del móvil, medida de los cuadros `04` → `design/ARQUITECTURA-VISUAL-MOVIL.md`
- Las tres capas del día —planificado, registrado, apunte— y la regla que separa tarea de apunte → `design/ARQUITECTURA-VISUAL-MOVIL.md` §2
- Categorías con el ámbito como propiedad suya, y el límite de privacidad en Empresarial → 4.9, R-21, R-22
- **Tres secciones en vez de cuatro**, el hilo dentro de la tarea y la barra de entrada como asa → 4.10, R-23, R-24, R-25
- **Acceso universal con cuentas y roles en la base**, y el bucle de encargo por correo completo → 4.11, R-28 a R-31
- **Las mismas tres secciones en web y en móvil**; Reuniones, Equipo, Resúmenes y Encargos dejan de ser destinos → R-32, R-33
- Diseño web: 10 cuadros nuevos en `06 Arquitectura · Web v2` (Acceso 3, Encargos 5, Correo 2)
- Estado del diseño móvil: 32 cuadros en 11 grupos, 15 de 25 comandos con pantalla, 11 de 23 funcionalidades con cuadro → `design/VALIDACION-MOVIL-v2.md`

**Decidido en sesión, pendiente de escribir en especificación**

- La frontera Gratuito / Personal: reactivo contra proactivo
- Nota de voz de hasta 5 minutos, audio descartado al confirmar
- La llamada es **marcar**, no hablar por el usuario
- Evento de Agenda gana **realizado** y **duración real**
- El memo por lugar se dispara **una sola vez** al llegar
- Nutrición y macros: **descartado**
- Las doce reglas de la sección 8
- **Los niveles de venta son acumulativos**; el Empresarial añade manejo de personal y su seguimiento
- **El Colaborador no es usuario del aplicativo**; participa por correo y por enlace sin cuenta
- **La disponibilidad de terceros se obtiene por invitación y consentimiento**, y solo como libre / ocupado
- **El colaborador responde por correo**, sin página ni enlace; su respuesta llega al gerente como propuesta
- **Un hilo de comentarios por Tarea**, en el lienzo, separado de donde se crean tareas
- **El ciclo de vuelta son tres puertas**: botón, formulario y respuesta al correo, en ese orden de preferencia
- **Toda delegación declara su criterio de terminado**

**Pendiente de aplicar al Entregable 1**

- La segunda oración de RN-CAL-01

**No decidido**

- Las doce decisiones de la sección 9
