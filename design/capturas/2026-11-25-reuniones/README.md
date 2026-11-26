# Reuniones (CUN-06): capturas del 25 de noviembre de 2026

Especificación: `specs/10-reuniones/spec.md` (REQ-CUN06-01 a 21). Las capturas salen de las pruebas de extremo a extremo `web.reuniones` y `movil.reuniones`, con el calendario y el modelo simulados. Se pueden repetir con `CAPTURAS_REUNIONES=<carpeta>`.

**Escenario de las capturas:** «Reuniones Demo», equipo «Proyecto Alfa». Están el líder (Lider), Ana y Beto, que autorizaron y tienen calendario; Carla, que no autorizó; y Diego, sin calendario. Beto está de viaje del segundo al quinto día hábil, así que las tres propuestas caen el primer día: la regla de días distintos se aplica solo mientras haya días con algún horario.

## Web (1440 × 900)

| Captura | Qué muestra | Requisito |
|---|---|---|
| `web/01-lista-vacia.png` | Agenda › Reuniones sin reuniones, con el ejemplo pulsable y, al pie, la autorización propia y el responsable del equipo | REQ-CUN06-07; D-REU-31, 32 |
| `web/02-conversacion-propuestas.png` | «reunión con el proyecto Alfa»: el asistente propone 3 horarios sin tarjeta y dice a quién no pudo comprobar; la reunión aparece pendiente | REQ-CUN06-01, 02, 04 |
| `web/03-lista-pendiente-ambar.png` | La reunión pendiente en ámbar, «Elegir horario» | REQ-CUN06-07 |
| `web/04-detalle-mapa-tooltip.png` | Mapa de calor: 5 días hábiles por medias horas, «libres de n», el sugerido con borde y el detalle «Libres 2 de 3 · Ocupados: Beto» | REQ-CUN06-08; D-REU-20 |
| `web/05-invitados-beto-opcional.png` | La línea de invitados desplegada, con Beto marcado como opcional; las propuestas se recalculan | REQ-CUN06-06, 09; D-REU-19 |
| `web/06-tarjeta-convocar.png` | La tarjeta «Convocar esta reunión»: horario, zona, invitados con su dirección, quién no se comprobó y el aviso de Google | REQ-CUN06-10, 12 |
| `web/07-lista-agendada-verde.png` | La reunión ya agendada, en verde, con día y hora | REQ-CUN06-07, 11 |
| `web/08-invitada-lista.png` | Ana la ve como «Convocada por Lider», sin mapa ni «Cancelar» | REQ-CUN06-13, 16 |
| `web/09-invitada-agenda.png` | El compromiso en la agenda de Ana, con la marca de invitada | REQ-CUN06-13 |
| `web/10-tarjeta-cancelar.png` | El líder cancela: la tarjeta dice que Google avisará a los invitados | REQ-CUN06-15 |
| `web/11-sin-plan-sin-corte.png` | Una cuenta del Plan Personal no tiene el corte «Reuniones» | REQ-CUN06-19 |

## Móvil (390 × 844)

| Captura | Qué muestra | Requisito |
|---|---|---|
| `movil/01-lista-vacia.png` | Reuniones vacía, con el ejemplo pulsable | REQ-CUN06-07 |
| `movil/02-capa-propuestas.png` | La capa del asistente con las propuestas pulsables | REQ-CUN06-01, 19 |
| `movil/03-lista-pendiente.png` | La pendiente en ámbar | REQ-CUN06-07 |
| `movil/04-detalle-propuestas-invitados.png` | Detalle sin mapa: propuestas con «Elegir» e invitados desplegados | REQ-CUN06-09, 19 |
| `movil/05-tarjeta-convocar.png` | La tarjeta de convocar, plegada, con los invitados | REQ-CUN06-10. **Pendiente:** el asa «Pedir algo» tapa en parte «Ver detalles» |
| `movil/06-lista-agendada.png` | La reunión agendada en verde | REQ-CUN06-11 |
| `movil/07-vista-invitada.png` | La invitada ve «Convocada por Lider» | REQ-CUN06-13 |
| `movil/08-tarjeta-cancelar.png` | La tarjeta de cancelar | REQ-CUN06-15 |

## Lo que las capturas no muestran

- **Calendarios reales.** Las capturas usan el calendario simulado, que copia el evento en el calendario de cada invitado igual que haría Google (P-REU-04). Para probarlo de verdad están las cuatro cuentas de «Reuniones Demo» (abajo).
- **Mover una reunión** (REQ-CUN06-14), **la conciliación con Google** (REQ-CUN06-17) y **el vencimiento** (REQ-CUN06-18). Están probados en la API (`agente.reuniones` y `reuniones.conciliacion`), sin captura.
- **Con el asistente caído** (REQ-CUN06-20): probado en la API (`reuniones.sin-asistente`, 26 de noviembre de 2026), sin captura.

## Probar con Google real

1. `npx pnpm@12.10.1 --filter @nexoai/api semilla-reuniones` crea, si faltan, `lider@`, `ana@`, `beto@` y `lucia@reuniones.test`, y los equipos «Proyecto Alfa» (las cuatro cuentas) y «Diseño» (líder y Ana). Las contraseñas temporales están en `apps/api/src/plataforma/semilla-reuniones.ts`.
2. Si la pantalla de consentimiento OAuth del proyecto de Google Cloud está en modo «Testing», cada Gmail que se vaya a conectar tiene que figurar en **Usuarios de prueba**. Si no, Google rechaza la conexión.
3. Con la API y la web en marcha, en cada cuenta:
   1. entrar y cambiar la contraseña;
   2. Ajustes › conectar Google con un Gmail propio, uno distinto por cuenta;
   3. Agenda › Reuniones › autorizar a compartir la disponibilidad en «Proyecto Alfa».
4. Desde `lider@`, escribir «busca una hora con el proyecto Alfa esta semana», elegir una propuesta y confirmar. Google envía la invitación a los Gmail conectados (NexoAI lee y guarda esa dirección la primera vez, D-REU-11), y el evento aparece en sus calendarios.
5. Desde `ana@`, «reunión con Ana» pregunta en qué equipo, porque Ana está en dos.

### Lo que hay que saber antes de probar con Google real

- **Una ventana del navegador por cuenta.** La sesión vive en una cookie de `localhost:3001`, compartida por todas las pestañas: entrar con otra cuenta o cerrar sesión en una pestaña cambia todas. Usa una ventana normal, una de incógnito y otro perfil del navegador.
- **La primera invitación de un remitente desconocido pide confirmar una vez en Gmail** que se añada al calendario; desde la segunda, Google la añade sola (lo encontró Franco el 26 de noviembre de 2026). Desde T-138 NexoAI no depende de eso: la reunión llega a la Agenda del invitado igual, leída por su id.
- **El invitado la ve en su Agenda al aceptar.** Mientras no responde, si quien convoca no es un contacto conocido, Google no pone el evento en su lista de eventos, y la Agenda de NexoAI sale de esa lista (D-REU-34). Al aceptar **desde ese mismo Gmail**, el evento entra en la lista y llega a NexoAI en la siguiente sincronización. Comprueba en su Google Calendar que figura «Sí», o con `--paso verificar` que su respuesta es `accepted`: si el navegador tiene varias cuentas de Google abiertas, responder desde el correo puede no registrarse en la cuenta invitada. Solo para verla **antes** de responder hace falta su ajuste «Añadir invitaciones a mi calendario» › «De todo el mundo».
- **Cuándo se ve un cambio de Google en NexoAI** (P-REU-09): como mucho a los 5 minutos con el trabajador en marcha (`node apps/api/dist/trabajador.js`), o al abrir la Agenda si pasaron más de 2 minutos desde la última lectura. Sin el trabajador, solo al abrir la Agenda.
- **Para ver lo que dice Google sin pasar por la pantalla:** `npx pnpm@12.10.1 --filter @nexoai/api probar-reuniones --paso verificar` muestra, por cuenta, si el evento existe, si sale en la lista, la respuesta del invitado y la copia de NexoAI.

## Resultado con Google real (26 de noviembre de 2026, T-137)

Con las cuatro cuentas conectadas a cuatro Gmail distintos, `npx pnpm@12.10.1 --filter @nexoai/api probar-reuniones --paso <paso>` repite el recorrido sin pantalla y comprueba en Google directamente:

| Paso | Resultado |
|---|---|
| `autorizar` | Las cuatro autorizan «Proyecto Alfa» por la Operación de siempre |
| `convocar` | El asistente de Groq propone 3 horarios que no pisan ningún evento de los cuatro calendarios; la tarjeta y el evento invitan a las tres direcciones de Gmail; el evento queda en el calendario del líder y en el de cada invitado, pendiente de respuesta |
| `verificar` | En la web, la vista Mes de los tres invitados no marca el jueves 26. **D-REU-34:** el evento no aparece en la lista de eventos de los invitados mientras no respondan, así que no llega a su Agenda de NexoAI (en Reuniones sí la ven agendada) |
| T-138 | Desde la lectura por id, los tres invitados tienen la reunión en su Agenda, también Ana, cuya lista de Google seguía sin traerla |
| `mover` | Del jueves 26 al viernes 27, 08:00: en los cuatro Google Calendar y en la copia de los tres invitados |
| `google` | Movida en Google a las 09:00 sin avisar: NexoAI toma esa hora, y los invitados también |
| `cancelar` | Pendiente: la reunión queda agendada para verla en la interfaz |

Defecto encontrado y corregido: la dirección de Gmail no se podía leer con el permiso `calendar.events` y la invitación habría salido a `@reuniones.test` (P-REU-07).

