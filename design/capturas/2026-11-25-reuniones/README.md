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
- **Con el asistente caído** (REQ-CUN06-20): usa la cola de siempre, pero falta su prueba propia.

## Probar con Google real

1. `npx pnpm@12.10.1 --filter @nexoai/api semilla-reuniones` crea, si faltan, `lider@`, `ana@`, `beto@` y `lucia@reuniones.test`, y los equipos «Proyecto Alfa» (las cuatro cuentas) y «Diseño» (líder y Ana). Las contraseñas temporales están en `apps/api/src/plataforma/semilla-reuniones.ts`.
2. Si la pantalla de consentimiento OAuth del proyecto de Google Cloud está en modo «Testing», cada Gmail que se vaya a conectar tiene que figurar en **Usuarios de prueba**. Si no, Google rechaza la conexión.
3. Con la API y la web en marcha, en cada cuenta:
   1. entrar y cambiar la contraseña;
   2. Ajustes › conectar Google con un Gmail propio, uno distinto por cuenta;
   3. Agenda › Reuniones › autorizar a compartir la disponibilidad en «Proyecto Alfa».
4. Desde `lider@`, escribir «busca una hora con el proyecto Alfa esta semana», elegir una propuesta y confirmar. Google envía la invitación a los Gmail conectados (NexoAI lee y guarda esa dirección la primera vez, D-REU-11), y el evento aparece en sus calendarios.
5. Desde `ana@`, «reunión con Ana» pregunta en qué equipo, porque Ana está en dos.
