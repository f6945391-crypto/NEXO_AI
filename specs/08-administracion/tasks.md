# Tareas — Administración de la organización

**Plan:** `specs/08-administracion/plan.md` (borrador del 6 de noviembre de 2026, sin aprobar)
**Numeración:** la última tarea del repositorio es T-045 (`specs/02-agenda/tasks.md`). **Estas empiezan en T-058** para no chocar con el carril de CUN-03, que numera a la vez desde T-046. Se renumeran al integrar si hace falta.
**Regla:** una tarea cabe en una sesión de trabajo. Termina cuando se cumple su «Hecho cuando», su prueba pasa y `python tools/trazabilidad.py --check` sigue limpio.
**Antes de empezar:** que el equipo apruebe la especificación y el plan, y decida las enmiendas a REQ-ACC-01, 02, 13 y 15 (`entregas/INFORME-CARRIL-ADMIN.md`). T-058 a T-065 no las necesitan; T-066 sí.

Estados: `pendiente` · `en curso` · `hecha`.

## Orden de ejecución

**T-058** (modelo) **→ T-059** (guardia) **→ T-060** (Operaciones de empresa) **→ T-061** (cuentas, API) **→ T-062** (cuentas, web) **→ T-063** (afiliación, API) **→ T-064** (afiliación, web) **→ T-065** (aviso en el móvil) **→ T-066** (equipos, API y autoridad por equipo) **→ T-067** (equipos, web). T-065 puede ir en paralelo con T-064.

---

## 1. Modelo

### T-058 · Clases de organización, pertenencia y equipos en el modelo

- **Satisface:** REQ-ADM-01, REQ-ADM-04 · plan §3 · H-ADM-16, H-ADM-21
- **Depende de:** —
- **Contenido:** migración nueva con `organizacion.tipo`, `perfil_usuario.estado` y `estado_cambiado_en`, y las tablas `miembro_organizacion`, `equipo` y `miembro_equipo`, con sus índices únicos parciales escritos a mano en el SQL; migración de los datos existentes según el plan §3.3; las tres tablas en `MODELOS_CON_ORGANIZACION`; `crear-cuenta` con `--tipo` y `--administrador`; semilla y `e2e/cuentas.json` con una administradora, una personal sin afiliar y una con invitación pendiente; línea de `AGENTS.md`
- **Hecho cuando:** la migración se aplica sobre una base vacía y sobre una con los datos de la semilla anterior, y deja cada empresa con al menos un administrador; la CLI crea una empresa con su administradora y una cuenta personal en su organización personal; no puede haber dos pertenencias vigentes para un mismo perfil
- **Pruebas:** `administracion.clases-de-organizacion`, `administracion.primer-administrador-en-el-arranque` · también `plataforma.aislamiento-entre-organizaciones` (con las tablas nuevas) y `plataforma.migracion-y-semilla`
- **Estado:** hecha
- **Nota (7 de noviembre de 2026):** migraciones `20261107T0300_administracion` (modelo y datos, escrita a mano y verificada con psql) y regla de datos del encargo (H-ADM-23). La cuenta personal sin afiliar y la de invitación pendiente de `e2e/cuentas.json` llegan con T-062 y T-063; la semilla de desarrollo solo marca a `gerente@nexoai.test` como administradora

---

## 2. Guardia

### T-059 · Pertenencia en la sesión, estado de la cuenta y alcance de administrador

- **Satisface:** REQ-ADM-06, REQ-ADM-12 (ingreso y sesiones), REQ-ADM-17 · plan §4 · H-ADM-17
- **Depende de:** T-058
- **Contenido:** `ContextoSolicitud.empresa` y plan efectivo en el ingreso y la renovación; `CUENTA_SUSPENDIDA` y `CUENTA_CERRADA` tras verificar la contraseña; `AutenticacionGuard` comprueba `perfil_usuario.estado` en cada petición; `RolGuard` pasa a `AlcanceGuard` con los alcances `empresa` y `administrador`; `@SoloAdministrador()` y `@EnEmpresa()` leen la pertenencia de la base y registran `administracion.rechazada`; `PertenenciasRepositorio` con los usos de `sinAislar` del plan §4.3; `GET /auth/sesion` con `administrador` y `organizacion`
- **Hecho cuando:** una cuenta suspendida no entra y su sesión abierta deja de valer en la petición siguiente; una ruta `@SoloAdministrador()` rechaza a quien no administra y deja registro, también si le quitaron la condición hace un segundo; una cuenta personal sin afiliar recibe `SIN_ORGANIZACION` en una ruta `@EnEmpresa()`; `acceso.toda-ruta-declara-su-alcance` sigue pasando con los alcances nuevos; las pruebas de T-026 no cambian
- **Pruebas:** `administracion.solo-el-administrador`, `afiliacion.sin-afiliar-es-plan-personal` · también `administracion.suspension-cierra-sesiones` (la parte de ingreso)
- **Estado:** hecha
- **Nota (7 de noviembre de 2026):** con la sesión de ámbito de la zona (plan §7.1): `POST /administracion/entrar`, `sesion_renovacion.ambito` (`20261107T0301_sesion_ambito`) y `AMBITO_INCORRECTO`. `RolGuard` pasa a `AlcanceGuard`

---

## 3. Endpoints

### T-060 · Operaciones de ámbito de empresa y resultado efímero

- **Satisface:** REQ-ADM-07, REQ-ADM-16 · plan §5.2 · H-ADM-12, H-ADM-18
- **Depende de:** T-059
- **Contenido:** `EjecutorOperacion` con `ambito: 'empresa'`, `soloAdministrador` y `efimero` en `ResultadoEjecucion`; `OperacionRespuesta.efimero` en `packages/contratos`; los tipos `administracion.*` admiten solo `control_directo`; comprobación de `soloAdministrador` al proponer y al confirmar; un tipo de prueba para ejercitarlo
- **Hecho cuando:** una Operación de ámbito empresa propuesta por una administradora afiliada queda en la organización de la empresa; el resultado efímero llega en la primera confirmación y no en la segunda, ni en `operacion.resultado`; proponer un tipo `administracion.*` con origen `agente` se rechaza; quitar la condición de administradora entre proponer y confirmar hace fallar la confirmación sin efecto
- **Pruebas:** `administracion.el-asistente-no-administra`, `administracion.toda-accion-confirmada-y-registrada` (núcleo)
- **Estado:** hecha
- **Nota (7 de noviembre de 2026):** `operacion.ambito` (`20261107T0302_operacion_ambito`) y rutas `/administracion/operaciones` (H-ADM-26)

### T-061 · Cuentas de la organización: lista, alta, plan, suspensión, baja, contraseña y administradores

- **Satisface:** REQ-ADM-02, 03, 08 a 16 · plan §5.1, §6, §9 · H-ADM-05, H-ADM-13, H-ADM-14, H-ADM-15
- **Depende de:** T-060
- **Contenido:** `AdministracionModule`; `GET /administracion/personas`; ejecutores `alta_cuenta` (llama a `alta-cuentas.ts`), `cambiar_plan`, `suspender_cuenta`, `reactivar_cuenta`, `cerrar_cuenta`, `restablecer_contrasena`, `nombrar_administrador` y `quitar_administrador`, con las validaciones de clase de cuenta y de «nunca sin administrador»; revocación de sesiones al suspender, cerrar y restablecer; eventos de auditoría del plan §9; esquemas en `packages/contratos/src/administracion.ts`
- **Hecho cuando:** cada requisito de la lista tiene su caso en la prueba; la contraseña temporal se ve una vez; ninguna acción sobre una cuenta afiliada salvo desafiliar se puede confirmar; la última administradora no puede dejar de serlo; la lista no trae nada de la cuenta más allá de lo que dice REQ-ADM-08
- **Pruebas:** `administracion.lista-de-personas`, `administracion.administrar-no-es-ver`, `administracion.nunca-sin-administrador`, `administracion.alta-con-contrasena-una-vez`, `administracion.cambio-de-plan`, `administracion.suspension-cierra-sesiones`, `administracion.baja-definitiva`, `administracion.restablecer-contrasena`, `administracion.cuenta-afiliada-no-se-administra`, `administracion.toda-accion-confirmada-y-registrada`
- **Estado:** hecha
- **Nota (7 de noviembre de 2026):** también `GET /administracion/equipos` en lectura (adelanto de T-066) y `GET /administracion/sesion`. REQ-ADM-13 queda en curso hasta los oyentes de la salida de equipo

---

## 4. Pantalla de cuentas

### T-062 · Administración en la web: personas y acciones sobre cuentas

- **Satisface:** REQ-ADM-05, 08 a 16 (interfaz) · plan §7 · H-ADM-10
- **Depende de:** T-061
- **Contenido:** entrada «Administración» al pie de la navegación, encima de Ajustes, solo con `administrador`; ruta `/administracion` con navegación y lienzo de 1368 px, sin conversación; corte «Personas» con la tabla, «Dar de alta» y las acciones de cada fila según su clase; tarjeta de confirmación con la `vistaConfirmacion` de la API; contraseña temporal una vez, con «Copiar». Textos sin vocabulario interno (R-40)
- **Hecho cuando:** una administradora da de alta una cuenta y ve su contraseña una vez; suspende y reactiva otra; una cuenta que no administra no ve la entrada y, si abre `/administracion`, vuelve a `/`; en una fila afiliada solo aparece «Quitar de la organización»
- **Prueba:** `web.administracion-solo-para-administradores` · también `web.administracion-cuentas` (extremo a extremo)
- **Estado:** hecha
- **Nota (7 de noviembre de 2026):** en la zona aparte del plan §7 (`app/(empresa)/administracion/`), no como entrada dentro de la aplicación: el enlace desde la aplicación queda para T-064 o la integración. Quien no puede entrar en la zona vuelve a su entrada, no a `/`. En una fila afiliada todavía no hay «Quitar de la organización» (T-063, T-064). Pruebas: `web.administracion-solo-para-administradores`, `web.administracion-cuentas`
- **Nota (7 de noviembre de 2026, pendientes de la tanda 4):** la entrada desde la aplicación ya está: «Administración» al pie de la navegación, encima de Ajustes, solo si `GET /auth/sesion` trae `administrador`; abre `/administracion/entrar` en otra pestaña, sin compartir la sesión. Un responsable que no administra no la ve, porque la sesión no dice si lo es: entra por la dirección de la zona. Prueba: `web.administracion-solo-para-administradores`

---

## 5. Afiliación

### T-063 · Afiliación: invitar, aceptar, rechazar, caducar, desafiliar y salir

- **Satisface:** REQ-ADM-17 a 27 · plan §5.1, §5.3, §5.4, §8 · H-ADM-03, H-ADM-04, H-ADM-06, H-ADM-07, H-ADM-08
- **Depende de:** T-061
- **Contenido:** `AvisosModule` con `CorreoPlataforma` simulado; ejecutores `administracion.invitar`, `retirar_invitacion`, `desafiliar`, `afiliacion.aceptar`, `afiliacion.rechazar` y `afiliacion.salir`; `GET /afiliacion`; caducidad a los 14 días en la lectura y trabajo diario en el trabajador; evento `SalidaDeEquipo` en la transacción, sin oyentes todavía; plan efectivo que cambia en la siguiente renovación
- **Hecho cuando:** invitar un correo con cuenta deja la invitación y un `correo.aviso`; invitar uno sin cuenta no deja nada y lo dice; aceptar afilia, da el Plan Empresarial y suma a los equipos propuestos; rechazar o dejar pasar 14 días no cambia nada; con una afiliación vigente no se puede aceptar otra; desafiliar y salir devuelven el plan propio y emiten `SalidaDeEquipo`; una cuenta propia no puede salir; la organización personal de la persona tiene las mismas filas antes y después de todo el recorrido
- **Pruebas:** `afiliacion.invitacion-y-correo-de-aviso`, `afiliacion.aceptar-no-mueve-nada`, `afiliacion.rechazo-y-caducidad`, `afiliacion.sin-aceptacion-no-hay-afiliacion`, `afiliacion.una-empresa-a-la-vez`, `afiliacion.desafiliar-y-salir`, `afiliacion.cuenta-propia-no-sale`, `administracion.no-escribe-en-lo-personal`
- **Estado:** pendiente
- **Nota:** REQ-ADM-25 queda **en curso**: dejar sin persona asignada las tareas y dejar de leer la disponibilidad lo harán los oyentes de `SalidaDeEquipo` en la fase 4

### T-064 · Afiliación en la web: invitar desde el área y aviso en la aplicación

- **Satisface:** REQ-ADM-18, 20, 25, 26, 27 (interfaz web) · plan §7
- **Depende de:** T-062, T-063
- **Contenido:** «Invitar» en Personas, con el correo y los equipos; «Retirar invitación» y «Quitar de la organización»; en `/`, el aviso de invitación pendiente con su capa, «Aceptar» y «Rechazar» con sus tarjetas; el aviso «Ya no perteneces a …»; en Ajustes, la fila «Organización», con «Salir de …» solo para una afiliada
- **Hecho cuando:** con dos cuentas, la administradora invita y la persona ve el aviso al entrar, lee qué cambia y qué no, acepta y aparece como afiliada en el área; después sale desde Ajustes y la administradora lo ve; una cuenta propia no tiene «Salir»
- **Pruebas:** `web.aviso-de-afiliacion` (extremo a extremo)
- **Estado:** pendiente

### T-065 · Aviso de afiliación en el móvil

- **Satisface:** REQ-ADM-20 (interfaz móvil), REQ-ADM-26
- **Depende de:** T-063
- **Contenido:** en `inicio.tsx`, el mismo aviso y la misma capa que la web, con «Aceptar» y «Rechazar»; en Ajustes, «Salir de …» para una afiliada; tokens de `src/tokens.ts`
- **Hecho cuando:** en Expo web, una cuenta con invitación pendiente ve el aviso, la acepta y su Ajustes muestra la organización; el móvil no tiene ninguna entrada a Administración
- **Prueba:** `movil.aviso-de-afiliacion` (extremo a extremo)
- **Estado:** pendiente

---

## 6. Equipos

### T-066 · Equipos y autoridad por equipo

- **Satisface:** REQ-ADM-28 a 32 · REQ-ACC-16 · plan §4.2, §5.1, §5.4 · H-ADM-09, H-ADM-20
- **Depende de:** T-063 · las enmiendas a REQ-ACC-13 y 15, aceptadas
- **Contenido:** `GET /administracion/equipos`; ejecutores `crear_equipo`, `anadir_a_equipo`, `quitar_de_equipo` y `nombrar_responsable`; `@SoloResponsable(resolverEquipo)` y `soloResponsable` con equipo en las Operaciones, que comprueban `miembro_equipo.responsable` y ya no el rol de la cuenta; las pruebas de T-026 se reescriben sobre la autoridad por equipo; `rol` queda sin lectores en la guarda
- **Hecho cuando:** se crea un equipo, se le suman una cuenta propia y una afiliada y se nombra responsable a una; el nombre repetido se rechaza; una invitación pendiente no se puede sumar; nombrar a otro responsable le quita la autoridad al anterior; quitar al responsable deja el equipo sin responsable y emite `SalidaDeEquipo`; una cuenta responsable de un equipo y miembro de otro solo pasa `@SoloResponsable` en el suyo; sin responsable, nadie pasa
- **Pruebas:** `equipos.crear-y-componer`, `equipos.un-responsable`, `equipos.autoridad-por-equipo` · también `acceso.solo-el-responsable-asigna-tareas` y `acceso.colaborador-solo-ve-lo-suyo` (reescritas)
- **Estado:** pendiente
- **Nota (7 de noviembre de 2026):** la lectura `GET /administracion/equipos` ya existe (T-061) y la web la muestra en solo lectura (T-062)

### T-067 · Equipos en la web

- **Satisface:** REQ-ADM-28 a 32 (interfaz) · plan §7
- **Depende de:** T-062, T-066
- **Contenido:** corte «Equipos» del área: una tarjeta por equipo con su responsable y sus miembros, «Sin responsable» destacado, «Crear equipo», «Añadir», «Quitar» y «Nombrar responsable», cada uno con su tarjeta de confirmación; en «Invitar», la lista de equipos
- **Hecho cuando:** la administradora crea «Ventas», suma a dos personas, nombra responsable a una y la quita; el equipo queda «Sin responsable» a la vista
- **Prueba:** `web.administracion-equipos` (extremo a extremo)
- **Estado:** pendiente

---

**Fuera de este desglose:** retirar la columna `rol` y su enum (cuando se acepten las enmiendas); el envío real del correo (PT-3); los oyentes de `SalidaDeEquipo` en `03-tareas` y `05-equipos` (fase 4); los cuadros de diseño del área (§5 del spec).
