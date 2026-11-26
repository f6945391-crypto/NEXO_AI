# Avance de NexoAI — 5 de noviembre de 2026

**Qué es:** el estado del proyecto a esta fecha, en cifras y en lo que se puede demostrar, con una lectura del avance por perfil (usuario personal, gerente y colaborador).
**Fuentes:** `SPEC.md` 2.19.3, `specs/trazabilidad.md` (generada con `tools/trazabilidad.py`), los tres `tasks.md` y el último `verificar` del 5 de noviembre de 2026.
**Rama:** `modificacion/vision-nexoai`, último commit `9217a68` (T-038). Solo local, sin push.
**No es especificación:** si este documento y `SPEC.md` difieren, manda `SPEC.md`.

---

## Índice

1. [Resumen en una página](#1-resumen-en-una-página)
2. [Avance por fase](#2-avance-por-fase)
3. [Avance por área](#3-avance-por-área)
4. [Qué se puede demostrar hoy](#4-qué-se-puede-demostrar-hoy)
5. [La revisión de la memoria del agente](#5-la-revisión-de-la-memoria-del-agente)
6. [Avance por perfil](#6-avance-por-perfil)
7. [Calidad y método](#7-calidad-y-método)
8. [Decisiones abiertas que frenan](#8-decisiones-abiertas-que-frenan)
9. [Riesgos](#9-riesgos)
10. [Próximos pasos](#10-próximos-pasos)
11. [Cómo se calcularon las cifras](#11-cómo-se-calcularon-las-cifras)

---

## 1. Resumen en una página

| Indicador | Valor |
|---|---|
| Requisitos especificados | **154** (148 vigentes, 6 retirados por D-17) |
| Requisitos implementados | **33 de 148 (22 %)**, todos con prueba automática |
| Requisitos en curso | **5** (REQ-CAP-01, 02, 06; REQ-AGT-01, 03) |
| Requisitos sin empezar | **110** |
| Casos de uso del negocio especificados | 8 de 11 (CUN-06 sin especificar, CUN-10 bloqueado, CUN-11 candidato) |
| Casos de uso del negocio implementados | **1 completo** (CUN-01, agenda personal) y la captura de CUN-03 |
| Tareas | **38 de 42 hechas**; quedan T-039 a T-042 |
| Pruebas automáticas | **272** en verde: API 232, contratos 16, web 16, móvil 8 |
| Trazabilidad | 154 requisitos, 0 problemas |
| Fases | 0 cerrada · 1 casi cerrada · 2 completa para la agenda, con la revisión de memoria en curso · 3 a 5 solo especificadas |

**En una frase:** la base técnica, el acceso, la agenda personal y el agente que la maneja por conversación están hechos y probados. Lo que distingue a los planes Personal y Empresarial todavía no tiene código: la jornada, las tareas, el correo asistido y todo lo de equipos.

---

## 2. Avance por fase

| Fase | Contenido | Estado | Lo que falta |
|---|---|---|---|
| 0 | Base del método: `SPEC.md`, glosario, trazabilidad | **Cerrada** el 22 de octubre de 2026 | — |
| 1 | Acceso, modelo de datos, agenda y tareas personales, sin agente | **Casi cerrada.** Acceso (15 de 17) y agenda (13 de 13) hechos, con Google real | Las tareas personales (CUN-03): **no están especificadas enteras**, solo su captura |
| 2 | El agente: intención, herramientas, confirmación | **Completa para la agenda** (T-029 a T-037). Groq conectado, 9 de 9 en la evaluación. **Revisión de la memoria en curso:** P0 avalado, T-038 hecha | T-039 a T-042; probar el agente en un teléfono |
| 3 | Planificación de la jornada (CUN-02) | Especificada (24 requisitos) | Plan, tareas y código |
| 4 | Equipos: disponibilidad, delegación, seguimiento, colaborador | Especificada en parte; CUN-08 en borrador; CUN-06 sin especificar | Diseño (INC-14), plan, tareas y código |
| 5 | Correo asistido y resúmenes de reunión | Especificada en parte; CUN-10 bloqueado por D-4 | Decidir PT-3 y D-4, y todo lo demás |

---

## 3. Avance por área

| Área | Vigentes | Implementados | En curso | Pendientes | Avance |
|---|---|---|---|---|---|
| 06 · Acceso | 17 | 15 | 0 | 2 | **88 %** |
| 02 · Agenda | 13 | 13 | 0 | 0 | **100 %** |
| 07 · Agente | 5 | 1 | 2 | 2 | **20 %** (60 % contando lo en curso) |
| 01 · Captura | 24 | 4 | 3 | 17 | **17 %** (29 % con lo en curso) |
| 02 · Jornada | 24 | 0 | 0 | 24 | 0 % |
| 03 · Tareas y delegación | 26 | 0 | 0 | 26 | 0 % |
| 04 · Comunicaciones y encargo | 22 | 0 | 0 | 22 | 0 % |
| 05 · Equipos | 17 | 0 | 0 | 17 | 0 % |
| **Total** | **148** | **33** | **5** | **110** | **22 %** |

Notas:
- **Acceso:** los dos que faltan (REQ-ACC-16, rol por equipo; REQ-ACC-17, qué ve el responsable de cada miembro) son de la fase 4.
- **Agente:** REQ-AGT-02 está hecho. REQ-AGT-01 estaba implementado en su versión 1, y su versión 2 (episodio y nota de continuidad) está en curso. REQ-AGT-03 (la transcripción persiste) tiene la API hecha y le faltan los clientes. REQ-AGT-04 y 05 están pendientes.
- **Captura:** está hecha la puerta de texto con el agente. La voz quedó fuera (PT-2), y la paleta y las tareas esperan a CUN-03.

---

## 4. Qué se puede demostrar hoy

| Qué | Web | Móvil | Cómo se probó |
|---|---|---|---|
| Entrar, primer ingreso con zona horaria, salir | ✔ | ✔ | Pruebas de extremo a extremo; móvil en un teléfono Android con Expo Go |
| Conectar Google con permisos por alcance | ✔ (Ajustes) | — (se conecta desde la web) | Cuenta real de Google |
| Agenda de hoy con los compromisos reales y su zona | ✔ | ✔ | Calendario real; teléfono Android |
| Cancelar un compromiso desde su detalle, con tarjeta de confirmación | — | ✔ | Teléfono Android |
| Cambiar la zona horaria con su tarjeta | ✔ | — | Pruebas de extremo a extremo |
| **Pedirle al asistente** consultar, registrar, mover o cancelar compromisos, con tarjeta antes de cualquier efecto | ✔ con Groq | ✔ en Expo web | El equipo con su calendario real en la web; el móvil todavía **no se probó en un teléfono con el agente** |
| Lo que el asistente no puede atender queda **en espera** y se retoma solo | ✔ | ✔ | Pruebas de API y de extremo a extremo |
| Una tarea dicha al asistente queda guardada en espera hasta que existan las tareas | ✔ | ✔ | Pruebas |
| **La conversación ya no se pierde en la base** (T-038) | API lista | API lista | Pruebas de API. **En pantalla todavía se vacía**: cambia con T-039 |

**Lo que no se puede demostrar:** tareas personales, planificar el día, correo, equipos, delegación, seguimiento, reuniones y resúmenes.

---

## 5. La revisión de la memoria del agente

Responde a lo que el equipo vio al probar con Groq: la conversación se vaciaba tras cada acción y el asistente no podía referirse a lo recién hecho.

| Paso | Estado | Commit |
|---|---|---|
| P0: requisitos, glosario, diseño, plan y tareas | Hecho y **avalado** | `e614c8a`, `cc085cf` (enmienda), `f0e50c8` (aval) |
| Plan de pruebas del equipo | En el repositorio | `0c2a9b2` |
| **T-038** Transcripción propia, fuera del estado del grafo | **Hecha** | `9217a68` |
| T-039 Web y móvil que no se vacían, con separadores y «Ver anteriores» | Pendiente | — |
| T-040 Nota de continuidad y evaluación por trayectoria | Pendiente | — |
| T-041 Cierre por inactividad y retención | Pendiente | — |
| T-042 Alternativas de referente (si el equipo lo acepta) | Pendiente | — |

**Medido en T-038:** con una propuesta, el estado guardado del grafo bajó de unos 8 KB a **5 546 bytes**. No llega a la meta de 2 KB del plan de pruebas (B2).

**Lo que se verá al terminar T-039:** al confirmar algo y escribir otra cosa, lo anterior sigue en pantalla con una línea «Jueves 5, 18:12 · Dentista registrado». Al recargar se ve el historial, y «Ver anteriores» trae lo más viejo.

---

## 6. Avance por perfil

### 6.1 Cifras

Cada perfil cuenta los requisitos que le aplican. Los planes son acumulativos: Gratuito ⊂ Personal ⊂ Empresarial (`REPLANTEO.md` §4).

| Perfil | Requisitos que le aplican | Implementados | Avance | Lo hecho que más pesa |
|---|---|---|---|---|
| **Usuario, plan Gratuito** | 54 (captura, agenda, acceso básico, agente) | 30 | **56 %** | Agenda completa con el agente |
| **Usuario, plan Personal** | 93 (lo anterior más jornada y correo asistido) | 30 | **32 %** | Igual que el Gratuito: lo que suma el plan Personal no tiene código |
| **Colaborador** | ~109 (lo del plan Personal, sus 3 de acceso y unos 13 propios de equipo) | 33 | **~30 %** | Usa la agenda y el agente como cualquiera, y el servidor ya le impide delegar |
| **Gerente / responsable del equipo** | 145 (todo, salvo los 3 de acceso del colaborador) | 30 | **21 %** | Nada de su parte diferencial: equipos, delegación y seguimiento están en 0 |

*Los ~13 propios del colaborador son REQ-CUN07-11 a 19 (el ciclo de vuelta, las peticiones y las propuestas al responsable), REQ-CUN05-17 (ver disponibilidad y convocar) y la parte del encargo que le toca. Es una estimación: el reparto exacto se fija al planificar la fase 4.*

### 6.2 Usuario personal (planes Gratuito y Personal)

| | |
|---|---|
| **Qué puede hacer hoy** | Entrar, conectar Google, ver su agenda de hoy en su zona y pedirle al asistente consultar, registrar, mover o cancelar compromisos, siempre con tarjeta. Lo que no puede atenderse queda en espera |
| **Plataforma** | Móvil probado en un teléfono Android, sin el agente. Web completa con el agente y Groq |
| **Lo que falta** | **Tareas personales (CUN-03)**: es el hueco más visible, porque el asistente ya reconoce «recuérdame pagar el recibo» y solo puede guardarlo en espera. También la jornada (CUN-02), el correo asistido (CUN-04) y la voz |
| **Lectura** | El plan **Gratuito** está cerca de ser un producto mínimo coherente. El plan **Personal** no se distingue todavía del Gratuito: toda su propuesta de valor («propone») está en la jornada, que no tiene plan. Antes de seguir conviene resolver **PT-5 / D-5**: si el plan Personal se modela o se declara visión |
| **Riesgo** | Que en la sustentación el asistente diga «las tareas llegan en una próxima versión» ante una de las frases más naturales. Especificar CUN-03 es lo de mayor impacto por esfuerzo |

### 6.3 Colaborador

| | |
|---|---|
| **Qué puede hacer hoy** | Lo mismo que el usuario personal sobre lo suyo, en la web y en el móvil (D-17, enmendada). El servidor ya le cierra las rutas del responsable (T-026), y Google le ofrece los dos permisos |
| **Plataforma** | En el hito del presentable se muestra en el móvil. La web se lo permite (T-026), pero el hito no la muestra |
| **Lo que falta** | **Todo lo que lo hace colaborador:** recibir una tarea asignada, responderla en la aplicación, que la respuesta llegue al líder como propuesta y recibir su decisión (CUN-09). También las peticiones a compañeros (REQ-CUN07-18), las propuestas al responsable (REQ-CUN07-19) y ver la disponibilidad del equipo (REQ-CUN05-17) |
| **Lectura** | Su cifra (~30 %) es engañosa: casi todo viene de lo que comparte con el usuario personal. **Su flujo propio está en 0** y depende de la fase 4. Además **no tiene ningún cuadro de diseño**, ni móvil ni web (INC-14), así que hoy no se puede construir sin decidir antes cómo se ve |
| **Riesgo** | El precio de su asiento (D-18) y el rol por equipo (REQ-ACC-16): hoy el rol está en la cuenta, y una persona responsable de un equipo y colaboradora en otro no se puede representar |

### 6.4 Gerente / responsable del equipo

| | |
|---|---|
| **Qué puede hacer hoy** | En la web, lo del hito: entrar, la agenda de hoy con Google, Ajustes con permisos y zona horaria, y el asistente para su propia agenda |
| **Plataforma** | Web, como en el hito. El móvil lo deja entrar como a cualquiera, pero **sin decidir** qué coordinación tiene allí |
| **Lo que falta** | **Su parte diferencial entera:** disponibilidad del equipo (CUN-05), coordinar reuniones (CUN-06, sin especificar), delegar con preguntas declaradas (CUN-07 y el encargo), seguimiento con resumen y reporte (CUN-08, en borrador). Además, el rol por equipo (REQ-ACC-16) y lo que ve de cada miembro (REQ-ACC-17) |
| **Lectura** | Es el perfil con menos avance relativo (21 %) y el que más se apoya en decisiones abiertas: H-SEG-03 (quién lee un reporte), D-18, el rol por equipo e INC-07 (los cuadros de CUN-05 están desfasados). La revisión de la memoria del agente le sirve igual: la transcripción y la nota de continuidad son la base para que un resumen del equipo se apoye en datos y no en lo que recuerda el modelo |
| **Riesgo** | La fase 4 es la más grande y la más bloqueada por decisiones. Sin un recorte para el Entregable, el perfil que más justifica el plan Empresarial llegaría sin nada propio |

### 6.5 Comparación rápida

| | Usuario personal | Colaborador | Gerente |
|---|---|---|---|
| Acceso | ✔ | ✔ y sin poder delegar | ✔ (sin rol por equipo) |
| Agenda propia | ✔ | ✔ | ✔ |
| Agente sobre la agenda | ✔ | ✔ | ✔ |
| Historial de la conversación | API ✔, pantalla en T-039 | Igual | Igual |
| Tareas propias | ✘ (en espera) | ✘ | ✘ |
| Jornada | ✘ | ✘ | ✘ |
| Correo asistido | ✘ | ✘ | ✘ |
| Su flujo de equipo | — | ✘ (CUN-09) | ✘ (CUN-05 a 08) |
| Diseño de sus pantallas | Parcial | **Ninguno** (INC-14) | Parcial y desfasado (INC-07) |

---

## 7. Calidad y método

| Indicador | Valor |
|---|---|
| `verificar` (tipos, compilación, pruebas y trazabilidad) | En verde el 5 de noviembre de 2026 |
| Pruebas | 272 automáticas. **0 requisitos «verificados»** por el equipo en la trazabilidad: «implementado» significa con prueba automática, no avalado a mano |
| Prueba intermitente conocida | `movil.acceso-recorrido` agota el tiempo en frío cuando corre todo a la vez; sola, pasa |
| Evaluación del modelo | 9 de 9 contra Groq (T-037). La próxima corrida, en T-040, con 14 casos |
| Relación entre commits de documentos y de código | Fase 2: ≈ 1:1. En la rama de la revisión, hasta ahora: 4 de documentos y 1 de código. El objetivo del traspaso es 1:4: el exceso viene de la pasada única de P0, y de aquí en adelante cada tarea debería tocar solo `tasks.md` |
| Inconsistencias abiertas | INC-02, 05, 07, 10, 11, 12, 14, 15, 16 y 17 |
| Seguridad | La integración continua sigue en rojo por `pnpm audit` (node-forge). El arreglo está en `PLAN-RAMAS.md` §3, rama `actualizacion/error-npm`, a cargo del equipo |

---

## 8. Decisiones abiertas que frenan

| Decisión | Frena | Perfil |
|---|---|---|
| Especificar CUN-03, las tareas personales | Cerrar la fase 1 y que el asistente registre tareas | Todos |
| PT-5 / D-5: ¿se modela el plan Personal? | La fase 3 (jornada) | Usuario personal |
| H-AG-08: ¿caduca una propuesta sin respuesta? | T-041 y B12 del plan de pruebas | Todos |
| Proveedor del modelo fuera de las pruebas | Pasar de Groq gratuito a algo estable | Todos |
| Rol por equipo (REQ-ACC-16), D-18 (precio) | Fase 4 | Gerente y colaborador |
| INC-14: no hay diseño del colaborador | Fase 4 | Colaborador |
| H-SEG-03: quién lee un reporte del equipo | CUN-08 | Gerente |
| D-4: actor de CUN-10 · PT-3: correo real o simulado | Fase 5 | Todos |
| INC-17: tercer sentido de «actividad» | REQ-AGT-05 | Todos |

---

## 9. Riesgos

| Riesgo | Probabilidad | Impacto | Qué lo reduce |
|---|---|---|---|
| El Entregable llega sin nada del plan Empresarial | Alta | Alto | Recortar la fase 4 a un recorrido mínimo: delegar una tarea y que el colaborador la responda (CUN-07 y CUN-09) |
| El agente no se probó en un teléfono | Media | Medio | Una sesión con Expo Go tras T-039 (A12 del plan de pruebas) |
| Cuota del nivel gratuito de Groq en la demostración | Media | Alto | El 429 deja lo pedido en espera (H-AGT-13). Tener a mano el simulado con su guion |
| El estado guardado no baja de 2 KB | Baja | Bajo | Medido y con límite en la prueba. Reducirlo más es una decisión aparte |
| Divergencia entre diseño y código (INC-14, 15, 16) | Alta | Medio | Contrastar con Figma cuando se autorice el conector |

---

## 10. Próximos pasos

| Orden | Paso | Para quién |
|---|---|---|
| 1 | **T-039**: la conversación no se vacía en la web ni en el móvil | Todos los perfiles |
| 2 | T-040 y T-041: nota de continuidad, inactividad y retención. Decidir antes H-AG-08 | Todos |
| 3 | Probar el agente en un teléfono real (A12) | Usuario personal y colaborador |
| 4 | **Especificar CUN-03** (tareas personales) y planificarlo | Todos; desbloquea la captura |
| 5 | Decidir el recorte de la fase 4 para el Entregable y diseñar al colaborador (INC-14) | Gerente y colaborador |
| 6 | Arreglar la integración continua (`actualizacion/error-npm`) | Equipo |

---

## 11. Cómo se calcularon las cifras

- **Requisitos y estados:** la tabla de `specs/trazabilidad.md` del 5 de noviembre de 2026. «Vigentes» excluye los 6 retirados. «Avance» es implementados entre vigentes, sin contar lo en curso salvo donde se dice.
- **Por perfil:**
  - Gratuito: captura (24), agenda (13), acceso REQ-ACC-01 a 12 (12) y agente (5).
  - Personal: suma la jornada (24) y el correo asistido, REQ-CUN04 (15).
  - Colaborador: lo del Personal, REQ-ACC-13 a 15 y una estimación de sus requisitos de equipo.
  - Gerente: los 148 vigentes menos REQ-ACC-13 a 15.
  - No se pondera por esfuerzo: un requisito de acceso pesa lo mismo que uno de seguimiento.
- **Tareas:** los `### T-nnn` de `specs/02-agenda`, `06-acceso` y `07-agente` con su estado. No hay tareas de las áreas sin plan.
- **Pruebas:** el último `verificar` en verde, del 5 de noviembre de 2026.
