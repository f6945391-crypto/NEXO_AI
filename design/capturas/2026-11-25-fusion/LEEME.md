# Capturas de la fusión de `main` en `version_parcial` (25 de noviembre de 2026)

Tomadas con el entorno de las pruebas de extremo a extremo de la web (API en 3102 con el calendario simulado, web en 3101, cuentas de `apps/web/e2e/cuentas.json`), a 1440 × 900. La pastilla «1 Insight» de la esquina es la del modo de desarrollo de Next.js.

| Captura | Qué muestra |
|---|---|
| `01-agenda-hoy.png` | Agenda, Hoy: la agenda propia de la línea de Franco, sin cambios tras la fusión |
| `02-agenda-semana.png` | Semana (T-044), con el nivel en la dirección |
| `03-agenda-disponibilidad-de-equipo.png` | El corte «Disponibilidad de equipo» de CUN-05 (Vasco) dentro de Agenda: los ejemplos de la conversación cambian a los del equipo, y la agenda propia no se mezcla (INC-36) |
| `04-agenda-vuelta-a-hoy.png` | Elegir Hoy vuelve a la agenda propia |
| `05-tareas.png` | Tareas personales (`09-tareas-personales`) |
| `06-actividad.png` | Actividad (`02-jornada` §8 bis) |
| `07-zona-personas.png` | Zona de empresa, Personas |
| `08-zona-equipos.png` | Zona de empresa, Equipos: se lee de `miembro_de_equipo` (D-F1); Ventas con su responsable y Soporte sin responsable |

## Móvil

Tomadas con el entorno de las pruebas de extremo a extremo del móvil (Expo web en 3201 contra su propia API, con el calendario y el modelo simulados), a 390 × 844, tamaño de teléfono.

| Captura | Qué muestra |
|---|---|
| `movil-01-agenda-hoy.png` | Agenda, Hoy, en la zona del perfil, con un evento de otra zona y uno donde se es invitado |
| `movil-02-agenda-semana.png` | Semana |
| `movil-03-agenda-mes.png` | Mes |
| `movil-04-capa-asistente.png` | La capa del asistente abierta desde «Pedir algo» |
| `movil-05-tarjeta-de-confirmacion.png` | La tarjeta plegada (H-CAP-01) con el fin al día siguiente y su fecha (T-043) |
| `movil-06-tareas.png` | Tareas, «Con fecha», con una vencida y «Hecho» sin tarjeta |
| `movil-07-actividad.png` | Actividad, Día; la cuenta de prueba está a propósito en Kiritimati (GMT+14) |

El móvil no tiene el corte «Disponibilidad de equipo» ni la zona de empresa: los dos son solo web en esta versión.
