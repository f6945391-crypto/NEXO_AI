# NexoAI — casos de uso de la versión del 25 de noviembre de 2026

**Rama:** `version_parcial`, después de la fusión con `main` (CUN-05) y de T-120 · **`SPEC.md`:** 2.25.2
**Qué es:** cada caso de uso que la versión tiene hoy, con su captura, el requisito que cumple, la prueba automática que lo cubre y lo que se vio al revisarlo a mano (testeo visual). Al final, la lista de lo que se ve mal encajado, para el feedback del equipo antes de reestructurar la interfaz.

**Cómo se tomaron las capturas.** Web: compilada (`next build` y `next start`), 1440 × 900, contra la API de las pruebas de extremo a extremo, con el calendario y el asistente simulados y las cuentas de `apps/web/e2e/cuentas.json`. Móvil: Expo web a 390 × 844, con `apps/movil/e2e/cuentas.json`. Las fechas son las del 25 de noviembre de 2026. Ninguna captura usa Google ni Groq reales.

**Testeo visual:** ✅ se ve y funciona como dice la especificación · ⚠️ funciona, pero algo se ve mal (detalle en §4) · ❌ no funciona.

---

## 1. Web (1440 × 900)

### 1.1 Acceso

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W01 | Entrar con correo y contraseña | ![](web/01-acceso-entrar.png) | REQ-ACC-02, 03 | `acceso.recorrido-web` | ✅ |
| W02 | Credenciales erróneas: un solo mensaje, sin decir si el correo existe | ![](web/02-acceso-credenciales-erroneas.png) | REQ-ACC-03 | `acceso.recorrido-web` | ✅ |
| W03 | Primer ingreso: contraseña nueva y zona horaria | ![](web/03-acceso-primer-ingreso.png) | REQ-ACC-04, 05 | `acceso.zona-horaria-requiere-eleccion` | ✅ |

### 1.2 Agenda

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W04 | Hoy: compromisos en la zona de la persona, otra zona, invitado y todo el día | ![](web/04-agenda-hoy.png) | REQ-CUN01-09, 10, 12 | `agenda.horas-con-zona-horaria` | ✅ |
| W05 | Semana, de lunes a domingo, hoy destacado | ![](web/05-agenda-semana.png) | REQ-CUN01-14 | `web.agenda-semana-y-mes` | ✅ |
| W06 | Mes, con puntos por compromisos | ![](web/06-agenda-mes.png) | REQ-CUN01-15 | `web.agenda-semana-y-mes` | ✅ |
| W07 | Un día elegido en el mes, con «Volver a hoy» | ![](web/07-agenda-dia-elegido-en-el-mes.png) | REQ-CUN01-15 | `web.agenda-semana-y-mes` | ✅ |
| W08 | Hoy vacío: lleva a pedírselo al asistente, sin formulario | ![](web/08-agenda-hoy-vacia.png) | REQ-CUN01-12, R-42 | `agenda.estado-vacio-abre-captura` | ✅ |
| W09 | Sin calendario conectado | ![](web/09-agenda-sin-calendario-y-en-espera.png) | REQ-CUN01-08, REQ-ACC-08 | `web.en-espera-visible` | ✅ |

### 1.3 Conversación con el asistente

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W11 | Pedir un compromiso: tarjeta de confirmación con lo que puso el sistema | ![](web/11-conversacion-tarjeta-de-confirmacion.png) | REQ-CUN01-01, 03, P-03 | `web.asistente-agenda-y-confirma` | ✅ |
| W12 | Confirmar: el compromiso queda y la línea «Se registró» separa el episodio | ![](web/12-conversacion-confirmado.png) | REQ-CUN01-03, REQ-AGT-03 | `web.asistente-historial` | ✅ |
| W13 | Consultar la agenda: la lista la arma el código | ![](web/13-conversacion-consulta-de-agenda.png) | REQ-CUN01-13 | `web.asistente-agenda-y-confirma` | ✅ |
| W14 | Pedir algo que todavía no hace (un correo) | ![](web/14-conversacion-lo-que-todavia-no-hace.png) | REQ-AGT-02 | `web.asistente-*` | ✅ |

### 1.4 Tareas

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W15 | Con fecha, con una vencida | ![](web/15-tareas-con-fecha.png) | REQ-CUN03-06, 07 | `web.tareas-por-franja` | ✅ |
| W16 | Sin fecha | ![](web/16-tareas-sin-fecha.png) | REQ-CUN03-06 | `web.tareas-por-franja` | ✅ |
| W17 | Esperando de alguien, con «Recibido» | ![](web/17-tareas-esperando-de-alguien.png) | REQ-CUN03-04, 09 | `web.tareas-por-franja` | ✅ |
| W18 | Sin tareas | ![](web/18-tareas-vacias.png) | REQ-CUN03-08 | `web.tareas-por-franja` | ✅ |

### 1.5 Actividad

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W19 | Día: compromisos ocurridos y lo que hizo el asistente | ![](web/19-actividad-dia.png) | REQ-CUN02-25 a 28 | `web.actividad` | ✅ |
| W20 | Semana | ![](web/20-actividad-semana.png) | REQ-CUN02-29 | `web.actividad` | ✅ |
| W21 | Mes | ![](web/21-actividad-mes.png) | REQ-CUN02-30 | `web.actividad` | ✅ |
| W22 | Sin calendario | ![](web/22-actividad-sin-calendario.png) | REQ-CUN02-34 | `web.actividad` | ✅ |

### 1.6 Ajustes

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W23 | Perfil y permisos de Google | ![](web/23-ajustes.png) | REQ-ACC-06, 12 | `acceso.conectar-google-por-permiso` | ⚠️ U-03 |
| W24 | Cambiar la zona horaria | ![](web/24-ajustes-cambiar-zona.png) | REQ-ACC-10, 11 | `acceso.cambiar-zona-desde-ajustes` | ⚠️ U-01, U-02 |

### 1.7 Por plan: quién ve las reuniones

«Reuniones» es el corte **Disponibilidad de equipo** de Agenda. Solo lo tiene quien tiene plan efectivo Empresarial **y** está en un equipo (REQ-CUN05-18). Las capturas usan las cuentas del escenario de reuniones (`specs/05-equipos/casos-de-prueba.md`).

| # | Cuenta | Captura | Qué se ve | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W25 | **Plan Personal** (pablo) | ![](web/25-plan-personal-agenda-sin-reuniones.png) | Agenda con Hoy, Semana y Mes: **sin reuniones** | `web.escenario-reuniones` (CP-R-01) | ✅ |
| W26 | Plan Personal, Ajustes | ![](web/26-plan-personal-ajustes.png) | «Plan: Personal» | — | ⚠️ U-03 |
| W27 | **Plan Empresarial sin equipo** (el administrador) | ![](web/27-plan-empresarial-sin-equipo-agenda-sin-reuniones.png) | **Sin reuniones**, y el botón de Administración al pie | `web.escenario-reuniones` (CP-R-02) | ✅ |
| W28 | Plan Empresarial, Ajustes | ![](web/28-plan-empresarial-ajustes.png) | «Plan: Empresarial» | — | ⚠️ U-03 |
| W29 | **Plan Empresarial en un equipo** (el líder) | ![](web/29-plan-empresarial-con-equipo-agenda-con-reuniones.png) | Agenda **con** «Disponibilidad de equipo» | `agenda.corte-disponibilidad-por-plan` | ✅ |
| W30 | El líder en Tareas | ![](web/30-plan-empresarial-tareas-con-encargadas.png) | Con «Encargadas», que todavía no tiene contenido (CUN-07) | `web.armazon` | ⚠️ U-10 |

### 1.8 Reuniones (disponibilidad de equipo)

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W31 | El líder abre el corte: responsable e integrantes bajo el selector | ![](web/31-reuniones-lider-antes-de-consultar.png) | REQ-CUN05-19 | CP-R-04 | ✅ |
| W32 | Resultado de consultar a todos (parte de arriba) | ![](web/32-reuniones-lider-resultado-parcial.png) | REQ-CUN05-01, 02 | CP-R-05 | ⚠️ U-06 |
| W33 | Resultado: participantes sin datos y disponibilidad parcial | ![](web/33-reuniones-lider-resultado-parcial-abajo.png) | REQ-CUN05-08 | CP-R-05 | ⚠️ U-06 |
| W33b | **Resultado completo, con la rejilla** (ventana alta) | ![](web/33b-reuniones-resultado-completo-con-rejilla.png) | REQ-CUN05-01 a 04, 08, 13 | CP-R-05 | ⚠️ U-04 a U-08 |
| W34 | Una integrante abre el corte | ![](web/34-reuniones-integrante.png) | REQ-CUN05-17 | CP-R-08 (API) | ✅ |
| W35 | Una integrante con la autorización pendiente | ![](web/35-reuniones-autorizacion-pendiente.png) | REQ-CUN05-14 | CP-R-10 (API) | ✅ |

### 1.9 Zona de empresa

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W36 | Entrada propia de la zona | ![](web/36-zona-entrar.png) | REQ-ADM-05, H-ADM-22 | `web.administracion-solo-para-administradores` | ✅ |
| W37 | Personas: cuentas, plan, equipos y quién administra | ![](web/37-zona-personas.png) | REQ-ADM-08 | `web.administracion-*` | ✅ |
| W38 | Equipos, en lectura | ![](web/38-zona-equipos.png) | REQ-ADM-28 a 32 (lectura) | `web.escenario-reuniones` (CP-R-03) | ✅ |
| W39 | Registro de lo hecho en la zona | ![](web/39-zona-registro.png) | INC-31 | `web.administracion-*` | ⚠️ U-03 |
| W40 | Un responsable que no administra: solo sus equipos | ![](web/40-zona-responsable-sin-administrar.png) | Plan §7.1 | `administracion.*` (API) | ✅ |

### 1.10 Colaborador

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| W41 | Agenda de un colaborador que está en un equipo | ![](web/41-colaborador-agenda.png) | REQ-ACC-13, REQ-CUN05-17 | — | ✅ |
| W42 | Tareas del colaborador: sin «Encargadas» | ![](web/42-colaborador-tareas.png) | REQ-ACC-15 | `acceso.recorrido-web` | ✅ |

---

## 2. Móvil (390 × 844)

El móvil no tiene «Disponibilidad de equipo» ni la zona de empresa: en esta versión son solo de la web.

| # | Caso de uso | Captura | Requisitos | Prueba automática | Testeo visual |
|---|---|---|---|---|---|
| M01 | Entrar | ![](movil/m01-acceso-entrar.png) | REQ-ACC-02 | `movil.acceso-recorrido` | ✅ |
| M02 | Credenciales erróneas | ![](movil/m02-acceso-credenciales-erroneas.png) | REQ-ACC-03 | `movil.acceso-recorrido` | ✅ |
| M03 | Primer ingreso | ![](movil/m03-acceso-primer-ingreso.png) | REQ-ACC-04, 05 | `movil.acceso-recorrido` | ✅ |
| M04 | Hoy | ![](movil/m04-agenda-hoy.png) | REQ-CUN01-10 | `agenda.horas-con-zona-horaria` | ✅ |
| M05 | Detalle de un compromiso | ![](movil/m05-agenda-detalle-de-un-compromiso.png) | REQ-CUN01-06 | `agenda.cancelar-requiere-confirmacion` | ✅ |
| M06 | Cancelar con su tarjeta de confirmación | ![](movil/m06-agenda-cancelar-con-confirmacion.png) | REQ-CUN01-06, P-03 | `agenda.cancelar-requiere-confirmacion` | ✅ |
| M07 | Semana | ![](movil/m07-agenda-semana.png) | REQ-CUN01-14 | `movil.agenda-semana-y-mes` | ✅ |
| M08 | Mes | ![](movil/m08-agenda-mes.png) | REQ-CUN01-15 | `movil.agenda-semana-y-mes` | ✅ |
| M09 | Hoy vacío | ![](movil/m09-agenda-hoy-vacia.png) | REQ-CUN01-12 | `agenda.estado-vacio-abre-captura` | ✅ |
| M10 | La capa del asistente | ![](movil/m10-capa-del-asistente.png) | REQ-CAP-01 | `movil.captura-propone-y-confirma` | ✅ |
| M11 | Tarjeta plegada | ![](movil/m11-capa-tarjeta-plegada.png) | H-CAP-01 | `movil.captura-propone-y-confirma` | ✅ |
| M12 | Tarjeta con «Ver detalles» | ![](movil/m12-capa-tarjeta-con-detalles.png) | H-CAP-01 | `movil.captura-propone-y-confirma` | ⚠️ U-11 |
| M13 | Confirmado | ![](movil/m13-capa-confirmado.png) | REQ-CUN01-03 | `movil.captura-propone-y-confirma` | ✅ |
| M14 | En espera, distinto de un fallo | ![](movil/m14-capa-en-espera.png) | REQ-CAP-23, 24 | `movil.captura-en-espera` | ✅ |
| M15 | Tareas con fecha | ![](movil/m15-tareas-con-fecha.png) | REQ-CUN03-06 | `movil.tareas-por-franja` | ✅ |
| M16 | Tareas sin fecha | ![](movil/m16-tareas-sin-fecha.png) | REQ-CUN03-06 | `movil.tareas-por-franja` | ✅ |
| M17 | Esperando de alguien | ![](movil/m17-tareas-esperando-de-alguien.png) | REQ-CUN03-04 | `movil.tareas-por-franja` | ✅ |
| M18 | Sin tareas | ![](movil/m18-tareas-vacias.png) | REQ-CUN03-08 | `movil.tareas-*` | ✅ |
| M19 | Actividad, Día | ![](movil/m19-actividad-dia.png) | REQ-CUN02-25 | `movil.actividad` | ✅ (la cuenta está en Kiritimati a propósito) |
| M20 | Actividad, Semana | ![](movil/m20-actividad-semana.png) | REQ-CUN02-29 | `movil.actividad` | ✅ |
| M21 | Actividad, Mes | ![](movil/m21-actividad-mes.png) | REQ-CUN02-30 | `movil.actividad` | ✅ |
| M22 | Actividad sin calendario | ![](movil/m22-actividad-sin-calendario.png) | REQ-CUN02-34 | `movil.actividad` | ✅ |
| M23 | Ajustes, **Plan Personal** | ![](movil/m23-ajustes-plan-personal.png) | REQ-ACC-12 | — | ⚠️ U-03, U-12 |
| M24 | Agenda de una cuenta de **Plan Empresarial** | ![](movil/m24-plan-empresarial-agenda.png) | — | — | ✅ |
| M25 | Ajustes, **Plan Empresarial** | ![](movil/m25-ajustes-plan-empresarial.png) | REQ-ACC-12 | — | ⚠️ U-03, U-12 |

---

## 3. Estado de las pruebas automáticas

| Conjunto | Resultado | Dónde |
|---|---|---|
| API | 480 de 480, más 1 en `skip` por INC-37 | `apps/api/test` |
| Contratos | 127 de 127 | `packages/contratos` |
| Extremo a extremo, web | 53 de 53 | `apps/web/e2e` |
| Extremo a extremo, móvil | 24 de 24 | `apps/movil/e2e` |
| Escenario de reuniones (CP-R-01 a 12) | API 11 de 11, web 4 de 4 | `equipos.escenario-reuniones`, `web.escenario-reuniones` |

**Lo que no cubre ninguna prueba automática:** Google y Groq reales, un teléfono real (teclado, zona segura), y el asistente consultando la disponibilidad del equipo (el guion simulado no tiene esa frase).

---

## 4. Lo que se ve mal encajado (para el feedback)

Solo se anota; la reestructuración la decide el equipo.

| # | Dónde | Qué se ve | Captura |
|---|---|---|---|
| U-01 | Ajustes, web | Al cambiar la zona, el selector y las tarjetas de Google se salen del panel por la derecha | W24 |
| U-02 | Ajustes, web | «Cambiar zona horaria» queda desplazado bajo la columna del valor, no alineado | W23, W26 |
| U-03 | Web y móvil | La zona se escribe de dos maneras: «America/Lima · GMT-5» en Ajustes y en el Registro, y «Hora de Lima (GMT-5)» en Agenda y en la conversación | W23, W39, M23 |
| U-04 | Rejilla de reuniones | El eje de horas se corta a la derecha: no se ven 19:00 ni 20:00 y «180 min» queda recortado | W33b |
| U-05 | Rejilla de reuniones | Textos sin tilde: «Sin informacion», «Duracion» | W33b |
| U-06 | Reuniones | El resultado repite «Zona horaria: America/Lima» dos veces y usa el nombre IANA, no «Hora de Lima (GMT-5)» | W33, W33b |
| U-07 | Reuniones | «Seleccionar todos» y «Deseleccionar todos» son botones nativos sin el estilo del resto | W33b |
| U-08 | Reuniones | La sección es muy larga: autorización, selección, resultado, rejilla y lista en una sola columna; con 900 px de alto no se ve el resultado sin desplazarse | W32, W33b |
| U-09 | Reuniones | «Otras opciones de búsqueda» aparece escrito así, con el código de la tilde, cuando no hay horarios comunes | código (`disponibilidad-equipo.tsx`) |
| U-10 | Tareas, web | «Encargadas» aparece para el responsable, pero no tiene contenido hasta CUN-07 | W30 |
| U-11 | Móvil | Con «Ver detalles», la tarjeta repite el título, la fecha y la hora que ya están arriba | M12 |
| U-12 | Móvil | En Ajustes, el título queda más adentro que el resto del panel; tampoco ofrece conectar Google (solo desde la web, por diseño §5.6) | M23, M25 |

**Corregido al tomar estas capturas:** la rejilla de reuniones se veía sin ningún estilo (texto corrido, sin barras). Era un defecto de la fusión del 25 de noviembre: a una regla de `globales.css` le faltaba la llave de cierre, y todas las reglas de la rejilla quedaron anidadas dentro de ella. Ver `SPEC.md` §11, 2.25.2.
