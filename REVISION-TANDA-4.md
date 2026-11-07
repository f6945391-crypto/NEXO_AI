# Revisión independiente de la tanda 4

**Qué se revisó:** la rama `revision-t4` (= `base-tanda4`, commit `7489943`), contra `base-4a2b3f7`. Áreas: `08-administracion` (T-065 a T-069), `09-tareas-personales` (T-046 a T-055), `02-jornada` §8 bis (T-080 a T-083) y `ESTRUCTURA-PERFIL-EMPRESARIAL.md`.
**Cómo:** solo leyendo código, migraciones, pruebas y documentos. No se ejecutó nada (no hay `node_modules`). Lo que se afirma sobre el comportamiento sale de leer el código, no de verlo correr.
**Quién:** Claude, como revisor que no participó en la construcción. **Fecha:** 7 de noviembre de 2026.
**Para quién:** el equipo (Franco, Aixa, Vasco), que presenta esto en el Entregable 2 de Diseño de Software, y Claude Code, que aplicará las correcciones.

---

## Índice

1. [Veredicto](#veredicto)
2. [Seguridad y aislamiento de la zona de empresa](#1-seguridad-y-aislamiento-de-la-zona-de-empresa) — RT-01 a RT-06
3. [Operaciones (AD-09)](#2-operaciones-ad-09) — RT-07 a RT-09
4. [Modelo y migraciones](#3-modelo-y-migraciones) — RT-10 a RT-15
5. [Agente](#4-agente) — RT-16 a RT-18
6. [Web y móvil](#5-web-y-móvil) — RT-19 a RT-24
7. [Pruebas](#6-pruebas) — RT-25
8. [Coherencia documental](#7-coherencia-documental) — RT-26 a RT-31
9. [Correcciones ordenadas para Claude Code](#correcciones-ordenadas-para-claude-code)
10. [Preguntas que solo el equipo puede responder](#preguntas-que-solo-el-equipo-puede-responder)

Severidades: **bloquea** (no se integra sin corregirlo) · **alta** (corregir antes de presentar) · **media** (corregir en la tanda siguiente) · **baja** (cuando se toque el archivo).

---

## Veredicto

**No se aplica a `master` tal cual.** El código es, en general, cuidadoso: la separación de sesiones funciona en los dos sentidos y está probada, el estado de la cuenta y la condición de administrador se leen de la base en cada petición, la contraseña temporal no se guarda en ningún sitio y las tareas personales están aisladas por perfil. Pero hay un bloqueo de método y cuatro problemas altos.

**Bloquea (1):**
- **RT-26.** `SPEC.md` no recoge nada de la tanda 4: sigue en la versión 2.20.1 del 6 de noviembre, sin las áreas 08 y 09 en §5, con CUN-03 «Parcial», sin los hallazgos H-ADM, H-TP y H-EMP en §8 y sin INC nuevas en §9. `AGENTS.md` exige actualizarlo en el mismo turno. Es la fuente de verdad del proyecto y lo que se presenta.

**Alta, antes de presentar (4):**
- **RT-01.** La sección Actividad de la aplicación muestra las acciones de Administración de un administrador con cuenta propia. Rompe la separación de zonas (H-ADM-26).
- **RT-02.** «Nunca sin administrador» se comprueba al confirmar, pero sin bloqueo: dos confirmaciones a la vez pueden dejar la empresa sin nadie (REQ-ADM-03).
- **RT-07.** El origen `agente` lo declara el cliente en `POST /operaciones`. Cualquier cliente crea tareas sin el asistente (R-42, P-11, P-04), y la prueba que dice cubrirlo no lo cubre.
- **RT-10.** Las cuatro migraciones están escritas a mano, contra `AGENTS.md`. Hay que comprobar que no difieren del esquema y que la siguiente migración generada no borrará los índices únicos parciales.

**Lo demás** (6 medias de seguridad, modelo y pruebas; el resto bajas) puede ir en la tanda siguiente, con su orden en la [lista final](#correcciones-ordenadas-para-claude-code).

| Severidad | Hallazgos |
|---|---|
| Bloquea | RT-26 |
| Alta | RT-01, RT-02, RT-07, RT-10 |
| Media | RT-03, RT-04, RT-08, RT-11, RT-12, RT-13, RT-16, RT-19, RT-20, RT-25, RT-27, RT-28, RT-29 |
| Baja | RT-05, RT-06, RT-09, RT-14, RT-15, RT-17, RT-18, RT-21, RT-22, RT-23, RT-24, RT-30, RT-31 |

---

## 1. Seguridad y aislamiento de la zona de empresa

### Lo que está bien

- **Sesión de la aplicación en la zona, y al revés:** rechazada con `AMBITO_INCORRECTO`. `AutenticacionGuard` compara el `amb` del token con el ámbito de la ruta, y sin declarar la ruta es `propio` (`guardas.ts:79-80`). Todos los controladores de la zona llevan `@ZonaEmpresa()` en la clase. Probado en los dos sentidos (`test/administracion/sesion.spec.ts:91-102`, `cuentas.spec.ts:118-124`).
- **Estado de la cuenta en cada petición:** una lectura por clave primaria (`guardas.ts:74-77`), y la renovación tampoco sirve a una cuenta suspendida (`autenticacion.service.ts:101`).
- **Administrador y responsable, leídos de la base** (`pertenencias.ts`); quitar la condición surte efecto en la petición siguiente y corta la renovación de la zona (`autenticacion.service.ts:181-184`). Probado.
- **Cookie de la zona:** `httpOnly`, `sameSite: 'lax'`, `secure` en producción y `path: '/administracion'`, con nombre propio (`(empresa)/administracion/_comun/sesion.ts:17-19`). La vuelta tras renovar solo acepta rutas de la zona (`sesion/renovar/route.ts:84`).
- **Entrada de la zona:** a quien no puede entrar, el mismo `CREDENCIALES_INVALIDAS` (`autenticacion.service.ts:82-85`). Probado.
- **Contraseña temporal:** viaja solo en `efimero`, no se guarda en `operacion.resultado`, ni en la auditoría, ni en la vista de confirmación. Probado (`cuentas.spec.ts:154-168`, `267-296`).
- **El administrador no escribe en lo personal de una afiliada.** Probado fila a fila (`cuentas.spec.ts:299-336`).
- **Cada `sinAislar` nuevo está justificado** en el plan §4.3 y lee lo que dice: `vigenteDe` (pertenencias.ts), `cuentasDe` y `correoTieneCuenta` (lecturas.ts) y `revocarSesionesDelPerfil` (autenticacion.service.ts:32-34). Matiz en RT-05.

### RT-01 · Actividad muestra las acciones de Administración · **alta**

- **Dónde:** `apps/api/src/actividad/consulta-actividad.service.ts:102-104`.
- **Qué pasa:** el registro de Actividad lee las Operaciones `ejecutada` de la persona en `contexto.organizacionId`, sin filtrar por `ambito`. Para un administrador con **cuenta propia**, su organización es la de la empresa, y las Operaciones de la zona (`ambito = 'empresa'`) viven ahí con su `perfilId`. Así, en la sección Actividad de la aplicación aparece «Dar de alta una cuenta de la organización», «Suspender una cuenta», con los correos de otras personas. Para una administradora **afiliada** no aparecen (viven en otra organización): el mismo uso da dos resultados según la clase de cuenta.
- **Por qué importa:** plan §7 y §7.3 («nada de esa zona entra en la aplicación del usuario»); H-ADM-26 («no aparecen en lo pendiente ni en la conversación de la persona»); REQ-CUN02-34. Se coló al integrar: Actividad y Administración se construyeron en carriles paralelos, y el filtro por ámbito solo se puso en `OperacionesService`.
- **Corrección:** añadir `ambito: 'propio'` al `where` de `registro()` (línea 103). Añadir a `actividad.solo-lo-propio` un caso con una cuenta propia administradora que ejecuta una Operación de la zona, y comprobar que no sale.

### RT-02 · «Nunca sin administrador» admite una carrera · **alta**

- **Dónde:** `apps/api/src/administracion/ejecutores-cuentas.ts:71-75` (`ejecutar` evalúa y después aplica), `98-101` (`dejariaSinAdministrador`); `lecturas.ts:116-123` (`otrosAdministradoresActivos`); `operaciones.service.ts:143-147` (la reclamación es por Operación, no por empresa).
- **Qué pasa:** la regla sí se comprueba al confirmar, no solo al proponer: `ejecutar` vuelve a llamar a `evaluar`. Pero la comprobación y la escritura no son atómicas. Con dos administradores, A y B: A confirma «quitar a B» y B confirma «quitar a A» (o «suspender»), a la vez. Cada evaluación ve al otro activo; las dos se aplican; la empresa queda sin administrador. La reclamación atómica de `confirmar` evita repetir **una** Operación, no dos distintas sobre la misma empresa.
- **Por qué importa:** REQ-ADM-03 («SI una acción dejara a la organización sin ningún administrador activo, ENTONCES la rechazará sin hacer nada»). El encargo lo pregunta expresamente. Recuperarlo exige la CLI.
- **Corrección:** ejecutar `evaluar` + `aplicar` de los tipos que pueden quitar un administrador (`quitar_administrador`, `suspender_cuenta`, `cerrar_cuenta`) en una transacción interactiva que empiece bloqueando la fila de la empresa (por ejemplo, un `update` sin cambios reales sobre `organizacion` con su `id`, que serializa las transacciones concurrentes sin SQL a mano), o con `isolationLevel: 'Serializable'` y un reintento ante el error de serialización. Añadir a `administracion.nunca-sin-administrador` un caso con dos confirmaciones en `Promise.all` que termine con un administrador.

### RT-03 · Restablecer la contraseña no corta el acceso en curso · **media**

- **Dónde:** `apps/api/src/identidad/guardas.ts:58-77`; `autenticacion.service.ts:13` (acceso de 15 minutos); `administracion/ejecutores-cuentas.ts:294-304`.
- **Qué pasa:** restablecer revoca las renovaciones, pero el token de acceso ya emitido sigue valiendo hasta 15 minutos. La guarda solo mira `estado`, y una cuenta con la contraseña restablecida sigue `activa`. Con suspender y cerrar no pasa, porque cambian `estado`.
- **Por qué importa:** REQ-ADM-14 («cerrará las sesiones abiertas de esa cuenta»). El caso de uso típico es una contraseña comprometida: quien la tiene sigue dentro 15 minutos. La prueba (`cuentas.spec.ts:233-245`) solo comprueba la renovación.
- **Corrección:** en la misma lectura de `AutenticacionGuard`, traer también `debeCambiarContrasena` y rechazar con 401 si es verdadero y el token dice `pi: false`. Mejor aún, a medio plazo: una columna `sesiones_validas_desde` en `perfil_usuario`, comparada con el `iat` del token, que sirve para todo cierre de sesiones. Añadir el caso a la prueba.

### RT-04 · Una afiliada puede ser nombrada administradora sin aceptarlo · **media**

- **Dónde:** `apps/api/src/administracion/ejecutores-cuentas.ts:312-338`; `specs/08-administracion/spec.md:601` (H-ADM-28) frente a `:578` (H-ADM-05).
- **Qué pasa:** `nombrar_administrador` vale para una cuenta afiliada. H-ADM-05 dice que sobre una afiliada la empresa «solo puede desafiliarla». H-ADM-28 lo reinterpreta («es una condición de la pertenencia») sin pasar por el equipo.
- **Por qué importa:** la persona afiliada recibe, sin consentir, autoridad sobre cuentas ajenas y acceso a sus correos (REQ-ADM-08). Va contra el espíritu de REQ-ADM-23 y R-14 (nada sobre la cuenta de la persona sin su sí). Es una decisión anotada que cambia otra decisión de la especificación.
- **Corrección:** hasta que el equipo decida, que `nombrar_administrador` sobre una afiliada salga no confirmable con el motivo de `TEXTOS.afiliada`. Si el equipo lo quiere, hacerlo como invitación que la persona acepta, igual que la afiliación.

### RT-05 · `cuentasDe` lee más pertenencias de las que dice · **baja**

- **Dónde:** `apps/api/src/administracion/lecturas.ts:37` y `:59-65`.
- **Qué pasa:** el filtro `pertenencias: { some: { organizacionId } }` acepta cualquier estado (`rechazada`, `caducada`, `retirada`). El plan §4.3 dice «por los `perfil_id` de sus pertenencias»; el código dice «que tienen o tuvieron». Además, el comentario de la cabecera (línea 37) dice que es «la única lectura con `sinAislar`», y no lo es: también `correoTieneCuenta` (línea 101).
- **Por qué importa:** hoy no se expone nada (las lecturas solo muestran `vigente` e `invitada`), pero `estado` de la cuenta de alguien que rechazó la invitación queda a un `map` de distancia. `AGENTS.md` exige que cada uso de `sinAislar` esté justificado y acotado.
- **Corrección:** filtrar `estado: { in: ['vigente', 'invitada'] }`, o escribir «o tuvieron» en el plan §4.3 si el registro lo necesita. Corregir el comentario.

### RT-06 · El límite de intentos se cuenta por ruta · **baja**

- **Dónde:** `apps/api/src/identidad/guardas.ts:149-159`; `ingreso-empresa.controller.ts:248-249`.
- **Qué pasa:** `ThrottlerGuard` compone la clave con el controlador y el método. `/auth/ingreso` y `/administracion/entrar` usan las mismas credenciales con contadores distintos: 10 intentos por minuto en vez de 5.
- **Por qué importa:** plan de acceso §5.1 (5 por minuto por correo e IP).
- **Corrección:** sobrescribir `generateKey` para que use solo `ip|correo`, o un nombre de limitador común.

---

## 2. Operaciones (AD-09)

### Lo que está bien

- **Toda escritura de tareas y administración pasa por una Operación.** Los controles directos proponen y confirman en el mismo paso, con origen `control_directo` (`tareas/controles-tareas.service.ts:89-94`).
- **«Hecho», «Recibido» y «Reabrir» son idempotentes por estado:** el cambio es condicional al estado de partida (`tareas.repositorio.ts:93-96`) y, si otro ganó, se devuelve la tarea como quedó (`ejecutores-tareas.ts:361-366`). Confirmar dos veces la misma Operación no repite el efecto (`operaciones.service.ts:132`, `143-147`).
- **`tareas.registrar` crea una sola tarea** aunque se confirme dos veces: busca por `operacion_origen_id` y la columna es única (`ejecutores-tareas.ts:196-197`).
- **El ejecutor recibe `{ id }` y `efimero`:** `efimero` llega solo en la primera respuesta y no se guarda (`operaciones.service.ts:155-170`). Probado.
- **Operaciones de empresa fuera de lo del usuario:** `GET /operaciones` y `buscar` filtran por `ambito` (`operaciones.service.ts:231`, `266`); lo en espera solo se crea con ámbito `propio` (`encolar`); la transcripción las lee por `conversacionId`, que las de la zona no tienen. **Excepción: Actividad (RT-01).**

### RT-07 · El origen `agente` lo declara el cliente · **alta**

- **Dónde:** `apps/api/src/operaciones/operaciones.controller.ts:24-30`; `packages/contratos/src/operaciones.ts:38`; `apps/api/test/tareas/operaciones-tareas.spec.ts:38-39` y `102-109`.
- **Qué pasa:** `POST /operaciones` pasa al servicio el `origen` que manda el cliente, y el contrato acepta `'agente'`. La regla «crear y cambiar solo por el asistente» (`origenes: ['agente']` en `tareas.registrar` y `tareas.cambiar`) se salta enviando `origen: 'agente'`. La propia prueba lo hace así para sembrar tareas (línea 38). La prueba que cita R-42 (`102-109`) solo comprueba que se rechaza a quien dice honestamente `control_directo`. Además, la Operación queda registrada como hecha por el asistente cuando no lo fue (R-18, y lo que Actividad muestra como «desde dónde se pidió», REQ-CUN02-27).
- **Por qué importa:** P-04 (el permiso se evalúa con la identidad, nunca con lo que diga el cliente), P-11 y R-42 (sin camino manual paralelo), H-TP-08. Viene de T-012, pero la tanda 4 añade dos tipos que dependen de ello y una prueba que da la regla por cubierta.
- **Corrección:** en `OperacionesController.proponer`, fijar `origen: 'control_directo'`, como ya hace `OperacionesEmpresaController` (línea 78), y quitar `origen` del contrato HTTP (un `OperacionSolicitudHttp` sin él; el servicio sigue recibiendo `origen` del agente por código). Ni la web ni el móvil envían hoy `'agente'` (comprobado con `grep`), así que no rompe nada. Las pruebas siembran tareas por el asistente o llamando al servicio. Añadir un caso: `origen: 'agente'` desde HTTP se ignora y `tareas.registrar` responde `ORIGEN_NO_PERMITIDO`.

### RT-08 · Los ejecutores de administración no son transaccionales · **media**

- **Dónde:** `apps/api/src/administracion/ejecutores-cuentas.ts:131-152` (alta), `213-222` y `264-270` (cambios de estado y baja), `294-304` (restablecer); `operaciones.service.ts:154-169`.
- **Qué pasa:** cada `aplicar` hace varias escrituras sueltas: actualizar el perfil, revocar sesiones, borrar de equipos, quitar la administración, auditar. Si falla la auditoría (o cualquier paso después del primero), la Operación queda `fallida` pero el efecto ya ocurrió. Dos casos concretos: (1) alta: la cuenta existe, la contraseña temporal se perdió y repetir el alta da «ese correo ya tiene cuenta»; (2) restablecer: la contraseña anterior ya no vale y la nueva nadie la vio.
- **Por qué importa:** P-07 (idempotente y auditada) y REQ-ADM-16 (queda registro de lo que cambió). El registro de la empresa diría «No se completó» de algo que sí se hizo.
- **Corrección:** envolver cada `aplicar` en `prisma.$transaction` sobre el cliente de la empresa (como ya hace `crearCuenta` por dentro). `revocarSesionesDelPerfil` usa `sinAislar`: pasarle el `tx` o hacerlo dentro de la misma transacción. Encaja con la corrección de RT-02.

### RT-09 · Un error interno llega a la pantalla · **baja**

- **Dónde:** `apps/api/src/operaciones/operaciones.service.ts:167`; `apps/web/src/app/(empresa)/administracion/personas.tsx:63`.
- **Qué pasa:** una Operación fallida guarda `error.message` tal cual (un mensaje de Prisma o «Aislamiento entre organizaciones: …»), y Personas lo muestra.
- **Por qué importa:** R-40 (sin vocabulario interno) y no revelar detalles de la base.
- **Corrección:** guardar el mensaje técnico en la auditoría y devolver al cliente un texto fijo («No se pudo completar. Inténtalo de nuevo.»), salvo los `errorApi` con mensaje para la persona.

---

## 3. Modelo y migraciones

### Lo que está bien

- **Las cuatro migraciones son aditivas:** tipos, columnas con valor por defecto, tablas nuevas e índices. No borran ni renombran nada. Prisma no tiene migraciones de vuelta; revertir es restaurar la base, aceptable con solo bases de desarrollo y pruebas.
- **Los índices únicos parciales dicen lo que el plan pide:** un `vigente` por perfil (H-ADM-04), uno abierto por organización y perfil, un responsable por equipo (H-ADM-09) (`20261107T0300_administracion/migration.sql:89-95`). Se crean antes de insertar las pertenencias, y no chocan porque cada perfil tiene una sola organización.
- **`tarea_personal`:** clave única con `operacion_origen_id` (idempotencia de `tareas.registrar`), los `CHECK` de hora sin fecha y espera sin persona, y la tabla en `MODELOS_CON_ORGANIZACION` (`plataforma/aislamiento.ts:30-31`).
- **Las tres tablas de administración** también están en `MODELOS_CON_ORGANIZACION`.

### RT-10 · Migraciones escritas a mano, con índices y `CHECK` fuera del esquema · **alta**

- **Dónde:** `apps/api/prisma/migrations/20261107T0200_tareas_personales/migration.sql:1-3` y `30-32`; `20261107T0300_administracion/migration.sql:1-3` y `89-95`; `20261107T0301_*` y `20261107T0302_*` («Escrita a mano»).
- **Qué pasa:** el motor de Prisma no se pudo descargar y el SQL se escribió imitando su estilo. `AGENTS.md` pide generarlo con `prisma migrate diff` o `migrate dev`. Dos riesgos: (1) que el SQL no coincida exactamente con `schema.prisma` (un tipo, un `DEFAULT`, un índice) y la próxima migración generada arrastre la diferencia; (2) los tres índices parciales y los dos `CHECK` no están en `schema.prisma`, y Prisma tiende a proponer borrar en la siguiente migración los índices que no conoce. Si eso pasa sin que nadie lo mire, H-ADM-04 y H-ADM-09 dejan de cumplirse en silencio.
- **Por qué importa:** `AGENTS.md`, prohibiciones del stack; REQ-ADM-24, REQ-ADM-30. No se puede comprobar aquí sin ejecutar nada.
- **Corrección:** antes de integrar, con el motor disponible, `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` contra una base sombra: la salida tiene que estar vacía o contener solo `DROP` de los índices parciales. Si Prisma 7.10 propone borrarlos, documentarlo en `AGENTS.md` («revisar que ninguna migración generada borre `miembro_organizacion_un_vigente_por_perfil`, `…_una_abierta_por_organizacion` ni `miembro_equipo_un_responsable`») y mantener la prueba `administracion.clases-de-organizacion` (`modelo.spec.ts:52-67`), que falla si desaparecen.

### RT-11 · La regla de datos de `0300` no es la del plan, y tiene casos raros · **media**

- **Dónde:** `20261107T0300_administracion/migration.sql:117-121` y `131-138`; `specs/08-administracion/plan.md:84-86` (§3.3); `spec.md:596` (H-ADM-23).
- **Qué pasa:** el plan dice: personal si tiene **una sola cuenta con rol `usuario_personal`**; las demás, empresa. La migración dice: empresa si tiene **más de una cuenta o alguna con Plan Empresarial**; las demás, personal. H-ADM-23 lo anota, pero el plan §3.3 no se corrigió. Diferencias reales:
  - Una organización con un solo `gerente` de plan Personal pasa a **personal**, con `rol = gerente` dentro (y `rol` todavía decide `@SoloResponsable`, RT-12).
  - Una organización con un solo `colaborador` de Plan Empresarial pasa a **empresa**, y el paso 3 («si no hay gerente, la cuenta más antigua») lo hace **administrador**.
  - Una organización sin cuentas pasa a personal; el plan la dejaba en empresa.
- **Por qué importa:** REQ-ADM-01 y REQ-ADM-03; plan y código no dicen lo mismo (`AGENTS.md`: el plan va antes que el código).
- **Corrección:** reescribir el plan §3.3 con la regla de H-ADM-23. Que el equipo decida el respaldo del paso 3 (ver preguntas). Añadir a `modelo.spec.ts:69-99` los dos casos borde.

### RT-12 · `rol`, en desuso, sigue decidiendo quién es responsable · **media**

- **Dónde:** `apps/api/src/identidad/guardas.ts:141-143`; `operaciones/operaciones.service.ts:241`; `administracion/ejecutores-cuentas.ts:135`.
- **Qué pasa:** `AlcanceGuard` y `comprobarAutoridad` dejan pasar las rutas y tipos `responsable` a todo rol que no sea `colaborador`. El alta desde el área crea, con un plan que no sea Empresarial, una cuenta `usuario_personal` **dentro de una empresa** (H-ADM-24). Esa cuenta pasaría hoy cualquier `@SoloResponsable()`. Al revés, alguien nombrado responsable de un equipo (`miembro_equipo.responsable`) con `rol = colaborador` seguiría rechazado. Hoy no hay ninguna ruta ni tipo `soloResponsable` en el código de producción, así que es latente.
- **Por qué importa:** REQ-ACC-15 y REQ-ACC-16; plan §3.4 y §4.2; R-3 de `ARQUITECTURA-EVOLUCION.md`. T-073 se construirá sobre esto.
- **Corrección:** no crear cuentas `usuario_personal` en una organización de empresa (usar `colaborador`, el de menos autoridad, para cualquier plan), o hacer T-073 (autoridad por `miembro_equipo`) antes de la primera ruta `@SoloResponsable()`. Anotarlo en el plan §3.4.

### RT-13 · Las tareas que quedaron en espera no tienen salida · **media**

- **Dónde:** `apps/api/prisma/schema.prisma` (`Operacion.convertidaEn`, sin uso); `operaciones/operaciones.service.ts:57`; `tareas/consulta-tareas.service.ts:44` (`porConfirmar: []`).
- **Qué pasa:** desde T-050 ninguna herramienta crea Operaciones `funcion_por_llegar`, pero las que ya existen siguen `en_espera`. El texto que ve la persona dice «Se está preparando para que la confirmes en Tareas.» (H-TP-16), y Tareas no tiene «Por confirmar» (T-056 y T-057 pendientes). La columna `convertida_en` existe sin que nada la escriba.
- **Por qué importa:** P-11 («al volver, lo encolado pasa por la confirmación de siempre»); REQ-CUN03-17; R-25 (nada desaparece en silencio). El texto promete algo que no existe.
- **Corrección:** hacer T-056 y T-057 antes de presentar, o, si no llegan, volver a un texto que no prometa una pantalla concreta y anotarlo. No añadir más columnas «para después» sin la tarea que las usa.

### RT-14 · `tipo` de organización vale `empresa` por defecto · **baja**

- **Dónde:** `apps/api/prisma/schema.prisma:38`; `0300/migration.sql:21`; `identidad/alta-cuentas.ts:21`.
- **Qué pasa:** el valor por defecto de la columna y de `crearOrganizacion` es `empresa`, la clase con administradores. La CLI sí lo deriva del plan, pero cualquier otro camino que olvide `tipo` crea una empresa.
- **Por qué importa:** un olvido debería dejar lo más restringido (el mismo criterio que `AlcanceGuard` aplica a una ruta sin alcance).
- **Corrección:** en una migración nueva, quitar el `DEFAULT` (tras la migración de datos ya no hace falta) y hacer `tipo` obligatorio en `crearOrganizacion`.

### RT-15 · Nombres de carpeta con «T» · **baja**

- **Dónde:** `apps/api/prisma/migrations/20261107T0200_*` a `20261107T0302_*`.
- **Qué pasa:** las anteriores usan 14 cifras (`20261105232110_…`). Una migración que Prisma genere el 7 de noviembre de 2026 (`20261107HHMMSS_…`) se ordena **antes** que estas, porque una cifra va antes que «T».
- **Por qué importa:** el orden de aplicación es el orden de nombre.
- **Corrección:** como solo hay bases de desarrollo y pruebas, renombrarlas ahora a 14 cifras (`20261107020000_…`) y recrear esas bases; si el equipo prefiere no tocarlas, anotar en `AGENTS.md` que la siguiente migración lleve fecha del 8 de noviembre de 2026 o posterior.

---

## 4. Agente

### Lo que está bien

- **P-01:** las herramientas `tareas.*` están tipadas con esquemas de `packages/contratos` y ninguna escribe: consultan o proponen (`agente/herramientas/herramientas-tareas.ts`). Con un `tareaId` del modelo se filtra contra las tareas de la persona (`:188`).
- **P-02 en lo que importa:** franja, «vencida», orden, la lista que ve la persona, el texto de la tarjeta («NexoAI no le escribe a …») y el texto final («Listo: … quedó en tus tareas») los arma el código (`grafo-asistente.ts`, `textoDeTarea`).
- **Candidatas (REQ-AGT-04) sin modelo:** elegir una candidata no pasa por el modelo, solo vale una de las ofrecidas y propone la acción por código (`asistente.service.ts`, `elegirReferente`). El empate se decide en código (`encajan`, H-TP-23).
- **Lo que llega al modelo es mínimo** y va con `AVISO_CONTENIDO_EXTERNO` (H-AGT-12, H-AGT-15).

### RT-16 · `agente.tareas.no-delega` prueba el guion, no el comportamiento · **media**

- **Dónde:** `apps/api/test/agente/herramientas-tareas.spec.ts:146-169`; `agente/modelo/guion-demostracion.ts:80`; `cli/evaluar-asistente.ts` (casos nuevos).
- **Qué pasa:** la prueba usa el modelo simulado, que responde lo que dice el guion. «Ponle prioridad 1» pasa porque el guion tiene una expresión regular con esa frase y un texto fijo. Es circular: el día que el modelo real conteste otra cosa, la prueba sigue verde. Además cubre «pídele», «ponle prioridad» y «divídela». No cubre asignar ni delegar («asígnale a Vasco…», «encárgale a…», «que lo haga Juan»), repetir («cada lunes») ni avisar a una hora («avísame a las 9»), que son la mitad de REQ-CUN03-16. El guion tiene `asígnale` y `hazla repetir`, pero ninguna prueba los usa. `evaluar-asistente` (el que sí mide el modelo real) no tiene ningún caso de delegación.
- **Por qué importa:** REQ-CUN03-16 figura como `implementado` en la trazabilidad. Lo que garantiza el código (ninguna herramienta asigna, repite ni avisa; los esquemas son estrictos) está bien; lo que depende del modelo (decir que no, ofrecer registrarlo como espera) no está medido.
- **Corrección:** (1) una prueba que no dependa del guion: con un modelo simulado que pida `tareas_registrar` con un campo extra (`prioridad`, `asignadoA`, `repetir`), el esquema lo rechaza y no se propone nada. (2) Casos en `evaluar-asistente.ts` para «Asígnale a Vasco el informe», «Hazla repetir cada lunes» y «Avísame a las 9». (3) Bajar REQ-CUN03-16 a `en curso` hasta que (2) se haya pasado una vez con el proveedor real.

### RT-17 · Reglas de producto en las instrucciones, sin distinguir plan · **baja**

- **Dónde:** `apps/api/src/agente/grafo/instrucciones.ts:19-23`.
- **Qué pasa:** las líneas nuevas son, sobre todo, cómo interpretar y qué no prometer; eso es legítimo en un prompt. Pero «Si pide que le pidas algo a alguien… regístralo como algo que espera de esa persona» y «… ni se delegan» valen para todos los planes. H-TP-14 lo limita al Plan Personal. Para un gerente del Plan Empresarial, «encárgale a Vasco…» es CUN-07, que llega después: hoy se registraría como «esperando de Vasco», en silencio.
- **Por qué importa:** P-02 (una regla que depende del plan es de código, no de prompt) y `ESTRUCTURA-PERFIL-EMPRESARIAL.md` §6.1.
- **Corrección:** cuando llegue CUN-07, que lo decida el código (qué herramientas se ofrecen según el plan y el equipo), no una línea del prompt. Mientras tanto, anotarlo como hallazgo en `09-tareas-personales/spec.md`, «Decisiones tomadas durante el diseño», y ver la pregunta 6.

### RT-18 · Duplicados frágiles · **baja**

- **Dónde:** `apps/api/src/cli/evaluar-asistente.ts` (descripciones de herramientas copiadas de `herramientas-tareas.ts`); `herramientas-tareas.ts:222-227` (`accionDeEtiqueta`).
- **Qué pasa:** las descripciones están escritas dos veces; si cambian en un lado, la evaluación mide otra cosa. La acción de las candidatas se recupera desde su **etiqueta de pantalla** («Dar por hecha»): cambiar el texto rompe la elección.
- **Corrección:** exportar las descripciones desde un solo módulo; guardar en el estado del grafo la acción (`'completar'`), no la etiqueta.

---

## 5. Web y móvil

### Lo que está bien

- **El grupo `(empresa)` no importa nada de `app/aplicacion/`.** Solo `lib/sesion.ts` y `tarjeta-acceso.tsx` (comprobado con `grep`), como pide el plan §7.3.
- **La web no decide nada en la zona:** pinta la tarjeta tal como llega y confirma o descarta (`personas.tsx`).
- **Tareas y Actividad salieron a sus propios archivos** (`tareas.tsx`, `actividad.tsx`), web y móvil.
- **Nombres accesibles:** cada «Hecho», «Reabrir» y «Descartar» lleva `aria-label` / `accessibilityLabel` con la tarea; las capas llevan `role="dialog"`; los botones de tarea del móvil miden 44 px (`movil/src/pantallas/tareas.tsx:369`, `374`).
- **La CSS de la zona usa las variables de `globales.css`** (93 usos de `var(--…)`); los píxeles que quedan son de disposición.

### RT-19 · `aplicacion.tsx` sigue creciendo (R-4 sin hacer) · **media**

- **Dónde:** `apps/web/src/app/aplicacion/aplicacion.tsx:125-130` y `250-258` (326 líneas).
- **Qué pasa:** R-4 de `ARQUITECTURA-EVOLUCION.md` pedía partirlo **antes** de T-052 (navegación, contexto de sesión, disposición). No se hizo. Lo que entró: tres booleanos encadenados para decidir si el lienzo es una lista (`conTareasDelDia`, `conTareas`, `conLista`), dos fuentes de tareas pasadas por propiedades (`tareas` y `tareasDelDia`), y un acoplamiento por posición entre `FRANJAS[corteVisible]` (`tareas.tsx:13`) y `SECCIONES.tareas.cortes` (`secciones.ts:24`): reordenar uno sin el otro muestra la franja equivocada. El bloque de las líneas 254-258 ya no se alcanza nunca (las tres franjas existen) y conserva un texto con «franja».
- **Por qué importa:** R-4, R-32 (`secciones.ts`, único lugar de las secciones). Lo siguiente (botón de la zona, aviso de invitación REQ-ADM-20, «Por confirmar») cae en el mismo archivo.
- **Corrección:** hacer R-4 antes de T-056 y T-071: `navegacion.tsx`, un contexto de sesión, y que cada sección decida si es lista. Derivar la franja del nombre del corte (o declarar `franja` en `secciones.ts`), no de la posición. Borrar el bloque muerto.

### RT-20 · Selectores de 36 px en el móvil · **media**

- **Dónde:** `apps/movil/src/pantallas/tareas.tsx:356` (`franja`, `minHeight: 36`); `pantallas/actividad.tsx:274` (`nivel`). Viene de `agenda.tsx:454`, y las dos pantallas nuevas lo copiaron.
- **Qué pasa:** el control de franjas y de niveles mide 36 px de alto.
- **Por qué importa:** el encargo pide toques de 44 px o más; las demás piezas nuevas lo cumplen.
- **Corrección:** `minHeight: 44` en los tres, o un `hitSlop` que lo complete.

### RT-21 · Diálogos sin gestión de foco · **baja**

- **Dónde:** `apps/web/src/app/(empresa)/administracion/personas.tsx:271-300` y `304-331`; `apps/web/src/app/aplicacion/tareas.tsx:115-118`.
- **Qué pasa:** `role="dialog"` y `aria-modal="true"`, pero sin atrapar el foco, sin `Escape` y sin devolver el foco al cerrar. El título es un `h4` bajo un `h1` (Personas).
- **Corrección:** usar `<dialog>` con `showModal()`, que da todo eso, o el componente de capa que ya use la aplicación; título `h2`.

### RT-22 · Textos que no siguen la regla del área · **baja**

- **Dónde:** `apps/web/src/app/aplicacion/tareas.tsx:299`; `aplicacion.tsx:257`; `apps/api/src/actividad/descripcion.ts:4-12`.
- **Qué pasa:** (1) «Tareas para este día» arma «Antes de las {horaLimite}» en el cliente, sin la zona cuando no es la del perfil; H-TP-21 dice que los textos los arma la API, y H-TP-03 que la hora lleva su zona si difiere. (2) «ordenadas por franja» es vocabulario del equipo (R-40). (3) Actividad describe las acciones de tareas con el título de la tarjeta, en imperativo («Nueva tarea», «Dar por hecha»); H-JOR-06 pide pasado («Registró…»).
- **Corrección:** usar `cuando` de la API también en Hoy; borrar el texto (RT-19); añadir a `FRASES` los seis tipos `tareas.*` en pasado.

### RT-23 · Valores escritos a mano en el móvil · **baja**

- **Dónde:** `apps/movil/src/pantallas/tareas.tsx:355-380` (`padding: 4`, `gap: 4`, `borderRadius: 8 / 12 / 16`); igual en `actividad.tsx`.
- **Qué pasa:** `tokens.ts` tiene `espaciado[4]` pero no radios, y la web sí (`--radio-sm/md/lg`).
- **Corrección:** añadir `radio` a `apps/movil/src/tokens.ts` con los valores de la web y usar `espaciado[4]`.

### RT-24 · La zona tiene su ruta y su cookie fijas, y la aplicación no la enlaza · **baja**

- **Dónde:** `apps/web/src/app/(empresa)/administracion/_comun/sesion.ts:8-19`.
- **Qué pasa:** `RUTA_ZONA = '/administracion'` y la cookie con ese `path`, escritos a mano. `ARQUITECTURA-EVOLUCION.md` §5 pedía leerlo de `ADMINISTRACION_URL` y emitir la cookie para el host de la zona. El botón de la aplicación hacia la zona (plan §7.1) no existe; REQ-ADM-05 está bien marcado `en curso`.
- **Corrección:** al hacer el botón, introducir `ADMINISTRACION_URL` en los dos lados. No urge.

---

## 6. Pruebas

### Lo que está bien

- **Hay prueba de que una sesión de empresa no sirve en la aplicación**, y de lo contrario (`sesion.spec.ts:91-102`; `cuentas.spec.ts:118-124`).
- Bien cubiertos: la contraseña temporal una sola vez y fuera de la auditoría; la cuenta afiliada no se administra; el administrador no escribe en lo personal; quitar la condición surte efecto en la petición siguiente; tareas solo de su dueño (`tareas.solo-las-propias`); «Hecho» sin asistente (`tareas.consulta-sin-proveedor-de-modelo`); orden y franjas como función pura (`franja-y-orden.spec.ts`); candidatas (`agente.tareas.completar-dice-cual`); Actividad sin calendario y sin modelo.

### RT-25 · Pruebas citadas que no cubren lo que se les atribuye · **media**

| Requisito o regla | Estado en la trazabilidad | Prueba citada | Lo que no cubre |
|---|---|---|---|
| R-42, H-TP-08 (crear solo por el asistente) | REQ-CUN03-01, 12 `implementado` | `tareas.sin-confirmar-no-registra`, «crear y cambiar solo los pide el asistente» (`operaciones-tareas.spec.ts:102-109`) | Que un cliente que declara `origen: 'agente'` no cree nada (RT-07) |
| REQ-ADM-03 | `implementado` | `administracion.nunca-sin-administrador` | Dos confirmaciones a la vez (RT-02) |
| REQ-CUN03-16 | `implementado` | `agente.tareas.no-delega` | Asignar, delegar, repetir, avisar; y prueba el guion (RT-16) |
| REQ-CUN02-34 | `implementado` | `actividad.solo-lo-propio` | Operaciones de ámbito empresa de la propia persona (RT-01) |
| REQ-ADM-14 | `en curso` | `administracion.restablecer-contrasena` | El token de acceso vigente (RT-03) |
| REQ-ADM-02 | `implementado` | `administracion.administrar-no-es-ver` | Recorre cuatro rutas; faltan `/tareas` y `/actividad`, de esta misma tanda. El valor por defecto (`propio`) las protege, pero no está probado |
| REQ-CUN03-19 | `implementado` | también `plataforma.aislamiento-entre-organizaciones` | Esa prueba es por organización, no por perfil. La que cubre es `tareas.solo-las-propias`; la cita sobra, no hace daño |

- **Por qué importa:** `tools/trazabilidad.py --check` solo comprueba que haya una prueba, no que cubra. En la sustentación, «implementado con prueba» tiene que ser verdad.
- **Corrección:** añadir los casos que nombran RT-01, RT-02, RT-03, RT-07 y RT-16, y las dos rutas a `administrar-no-es-ver`. Mientras falten, bajar REQ-ADM-03 y REQ-CUN03-16 a `en curso`.

---

## 7. Coherencia documental

### RT-26 · `SPEC.md` no recoge la tanda 4 · **bloquea**

- **Dónde:** `SPEC.md:6` (versión 2.20.1, 6 de noviembre de 2026); §5 (`:146-156`), §6 (`:168`), §8, §9, §11.
- **Qué pasa:** ninguno de los commits de la tanda toca `SPEC.md`. Falta: las filas de `08-administracion` y `09-tareas-personales` en §5, y el total de requisitos (sigue en 154); la fila de Jornada dice `CUN02-01…24 (24)` y «—» en código y pruebas, cuando hay 35 y 10 implementados; CUN-03 sigue «Parcial» en §6; §8 no tiene H-ADM-16 a 31, H-TP-01 a 25 ni H-EMP-01 a 21; §9 no tiene INC nuevas; §11 no tiene ninguna línea. Los dos informes de carril proponen la versión 2.21.0 para cambios distintos.
- **Por qué importa:** `AGENTS.md`, «Orden obligatorio», paso 3: §5, §8, §9 y §11 se actualizan en el mismo turno. `SPEC.md` es la fuente de verdad y lo que se presenta como método (§2.1, spec-anchored).
- **Corrección:** un commit de integración documental: versión 2.21.0 (y 2.22.0 si se quiere separar las dos áreas), §5 con las dos áreas nuevas y la Jornada al día, §6 con CUN-03 «Especificado», §8 con los hallazgos pendientes de aval (una fila por área), §9 con las INC renumeradas (RT-27), §11 con una línea por área. Después, `python tools/trazabilidad.py --check`.

### RT-27 · INC-19 a 21 están dos veces, y ya se citan · **media**

- **Dónde:** `entregas/INFORME-CARRIL-ADMIN.md:146-148` y `entregas/INFORME-CARRIL-CUN03.md:122-124` (los dos lotes); citas a «INC-21 del carril de CUN-03» en `ESTRUCTURA-PERFIL-EMPRESARIAL.md:196`, `:250-252`, `specs/03-tareas/plan.md:7` y `:49`, y `specs/09-tareas-personales/spec.md:487` (H-TP-19).
- **Qué pasa:** cada carril numeró sus tres inconsistencias como INC-19 a 21. Ninguna está en `SPEC.md` §9, y los documentos ya integrados citan «INC-21» con una coletilla para distinguirla.
- **Por qué importa:** `SPEC.md` §2.4 (los identificadores son inmutables): en cuanto se escriban en §9, la cita tiene que llevar a una sola cosa.
- **Corrección:** dejar INC-19 a 21 para administración (la primera en el registro, 6 de noviembre de 2026) y dar INC-22 a 24 a las de CUN-03. Cambiar las citas de `ESTRUCTURA-PERFIL-EMPRESARIAL.md`, `03-tareas/plan.md` y `09-tareas-personales/spec.md`. Los informes de `entregas/` son registro y no se tocan; una nota en §9 dice la equivalencia.

### RT-28 · La especificación de administración contradice al plan y al código · **media**

- **Dónde:** `specs/08-administracion/spec.md:564` (§6) y `:543` (§5); REQ-ADM-05 (`:89`); `plan.md:224` (§7.2, Registro); `(empresa)/administracion/registro/page.tsx`.
- **Qué pasa:** (1) §6 de la especificación dice que el área **no** muestra el registro de acciones administrativas; el plan §7.2 lo pone en «esta entrega» y el código lo construye. (2) §5 describe el área como algo que «ocupa el ancho de la conversación y del lienzo», dentro de la aplicación; desde el 6 de noviembre de 2026 es una zona aparte (plan §7, H-ADM-22). (3) H-ADM-22 pedía una línea en REQ-ADM-05 («solo web, en la zona de empresa») que no se escribió.
- **Por qué importa:** `AGENTS.md` («no inventar comportamiento que la especificación no dice»; el cambio va primero al `spec.md`).
- **Corrección:** decidir el Registro (ver preguntas) y escribirlo en la especificación: quitar la fila de §6 o retirar la página. Reescribir §5 con la zona aparte. Enmendar REQ-ADM-05.

### RT-29 · H-TP-11 contradice una decisión del equipo · **media**

- **Dónde:** `specs/09-tareas-personales/spec.md:479` (H-TP-11); `specs/02-agenda/spec.md:290` (decisión 12, H-AG-08, decidida por el equipo el 6 de noviembre de 2026).
- **Qué pasa:** el equipo decidió que **toda** propuesta caduca a las 24 horas. H-TP-11 hace una excepción para las que salen de convertir lo que estaba en espera, y el esquema ya lo prevé (`convertida_en`). Es un hallazgo del carril, no una decisión del equipo.
- **Por qué importa:** `AGENTS.md`: una decisión que el spec no cubre se anota y la toma el equipo; esta cambia una que el equipo ya tomó.
- **Corrección:** llevarla al equipo antes de T-041 y T-056. Hasta entonces, marcarla «pendiente de aval» en `SPEC.md` §8.

### RT-30 · El plan de tareas no está al día · **baja**

- **Dónde:** `specs/09-tareas-personales/plan.md` §3.1 (tabla `tarea`), §4 (cinco tipos, `tareas.modificar`), §8 (textos en cada cliente); `spec.md:488-493` (H-TP-19, 20, 21, 25).
- **Qué pasa:** H-TP-19 a 21 dicen «se aparta del plan» en vez de corregirlo. H-TP-25 fija «siete días» como 168 horas, cuando REQ-CUN03-10 dice «los últimos siete días, con el día en que se hicieron» (lectura natural: días de calendario).
- **Corrección:** corregir el plan con el nombre, los seis tipos y quién arma los textos. Llevar H-TP-25 al equipo (ver preguntas).

### RT-31 · Huecos de numeración y documentos fuera del repositorio · **baja**

- **Dónde:** `specs/*/tasks.md`; el encargo de esta revisión.
- **Qué pasa:** (1) las tareas van T-001 a T-057, T-065 a T-074 y T-080 a T-084: T-058 a T-064 y T-075 a T-079 no existen y ningún documento dice que están reservadas. (2) `ARQUITECTURA-EVOLUCION.md` (con R-1 a R-7) e `IMPLEMENTADO-2026-11-07.md` se citan como referencia pero no están en el repositorio, sino en la carpeta de capturas de la sesión.
- **Corrección:** una nota en `SPEC.md` §2.4 o en cada `tasks.md`: «T-058 a T-064 reservadas para … ; T-075 a T-079 para …». Copiar `ARQUITECTURA-EVOLUCION.md` a la raíz (o a `entregas/`) si sus R-n van a seguir citándose.

---

## Correcciones ordenadas para Claude Code

Cada paso, con su prueba; `npx pnpm@12.10.1 verificar` en verde al final de cada uno.

1. **RT-26 y RT-27.** Integrar `SPEC.md` (versión, §5, §6, §8, §9 con INC-19 a 24 renumeradas, §11) y cambiar las citas a INC-21 en los tres documentos. Ejecutar `python tools/trazabilidad.py --check`.
2. **RT-10.** Con el motor de Prisma, `prisma migrate diff` desde las migraciones al esquema; salida vacía o solo los índices parciales. Si Prisma propone borrarlos, nota en `AGENTS.md`. Decidir RT-15 en el mismo paso.
3. **RT-01.** `ambito: 'propio'` en `consulta-actividad.service.ts:103` y el caso en `actividad.solo-lo-propio`.
4. **RT-07.** Fijar `origen: 'control_directo'` en `OperacionesController`, contrato HTTP sin `origen`, sembrar tareas en las pruebas sin HTTP con `'agente'`, caso nuevo en `operaciones-tareas.spec.ts`.
5. **RT-02 y RT-08.** Transacción por ejecutor de administración, con bloqueo de la fila de la empresa para los tipos que quitan un administrador. Caso concurrente en `nunca-sin-administrador`.
6. **RT-03.** `debeCambiarContrasena` en la lectura de `AutenticacionGuard`; caso en `restablecer-contrasena`.
7. **RT-25.** Las dos rutas en `administrar-no-es-ver`; bajar REQ-ADM-03 (si el paso 5 no está) y REQ-CUN03-16 a `en curso`.
8. **RT-16.** Prueba de esquema estricto sin guion; tres casos en `evaluar-asistente.ts`.
9. **RT-04, RT-11, RT-12, RT-29, RT-30.** Según lo que responda el equipo; mientras tanto, `nombrar_administrador` no confirmable sobre una afiliada, y el plan §3.3 y §3.4 corregidos.
10. **RT-13.** T-056 y T-057, o un texto que no prometa.
11. **RT-28.** Especificación de administración: §5, §6, REQ-ADM-05.
12. **RT-19, RT-20.** R-4 en la web (antes de T-071), selectores de 44 px.
13. **Bajas:** RT-05, RT-06, RT-09, RT-14, RT-17, RT-18, RT-21, RT-22, RT-23, RT-24, RT-31, cuando se toque cada archivo.

## Preguntas que solo el equipo puede responder

1. **H-ADM-28 (RT-04).** ¿Una cuenta afiliada puede ser administradora? Si sí, ¿sin aceptarlo o con una invitación propia?
2. **H-ADM-23 (RT-11).** Al migrar, una organización con un solo colaborador de Plan Empresarial: ¿empresa con ese colaborador como administrador, o personal?
3. **Registro de la zona (RT-28).** ¿Se muestra el registro de acciones administrativas en la zona (como hace el código) o queda para Actividad con alcance de equipo (como dice la especificación §6)?
4. **Actividad del administrador (RT-01).** Se asume que lo hecho en la zona no aparece en la Actividad personal (H-ADM-26). ¿Es así?
5. **H-TP-11 (RT-29).** ¿Las propuestas que salen de convertir lo que estaba en espera son la excepción a la caducidad de 24 horas?
6. **CUN-07 frente a H-TP-14 (RT-17).** Para un gerente del Plan Empresarial, mientras no exista la delegación: ¿«encárgale a Vasco…» se registra como algo que se espera de Vasco, o el asistente dice que todavía no delega?
7. **T-056 (RT-13).** ¿Entra «Por confirmar» antes de la presentación?
8. **H-TP-25 (RT-30).** «Hechas de los últimos siete días»: ¿168 horas o siete días de calendario?
9. **RT-07.** Viene de T-012, antes de esta tanda. ¿Se corrige ahora, aunque toque también la agenda?
10. **Despliegue de la zona (RT-24).** ¿Misma dirección (`/administracion`) o subdominio? Decide si `ADMINISTRACION_URL` entra ya.
