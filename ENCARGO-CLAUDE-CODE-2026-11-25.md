# Encargo para Claude Code — 25 de noviembre de 2026 (después de la fusión)

**Punto de partida:** `version_parcial` en `4dc1845` («Evidencia de la fusión»), `SPEC.md` 2.24.0, última tarea T-119, última INC-37.
**Origen:** revisión de las capturas de la fusión por Franco, 25 de noviembre de 2026.
**Método:** `AGENTS.md`. Primero el `spec.md`, después `SPEC.md`, después `plan.md` → `tasks.md` → código → prueba → `trazabilidad.py --check` → `pnpm verificar`.

## 0. Qué se pide y en qué orden

| Bloque | Qué | Cuándo | Toca código |
|---|---|---|---|
| **B1** | Cuatro requisitos nuevos en EARS, un hallazgo y una decisión propuesta; `SPEC.md` 2.25.0 | Hoy | No |
| **B2** | T-120: el corte «Disponibilidad de equipo» solo con Plan Empresarial efectivo y pertenencia a un equipo, y con el responsable visible | Hoy, es una sesión | Sí |
| **B3** | Pulido para la demostración del 26 de noviembre: cuenta en Lima, web compilada, textos | Hoy, sin tarea | Sí, solo datos y textos |
| **B4** | T-121: cambiar contraseña desde Ajustes | Después del 26 | Sí |
| **B5** | T-122 (puerto de correo saliente) y T-123 (restablecer por enlace). **Bloqueadas por PT-3** hasta que el equipo acepte la propuesta de §3 | Después del aval | Sí |

Lo que **no** se pide: tocar el modelo `equipo` / `miembro_de_equipo`, las pruebas de CUN-05, ni las migraciones de Vasco. El reporte PDF del equipo (REQ-CUN08-04) no entra: el formato aprobado es `design/reporte-equipo-muestra.html` y se muestra como tal.

---

## 1. Requisitos nuevos (B1)

### 1.1 En `specs/05-equipos/spec.md`, a continuación de REQ-CUN05-17

```markdown
### REQ-CUN05-18

**Requisito:** MIENTRAS el plan efectivo de una cuenta no sea el Empresarial, o la cuenta no pertenezca a ningún equipo, EL SISTEMA no mostrará la consulta de disponibilidad de equipo en ningún cliente y rechazará sus consultas en el servidor.

**Origen:** `REPLANTEO.md` §4 (planes acumulativos), REQ-ADM-17 (nada de empresa aparece sin afiliación), H-ADM-06 (plan efectivo), P-04; revisión de Franco del 25 de noviembre de 2026
**Tipo:** dirigido por estado

**Criterio de aceptación**
DADO una cuenta con Plan Personal, o una con Plan Empresarial que no está en ningún equipo
CUANDO abra Agenda en la web
ENTONCES ve solo Hoy, Semana y Mes, y `GET /equipos` y `POST /equipos/:id/disponibilidad` responden 403
Y DADO una cuenta afiliada a una empresa (plan efectivo Empresarial) que pertenece a un equipo
CUANDO abra Agenda
ENTONCES ve también «Disponibilidad de equipo»

---

### REQ-CUN05-19

**Requisito:** CUANDO la persona elija un equipo para consultar su disponibilidad, EL SISTEMA mostrará quién es su responsable y cuántos integrantes tiene antes de consultar.

**Origen:** `SPEC.md` §8, «lo diferencial del responsable»; REQ-CUN05-17; revisión de Franco del 25 de noviembre de 2026
**Tipo:** dirigido por evento

**Criterio de aceptación**
DADO el equipo Ventas con responsable rosa@acme.test y tres integrantes
CUANDO la persona lo elija en el selector
ENTONCES bajo el selector se lee «Responsable: rosa@acme.test · 3 integrantes»
Y DADO un equipo sin responsable
ENTONCES se lee «Sin responsable · n integrantes»
```

### 1.2 En `specs/06-acceso/spec.md`, a continuación de REQ-ACC-17

```markdown
**REQ-ACC-18** · CUANDO el usuario pida cambiar su contraseña desde Ajustes, el sistema le exigirá la contraseña actual y una nueva de al menos 12 caracteres distinta de la actual (H-ACC-02), la cambiará y cerrará todas las demás sesiones de la cuenta, dejando el cambio en la auditoría. *(Revisión de Franco del 25 de noviembre de 2026. No contradice REQ-ACC-12: la contraseña no es correo, plan ni baja.)*

DADO una cuenta con sesión abierta en la web y otra en el móvil
CUANDO cambie su contraseña desde Ajustes de la web con la actual correcta
ENTONCES la siguiente renovación del móvil falla y la web sigue; con la actual incorrecta, un solo error y nada cambia

**REQ-ACC-19** · CUANDO alguien pida restablecer la contraseña de un correo desde Entrar, el sistema responderá siempre lo mismo, exista o no la cuenta, y si existe le enviará al correo de la cuenta, desde la dirección de la plataforma, un enlace de un solo uso que vence a los 30 minutos; CUANDO se use el enlace con una contraseña nueva válida, el sistema la cambiará, cerrará todas las sesiones de la cuenta y lo dejará en la auditoría. *(Revisión de Franco del 25 de noviembre de 2026. Complementa a REQ-ADM-14, el restablecimiento por el administrador. Mismo límite de intentos que REQ-ACC-03. No pasa por Google: INC-13. **Bloqueado por PT-3**.)*

DADO un correo que no existe
CUANDO se pida restablecer
ENTONCES la respuesta es idéntica a la de un correo que existe y no se envía nada
Y DADO un enlace ya usado o vencido
ENTONCES un solo mensaje de error y nada cambia
```

### 1.3 Hallazgo nuevo, en `specs/06-acceso/plan.md` §8 (tabla de hallazgos)

| # | Hallazgo | Decisión propuesta |
|---|---|---|
| H-ACC-07 | `GET /perfil` devuelve `perfil.plan` (el propio), pero el plan que manda en la interfaz es el **efectivo** (`PertenenciasService.planEfectivo`, H-ADM-06). La web decide «Encargadas» y, con REQ-CUN05-18, el corte de disponibilidad con el plan propio: una cuenta afiliada no vería lo de empresa | `Perfil` gana `planEfectivo`; la web y el móvil deciden con ese campo. `plan` se conserva para Ajustes («Plan: Personal, afiliada a Acme») |

### 1.4 Decisión propuesta para PT-3, en `SPEC.md` §8

Reemplazar la fila `PT-3 | Correo real con usuarios de prueba o simulado | CUN-04, ENC` por:

> **PT-3 · Propuesta del 25 de noviembre de 2026, pendiente de aval.** Un puerto propio `EnviadorCorreo` (como `ProveedorModelo`, P-06) con tres implementaciones: **simulado** en pruebas (guarda en memoria y cuenta), **Mailpit** en desarrollo (contenedor en `docker-compose.yml`, buzón en http://localhost:8025, sin salir a internet) y **SMTP** en producción, configurado por `.env` (`CORREO_SMTP_URL`, `CORREO_REMITENTE`), con un proveedor de nivel gratuito. Lo usan REQ-ACC-19, el aviso al colaborador (REQ-CUN07-16, DP-03) y CUN-04. El `gmail.send` del usuario queda solo para el correo asistido (P-08). Bloquea T-122 y T-123.

### 1.5 `SPEC.md`

- Cabecera: **2.25.0**, 25 de noviembre de 2026.
- §5: Equipos pasa a 19 REQ; Acceso a 19; total **+4** sobre el de 2.24.0.
- §8: la fila de PT-3 (§1.4) y una fila nueva: «**H-ACC-07** plan efectivo en `GET /perfil`».
- §11: `2026-11-25 · 2.25.0 · Cuatro requisitos tras la revisión de las capturas de la fusión: REQ-CUN05-18 (disponibilidad solo con plan efectivo Empresarial y equipo), REQ-CUN05-19 (responsable visible), REQ-ACC-18 (cambiar contraseña), REQ-ACC-19 (restablecer por enlace, bloqueado por PT-3). H-ACC-07. Propuesta para PT-3: puerto EnviadorCorreo con Mailpit. Tareas T-120 a T-123. Sin cambios de código · SPEC.md, specs/05-equipos/spec.md, tasks.md, specs/06-acceso/spec.md, plan.md, tasks.md, specs/trazabilidad.md · Franco (revisión), redactado por Claude Code`.
- `python tools/trazabilidad.py` y `--check` en 0. Los cuatro REQ quedan «especificado»; T-120 a T-123 en la tabla.

---

## 2. Tareas

### T-120 · Disponibilidad solo para quien corresponde, con el responsable visible (B2) — `specs/05-equipos/tasks.md`

**Satisface:** REQ-CUN05-18, REQ-CUN05-19, H-ACC-07.

| Dónde | Qué |
|---|---|
| `packages/contratos/src/acceso.ts` | `Perfil` gana `planEfectivo: Plan` y `equipos: number` (cuántos equipos integra) |
| `apps/api/src/identidad/perfil.controller.ts` | Devuelve `planEfectivo` con `PertenenciasService.planEfectivo` y cuenta `miembro_de_equipo` del perfil |
| `apps/api/src/equipos/equipos.controller.ts` | Guarda: si el plan efectivo no es `empresarial` o el perfil no integra ningún equipo → 403 `SIN_PLAN_EMPRESARIAL` / `SIN_EQUIPO`. El controlador conserva `@SobreLoPropio()` |
| `packages/contratos/src/equipos.ts` | La respuesta de `GET /equipos` lleva por equipo `responsable: { correo } \| null` e `integrantes: number` si aún no los lleva |
| `apps/web/src/app/aplicacion/aplicacion.tsx`, `secciones.ts` | «Disponibilidad de equipo» se añade a los cortes de Agenda solo si `perfil.planEfectivo === 'empresarial' && perfil.equipos > 0`. La misma condición reemplaza a `plan === 'empresarial'` en «Encargadas» |
| `apps/web/src/app/aplicacion/disponibilidad-equipo.tsx` | Bajo el selector: «Responsable: … · n integrantes» o «Sin responsable · n integrantes» |

**Pruebas (nuevas):**
- `equipos.disponibilidad-sin-plan`: cuenta Personal → 403 en `GET /equipos` y en la consulta.
- `equipos.disponibilidad-sin-equipo`: cuenta Empresarial sin equipo → 403.
- `equipos.disponibilidad-afiliada`: cuenta afiliada en un equipo → 200 (si INC-37 lo impide, la prueba queda `skip` con la referencia a INC-37).
- `acceso.perfil-plan-efectivo`: `GET /perfil` de una cuenta afiliada devuelve `planEfectivo: 'empresarial'` y `plan: 'personal'`.
- e2e web `agenda.corte-disponibilidad-por-plan`: con la cuenta personal de `cuentas.json` el corte no existe; con la de empresa en Ventas existe y muestra «Responsable: rosa@acme.test».

**No cambiar:** las pruebas existentes de CUN-05 (T-099 a T-119). Si una falla por el 403, su cuenta de prueba no está en un equipo o no es Empresarial: se arregla la semilla de la prueba, no la expectativa.

**Hecho cuando:** `pnpm verificar` en verde; `trazabilidad.py --check` en 0; capturas de Agenda con la cuenta personal (sin corte) y con la de empresa (con responsable).

### T-121 · Cambiar contraseña desde Ajustes (B4) — `specs/06-acceso/tasks.md`

**Satisface:** REQ-ACC-18.
`PATCH /acceso/contrasena { actual, nueva }` con `@SobreLoPropio()`; reutiliza la validación de 12 caracteres y el cierre de sesiones de `autenticacion.service.ts` (lo mismo que hace REQ-ADM-14, pero disparado por la propia cuenta); evento de auditoría `contrasena.cambiada`. En la web, en Ajustes, debajo de «Cambiar zona horaria», el mismo patrón de tarjeta; en el móvil, igual. Es un control directo: no pasa por el agente ni necesita Operación (no tiene efecto externo).
**Pruebas:** `acceso.cambiar-contrasena` (correcta, actual incorrecta, nueva corta, nueva igual a la actual, otras sesiones cerradas) y una e2e web.

### T-122 · Puerto de correo saliente (B5, tras el aval de PT-3) — `specs/06-acceso/tasks.md`

Cita PT-3 y P-06 en lugar de un REQ (tarea de infraestructura, `SPEC.md` §2.2). `apps/api/src/plataforma/correo/`: `EnviadorCorreo` con `CorreoSimulado`, `CorreoSmtp` (sirve para Mailpit y producción; sin SDK de proveedor), selección por `CORREO_PROVEEDOR`. Mailpit en `docker-compose.yml`, puertos 1025 y 8025. Una prueba impide usar un cliente de correo fuera de esa carpeta, como la de P-06 para el modelo.

### T-123 · Restablecer la contraseña por enlace (B5, tras T-122) — `specs/06-acceso/tasks.md`

**Satisface:** REQ-ACC-19. Migración nueva: `restablecimiento_contrasena` (perfil, hash del token, vence en, usado en; en `MODELOS_CON_ORGANIZACION`). `POST /acceso/restablecer { correo }` (público, mismo limitador que el ingreso, siempre 200) y `POST /acceso/restablecer/confirmar { token, nueva }`. Token de 32 bytes aleatorios; se guarda solo el hash; un pedido nuevo invalida los anteriores; usarlo cierra todas las sesiones. Pantallas `/restablecer` en web y móvil; «¿Olvidaste tu contraseña?» en Entrar.
**Pruebas:** `acceso.restablecer` (correo inexistente responde igual y no envía; enlace válido cambia y cierra sesiones; vencido y usado fallan con el mismo mensaje; el correo simulado recibió exactamente uno).

---

## 3. Pulido para la demostración (B3, sin tarea, un commit «Pulido para la demostración del 26 de noviembre»)

1. **Cuenta de la demo en Lima.** Las cuentas de `apps/web/e2e/cuentas.json` y del móvil están en Tokio y Kiritimati a propósito (P-05); no se tocan. Para la demo, la base de desarrollo con `gerente@nexoai.test` y `personal@nexoai.test` en `America/Lima`, y el equipo de «Consultores Asociados» armado desde la zona de empresa con `gerente@` como responsable.
2. **Web compilada**: `pnpm --filter @nexoai/web build` y `start`, para que no salga la pastilla «1 Insight» del modo desarrollo.
3. **Textos del corte de disponibilidad** (`disponibilidad-equipo.tsx`, `consentimiento-equipo.tsx`): se conserva una sola frase explicativa por bloque. Queda «Permite que los integrantes de este equipo consulten tus horarios libres y ocupados. No se comparten títulos ni detalles» (es la justificación del consentimiento, P-10); se quitan «Encuentra horarios libres sin consultar los detalles privados de otros calendarios» (repite lo mismo) y cualquier «(opcional)» que ya diga el valor por defecto del control.
4. Capturas nuevas en `capturas-fusion/` junto a las anteriores: Agenda con la cuenta personal, Agenda con la de empresa y el responsable visible.

---

## 4. Orden de ejecución y puntos de control

| Paso | Hacer | Comprobar antes de seguir |
|---|---|---|
| 1 | B1 completo (specs, SPEC 2.25.0, tasks, trazabilidad) en un commit «Especificación: REQ-CUN05-18 y 19, REQ-ACC-18 y 19, PT-3 propuesta» | `python tools/trazabilidad.py --check` → 0 |
| 2 | T-120 en un commit | `pnpm verificar` en verde; ninguna prueba de T-099 a T-119 modificada en su expectativa (`git diff --stat apps/api/test/equipos` solo semillas) |
| 3 | B3 en un commit | Capturas tomadas |
| 4 | Actualizar `SPEC.md` §10 «siguiente paso» y §11 (2.25.1: T-120 hecha) | — |
| 5 | Avisar: T-121 lista para empezar después del 26; T-122 y T-123 esperan el aval de PT-3 | — |

Si algo del punto 2 obliga a decidir comportamiento que el spec no dice, **no se decide en el código**: se anota como hallazgo en `specs/05-equipos/spec.md` («Decisiones tomadas durante el diseño») y en `SPEC.md` §8, y se pregunta.
