# Plan técnico: Reuniones (CUN-06)

**Especificación:** `specs/10-reuniones/spec.md` (REQ-CUN06-01 a 21). **Tareas:** `tasks.md` (T-131 a T-136).
**Estado:** propuesto el 25 de noviembre de 2026 a pedido de Franco. Se construye mientras se espera el aval del equipo.

Reutiliza lo de CUN-05 sin cambiarlo: `EquiposService` (pertenencia, integrantes y acceso por plan) y `DisponibilidadEquipoService` (permiso, sincronización y eventos ocupados de la réplica).

---

## 1. Módulo

`apps/api/src/reuniones/`, módulo `ReunionesModule`, que importa `EquiposModule`, `AgendaModule` y `OperacionesModule`.

| Archivo | Qué hace |
|---|---|
| `dominio/mapa.ts` | Funciones puras: días hábiles de un rango, bandas por persona en su zona, quién está libre en cada franja de 30 minutos, y las propuestas (REQ-CUN06-04) |
| `dominio/grupo.ts` | Funciones puras: comparar texto sin mayúsculas ni tildes, reconocer un equipo por su nombre (D-REU-17) y una persona por su correo (D-REU-18) |
| `reuniones.service.ts` | Crear la reunión pendiente, resolver el grupo, calcular el detalle, la lista y la conciliación con Google |
| `convocar-reunion.ts`, `mover-reunion.ts`, `cancelar-reunion.ts` | Ejecutores de las Operaciones `reunion.convocar`, `reunion.mover` y `reunion.cancelar` (AD-09) |
| `reuniones.controller.ts` | `GET /reuniones`, `GET /reuniones/:id` |

## 2. Tablas (migración `20261125200000_reuniones`)

```
enum estado_reunion { pendiente, agendada, vencida, cancelada }
enum franja_reunion { manana, tarde }

reunion
  id, organizacion_id, equipo_id, convocante_id (perfil),
  titulo, duracion_minutos, franja (nula),
  zona_horaria          -- la de quien convoca al pedirla (P-05)
  rango_desde, rango_hasta  -- instantes: inicio del primer día y fin del último, en esa zona
  estado, inicio, fin, google_evento_id (nulos hasta agendar)
  creada_en, cambiada_en

invitado_reunion
  id, organizacion_id, reunion_id, perfil_id, opcional,
  direccion (nula: la que se usó al convocar)
  único (reunion_id, perfil_id)

consentimiento_integracion.correo_cuenta (nula)  -- D-REU-11
```

- Las dos tablas nuevas entran en `MODELOS_CON_ORGANIZACION`. Los invitados se crean con `createMany`, sin escrituras anidadas.
- Quien convoca **no** es una fila de `invitado_reunion`: es el organizador del evento.
- La migración se genera con `prisma migrate diff --from-config-datasource` contra la base de desarrollo, como la de T-125.

## 3. Cálculo (P-02, RN-CAL-01)

**Personas del cálculo:** quien convoca y los invitados. Cada una tiene un estado de datos:
- **con datos:** autorizó en ese equipo (`estado_consentimiento = concedida`) y su calendario se puede leer (`verificarCalendario`, como CUN-05);
- **sin autorización** o **sin calendario:** no cuenta en «libres de n» (D-REU-03).

Quien convoca no necesita su propia autorización para leer su calendario: lo lee con su permiso de Google.

**Mapa:** para cada día hábil del rango (lunes a viernes, en la zona de quien convoca) y cada franja de 30 minutos entre las 08:00 y las 20:00 de esa zona (o la franja de D-REU-21), la lista de personas con datos libres en toda la media hora. Una persona está libre si la franja cae dentro de **su** banda de 08:00 a 20:00, en **su** zona, y no se cruza con ninguno de sus eventos confirmados. Solo se usa inicio y fin (RN-CAL-01, P-10).

**Propuestas:** cada inicio posible cada 30 minutos, en el futuro, cuyo intervalo `[inicio, inicio + duración)` cabe en la banda del día. Es válido si todos los **obligatorios** con datos están libres en todo el intervalo. Se ordena por opcionales libres, de más a menos, y después por inicio. Se toma uno por día en ese orden hasta tener 3; si faltan, se completa con otros del mismo día que no se solapen con los ya tomados.

## 4. Grupo (D-REU-17, 18, 22)

`normalizar(texto)`: minúsculas, sin tildes y sin signos. Las palabras «equipo» y «proyecto» se quitan del pedido solo si el nombre del equipo no las tiene.

1. **Con `equipo`:** el equipo del usuario cuyo nombre normalizado es igual al pedido. Si no hay ninguno, el que lo contiene. Si encajan varios, se pregunta.
2. **Con `personas`:** cada nombre se compara con los integrantes de los equipos del usuario. Encaja si el nombre normalizado es igual al correo entero, o si sus palabras coinciden con las primeras palabras de la parte antes de la arroba (`ana.perez` → `ana`, `ana perez`).
   - Si no encaja con nadie: «No encuentro a X en tus equipos.»
   - Si encaja con dos personas distintas: se pregunta cuál.
3. **Equipo de la reunión:** con `equipo`, ese. Sin él, los equipos del usuario que tienen a todas las personas nombradas. Si es uno, ese; si son varios, se pregunta; si no hay ninguno, se dice.
4. **Invitados:** con solo `equipo`, todos sus integrantes menos quien convoca; con `personas`, esas. `sin` quita personas y `opcionales` las marca.

Las aclaraciones vuelven al asistente como `{ error: { codigo: 'REUNION_ACLARAR', mensaje } }`. El grafo las muestra tal cual, como `TAREA_NO_ENCONTRADA` (sin otra vuelta del modelo).

## 5. Contratos (`packages/contratos/src/reuniones.ts`)

| Esquema | Uso |
|---|---|
| `EstadoReunion`, `FranjaReunion` | Enumeraciones |
| `InvitadoReunion` | `perfilId`, `correo`, `nombre` (lo de antes de la arroba), `opcional`, `datos` (`con_datos`, `sin_consentimiento`, `sin_calendario`), `direccion`, `conGoogle` |
| `ReunionResumen` | Una fila de la lista: título, equipo, estado, horario, zona, convocante, `soyConvocante`, cuántos invitados |
| `PropuestaHorario` | `inicio`, `fin`, `libres`, `de`, `opcionalesLibres` |
| `MapaReunion` | `dias[]` con `fecha` y `franjas[]` (`inicio`, `libres: perfilId[]`), y `personasConDatos` |
| `DetalleReunion` | La reunión, sus invitados, el mapa (solo si está pendiente), las propuestas, la duración y `opcionales` usados |
| `ConsultaDetalleReunion` | `duracionMinutos` y `opcionales` (lista separada por comas) para recalcular (REQ-CUN06-09) |
| `ConvocarReunion`, `MoverReunion`, `CancelarReunion` | Cargas de las Operaciones |
| `ArgsProponerReunion`, `ArgsListarReuniones`, `ArgsCancelarReunion` | Herramientas del asistente |
| `PropuestasDeReunion` | El turno `reunion` de la conversación |

`TurnoAsistente` y `TurnoDeHerramienta` ganan el tipo `reunion`. `DecisionAsistente` gana `{ decision: 'horario', reunionId, inicio }`.

## 6. Operaciones

| Tipo | Orígenes | Proponer | Ejecutar |
|---|---|---|---|
| `reunion.convocar` | agente, control directo (DP-01: elegir horario de algo que ya existe) | Pendiente y propia; vuelve a calcular el intervalo; si un obligatorio está ocupado o ya pasó, la tarjeta no se puede confirmar | Sincroniza y comprueba de nuevo (`reproponer`). Después: `crear` con invitados y aviso, réplica, reunión `agendada`, dirección y marca de cada invitado |
| `reunion.mover` | agente | Agendada y propia; mismo control | `actualizar` con aviso; réplica; nuevo horario |
| `reunion.cancelar` | agente, control directo | Propia, pendiente o agendada | Agendada: `cancelar` con aviso y réplica cancelada. Pendiente: solo el estado |

En las tres, si quien pide no convocó la reunión, el error es `403 SOLO_CONVOCANTE` (REQ-CUN06-16).

**`agenda.modificar` y `agenda.cancelar`** rechazan un evento cuyo `google_evento_id` es de una reunión no cancelada: `409 ES_REUNION` (REQ-CUN06-21).

## 7. Calendario

`ProveedorCalendario`:
- `DatosEvento` gana `invitados?: { correo, opcional, perfilId? }[]`.
- `crear`, `actualizar` y `cancelar` ganan `opciones?: { avisar?: boolean }`.
- Nuevo método `direccion(quien)`.

| Implementación | Cambio |
|---|---|
| Google | Con invitados, el cuerpo lleva `attendees` (`optional` cuando corresponde). `sendUpdates` es `all` solo si `avisar` (D-REU-16); lo demás sigue en `none` (H-AG-11). `direccion` lee `GET calendars/primary`: su `id` es la dirección |
| Simulado | El evento se copia en el calendario de cada invitado que tiene `perfilId` (como invitado, `esOrganizador = false`), y mover o borrar con aviso cambia también las copias. `direccion` devuelve lo fijado con `fijarDireccion`, o nada |

**Dirección de la invitación (D-REU-11):** `correo_cuenta` se lee la primera vez que hace falta y se guarda (P-REU-05). Sin Google, se usa el correo de NexoAI.

## 8. Conciliación al leer (REQ-CUN06-17, 18)

Ningún trabajo nuevo: la lista y el detalle **concilian al leerse**.
1. Quien convoca sincroniza su calendario, con el margen de 2 minutos de la agenda.
2. Cada reunión agendada se compara con el evento de su réplica: borrado → `cancelada`; otro horario → se toma el de Google.
3. Cada pendiente cuyo `rango_hasta` ya pasó → `vencida`.

Se escribe solo lo que cambió, y cada cambio queda en la auditoría (`reunion.conciliada`).

## 9. Asistente

| Herramienta | Qué hace |
|---|---|
| `reuniones.proponer` | Resuelve el grupo (§4) y crea la reunión pendiente, sin tarjeta (D-REU-10, auditada como `reunion.creada`). Con `reunionId`, vuelve a buscar para una reunión que ya existe: pendiente, o agendada para moverla. Devuelve el turno `reunion` |
| `reuniones.listar` | Las reuniones del usuario, para encontrar el `reunionId` |
| `reuniones.cancelar` | Propone `reunion.cancelar` |

- **Decidir un horario:** el turno `reunion` deja en el estado del grafo `reunion: { id, inicios }`, como las candidatas de una tarea. `POST /asistente/decisiones { decision: 'horario' }` propone `reunion.convocar` (o `reunion.mover` si ya está agendada) sin pasar por el modelo, y el grafo espera la tarjeta.
- **Instrucciones:**
  - «para reuniones usa `reuniones_proponer`, nunca `agenda_registrar_evento`»;
  - las fechas van en año-mes-día;
  - no elijas tú el horario;
  - para mover o cancelar una reunión, usa las herramientas de reuniones.
- **Guion del simulado:** «reunión con …», «… si puede», «… esta semana», «por la tarde», «cancela la reunión …», «mueve la reunión … al viernes».

## 10. Interfaz

| Plataforma | Qué |
|---|---|
| Web | Corte «Reuniones» de Agenda, en lugar de «Disponibilidad de equipo». Lista, con la autorización propia al pie (lo que antes estaba en medio de la consulta). Detalle con mapa de calor, línea de invitados desplegable, duración, sugerido, tarjeta en la misma vista y «Cancelar reunión». El turno `reunion` en la conversación, con las propuestas pulsables y «Ver todos los horarios» |
| Móvil | Corte «Reuniones» en Agenda. Lista, detalle con propuestas y «Elegir», tarjeta, cancelar; el turno `reunion` en la capa. Sin mapa de calor |

## 11. Decisiones del plan

| # | Decisión |
|---|---|
| P-REU-01 | La conciliación y el vencimiento se hacen **al leer**, no en el trabajador: una reunión solo se ve al leerla, y así no hace falta otro trabajo cada minuto |
| P-REU-02 | El mapa usa la zona de quien convoca para las filas, y la banda de cada persona en su zona para saber si está libre |
| P-REU-03 | `reunion.convocar` acepta `control_directo` y `opcionales`: es como se confirma desde el detalle sin el asistente (REQ-CUN06-20) |
| P-REU-04 | El calendario simulado copia el evento a los invitados, para que las pruebas y las capturas muestren lo que haría Google |
| P-REU-05 | La dirección de Google se lee (`GET calendars/primary`) y se guarda en `correo_cuenta` la primera vez que hace falta, no al conectar. Sirve también para las cuentas que ya estaban conectadas, y no toca el retorno de OAuth |
| P-REU-06 | Después de convocar, mover o cancelar, se sincroniza la agenda de cada invitado que tiene Google conectado. Así el compromiso aparece enseguida en su Agenda, y el cálculo siguiente no usa una copia vieja |
