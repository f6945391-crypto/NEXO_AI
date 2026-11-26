# Qué está implementado en NexoAI, con su prueba visual · 7 de noviembre de 2026

**Estado que describe:** tu commit `4a2b3f7` («segunda cambio») más las tandas 2, 3 y 4 de `entregas/` aplicadas en orden. Hasta que apliques las tandas, lo marcado «tanda n» existe solo como parches.
**Cómo leerlo:** una fila por funcionalidad visible. «Captura» es el archivo que la demuestra; «Prueba» es la automática que la cubre (nombre tal como aparece en la suite). Las capturas están dentro del repositorio, en `design/capturas/`.

## Índice

1. Resumen en números
2. Acceso y cuenta
3. Agenda (CUN-01)
4. Conversación con el asistente (07-agente)
5. Tareas personales (CUN-03) · tanda 4
6. Actividad: lo que pasó (hito 4) · tanda 4
7. Zona de empresa: administración (08) · tanda 4
8. Infraestructura · tanda 2
9. Especificado pero no construido
10. Lo que no se pudo verificar aquí

---

## 1. Resumen en números

| | En `4a2b3f7` | Tras tandas 2–4 |
|---|---|---|
| Requisitos en trazabilidad | 157 | **220**, 0 problemas |
| Pruebas de la API (Vitest) | 233 | **332** |
| Pruebas e2e web | 24 | **43** |
| Pruebas e2e móvil | 13 | **24** |
| Secciones con contenido en web y móvil | 1 de 3 (Agenda) | **3 de 3** (Agenda, Tareas, Actividad) |
| Zona de empresa | no existía | entrada propia, Personas, Equipos (lectura), Registro |

## 2. Acceso y cuenta

| Funcionalidad | Web | Móvil | Captura | Prueba |
|---|---|---|---|---|
| Entrar con correo y contraseña; primer ingreso pide contraseña nueva y zona horaria | ✓ | ✓ | `2026-11-04/movil/M02-inicio.png` | `acceso.recorrido-web`, `movil.acceso` |
| Cambiar zona horaria desde Ajustes, viendo qué compromisos cambian de hora | ✓ | — | — | `web.zona` |
| Conectar Google (calendario, correo) | ✓ | ✓ | — | `web.google` |
| Cuenta suspendida o cerrada no entra (tanda 4) | ✓ (API) | ✓ (API) | — | `administracion.suspension-cierra-sesiones` |

## 3. Agenda (CUN-01)

| Funcionalidad | Web | Móvil | Captura | Prueba |
|---|---|---|---|---|
| Hoy con los compromisos reales de Google | ✓ | ✓ | `2026-11-06-pulido/web/web-semana-hoy-despues.png` | `web.agenda`, `movil.agenda` |
| **Semana** y **Mes** con el mismo selector | ✓ | ✓ | `2026-11-06-pulido/{web,movil}/*semana*`, `*mes*` | `web.agenda-semana-y-mes`, `movil.agenda-semana-y-mes` |
| Semana abre con hoy visible (tanda 2) | ✓ | ✓ | `2026-11-06-pulido/web/web-semana-hoy-{antes,despues}.png` | ídem |
| Registrar, cambiar y cancelar un compromiso con tarjeta de confirmación | ✓ | ✓ | `2026-11-04/movil/M05-tarjeta.png` | `web.asistente-agenda-y-confirma`, `movil.captura-propone-y-confirma` |
| Conflicto de horario con alternativas; aviso en una línea (tanda 2) | ✓ | ✓ | `2026-11-06-pulido/*/‑conflicto-tarjeta-despues.png` | ídem |
| Franja «en espera» sobre la agenda de hoy (solo en Hoy; móvil igualado en tanda 2) | ✓ | ✓ | `2026-11-06-pulido/movil/movil-franja-*` | `movil.en-espera-visible` |
| «Tareas para este día» debajo de los compromisos (tanda 4) | ✓ | ✓ | `2026-11-07-tareas/*-hoy-con-tareas-despues.png` | `tareas.del-dia-con-vencidas` |

## 4. Conversación con el asistente

| Funcionalidad | Web | Móvil | Captura | Prueba |
|---|---|---|---|---|
| La conversación no se borra al confirmar; episodios con separador; «Ver anteriores» fijo arriba | ✓ | ✓ | `2026-11-06-t039/anotadas/` | T-038/T-039 (`asistente.spec`, `agente.transcripcion-*`) |
| Tarjeta de confirmación **plegada** en el móvil, con detalle a demanda; tarjeta decidida sin botones (tanda 3) | — | ✓ | `2026-11-07-movil-chat/` (antes 659 px → después 414 px con cruce) | `movil.captura-propone-y-confirma` |
| Barra de escritura de una fila, velo que tapa la cabecera, título «Asistente» con conversación (tanda 3) | — | ✓ | `2026-11-07-movil-chat/` | `movil.estado-vacio-abre-captura` |
| Pedir algo sin modelo configurado queda en espera con motivo | ✓ | ✓ | `2026-11-04/movil/M15-en-espera.png` | `agente.tarea-queda-en-espera` |
| «¿Qué tengo pendiente?» responde con la lista armada por código (tanda 4) | ✓ | ✓ | `2026-11-07-tareas/web-conversacion-que-tengo-pendiente-despues.png` | `agente.tareas.consulta-tal-cual` |
| Completar, reabrir o descartar una tarea por conversación, con candidatas si varias encajan (tanda 4) | ✓ | ✓ | — | `agente.tareas.completar-dice-cual` |
| El asistente rechaza delegar o asignar en el Plan Personal (tanda 4) | ✓ | ✓ | — | `agente.tareas.no-delega` |

## 5. Tareas personales (CUN-03) · tanda 4

| Funcionalidad | Web | Móvil | Captura | Prueba |
|---|---|---|---|---|
| Sección Tareas con tres franjas: Con fecha, Sin fecha, Esperando de alguien; vencidas marcadas | ✓ | ✓ | `2026-11-07-tareas/web-tareas-{con-fecha,sin-fecha,esperando}-despues.png`, `movil-tareas-*` | `tareas.franja-y-orden` |
| Estado vacío por franja, sin formulario | ✓ | ✓ | `*-tareas-vacia-despues.png` | e2e `web.tareas`, `movil.tareas` |
| «Hecho» y «Recibido» sin tarjeta, con «Deshacer»; descartar con tarjeta | ✓ | ✓ | capturas de la sección | `tareas.hecha-y-reabrir`, `tareas.descartar-requiere-confirmacion` |
| Registrar una tarea desde la conversación: se propone, no queda en espera | ✓ | ✓ | — | `tareas.sin-confirmar-no-registra`, `agente.tareas.registra-con-tarjeta` |
| Solo las ve su dueño; funcionan sin calendario y sin modelo | ✓ | ✓ | — | `tareas.solo-las-propias`, `tareas.sin-calendario`, `tareas.consulta-sin-proveedor-de-modelo` |
| Modelo `tarea_personal` (separado del futuro modelo de tareas del equipo) | API | | — | prueba de aislamiento ampliada |
| **No construido:** «Por confirmar» (conversión de lo que quedó en espera antes de CUN-03), T-056/T-057 | | | | REQ-CUN03-17 pendiente |

## 6. Actividad: lo que pasó · tanda 4

| Funcionalidad | Web | Móvil | Captura | Prueba |
|---|---|---|---|---|
| Día · Semana · Mes de compromisos ya ocurridos (cancelados y futuros fuera) | ✓ | ✓ | `2026-11-07-actividad/web-1440-{dia,semana,mes}.png`, `movil-390-*` | `compromisos-ocurridos`, `web.actividad`, `movil.actividad` |
| «Lo que hizo el asistente»: cada acción ejecutada con hora, qué se hizo y origen («En la conversación» / «Desde la pantalla») | ✓ | ✓ | ídem | `registro-del-asistente` |
| Estado vacío por período; sin calendario muestra igual el registro | ✓ | ✓ | `*-vacio.png`, `*-sin-calendario.png` | `sin-calendario`, `solo-lo-propio` |
| **No construido:** tareas completadas en Actividad (T-072, espera a la integración de Tareas) | | | | REQ-CUN02-32 pendiente |

## 7. Zona de empresa: administración · tanda 4

Solo web, en `/administracion`, con entrada propia (`/administracion/entrar`) y sesión separada de la aplicación.

| Funcionalidad | Captura | Prueba |
|---|---|---|
| Entrar en la zona con la misma cuenta; una cuenta personal recibe el texto de credenciales inválidas | `2026-11-07-administracion/01-entrada.png`, `07-rechazo-cuenta-personal.png` | `web.administracion-solo-para-administradores`, `administracion.solo-el-administrador` |
| Personas: tabla con cuenta, estado, plan, equipos, administra | `02-personas.png` | `administracion.lista-de-personas` |
| Dar de alta con contraseña temporal visible una sola vez | `04a-dar-de-alta.png`, `04-contrasena-temporal.png` | `administracion.alta-con-contrasena-una-vez` |
| Cambiar plan, suspender/reactivar, dar de baja (irreversible), restablecer contraseña, nombrar/quitar administrador; todo con tarjeta y registro | `03-tarjeta-suspender.png`, `03b-tarjeta-baja-irreversible.png` | `cambio-de-plan`, `suspension-cierra-sesiones`, `baja-definitiva`, `restablecer-contrasena`, `nunca-sin-administrador`, `toda-accion-confirmada-y-registrada` |
| Equipos en lectura: responsable y miembros, «Sin responsable» destacado | `05-equipos.png` | `web.administracion-cuentas` |
| Registro de acciones administrativas | `06-registro.png` | ídem |
| Administrar no da acceso al trabajo de nadie; nunca escribe en la organización personal | — | `administrar-no-es-ver`, `no-escribe-en-lo-personal` |
| **No construido:** invitar/afiliar (T-063–072), crear equipos y nombrar responsable (T-066–074), botón hacia la zona desde la aplicación, «Mi equipo» | | REQ-ADM-05, 07, 13, 14, 17 en curso; 15 pendientes |

## 8. Infraestructura · tanda 2

| Qué | Estado |
|---|---|
| `apps/api/Dockerfile` (API + trabajador + etapa migraciones), `apps/web/Dockerfile` (standalone), `.dockerignore`, perfil `aplicacion` en compose, CI que construye sin publicar | Escrito y reproducido fuera de Docker; **imágenes sin construir** (no hay demonio aquí). Comandos en `entregas/tanda-2/informes/INFORME-CARRIL-DOCKER.md` |

## 9. Especificado pero no construido

| Área | Qué hay | Qué falta |
|---|---|---|
| 08-administracion | spec, plan, tasks, 12 de 32 REQ implementados | T-063 a T-067 |
| 09-tareas-personales | 19 de 20 REQ implementados | T-056, T-057 («Por confirmar») |
| 02-jornada §8 bis (Actividad) | 10 de 11 REQ | T-072 |
| 02-jornada CUN-02 (planificar jornada, registrar tiempo) | spec de 2026 | plan y código: hito 5 |
| 07-agente | T-038, T-039 hechas | T-040 (nota de continuidad), T-041 (caducidad), T-043; remate sobrante; `motivoEspera` en el contrato |
| Plan Empresarial (CUN-04 a 09) | `ESTRUCTURA-PERFIL-EMPRESARIAL.md` con el orden en 7 bloques | todo el código de los bloques 4 a 7; «Mi equipo» en la zona; diseño (INC-14) |
| Voz | solo la propuesta del botón «Hablar» en la barra | decisión y construcción, sin proveedor externo por ahora |

## 10. Lo que no se pudo verificar aquí

- Las suites e2e completas sí corrieron sobre la rama integrada: web 43/43, móvil 24/24, API 332/332.
- Teléfono real: teclado, zona segura, Expo Go. Todo lo del móvil está probado en Expo web a 390×844.
- Imágenes de Docker.
- Instrucciones nuevas del agente (tareas) contra el proveedor real (Groq); aquí solo con el modelo simulado.
