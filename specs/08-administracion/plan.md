# Plan técnico — Administración de la organización

**Especificación:** `specs/08-administracion/spec.md` (REQ-ADM-01 a 32)
**Fase:** 4, primer bloque: va antes de equipos, delegación, disponibilidad y seguimiento (CUN-05 a CUN-09)
**Decisiones que aplica:** AD-01, AD-08, AD-09 · P-03, P-04, P-07, P-10, P-11 · DP-03 · H-ADM-01 a 15
**Depende de:** `specs/06-acceso/plan.md` (sesión, `ContextoSolicitud`, guardas de alcance, alta de cuentas), `specs/02-agenda/plan.md` §3 (Operaciones)
**Estado:** borrador del 6 de noviembre de 2026, pendiente de aprobación del equipo

Este plan dice **dónde y cómo** se cumple cada requisito. No añade comportamiento: lo que tuvo que decidir y la especificación no decía está en §11 y vuelve a ella.

---

## 1. Alcance

| Entra | No entra |
|---|---|
| Clase de organización, pertenencia, administrador, estado de la cuenta | Facturación y asientos (D-18) |
| Área web: personas, alta, plan, suspensión, baja, contraseña, administradores | Área en el móvil (H-ADM-10) |
| Invitación, aviso, aceptación, rechazo, caducidad, desafiliación y salida | Herramientas del agente para administrar (REQ-ADM-07) |
| Equipos, miembros y responsable; autoridad por equipo en la guardia | Tareas, hilos y disponibilidad del equipo: son de `03-tareas` y `05-equipos` (fase 4). Aquí solo se deja el punto donde se enganchan (§5.4) |
| Correo de invitación, solo aviso, por un puerto con implementación simulada | Envío real de correo (PT-3) |

## 2. Módulos

| Módulo NestJS | Responsabilidad | Expone |
|---|---|---|
| `AdministracionModule` (nuevo) | Lecturas del área, ejecutores de las Operaciones `administracion.*` y `afiliacion.*`, caducidad de invitaciones | `AdministracionController`, `AfiliacionController`, `PertenenciasRepositorio`, el evento `SalidaDeEquipo` |
| `IdentidadModule` (cambia) | Pertenencia en el ingreso y la renovación; estado de la cuenta; nuevas guardas de alcance | `ContextoSolicitud` ampliado, `@SoloAdministrador()`, `@SoloResponsable(equipo)` |
| `OperacionesModule` (cambia) | Ejecutores con ámbito de empresa y resultado efímero (§5.2) | `EjecutorOperacion` ampliado |
| `AvisosModule` (nuevo, pequeño) | Puerto `CorreoPlataforma`: correo que solo avisa (DP-03). Implementación simulada que deja registro | `CorreoPlataforma` |

`alta-cuentas.ts` de `IdentidadModule` sigue siendo el único sitio que crea cuentas: lo llaman la CLI (arranque) y el ejecutor `administracion.alta_cuenta`.

## 3. Modelo de datos

### 3.1 La pregunta: ¿la cuenta se mueve de organización al afiliarse?

Hoy toda cuenta pertenece a una organización (`perfil_usuario.organizacion_id`), y todo lo suyo lleva esa misma organización. Hay **11 tablas con `organizacionId`**: `PerfilUsuario`, `Operacion`, `ConversacionAgente`, `LlamadaModelo`, `InvocacionHerramienta`, `PuntoControlAgente`, `TurnoTranscripcion`, `ConsentimientoIntegracion`, `EventoAgenda`, `SincronizacionCalendario` y `EventoAuditoria`. Las otras dos, `Organizacion` y `SesionRenovacion`, no la llevan.

**Opción A — la cuenta se muda.** Al afiliarse, `perfil_usuario.organizacion_id` pasa a la empresa y, con ella, todas sus filas.

| Tabla | Qué hay que hacer al afiliar y al desafiliar |
|---|---|
| `PerfilUsuario` | Cambiar `organizacionId` |
| `EventoAgenda`, `SincronizacionCalendario` | Mudar toda la réplica de su agenda |
| `ConsentimientoIntegracion` | Mudar sus permisos de Google, con su token cifrado |
| `ConversacionAgente`, `TurnoTranscripcion`, `PuntoControlAgente`, `LlamadaModelo`, `InvocacionHerramienta` | Mudar todo lo que habló con el asistente y su costo |
| `Operacion` | Mudar sus Operaciones, también las pendientes y en espera |
| `EventoAuditoria` | O se muda, y el registro de la organización personal pierde su historia, o no se muda, y la historia queda partida |

Las 11, en una transacción, dos veces. Y al desafiliar hay que distinguir lo que era suyo de lo que creó dentro de la empresa, lo que obliga a marcar el origen de cada fila. Las sesiones abiertas llevan la organización vieja y hay que cerrarlas. Lo peor: **la frontera del aislamiento deja de ser la frontera de la privacidad**. Lo personal de la persona pasa a vivir dentro de la organización de la empresa, y P-10 queda en manos de que cada consulta del dominio se acuerde de filtrar por perfil.

**Opción B — la organización personal se queda y se añade una pertenencia.** La cuenta y todo lo suyo siguen en su organización personal. La afiliación es una fila nueva en la organización de la empresa.

| Tabla | Qué cambia |
|---|---|
| Las 11 con `organizacionId` | **Nada.** Ni columnas ni filas |
| `Organizacion` | Columna `tipo` |
| `PerfilUsuario` | Columna `estado` (activa, suspendida, cerrada); sin cambio de `organizacionId` |
| Nuevas: `MiembroOrganizacion`, `Equipo`, `MiembroEquipo` | Llevan `organizacionId` de la empresa y entran en `MODELOS_CON_ORGANIZACION` |

El costo de B: una cuenta afiliada trabaja con **dos organizaciones**, la suya para lo suyo y la de la empresa para lo del equipo. El contexto de solicitud lleva las dos (§4.1), y leer algo que cruza la frontera, como la pertenencia de una persona o, en la fase 4, su libre u ocupado, pasa por funciones concretas y justificadas (§4.3).

**Se elige B.** No toca ninguna de las 11 tablas, desafiliar no mueve nada (REQ-ADM-25: «nada de lo suyo se toca» se cumple por construcción) y la frontera del aislamiento sigue siendo la de P-10 para las cuentas afiliadas: la empresa no puede leer lo de la persona porque está en otra organización. El costo de dos organizaciones en el contexto es acotado y queda en un solo repositorio.

**Las cuentas propias no cambian.** Una cuenta que da de alta la empresa vive en la organización de la empresa, como hoy las que crea la CLI con `--organizacion`. Para ellas P-10 sigue dependiendo de las reglas de REQ-ACC-17, como hasta ahora. Darle a cada cuenta propia su organización personal extendería la garantía, pero obligaría a mudar los datos de las cuentas que ya existen (la opción A, en pequeño). Queda como pregunta para el equipo (§11, H-ADM-19).

### 3.2 Tablas y columnas

| Tabla | Campos | Notas |
|---|---|---|
| `organizacion` (cambia) | + `tipo` (`personal` · `empresa`) | REQ-ADM-01. Una personal tiene exactamente una cuenta |
| `perfil_usuario` (cambia) | + `estado` (`activa` · `suspendida` · `cerrada`), + `estado_cambiado_en` | REQ-ADM-12, 13. `plan` pasa a significar **plan propio**; el plan efectivo se calcula (§4.2). `rol` queda **en desuso** (§3.4) |
| `miembro_organizacion` (nueva) | `id`, `organizacion_id` (empresa), `perfil_id`, `origen` (`alta` · `afiliacion`), `estado` (`invitada` · `vigente` · `rechazada` · `caducada` · `retirada`), `administrador` (bool), `equipos_propuestos` (uuid[]), `invitada_por`, `invitada_en`, `respondida_en`, `retirada_en`, `motivo_retiro` (`administrador` · `persona` · `baja`) | Una fila por cuenta propia (`alta`, nace `vigente`) y por invitación (`afiliacion`, nace `invitada`). Índices únicos parciales: un `vigente` por perfil en todo el sistema (H-ADM-04) y un `invitada` o `vigente` por organización y perfil |
| `equipo` (nueva) | `id`, `organizacion_id`, `nombre`, `creado_en` | Único (`organizacion_id`, `nombre`) (REQ-ADM-28). EN-05 |
| `miembro_equipo` (nueva) | `id`, `organizacion_id`, `equipo_id`, `perfil_id`, `responsable` (bool), `desde` | Único (`equipo_id`, `perfil_id`); único parcial (`equipo_id`) donde `responsable` (H-ADM-09) |

Los índices parciales se escriben a mano en el SQL de la migración (Prisma no los declara). Las tres tablas nuevas entran en `MODELOS_CON_ORGANIZACION`; si no, falla `plataforma.aislamiento-entre-organizaciones`.

### 3.3 Migración de los datos que ya existen

Solo hay bases de desarrollo y de pruebas, pero la migración tiene que dejarlas coherentes:

1. Una organización con una sola cuenta y rol `usuario_personal` pasa a `personal`; las demás, a `empresa`.
2. Cada cuenta de una organización de empresa recibe su `miembro_organizacion` con `origen = alta` y `estado = vigente`.
3. Para no dejar ninguna empresa sin administrador (REQ-ADM-03), la cuenta `gerente` más antigua de cada una pasa a administradora; si no tiene, la más antigua.
4. Todas las cuentas quedan `activa`.

La semilla (`plataforma/semilla.ts`) y `e2e/cuentas.json` se ajustan a lo mismo, con una cuenta administradora, una personal sin afiliar y una personal con invitación pendiente.

**CLI de arranque** (`crear-cuenta.ts`, REQ-ADM-04): `--nueva-organizacion` gana `--tipo personal|empresa` (por defecto `personal` si el plan es gratuito o personal, `empresa` si es empresarial) y `--administrador`, que solo vale con una organización de empresa. Con `--nueva-organizacion` de tipo empresa, la primera cuenta es administradora aunque no se indique. `AGENTS.md` cambia la línea del comando.

### 3.4 Qué pasa con `rol`

Con `MiembroEquipo.responsable`, el rol de la cuenta sobra: `usuario_personal` es «sin pertenencia vigente», `gerente` es «responsable de algún equipo» y `colaborador` es «miembro de un equipo del que no es responsable». La columna **se conserva en desuso** mientras T-026 y sus pruebas dependan de ella; la guarda deja de leerla en T-073 (§4.2). Retirar la columna y el enum es una tarea aparte, cuando las enmiendas a REQ-ACC-01, 02, 13 y 15 estén aceptadas (`entregas/INFORME-CARRIL-ADMIN.md`).

## 4. Contexto, guardas y lecturas entre organizaciones

### 4.1 Contexto de solicitud

```ts
interface ContextoSolicitud {
  perfilId: string;
  organizacionId: string;           // la organización de la cuenta: lo suyo vive aquí
  plan: Plan;                       // plan efectivo (§4.2)
  rol: Rol;                         // en desuso desde T-073
  primerIngresoPendiente: boolean;
  empresa: { organizacionId: string; miembroId: string; origen: 'alta' | 'afiliacion' } | null;
}
```

Para una cuenta propia, `empresa.organizacionId === organizacionId`. Para una afiliada, son distintas. Para una personal sin afiliar, `empresa` es nulo.

**Lo que no va en el token:** si la cuenta es administradora y de qué equipos es responsable. Eso se lee de la base en cada petición que lo necesita, para que quitar la autoridad surta efecto en la petición siguiente y no a los 15 minutos (P-04).

### 4.2 Ingreso, renovación y guardas

- **Ingreso y renovación** leen la pertenencia vigente del perfil y calculan el plan efectivo: con afiliación vigente, `empresarial` (H-ADM-06); si no, `perfil_usuario.plan`. Una cuenta con `estado` distinto de `activa` no recibe tokens: tras verificar la contraseña responde `CUENTA_SUSPENDIDA` o `CUENTA_CERRADA` (403), y con contraseña errónea, el `CREDENCIALES_INVALIDAS` de siempre (REQ-ACC-03, REQ-ADM-12).
- **Suspender, cerrar o restablecer la contraseña** revoca todas las familias de `sesion_renovacion` del perfil. Además, `AutenticacionGuard` comprueba `perfil_usuario.estado` en cada petición (una lectura por clave primaria), para que la sesión deje de valer en la siguiente petición y no al caducar el acceso.
- **Alcances de ruta.** `AlcanceRuta` pasa a `'propio' | 'empresa' | 'responsable' | 'administrador'`. La prueba `acceso.toda-ruta-declara-su-alcance` sigue exigiendo que toda ruta declare uno.
  - `@SoloAdministrador()`: `AlcanceGuard` (nuevo nombre de `RolGuard`) lee `miembro_organizacion` vigente con `administrador = true` en `contexto.empresa`. Si no, `ADMINISTRACION_NO_PERMITIDA` (403) y un evento `administracion.rechazada` (REQ-ADM-06, 16).
  - `@EnEmpresa()`: exige pertenencia vigente; si no, `SIN_ORGANIZACION` con el texto de REQ-ADM-17.
  - `@SoloResponsable(resolverEquipo)`: **desde T-073**, recibe una función que saca el equipo afectado de la petición y comprueba `miembro_equipo.responsable` en ese equipo. Sin equipo resoluble, se rechaza. Así se cierra «Rol por equipo» (`SPEC.md` §8) y `specs/06-acceso/plan.md` §5.5.
- **Operaciones.** `EjecutorOperacion` gana `soloAdministrador` y `soloResponsable` con su `resolverEquipo`; `POST /operaciones` los comprueba al proponer y otra vez al confirmar, como ya hace con `soloResponsable` (T-026).

### 4.3 Lecturas que cruzan organizaciones (`sinAislar`, justificado)

`AGENTS.md` exige justificar aquí cada uso. Todos viven en `PertenenciasRepositorio` y ninguno escribe en la organización personal de nadie.

| Uso | Por qué no basta `deOrganizacion` | Qué lee, y nada más |
|---|---|---|
| Ingreso y renovación | Se busca la pertenencia de un perfil antes de saber a qué empresa pertenece | `miembro_organizacion` vigente por `perfil_id` |
| La persona ve sus invitaciones (`GET /afiliacion`) | Las filas están en la organización de la empresa, no en la suya | Sus filas por `perfil_id`, más el **nombre** de la organización y de los equipos propuestos |
| El administrador ve sus cuentas afiliadas | El perfil de una afiliada está en su organización personal | `correo` y `estado` del perfil, por los `perfil_id` de sus pertenencias. Nunca zona horaria, consentimientos ni nada más (REQ-ADM-08) |
| Invitar (REQ-ADM-18, 19) | Hay que saber si el correo tiene cuenta, sea de la organización que sea | `id` del perfil por `correo`, y si tiene una pertenencia vigente en otra empresa. No se devuelve al administrador nada de eso salvo «tiene cuenta» (H-ADM-14) |

Una prueba, `administracion.no-escribe-en-lo-personal`, ejecuta todas las Operaciones del área contra una cuenta afiliada y comprueba que su organización personal tiene exactamente las mismas filas antes y después.

## 5. Operaciones de administración (AD-09)

### 5.1 Tipos

Todas con origen `control_directo` solamente: el agente no las tiene como herramientas y `POST /operaciones` rechaza el origen `agente` (REQ-ADM-07). Las `administracion.*` son `soloAdministrador`. Las `afiliacion.*` son de lo propio de quien la recibe.

| Tipo | Carga | Requisitos | Irreversible en la tarjeta |
|---|---|---|---|
| `administracion.alta_cuenta` | `{ correo, plan, administrador? }` | ADM-09, 10 | — |
| `administracion.cambiar_plan` | `{ perfilId, plan }` | ADM-11, 15 | — |
| `administracion.suspender_cuenta` · `reactivar_cuenta` | `{ perfilId }` | ADM-12, 15 | — |
| `administracion.cerrar_cuenta` | `{ perfilId }` | ADM-13, 15 | Sí |
| `administracion.restablecer_contrasena` | `{ perfilId }` | ADM-14, 15 | La contraseña anterior deja de valer |
| `administracion.nombrar_administrador` · `quitar_administrador` | `{ perfilId }` | ADM-03 | — |
| `administracion.invitar` | `{ correo, equipoIds[] }` | ADM-18, 19 | — |
| `administracion.retirar_invitacion` | `{ miembroId }` | ADM-22 | — |
| `administracion.desafiliar` | `{ perfilId }` | ADM-25 | Sí, con lo que les pasa a sus tareas |
| `administracion.crear_equipo` | `{ nombre }` | ADM-28 | — |
| `administracion.anadir_a_equipo` · `quitar_de_equipo` | `{ equipoId, perfilId }` | ADM-29, 31 | Quitar: sí |
| `administracion.nombrar_responsable` | `{ equipoId, perfilId }` | ADM-30 | — |
| `afiliacion.aceptar` · `afiliacion.rechazar` | `{ miembroId }` | ADM-21, 22, 24 | — |
| `afiliacion.salir` | — | ADM-26, 27 | Sí |

Cada propuesta comprueba lo que dice la especificación antes de poder confirmarse: que la cuenta sea propia (REQ-ADM-15), que no quede la organización sin administrador (REQ-ADM-03), que el miembro pertenezca a la organización (REQ-ADM-29), que no haya otra afiliación vigente (REQ-ADM-24). Lo que no se cumple se muestra como no confirmable, con el motivo (`motivoNoConfirmable`), y no se crea nada.

### 5.2 Dos ampliaciones de Operaciones

- **Ámbito de empresa.** Un ejecutor declara `ambito: 'empresa'`, y la Operación se guarda con `organizacionId = contexto.empresa.organizacionId`. Así las acciones de un administrador afiliado quedan en la empresa, no en su organización personal, y el registro de la empresa está completo. Las `afiliacion.*` también son de ámbito empresa: su fila de pertenencia está allí.
- **Resultado efímero.** `ResultadoEjecucion` gana `efimero?`, que viaja en la respuesta de `POST /operaciones/:id/confirmar` y **nunca se guarda** en `operacion.resultado`. La contraseña temporal del alta y del restablecimiento va ahí. Confirmar dos veces devuelve el resultado guardado, sin la contraseña: «se muestra una sola vez» (REQ-ADM-09, 14) lo garantiza la idempotencia que ya existe.

### 5.3 Caducidad de las invitaciones

Una invitación con `invitada_en` de hace más de 14 días se **lee** como caducada aunque su fila diga `invitada`, y no se puede aceptar. El trabajador pasa a `caducada` las vencidas una vez al día y deja `afiliacion.caducada`. Así la regla no depende de que el trabajo se ejecute a tiempo (H-ADM-03).

### 5.4 Al salir alguien de un equipo

Desafiliar, cerrar una cuenta y quitar de un equipo emiten un evento interno `SalidaDeEquipo { organizacionId, equipoId, perfilId, motivo }` **dentro de la misma transacción** que la Operación. Hoy no lo escucha nadie, porque las tareas, los hilos y la disponibilidad del equipo no existen. En la fase 4, `03-tareas` lo escuchará para dejar sin persona asignada las tareas abiertas (H-ADM-08) y `05-equipos`, para dejar de leer su disponibilidad. Los hilos no cambian: siguen en la empresa y el autor de cada mensaje no se toca. Por eso REQ-ADM-13, 25 y 31 quedan **en curso** hasta que existan esos módulos.

## 6. Contratos y rutas

Esquemas nuevos en `packages/contratos/src/administracion.ts` (AD-08).

| Ruta | Alcance | Contrato | Requisitos |
|---|---|---|---|
| `GET /administracion/personas` | administrador | `PersonaOrganizacion[] { perfilId?, miembroId, correo, clase: 'propia' \| 'afiliada' \| 'invitacion', estado, plan, equipos: { id, nombre, responsable }[], administrador }` | ADM-08 |
| `GET /administracion/equipos` | administrador | `EquipoOrganizacion[] { id, nombre, responsable?: { perfilId, correo }, miembros: { perfilId, correo }[] }` | ADM-28 a 32 |
| `GET /afiliacion` | propio | `MiAfiliacion { invitaciones: InvitacionRecibida[] { miembroId, organizacion, equipos: string[], caducaEn, puedeAceptar, motivo? }, pertenencia: { organizacion, origen, equipos: string[] } \| null }` | ADM-20, 24, 26, 27 |
| `GET /auth/sesion` (cambia) | propio | `SesionActual` gana `administrador: boolean` y `organizacion: { nombre, tipo } \| null`, leídos de la base | ADM-05 |
| `POST /operaciones` y `/:id/confirmar` (cambian) | según el tipo | Cargas de §5.1; `OperacionRespuesta` gana `efimero?: { contrasenaTemporal }` | ADM-09 a 32 |

`administrador` en la sesión solo sirve para que la web pinte la entrada. Quien decide es la guarda (P-04).

**Errores nuevos** (`ErrorApi`): `ADMINISTRACION_NO_PERMITIDA`, `SIN_ORGANIZACION`, `CUENTA_SUSPENDIDA`, `CUENTA_CERRADA`.

## 7. Pantallas web

**Entrada.** En `aplicacion.tsx`, un botón más al pie de la navegación de 72 px, encima de Ajustes y con su misma forma, con `aria-label="Administración"`. Solo aparece si la sesión dice `administrador`. No entra en `SECCIONES` de `secciones.ts`: las secciones son tres (R-32, H-ADM-10).

**Ruta `/administracion`.** Página de servidor, como `/`: lee la sesión y `GET /administracion/personas`; si la API responde 403, vuelve a `/`. Disposición: la navegación de 72 px y un único lienzo de 1368 px, como el lienzo expandido (`design/ARQUITECTURA-VISUAL-WEB.md` §3), **sin columna de conversación**. Cabecera con dos cortes, «Personas» y «Equipos».

| Corte | Contenido | Acciones |
|---|---|---|
| Personas | Tabla con correo, «De la organización» o «Se sumó con su cuenta», estado, plan, equipos y «Administra». Las invitaciones pendientes, al principio | «Dar de alta» e «Invitar» en la cabecera. En cada fila, solo lo que vale para su clase (REQ-ADM-15): para las propias, cambiar plan, suspender o reactivar, dar de baja, restablecer contraseña, administrar; para las afiliadas, «Quitar de la organización»; para las invitaciones, «Retirar invitación» |
| Equipos | Una tarjeta por equipo con su responsable y sus miembros; «Sin responsable» destacado (REQ-ADM-32) | «Crear equipo»; en cada tarjeta, añadir miembro, quitar, nombrar responsable |

**Confirmación.** Cada acción propone su Operación con una acción de servidor y pinta la tarjeta con la `vistaConfirmacion` que devuelve la API, sin calcular nada, igual que `cambio-zona.tsx` (T-027). La contraseña temporal se pinta una vez, con «Copiar», y desaparece al cerrar la tarjeta.

**Aviso de afiliación (REQ-ADM-20).** En `/`, para toda cuenta con invitación pendiente: el componente `aviso` del lienzo, sin cierre mientras siga pendiente, «Acme quiere sumarte a su organización · Ver invitación». «Ver invitación» abre una capa con qué cambia y qué no, y «Aceptar» o «Rechazar», cada uno con su tarjeta. Tras desafiliar o salir, un aviso que sí se cierra: «Ya no perteneces a Acme». En Ajustes, para una afiliada, la fila «Organización» con «Salir de Acme» (REQ-ADM-26); para una propia, la fila sin acción (REQ-ADM-27). **Móvil:** el mismo aviso y la misma capa en `inicio.tsx`, sobre la sección actual.

Colores, tipografía y espaciado, con las variables de `globales.css` y `apps/movil/src/tokens.ts`. Sin dependencias nuevas.

## 8. Correo de invitación (DP-03)

Puerto `CorreoPlataforma.avisar({ para, asunto, cuerpo })`, que sale desde la dirección de la plataforma, nunca desde el Gmail de nadie: no necesita `gmail.send` (P-08). Esta versión solo trae la implementación **simulada**: no envía nada y deja `correo.aviso` en la auditoría con el destinatario y el asunto. La real depende de PT-3 y servirá también para el aviso de delegación (REQ-CUN07-16).

| Campo | Texto |
|---|---|
| Asunto | «Acme te invitó a sumarte a su organización en NexoAI» |
| Cuerpo | «Acme quiere sumarte a su organización, en el equipo Ventas. Entra en NexoAI para ver qué cambia y decidir. Tu agenda y tus tareas siguen siendo tuyas.» Sin botones, sin enlaces con token y sin dirección de respuesta (`Reply-To` a una dirección que no se lee) |

## 9. Auditoría

Todo en `evento_auditoria` de la **organización de la empresa**, con `perfilId` de quien actuó y `detalle: { perfilAfectado?, equipoId?, antes?, despues? }`. Nunca una contraseña.

`administracion.cuenta-creada` · `administracion.plan-cambiado` · `administracion.cuenta-suspendida` · `administracion.cuenta-reactivada` · `administracion.cuenta-cerrada` · `administracion.contrasena-restablecida` · `administracion.administrador-nombrado` · `administracion.administrador-retirado` · `administracion.rechazada` · `afiliacion.invitada` · `afiliacion.aceptada` · `afiliacion.rechazada` · `afiliacion.caducada` · `afiliacion.retirada` · `afiliacion.salida` · `equipo.creado` · `equipo.miembro-anadido` · `equipo.miembro-quitado` · `equipo.responsable-nombrado` · `correo.aviso`.

## 10. Verificación

| Requisito | Componente | Prueba prevista | Tipo |
|---|---|---|---|
| ADM-01 | Migración y CLI | `administracion.clases-de-organizacion` | Integración |
| ADM-02 | Lecturas del área | `administracion.administrar-no-es-ver` | Integración |
| ADM-03 | Validación de las propuestas | `administracion.nunca-sin-administrador` | Integración |
| ADM-04 | CLI de arranque | `administracion.primer-administrador-en-el-arranque` | Integración |
| ADM-05 | Entrada en la navegación | `web.administracion-solo-para-administradores` | Extremo a extremo |
| ADM-06 | `@SoloAdministrador()` | `administracion.solo-el-administrador` | Integración |
| ADM-07 | Orígenes de los tipos | `administracion.el-asistente-no-administra` | Integración |
| ADM-08 | `GET /administracion/personas` | `administracion.lista-de-personas` | Integración |
| ADM-09, 10 | `administracion.alta_cuenta` | `administracion.alta-con-contrasena-una-vez` | Integración |
| ADM-11 | `administracion.cambiar_plan` | `administracion.cambio-de-plan` | Integración |
| ADM-12 | Estado de la cuenta en el ingreso y en cada petición | `administracion.suspension-cierra-sesiones` | Integración |
| ADM-13 | `administracion.cerrar_cuenta` | `administracion.baja-definitiva` | Integración |
| ADM-14 | `administracion.restablecer_contrasena` | `administracion.restablecer-contrasena` | Integración |
| ADM-15 | Validación por clase de cuenta | `administracion.cuenta-afiliada-no-se-administra` | Integración |
| ADM-16 | Operaciones y auditoría | `administracion.toda-accion-confirmada-y-registrada` | Integración |
| ADM-17 | Plan efectivo y `@EnEmpresa()` | `afiliacion.sin-afiliar-es-plan-personal` | Integración |
| ADM-18, 19 | `administracion.invitar` y `CorreoPlataforma` | `afiliacion.invitacion-y-correo-de-aviso` | Integración |
| ADM-20 | Aviso web y móvil | `web.aviso-de-afiliacion`, `movil.aviso-de-afiliacion` | Extremo a extremo |
| ADM-21 | `afiliacion.aceptar` | `afiliacion.aceptar-no-mueve-nada` · y `administracion.no-escribe-en-lo-personal` | Integración |
| ADM-22 | Caducidad y `afiliacion.rechazar` | `afiliacion.rechazo-y-caducidad` | Integración |
| ADM-23 | Ninguna ruta afilia sin aceptación | `afiliacion.sin-aceptacion-no-hay-afiliacion` | Integración |
| ADM-24 | Índice único parcial y propuesta | `afiliacion.una-empresa-a-la-vez` | Integración |
| ADM-25, 26 | `administracion.desafiliar`, `afiliacion.salir`, `SalidaDeEquipo` | `afiliacion.desafiliar-y-salir` | Integración |
| ADM-27 | Validación por origen | `afiliacion.cuenta-propia-no-sale` | Integración |
| ADM-28 a 31 | Ejecutores de equipo | `equipos.crear-y-componer`, `equipos.un-responsable` | Integración |
| ADM-30, 32 | `@SoloResponsable(equipo)` | `equipos.autoridad-por-equipo` | Integración |

## 11. Hallazgos — vuelven a la especificación

Decisiones que este plan tuvo que tomar. Continúan la numeración de `spec.md` §7 y **no son definitivas** hasta que el equipo las acepte.

| # | Hallazgo | Lo que asume este plan |
|---|---|---|
| H-ADM-16 | Dónde vive lo de una cuenta afiliada | En su organización personal, sin moverse (§3.1, opción B) |
| H-ADM-17 | Cuánto tarda en surtir efecto quitar una autoridad o suspender | En la petición siguiente: administrador, responsable y estado de la cuenta se leen de la base, no del token (§4.1, §4.2) |
| H-ADM-18 | Dónde se guardan las Operaciones de un administrador afiliado | En la organización de la empresa (§5.2) |
| H-ADM-19 | Si las cuentas propias también tendrían que tener su organización personal | No en esta versión: viven en la empresa, como hoy (§3.1) |
| H-ADM-20 | Qué hacer con `rol` | Queda en desuso; la guarda deja de leerlo en T-073; se retira cuando se acepten las enmiendas (§3.4) |
| H-ADM-21 | Quién es administrador al migrar los datos existentes | El gerente más antiguo de cada empresa, o la cuenta más antigua (§3.3) |
