# Tareas — Tareas personales (CUN-03)

**Plan:** `specs/09-tareas-personales/plan.md` (propuesta del 6 de noviembre de 2026, pendiente de aval; §13, del 25 de noviembre de 2026)
**Numeración:** sigue a `specs/02-agenda/tasks.md`, que termina en T-045. *El carril de administración numera a la vez, veinte números más adelante; si al integrar cambia el orden, se renumera aquí antes de que exista código.*
**Regla:** una tarea cabe en una sesión de trabajo. Termina cuando se cumple su «Hecho cuando», su prueba pasa y `python tools/trazabilidad.py --check` sigue limpio.
**Orden:** contrato → modelo y migración → Operaciones y rutas → agente → web → móvil → conversión de lo que estaba en espera. Web y móvil pueden ir en paralelo una vez hecha T-049.

Estados: `pendiente` · `en curso` · `hecha`.

---

## 1. Contrato

### T-046 · Contratos de las tareas personales

- **Satisface:** habilita AD-08 para REQ-CUN03-01 a 20 · plan §6
- **Depende de:** —
- **Contenido:** `packages/contratos/src/tareas.ts` con `EstadoTarea`, `FranjaTarea`, `TareaPersonal`, `RespuestaTareas`, `ConsultaTareas`, `ConsultaTareasDelDia`, `TareasDelDia`, `CargaRegistrarTarea`, `CargaModificarTarea`, `CargaTareaExistente`, `TareaListada` y `ListaTareas`; los argumentos de las herramientas de plan §7.1; `Fecha`, `Hora` e `Instante` a un `comunes.ts` exportado, sin cambiar su forma; en `agente.ts` y `asistente.ts`, el turno `tareas` y los desenlaces `hecho`, `reabierto`, `cambiado` y `quitado`. `ArgsGuardarTarea` y `ClaseTarea` **no** se quitan todavía (se retiran en T-050)
- **Hecho cuando:** `horaLimite` sin `fecha` y `esperadaDesde` sin `deQuien` no validan; `CargaModificarTarea` sin ningún campo no valida; `null` en `fecha` sí valida y significa quitarla; los contratos existentes siguen validando lo mismo
- **Prueba:** `contratos.tareas`
- **Estado:** hecha · 7 de noviembre de 2026. `contratos.tareas` 8/8

---

## 2. Modelo y migración

### T-047 · Tabla `tarea` y funciones de franja

- **Satisface:** REQ-CUN03-03, REQ-CUN03-07, REQ-CUN03-19 · H-TP-01, H-TP-03, H-TP-04, H-TP-05
- **Depende de:** T-046
- **Contenido:** décima migración: `estado_tarea`, tabla `tarea` (plan §3.1) con sus `CHECK`, `operacion.convertida_en` (plan §3.2); `Tarea` en `MODELOS_CON_ORGANIZACION`; funciones puras `franjaDe`, `instanteLimite`, `vencida` y `ordenar` en `apps/api/src/tareas/dominio/franja.ts`
- **Hecho cuando:** una tabla de casos cubre cada franja (con `deQuien` y `fecha` va a esperando), cada orden de H-TP-05 y vencida con y sin hora límite, también tras un cambio de zona del perfil; la prueba de aislamiento cubre `tarea`; la migración se aplica sobre la base de pruebas sin tocar las anteriores
- **Pruebas:** `tareas.franja-y-orden`, `plataforma.aislamiento-entre-organizaciones` (ampliada)
- **Estado:** hecha · 7 de noviembre de 2026. Migración escrita a mano y aplicada con psql (el motor de Prisma no se descarga aquí). Tabla `tarea_personal` (H-TP-19)

---

## 3. Operaciones y rutas

### T-048 · Operaciones `tareas.*`

- **Satisface:** REQ-CUN03-01, REQ-CUN03-04, REQ-CUN03-05, REQ-CUN03-11, REQ-CUN03-12 · AD-09 · H-TP-07, H-TP-08, H-TP-15
- **Depende de:** T-047, T-012
- **Contenido:** `TareasModule` con `TareasRepositorio` (filtrado por `perfilId`) y los ejecutores de `tareas.registrar`, `tareas.modificar`, `tareas.completar`, `tareas.reabrir` y `tareas.descartar` (plan §4), con sus orígenes, sus tarjetas y `TAREA_NO_MODIFICABLE`; «Marcar como recibido» cuando hay `deQuien`
- **Hecho cuando:** sin confirmar no existe la tarea; confirmar dos veces crea una (`operacionOrigenId` único); `tareas.registrar` y `tareas.modificar` rechazan `control_directo` con `ORIGEN_NO_PERMITIDO`; la tarjeta de modificar muestra antes y después; descartar no borra la fila; ningún ejecutor llama a Google
- **Pruebas:** `tareas.sin-confirmar-no-registra`, `tareas.esperando-y-recibido`, `tareas.descartar-requiere-confirmacion`, `tareas.modificar-muestra-antes-y-ahora`
- **Estado:** hecha · 7 de noviembre de 2026. Seis tipos: `tareas.cambiar` en lugar de `tareas.modificar` y `tareas.recibido` aparte (H-TP-20)

### T-049 · Consulta y rutas de tareas

- **Satisface:** REQ-CUN03-06, REQ-CUN03-07, REQ-CUN03-09, REQ-CUN03-10, REQ-CUN03-13, REQ-CUN03-18, REQ-CUN03-19, REQ-CUN03-20 · H-TP-06, H-TP-07
- **Depende de:** T-048
- **Contenido:** `ConsultaTareasService` y `tareas.controller.ts` con `GET /tareas`, `GET /tareas/dia`, `GET /tareas/:id`, `POST /tareas/:id/hecha` y `POST /tareas/:id/reabrir` (plan §5), todas `@SobreLoPropio()` y sin `@RequiereGoogle`; `porConfirmar` vacío hasta T-056
- **Hecho cuando:** las pendientes salen en el orden de H-TP-05 con `franja` y `vencida` calculadas; las hechas de más de 7 días no salen; `/tareas/dia` de hoy suma las vencidas y el de otro día no; `/hecha` dos veces deja una tarea hecha y dos Operaciones auditadas con origen `control_directo`; la tarea de otro perfil da `TAREA_NO_ENCONTRADA`; todo funciona sin calendario conectado y sin proveedor de modelo
- **Pruebas:** `tareas.hecha-y-reabrir`, `tareas.del-dia-con-vencidas`, `tareas.solo-las-propias`, `tareas.sin-calendario`, `tareas.consulta-sin-proveedor-de-modelo`
- **Estado:** hecha · 7 de noviembre de 2026. `GET /tareas` admite también `hasta` (H-TP-18)

---

## 4. Agente

### T-050 · Registrar, consultar y cambiar tareas por conversación

- **Satisface:** REQ-CUN03-01, REQ-CUN03-02, REQ-CUN03-12, REQ-CUN03-14, REQ-CUN03-16 (registrar «pídele…») · REQ-AGT-02 (cambia) · H-TP-02, H-TP-10, H-TP-14, H-TP-16, H-TP-18
- **Depende de:** T-049, T-032; **T-040** para sumar las tareas a la nota de continuidad (si T-040 no está, esa parte pasa a T-040)
- **Contenido:** `herramientas-tareas.ts` con `tareas.consultar`, `tareas.registrar` y `tareas.modificar` (plan §7.1); `ListaTareas` armada por el código y el turno `tareas` en la web y el móvil; **se retira `captura.guardar_tarea`** con `ArgsGuardarTarea` y `ClaseTarea`; instrucciones; guion de demostración; el episodio cierra como `registrado` y deja de usar `guardado`; nuevo texto de `funcion_por_llegar` (H-TP-16) y ajuste de las pruebas que esperaban el anterior
- **Hecho cuando:** con el simulado, «recuérdame pagar el recibo antes del sábado» propone una tarea con fecha y, al confirmar, existe; «tengo que llamar al dentista» propone sin fecha sin preguntar; «pídele a María Fernanda el informe» propone esperando de alguien y no envía nada; «¿qué tengo pendiente?» devuelve la lista armada por el código; ninguna tarjeta promete un aviso; ninguna herramienta escribe `funcion_por_llegar`
- **Pruebas:** `agente.tareas.registra-con-tarjeta`, `agente.tareas.consulta-tal-cual`, `agente.tareas.no-delega`
- **Estado:** hecha · 7 de noviembre de 2026. La herramienta de cambiar se llama `tareas.cambiar`. La nota de continuidad (T-040) no se tocó: T-040 no está en esta rama
- **Se entrega junto con T-056** (plan §9)

### T-051 · Completar, reabrir y descartar por conversación

- **Satisface:** REQ-CUN03-15, REQ-CUN03-16 (lo que no hace) · REQ-AGT-04 (amplía)
- **Depende de:** T-050; T-042 si ya existe el nodo `alternativas` (si no, esta tarea lo crea con el contrato de `specs/07-agente/plan.md` §14.9)
- **Contenido:** `tareas.completar`, `tareas.reabrir` y `tareas.descartar` como herramientas, con `tareaId` o con `texto`; búsqueda en código entre las pendientes o las hechas recientes; candidatas; separadores nuevos; casos nuevos de `evaluar-asistente` (plan §12)
- **Hecho cuando:** «ya pagué el recibo» con dos recibos pendientes muestra las dos candidatas y no propone nada; elegir una lleva a su tarjeta; con una sola, la tarjeta dice cuál; «ya me llegó el presupuesto de Juan» propone «Marcar como recibido»; «ponle prioridad 1» y «divídela en tres pasos» no cambian nada
- **Pruebas:** `agente.tareas.completar-dice-cual`, `agente.tareas.no-delega` (ampliada)
- **Estado:** hecha · 7 de noviembre de 2026. T-042 no existía: el nodo de candidatas es el corte en `herramientas` más la decisión `referente`, con el contrato de §14.9

---

## 5. Web

### T-052 · Sección Tareas en la web

- **Satisface:** REQ-CUN03-06, REQ-CUN03-07, REQ-CUN03-08, REQ-CUN03-09, REQ-CUN03-10, REQ-CUN03-11 (web) · R-38, R-40, R-42
- **Depende de:** T-049, T-025, T-034
- **Contenido:** `lib/tareas.ts`; `aplicacion/tareas.tsx` con el selector de franjas existente, la lista, «Hecho» / «Recibido» con «Deshacer», «Hechas en los últimos 7 días» con «Reabrir», «Descartar» con tarjeta y el estado vacío de cada franja; `aplicacion/tarjeta.tsx` extraída de `conversacion.tsx` (plan §8.1)
- **Hecho cuando:** con tareas sembradas por Operaciones, cada franja muestra las suyas en orden y con su texto; una vencida dice «Vencía el…»; «Hecho» la pasa al pie y «Deshacer» la devuelve; «Reabrir» la devuelve a su franja; descartar pide confirmación; una franja vacía explica qué va ahí y enfoca la barra de entrada; no hay ningún campo de edición
- **Prueba:** `web.tareas-por-franja` (extremo a extremo)
- **Estado:** hecha · 7 de noviembre de 2026. La tarjeta no se extrajo a `tarjeta.tsx`: descartar usa la suya en `tareas.tsx`

### T-053 · Tareas del día en Hoy, en la web

- **Satisface:** REQ-CUN03-13 (web) · H-TP-09
- **Depende de:** T-049, T-044, T-045
- **Contenido:** grupo «Tareas para este día» en el nivel Hoy del lienzo, debajo de `ListaCompromisos` y con la franja «en espera» arriba; «Hecho» en cada tarea; nada en Semana ni en Mes
- **Hecho cuando:** hoy con un compromiso, una tarea del día con hora límite y una vencida, se ven en el orden del criterio y ninguna tarea está en la línea de horas; otro día elegido muestra solo sus tareas; un día sin compromisos muestra el estado vacío y debajo las tareas; Semana y Mes no muestran tareas
- **Prueba:** `web.tareas-en-hoy` (extremo a extremo)
- **Estado:** hecha · 7 de noviembre de 2026

---

## 6. Móvil

### T-054 · Sección Tareas en el móvil

- **Satisface:** REQ-CUN03-06, REQ-CUN03-07, REQ-CUN03-08, REQ-CUN03-09, REQ-CUN03-10, REQ-CUN03-11 (móvil) · R-41
- **Depende de:** T-049, T-021, T-035
- **Contenido:** `pantallas/tareas.tsx` con el selector de franjas, la lista, «Hecho» / «Recibido» con «Deshacer», las hechas recientes con «Reabrir», el detalle de una tarea con «Descartar» y su tarjeta, y el estado vacío por franja que abre la capa; `pantallas/tarjeta.tsx` extraída de `captura.tsx`; `tareas/formato.ts` (plan §8.2)
- **Hecho cuando:** lo mismo que T-052, en Expo web a 390×844, y las mismas tareas en el mismo orden que la web; el estado vacío abre la capa de captura
- **Prueba:** `movil.tareas-por-franja` (extremo a extremo)
- **Estado:** hecha · 7 de noviembre de 2026. La tarjeta no se extrajo a `pantallas/tarjeta.tsx`; los textos vienen de la API (H-TP-21), sin `tareas/formato.ts`

### T-055 · Tareas del día en Hoy, en el móvil

- **Satisface:** REQ-CUN03-13 (móvil) · H-TP-09
- **Depende de:** T-049, T-044, T-045
- **Contenido:** el grupo «Tareas para este día» en `NivelHoy` de `pantallas/agenda.tsx`, con «Hecho»; nada en `NivelSemana` ni en `NivelMes`
- **Hecho cuando:** lo mismo que T-053, en Expo web
- **Prueba:** `movil.tareas-en-hoy` (extremo a extremo)
- **Estado:** hecha · 7 de noviembre de 2026. El grupo se monta en `AgendaHoy`, debajo de `NivelHoy`

---

## 7. Lo que estaba en espera

### T-056 · Convertir las tareas en espera en propuestas

- **Satisface:** REQ-CUN03-17 · P-11 · H-TP-11, H-TP-16, H-TP-17
- **Depende de:** T-050, T-033; **T-041** (la caducidad tiene que excluir las propuestas con `convertida_en`; si T-041 llega después, la exclusión va en T-041)
- **Contenido:** trabajo `convertir-tareas` en el proceso trabajador (plan §9): una llamada al modelo por fila, con la referencia `capturada_en` y solo `tareas.registrar`, sin grafo ni episodio; la misma fila pasa a `propuesta` con `convertida_en`; respuesta ilegible → propuesta sin fecha con aviso; `porConfirmar` en `GET /tareas`
- **Hecho cuando:** con el simulado, una fila capturada el viernes con «antes del sábado» pasa a una propuesta para ese sábado, que sale en `porConfirmar` y ya no en `GET /operaciones?estado=en_espera`; sin modelo, la fila no cambia y la pasada se detiene; escribir otro mensaje al asistente no descarta la propuesta; pasadas 24 horas, la propuesta sigue ahí; confirmarla crea la tarea
- **Prueba:** `agente.tareas-en-espera-se-convierten`
- **Estado:** pendiente
- **Se entrega junto con T-050**

### T-057 · «Por confirmar» en la web y el móvil

- **Satisface:** REQ-CUN03-17 (interfaz)
- **Depende de:** T-056, T-052, T-054
- **Contenido:** grupo «Por confirmar» encima de las franjas de Tareas, con la cantidad y, al abrirlo, cada propuesta con «Lo que pediste», la tarea propuesta, «Confirmar» y «Descartar», con la tarjeta extraída en T-052 y T-054; la franja «en espera» de Hoy deja de contarlas
- **Hecho cuando:** con una tarea convertida, Tareas muestra «1 por confirmar» y al abrirlo su frase y la tarea; confirmar la lleva a su franja y vacía el grupo; descartarla no crea nada; sin nada por confirmar, el grupo no aparece; los textos no usan vocabulario interno
- **Pruebas:** `web.tareas-por-confirmar`, `movil.tareas-por-confirmar` (extremo a extremo)
- **Estado:** pendiente


## 8. Bitácora de una tarea, ficha y aviso al vencer

*Añadidas el 25 de noviembre de 2026* (plan §13). Numeradas desde T-125: T-120 a T-124 son de `05-equipos` y `06-acceso`.

### T-125 · Bitácora, contexto y aviso al vencer en la API

- **Satisface:** REQ-CUN03-22, 24 (datos), 25, 26 (datos), 27 · H-TP-27, H-TP-30, H-TP-31
- **Depende de:** T-048, T-049
- **Contenido:** migración `20261125120000_bitacora_tarea` (plan §13.1); contratos de §13.3; Operaciones `tareas.anotar_avance` y `tareas.mantener_abierta`, y `contexto` en registrar y cambiar; `bitacora`, `contexto` y `avisoVencida` en cada tarea; `POST /tareas/:id/mantener-abierta`; desenlace `anotado`
- **Hecho cuando:** confirmar un avance lo deja en la bitácora con su momento y su zona, y confirmarlo dos veces anota uno; dos avances salen del más reciente al más antiguo; borrar los turnos de la transcripción no los toca; anotar en una tarea hecha se rechaza; una tarea vencida trae `avisoVencida`, «Mantener abierta» lo apaga y lo deja auditado como `control_directo`, y con otra fecha vencida vuelve
- **Pruebas:** `tareas.bitacora`, `tareas.aviso-al-vencer`
- **Estado:** hecha · 25 de noviembre de 2026. Migración generada con `prisma migrate diff --from-config-datasource` contra la base de desarrollo (la de migraciones pide una base sombra), con solo los cambios nuevos. `avisoVencida` excluye lo que se espera de alguien (H-TP-30). Anotar con origen `control_directo` responde 403 `ORIGEN_NO_PERMITIDO`, como registrar. El texto de anotar en una tarea hecha dice «si quieres seguir anotando, reábrela». 8 pruebas en `test/tareas/bitacora.spec.ts`

### T-126 · La bitácora por conversación

- **Satisface:** REQ-CUN03-21, 23, 25, 26 · H-TP-26, H-TP-29
- **Depende de:** T-125, T-051
- **Contenido:** la ficha en `tareas.consultar`; herramientas `tareas.anotar_avance` y `tareas.bitacora`; `encajan` sobre texto, contexto y avances; candidatas con `avance` y «Ver cómo va»; turno `bitacora`; instrucciones; guion de demostración
- **Hecho cuando:** con el simulado, «sobre el presupuesto de la cocina: ya hablé con Juan» propone anotar en esa tarea; «ya hablé con Rosa: …» encaja por el contexto; con dos presupuestos, salen las candidatas y elegir una propone el avance; sin ninguna, no se anota nada; en una tarea hecha, se ofrece reabrirla; «¿cómo va el presupuesto de la cocina?» muestra los avances tal como están, y una tarea sin avances lo dice
- **Pruebas:** `agente.tareas-anotar-avance`, `agente.tareas-bitacora`
- **Estado:** hecha · 25 de noviembre de 2026. `encajan` acepta los avances de cada tarea además de su texto, de quién y contexto. Una tarea que no está pendiente pero sí entre las hechas de los últimos siete días: anotar devuelve «ya está hecha… pídeme que la reabra», y «¿cómo va?» muestra su bitácora igual. Elegir «Ver cómo va» entre candidatas añade el turno `bitacora` sin pasar por el modelo. Guion de demostración: «sobre X: …», «avancé con X: …», «ya hablé con …: …» y «¿cómo va X?», antes de «ya …»; y «recuérdame X, lo veo con …» con contexto. 11 pruebas en `test/agente/tareas-bitacora.spec.ts`

### T-127 · Bitácora y aviso en la web

- **Satisface:** REQ-CUN03-24, 26, 27 (interfaz)
- **Depende de:** T-125, T-126, T-052
- **Contenido:** contexto, último avance y «Ver bitácora» en cada tarea; aviso al vencer con «Darla por hecha» y «Mantener abierta»; turno `bitacora` en la conversación
- **Hecho cuando:** la cuenta `tareas` ve el último avance de «Enviar la tesis» y despliega los dos; «Renovar el DNI» muestra el aviso, «Mantener abierta» lo quita también al recargar, y la tarea sigue vencida; «¿cómo va…?» en la conversación muestra la bitácora
- **Prueba:** `web.tareas-bitacora` (extremo a extremo)
- **Estado:** hecha · 25 de noviembre de 2026. Acción de servidor `mantenerAbierta` por el mismo camino que `/hecha`. El aviso dice «Venció el … ¿La das por hecha o la mantienes abierta?», a partir del texto `cuando`. El último avance va como «Martes 24 · …», igual que el móvil. Las hechas recientes también muestran contexto y bitácora, sin aviso. Los nombres accesibles llevan la tarea («Mantener abierta: Renovar el DNI»). Las pruebas van al final de `e2e/tareas.spec.ts`, con un solo ingreso, por el límite de 5 ingresos por minuto. Capturas en `design/capturas/2026-11-25-bitacora/web/`

### T-128 · Bitácora y aviso en el móvil

- **Satisface:** REQ-CUN03-24, 26, 27 (interfaz)
- **Depende de:** T-125, T-126, T-054
- **Contenido:** lo mismo que T-127 en la sección Tareas y en la capa de captura del móvil
- **Hecho cuando:** lo mismo que T-127, a 390 × 844
- **Prueba:** `movil.tareas-bitacora` (extremo a extremo)
- **Estado:** hecha · 25 de noviembre de 2026. Mismo aviso y mismo último avance que la web (R-41). Al desplegar la bitácora se oculta la línea del último avance, que la lista ya incluye. La tarjeta plegada de la capa muestra ahora «Tarea» y nunca pliega «Avance». Cuenta de pruebas propia, `tareasBitacora`, sembrada igual que `tareas`, por el límite de 5 ingresos por minuto. Capturas en `design/capturas/2026-11-25-bitacora/movil/`

---

**Fuera de este desglose:** el hilo de la conversación sobre una tarea (REQ-AGT-05), los avisos fuera de la aplicación (H-TP-10, H-TP-32), la marca por plan (H-TP-12, con REQ-CAP-05), las tareas en Semana y Mes (H-TP-09, revisable con CUN-02) y las tareas en la sección Actividad (hito 4).
