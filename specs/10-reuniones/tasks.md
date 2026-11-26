# Tareas: Reuniones (CUN-06)

**Plan:** `plan.md`. Numeradas desde **T-131** (propuesta de disponibilidad, §8). Se añaden el 25 de noviembre de 2026.

### T-131 · Mapa y propuestas (dominio)

- **Satisface:** REQ-CUN06-03, 04, 05, 06 · D-REU-02, D-REU-19, D-REU-21 · P-REU-02
- **Depende de:** T-105 (disponibilidad de CUN-05)
- **Contenido:** `dominio/mapa.ts`, que calcula los días hábiles, las bandas por persona y zona, quién está libre por franja y las propuestas; `dominio/grupo.ts`, que reconoce un equipo o una persona por texto (D-REU-17, 18)
- **Hecho cuando:** con tres personas en dos zonas, el mapa marca libre solo lo que cae en la banda de cada uno; las propuestas exigen a los obligatorios, ordenan por opcionales y después por cercanía, y van en días distintos; nada en el pasado; la franja de la tarde empieza a las 13:00; «Ana» encaja con `ana.perez@`, «proyecto alfa» con «Proyecto Alfa»
- **Pruebas:** `reuniones.mapa`, `reuniones.grupo`
- **Estado:** pendiente

### T-132 · La reunión y sus Operaciones (API)

- **Satisface:** REQ-CUN06-07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21 · D-REU-11, 14, 15, 16 · P-REU-01, 03, 04
- **Depende de:** T-131
- **Contenido:** migración `20261125200000_reuniones`; contratos; `ReunionesService`; `GET /reuniones` y `GET /reuniones/:id`; Operaciones `reunion.convocar`, `reunion.mover` y `reunion.cancelar`; invitados, aviso y `direccion` en el proveedor de calendario; `correo_cuenta` al conectar; `409 ES_REUNION` en la agenda
- **Hecho cuando:** convocar crea un evento con los invitados, con aviso, y la reunión queda agendada; confirmar dos veces crea uno; si un obligatorio se ocupó, `reproponer` y no se escribe nada; la invitada ve la reunión agendada y no la pendiente; mover y cancelar avisan; quien no convocó recibe 403; borrar en Google la deja cancelada; pasado el rango, vencida; la dirección es la del Google conectado o el correo de NexoAI; cancelar el compromiso desde la agenda da 409
- **Pruebas:** `reuniones.convocar`, `reuniones.lista-y-detalle`, `reuniones.mover-y-cancelar`, `reuniones.conciliacion`
- **Estado:** pendiente

### T-133 · El asistente propone (agente)

- **Satisface:** REQ-CUN06-01, 02, 03, 05, 06, 10, 14, 16, 19, 20 · D-REU-10, 17, 18, 22, 23
- **Depende de:** T-132
- **Contenido:** herramientas `reuniones.proponer`, `reuniones.listar` y `reuniones.cancelar`; turno `reunion`; decisión `horario`; aclaraciones `REUNION_ACLARAR` y `SOLO_CONVOCANTE` con texto del código; pregunta «¿Con quién es la reunión?»; instrucciones; guion del simulado
- **Hecho cuando:** con el simulado, «reunión con el proyecto Alfa esta semana» deja una reunión pendiente y muestra 3 propuestas sin tarjeta; elegir una propone `reunion.convocar` sin pasar por el modelo; «con Ana» con dos equipos pregunta cuál; «con Carlos» dice que no lo encuentra; sin quién, pregunta; «Beto, si puede» lo deja opcional; «mueve la reunión al viernes» propone del viernes y elegir propone `reunion.mover`; una invitada que pide cancelar recibe el texto de REQ-CUN06-16; con el Plan Personal, el texto de sin acceso
- **Prueba:** `agente.reuniones`
- **Estado:** pendiente

### T-134 · Reuniones en la web

- **Satisface:** REQ-CUN06-07, 08, 09, 10, 15, 19, 20 (interfaz) · D-REU-07, 08, 09, 20
- **Depende de:** T-132, T-133
- **Contenido:** el corte «Reuniones» en lugar de «Disponibilidad de equipo»; lista, con la autorización propia; detalle con mapa de calor, resumen de invitados desplegable, duración, sugerido y tarjeta; cancelar; turno `reunion` con las propuestas pulsables
- **Hecho cuando:** pedir una reunión en la conversación muestra las propuestas y la lista la muestra en ámbar; elegir una muestra la tarjeta, y confirmar la deja en verde; el detalle muestra el mapa y recalcula al marcar a alguien como opcional; la invitada la ve agendada
- **Prueba:** `web.reuniones` (extremo a extremo)
- **Estado:** pendiente

### T-135 · Reuniones en el móvil

- **Satisface:** REQ-CUN06-07, 10, 15, 19 (interfaz)
- **Depende de:** T-132, T-133
- **Contenido:** el corte «Reuniones» en Agenda; lista; detalle con propuestas y «Elegir», sin mapa; tarjeta; cancelar; turno `reunion` en la capa
- **Hecho cuando:** lo mismo que T-134, sin el mapa, a 390 × 844
- **Prueba:** `movil.reuniones` (extremo a extremo)
- **Estado:** pendiente

### T-136 · Cuentas de prueba con Google real

- **Satisface:** ninguna REQ nueva; habilita la prueba con calendarios reales de REQ-CUN06-11, 12 y 13 (excepción de §2.2: tarea de infraestructura)
- **Depende de:** T-132
- **Contenido:** script `semilla-reuniones`, idempotente, sobre la base de desarrollo: organización de empresa «Reuniones Demo», cuatro cuentas del Plan Empresarial con contraseñas temporales de desarrollo escritas en el script (como `semilla.ts`), y los equipos «Proyecto Alfa» (las cuatro) y «Diseño» (dos); instrucciones para conectar un Google real en cada una
- **Hecho cuando:** ejecutarlo dos veces no duplica nada; cada cuenta entra, cambia su contraseña y conecta Google desde Ajustes
- **Estado:** pendiente
