# Tareas — Agente (fase 2)

**Plan:** `specs/07-agente/plan.md` (aprobado el 25 de octubre de 2026)
**Numeración:** sigue a `specs/06-acceso/tasks.md`, que termina en T-028.
**Regla:** una tarea cabe en una sesión de trabajo. Termina cuando se cumple su «Hecho cuando», su prueba pasa, `npx pnpm@12.10.1 verificar` está en verde y `python tools/trazabilidad.py --check` sigue limpio. Un commit local por tarea.

Estados: `pendiente` · `en curso` · `hecha` · `bloqueada`.

**Orden:** T-029 → T-030 → T-031 → T-032 → T-036 → T-033 → T-034 → T-035. *Cambiado el 29 de octubre de 2026: el equipo eligió Groq para probar, y T-036 se adelanta para poder conversar con el agente apenas esté T-032.*

---

## 1. Base del agente

### T-029 · Puerto del proveedor de modelo, simulado y no configurado

- **Habilita:** P-06, AD-06 · plan §3
- **Depende de:** T-001
- **Contenido:** `AgenteModule`; puerto `ProveedorModelo`; `ModeloSimulado` con guion (reglas por patrón, fechas relativas a la referencia) y `ModeloNoConfigurado`; `LlamadorModelo` con 30 s, dos reintentos y `ModeloNoDisponible`; selección con `MODELO_PROVEEDOR`; `precios-modelo.ts`; guion de demostración; LangGraph.js 1.4.21 y `@langchain/core` 1.2.17 instalados tras pasar la auditoría
- **Hecho cuando:** el simulado y el no configurado pasan el mismo contrato; un proveedor que tarda más del límite o falla dos veces da `ModeloNoDisponible`; ningún archivo fuera de `src/agente/modelo/` importa un SDK de proveedor
- **Prueba:** `agente.contrato-del-proveedor`
- **Estado:** hecha · 25 de octubre de 2026. 20 pruebas; 211 en el monorepo, `verificar` completo en verde
- **Notas de implementación:**
  - `src/agente/modelo/`: el puerto (`proveedor-modelo.ts`), `ModeloSimulado`, `ModeloNoConfigurado`, `LlamadorModelo`, `precios-modelo.ts` y el contrato. `AgenteModule` lo elige con `MODELO_PROVEEDOR` (`no-configurado` por defecto; `simulado` nunca en producción), documentado en `.env.example`.
  - **El contrato es código compartido** (`contrato.ts`), como el del calendario: lo pasan el simulado y el no configurado, y lo pasará el proveedor real (T-036). Un proveedor que no responde también cumple si lo dice con `ModeloNoDisponible`.
  - `LlamadorModelo.llamar` no lanza: devuelve la respuesta o el error, y siempre el registro de la llamada (proveedor, modelo, uso, costo, duración, intentos, desenlace), que T-030 guardará. El límite se impone aunque el proveedor no atienda la señal.
  - Un modelo sin precio da costo **desconocido** (nulo), nunca cero.
  - *Ajuste del plan §3:* el guion de demostración es `guion-demostracion.ts`, no un `.json`, para que lo compile y lo compruebe TypeScript. Cubre registrar, consultar (con «por la mañana», «por la tarde», «por la noche») y recordar una tarea; mover y cancelar no, porque necesitan el id que da una consulta.
  - Una prueba recorre `src/` y falla si algún archivo fuera de `src/agente/modelo/` importa el SDK de un proveedor (P-06).
  - LangGraph.js 1.4.21 y `@langchain/core` 1.2.17, con la auditoría limpia. LangGraph trae como dependencia `@langchain/langgraph-checkpoint` 1.2.1, publicada el 21 de octubre de 2026: no la fijamos nosotros. El rastreo de LangSmith queda apagado (sin variables `LANGSMITH_*`): nada sale hacia LangChain.
  - **Prueba intermitente, ajena a esta tarea:** en la primera ejecución de `verificar`, `agenda.sincronizacion-periodica` (T-014) superó su límite de 5 s por 181 ms con todo el monorepo en marcha. Sola y en la segunda ejecución completa, pasó.

### T-030 · Auditoría de llamadas y herramientas, con costo e idempotencia

- **Habilita:** P-07 · plan §8, §10
- **Depende de:** T-029, T-012
- **Contenido:** migración con `conversacion_agente`, `llamada_modelo`, `invocacion_herramienta`, `operacion.motivo_espera` y `operacion.conversacion_id`; las tablas nuevas en `MODELOS_CON_ORGANIZACION`; `LlamadorModelo` registra cada llamada con su costo; `EjecutorHerramientas` valida, audita y devuelve el resultado guardado si la llamada se repite
- **Hecho cuando:** cada llamada al modelo, también las fallidas, deja su fila con tokens y costo; ejecutar dos veces la misma llamada de herramienta crea una sola Operación; la prueba de aislamiento cubre las tablas nuevas
- **Pruebas:** `agente.herramienta-auditada-con-costo`, `agente.herramienta-idempotente`, `plataforma.aislamiento-entre-organizaciones` (ampliada)
- **Estado:** hecha · 29 de octubre de 2026. 9 pruebas nuevas, y la de aislamiento cubre ya nueve tablas
- **Notas de implementación:**
  - Séptima migración, `20261029000000_agente`, generada con `prisma migrate diff` desde la base de desarrollo. Las tres tablas nuevas entran en `MODELOS_CON_ORGANIZACION`.
  - `LlamadasAuditadas.llamar` envuelve al `LlamadorModelo` de T-029 y guarda cada llamada, también la que no respondió, con su costo. Costo nulo es desconocido, nunca cero.
  - `EjecutorHerramientas`: registro de herramientas, sus definiciones para el modelo (`z.toJSONSchema` del contrato, nombre con guion bajo) y su ejecución. Valida los argumentos antes de nada y **reserva la llamada antes de ejecutarla**: dos ejecuciones de la misma llamada, incluso simultáneas, ejecutan una; la repetida recibe lo guardado. Un error de la API (`DATOS_FALTANTES`, `EVENTO_NO_MODIFICABLE`…) vuelve al modelo con su código; uno inesperado solo dice que no se pudo, y el detalle queda en el registro del servidor.
  - **Las pruebas nunca llaman al proveedor real**, aunque el `.env` tenga uno: `vitest.config.mts` fija `MODELO_PROVEEDOR=no-configurado` y quita la clave, y la API de las pruebas de extremo a extremo arranca con el simulado (`arrancar-api.mjs`).

## 2. Herramientas y grafo

### T-031 · Herramientas de agenda

- **Satisface:** REQ-CUN01-01, REQ-CUN01-06, REQ-CUN01-08 (agente), REQ-CUN01-13 · plan §5
- **Depende de:** T-030, T-015, T-017, T-019
- **Contenido:** contratos en `packages/contratos/src/agente.ts`; `agenda.consultar`, `agenda.registrar_evento`, `agenda.modificar_evento`, `agenda.cancelar_evento`; conversión de hora local a instante con la zona del perfil; lista de compromisos armada por el código; `PERMISO_GOOGLE_FALTANTE` sin llamar a nada
- **Hecho cuando:** sin `horaFin`, la propuesta termina una hora después y la tarjeta lo dice; ninguna herramienta escribe en el calendario simulado; la consulta devuelve exactamente los compromisos de la réplica en ese rango, con los cancelados marcados; sin calendario conectado, no se llama al proveedor de calendario
- **Pruebas:** `agente.agenda.extrae-sin-inventar-fin`, `agente.herramientas-solo-proponen`, `agente.agenda.consulta-tal-cual`, `agente.sin-calendario-no-agenda`
- **Estado:** pendiente

### T-032 · Grafo del asistente con interrupción, conversación y rutas

- **Satisface:** REQ-AGT-01, REQ-CUN01-03, REQ-CUN01-04, REQ-CUN01-05, REQ-CUN01-07, REQ-CAP-02, REQ-CAP-03, REQ-CAP-04, REQ-CAP-06 · plan §4, §6, §9
- **Depende de:** T-031
- **Contenido:** grafo de LangGraph.js con `interpretar`, `herramientas`, `preguntar`, `esperar_decision` y `comunicar`; punto de control sobre Prisma (`punto_control_agente`); instrucciones; contexto con la fecha de referencia; `GET /asistente/conversacion`, `POST /asistente/mensajes`, `POST /asistente/decisiones`; contratos en `packages/contratos/src/asistente.ts`
- **Hecho cuando:** con un guion, «Agéndame dentista el jueves a las 4» devuelve una tarjeta y nada se escribe hasta decidir; tras reconstruir el grafo, confirmar reanuda la conversación y el resultado sale de la Operación; «Agéndame algo con Vasco» pregunta solo el día; «mejor a las 5» antes de confirmar cambia la misma propuesta, y después de confirmar ya no la relaciona; elegir una alternativa no llama al modelo
- **Pruebas:** `agente.interrumpe-hasta-decidir`, `agente.conversacion-con-contexto`, `agente.pregunta-de-uno-en-uno`
- **Estado:** pendiente

### T-033 · Modo degradado: la cola en espera y su trabajador

- **Satisface:** REQ-CUN01-11, REQ-CAP-24, REQ-CAP-23 (servidor), REQ-AGT-02, REQ-ACC-08 (agente) · plan §7
- **Depende de:** T-032, T-014
- **Contenido:** encolar con `ModeloNoDisponible`, sin calendario y para las tareas (`captura.guardar_tarea`); trabajo `procesar-en-espera` en BullMQ, cada minuto, en el proceso trabajador; procesar con `referencia = capturadaEn`; la misma fila pasa a `propuesta`, o se cierra sin efecto (H-AGT-04)
- **Hecho cuando:** con el no configurado, un mensaje queda en espera con su motivo y no se crea nada; al cambiar a un simulado que responde, el trabajador lo propone y «mañana» es el día siguiente a la captura, no al proceso; una tarea queda en espera con «función por llegar» y el trabajador no la toca; lo que espera al calendario se procesa al conectarlo
- **Pruebas:** `agente.sin-modelo-queda-en-espera`, `agente.en-espera-desde-la-captura`, `agente.tarea-queda-en-espera`
- **Estado:** pendiente

## 3. Clientes

### T-034 · La conversación web, conectada

- **Satisface:** REQ-CAP-23 (web), REQ-CUN01-01, 04, 05, 06, 13 (interfaz web) · plan §9
- **Depende de:** T-032, T-033, T-023
- **Contenido:** `aplicacion.tsx`: acciones de servidor para enviar y decidir; un componente por tipo de turno; la tarjeta con su conflicto y alternativas; al abrir, la conversación y lo que espera; tras confirmar, `refresh()` y la agenda al día; textos sin vocabulario interno (R-40)
- **Hecho cuando:** con el guion de demostración, se registra un compromiso desde la conversación y aparece en Hoy; con el asistente no configurado, lo pedido se ve en espera, distinto de un fallo, y sigue ahí al recargar
- **Pruebas:** `web.asistente-agenda-y-confirma`, `web.asistente-en-espera` (extremo a extremo)
- **Estado:** pendiente

### T-035 · La capa de captura móvil, conectada

- **Satisface:** REQ-CAP-01 (texto), REQ-CAP-23 (móvil), REQ-CUN01-01, 04, 06 (interfaz móvil) · plan §9
- **Depende de:** T-032, T-033, T-021
- **Contenido:** `captura.tsx` sobre las mismas rutas, con `sesion.ts`; la misma tarjeta que la web; al confirmar, la agenda se vuelve a pedir; lo que espera se ve al abrir la capa
- **Hecho cuando:** en Expo web, con el guion de demostración, se registra un compromiso desde la capa y aparece en Hoy; con el asistente no configurado, lo pedido queda en espera y sigue al volver a abrir la capa
- **Pruebas:** `movil.captura-propone-y-confirma`, `movil.captura-en-espera` (extremo a extremo)
- **Estado:** pendiente

## 4. Después

### T-036 · Proveedor compatible con la API de OpenAI (Groq) y conjunto de evaluación

- **Habilita:** P-06 · `PROPUESTA-TECNICA.md` §7.5 · plan §3.1 · H-AGT-01, H-AGT-13
- **Depende de:** T-029; la evaluación, de T-032
- **Origen:** el equipo eligió Groq en su nivel gratuito el 29 de octubre de 2026, para probar sin pagar
- **Contenido:** `ModeloCompatibleOpenAI` sobre `fetch`, sin SDK, con las variables del plan §3.1; sus errores según el plan; `MODELO_PRECIOS`; servidor local que imita la API para las pruebas; conjunto fijo de frases con el resultado esperado (fechas relativas, sin fin, datos que faltan, tareas, pedidos fuera de alcance), que se ejecuta a mano contra el proveedor configurado y nunca en la integración continua
- **Hecho cuando:** el adaptador pasa el contrato de T-029 contra el servidor local; un 429 y una clave rechazada dan `ModeloNoDisponible`; la clave no aparece en ningún registro; el equipo conversa con el agente usando su clave de Groq
- **Pruebas:** `agente.contrato-del-proveedor` (ampliada), `agente.evaluacion` (a mano)
- **Estado:** pendiente
