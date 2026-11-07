# Cómo se estructura el Plan Empresarial

**Fecha:** 7 de noviembre de 2026
**Qué es:** cómo encaja el Plan Empresarial para la persona que lo usa: quién es quién, qué ve cada uno, dónde ocurre cada cosa (la aplicación, la zona de empresa o el correo) y en qué orden se construye la fase 4. Reúne lo que hoy está repartido en `03-tareas`, `04-comunicaciones`, `05-equipos`, `06-acceso` y `08-administracion`.
**Base:** `SPEC.md` 2.20.1 (§1, §8, §10), `REPLANTEO.md` §4 y §8, `PLAN-VALOR-USUARIO.md`, `specs/glosario.md`, los `spec.md` de `03-tareas`, `04-comunicaciones`, `05-equipos`, `06-acceso`, `08-administracion` y `09-tareas-personales`, `specs/08-administracion/plan.md` §7 y `design/ARQUITECTURA-VISUAL-WEB.md`.
**Decisión del equipo que lo ordena (6 de noviembre de 2026):** la afiliación la concede un área de administración antes de cualquier función empresarial; la administración es una zona aparte con entrada propia; lo que el responsable tiene sobre su equipo (disponibilidad, tareas del equipo, resumen y reporte) vive en esa zona, en «Mi equipo»; la conversación de la aplicación solo muestra la síntesis.
**No es especificación.** No añade requisitos ni cambia ninguno. Lo que propone y ningún requisito respalda está marcado **por decidir** o como hallazgo `H-EMP-nn`, y va al equipo en `entregas/INFORME-CARRIL-EMPRESARIAL.md`.

---

## Índice

1. [La idea en una página](#1-la-idea-en-una-página)
2. [Los tres perfiles](#2-los-tres-perfiles)
3. [Mapa de superficies](#3-mapa-de-superficies)
4. [Qué cambia en la aplicación al pertenecer a una empresa](#4-qué-cambia-en-la-aplicación-al-pertenecer-a-una-empresa)
5. [Orden de construcción de la fase 4](#5-orden-de-construcción-de-la-fase-4)
6. [Lo que falta especificar](#6-lo-que-falta-especificar)
7. [Lo que queda fuera en esta versión](#7-lo-que-queda-fuera-en-esta-versión)

---

## 1. La idea en una página

Hay **dos sitios y un canal**, y cada uno tiene un trabajo distinto:

| Sitio | Para qué | Quién entra | Con asistente |
|---|---|---|---|
| **La aplicación** (web y móvil) | **Actuar**: delegar, responder, pedir, convocar, preguntar cómo va el equipo. Las tres secciones de siempre (Agenda, Tareas, Actividad) y la conversación | Toda cuenta | Sí. Es la única vía para crear o cambiar algo (R-42, P-11) |
| **La zona de empresa** (solo web) | **Mirar el estado del equipo y administrar la organización**: «Mi equipo», «Personas», «Equipos», «Registro» | Solo quien administra o es responsable de un equipo (`08-administracion/plan.md` §7.1) | No (REQ-ADM-07). Sin conversación |
| **El correo** | **Avisar**. Nunca se responde por correo (D-17 c) | Quien recibe una invitación o una tarea | No |

**La regla que lo sostiene (H-EMP-02):** en la aplicación se actúa; en la zona se mira. Todo lo que crea o cambia trabajo pasa por el asistente y su tarjeta, y por eso vive en la aplicación, también en el móvil. La zona no tiene asistente, así que en esta versión es **de lectura** para lo del equipo y de acción solo para administrar, que es justo lo que el asistente no hace (H-ADM-11).

Con esa regla se contestan las dos preguntas abiertas de `SPEC.md` §8 (detalle en §3):

- **¿Qué coordinación tiene el gerente en el móvil?** Todo lo que se pide al asistente: delegar, convocar, pedir el resumen, recibir la síntesis del reporte y decidir las respuestas de su equipo. Ningún panorama: la rejilla del equipo, el tablero de tareas y el reporte completo viven en la zona, que es web (H-EMP-03).
- **¿Cómo es la vista web del colaborador?** La misma aplicación que la de cualquiera, con sus tareas asignadas como una franja más de Tareas y la tarea abierta en el lienzo con su hilo. No entra en la zona (H-EMP-04).

---

## 2. Los tres perfiles

Tras la tanda 2 (`08-administracion`), los perfiles **no son roles de la cuenta**. Son lo que la cuenta es dentro de una organización de empresa, y se leen en cada petición (H-ADM-17). La columna `rol` de la cuenta queda en desuso (H-ADM-20).

| Perfil | Definición operativa | Qué le da | Qué no le da | Requisitos |
|---|---|---|---|---|
| **Administrador** | Su pertenencia vigente a la organización de empresa lleva la marca de administrador | Personas, invitaciones, equipos y el registro de acciones administrativas, en la zona | Ver el trabajo de ningún equipo, la agenda de nadie ni lo que nadie habló con el asistente | REQ-ADM-02 a 07 |
| **Responsable** | Es miembro de un equipo con la marca de responsable. Como mucho uno por equipo | En **ese** equipo: asignar tareas, ver libre/ocupado de cada miembro y las tareas del equipo, el resumen y el reporte | Lo que cada miembro hace para sí, el contenido de su agenda, lo marcado como personal | REQ-ACC-15 a 17, REQ-ADM-30 a 32, REQ-CUN08-01 a 07 |
| **Colaborador** | Es miembro de un equipo sin ser su responsable | Todo el Plan Empresarial sobre lo suyo; en ese equipo: responder sus tareas asignadas, ver libre/ocupado para convocar, pedir algo a un compañero, proponer tareas al responsable | Asignar tareas a otros; ver el trabajo del equipo en conjunto | REQ-ACC-13 a 15, REQ-CUN05-17, REQ-CUN07-11 a 19, REQ-CUN08-02 |

**Una persona puede ser varias cosas a la vez** (REQ-ACC-16): administradora de la organización, responsable de «Ventas» y colaboradora en «Soporte». Lo que ve depende del equipo del que se trate en cada momento:

| Lucía es… | En la aplicación | En la zona |
|---|---|---|
| Responsable de «Ventas» | Delega en «Ventas»; ve «Encargadas» | «Mi equipo · Ventas»; «Equipos», de lectura |
| Colaboradora en «Soporte» | Ve lo que le asignaron en «Soporte» en «Asignadas»; no delega allí | Nada de «Soporte» más allá de «Equipos», de lectura |
| Administradora | Igual que si no lo fuera: el asistente no administra (REQ-ADM-07) | «Personas», «Equipos» con acciones, «Registro» |
| Las tres cosas | La suma de las dos primeras filas | La suma de las tres filas |

**Sin pertenencia a una empresa**, la cuenta ve exactamente su plan propio (REQ-ADM-17). Una cuenta propia de la empresa que todavía no está en ningún equipo tiene el plan que le dio la organización, pero nada de equipo aparece hasta que la sumen a uno (H-EMP-06).

**Vocabulario.** En los requisitos antiguos, «gerente» quiere decir *responsable del equipo* (glosario, «Gerente»). En este documento se escribe «responsable». En pantalla nunca aparecen «afiliación», «cuenta propia» ni «pertenencia» (`08-administracion/spec.md` §5).

---

## 3. Mapa de superficies

### 3.1 La tabla

Cada celda dice quién lo hace allí (A administrador, R responsable, C colaborador, P la persona invitada) y el requisito que lo respalda. **Por decidir** cuando ningún requisito lo dice; «—» cuando no ocurre allí.

| Capacidad | Aplicación web | Aplicación móvil | Zona · «Mi equipo» | Zona · «Personas» / «Equipos» | Correo |
|---|---|---|---|---|---|
| **Ver disponibilidad del equipo** | R y C, **para convocar**: se la piden al asistente y el lienzo muestra la rejilla de los participantes, solo libre/ocupado (REQ-CUN05-01 a 10, 13, 17) | R y C, para convocar: el asistente da las alternativas en la tarjeta, sin rejilla. **Por decidir** (H-EMP-05) | Solo R: **panorama** de cada miembro, libre/ocupado, con su estado de autorización (REQ-ACC-17, REQ-CUN05-11, 13, 15). Cómo se pide sin asistente: **por decidir** (§6.3) | — | — |
| **Convocar reunión** | R y C, por el asistente, con tarjeta (REQ-CUN05-17 lo autoriza). **Por decidir:** CUN-06 sin especificar | R y C, por la capa de captura. **Por decidir** (CUN-06) | — (sin asistente) | — | — |
| **Delegar tarea** | R, por el asistente: tarjeta con responsable, fecha, criterio de terminado y preguntas declaradas (REQ-CUN07-01 a 10, REQ-ENC-01 a 03) | R, por la capa de captura, con la misma tarjeta (cabecera de `03-tareas`: «web y móvil para los dos perfiles»; H-EMP-03) | — Ve después la tarea en el tablero del equipo (REQ-CUN08-01) | — | — |
| **Responder una tarea asignada** | C, en la franja «Asignadas»: la tarea en el lienzo con marcar estado, contestar las preguntas o comentar (REQ-CUN07-11, 14, REQ-ENC-03). Nombre de la franja: **por decidir** (H-EMP-06) | C, dentro de la tarea (REQ-CUN07-11; R-24) | — | — | Solo el aviso (REQ-CUN07-16) |
| **Decidir una respuesta** (lado del responsable) | R, en «Encargadas»: la propuesta con su procedencia; aceptar o rechazar con tarjeta, cambiar por el asistente (REQ-CUN07-12, 13, 17, REQ-ENC-09, 10). Sitio: **por decidir** (H-EMP-07) | R, igual (H-EMP-03) | — Se ve como pendiente de decidir, sin acciones (H-EMP-02) | — | — |
| **Pedir algo a un compañero** | R y C, por el asistente: le llega como petición; a quien pide le queda en «Esperando de alguien» (REQ-CUN07-18). Dónde la acepta el compañero: **por decidir** (H-EMP-06) | Igual | — | — | Aviso: **por decidir** |
| **Proponer una tarea al responsable** | C, por el asistente (REQ-CUN07-19). Dónde la decide el responsable: **por decidir**; propuesta, en «Encargadas» (H-EMP-07) | Igual | — | — | — |
| **Ver el resumen del equipo** | R, en la conversación: como mucho cinco puntos (REQ-CUN08-03). A C se le explica que eso lo consulta el responsable (REQ-CUN08-02) | R, en la capa de captura, igual (H-EMP-03) | R: los mismos puntos como cabecera del tablero. **Por decidir** | — | Nunca sin pedirlo (REQ-CUN08-06) |
| **Abrir el reporte** | R: la síntesis en la conversación, con acceso al reporte (REQ-CUN08-07). El acceso abre la zona (H-ADM-22) | R: la síntesis; el acceso descarga el documento. **Por decidir** (H-EMP-14) | R: el reporte completo, para leer y descargar (REQ-CUN08-04; H-ADM-22) | — | Nunca por iniciativa del sistema (REQ-CUN08-04, 06) |
| **Recibir encargos por correo** | C: notificación en la aplicación (REQ-CUN07-16). Su forma: **por decidir** (§6.7) | C: igual | — | — | C: correo que solo avisa, desde la dirección de la plataforma, sin botones (REQ-CUN07-16, DP-03). Envío real: PT-3 |
| **Hilo de una tarea** | R y C, en el lienzo con la tarea abierta (REQ-CUN07-15, R-17) | R y C, dentro de la tarea (R-24) | R: solo lo destacable, sin escribir. **Por decidir** (H-EMP-08) | — | — |
| **Administrar cuentas** | A: solo la entrada a la zona, al pie de la navegación (`08-administracion/plan.md` §7.1). El asistente no administra (REQ-ADM-07) | — (REQ-ADM-05) | — | A: «Personas»: alta, plan, suspensión, baja, contraseña, administradores (REQ-ADM-08 a 16) | — |
| **Invitar** | P: aviso de invitación, aceptar o rechazar (REQ-ADM-20 a 22); fila «Organización» de Ajustes con «Salir de…» (REQ-ADM-26, 27) | P: el mismo aviso y la misma fila (REQ-ADM-20, 26) | — | A: «Personas» → «Invitar», con los equipos (REQ-ADM-18, 19, 24) | P: correo que solo avisa (REQ-ADM-18) |
| **Equipos** | — | — | — | A: crear, añadir, quitar, nombrar responsable (REQ-ADM-28 a 32). R: los suyos, sin acciones (`08-administracion/plan.md` §7.2) | — |

### 3.2 Coordinación del responsable en el móvil (pregunta 1 de `SPEC.md` §8)

**Propuesta (H-EMP-03):** en el móvil, el responsable tiene **todo lo que pasa por el asistente** y **nada de lo que es un panorama**.

| Tiene en el móvil | No tiene en el móvil |
|---|---|
| Delegar, con la misma tarjeta que en la web | La rejilla de disponibilidad del equipo |
| Pedir algo a un compañero; convocar (cuando CUN-06 exista) | El tablero de tareas del equipo («Mi equipo») |
| El resumen del equipo en cinco puntos | El reporte completo para leer en pantalla |
| La síntesis del reporte, con su descarga | «Personas» y «Equipos» |
| «Encargadas»: decidir las respuestas de su equipo | |

**Por qué:**

1. **El móvil es para la captura y el día a día** (`SPEC.md` §1). Delegar algo que se acaba de acordar en el pasillo es día a día; revisar el estado de diez personas es seguimiento.
2. **Lo que se pide al asistente funciona igual en las dos plataformas**, porque la tarjeta y las Operaciones son las mismas. No hay que diseñar nada nuevo salvo la tarjeta de delegación a 390 px.
3. **Lo que no cabe en el móvil es justo lo que la decisión del 6 de noviembre llevó a la zona**, y la zona es solo web (REQ-ADM-05). La rejilla necesita 840 px como mínimo (`design/ARQUITECTURA-VISUAL-WEB.md` §2); el reporte es un documento largo (REQ-CUN08-04).
4. **Nada queda sin camino.** Lo que el móvil no muestra se pregunta: «¿quién va atrasado?» da la respuesta en cinco puntos (REQ-CUN08-03, 05). No es un camino manual paralelo (P-11): es la vía de siempre.

**Lo que cuesta:** en el móvil el responsable no puede «echar un vistazo» al equipo sin preguntar. Se acepta en esta versión.

### 3.3 La vista web del colaborador (pregunta 2 de `SPEC.md` §8)

**Propuesta (H-EMP-04):** el colaborador usa **la misma aplicación web** que cualquier cuenta. No hay una vista propia ni entra en la zona.

| Columna | Qué ve el colaborador |
|---|---|
| Navegación | Agenda · Tareas · Actividad; Ajustes al pie. Sin entrada a la zona, salvo que además administre o sea responsable de otro equipo |
| Conversación | La de siempre. Puede pedir lo suyo, pedir algo a un compañero, proponer una tarea al responsable y consultar libre/ocupado para convocar. Si pide asignar, el asistente le explica que eso lo hace el responsable y le ofrece hacer una petición (REQ-ACC-15, REQ-ADM-32) |
| Lienzo | En Tareas, la franja «Asignadas»; al abrir una tarea asignada, la tarea con su criterio de terminado, sus preguntas, su hilo y cómo responder (REQ-CUN07-11, 15, R-17). Al pedir disponibilidad, la rejilla de los participantes (REQ-CUN05-17) |

**Por qué:** REQ-ACC-13 le da «sobre lo suyo lo mismo que a una cuenta del Plan Empresarial»; una vista distinta sería otra gramática para la misma aplicación (R-32, R-41). Lo único suyo y nuevo es una franja y una tarea que se abre en el lienzo, y esas dos cosas ya las necesita el responsable para «Encargadas». **Consecuencia:** el aviso provisional que hoy manda al colaborador al móvil se retira cuando exista la franja (`specs/06-acceso/plan.md` §5.5).

---

## 4. Qué cambia en la aplicación al pertenecer a una empresa

«Pertenecer» es estar afiliada o ser cuenta propia, y además estar en al menos un equipo. Lo que no se nombra aquí no cambia. **Lo de la persona sigue siendo suyo y la empresa no lo ve** (P-10, REQ-ADM-21).

| Parte | Qué cambia | Qué no cambia | Requisito |
|---|---|---|---|
| **Agenda** | Las reuniones convocadas aparecen como compromisos, porque son eventos de su calendario (R-37). Si acepta compartir su disponibilidad, el responsable y sus compañeros leen de ella **libre u ocupado**, nunca un título; esa lectura ocurre desde la zona o desde la consulta para convocar, no dentro de su agenda | Su agenda es suya: nadie de la empresa ve el contenido de sus compromisos; sin su aceptación, figura sin datos | REQ-ACC-17, REQ-CUN05-13, 14, 16, R-15 |
| **Tareas** | Aparecen **«Encargadas»** (lo que encargó, si es responsable de algún equipo) y **«Asignadas»** (lo que le asignaron y las peticiones que recibe, si es miembro de algún equipo), como franjas propias, **separadas de las personales**. Lo que pidió a un compañero queda en «Esperando de alguien» | Las tres franjas personales (con fecha, sin fecha, esperando de alguien) siguen siendo solo suyas; el responsable no las ve | R-38, REQ-CUN07-18, REQ-CUN03-19, H-TP-13; nombre de «Asignadas» por decidir (H-EMP-06) |
| **Actividad** | Nada del equipo. Lo suyo incluye lo que hizo como miembro (lo que respondió, lo que delegó), porque lo hizo ella | No hay alcance de equipo en la aplicación. El registro con alcance de equipo de `design/ARQUITECTURA-VISUAL-WEB.md` §6 pasa a la zona y queda fuera de esta versión | H-EMP-13 |
| **Conversación** | El asistente usa lo del Plan Empresarial: delegar (solo el responsable, en su equipo), peticiones, propuestas al responsable, consultar libre/ocupado para convocar, el resumen y la síntesis del reporte (solo el responsable). Responde en la conversación; lo largo se abre aparte | No administra (REQ-ADM-07). Sin pertenencia, lo explica y no prepara nada (REQ-ADM-17) | REQ-ACC-13, 15, REQ-CUN07-01, 18, 19, REQ-CUN05-17, REQ-CUN08-02, 03, 07 |
| **Ajustes** | Fila **«Organización»**: a qué empresa pertenece y en qué equipos; «Salir de…» si está afiliada, sin acción si es cuenta propia. Dentro, **compartir libre/ocupado** con cada equipo, que se puede retirar en cualquier momento | El resto de Ajustes; el usuario sigue sin administrar su cuenta (REQ-ACC-12) | REQ-ADM-26, 27, REQ-CUN05-14, 16, REQ-ENC-12; sitio del consentimiento por decidir (H-EMP-12) |
| **Navegación** (web) | Si administra o es responsable, una entrada al pie, encima de Ajustes, que **abre la zona en otra pestaña**, con su propia entrada (`08-administracion/plan.md` §7.1). Nombre en pantalla por decidir (H-EMP-11) | Las tres secciones; el móvil no tiene esa entrada (REQ-ADM-05) | REQ-ADM-05; H-ADM-22 |
| **Avisos** | El aviso de invitación pendiente, y el de «Ya no perteneces a…» al salir (REQ-ADM-20, 25). La notificación de tarea nueva y la de decisión del responsable (REQ-CUN07-16, 17), con forma por decidir (§6.7) | — | REQ-ADM-20, 25, REQ-CUN07-16, 17 |

**Al salir de la empresa** (desafiliación, salida o baja de un equipo) desaparecen «Encargadas» y «Asignadas» de ese equipo, la fila «Organización» y la entrada a la zona; sus tareas abiertas del equipo quedan sin persona asignada y su disponibilidad deja de leerse (REQ-ADM-25, 26, 31).

---

## 5. Orden de construcción de la fase 4

**Criterio:** el de `PLAN-VALOR-USUARIO.md`. Cada bloque termina en algo que una persona concreta puede ver y hacer. Una tarea es una sesión de trabajo.

**Numeración.** T-058 a T-067 son las de `specs/08-administracion/tasks.md`. Las nuevas se proponen **desde T-090** para no chocar con las de `09-tareas-personales` (T-046 a T-057), las de `08-administracion` ni las del carril de actividad, que numera a la vez. Son una propuesta: entran en el `tasks.md` de su área cuando la especificación de esa área esté avalada, y se renumeran al integrar si hace falta.

**Orden propuesto (H-EMP-16):** empresa → sumarse → equipos → **delegar y responder** → **seguimiento** → disponibilidad → peticiones. Delegar va antes que la disponibilidad porque es el ciclo que da a los dos perfiles algo que ver (el responsable encarga, el colaborador responde), y el seguimiento solo lee esas tareas. La disponibilidad pide el consentimiento de cada persona y leer su calendario, y su paso siguiente (convocar, CUN-06) no está especificado.

### Bloque 1 · La empresa existe (T-058 a T-062)

| Tarea | Qué | Área |
|---|---|---|
| T-058 | Clases de organización, pertenencia y equipos en el modelo | 08 |
| T-059 | Pertenencia en la sesión, estado de la cuenta y alcance de administrador; sesión aparte de la zona | 08 |
| T-060 | Operaciones de ámbito de empresa y resultado efímero | 08 |
| T-061 | Cuentas de la organización: lista, alta, plan, suspensión, baja, contraseña, administradores | 08 |
| T-062 | La zona en la web: entrada propia y «Personas» | 08 |

**Qué puede ver la persona al cerrarlo:** la administradora entra en la zona con su correo y su contraseña, ve las cuentas de su empresa, da de alta a Lucía y ve su contraseña temporal una vez, y suspende y reactiva otra cuenta. Una cuenta personal no nota nada.

### Bloque 2 · Sumarse a una empresa (T-063 a T-065)

| Tarea | Qué | Área |
|---|---|---|
| T-063 | Afiliación: invitar, aceptar, rechazar, caducar, desafiliar y salir | 08 |
| T-064 | Invitar desde la zona; aviso y fila «Organización» en la web | 08 |
| T-065 | Aviso de invitación y fila «Organización» en el móvil | 08 |

**Qué puede ver la persona:** Vasco, con su cuenta Personal, abre la aplicación (web o móvil) y ve que Acme quiere sumarlo a «Ventas», con qué cambia y qué no; acepta, y en Ajustes aparece «Organización · Acme». Puede salir cuando quiera. **Antes de este bloque:** los cuadros del aviso (§6.6).

### Bloque 3 · Equipos y responsable (T-066, T-067)

| Tarea | Qué | Área |
|---|---|---|
| T-066 | Equipos y autoridad por equipo | 08 |
| T-067 | «Equipos» en la zona | 08 |

**Qué puede ver la persona:** la administradora crea «Ventas», suma a Lucía y a Vasco y nombra responsable a Lucía. Lucía ve la entrada a la zona y, dentro, «Equipos» de lectura. «Mi equipo» aparece vacío, con un texto que dice qué llegará. **Prerrequisito:** las enmiendas a REQ-ACC-13 y 15 (`entregas/INFORME-CARRIL-ADMIN.md` §5).

### Bloque 4 · Delegar y responder (CUN-07, CUN-09) · T-090 a T-098

| Tarea | Qué | Satisface |
|---|---|---|
| T-090 | Modelo de la tarea del equipo, con responsable, persona asignada, fecha, criterio de terminado y preguntas declaradas; Operación de delegar con autoridad por equipo | REQ-CUN07-01, 02, 04, 05, 07, 08, 10; REQ-ENC-01 a 03; REQ-ADM-32 |
| T-091 | Delegar por conversación, con su tarjeta; en espera si el asistente no responde; explicación si no hay pertenencia o no es responsable | REQ-CUN07-01, 06, 09; REQ-ACC-15; REQ-ADM-17 |
| T-092 | Aviso de tarea nueva: notificación en la aplicación y correo que solo avisa | REQ-CUN07-03, 16; DP-03 |
| T-093 | La respuesta del colaborador llega como propuesta, una sola vez, con su procedencia | REQ-CUN07-11 a 14; REQ-ENC-09, 10 |
| T-094 | Decisión del responsable y su vuelta al colaborador | REQ-CUN07-17; REQ-ENC-02 |
| T-095 | Hilo de la tarea | REQ-CUN07-15 (necesita §6.2) |
| T-096 | Web: franjas «Encargadas» y «Asignadas», la tarea en el lienzo; se retira el aviso que manda al colaborador al móvil | REQ-CUN07-11, 15, 17; REQ-ACC-13 |
| T-097 | Móvil: las dos franjas y la tarea con su hilo; la tarjeta de delegación a 390 px | REQ-CUN07-11, 15, 17 |
| T-098 | Al salir alguien de un equipo, sus tareas abiertas quedan sin persona asignada, a la vista del responsable | REQ-ADM-13, 25, 31 (cierra lo que quedó en curso) |

**Qué puede ver la persona:** Lucía escribe «encárgale a Vasco el informe de cierre para el viernes; está hecho cuando lo revise finanzas» → tarjeta → confirma. Vasco ve el aviso y la tarea en «Asignadas», en la web o en el móvil; responde «lo tengo el jueves». Lucía ve en «Encargadas» la propuesta, con lo que Vasco escribió y lo que el asistente entendió; acepta. Vasco ve qué cambió. **Prerrequisitos:** el hito 3 del Plan Personal (la sección Tareas con franjas, T-052 y T-054); decidir INC-24 (§6.1), el hilo (§6.2) y la notificación (§6.7); los cuadros del móvil del colaborador (§6.6).

### Bloque 5 · Seguimiento del equipo (CUN-08) · T-099 a T-102

| Tarea | Qué | Satisface |
|---|---|---|
| T-099 | Estado del trabajo del equipo y retrasos calculados por el código | REQ-CUN08-01, 02, 05 |
| T-100 | «Mi equipo» en la zona: tablero de tareas por persona, atrasadas primero | REQ-CUN08-01; REQ-ACC-17 |
| T-101 | Resumen del equipo en la conversación, en cinco puntos | REQ-CUN08-03, 06 |
| T-102 | Reporte del período: documento completo, síntesis en la conversación, lectura en la zona y descarga | REQ-CUN08-04, 07; H-SEG-03 |

**Qué puede ver la persona:** Lucía pregunta «¿cómo va el equipo?» y recibe cinco puntos; pide «el reporte de noviembre» y recibe la síntesis con un acceso; lo abre en la zona, en «Mi equipo», y lo descarga. Vasco, si pregunta lo mismo, recibe el estado de sus propias tareas (REQ-CUN08-02). **Prerrequisito:** el aval del borrador de `03-tareas` §8 y la enmienda de §6.4.

### Bloque 6 · Disponibilidad compartida (CUN-05) · T-103 a T-107

| Tarea | Qué | Satisface |
|---|---|---|
| T-103 | Compartir libre/ocupado con un equipo: aceptar, retirar y su estado | REQ-CUN05-14, 15, 16; REQ-ENC-12; REQ-ADM-25 (deja de leerse) |
| T-104 | Libre/ocupado de cada miembro y cálculo de la disponibilidad común, en código | REQ-CUN05-02 a 08, 13; RN-CAL-01 |
| T-105 | «Mi equipo» en la zona: panorama de disponibilidad | REQ-CUN05-07, 08, 11, 15; REQ-ACC-17 (necesita §6.3) |
| T-106 | Consultar disponibilidad para convocar, por el asistente: rejilla en el lienzo web y alternativas en la tarjeta del móvil | REQ-CUN05-01, 09, 10, 17 |
| T-107 | **Reservada:** convocar la reunión (CUN-06), cuando se especifique | — |

**Qué puede ver la persona:** Vasco acepta en Ajustes compartir su libre/ocupado con «Ventas». Lucía ve en «Mi equipo» quién está libre esta semana, sin un solo título. Cualquiera de los dos pregunta «¿cuándo podemos reunirnos Lucía, Vasco y yo una hora el martes?» y ve las alternativas ordenadas. **Prerrequisitos:** regenerar los cuadros de CUN-05 (INC-07); especificar CUN-06 para T-107.

### Bloque 7 · Peticiones y propuestas entre miembros · T-108, T-109

| Tarea | Qué | Satisface |
|---|---|---|
| T-108 | Petición a un compañero: llega, se acepta o se rechaza; a quien pidió le queda como «esperando de alguien» | REQ-CUN07-18 |
| T-109 | Propuesta de tarea al responsable, que decide si la crea y a quién | REQ-CUN07-19 |

**Qué puede ver la persona:** Vasco le pide a un compañero «revisa el contrato antes del jueves»; el compañero la ve en «Asignadas» y la acepta o la rechaza. Vasco le propone a Lucía «que alguien revise el contrato de Bolsa»; Lucía lo decide en «Encargadas».

### Resumen

| Bloque | Lo que gana la persona | Tareas | Sesiones | Acumulado |
|---|---|---|---|---|
| 1 | La administradora gestiona las cuentas de su empresa | T-058 a T-062 | 5 | 5 |
| 2 | Una cuenta Personal se suma a una empresa y puede salir | T-063 a T-065 | 3 | 8 |
| 3 | Equipos con su responsable | T-066, T-067 | 2 | 10 |
| 4 | El responsable delega; el colaborador responde; vuelve | T-090 a T-098 | 9 | 19 |
| 5 | El responsable sabe cómo va su equipo | T-099 a T-102 | 4 | 23 |
| 6 | Quién está libre, sin ver la agenda de nadie | T-103 a T-106 (T-107 reservada) | 4 | 27 |
| 7 | Pedir y proponer entre compañeros | T-108, T-109 | 2 | 29 |

**Recorte para el Entregable (propuesta):** bloques 1 a 4. Con 19 sesiones se muestra el ciclo completo del Plan Empresarial con sus dos perfiles, que es lo que hoy está en cero (`AVANCE-POR-PERFIL-2026-11-06.md` §3.3). El bloque 5 es lo diferencial del responsable y es lo siguiente si sobra tiempo.

---

## 6. Lo que falta especificar

Cada punto dice en qué área iría. Ninguno se resuelve aquí.

### 6.1 La tarea delegada: ¿la misma entidad que la personal? (INC-24, antes «INC-21 del carril de CUN-03») · `03-tareas`

`PROPUESTA-TECNICA.md` §8 describe una sola entidad Tarea con responsable y quien delegó; `09-tareas-personales` construye una solo para lo personal (H-TP-13). **Propuesta (H-EMP-10): separadas.** La tarea del equipo vive en la empresa, tiene estados distintos («en curso», cumplimiento válido, RN-INF-02), criterio de terminado, preguntas declaradas e hilo; la personal vive con la persona y no la ve nadie (P-10). Juntarlas obligaría a que cada consulta de lo personal se acuerde de no mostrar lo del equipo, y al revés. Hace falta una decisión del equipo y una línea en EN-04: la tarea del equipo y la personal son dos clases de la misma entidad del negocio, no dos entidades. **Renumerada el 7 de noviembre de 2026 (RT-27):** las inconsistencias del carril de administración conservan INC-19 a 21; las del carril de CUN-03 son INC-22 a 24, y las de este documento, INC-25 a 27. La equivalencia está en `SPEC.md` §9.

### 6.2 El hilo de una tarea · `03-tareas` §7

REQ-CUN07-15 dice que existe un hilo por tarea, que lo ven el responsable y el colaborador y que se cierra con ella. Falta: qué se escribe ahí (comentarios, respuestas, decisiones, cambios), quién lo lee además de ellos dos (¿el responsable siguiente si cambia?), si tiene tope (R-24, R-39), qué es «lo destacable» que llega al resumen (REQ-CUN08-03) y cómo se relaciona con el hilo de una actividad del asistente (REQ-AGT-05, R-27). **Propuesta:** se escribe solo en la aplicación; en la zona solo se lee lo destacable (H-EMP-08).

### 6.3 La disponibilidad del equipo dentro de la zona · `05-equipos`

`05-equipos` describe la rejilla como respuesta a una consulta con participantes, rango y duración, pedida al asistente. En la zona no hay asistente. Falta un requisito para el **panorama**: qué rango muestra al abrir (propuesta: la semana en curso, de lunes a viernes, en la banda 08:00–20:00), cómo se cambia de semana, y que no propone alternativas ni convoca: solo muestra libre, ocupado, sin datos y fuera de banda (REQ-CUN05-05, 08, 13). Y falta decidir **dónde acepta la persona compartir su libre/ocupado** (propuesta: en Ajustes, «Organización», por equipo; H-EMP-12).

### 6.4 El reporte completo abierto en la zona · `03-tareas` §8 y `08-administracion`

REQ-CUN08-04 dice «se ve en la web y se descarga en PDF»; REQ-CUN08-07, «el acceso al reporte completo». Falta escribir que ese acceso **abre la zona** («Mi equipo», H-ADM-22), qué pasa si el responsable no tiene abierta la zona (tiene que entrar con su contraseña: la zona tiene sesión propia; H-EMP-19), qué hace el acceso desde el móvil (propuesta: descargar el documento; H-EMP-14), si los reportes generados se guardan para volver a abrirlos y **quién más puede leerlos** (H-SEG-03, abierta). También la enmienda a REQ-ADM-05: la zona deja de ser solo del administrador.

### 6.5 El correo real (PT-3) · `PROPUESTA-TECNICA.md` §12; afecta a `08-administracion` y `03-tareas`

Hoy los dos correos que solo avisan (invitación, REQ-ADM-18; tarea nueva, REQ-CUN07-16) salen por un puerto con implementación simulada que deja registro (`08-administracion/plan.md` §8). Para mostrar el ciclo con personas reales falta decidir PT-3: correo real con usuarios de prueba o simulado. No bloquea ningún bloque: la notificación en la aplicación ya cumple «avisar», y el correo es un segundo aviso.

### 6.6 Los cuadros de diseño que INC-14 reclama · `design/`

No existe ninguno. Lista de lo que hay que dibujar, en el orden en que se necesita. Las medidas son las de siempre: web 1440×900, móvil 390×844.

**Aviso de invitación** (antes del bloque 2):

| Cuadro | Qué muestra |
|---|---|
| `WEB-v2 / Avisos / 01 Invitación pendiente` | El aviso en el lienzo de la aplicación, sin cierre mientras siga pendiente |
| `WEB-v2 / Avisos / 02 Detalle de la invitación` | La capa con qué cambia y qué no, «Aceptar» y «Rechazar» |
| `WEB-v2 / Avisos / 03 Ya no perteneces` | El aviso que sí se cierra, tras salir o ser desafiliado |
| `MOV-v2 / Estados / Invitación pendiente` · `Detalle de la invitación` · `Ya no perteneces` | Los mismos tres, sobre la sección actual |
| `MOV-v2 / Ajustes / Organización` y su equivalente web | La fila con la empresa, sus equipos, «Salir de…» y compartir libre/ocupado |
| `CORREO / Invitación` | El correo que solo avisa: sin botones ni enlaces de respuesta |

**Zona de empresa, «Mi equipo»** (antes de los bloques 3 y 5). La disposición está en `design/ARQUITECTURA-VISUAL-WEB.md` §15.

| Cuadro | Qué muestra |
|---|---|
| `WEB-v2 / Empresa / 01 Entrada` | La entrada propia de la zona |
| `WEB-v2 / Empresa / 02 Mi equipo · Todavía sin tareas` | Lo que ve un responsable recién nombrado |
| `WEB-v2 / Empresa / 03 Mi equipo · Tareas` | El tablero por persona, con lo atrasado primero y lo pendiente de decidir |
| `WEB-v2 / Empresa / 04 Mi equipo · Reporte` | El reporte completo, desde `design/reporte-equipo-muestra.html` |
| `WEB-v2 / Empresa / 05 Mi equipo · Disponibilidad` | El panorama de la semana, con una fila sin datos |
| `WEB-v2 / Empresa / 06 Personas` a `10 Confirmación` | Los cinco que pide `08-administracion/spec.md` §5 (`Administración / 01` a `05`), con el nuevo prefijo |
| `WEB-v2 / Empresa / 11 Registro` | Las acciones administrativas, sin contenido de nadie |

**Móvil del colaborador** (antes del bloque 4):

| Cuadro | Qué muestra |
|---|---|
| `CUN-09 / Móvil / Tareas / 01 Asignadas` | La franja con dos tareas asignadas y una petición por aceptar |
| `CUN-09 / Móvil / Tareas / 02 Tarea asignada` | La tarea abierta: quién la pidió, fecha, criterio de terminado, preguntas |
| `CUN-09 / Móvil / Tareas / 03 Responder` | Marcar estado, contestar las preguntas (texto con contador de 400) o comentar |
| `CUN-09 / Móvil / Tareas / 04 Respuesta enviada` | La tarea esperando la decisión del responsable |
| `CUN-09 / Móvil / Tareas / 05 Decisión recibida` | Qué cambió y quién lo cambió (REQ-CUN07-17) |
| `CUN-09 / Móvil / Tareas / 06 Hilo` | El hilo dentro de la tarea |
| `CUN-09 / Móvil / Estados / 01 Tarea nueva` | La notificación al llegar una tarea |

**También necesarios** (no los pide INC-14 por su nombre, pero sin ellos el bloque 4 no tiene con qué compararse): `CUN-07 / Móvil / 01 Tarjeta de delegación`, `CUN-07 / Móvil / 02 Encargadas con una respuesta por decidir`, `CUN-08 / Móvil / 01 Síntesis del reporte`; `CUN-09 / Web / 01 Asignadas` y `02 Tarea abierta con su hilo`; y rehacer `WEB-v2 / Correo / 01–02` como solo aviso (INC-14).

### 6.7 Otros huecos que aparecen al juntar las áreas

| Hueco | Dónde iría |
|---|---|
| **Qué es una notificación en la aplicación.** REQ-CUN07-03, 16 y 17 la piden y nadie dice cómo se ve, dónde queda ni si se marca como leída. Propuesta: el mismo componente de aviso que el de invitación, y un punto en Tareas como el del asa (H-CAP-04) | `03-tareas` §7 |
| **Convocar una reunión (CUN-06).** Sin especificar; REQ-CUN05-17 ya da permiso a cualquier miembro | `05-equipos` |
| **Dónde ve el colaborador lo que le asignaron.** Ningún requisito nombra la franja. Propuesta: «Asignadas» (H-EMP-06) | `03-tareas` y glosario, «Franja» |
| **«Tiempo registrado» en el seguimiento.** REQ-CUN08-01 y 04 lo piden, y el registro de tiempo del equipo queda fuera (§7) | `03-tareas` §8 (enmienda) |
| **REQ-ACC-13 frente a REQ-CUN05-17.** El primero dice que, de lo ajeno, el colaborador solo ve sus tareas asignadas y sus hilos; el segundo le da libre/ocupado del equipo, y REQ-CUN07-18, las peticiones | `06-acceso` (enmienda) |
| **Nombre de la zona en pantalla.** «Administración» no vale para un responsable que no administra | `08-administracion` §5 y glosario (H-EMP-11) |

---

## 7. Lo que queda fuera en esta versión

| No entra | Por qué | Dónde sigue |
|---|---|---|
| **Facturación y precio del colaborador** | D-18 sigue abierta. La zona sabe qué cuentas tienen el Plan Empresarial, pero no cobra ni cuenta asientos | `SPEC.md` §8, D-18; `08-administracion/spec.md` §6 |
| **Registro de tiempo del equipo** | El registro de tiempo es de la persona (R-2, S-3) y no tiene requisito propio todavía. Sumarlo al seguimiento sería ver cuánto trabaja cada uno, que va más allá de «las tareas del equipo» (REQ-ACC-17) | `02-jornada`; enmienda a REQ-CUN08-01 y 04 (§6.7) |
| **Informes de horas** | R-21 dice cómo se muestra una cifra de un informe, pero no hay horas del equipo que mostrar. El reporte del equipo cuenta tareas, fechas y retrasos | `REPLANTEO.md` §8, R-21; `PLAN-VALOR-USUARIO.md` §5 (hito 4, «sin informes de horas») |
| **Actividad con alcance de equipo** | Con la zona, lo del equipo no vuelve a la aplicación; el registro de acciones sobre objetos del equipo queda para otra versión | `design/ARQUITECTURA-VISUAL-WEB.md` §6 y §15 |
| **Resúmenes de reunión (CUN-10)** | Bloqueado por D-4 | `SPEC.md` §8 |
| **Participantes externos sin cuenta** | D-8 sin decidir; la fase 4 trabaja con miembros que tienen cuenta | `05-equipos` §3, REQ-CUN05-12 |
| **Reportes programados** | H-SEG-04: posibilidad futura | `03-tareas` §8 |
| **Administrar desde el móvil o desde el asistente** | REQ-ADM-05, 07 | `08-administracion/spec.md` §6 |
| **Acciones sobre el equipo dentro de la zona** (decidir respuestas, reasignar desde el tablero) | La zona no tiene asistente; en esta versión se actúa en la aplicación (H-EMP-02) | Revisable cuando exista el tablero |
