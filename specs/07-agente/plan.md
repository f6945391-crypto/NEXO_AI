# Plan técnico — Agente (fase 2)

**Especificación:** `specs/07-agente/spec.md` (REQ-AGT-01, 02) y los requisitos de agenda y captura que implementa (§11)
**Fase:** 2
**Decisiones que aplica:** AD-04, AD-05, AD-06, AD-07, AD-08, AD-09 · P-01, P-02, P-03, P-04, P-05, P-06, P-07, P-10, P-11 · DP-01
**Decisiones del equipo del 24 de octubre de 2026:** sin voz (PT-2), proveedor simulado por ahora, solo agenda y la tarea en espera (`spec.md` §2)
**Depende de:** `specs/02-agenda/plan.md` (Operaciones, réplica, `agenda.*`) y `specs/06-acceso/plan.md` (sesión, `@RequiereGoogle`, roles)
**Estado:** **aprobado** por el equipo el 25 de octubre de 2026, con sus hallazgos tal como están

Este plan dice **dónde y cómo** se cumple cada requisito. Lo que la especificación no decide está en §13 como hallazgo.

---

## 1. Qué se construye

| Pieza | Para qué |
|---|---|
| Puerto `ProveedorModelo` y tres implementaciones: **simulada**, **no configurada** y **compatible con la API de OpenAI** (Groq para probar, §3.1) | P-06. Cada proveedor es un archivo más, sin tocar nada de lo demás |
| Grafo del asistente con LangGraph.js | Interpreta, llama herramientas y **se interrumpe** al proponer una Operación hasta que la persona decide (P-03) |
| Herramientas de agenda | Consultan la réplica o **proponen** Operaciones `agenda.*`. Ninguna escribe (P-01, AD-09) |
| Auditoría de llamadas al modelo y de herramientas, con costo | P-07 |
| Cola en espera y su trabajador | P-11: con el asistente caído, lo pedido queda en espera y se interpreta al volver |
| Conversación web y capa de captura móvil conectadas | La persona pide, ve la tarjeta y confirma |

**No entra:** voz y cámara (PT-2), paleta de comandos (REQ-CAP-05), captura sin conexión del móvil (REQ-CAP-22), tareas personales (CUN-03, sin especificar), memoria semántica con pgvector (no hay todavía comunicaciones ni resúmenes que buscar), respuesta en flujo (H-AGT-07).

## 2. Módulo `AgenteModule`

`apps/api/src/agente/`. Es el **único** lugar donde puede vivir el SDK de un proveedor de modelo (P-06, `AGENTS.md`).

| Componente | Responsabilidad |
|---|---|
| `modelo/proveedor-modelo.ts` | Puerto `ProveedorModelo` y sus tipos (§3) |
| `modelo/modelo-simulado.ts` | Responde según un guion. Para pruebas y para demostrar sin clave (H-AGT-02) |
| `modelo/modelo-no-configurado.ts` | Siempre «no disponible»: sin proveedor, todo queda en espera (H-AGT-01) |
| `modelo/llamador-modelo.ts` | Tiempo límite, reintentos, cálculo del costo y registro de cada llamada (§8) |
| `grafo/grafo-asistente.ts` | El grafo de §4 |
| `grafo/punto-control-prisma.ts` | Persistencia del grafo sobre Prisma, para que la interrupción sobreviva a un reinicio (§4.3) |
| `herramientas/herramientas-agenda.ts` | Las herramientas de §5 |
| `herramientas/ejecutor-herramientas.ts` | Valida argumentos, aplica la idempotencia y audita (§8) |
| `contexto-asistente.ts` | Arma lo que ve el modelo (§6) |
| `cola-en-espera.ts` y `trabajador-en-espera.ts` | Modo degradado (§7) |
| `asistente.controller.ts` | Rutas de §9 |

**Dependencia entre módulos:** el agente usa la interfaz pública de `OperacionesService` y de `ConsultaAgendaService`. No lee tablas de agenda ni de Operaciones directamente (`PROPUESTA-TECNICA.md` §3.3).

**Versiones** (la última con al menos dos semanas el 24 de octubre de 2026; se pasa la auditoría antes de fijarlas): `@langchain/langgraph` 1.4.21 y `@langchain/core` 1.2.17, que LangGraph pide como dependencia par. **No se instala ningún modelo de LangChain**: el grafo llama a nuestro puerto, no a `ChatModel`.

## 3. El puerto del proveedor (P-06)

```ts
interface ProveedorModelo {
  readonly nombre: string;                       // 'simulado', 'no-configurado', después el real
  responder(peticion: PeticionModelo, senal: AbortSignal): Promise<RespuestaModelo>;
}

type PeticionModelo = {
  sistema: string;                               // instrucciones (§6.1)
  mensajes: MensajeModelo[];                     // persona, asistente y resultados de herramienta
  herramientas: DefinicionHerramienta[];         // nombre, descripción y esquema JSON, generado con zod (AD-08)
  maxTokens: number;
};

type RespuestaModelo = {
  texto: string | null;
  llamadas: { id: string; nombre: string; argumentos: unknown }[];
  uso: { tokensEntrada: number; tokensSalida: number };
  modelo: string;
};
```

- Dos errores con significado propio: **`ModeloNoDisponible`** (sin configurar, tiempo agotado, el proveedor caído o saturado) lleva al modo degradado (§7); cualquier otro es un **fallo de procesamiento**, que se muestra como tal (REQ-CAP-23).
- `LlamadorModelo` envuelve al puerto: 30 segundos por llamada y dos reintentos con espera de 1 y 3 segundos, solo ante `ModeloNoDisponible` (H-AGT-03).
- Selección por variable de entorno: `MODELO_PROVEEDOR=no-configurado` (por defecto) o `simulado`. El real se añadirá con su clave en `.env`, que pone el equipo.
- **Un solo modelo** para todo en esta versión (H-AGT-06).
- Los nombres de herramienta van con guion bajo (`agenda_consultar`), porque varios proveedores no admiten el punto. El nombre interno sigue siendo `agenda.consultar`.

### 3.1 Proveedor compatible con la API de OpenAI (Groq para probar)

**Decidido por el equipo el 29 de octubre de 2026:** para probar sin pagar, Groq en su nivel gratuito. Como Groq, Cerebras, OpenRouter y Ollama hablan el mismo formato de chat con herramientas, un solo adaptador, `modelo/modelo-compatible-openai.ts`, sirve para todos; cambiar de uno a otro es cambiar `.env`.

| Variable | Contenido |
|---|---|
| `MODELO_PROVEEDOR` | `compatible-openai` |
| `MODELO_URL` | Raíz de la API, por ejemplo `https://api.groq.com/openai/v1` |
| `MODELO_NOMBRE` | `openai/gpt-oss-120b` para empezar: usa herramientas, de una en una |
| `MODELO_CLAVE` | La pone el equipo; nunca va en el repositorio ni en el chat |
| `MODELO_PRECIOS` | Opcional: dólares por millón de tokens de entrada y de salida, `0,0` en el nivel gratuito. Sin ella, el costo queda desconocido (P-07) |

- **Sin SDK:** `fetch` a `POST {MODELO_URL}/chat/completions`. Los argumentos de cada llamada llegan como texto JSON y se interpretan con `JSON.parse`; si no se pueden interpretar, es un fallo del modelo.
- **Errores:** sin respuesta, 429 (límite de uso del nivel gratuito, H-AGT-13), 5xx y clave rechazada (401, 403) dan `ModeloNoDisponible`; cualquier otro, `FalloDelModelo`. La clave nunca se escribe en el registro.
- Cumple el contrato de T-029. La prueba automática usa un servidor local que imita la API; nunca llama a Groq.

### 3.2 El simulado

Un **guion**: lista de reglas «si el último mensaje de la persona encaja con este patrón, responde esto», donde la respuesta es un texto o llamadas a herramientas con argumentos. Los argumentos pueden usar fechas relativas a la referencia (`{hoy}`, `{mañana}`, `{viernes}`) que el simulado resuelve. Las pruebas escriben su propio guion; la demostración usa `apps/api/src/agente/modelo/guion-demostracion.ts`, con los ejemplos de la web y algunas variantes (*ajuste de T-029: en TypeScript y no en JSON, para que se compile y se compruebe*). **Lo que no está en el guion recibe «No sé hacer eso todavía»**, nunca una invención (H-AGT-02).

## 4. El grafo (LangGraph.js)

### 4.1 Estado

| Campo | Contenido |
|---|---|
| `mensajes` | Turnos de la conversación, en el formato de `MensajeModelo` (REQ-AGT-01) |
| `referencia` | Instante desde el que se resuelven «hoy» y «mañana»: el del mensaje, o `capturadaEn` si viene de la cola (REQ-CAP-24) |
| `operacionPendiente` | Id de la Operación propuesta que espera decisión, o nulo |
| `turnosNuevos` | Lo que se devuelve a la interfaz en esta vuelta (§9) |
| `vueltas` | Llamadas al modelo en este mensaje; tope 4 (H-AGT-10) |

La identidad (perfil, organización, rol) **no está en el estado**: llega en la configuración de cada ejecución desde el contexto de la petición, y las herramientas la usan para todo (P-04). El modelo no puede cambiarla.

### 4.2 Nodos

```mermaid
stateDiagram-v2
    [*] --> interpretar
    interpretar --> herramientas: pide herramientas
    interpretar --> [*]: responde con texto
    herramientas --> interpretar: solo consultó
    herramientas --> preguntar: faltan datos
    herramientas --> esperar_decision: propuso una Operación
    preguntar --> [*]
    esperar_decision --> comunicar: confirmada o descartada
    esperar_decision --> herramientas: eligió una alternativa
    comunicar --> [*]
```

| Nodo | Qué hace | ¿Usa el modelo? |
|---|---|---|
| `interpretar` | Llama al modelo con el contexto de §6 y las herramientas | Sí |
| `herramientas` | Ejecuta las llamadas con `EjecutorHerramientas` (§5, §8) | No |
| `preguntar` | Ante `DATOS_FALTANTES`, pregunta **solo el primer campo** que falta, con una frase fija por campo: «¿Qué día?», «¿A qué hora empieza?», «¿Cómo lo llamo?» (REQ-CUN01-07, REQ-CAP-04, R-20) | No |
| `esperar_decision` | `interrupt()` con el id de la Operación. El grafo queda parado y persistido hasta que la persona decide (P-03) | No |
| `comunicar` | Arma el resultado con lo que devolvió la Operación, no con lo propuesto (REQ-CUN01-04). Cierra la conversación (H-AGT-05) | No |

Si la persona escribe otra cosa mientras hay una propuesta pendiente («mejor a las 5»), el grafo descarta esa Operación y vuelve a `interpretar` con el mensaje nuevo, dentro de la misma conversación (REQ-AGT-01).

**Lo que el modelo no hace** (`PROPUESTA-TECNICA.md` §7.3): no calcula solapes ni alternativas, no pone el fin que falta, no convierte zonas horarias, no decide si una acción se puede confirmar, no redacta el resultado de una acción. Todo eso es código (P-02).

### 4.3 Persistencia y confirmación

- **Punto de control propio sobre Prisma** (`BaseCheckpointSaver`), en lugar del paquete de LangGraph para Postgres: aquel crea sus tablas fuera de Prisma Migrate y fuera del filtro por organización. Tabla `punto_control_agente` (§10). *Ajuste de T-032: es una subclase del punto de control en memoria de LangGraph que carga y guarda una fila por conversación.*
- La confirmación sigue siendo **una sola**, la de Operaciones (AD-09): la ruta de decisión (§9) llama a `OperacionesService.confirmar` o `descartar`, y con su desenlace reanuda el grafo. El grafo no ejecuta nada por su cuenta.
- Si la Operación se confirma por otra vía (un control directo, otro dispositivo), al siguiente mensaje el grafo lee su estado y la da por cerrada.

## 5. Herramientas

Contratos en `packages/contratos/src/agente.ts` (AD-08), con zod; de ahí sale el esquema JSON que ve el modelo.

| Herramienta | Argumentos | Qué hace | Confirmación |
|---|---|---|---|
| `agenda.consultar` | `desde`, `hasta`: fechas `AAAA-MM-DD`; `horaDesde` y `horaHasta` opcionales (`HH:mm`), para «por la tarde» | Lee la réplica con `ConsultaAgendaService` en ese rango y en la zona del perfil. Al modelo le devuelve id, título, horas y estado; **a la interfaz, la lista armada por el código** (REQ-CUN01-13) | No |
| `agenda.registrar_evento` | `titulo`, `fecha`, `horaInicio` (`HH:mm`), `horaFin` opcional | Convierte hora local a instante con la zona del perfil (`instanteLocal`, P-05) y propone `agenda.registrar`. **Sin `horaFin`, no se manda fin**: lo pone el ejecutor con una hora (H-AG-01) | Sí |
| `agenda.modificar_evento` | `eventoId`, y solo lo que cambia: `titulo`, `fecha`, `horaInicio`, `horaFin` | Propone `agenda.modificar`. El id tiene que venir de una consulta anterior; si no existe o no es suyo, el ejecutor lo rechaza (H-AG-05) | Sí |
| `agenda.cancelar_evento` | `eventoId` | Propone `agenda.cancelar` | Sí |
| `captura.guardar_tarea` | `texto`, `clase`: tarea, pendiente sin fecha, esperando de alguien | Deja lo pedido **en espera** con el motivo «función por llegar» (REQ-AGT-02, H-AGT-09). No crea ninguna tarea | No: no tiene efecto |

Reglas comunes:

- **Ninguna escribe en la agenda ni en Google.** Las tres de agenda solo llaman a `OperacionesService.proponer` con `origen: 'agente'` y la solicitud original (AD-09).
- Los argumentos se validan con zod **antes** de hacer nada; si no valen, la herramienta devuelve el error al modelo, que puede corregirlo dentro del tope de vueltas.
- **Sin permiso de calendario**, las de agenda no llaman a nada: devuelven `PERMISO_GOOGLE_FALTANTE`, el asistente dice qué permiso falta y cómo concederlo, y lo pedido queda en espera con ese motivo (REQ-CUN01-08, REQ-ACC-08).
- El colaborador usa las mismas herramientas sobre lo suyo (REQ-ACC-13). Ninguna de esta fase es `soloResponsable`.
- Pedidos que ninguna herramienta cubre (correo, delegar, planificar el día): las instrucciones piden decirlo sin intentarlo (REQ-AGT-02).

## 6. Contexto y memoria (`PROPUESTA-TECNICA.md` §7.4)

| Memoria | En esta versión |
|---|---|
| Conversación | Los turnos de la conversación abierta, desde el punto de control. Como mucho los 20 últimos (H-AGT-05) |
| Perfil | Zona horaria y fecha y hora de referencia en esa zona, con el día de la semana: «Hoy es sábado 24 de octubre de 2026, 10:32, hora de Lima» |
| Operativa | **No se manda la agenda.** El modelo la pide con `agenda.consultar`, solo el rango que necesita, y solo ve título y horas (H-AGT-12) |
| Semántica | No entra: no hay todavía nada que buscar por significado |

### 6.1 Instrucciones

Un texto fijo en `instrucciones.ts`, versionado con el código. Dice qué puede hacer (solo agenda), que nunca invente fechas, horas ni compromisos, que no ponga hora de fin si no se dijo, que pregunte en vez de suponer, y que diga lo que todavía no sabe hacer. **No contiene ninguna regla de negocio que el código no compruebe también** (P-02).

## 7. Modo degradado (P-11, REQ-CUN01-11, REQ-CAP-24)

La cola es la tabla `operacion` en estado `en_espera` (AD-09, `specs/02-agenda/plan.md` §3.2), con un campo nuevo, `motivo_espera`:

| Motivo | Cuándo | Se procesa cuando |
|---|---|---|
| `asistente_no_disponible` | `ModeloNoDisponible` tras los reintentos | El proveedor vuelve a responder |
| `permiso_faltante` | Se pidió algo de agenda sin el calendario conectado | Se conecta el calendario |
| `funcion_por_llegar` | Es una tarea (REQ-AGT-02) | Existan las tareas personales; hasta entonces no se toca |

- Lo encolado tiene `tipo: 'asistente.solicitud'`, la frase en `solicitudOriginal` y el momento del mensaje en `capturadaEn`. No tiene ejecutor: no se puede confirmar.
- **Trabajador** `procesar-en-espera` (BullMQ, en el proceso trabajador): cada minuto toma lo encolado por orden de captura, si su motivo ya no aplica, y lo pasa por el grafo con `referencia = capturadaEn`. Si resulta en una acción, **la misma fila** pasa a `propuesta` con su tipo, su carga y su tarjeta reales, y espera la confirmación de siempre. Si no es una acción (una consulta, un dato que falta), la respuesta queda en la conversación y la fila se cierra como `descartada`, sin efecto (H-AGT-04).
- Con el asistente caído, la agenda se sigue consultando (no depende del modelo) y los controles directos funcionan (DP-01). Ya está hecho en la fase 1.
- **Retirar algo de la cola** sigue abierto en `SPEC.md` §8. La API lo permite desde T-012, pero ninguna pantalla lo ofrece hasta que se decida.

## 8. Auditoría y costo (P-07)

| Tabla | Una fila por | Campos |
|---|---|---|
| `llamada_modelo` | Llamada al proveedor, también las fallidas | conversación, proveedor, modelo, tokens de entrada y de salida, `costo_usd`, duración, desenlace (`ok`, `no_disponible`, `error`) |
| `invocacion_herramienta` | Herramienta ejecutada | conversación, llamada al modelo que la pidió, id de la llamada del proveedor, herramienta, argumentos, resultado o error, Operación creada, duración |

- **Costo:** precio por millón de tokens de entrada y de salida, por modelo, en `precios-modelo.ts`. El simulado cuesta cero. El costo de una herramienta es el de la llamada que la pidió.
- **Idempotencia:** `(conversacion_id, id_llamada)` es único. Si el grafo repite un paso al reanudarse, la herramienta devuelve el resultado guardado y no propone otra Operación.
- Las dos tablas entran en `MODELOS_CON_ORGANIZACION`.
- **Presupuesto por usuario:** no hay límite en esta versión; con estas tablas se puede fijar después (H-AGT-08).

## 9. Rutas

Contratos en `packages/contratos/src/asistente.ts`. Todas `@SobreLoPropio()`.

| Ruta | Qué hace | Requisitos |
|---|---|---|
| `GET /asistente/conversacion` | La conversación abierta, con sus turnos, y lo que está en espera o propuesto | REQ-AGT-01, REQ-CAP-23 |
| `POST /asistente/mensajes` `{ texto }` | Pasa el mensaje por el grafo y devuelve los turnos nuevos | CUN01-01, 06, 07, 13; CAP-01 a 04, 06; AGT-02 |
| `POST /asistente/decisiones` `{ operacionId, decision, alternativa? }` | `confirmar`, `descartar` o elegir una `alternativa`: llama a Operaciones y reanuda el grafo | CUN01-03, 04, 05 |

Un turno del asistente tiene un `tipo`, para que la interfaz lo muestre distinto (REQ-CAP-23):

| Tipo | Se ve como |
|---|---|
| `texto` | Respuesta normal |
| `agenda` | Lista de compromisos armada por el código (REQ-CUN01-13) |
| `propuesta` | Tarjeta de confirmación, con su conflicto y alternativas si las hay |
| `pregunta` | El dato que falta |
| `resultado` | Lo que quedó hecho, con los datos devueltos por Google |
| `en_espera` | Aviso tranquilo, con su motivo: «quedó guardado», nunca como error |
| `fallo` | No se pudo procesar; no se hizo nada |

La respuesta llega entera, sin flujo (H-AGT-07); la interfaz muestra que el asistente está pensando.

## 10. Datos (migración nueva)

| Tabla o campo | Contenido |
|---|---|
| `conversacion_agente` | `id`, perfil, organización, `estado` (`abierta`, `cerrada`), `abierta_en`, `cerrada_en` |
| `punto_control_agente` | Una fila por conversación con sus puntos y escrituras serializados (*ajuste de T-032*). Se conservan los 10 últimos puntos |
| `llamada_modelo`, `invocacion_herramienta` | §8 |
| `operacion.motivo_espera` | Enumeración de §7, nula salvo en `en_espera` |
| `operacion.conversacion_id` | Conversación de la que salió, nula para los controles directos |

Las tablas nuevas con `organizacion_id` entran en `MODELOS_CON_ORGANIZACION`. Ninguna escritura anidada.

## 11. Requisito por requisito

| REQ | Dónde se cumple |
|---|---|
| CUN01-01 | `agenda.registrar_evento`: el modelo da fecha y horas locales; sin `horaFin` el fin lo pone el ejecutor (H-AG-01), y la tarjeta lo dice |
| CUN01-03, CAP-03 | Las herramientas solo proponen; el grafo se interrumpe; nada se ejecuta sin `confirmar` |
| CUN01-04 | `comunicar` usa el resultado de la Operación |
| CUN01-05 | La tarjeta trae el conflicto (T-018); elegir una alternativa la propone el código sin pasar por el modelo |
| CUN01-06 | `agenda.modificar_evento` y `agenda.cancelar_evento`, con el id de una consulta anterior |
| CUN01-07, CAP-04 | Nodo `preguntar`: el primer campo que falta, con una frase fija |
| CUN01-08 | `PERMISO_GOOGLE_FALTANTE` en la herramienta; en espera con su motivo |
| CUN01-11, CAP-24 | §7 |
| CUN01-13 | `agenda.consultar` devuelve la lista armada por el código |
| CAP-01 | Solo la puerta de texto; la misma tarjeta en web y móvil |
| CAP-02 | El modelo elige la herramienta: compromiso o tarea. Cambiar la clasificación es decirlo en la conversación |
| CAP-06 | Lenguaje natural sin sintaxis de comando |
| CAP-23 | Tipos de turno de §9 y motivos de §7 |
| AGT-01 | Punto de control por conversación; cierre en `comunicar` |
| AGT-02 | `captura.guardar_tarea` y las instrucciones |

## 12. Verificación

| REQ / principio | Prueba | Tipo |
|---|---|---|
| P-06 | `agente.contrato-del-proveedor` | Integración, contra el simulado, el no configurado y el compatible con OpenAI ante un servidor local que imita la API |
| P-07 | `agente.herramienta-auditada-con-costo`, `agente.herramienta-idempotente` | Integración |
| CUN01-01 | `agente.agenda.extrae-sin-inventar-fin` | Integración, con guion |
| CUN01-03 | `agente.herramientas-solo-proponen` | Integración, con el calendario simulado que cuenta escrituras |
| CUN01-07, CAP-04 | `agente.pregunta-de-uno-en-uno` | Integración |
| CUN01-13 | `agente.agenda.consulta-tal-cual` | Integración |
| CUN01-03, 04 | `agente.interrumpe-hasta-decidir` | Integración: la interrupción sobrevive a reconstruir el grafo |
| AGT-01 | `agente.conversacion-con-contexto` | Integración |
| CUN01-11, CAP-24 | `agente.sin-modelo-queda-en-espera`, `agente.en-espera-desde-la-captura` | Integración, con el trabajador |
| AGT-02 | `agente.tarea-queda-en-espera` | Integración |
| CUN01-08 | `agente.sin-calendario-no-agenda` | Integración |
| CAP-23 | `web.asistente-agenda-y-confirma`, `web.asistente-en-espera`, `movil.captura-propone-y-confirma`, `movil.captura-en-espera` | Extremo a extremo |

**Evaluación del modelo** (`PROPUESTA-TECNICA.md` §7.5): un conjunto fijo de frases con el resultado esperado. Con el simulado solo prueba la tubería; tiene sentido con un proveedor real, como Groq (T-036).

## 13. Hallazgos — vuelven a la especificación

Registrados en `spec.md` §5 y en `SPEC.md` §8. **Aceptados por el equipo el 25 de octubre de 2026** tal como están.

| # | Hallazgo | Lo que asume este plan |
|---|---|---|
| H-AGT-01 | El proveedor real no está elegido | Sin proveedor, el asistente cuenta como **no disponible**: todo queda en espera, como hoy, pero guardado en el servidor |
| H-AGT-02 | Cómo se demuestra el asistente sin clave | `MODELO_PROVEEDOR=simulado` con un guion de frases conocidas. Lo que no está en el guion recibe «No sé hacer eso todavía». **Es un simulado: no entiende lenguaje natural** |
| H-AGT-03 | Cuándo el asistente «no responde» | 30 s por llamada y dos reintentos (1 s y 3 s). Una clave inválida también cuenta como no disponible, y queda en el registro del servidor |
| H-AGT-04 | Lo que estaba en espera y al interpretarse no es una acción | Se responde en la conversación y la fila se cierra como `descartada`, sin efecto. Alternativa: un estado nuevo, `atendida` |
| H-AGT-05 | Cuándo se cierra una conversación | Al ejecutarse o descartarse su Operación (glosario, «Conversación»). Sin Operación sigue abierta. Contexto de como mucho 20 turnos |
| H-AGT-06 | `PROPUESTA-TECNICA.md` §4.1 pide un modelo pequeño para clasificar y uno grande para razonar | Un solo modelo. Se revisa al elegir proveedor |
| H-AGT-07 | La propuesta técnica pide respuesta en flujo por WebSocket | Respuesta entera por HTTP y aviso de que piensa. Se revisa con el proveedor real |
| H-AGT-08 | Presupuesto de costo por usuario (§7.5) | Sin límite. Se registra el costo de cada llamada. Va con D-7 |
| H-AGT-09 | REQ-CAP-23 distingue tres estados; la tarea en espera es un cuarto caso | Es «en espera» con motivo propio y texto propio: ni error ni fuera del plan |
| H-AGT-10 | Tope de llamadas al modelo por mensaje | Cuatro. Superado, el turno es un fallo y no se hizo nada |
| H-AGT-11 | Quién resuelve «el viernes» | El modelo, con la fecha de referencia y el día de la semana. El riesgo se cubre con la tarjeta, que muestra fecha larga con día de la semana (P-03), y con casos en la evaluación |
| H-AGT-12 | Qué parte de la agenda ve el proveedor | Solo título, horas y estado del rango pedido. Nunca invitados, descripción ni lugar |
| H-AGT-13 | El proveedor de prueba (Groq, nivel gratuito) tiene un límite bajo de tokens por minuto, y lo que recibe puede quedar en sus servidores (detectado el 29 de octubre de 2026) | El 429 cuenta como «no disponible» y lo pedido queda en espera (P-11). Las instrucciones y las herramientas se mantienen cortas. Se prueba con un calendario sin datos personales |
