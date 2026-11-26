# Plan técnico — Tareas personales (CUN-03)

**Especificación:** `specs/09-tareas-personales/spec.md` (REQ-CUN03-01 a 20)
**Fase:** 1 para el dominio, la API y las Operaciones; 2 para las herramientas del agente (`SPEC.md` §10). Hito 3 de `PLAN-VALOR-USUARIO.md`
**Decisiones que aplica:** AD-04, AD-05, AD-08, AD-09 · P-01, P-02, P-03, P-04, P-05, P-07, P-10, P-11 · DP-01 · R-12, R-38, R-40, R-42 · H-TP-01 a 18
**Depende de:** `specs/02-agenda/plan.md` §3 (Operaciones), `specs/07-agente/plan.md` (grafo, herramientas, cola en espera, §14 transcripción y episodio) y `specs/06-acceso/plan.md` (sesión, `@SobreLoPropio()`, roles)
**Estado:** propuesta del 6 de noviembre de 2026, pendiente de aval del equipo junto con la especificación

Este plan dice **dónde y cómo** se cumple cada requisito. Lo que la especificación no decide está en §11 como hallazgo.

---

## 1. Qué se construye

| Pieza | Para qué | Fase |
|---|---|---|
| Tabla `tarea` y módulo `TareasModule` | La entidad EN-04 para lo personal, con su franja calculada por el código | 1 |
| Seis tipos de Operación `tareas.*` | Ninguna escritura fuera de una Operación (AD-09); auditoría e idempotencia (P-07) | 1 |
| Rutas de consulta y dos atajos de control directo | La sección Tareas, el grupo de Hoy y «Hecho» / «Reabrir» sin tarjeta (H-TP-07) | 1 |
| Herramientas `tareas.*` del agente | Registrar, consultar, cambiar, completar, reabrir y descartar por conversación | 2 |
| Sección Tareas y grupo de Hoy, en web y móvil | Lo que ve la persona | 1 |
| Conversión de lo que estaba en espera | Las Operaciones `en_espera` con `funcion_por_llegar` pasan a propuestas «Por confirmar» | 2 |

**No entra:** avisos ni notificaciones (H-TP-10), duración y colocación en el día (CUN-02), recurrencia, categorías (D-16), hilo de la tarea (REQ-AGT-05), tareas asignadas y encargos (`03-tareas`), límite por plan (H-TP-12), búsqueda semántica.

## 2. Módulos

| Módulo / componente | Responsabilidad |
|---|---|
| `TareasModule` (`apps/api/src/tareas/`) | Dominio de la tarea personal. Es el módulo «Tareas» de `PROPUESTA-TECNICA.md` §3.3, que más adelante acogerá también CUN-07 a 09 |
| ├ `TareasRepositorio` | Lectura y escritura de `tarea`, **siempre filtrada por `perfilId`** además de la organización (REQ-CUN03-19). Solo lo usan los ejecutores y `ConsultaTareasService` |
| ├ `ConsultaTareasService` | Interfaz pública de lectura: por franja, por día (para Hoy), por id, hechas recientes. La usan el controlador, el agente y la nota de continuidad |
| ├ `dominio/franja.ts` | **Funciones puras** (P-02): `franjaDe(tarea)`, `vencida(tarea, ahora, zona)`, `ordenar(franja, tareas)`, `instanteLimite(tarea)` |
| ├ `dominio/formato.ts` | Textos de fecha y espera en la zona del perfil («Sábado 14 de noviembre · Antes de las 18:00», «De Juan · Desde el martes 3 de noviembre, hace 6 días»), reutilizando `agenda/formato.ts` |
| ├ `ejecutores-tareas.ts` | Los seis tipos de §4, registrados en `RegistroOperaciones` al iniciar el módulo |
| └ `tareas.controller.ts` | Rutas de §5, todas `@SobreLoPropio()` y **sin** `@RequiereGoogle` (REQ-CUN03-20) |
| `AgenteModule` | `herramientas/herramientas-tareas.ts` (§7). Usa solo `OperacionesService` y `ConsultaTareasService` (`PROPUESTA-TECNICA.md` §3.3) |
| `AgendaModule` | **No cambia.** La vista Hoy pide las tareas del día a la ruta de tareas; agenda no lee la tabla `tarea` (`PROPUESTA-TECNICA.md` §3.3) |

## 3. Modelo de datos (décima migración)

### 3.1 Tabla `tarea` (EN-04, solo lo personal)

```prisma
enum EstadoTarea {
  pendiente
  hecha
  descartada

  @@map("estado_tarea")
}

model Tarea {
  id                String       @id @default(uuid()) @db.Uuid
  organizacionId    String       @map("organizacion_id") @db.Uuid
  // RN-EST-01: la tarea personal es de un perfil, que es su responsable (REQ-CUN03-19)
  perfilId          String       @map("perfil_id") @db.Uuid
  texto             String       @db.VarChar(200)
  // H-TP-03: día del calendario de la persona; nula = sin fecha
  fecha             DateTime?    @db.Date
  // Hora límite opcional, «HH:mm» en `zonaHoraria`; solo con fecha
  horaLimite        String?      @map("hora_limite") @db.VarChar(5)
  // IANA en que se dijo la fecha (P-05); la del perfil al registrar o al cambiar la fecha
  zonaHoraria       String       @map("zona_horaria")
  // Esperando de alguien (REQ-CUN03-04, R-12): solo el nombre, sin contacto
  deQuien           String?      @map("de_quien") @db.VarChar(80)
  esperadaDesde     DateTime?    @map("esperada_desde") @db.Date
  estado            EstadoTarea  @default(pendiente)
  hechaEn           DateTime?    @map("hecha_en") @db.Timestamptz(3)
  descartadaEn      DateTime?    @map("descartada_en") @db.Timestamptz(3)
  // La Operación tareas.registrar que la creó (AD-09); única: confirmar dos veces crea una
  operacionOrigenId String       @unique @map("operacion_origen_id") @db.Uuid
  creadaEn          DateTime     @default(now()) @map("creada_en") @db.Timestamptz(3)
  actualizadaEn     DateTime     @updatedAt @map("actualizada_en") @db.Timestamptz(3)

  organizacion    Organizacion  @relation(fields: [organizacionId], references: [id])
  perfil          PerfilUsuario @relation(fields: [perfilId], references: [id], onDelete: Cascade)
  operacionOrigen Operacion     @relation(fields: [operacionOrigenId], references: [id])

  @@index([perfilId, estado, fecha])
  @@index([organizacionId])
  @@map("tarea")
}
```

| Regla | Dónde se comprueba |
|---|---|
| `Tarea` entra en `MODELOS_CON_ORGANIZACION` (`apps/api/src/plataforma/aislamiento.ts`) | `plataforma.aislamiento-entre-organizaciones` |
| Sin escrituras anidadas: la tarea se crea en el ejecutor con `operacionOrigenId`, no dentro de la Operación | Revisión; `AGENTS.md` |
| `horaLimite` exige `fecha`; `esperadaDesde` exige `deQuien` | Esquema zod de las cargas (§6) y una restricción `CHECK` en la migración |
| La franja **no se guarda**: `franjaDe()` la calcula (H-TP-01) | `tareas.franja-y-orden` |
| `perfil_usuario` y `organizacion` ganan la relación inversa `tareas` | Migración |

**Por qué `fecha` es `date` y no `timestamptz`** (H-TP-03): «para el sábado» es un día del calendario de la persona, no un instante. La zona se guarda al lado, así que la regla de P-05 se cumple: con `fecha`, `horaLimite` y `zonaHoraria` se calcula el instante límite cuando hace falta (`instanteLimite`). Un cambio de zona del perfil (T-009) no toca las tareas, igual que no mueve los compromisos (H-ACC-04).

### 3.2 Cambio en `operacion`

| Campo | Contenido |
|---|---|
| `convertida_en` | `timestamptz`, nula. Se rellena cuando una fila `en_espera` pasa a `propuesta` por la conversión de §9. Sirve para que la caducidad de T-041 la excluya (H-TP-11) y para el grupo «Por confirmar» |

`MotivoEspera.funcion_por_llegar` **se conserva en la enumeración** (Postgres no quita valores de un `enum` sin rehacer el tipo, y hay filas que lo usan hasta la conversión), pero **deja de usarse para tareas** desde T-050: ninguna herramienta lo escribe ya. El comentario de `schema.prisma` y de `packages/contratos/src/agente.ts` lo dice.

## 4. Operaciones de tareas (AD-09)

Cada tipo declara su esquema de carga (§6), su `proponer` (la `VistaConfirmacion`) y su `ejecutar`, como los de agenda (`specs/02-agenda/tasks.md`, T-012 y T-017).

| Tipo | Origen admitido | Tarjeta | Qué hace al ejecutar | REQ |
|---|---|---|---|---|
| `tareas.registrar` | `agente` (R-42) | Sí: «Nueva tarea», texto, cuándo o de quién, franja | Crea la `tarea` con `operacionOrigenId` = la Operación. Si ya existe una con ese origen, devuelve la misma (idempotente) | CUN03-01, 02, 04 |
| `tareas.modificar` | `agente` (R-42, H-TP-08) | Sí: antes y después de cada campo que cambia | Actualiza solo lo que trae la carga; `null` quita la fecha o la persona. Rechaza una tarea hecha o descartada con `TAREA_NO_MODIFICABLE` | CUN03-12, 03 |
| `tareas.completar` | `agente`, `control_directo` | Por el agente sí; por control directo se propone y se confirma en el mismo paso (§5) | `estado = hecha`, `hechaEn = ahora`. Si ya está hecha, devuelve lo mismo | CUN03-09, 05, 15 |
| `tareas.reabrir` | `agente`, `control_directo` | Igual que completar | `estado = pendiente`, `hechaEn = null`. Solo desde `hecha` | CUN03-10, 15 |
| `tareas.descartar` | `agente`, `control_directo` | **Siempre** (H-TP-07), con «Ya no aparecerá en tus tareas» como irreversible | `estado = descartada`, `descartadaEn = ahora`. No se borra la fila (R-25) | CUN03-11 |

- La acción de la tarjeta de `tareas.completar` dice «Dar por hecha» o, si la tarea tiene `deQuien`, «Marcar como recibido» (H-TP-15). El texto lo arma el código.
- **Ninguna lleva `@RequiereGoogle` ni llama a `ClienteGoogle`.** `tareas.registrar` no revisa solapes con la agenda (H-TP-09).
- Ninguna es `soloResponsable` (REQ-ACC-13: el colaborador las usa sobre lo suyo).
- La caducidad de 24 horas (H-AG-08, T-041) **sí** aplica a las propuestas de tareas que salen de la conversación, y **no** a las que tienen `convertida_en` (H-TP-11).

## 5. Rutas

Contratos en `packages/contratos/src/tareas.ts` (§6). Todas `@SobreLoPropio()`; ninguna `@RequiereGoogle`.

| Ruta | Qué hace | REQ |
|---|---|---|
| `GET /tareas?franja=con_fecha\|sin_fecha\|esperando` | `RespuestaTareas`: `pendientes` de la franja (o de las tres, agrupadas, sin `franja`), en el orden de H-TP-05; `hechasRecientes` de los últimos 7 días (H-TP-06); `porConfirmar`, las Operaciones `propuesta` de tipo `tareas.registrar` con `convertida_en` | CUN03-03, 06, 07, 10, 17, 19 |
| `GET /tareas/dia?fecha=AAAA-MM-DD` | `TareasDelDia`: las pendientes con esa fecha y, si `fecha` es hoy en la zona del perfil, las vencidas (REQ-CUN03-13) | CUN03-13 |
| `GET /tareas/:id` | Una tarea propia; ajena o inexistente, `TAREA_NO_ENCONTRADA` (el mismo código para las dos, como `EVENTO_NO_ENCONTRADO`) | CUN03-19 |
| `POST /tareas/:id/hecha` | Control directo sin tarjeta (H-TP-07): el servicio propone `tareas.completar` con `origen: control_directo` y la confirma en el mismo paso, por `OperacionesService`. Devuelve la tarea y el id de la Operación | CUN03-09, 05, 18 |
| `POST /tareas/:id/reabrir` | Igual, con `tareas.reabrir`. Es también el «Deshacer» de «Hecho» | CUN03-09, 10, 18 |
| `POST /operaciones` `{ tipo: 'tareas.descartar', origen: 'control_directo', carga: { tareaId } }` y `POST /operaciones/:id/confirmar` | Descartar con tarjeta, como `agenda.cancelar` (T-019) | CUN03-11, 18 |
| `POST /operaciones/:id/confirmar` y `/descartar` | Confirmar o descartar una propuesta «Por confirmar» | CUN03-17 |

**Por qué hay atajos para «Hecho» y «Reabrir» y no para descartar:** los dos primeros no llevan tarjeta, así que proponer y confirmar desde el cliente serían dos peticiones seguidas sin nada que mostrar entre ellas. El atajo hace las dos dentro del servidor, sigue dejando una Operación `ejecutada` con su auditoría (AD-09, P-07) y es idempotente por estado: pulsar «Hecho» dos veces deja una tarea hecha y dos Operaciones, la segunda sin efecto. Descartar sí muestra tarjeta y usa la ruta general.

**Modo degradado (REQ-CUN03-18):** ninguna de estas rutas depende del proveedor del modelo. Lo que se pide al asistente caído queda en `en_espera` con `asistente_no_disponible`, como cualquier otra solicitud (`specs/07-agente/plan.md` §7).

## 6. Contratos (`packages/contratos/src/tareas.ts`)

Exportados desde `index.ts`. Usan `Fecha` (`AAAA-MM-DD`), `Hora` (`HH:mm`) e `Instante` con la misma definición que `agente.ts` y `agenda.ts`. Hoy cada archivo declara los suyos sin exportarlos; T-046 los mueve a un `comunes.ts` exportado, sin cambiar su forma, para no copiarlos una cuarta vez.

| Esquema | Forma |
|---|---|
| `EstadoTarea` | `z.enum(['pendiente', 'hecha', 'descartada'])` |
| `FranjaTarea` | `z.enum(['con_fecha', 'sin_fecha', 'esperando'])` |
| `TareaPersonal` | `{ id, texto, estado, franja, fecha: Fecha \| null, horaLimite: Hora \| null, zonaHoraria, deQuien: string \| null, esperadaDesde: Fecha \| null, vencida: boolean, hechaEn: Instante \| null, creadaEn: Instante }`. `franja` y `vencida` las calcula el servidor (P-02) |
| `RespuestaTareas` | `{ zona, pendientes: TareaPersonal[], hechasRecientes: TareaPersonal[], porConfirmar: OperacionRespuesta[] }` |
| `ConsultaTareas` | `{ franja?: FranjaTarea }` |
| `ConsultaTareasDelDia` / `TareasDelDia` | `{ fecha: Fecha }` / `{ fecha, zona, tareas: TareaPersonal[] }` |
| `CargaRegistrarTarea` | `{ texto: 1..200, fecha?: Fecha, horaLimite?: Hora, deQuien?: 1..80, esperadaDesde?: Fecha }` con `refine`: `horaLimite` exige `fecha`; `esperadaDesde` exige `deQuien`. Sin `esperadaDesde` y con `deQuien`, el ejecutor pone hoy en la zona del perfil |
| `CargaModificarTarea` | `{ tareaId: uuid, texto?, fecha?: Fecha \| null, horaLimite?: Hora \| null, deQuien?: string \| null, esperadaDesde?: Fecha \| null }`; al menos un campo |
| `CargaTareaExistente` | `{ tareaId: uuid }`, para `tareas.completar`, `tareas.reabrir` y `tareas.descartar` |
| `TareaListada` | Para el agente y la conversación: `{ id, texto, franja, cuando: string \| null, espera: string \| null, vencida: boolean }`, con los textos ya armados en la zona del perfil |
| `ListaTareas` | `{ alcance: string («Pendientes de esta semana»), zona: string, grupos: { franja, nombre, tareas: TareaListada[] }[] }` |
| Argumentos de herramientas | §7 |

**Cambios en contratos existentes:**

| Contrato | Cambio |
|---|---|
| `agente.ts` · `TurnoDeHerramienta` | Nuevo `{ tipo: 'tareas', lista: ListaTareas }` |
| `asistente.ts` · `TurnoAsistente` | Nuevo tipo `tareas`, que la interfaz pinta como la lista de agenda |
| `asistente.ts` · `DesenlaceEpisodio` | Suma `hecho`, `reabierto`, `cambiado` y `quitado` (una tarea descartada, distinto de `descartado`, que es una propuesta descartada). Registrar una tarea da `registrado`; `guardado` deja de producirse (spec §10) |
| `agente.ts` · `ArgsGuardarTarea`, `ClaseTarea` | Se retiran con la herramienta `captura.guardar_tarea` (T-050). `MotivoEspera` no cambia (§3.2) |
| `operaciones.ts` · `OperacionRespuesta` | Sin cambios. «Por confirmar» usa la `vistaConfirmacion` con «Lo que pediste» en sus datos, como la franja «en espera» (decisión 26 de `02-agenda`) |

## 7. Agente

### 7.1 Herramientas (`herramientas/herramientas-tareas.ts`)

Nombres con guion bajo hacia el proveedor (`tareas_consultar`), como las de agenda (`specs/07-agente/plan.md` §3).

| Herramienta | Argumentos | Qué hace | Confirmación |
|---|---|---|---|
| `tareas.consultar` | `franja?`, `desde?`, `hasta?` (`AAAA-MM-DD`), `soloVencidas?` | Lee con `ConsultaTareasService`. Con rango, solo «Con fecha» de ese rango y las vencidas (H-TP-18). Al modelo: id, texto, franja, fecha, de quién, vencida. **A la interfaz, `ListaTareas` armada por el código** (REQ-CUN03-14) | No |
| `tareas.registrar` | `texto`, `fecha?`, `horaLimite?`, `deQuien?`, `esperadaDesde?` | Propone `tareas.registrar`. Fechas en la zona del perfil; las relativas las resuelve el modelo con la referencia y la tarjeta muestra el día de la semana (H-AGT-11). **Sin fecha no pregunta** (H-TP-02): solo falta `texto` | Sí |
| `tareas.modificar` | `tareaId`, y solo lo que cambia | Propone `tareas.modificar`. El id viene de una consulta o de la lista de candidatas | Sí |
| `tareas.completar` · `tareas.reabrir` · `tareas.descartar` | `tareaId`, **o** `texto` para identificarla | Con `tareaId`, propone. Con `texto`, busca en código entre las pendientes (o las hechas recientes, para reabrir): una → propone diciendo cuál; varias → devuelve candidatas; ninguna → lo dice (REQ-CUN03-15, REQ-AGT-04) | Sí |

- **`captura.guardar_tarea` se retira** en T-050: lo que era «guardar en espera» pasa a `tareas.registrar`. El simulado, el guion de demostración y `evaluar-asistente` cambian con ella.
- **Candidatas:** se usa el nodo `alternativas` y el turno `alternativas_de_referente` de `specs/07-agente/plan.md` §14.9 (T-042). Si T-042 no está hecha cuando llegue T-051, T-051 crea ese nodo con ese contrato, pensado para compromisos y tareas.
- **Instrucciones** (`grafo/instrucciones.ts`): suman las tareas; nunca prometer un aviso (H-TP-10); «pídele a alguien» se ofrece como esperando de alguien, sin escribirle (H-TP-14); sin prioridades, pasos, repeticiones ni delegación (REQ-CUN03-16); una tarea sin fecha no es un dato que falta. **Ninguna regla que el código no compruebe** (P-02): la franja, el orden, vencida y las candidatas son código.
- **Lo que ve el proveedor** (como H-AGT-12): texto, fecha, hora límite, de quién y si está vencida, solo de lo consultado. Marcado como datos (H-AGT-15).
- **Nota de continuidad** (`specs/07-agente/plan.md` §14.5, T-040): las Operaciones `tareas.*` ejecutadas entran como las de agenda («registrada», «hecha», «reabierta», «cambiada», «descartada»), y la lista de lo en espera deja de incluir tareas cuando la conversión termine.
- **Episodio:** registrar una tarea cierra el episodio como `registrado`; completar, reabrir, cambiar y descartar, con sus desenlaces de §6. El nodo `herramientas` deja de cerrar como `guardado` (decisión 27 de `07-agente`).
- **Delegar** (`tareas.delegar`, `PROPUESTA-TECNICA.md` §7.2) **no** existe en esta fase: pedirlo sigue en REQ-AGT-02 y REQ-ACC-15.

### 7.2 Grafo

Sin nodos nuevos, salvo `alternativas` si lo trae T-051. Las propuestas `tareas.*` interrumpen en `esperar_decision` como las de agenda. Si la persona pulsa «Hecho» en la lista mientras hay una tarjeta de completar esa tarea, la Operación de la tarjeta queda sin efecto al confirmar (la tarea ya está hecha) y el grafo la da por cerrada al siguiente mensaje (`specs/07-agente/plan.md` §4.3).

## 8. Pantallas

Sin dependencias nuevas. Tokens de `apps/movil/src/tokens.ts` y variables de `apps/web/src/app/globales.css`. Textos sin vocabulario interno (R-40): «Por confirmar», «Hecho», «Recibido», «Reabrir», «Descartar», «Deshacer», «Vencía el…», «Debía llegar el…», «Tareas para este día».

### 8.1 Web (`apps/web`)

| Pieza | Cambio | Reutiliza |
|---|---|---|
| `lib/tareas.ts` (nuevo) | Lee `GET /tareas` y `GET /tareas/dia` en el servidor y formatea en la zona del perfil, como `lib/agenda.ts` | `lib/sesion.ts`, `medianoche` y `desfase` de `lib/agenda.ts` |
| `aplicacion/tareas.tsx` (nuevo) | Lienzo de la sección Tareas: el selector de franjas que ya existe (`secciones.ts`, `aplicacion.tsx`), la lista de la franja, «Hecho» / «Recibido» con «Deshacer», al pie «Hechas en los últimos 7 días» plegable con «Reabrir», «Descartar» con su tarjeta, y el estado vacío de cada franja | El patrón plegable de `aplicacion/en-espera.tsx` para las hechas y para «Por confirmar» |
| `aplicacion/tarjeta.tsx` (nuevo, extraído) | La `Tarjeta` de `conversacion.tsx` sale a su propio archivo para usarla en la conversación, en descartar y en «Por confirmar» | `conversacion.tsx` |
| `aplicacion/agenda.tsx` | En el nivel Hoy, debajo de `ListaCompromisos`, el grupo «Tareas para este día» con «Hecho». Ni en `AgendaSemana` ni en `AgendaMes` | `FranjaEnEspera` sigue arriba, sin cambios |
| `aplicacion/conversacion.tsx` | El turno `tareas` se pinta como la lista de agenda; los separadores nuevos («Se marcó hecha «…»», «Se descartó «…»») | — |
| `aplicacion/aplicacion.tsx` | Quita el estado vacío genérico de Tareas; «Encargadas» sigue igual (H-TP-13) | — |
| `secciones.ts` | El ejemplo «Pídele a María Fernanda el informe para el lunes» se conserva: ahora lleva a «esperando de alguien» (H-TP-14) | — |

### 8.2 Móvil (`apps/movil`)

| Pieza | Cambio | Reutiliza |
|---|---|---|
| `pantallas/tareas.tsx` (nuevo) | Sección Tareas con el selector de franjas, la lista, «Hecho» / «Recibido» con «Deshacer», «Hechas en los últimos 7 días», detalle al tocar una tarea (datos, lo que se pidió, «Descartar» con tarjeta) y estado vacío por franja que abre la capa de captura | El patrón de `pantallas/en-espera.tsx` (cantidad que se abre en el sitio) para «Por confirmar» y las hechas; el detalle de compromiso de `pantallas/agenda.tsx` como modelo |
| `pantallas/tarjeta.tsx` (nuevo, extraído) | La `Tarjeta` de `captura.tsx`, para la capa, descartar y «Por confirmar» | `captura.tsx` |
| `pantallas/agenda.tsx` | `NivelHoy` suma el grupo «Tareas para este día»; `NivelSemana` y `NivelMes`, no | `FranjaEnEspera` arriba, solo en Hoy (lo iguala el carril de interfaz) |
| `tareas/formato.ts` (nuevo) | Textos de fecha y espera en la zona del perfil | `agenda/dia.ts` |
| `aplicacion.tsx` | La sección Tareas monta `pantallas/tareas.tsx` en lugar del vacío | — |
| `pantallas/captura.tsx` | El turno `tareas` y los separadores nuevos | — |

## 9. Conversión de lo que estaba en espera (REQ-CUN03-17)

**Qué hay hoy:** filas de `operacion` con `estado = en_espera`, `motivo_espera = funcion_por_llegar`, `tipo = 'tareas.registrar'`, `carga = { texto, clase }`, la frase en `solicitud_original` y el momento en `capturada_en` (`herramientas-captura.ts`, T-033). El procesador de `en-espera.ts` las salta.

**Qué pasa** (T-056), en el proceso trabajador, junto al repaso de la cola:

1. Un trabajo nuevo, `convertir-tareas`, toma esas filas por orden de captura, hasta 20 por pasada (`POR_PASADA`, H-AGT-13). Con `sinAislar`, con la misma justificación que `specs/07-agente/plan.md` §7: no atiende a nadie en concreto y solo lee identificadores; cada fila se atiende con `deOrganizacion`.
2. **Sin grafo ni episodio:** una sola llamada al modelo con las instrucciones, la referencia `capturada_en` en la zona del perfil (REQ-CAP-24), la frase y **solo** la herramienta `tareas.registrar`. Así no se abre ni se cierra ningún episodio y la propuesta no queda en `operacionPendiente`: escribir otra cosa no la descarta.
3. Con la carga del modelo, `OperacionesService.proponer` con `desdeEnEspera` (T-033): **la misma fila** pasa a `propuesta`, con su tarjeta, `motivo_espera = null` y `convertida_en = ahora`. Su `conversacion_id` se conserva para la auditoría.
4. Si el modelo no responde (`ModeloNoDisponible`), la fila queda como estaba y la pasada se detiene. Si responde mal o no da fecha legible (`FalloDelModelo`), se propone con el `texto` guardado en la carga, sin fecha, y la tarjeta lo dice: «No se pudo leer cuándo; si tenía fecha, díselo al asistente» (H-TP-17). La `clase` `esperando_de_alguien` sin `deQuien` legible se propone sin fecha y sin persona, con el mismo aviso.
5. La fila sale de `GET /operaciones?estado=en_espera` (la franja de Hoy deja de contarla) y aparece en `porConfirmar` de `GET /tareas`.
6. Al confirmarla, `tareas.registrar` crea la tarea. Al descartarla, queda `descartada`, sin tarea.

**Mientras tanto** (H-TP-16): el texto de `MOTIVOS_DE_ESPERA.funcion_por_llegar` en `operaciones.service.ts` cambia en T-050 a «Se está preparando para que la confirmes en Tareas», y la prueba que esperaba «Las tareas llegan en una próxima versión» se ajusta.

**Caducidad** (H-TP-11): el trabajo de T-041 que caduca propuestas excluye `convertida_en IS NOT NULL AND tipo = 'tareas.registrar'`. Si el equipo no avala la excepción, basta con quitar esa condición.

**Migración de datos:** no hay una migración SQL que convierta filas. La conversión necesita interpretar la frase (la fecha relativa vive en el texto), así que la hace el trabajador. La migración de §3 solo crea la tabla y la columna. Las filas de desarrollo se convierten solas en la primera pasada.

**T-050 y T-056 se entregan juntas**: entre las dos, una tarea nueva ya se registra, pero las antiguas siguen esperando con el texto de H-TP-16.

## 10. Requisito por requisito

| REQ | Dónde se cumple | Fase |
|---|---|---|
| CUN03-01 | `tareas.registrar` (herramienta y ejecutor); la tarjeta sin promesa de aviso | 1 y 2 |
| CUN03-02 | Esquema de `CargaRegistrarTarea` (solo `texto` es obligatorio); nodo `preguntar` con «¿Qué hay que hacer?»; instrucciones | 2 |
| CUN03-03 | `franjaDe()`; `EstadoTarea`; `tareas.modificar` recalcula la franja al cambiar datos | 1 |
| CUN03-04 | Campos `deQuien` y `esperadaDesde`; nada de contacto en la tabla; ninguna integración de correo | 1 |
| CUN03-05 | `tareas.completar` sobre una tarea con `deQuien`: «Recibido», `hechaEn` | 1 |
| CUN03-06 | `GET /tareas` y `ordenar()`; `lib/tareas.ts`, `pantallas/tareas.tsx` | 1 |
| CUN03-07 | `vencida()` con `instanteLimite()` en la zona de la tarea | 1 |
| CUN03-08 | Estado vacío por franja en web y móvil; su acción abre la capa o enfoca la barra (H-AG-10) | 1 |
| CUN03-09 | `POST /tareas/:id/hecha`; «Deshacer» llama a `/reabrir` | 1 |
| CUN03-10 | `hechasRecientes` (7 días); `POST /tareas/:id/reabrir` | 1 |
| CUN03-11 | `tareas.descartar` con tarjeta, por `POST /operaciones` | 1 |
| CUN03-12 | `tareas.modificar`, solo `agente`; vista con antes y después | 1 y 2 |
| CUN03-13 | `GET /tareas/dia`; grupo en `NivelHoy` y en el Hoy de la web; `tareas.registrar` no llama a `revision-horario.ts` | 1 |
| CUN03-14 | `tareas.consultar` con `ListaTareas` armada por el código | 2 |
| CUN03-15 | `tareas.completar`, `reabrir` y `descartar` con `texto`; candidatas por el nodo `alternativas` | 2 |
| CUN03-16 | Instrucciones; ninguna herramienta asigna, prioriza ni divide; «pídele» → `tareas.registrar` con `deQuien` | 2 |
| CUN03-17 | §9; `porConfirmar`; `convertida_en`; exclusión en T-041 | 2 |
| CUN03-18 | Rutas sin dependencia del modelo; cola en espera de siempre | 1 y 2 |
| CUN03-19 | `TareasRepositorio` filtra por `perfilId`; `MODELOS_CON_ORGANIZACION`; ninguna ruta de equipo lee `tarea` | 1 |
| CUN03-20 | Ni las rutas ni los ejecutores llevan `@RequiereGoogle` | 1 |

## 11. Hallazgos — vuelven a la especificación

Registrados en `spec.md`, «Decisiones tomadas durante el diseño», y para `SPEC.md` §8. **No son definitivos** hasta que el equipo los acepte.

| # | Hallazgo | Lo que asume este plan |
|---|---|---|
| H-TP-01 | Estados de una tarea personal | `pendiente`, `hecha`, `descartada`; franja calculada |
| H-TP-02 | ¿Se pregunta la fecha? | No: solo `texto` es obligatorio |
| H-TP-03 | Fecha como día o como instante | `date` + `horaLimite` + `zonaHoraria`; el cambio de zona del perfil no toca las tareas |
| H-TP-04 | Esperando con fecha | Solo en «Esperando de alguien» (`franjaDe` mira `deQuien` primero) |
| H-TP-05 | Orden de las franjas | `ordenar()`, con su tabla de casos |
| H-TP-06 | Cuánto se ven las hechas | `HECHAS_VISIBLES_DIAS = 7` |
| H-TP-07 | Qué lleva tarjeta | Atajos `/hecha` y `/reabrir` sin tarjeta; descartar y todo lo del agente, con tarjeta |
| H-TP-08 | Crear y cambiar a mano | Solo origen `agente` |
| H-TP-09 | Tarea y agenda | Grupo propio en Hoy; sin Google, sin solapes, sin Semana ni Mes |
| H-TP-10 | Avisos | Ninguno; la tarjeta no los promete |
| H-TP-11 | Conversión y caducidad | §9; exclusión en T-041 por `convertida_en`. **Necesita aval expreso: contradice H-AG-08 tal como se decidió** |
| H-TP-12 | Límite por plan | Ninguno en esta versión |
| H-TP-13 | Tareas asignadas y encargos | Fuera de la tabla `tarea` de este plan; cuando llegue CUN-07, se decide si comparten tabla con un campo de responsable y quién delegó (`PROPUESTA-TECNICA.md` §8) o van aparte |
| H-TP-14 | «Pídele a alguien» | `tareas.registrar` con `deQuien`, y las instrucciones lo dicen |
| H-TP-15 | Recibido | `tareas.completar`, con otra acción en la tarjeta y otro texto |
| H-TP-16 | Texto mientras se convierte | Nuevo texto de `funcion_por_llegar` en T-050 |
| H-TP-17 | Conversión ilegible | Propuesta sin fecha con aviso |
| H-TP-18 | «Esta semana» | Solo con fecha en el rango, y las vencidas |
| — | Límites de longitud: texto 200, de quién 80 | Constantes en el contrato. Se revisan si la evaluación muestra textos más largos |

## 12. Verificación

| REQ | Prueba prevista | Tipo |
|---|---|---|
| CUN03-03, 06, 07 | `tareas.franja-y-orden` | Unitaria (funciones puras), con tabla de casos y una prueba que cruza un cambio de zona |
| CUN03-01, 02 | `tareas.sin-confirmar-no-registra` | Integración |
| CUN03-04, 05 | `tareas.esperando-y-recibido` | Integración |
| CUN03-09, 10 | `tareas.hecha-y-reabrir` | Integración: atajo idempotente, Operación auditada con origen `control_directo` |
| CUN03-11 | `tareas.descartar-requiere-confirmacion` | Integración |
| CUN03-12 | `tareas.modificar-muestra-antes-y-ahora` | Integración |
| CUN03-13 | `tareas.del-dia-con-vencidas` | Integración |
| CUN03-19 | `tareas.solo-las-propias`, `plataforma.aislamiento-entre-organizaciones` (ampliada) | Integración |
| CUN03-20 | `tareas.sin-calendario` | Integración |
| CUN03-18 | `tareas.consulta-sin-proveedor-de-modelo` | Integración |
| CUN03-01, 02, 16 | `agente.tareas.registra-con-tarjeta`, `agente.tareas.no-delega` | Integración, con guion |
| CUN03-14 | `agente.tareas.consulta-tal-cual` | Integración |
| CUN03-15 | `agente.tareas.completar-dice-cual` | Integración, con dos candidatas |
| CUN03-17 | `agente.tareas-en-espera-se-convierten` | Integración, con el trabajador y el simulado |
| CUN03-06, 08, 09, 10, 11 | `web.tareas-por-franja`, `movil.tareas-por-franja` | Extremo a extremo |
| CUN03-13 | `web.tareas-en-hoy`, `movil.tareas-en-hoy` | Extremo a extremo |
| CUN03-17 | `web.tareas-por-confirmar`, `movil.tareas-por-confirmar` | Extremo a extremo |

**Evaluación del modelo** (`evaluar-asistente`, se ejecuta a mano): suma «recuérdame pagar el recibo antes del sábado» (registrar con fecha), «tengo que llamar al dentista» (sin fecha, sin pregunta), «Juan tiene que enviarme el presupuesto el lunes» (esperando), «ya pagué el recibo» con dos candidatas, «¿qué tengo pendiente?» y «pídele a María Fernanda el informe» (sin delegar).


## 13. Bitácora de una tarea, ficha y aviso al vencer (T-125 a T-128)

*Añadido el 25 de noviembre de 2026* para `spec.md` §6 bis (REQ-CUN03-21 a 27), con las decisiones de Franco del mismo día: lo que falta va como texto del avance, la ficha de la tarea sirve para discernir de cuál se habla (H-TP-26) y, al vencer, la persona decide si la cierra (H-TP-28).

### 13.1 Modelo de datos (migración `20261125120000_bitacora_tarea`)

| Cambio | Contenido |
|---|---|
| Tabla nueva `avance_tarea` | `id`, `organizacion_id`, `perfil_id`, `tarea_id` (a `tarea_personal`, en cascada), `texto` (`varchar(500)`), `anotado_en` (`timestamptz`), `zona_horaria` (IANA del perfil al anotar, P-05), `operacion_origen_id` (única: confirmar dos veces anota uno). Índice por `tarea_id, anotado_en`. **Entra en `MODELOS_CON_ORGANIZACION`** |
| `tarea_personal.contexto` | `varchar(200)`, nula (REQ-CUN03-26) |
| `tarea_personal.vencimiento_atendido` | `date`, nula: la fecha para la que la persona eligió «Mantener abierta» (H-TP-31). El aviso se muestra si la tarea está vencida y esta columna no es igual a su `fecha` |

Sin escrituras anidadas: el avance se crea en su ejecutor, con su `tareaId`. La lectura de los avances de varias tareas es **una consulta aparte** por `tarea_id in (…)`, no un `include`, para que pase por el filtro de organización.

### 13.2 Operaciones (AD-09)

| Tipo | Origen | Tarjeta | Qué hace al ejecutar | REQ |
|---|---|---|---|---|
| `tareas.anotar_avance` | `agente` (R-42) | Sí: «Anotar avance», la tarea, su contexto si lo tiene, y el texto | Crea el avance. Rechaza una tarea hecha o descartada con `TAREA_NO_MODIFICABLE` («ya está hecha; si quieres seguir anotando, reábrela») | CUN03-21, 22, 25 |
| `tareas.mantener_abierta` | `control_directo` | No (H-TP-31): se propone y confirma en un paso, como «Hecho» | `vencimiento_atendido = fecha`. Solo si está pendiente, tiene fecha y está vencida | CUN03-27 |
| `tareas.registrar`, `tareas.cambiar` | (como antes) | La tarjeta suma «Contexto» | Guardan `contexto`; `null` lo quita al cambiar | CUN03-26 |

`cierreDe` da a `tareas.anotar_avance` el desenlace nuevo `anotado`, con el separador «Se anotó un avance en «…»».

### 13.3 Contratos

- `AvanceTarea`: `id`, `texto`, `anotadoEn` (ISO con desfase) y `cuando` («Martes 24 de noviembre, 18:40»), armado en la zona del perfil.
- `TareaPersonal` suma `contexto`, `bitacora` (del más reciente al más antiguo) y `avisoVencida` (`boolean`). La bitácora va dentro de la tarea: son tareas de una persona, pocas y con pocos avances; si crece, se pagina después.
- `CargaAnotarAvance` (`tareaId`, `texto`) y `contexto` en `CargaRegistrarTarea` y `CargaCambiarTarea`.
- Agente: `ArgsAnotarAvance` (`tareaId` o `tarea`, lo que dijo la persona para nombrarla, y `avance`), `ArgsTareaExistente` para `tareas.bitacora`, y `contexto` en `ArgsRegistrarTarea` y `ArgsCambiarTarea`.
- Turno nuevo `bitacora` en `TurnoAsistente` y `TurnoDeHerramienta`: `BitacoraTarea` con `tarea`, `contexto`, `avances` y `vacia`, armada por el código (H-TP-29).
- `CandidatasDeReferente` suma `avance`, opcional: el texto que se anotará en la elegida. `DesenlaceEpisodio` suma `anotado`.

### 13.4 Rutas

| Ruta | Qué hace | REQ |
|---|---|---|
| `GET /tareas`, `GET /tareas/dia`, `GET /tareas/:id` | Cada tarea trae `contexto`, `bitacora` y `avisoVencida` | CUN03-24, 26, 27 |
| `POST /tareas/:id/mantener-abierta` | `tareas.mantener_abierta` en un paso; devuelve `ControlTarea` | CUN03-27 |

«Darla por hecha» usa `POST /tareas/:id/hecha`, el mismo «Hecho» con «Deshacer».

### 13.5 Agente

| Herramienta | Qué hace |
|---|---|
| `tareas.consultar` | Al modelo le da, por cada pendiente, **su ficha**: id, texto, contexto, franja, fecha, de quién y sus tres últimos avances, marcada como datos (H-AGT-15). La lista que ve la persona no cambia |
| `tareas.anotar_avance` | Con `tareaId`, propone `tareas.anotar_avance`. Sin id, el código busca con `encajan` sobre texto, contexto y avances de cada pendiente (H-TP-26): una, propone; varias, candidatas con `avance`; ninguna entre las pendientes pero sí entre las hechas recientes, error `TAREA_HECHA` que ofrece reabrir; ninguna, `TAREA_NO_ENCONTRADA`, y el modelo pregunta |
| `tareas.bitacora` | Busca la tarea igual y devuelve el turno `bitacora`, armado por el código; con varias, candidatas con la acción «Ver cómo va». No propone nada |

- Elegir una candidata (`POST /asistente/decisiones`, `referente`) con la acción «Anotar avance» propone `tareas.anotar_avance` con el `avance` guardado en el estado del grafo; con «Ver cómo va», añade el turno `bitacora` sin proponer nada.
- El nodo `herramientas` trata el turno `bitacora` como uno de lista (como `tareas`): no cierra el episodio.
- Instrucciones: contar cómo va una tarea es `tareas_anotar_avance`, con el texto tal como lo dijo, sin resumirlo; «¿cómo va…?» es `tareas_bitacora`; lo que se dice con quién o para qué al pedir una tarea va en `contexto`.
- Guion de demostración: «sobre X: …», «avancé con X: …», «ya hablé con … : …» y «¿cómo va X?», **antes** de la regla «ya …», que es completar.

### 13.6 Pantallas (web y móvil, R-41)

- Bajo el texto de cada tarea, su contexto; debajo, el último avance («Martes 24 · Rosa pasa el precio el viernes») y el control «Ver bitácora (2)», que despliega la lista en la misma tarea.
- Sobre una tarea con `avisoVencida`: «Venció el … ¿La das por hecha o la mantienes abierta?», con «Darla por hecha» (el «Hecho» de siempre, con «Deshacer») y «Mantener abierta».
- En la conversación, el turno `bitacora`: el nombre de la tarea, su contexto y los avances con fecha, o «Esta tarea no tiene avances anotados».

### 13.7 Verificación

| REQ | Prueba | Tipo |
|---|---|---|
| CUN03-21, 26 | `agente.tareas-anotar-avance` | Integración con el simulado: con id, por la ficha (contexto y avances), candidatas, ninguna, tarea hecha |
| CUN03-22, 25 | `tareas.bitacora` | Integración: anotar, idempotencia, orden, sobrevive a la retención de la transcripción, hecha rechaza |
| CUN03-23 | `agente.tareas-bitacora` | Integración: turno armado por el código, vacía, candidatas |
| CUN03-27 | `tareas.aviso-al-vencer` | Integración: aviso, mantener abierta, vuelve con otra fecha |
| CUN03-24, 26, 27 | `web.tareas-bitacora`, `movil.tareas-bitacora` | Extremo a extremo |

### 13.8 Resumen diario de la bitácora (T-129, T-130)

*Añadido el 25 de noviembre de 2026* para REQ-CUN03-28 (H-TP-33 a 35).

| Pieza | Contenido |
|---|---|
| Datos | `tarea_personal.resumen` (`varchar(280)`, nula) y `tarea_personal.resumen_en` (`timestamptz`, nula). Migración nueva, generada con `prisma migrate diff --from-config-datasource` |
| Contratos | `ResumenBitacora` = `{ texto, en, cuando }` («Resumen al miércoles 25 de noviembre»). `TareaPersonal.resumen` y `BitacoraTarea.resumen`, nulos si no hay |
| Trabajo | `ResumenesBitacora.repasar(ahora)` en el proceso trabajador, cola `tareas-resumen-diario`, cada hora. Elige, con `sinAislar` (justificado como el ciclo de vida de 07-agente §14.8), las tareas pendientes con algún avance posterior a `resumen_en` y `resumen_en` nulo o de hace más de 24 horas. Por cada una, una llamada por `LlamadorModelo` (P-06), sin herramientas, con su costo auditado en `llamada_modelo` sin conversación. Respuesta vacía, de más de 280 caracteres o fallo: no se guarda nada |
| Instrucciones | Breves y fijas: resumir en una o dos frases cómo va la tarea y qué falta, solo con lo anotado, sin inventar ni prometer; los avances llegan marcados como datos (H-AGT-15) |
| Simulado | El guion responde a la petición de resumen con un texto fijo armado con el último avance, para las pruebas |
| Lectura | `GET /tareas`, `GET /tareas/:id` y el turno `bitacora` de «¿cómo va X?» traen el resumen guardado. Nunca se genera al leer |
| Pantallas | Sobre la bitácora, en web y móvil: «Resumen al miércoles 25 de noviembre · {texto}», con un estilo distinto del de los avances |
| Pruebas | `tareas.resumen-diario` (API: se resume con avances nuevos; no se llama sin avances nuevos ni antes de 24 horas; un fallo conserva el anterior; la llamada queda auditada) y `web.tareas-bitacora`, `movil.tareas-bitacora` ampliadas |
