# Informe — Estructura del código y viabilidad de reestructurar el agente, la interfaz y lo que depende de ellos

**Fecha:** 29 de octubre de 2026
**Alcance:** el monorepo de NexoAI tal como está en el repositorio (fase 2 completa, T-001 a T-037), evaluado contra las buenas prácticas reunidas en `INFORME-MEMORIA-AGENTE.md` §4. Se analiza qué hay, qué habría que cambiar para adoptar la estructura de tres capas de ese informe (§6), cuánto cuesta, qué riesgo tiene y en qué orden hacerlo.
**Qué es:** un análisis para decidir. **No es especificación ni plan.** Lo que el equipo acepte entra por el camino de `AGENTS.md`: hallazgo → requisito → `SPEC.md` → plan → tareas → código.
**Complementa a:** `INFORME-MEMORIA-AGENTE.md` (el porqué y la estructura objetivo) e `INFORME-LANGGRAPH.md` (contraste con la comunidad de LangGraph).

---

## Índice

1. [Veredicto en una página](#1-veredicto-en-una-página)
2. [Mapa del código como está](#2-mapa-del-código-como-está)
3. [Evaluación de la estructura frente a las buenas prácticas](#3-evaluación-de-la-estructura-frente-a-las-buenas-prácticas)
4. [Hallazgo central: el diseño, el requisito y el código no dicen lo mismo](#4-hallazgo-central-el-diseño-el-requisito-y-el-código-no-dicen-lo-mismo)
5. [Viabilidad de la reestructuración, pieza por pieza](#5-viabilidad-de-la-reestructuración-pieza-por-pieza)
6. [Orden de implementación propuesto](#6-orden-de-implementación-propuesto)
7. [Riesgos y cómo se cubren](#7-riesgos-y-cómo-se-cubren)
8. [Lo que no se toca](#8-lo-que-no-se-toca)
9. [Lo que queda para el equipo](#9-lo-que-queda-para-el-equipo)

---

## 1. Veredicto en una página

**La reestructuración es viable, acotada y de riesgo bajo.** No es una reescritura: el 80 % del módulo del agente (puerto del proveedor, herramientas, ejecutor, auditoría, cola en espera, interrupción del grafo) ya cumple las prácticas de referencia y **no cambia**. Lo que cambia es la **composición del contexto** que lee el modelo, **dónde vive la transcripción** y **cómo la interfaz trata el cierre de una acción**.

| Pregunta | Respuesta corta |
|---|---|
| ¿Hay que cambiar de framework o de arquitectura? | No. LangGraph, NestJS, Prisma, los contratos zod y el patrón de Operaciones se quedan tal cual |
| ¿Cuánto código se toca? | Unos 7 archivos de la API, 1 contrato, 1 migración, 1 componente web, 1 pantalla móvil y 3 archivos de prueba. Alrededor de 400 líneas cambian o se añaden sobre 2.800 del agente y sus clientes |
| ¿Cuántas tareas? | Cinco (T-038 a T-042), cada una de una sesión, cada una deja `verificar` en verde |
| ¿Qué riesgo técnico tiene? | Bajo. El cambio más delicado es sacar `turnos` del estado del grafo; está aislado y tiene pruebas de integración que lo cubren |
| ¿Qué riesgo de método tiene? | Medio si se hace sin orden: hay que cambiar primero `spec.md`, el glosario y el diseño, porque hoy los tres se contradicen (§4) |
| ¿Qué se gana? | Pantalla que no se vacía, agente que sabe lo que acaba de hacer, punto de control 5 a 10 veces más pequeño, y un sitio para la memoria larga |
| ¿Qué se pierde? | Nada funcional. Una prueba (`agente.conversacion-con-contexto`) cambia su segundo criterio |

La deuda más seria que destapa el análisis **no es de código sino de coherencia entre documentos**: el diseño visual dice que el vaciado lo decide la persona con advertencia, el requisito dice que lo hace el sistema al cerrar la acción, y el código obedece al requisito. Eso va a `SPEC.md` §9 antes que cualquier otra cosa.

---

## 2. Mapa del código como está

### 2.1 El monorepo

| Paquete | Tecnología | Papel | Tamaño relevante |
|---|---|---|---|
| `apps/api` | NestJS + Prisma + LangGraph.js + BullMQ | Dominio, agente, integraciones, trabajador | Módulo `agente/`: 23 archivos, ~2.000 líneas |
| `apps/web` | Next.js 16, App Router | Web de tres columnas | `conversacion.tsx`: 275 líneas |
| `apps/movil` | Expo 57 | Capa de captura y agenda | `captura.tsx`: 237 líneas |
| `packages/contratos` | zod | Única definición de peticiones, respuestas y herramientas (AD-08) | `asistente.ts`: 60 líneas; `agente.ts` |
| `tools/` | Python | Trazabilidad requisito → tarea → prueba | — |

### 2.2 El módulo del agente, por capas

```
                    ┌──────────────────────────────────────────┐
  web / móvil ──►   │ asistente.controller.ts  (3 rutas)        │
                    └───────────────┬──────────────────────────┘
                                    ▼
                    ┌──────────────────────────────────────────┐
                    │ asistente.service.ts  (233 líneas)        │
                    │  · abre/cierra conversación               │
                    │  · construye el grafo por petición        │
                    │  · reanuda con la decisión                │
                    │  · atiende la cola en espera              │
                    └──────┬──────────────────┬────────────────┘
                           ▼                  ▼
   ┌──────────────────────────────┐   ┌──────────────────────────┐
   │ grafo/grafo-asistente.ts     │   │ operaciones.service.ts   │
   │  5 nodos · estado con        │──►│  proponer / confirmar /  │
   │  mensajes + TURNOS           │   │  descartar / encolar     │
   └──────┬───────────────────────┘   └──────────────────────────┘
          ▼
   ┌──────────────────────────────┐   ┌──────────────────────────┐
   │ grafo/punto-control-prisma   │   │ herramientas/            │
   │  MemorySaver → 1 fila        │   │  ejecutor (valida,       │
   │  (2 puntos, con TURNOS       │   │  audita, idempotencia)   │
   │   dentro)                    │   │  agenda ×4, captura ×1   │
   └──────────────────────────────┘   └──────────────────────────┘
          ▼
   ┌──────────────────────────────┐
   │ modelo/                      │
   │  puerto ProveedorModelo      │
   │  simulado · no-configurado · │
   │  compatible-openai (Groq)    │
   │  llamador (30 s, reintentos) │
   └──────────────────────────────┘
```

Lo marcado en mayúsculas (`TURNOS`) es el punto donde la transcripción de la persona viaja dentro del estado del grafo y acaba serializada en el punto de control. Es el nudo del problema.

### 2.3 Datos que intervienen

| Tabla | Qué guarda | Relación con el problema |
|---|---|---|
| `conversacion_agente` | id, perfil, organización, `abierta`/`cerrada`, fechas | Unidad única para hilo del grafo, pantalla y memoria |
| `punto_control_agente` | Una fila por conversación, `datos` JSON con 2 puntos serializados en base64 | Contiene `mensajes` **y** `turnos`: la transcripción está aquí, ilegible sin LangGraph |
| `operacion` | Propuestas, ejecutadas, descartadas, en espera; `conversacion_id`; `solicitud_original`; `resultado` | **Ya contiene todo lo que necesita la nota de continuidad**: qué se confirmó, cuándo, con qué datos devueltos por Google |
| `llamada_modelo`, `invocacion_herramienta` | Auditoría con costo (P-07) | No cambian |
| `evento_auditoria` | Auditoría de dominio (propuesta técnica §9) | Base del modo «Registro» del lienzo que el diseño prevé y no está implementado |

### 2.4 Cómo fluye el cierre hoy (lo que la persona percibe como «se borra»)

1. `comunicar` devuelve `cerrada: true` al confirmar, descartar o fallar.
2. `AsistenteService.cerrarSiHaceFalta` pasa la fila a `cerrada`.
3. `RespuestaAsistente.cerrada` llega al cliente.
4. Web (`conversacion.tsx`, línea 202) y móvil (`captura.tsx`, línea 168): `setTurnos(cerrada ? [provisional] : [...previos, provisional])`. **Una sola línea en cada cliente** decide el vaciado.
5. El siguiente `GET /asistente/conversacion` devuelve la conversación abierta nueva, vacía. La anterior no se vuelve a leer nunca.

---

## 3. Evaluación de la estructura frente a las buenas prácticas

Escala: **cumple** · **parcial** · **no cumple**. Las prácticas son las de `INFORME-MEMORIA-AGENTE.md` §4 y las de `INFORME-LANGGRAPH.md`.

### 3.1 Lo que está bien y conviene conservar

| Práctica | Estado | Dónde se ve |
|---|---|---|
| Herramientas tipadas, validadas antes de ejecutar, pocas y sin solapes | **Cumple** | `packages/contratos/src/agente.ts`; `ejecutor-herramientas.ts`; cinco herramientas |
| El modelo nunca escribe; todo efecto pasa por confirmación humana | **Cumple** | Herramientas que solo `proponen`; `interrupt()` en `esperar_decision`; una sola confirmación (AD-09) |
| Nada con efecto antes de `interrupt()` (el nodo se repite al reanudar) | **Cumple** | `esperarDecision` no hace nada antes de interrumpir; comprobado con un script en T-032 |
| Proveedor del modelo detrás de un puerto propio, sin SDK | **Cumple** | `modelo/proveedor-modelo.ts`; prueba que recorre `src/` buscando SDKs |
| Errores de herramienta devueltos al modelo con código; tope de vueltas | **Cumple** | `DATOS_FALTANTES`, `PERMISO_GOOGLE_FALTANTE`, `UNA_ACCION_A_LA_VEZ`; `TOPE_VUELTAS = 4` |
| Recuperación justo a tiempo (el modelo pide la agenda, no la recibe entera) | **Cumple** | `agenda.consultar` con rango; H-AGT-12 |
| Contenido externo marcado como datos | **Cumple** | `contenido-externo.ts`; H-AGT-15; caso malicioso en la evaluación |
| Idempotencia y auditoría con costo | **Cumple** | `llamadas-auditadas.ts`; `(conversacion_id, id_llamada)` único |
| Aislamiento por organización, también en el punto de control | **Cumple** | `PrismaDeOrganizacion`; `MODELOS_CON_ORGANIZACION` |
| Modo degradado con cola | **Cumple** | `en-espera.ts`, `trabajador-en-espera.ts`; P-11 |
| Recorte de la memoria corta | **Cumple** | `recortar()` a 20 mensajes, empezando en uno de la persona |
| Resultado redactado por el código, no por el modelo | **Cumple** | `textoDelResultado`; REQ-CUN01-04 |

Esto es lo que hace viable la reestructuración: las defensas no dependen del cierre de la conversación, así que el cierre puede cambiar sin tocarlas.

### 3.2 Lo que no cumple y motiva el cambio

| Práctica | Estado | Qué pasa hoy | Consecuencia |
|---|---|---|---|
| Separar lo que ve la persona de lo que lee el modelo | **No cumple** | `turnos` y `mensajes` viven en el mismo estado y mueren juntos | Pantalla vacía; punto de control grande; transcripción ilegible fuera de LangGraph |
| Nota estructurada que sobreviva al reinicio de contexto | **No cumple** | Tras `cerrada`, el modelo no recibe nada de lo anterior | «Mejor a las 5» tras confirmar no se puede relacionar; «¿qué hicimos?» no se puede responder |
| Separar memoria corta (hilo) de memoria larga (persona) | **No cumple** | Solo existe el hilo; la memoria larga no tiene sitio | Cuando lleguen las preferencias (propuesta técnica §7.4) habría que volver a abrir esto |
| Persistencia visible del historial para la persona | **No cumple** | `GET /asistente/conversacion` devuelve solo la abierta | La persona no puede repasar lo que pidió |
| El cliente no debe decidir qué se borra | **No cumple** | Dos clientes implementan por su cuenta el vaciado con una línea cada uno | Comportamiento duplicado; si cambia el requisito hay que tocar web y móvil |
| El estado del grafo debe contener solo lo que el grafo necesita | **Parcial** | `turnos` es estado de presentación, no de control | 36–46 KB por conversación corta con 10 puntos; con 2 sigue siendo 5 veces lo necesario |
| Evaluación por trayectorias | **Parcial** | `evaluar-asistente` admite `historia` desde T-037, pero mira solo la primera herramienta | No hay caso que compruebe «mejor a las 5» después de confirmar |
| Plazo para una propuesta sin respuesta | **No cumple** | Una tarjeta pendiente bloquea el hilo indefinidamente; `atenderEnEspera` devuelve `ocupada` y la cola no avanza | H-AG-08 sigue abierto desde la fase 1 |

### 3.3 Deudas menores de estructura, no bloqueantes

- `asistente.service.ts` (233 líneas) mezcla cuatro responsabilidades: ciclo de vida de la conversación, construcción del grafo, decisiones y atención de la cola. Al introducir la transcripción y la nota conviene **extraer dos servicios** (`TranscripcionService`, `NotaDeContinuidad`) en vez de engordarlo.
- El grafo **se compila en cada petición** (decisión consciente de T-032 para cerrar sobre la identidad). Es correcto para P-04 y barato; no hace falta cambiarlo.
- El contrato `RespuestaAsistente.cerrada` es un **detalle de implementación filtrado al cliente**. Con la nueva estructura pasa a ser `episodioCerrado` y la interfaz solo lo usa para pintar un separador, no para borrar.
- `recursionLimit` de LangGraph sigue en el valor por defecto (observación de `INFORME-LANGGRAPH.md` §7). Un cambio de una línea cuando se toque el grafo.

---

## 4. Hallazgo central: el diseño, el requisito y el código no dicen lo mismo

Al leer `design/ARQUITECTURA-VISUAL-WEB.md` junto al `spec.md` y al código aparece una contradicción que ningún documento registra:

| Documento | Qué dice sobre el cierre |
|---|---|
| `design/ARQUITECTURA-VISUAL-WEB.md` §5 | La conversación es «deliberadamente corta y desechable», **pero «el vaciado lo decide el usuario, no el sistema», y siempre con advertencia previa** que dice qué se pierde (RN-ER-03). «Lo cerrado no se pierde al vaciar: queda en el registro» |
| `design/ARQUITECTURA-VISUAL-WEB.md` §4 | El lienzo tiene un modo **Registro**: «lo que el asistente hizo, con su resultado», al que pasa **automáticamente** al cerrar una operación. «El lienzo es la memoria, la conversación es el área de trabajo» |
| `specs/glosario.md`, «Conversación» | «Desechable: se vacía al cerrar la operación» (cita a `ARQUITECTURA-VISUAL-WEB.md` §2) |
| `specs/07-agente/spec.md`, REQ-AGT-01 y H-AGT-05 | La conversación **se cierra sola** al cerrarse la acción y la siguiente empieza sin contexto |
| Código (`comunicar`, `conversacion.tsx`, `captura.tsx`) | Vacía **automáticamente**, sin advertencia, y el modo Registro del lienzo **no existe** |

Es decir: el diseño ya había separado **área de trabajo** (conversación) de **memoria** (lienzo en modo Registro) y había dejado el vaciado en manos de la persona. Al escribir REQ-AGT-01 se tomó la mitad de esa idea (desechable) y se perdió la otra mitad (quién decide, y a dónde va lo cerrado). El glosario fijó la versión incompleta y el código la implementó fielmente.

**Lo que esto cambia en el análisis:**

- La estructura de tres capas de `INFORME-MEMORIA-AGENTE.md` §6 **no contradice el diseño: lo completa.** La transcripción persistente es lo que el diseño llama «registro»; la nota de continuidad es el puente que faltaba entre el área de trabajo y la memoria.
- Hay que decidir **dónde se ve lo pasado**: en la propia columna de conversación (episodios anteriores arriba, con separador) o en el lienzo en modo Registro, como dice el diseño. Son compatibles: la columna muestra los episodios recientes; el Registro, la historia completa con filtros. Pero es una decisión del equipo (§9).
- Por `AGENTS.md`, esta contradicción se anota en **`SPEC.md` §9** antes de resolverla, y la resolución entra como cambio de REQ-AGT-01 y del glosario.

---

## 5. Viabilidad de la reestructuración, pieza por pieza

Para cada pieza: qué cambia, qué se conserva, esfuerzo y riesgo. Esfuerzo en fracciones de una tarea (una sesión de trabajo, regla de `tasks.md`).

### 5.1 API — grafo (`grafo/grafo-asistente.ts`, 280 líneas)

| Qué | Cambio |
|---|---|
| Estado `EstadoAsistente` | **Quitar `turnos`.** Los nodos siguen produciendo turnos, pero los devuelven en un canal de salida de la vuelta (`turnosNuevos`, con reductor que **reemplaza**, no acumula) que el servicio persiste y vacía. El plan §4.1 ya llamaba `turnosNuevos` a ese campo; la implementación lo acumuló |
| `interpretar` | El `sistema` pasa a ser `instrucciones(referencia) + nota`, donde la nota la recibe el grafo ya armada (una cadena) desde el servicio, para que el grafo no consulte tablas de Operaciones directamente (plan §2, dependencia entre módulos) |
| `comunicar` | Igual: marca `cerrada`. Lo que cambia es qué hace el servicio con esa señal |
| `recortar` | Igual |
| Todo lo demás | Igual: nodos, aristas, interrupción, encolado |

**Esfuerzo:** 0,3 tarea. **Riesgo:** bajo; cubierto por `agente.interrumpe-hasta-decidir`, `agente.conversacion-con-contexto`, `agente.pregunta-de-uno-en-uno`.

### 5.2 API — servicio (`asistente.service.ts`, 233 líneas)

| Qué | Cambio |
|---|---|
| Ciclo de vida | `conversacion_agente` pasa a ser el **episodio** (misma tabla; renombrar es opcional y caro en migraciones; basta con documentarlo en el plan y, si se quiere, un alias en Prisma). Se añade `cierre por inactividad` (30 min, H-AGT-05 v2) comprobado al recibir un mensaje |
| Transcripción | Nuevo `TranscripcionService` (~60 líneas): `anotar(perfil, episodio, turnos[])` y `listar(perfil, desde?, limite)`. Se llama en `responder` y en `atenderEnEspera` con los `turnosNuevos` de cada invocación |
| Nota de continuidad | Nuevo `NotaDeContinuidad` (~50 líneas): lee las últimas *n* Operaciones `ejecutada` del perfil (y lo `en_espera`) con `OperacionesService.listar`, y arma el texto determinista con `fechaLarga`/`horario` que ya existen en `agenda/formato.ts`. Envuelta como contenido externo (H-AGT-15) |
| `conversacion()` | Devuelve la transcripción paginada + el episodio abierto + `pendiente`. Ya no lee los turnos del estado del grafo |
| `enviar()`, `decidir()`, `atenderEnEspera()` | Mismos flujos; al final, anotan en la transcripción |

**Esfuerzo:** 0,7 tarea. **Riesgo:** bajo-medio: la escritura de la transcripción debe hacerse **después** de que el grafo persista su punto de control, para que un fallo a mitad no deje turnos sin estado; se resuelve anotando en `responder`, que ya corre tras `invoke`.

### 5.3 API — punto de control (`grafo/punto-control-prisma.ts`, 117 líneas)

**No cambia una línea.** Al quitar `turnos` del estado, lo que serializa se reduce solo. Medición esperada: de ~3 KB (abierta) y ~8–9 KB (cerrada con 2 puntos) a menos de 2 KB. **Esfuerzo:** 0. La retención de episodios cerrados (borrar la fila tras *x* días) es un trabajo de BullMQ de ~30 líneas en el trabajador existente: **0,2 tarea.**

### 5.4 API — datos (migración novena)

| Cambio | Detalle |
|---|---|
| Tabla nueva `turno_asistente` | `id`, `organizacion_id`, `perfil_id`, `episodio_id` (FK a `conversacion_agente`), `en`, `tipo`, `datos` JSON (el `TurnoAsistente` validado con zod). Índice `(perfil_id, en desc)`. Entra en `MODELOS_CON_ORGANIZACION` |
| `conversacion_agente` | Campo nuevo `ultima_actividad_en` para el cierre por inactividad. Opcional: `sesion_id` para el separador de sesión; si no, la sesión se infiere por el hueco entre episodios al listar |
| Datos existentes | Las conversaciones cerradas de desarrollo **no se migran**: su transcripción está en base64 dentro del punto de control y solo hay datos de prueba. Se anota en el plan |

**Esfuerzo:** 0,2 tarea (incluida la ampliación de `plataforma.aislamiento-entre-organizaciones`). **Riesgo:** bajo.

### 5.5 Contratos (`packages/contratos/src/asistente.ts`)

| Cambio | Detalle |
|---|---|
| `RespuestaAsistente` | `cerrada` → `episodioCerrado` (mismo significado, nombre honesto); se añade `episodioId` |
| `ConversacionAsistente` | Pasa a `{ turnos, episodioAbierto: uuid \| null, pendiente, hayAnteriores: boolean, cursor: string \| null }`. Cada turno lleva `episodioId` para pintar separadores |
| `GET /asistente/conversacion?antes=<cursor>&limite=<n>` | Paginación hacia atrás |
| `TurnoAsistente` | Igual; se añade un tipo `separador` opcional **o** el cliente lo deduce de `episodioId`. Recomendado: deducirlo, para no inventar un turno que no dijo nadie |

**Esfuerzo:** 0,2 tarea. **Riesgo:** bajo; es un cambio de contrato con los dos clientes en el mismo repositorio, sin versiones desplegadas.

### 5.6 Web (`apps/web/src/app/aplicacion/conversacion.tsx`, 275 líneas; `lib/asistente.ts`; `acciones.ts`)

| Cambio | Detalle |
|---|---|
| Estado `cerrada` | **Desaparece la línea 202.** Los turnos siempre se añaden |
| Separadores | Un `<li className="separador">` entre turnos de distinto `episodioId`, con la fecha corta («Jueves 29, 16:12 · Dentista registrado»). Texto sin vocabulario interno (R-40) |
| «Ver anteriores» | Un botón al inicio de la lista que pide la página anterior con el cursor; se concatena arriba y se conserva la posición del scroll |
| Vaciado por la persona | Si el equipo adopta el diseño §5 al pie de la letra: un control «Limpiar» con advertencia que diga qué propuesta pendiente se descarta. Es opcional para esta fase |
| Lienzo modo Registro | **Fuera de alcance de esta reestructuración**; se apoya en `evento_auditoria` y en la sección Actividad, que no existe. Se anota como dependencia del diseño |
| Pruebas `web.asistente-agenda-y-confirma` | Añadir: tras confirmar, el siguiente mensaje **no** borra el anterior y aparece el separador |

**Esfuerzo:** 0,5 tarea. **Riesgo:** bajo. Las pruebas de extremo a extremo ya arrancan la API con el simulado.

### 5.7 Móvil (`apps/movil/src/pantallas/captura.tsx`, 237 líneas)

Mismos tres cambios que la web (quitar la línea 168, separadores, «ver anteriores» con `ScrollView`). La capa de captura es más corta en pantalla, así que conviene mostrar **solo el episodio en curso y el anterior** por defecto, y el resto bajo «ver anteriores». **Esfuerzo:** 0,4 tarea. **Riesgo:** bajo; falta la prueba en teléfono real que ya estaba pendiente de T-035.

### 5.8 Trabajador y cola en espera (`en-espera.ts`, `trabajador-en-espera.ts`)

`atenderEnEspera` ya recibe la conversación de origen y abre otra si está cerrada. Con episodios, el comportamiento es el mismo. Los turnos que produce se anotan en la transcripción igual que los demás. **Esfuerzo:** 0,1 tarea (solo anotar). Aprovechar el mismo trabajador para dos tareas nuevas: cerrar episodios inactivos y borrar puntos de control viejos.

### 5.9 Evaluación (`cli/evaluar-asistente.ts`)

Añadir dos casos con `historia` y nota: «mejor a las 5» tras un resultado confirmado debe llamar a `agenda_consultar` y, con la respuesta simulada, a `agenda_modificar_evento` con el id; «¿qué hicimos?» debe responder con texto que mencione las acciones de la nota y **ninguna herramienta**. Esto exige que la evaluación mire la **segunda** llamada (trayectoria), que `INFORME-LANGGRAPH.md` §5 ya pedía. **Esfuerzo:** 0,4 tarea. **Riesgo:** gasta cuota de Groq; se ejecuta a mano, como hoy.

### 5.10 Documentos y método

| Documento | Cambio | Esfuerzo |
|---|---|---|
| `SPEC.md` §9 | Inconsistencia diseño ↔ REQ-AGT-01 ↔ código (§4 de este informe) | Pequeño |
| `specs/07-agente/spec.md` | H-AGT-16; REQ-AGT-01 v2; REQ-AGT-03; cierre de §6 | Medio |
| `specs/glosario.md` | Transcripción, Episodio, Sesión, Nota de continuidad; «Conversación» sin «desechable» | Pequeño |
| `design/ARQUITECTURA-VISUAL-WEB.md` §5, `ARQUITECTURA-VISUAL-MOVIL.md` | Marcar la versión anterior; describir separadores y «ver anteriores». Los cuadros de Figma se regeneran con los scripts de `design/figma/` | Medio |
| `specs/07-agente/plan.md` | §4.1 (estado sin turnos), §4.3 (episodio), §6 (nota), §9 (rutas), §10 (tabla nueva), §13 (hallazgos) | Medio |
| `specs/07-agente/tasks.md` | T-038 a T-042 | Pequeño |
| `SPEC.md` §5, §8, §11 | Cobertura, decisiones, registro de cambios | Pequeño |

**Esfuerzo total de documentos:** una sesión. **Debe ir primero**, por `AGENTS.md` §«Orden obligatorio».

### 5.11 Resumen de esfuerzo

| Bloque | Tareas | Líneas aprox. |
|---|---|---|
| Documentos (spec, glosario, diseño, plan) | 1 sesión | — |
| API: estado, servicio, transcripción, nota, migración | 1,5 tareas | ~250 |
| Contratos + web + móvil | 1 tarea | ~120 |
| Retención, cierre por inactividad, recursionLimit | 0,5 tarea | ~50 |
| Evaluación por trayectorias con casos nuevos | 0,5 tarea | ~60 |
| **Total** | **≈ 4,5 tareas + 1 sesión de documentos** | **≈ 480** |

---

## 6. Orden de implementación propuesto

Cada paso deja `npx pnpm@12.10.1 verificar` en verde y `trazabilidad.py --check` limpio. El orden está pensado para que **la pantalla deje de vaciarse lo antes posible** sin dejar el modelo a ciegas.

| Paso | Tarea | Contenido | Hecho cuando | Pruebas |
|---|---|---|---|---|
| 0 | Documentos | §5.10 completo. Decisiones de §9 tomadas | `SPEC.md` §9 y §11 actualizados; REQ-AGT-01 v2 y REQ-AGT-03 en `spec.md`; glosario y diseño al día | `trazabilidad.py --check` |
| 1 | **T-038** Transcripción propia | Migración `turno_asistente`; `TranscripcionService`; `turnos` fuera del estado; `GET /asistente/conversacion` paginado; contratos | Un episodio cerrado sigue visible al pedir la conversación; el punto de control no contiene turnos; aislamiento cubre la tabla nueva | `agente.transcripcion-persiste` (nueva); `agente.interrumpe-hasta-decidir`, `agente.conversacion-con-contexto` (ajustadas); `plataforma.aislamiento-entre-organizaciones` (ampliada) |
| 2 | **T-039** Clientes que no se vacían | Web y móvil: quitar el vaciado, separadores, «ver anteriores»; `episodioCerrado` en vez de `cerrada` | Tras confirmar, el siguiente mensaje se añade debajo con separador; recargar muestra lo mismo; «ver anteriores» trae la página previa | `web.asistente-agenda-y-confirma` (ampliada), `web.asistente-historial` (nueva), `movil.captura-propone-y-confirma` (ampliada) |
| 3 | **T-040** Nota de continuidad | `NotaDeContinuidad`; `interpretar` la recibe; casos de evaluación por trayectoria | Con el simulado, un guion que recibe la nota propone modificar con el id tras «mejor a las 5»; contra Groq, los dos casos nuevos pasan | `agente.nota-de-continuidad` (nueva, con guion); `agente.evaluacion` (a mano) |
| 4 | **T-041** Ciclo de vida | Cierre de episodio por inactividad; borrado de puntos de control de episodios cerrados tras *x* días; `recursionLimit` explícito | Un episodio sin actividad 30 min se cierra al siguiente mensaje; una fila de punto de control de hace *x*+1 días desaparece en la pasada del trabajador; la transcripción sigue intacta | `agente.episodio-caduca`, `agente.retencion-puntos-de-control` (nuevas) |
| 5 | **T-042** (opcional) Herramienta de acciones recientes | `conversacion.acciones_recientes(desde, hasta)` para «¿qué agendé esta semana?» | El modelo la elige ante la pregunta y responde con lo devuelto, marcado como datos | `agente.acciones-recientes` (nueva); un caso de evaluación |

**Por qué este orden y no otro:** T-038 es el cambio estructural y el único con migración; conviene hacerlo solo y con todas las pruebas del agente mirando. T-039 es visible para la persona y depende solo de T-038. T-040 es lo que da «inteligencia» al cambio y es donde está el gasto de Groq, así que va cuando la tubería ya está probada con el simulado. T-041 cierra las deudas de retención (H-AGT-14) y de plazo (H-AG-08 parcial). T-042 solo si el equipo lo quiere para la sustentación.

---

## 7. Riesgos y cómo se cubren

| Riesgo | Probabilidad | Impacto | Cobertura |
|---|---|---|---|
| Quitar `turnos` del estado rompe la reanudación tras `interrupt()` | Baja | Alto | `agente.interrumpe-hasta-decidir` ya comprueba la reanudación tras reconstruir el grafo; se ejecuta antes y después del cambio. `turnosNuevos` con reductor de reemplazo no afecta a `mensajes` |
| Turnos anotados dos veces si una petición se reintenta | Media | Medio | Id del turno generado en el grafo (`randomUUID`) y `@@unique([id])`; `anotar` con `skipDuplicates` |
| La nota de continuidad empuja al modelo a actuar sin que se le pida («veo que registraste X, ¿lo muevo?») | Media | Medio | La nota va envuelta como datos (H-AGT-15) y con una frase de uso («solo si la persona se refiere a ello»); caso de evaluación que lo comprueba; y en todo caso ninguna acción se ejecuta sin tarjeta (P-03) |
| Más tokens por llamada con Groq gratuito (H-AGT-13) | Alta | Bajo | La nota son 3–5 líneas (~150 tokens). Se mide en `llamada_modelo` antes y después; si pesa, *n* baja a 3 |
| La transcripción expone lo personal a la empresa (P-10) | Baja | Alto | `turno_asistente` filtra por `perfil_id` igual que `operacion`; ninguna ruta de equipo la lee. Se anota en el plan como invariante |
| Dos clientes divergen en cómo pintan episodios | Media | Bajo | El contrato lleva `episodioId` por turno; los separadores se deducen igual en los dos. Probar en Expo web y en teléfono |
| Los cuadros de Figma quedan desfasados respecto a la web | Alta | Bajo | Los scripts de `design/figma/` se regeneran; el diseño anterior se marca como anterior, no se borra (`AGENTS.md`) |
| Cambiar REQ-AGT-01 reabre la discusión del equipo que la nota de §6 dejó en suspenso | Media | Medio | Este informe y el anterior dan la decisión por escrito con fuentes; §9 lista exactamente lo que falta decidir |

---

## 8. Lo que no se toca

Para que quede claro el alcance y nadie lo amplíe por inercia:

- `packages/contratos/src/agente.ts` (herramientas) y `herramientas/*`: ninguna herramienta cambia de firma, salvo la opcional de T-042.
- `modelo/*`: el puerto, el simulado, el adaptador de Groq y el llamador.
- `ejecutor-herramientas.ts`, `llamadas-auditadas.ts`: auditoría e idempotencia.
- `operaciones.service.ts` y toda `02-agenda`: la nota **lee** Operaciones con la API pública existente; no se añade ninguna escritura.
- `06-acceso`, `integraciones/*`, el trabajador del calendario.
- El diseño del lienzo y la sección Actividad: el modo Registro queda registrado como dependencia, no se construye aquí.
- `REPLANTEO.md`, Entregable 1.

---

## 9. Lo que queda para el equipo

Estas decisiones condicionan el paso 0 y están detalladas en `INFORME-MEMORIA-AGENTE.md` §10. Aquí, las que afectan directamente al código:

1. **Dónde se ve lo pasado:** en la columna de conversación con separadores (lo que propone este informe para esta fase), en el lienzo en modo Registro (lo que dice el diseño §4), o ambos. Determina T-039.
2. **Si la persona puede vaciar la conversación a mano con advertencia** (diseño §5). Determina si T-039 lleva el control «Limpiar».
3. **Minutos de inactividad para cerrar un episodio** y **días de retención** del punto de control. Determinan T-041.
4. **Cuántas acciones lleva la nota** (propuesta: 5 o los últimos 7 días). Determina T-040.
5. **Renombrar `conversacion_agente` a `episodio_asistente`** en la base, o solo en el plan y el glosario. Afecta a la migración de T-038 y a cuatro relaciones del esquema; la recomendación es **no renombrar la tabla** y dejar el nombre nuevo en los documentos y en el código.
6. **Si T-042 entra en la fase 2** o se deja para cuando existan tareas y equipos.

Cuando estén tomadas, el paso 0 se puede redactar en una sesión y, a partir de ahí, cada tarea es independiente y revisable, como pide el método.
