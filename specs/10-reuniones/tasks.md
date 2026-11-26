# Tareas: Reuniones (CUN-06)

**Plan:** `plan.md`. Numeradas desde **T-131** (propuesta de disponibilidad, §8). Se añaden el 25 de noviembre de 2026.

### T-131 · Mapa y propuestas (dominio)

- **Satisface:** REQ-CUN06-03, 04, 05, 06 · D-REU-02, D-REU-19, D-REU-21 · P-REU-02
- **Depende de:** T-105 (disponibilidad de CUN-05)
- **Contenido:** `dominio/mapa.ts`, que calcula los días hábiles, las bandas por persona y zona, quién está libre por franja y las propuestas; `dominio/grupo.ts`, que reconoce un equipo o una persona por texto (D-REU-17, 18)
- **Hecho cuando:** con tres personas en dos zonas, el mapa marca libre solo lo que cae en la banda de cada uno; las propuestas exigen a los obligatorios, ordenan por opcionales y después por cercanía, y van en días distintos; nada en el pasado; la franja de la tarde empieza a las 13:00; «Ana» encaja con `ana.perez@`, «proyecto alfa» con «Proyecto Alfa»
- **Pruebas:** `reuniones.mapa`, `reuniones.grupo`
- **Estado:** hecha · 25 de noviembre de 2026. `src/reuniones/dominio/mapa.ts` y `grupo.ts`, funciones puras. La banda de cada persona se mira en su zona: con alguien en Madrid, la tarde de Lima queda fuera. 10 pruebas en `src/reuniones/dominio/mapa.spec.ts` (`reuniones.mapa`, `reuniones.propuestas`, `reuniones.grupo`)

### T-132 · La reunión y sus Operaciones (API)

- **Satisface:** REQ-CUN06-07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21 · D-REU-11, 14, 15, 16 · P-REU-01, 03, 04
- **Depende de:** T-131
- **Contenido:** migración `20261125200000_reuniones`; contratos; `ReunionesService`; `GET /reuniones` y `GET /reuniones/:id`; Operaciones `reunion.convocar`, `reunion.mover` y `reunion.cancelar`; invitados, aviso y `direccion` en el proveedor de calendario; `correo_cuenta` al conectar; `409 ES_REUNION` en la agenda
- **Hecho cuando:** convocar crea un evento con los invitados, con aviso, y la reunión queda agendada; confirmar dos veces crea uno; si un obligatorio se ocupó, `reproponer` y no se escribe nada; la invitada ve la reunión agendada y no la pendiente; mover y cancelar avisan; quien no convocó recibe 403; borrar en Google la deja cancelada; pasado el rango, vencida; la dirección es la del Google conectado o el correo de NexoAI; cancelar el compromiso desde la agenda da 409
- **Pruebas:** `agente.reuniones`, `reuniones.conciliacion` (`test/reuniones/reuniones.spec.ts`)
- **Estado:** hecha · 25 de noviembre de 2026. Migración `20261125200000_reuniones`, generada con `prisma migrate diff --from-config-datasource`. Tres ajustes al plan: (1) la dirección de Google se lee y se guarda la primera vez que hace falta, no al conectar: así sirve también para las cuentas conectadas antes (P-REU-05); (2) después de convocar, mover o cancelar se sincroniza la agenda de cada invitado con Google, para que el compromiso aparezca enseguida y el cálculo siguiente no use una copia vieja (P-REU-06); (3) la comprobación al confirmar sincroniza a los obligatorios antes de calcular. La conciliación y el vencimiento, al leer (P-REU-01). Pruebas en `test/reuniones/reuniones.spec.ts`

### T-133 · El asistente propone (agente)

- **Satisface:** REQ-CUN06-01, 02, 03, 05, 06, 10, 14, 16, 19, 20 · D-REU-10, 17, 18, 22, 23
- **Depende de:** T-132
- **Contenido:** herramientas `reuniones.proponer`, `reuniones.listar` y `reuniones.cancelar`; turno `reunion`; decisión `horario`; aclaraciones `REUNION_ACLARAR` y `SOLO_CONVOCANTE` con texto del código; pregunta «¿Con quién es la reunión?»; instrucciones; guion del simulado
- **Hecho cuando:** con el simulado, «reunión con el proyecto Alfa esta semana» deja una reunión pendiente y muestra 3 propuestas sin tarjeta; elegir una propone `reunion.convocar` sin pasar por el modelo; «con Ana» con dos equipos pregunta cuál; «con Carlos» dice que no lo encuentra; sin quién, pregunta; «Beto, si puede» lo deja opcional; «mueve la reunión al viernes» propone del viernes y elegir propone `reunion.mover`; una invitada que pide cancelar recibe el texto de REQ-CUN06-16; con el Plan Personal, el texto de sin acceso
- **Prueba:** `agente.reuniones`
- **Estado:** hecha · 25 de noviembre de 2026. Herramientas en `src/agente/herramientas/herramientas-reuniones.ts`. `reuniones.proponer` y `reuniones.cancelar` aceptan también el **título** de la reunión (`reunion`), además del id: así el modelo no necesita listar antes, y el simulado puede probarlo. Las aclaraciones y `SOLO_CONVOCANTE` salen con el texto del código, como `TAREA_NO_ENCONTRADA`. Desenlace nuevo `convocada`. Guion del simulado con 11 frases. 15 pruebas en `test/reuniones/reuniones.spec.ts` (`agente.reuniones`, `reuniones.conciliacion`)

### T-134 · Reuniones en la web

- **Satisface:** REQ-CUN06-07, 08, 09, 10, 15, 19, 20 (interfaz) · D-REU-07, 08, 09, 20
- **Depende de:** T-132, T-133
- **Contenido:** el corte «Reuniones» en lugar de «Disponibilidad de equipo»; lista, con la autorización propia; detalle con mapa de calor, resumen de invitados desplegable, duración, sugerido y tarjeta; cancelar; turno `reunion` con las propuestas pulsables
- **Hecho cuando:** pedir una reunión en la conversación muestra las propuestas y la lista la muestra en ámbar; elegir una muestra la tarjeta, y confirmar la deja en verde; el detalle muestra el mapa y recalcula al marcar a alguien como opcional; la invitada la ve agendada
- **Prueba:** `web.reuniones` (extremo a extremo)
- **Estado:** hecha · 25 de noviembre de 2026. `aplicacion/reuniones.tsx` (lista, detalle, mapa, invitados y tarjeta), `acciones-reuniones.ts` (acciones de servidor) y `autorizaciones-equipo.tsx` (la autorización propia y el responsable, REQ-CUN05-19, al pie de la lista). `disponibilidad-equipo.tsx` y `rejilla-disponibilidad.tsx` quedan marcados como anteriores (D-REU-09), sin borrar. En `e2e/reuniones.spec.ts`, `web.escenario-reuniones` conserva CP-R-01 a 04 (CP-R-04 lee ahora el responsable al pie) y retira CP-R-05, que probaba el formulario. Los eventos de «Reuniones Demo» en `arrancar-api.mjs` caen ahora en los cinco días hábiles desde mañana. Decisiones de interfaz en `spec.md` §8. Web e2e 61 de 61. Capturas en `design/capturas/2026-11-25-reuniones/web/`

### T-135 · Reuniones en el móvil

- **Satisface:** REQ-CUN06-07, 10, 15, 19 (interfaz)
- **Depende de:** T-132, T-133
- **Contenido:** el corte «Reuniones» en Agenda; lista; detalle con propuestas y «Elegir», sin mapa; tarjeta; cancelar; turno `reunion` en la capa
- **Hecho cuando:** lo mismo que T-134, sin el mapa, a 390 × 844
- **Prueba:** `movil.reuniones` (extremo a extremo)
- **Estado:** hecha · 25 de noviembre de 2026. `pantallas/reuniones.tsx` (lista y detalle con propuestas, sin mapa); turno `reunion` en `captura.tsx`; corte «Reuniones» en `agenda.tsx`. Los cortes de Agenda pasan a 44 px de alto (RT-20). Cuentas propias `@reuniones-movil.test` en `e2e/cuentas.json`, sobre el mismo bloque de `arrancar-api.mjs`. En el detalle móvil no se marcan opcionales: para eso queda el asistente. Móvil e2e 35 de 35. Capturas en `design/capturas/2026-11-25-reuniones/movil/`. **Pendiente:** en la tarjeta del detalle, el asa «Pedir algo» tapa en parte «Ver detalles» (captura 05)

### T-136 · Cuentas de prueba con Google real

- **Satisface:** ninguna REQ nueva; habilita la prueba con calendarios reales de REQ-CUN06-11, 12 y 13 (excepción de §2.2: tarea de infraestructura)
- **Depende de:** T-132
- **Contenido:** script `semilla-reuniones`, idempotente, sobre la base de desarrollo: organización de empresa «Reuniones Demo», cuatro cuentas del Plan Empresarial con contraseñas temporales de desarrollo escritas en el script (como `semilla.ts`), y los equipos «Proyecto Alfa» (las cuatro) y «Diseño» (dos); instrucciones para conectar un Google real en cada una
- **Hecho cuando:** ejecutarlo dos veces no duplica nada; cada cuenta entra, cambia su contraseña y conecta Google desde Ajustes
- **Estado:** hecha · 25 de noviembre de 2026. `npx pnpm@12.10.1 --filter @nexoai/api semilla-reuniones`: organización «Reuniones Demo», `lider@`, `ana@`, `beto@` y `lucia@reuniones.test`, y los equipos «Proyecto Alfa» y «Diseño». Las contraseñas temporales están en `src/plataforma/semilla-reuniones.ts`; el script no las imprime
