# Casos de prueba — Reuniones (disponibilidad de equipo, CUN-05)

**Tarea:** T-124 (`tasks.md`) · **Requisitos:** REQ-CUN05-01 a 04, 08, 13 a 15, 17 a 19 · **Fecha:** 25 de noviembre de 2026
**Para qué:** probar la disponibilidad de un equipo con personas reales en papeles distintos (administrador, líder e integrantes) y con todos los estados que cambian el resultado. Hasta ahora las pruebas de CUN-05 usaban cuentas sueltas sin calendario, y la zona de empresa no crea equipos todavía (T-066, T-067).

Este documento tiene tres partes: **1. los datos que se necesitan**, **2. los casos** y **3. cómo se ejecutan**, automático (calendario simulado) y manual (Gmail reales).

---

## 1. Datos que se necesitan

### 1.1 Organización y equipo

| Dato | Valor |
|---|---|
| Organización | **Reuniones Demo**, de tipo empresa |
| Equipo | **Proyecto Alfa**, en esa organización |
| Zona horaria de todas las cuentas | `America/Lima` |
| Día de la consulta | **mañana** (el que la pantalla propone por defecto), banda habitual 08:00–20:00 |

**Restricción del modelo (INC-37):** `miembro_de_equipo` exige que la cuenta sea de la misma organización que el equipo. Por eso **todas las cuentas del equipo son cuentas propias de Reuniones Demo**, creadas con `crear-cuenta --organizacion <uuid>`. Una cuenta personal afiliada no puede entrar en el equipo todavía.

### 1.2 Personas

| Clave | Correo de NexoAI | Rol de la cuenta | Plan | En Proyecto Alfa | Autoriza su disponibilidad | Calendario de Google | Para qué está |
|---|---|---|---|---|---|---|---|
| admin | `admin@reuniones.test` | gerente | Empresarial, **administrador** | No | — | No hace falta | Ve el equipo en la zona de empresa; sin equipo no ve el corte (REQ-CUN05-18) |
| lider | `lider@reuniones.test` | gerente | Empresarial | **Responsable** | Sí | Conectado, con eventos | Consulta y aparece como responsable (REQ-CUN05-19) |
| ana | `ana@reuniones.test` | colaborador | Empresarial | Integrante | Sí | Conectado, con eventos | Integrante que también consulta (REQ-CUN05-17) |
| beto | `beto@reuniones.test` | colaborador | Empresarial | Integrante | Sí | Conectado, con eventos | Completa el cálculo común |
| carla | `carla@reuniones.test` | colaborador | Empresarial | Integrante | **No (pendiente)** | Conectado | Sin datos por no autorizar (REQ-CUN05-14, 15) |
| diego | `diego@reuniones.test` | colaborador | Empresarial | Integrante | Sí | **Sin conectar** | Sin datos por calendario (REQ-CUN05-08) |
| pablo | `pablo@reuniones.test` | usuario_personal | **Personal** | No | — | Opcional | Plan Personal: no ve el corte (REQ-CUN05-18) |

Con lider, ana, beto, carla y diego, el equipo tiene **5 personas**, responsable incluido (H-EQ-01).

### 1.3 Eventos de mañana (hora de Lima)

| Persona | Eventos |
|---|---|
| lider | 09:00–10:00 «Comité», 15:00–16:00 «Revisión» |
| ana | 10:00–11:00 «Cliente», 15:30–17:00 «Taller» |
| beto | 08:00–09:30 «Desayuno», 13:00–14:00 «Almuerzo» |
| carla | 11:00–12:00 «Privado» (no debe contar: no autorizó) |
| diego | — (sin calendario) |

Ocupado en común de lider, ana y beto: 08:00–11:00, 13:00–14:00 y 15:00–17:00. **Libre en común: 11:00–13:00 (120 min), 14:00–15:00 (60 min) y 17:00–20:00 (180 min).**

### 1.4 Para la prueba manual con Google (lo que tiene que preparar el equipo)

| Qué | Cuántos | Detalle |
|---|---|---|
| Cuentas de Gmail de prueba | **4**: lider, ana, beto, carla | Sin datos personales (H-AGT-13). Diego y el admin no necesitan Gmail; pablo, opcional |
| Usuarios de prueba en Google Cloud | Las 4 | Pantalla de consentimiento OAuth en modo «Testing» → «Test users»; sin esto Google rechaza la conexión |
| Calendar API habilitada | 1 vez | Ya lo está desde el 22 de octubre de 2026 |
| Eventos en cada Google Calendar | Los de §1.3 | Creados a mano en cada Gmail, en la zona de Lima |
| Alta de las cuentas de NexoAI | 7 | `crear-cuenta --nueva-organizacion "Reuniones Demo" … --administrador` para el admin, y `--organizacion <uuid>` para las demás. Cada una completa su primer ingreso eligiendo Lima |
| Conectar Google | 4 | Cada una entra, va a Ajustes → «Conectar» del calendario y elige su Gmail |
| Equipo y pertenencias | 1 equipo, 5 personas | La zona de empresa todavía no crea equipos (T-066, T-067): se siembra con un script, como `crear-equipo-prueba` de Vasco, adaptado a estas cuentas |
| Autorizar la disponibilidad | lider, ana, beto, diego | Cada una, en Agenda → «Disponibilidad de equipo» → «Autorizar disponibilidad». Carla no |

Las contraseñas temporales las muestra `crear-cuenta` una sola vez: se guardan fuera del repositorio.

---

## 2. Casos

| Caso | Quién | Pasos | Resultado esperado | Requisitos |
|---|---|---|---|---|
| CP-R-01 | pablo | Entra y abre Agenda | Solo Hoy, Semana y Mes. `GET /equipos` → 403 `SIN_PLAN_EMPRESARIAL` | REQ-CUN05-18 |
| CP-R-02 | admin | Entra en la aplicación y abre Agenda | Sin el corte. `GET /equipos` → 403 `SIN_EQUIPO` | REQ-CUN05-18 |
| CP-R-03 | admin | Entra en la zona de empresa → Equipos | Proyecto Alfa con lider como responsable y ana, beto, carla y diego como miembros | REQ-ADM-28 a 32 (lectura) |
| CP-R-04 | lider | Agenda → «Disponibilidad de equipo» | Bajo el selector: «Responsable: lider@reuniones.test · 5 integrantes» | REQ-CUN05-19 |
| CP-R-05 | lider | Consulta a todos, mañana, banda habitual | **Parcial:** 3 consultados; sin datos carla (`sin_consentimiento`) y diego (`calendario_no_disponible`); comunes 11:00–13:00, 14:00–15:00, 17:00–20:00; advertencia de disponibilidad parcial | REQ-CUN05-01, 02, 08 |
| CP-R-06 | lider | Selecciona solo a lider, ana y beto | **Completa**, los mismos tres intervalos, sin advertencia | REQ-CUN05-01, 02 |
| CP-R-07 | lider | Como CP-R-06, con duración de 90 minutos | Los comunes siguen siendo tres; los que admiten 90 minutos son 11:00–13:00 y 17:00–20:00 | REQ-CUN05-03, 04 |
| CP-R-08 | ana | Consulta como CP-R-06 | El mismo resultado que el líder | REQ-CUN05-17 |
| CP-R-09 | todos | Cualquier consulta | La respuesta no trae títulos ni detalles de ningún evento («Comité», «Privado»…) | REQ-CUN05-13 |
| CP-R-10 | carla | Autoriza su disponibilidad; lider consulta a lider, ana, beto y carla | Carla entra en el cálculo: su 11:00–12:00 ocupa; comunes 12:00–13:00, 14:00–15:00, 17:00–20:00 | REQ-CUN05-14 |
| CP-R-11 | ana | Retira su autorización; lider consulta a todos | Ana pasa a sin datos (`sin_consentimiento`) | REQ-CUN05-14, 15 |
| CP-R-12 | lider | Consulta un equipo al que no pertenece | 403 `SOLICITUD_INVALIDA` | REQ-CUN05-17, P-04 |

**Fuera de este grupo:** el asistente («Consulta la disponibilidad de mi equipo para mañana») depende del guion del modelo simulado, que no tiene esa frase, o de Groq; se prueba a mano con el proveedor real. Convocar la reunión es CUN-06, sin especificar.

---

## 3. Cómo se ejecutan

| Modo | Dónde | Qué cubre |
|---|---|---|
| **Automático, API** | `apps/api/test/equipos/escenario-reuniones.spec.ts` (`equipos.escenario-reuniones`), con el calendario simulado | CP-R-01, 02, 04 a 12 |
| **Automático, web** | `apps/web/e2e/reuniones.spec.ts` (`web.escenario-reuniones`), con las cuentas de §1.2 sembradas por `e2e/arrancar-api.mjs` | CP-R-01 a 05 en pantalla |
| **Manual, con Google** | Base de desarrollo, con los datos de §1.4 | Todos, con calendarios reales; el resultado se anota en `INFORME-PRUEBAS-REUNIONES-2026-11-25.md` |
