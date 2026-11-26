# Informe — carril Administración (cuentas, planes, afiliación)

**Fecha:** 6 de noviembre de 2026 · **Rama:** `carril-admin`, sobre `base-4a2b3f7` · **Solo documentos:** ningún archivo de código salvo `tools/trazabilidad.py` (una línea de prefijo)

---

## 1. Resumen

Área nueva `specs/08-administracion` con especificación (REQ-ADM-01 a 32), plan y tareas (T-065 a T-074). Lo central:

- **El administrador es una condición de la pertenencia a una organización de empresa**, no un rol de la cuenta ni un tipo de gerente. Varios por organización, nunca ninguno. El primero lo crea el alta de arranque. Administrar no da acceso al trabajo de ningún equipo ni al contenido de ninguna cuenta.
- **Dos clases de cuenta en una empresa:** las **propias** (las dio de alta la empresa: decide plan, suspensión, baja y contraseña, REQ-ACC-12) y las **afiliadas** (cuentas personales que aceptaron sumarse: la empresa solo puede desafiliarlas).
- **La afiliación la propone un administrador y la acepta la persona.** No la pide el usuario ni la asume el sistema, como decidió el equipo; aceptar no es pedirla, y P-10 y R-14 piden que el consentimiento sea de la persona. Mientras no esté afiliada, la cuenta ve exactamente su plan propio.
- **Modelo: la cuenta no se mueve de organización.** Su organización personal se queda y la afiliación es una fila nueva en la empresa. No cambia ninguna de las 11 tablas con `organizacionId`, y la frontera del aislamiento sigue siendo la de la privacidad (plan §3.1).
- **Equipos con un responsable como mucho**, y la autoridad por equipo en la guardia (T-073). Cierra «Rol por equipo» de `SPEC.md` §8 cuando el equipo lo apruebe.
- **Solo web**, como área aparte y no como cuarta sección (R-32). El aviso de afiliación sí está en la web y en el móvil.
- **El asistente no administra** (REQ-ADM-07). Choca con la premisa de `SPEC.md` §1; se deja para que el equipo lo confirme.

`python tools/trazabilidad.py --check`: **189 requisitos, 0 problemas**.

## 2. Commits

| Hash | Mensaje | Archivos |
|---|---|---|
| `2941038` | spec(08-administracion): área de administración y afiliación en EARS | `specs/08-administracion/spec.md` (+588) |
| `d4c8e6e` | spec(glosario): administrador, afiliación y clases de organización | `specs/glosario.md` (+6) |
| `bf33b43` | plan(08-administracion): pertenencia sin mudar la cuenta, guardas y área web | `specs/08-administracion/plan.md` (+267) |
| `316ee32` | tasks(08-administracion): T-065 a T-074, del modelo a los equipos | `specs/08-administracion/tasks.md` (+131) |
| `993cffb` | trazabilidad: registra 08-administracion (REQ-ADM, fase 4) | `specs/trazabilidad.md` (+33), `tools/trazabilidad.py` (+2) |
| (este) | informe del carril | `entregas/INFORME-CARRIL-ADMIN.md` |

```
 specs/08-administracion/plan.md  | 267 ++++++++++++++++++
 specs/08-administracion/spec.md  | 588 +++++++++++++++++++++++++++++++++++++++
 specs/08-administracion/tasks.md | 131 +++++++++
 specs/glosario.md                |   6 +
 specs/trazabilidad.md            |  33 +++
 tools/trazabilidad.py            |   2 +
 6 files changed, 1027 insertions(+)   (sin contar este informe)
```

**Para integrar:**
- **Numeración de tareas.** La última del repositorio era T-045; estas empiezan en **T-065** (T-045 + 20) porque el carril de CUN-03 numera a la vez. Si al integrar queda hueco, se pueden renumerar: aparecen en `tasks.md`, en `plan.md` (§3.4 y §4.2 citan T-073) y en la columna Tarea de `specs/trazabilidad.md`.
- **Conflictos previsibles.** `tools/trazabilidad.py` (una línea en `FASE_POR_PREFIJO`) y `specs/trazabilidad.md` (resumen y filas): si el otro carril también los toca, el conflicto es trivial; se resuelve regenerando con `python tools/trazabilidad.py`. `specs/glosario.md`, si el otro carril añade términos en §1 o §4. **El número de carpeta `08`**: si el carril de CUN-03 crea también un área `08-…`, una de las dos cambia de número.

## 3. Requisitos nuevos

| REQ | En una línea |
|---|---|
| ADM-01 | Dos clases de organización: personal (una cuenta) y de empresa (administradores, cuentas, equipos) |
| ADM-02 | Administrador: autoridad sobre cuentas, afiliaciones y equipos, distinta de la del responsable; no ve el trabajo de nadie |
| ADM-03 | Puede haber varios administradores; ninguna acción deja a la organización sin ninguno |
| ADM-04 | El primer administrador nace en el alta de arranque; los demás los nombra un administrador |
| ADM-05 | El área se ofrece al administrador en la web, y solo en la web |
| ADM-06 | Quien no administra no puede hacer acciones de administración por ninguna vía |
| ADM-07 | El asistente no propone acciones de administración y dice dónde se hacen |
| ADM-08 | Lista de cuentas propias, afiliadas e invitaciones, con estado, plan y equipos; nada de su contenido |
| ADM-09 | Alta de cuenta propia con contraseña temporal mostrada una vez y primer ingreso pendiente |
| ADM-10 | Un alta con un correo que ya tiene cuenta no crea nada y ofrece invitar |
| ADM-11 | Cambio de plan de una cuenta propia, con confirmación |
| ADM-12 | Suspender una cuenta propia cierra sus sesiones y conserva todo; reactivar la devuelve |
| ADM-13 | Baja definitiva de una cuenta propia; sus tareas del equipo quedan sin persona asignada; no se borra nada |
| ADM-14 | Restablecer la contraseña de una cuenta propia: temporal una vez, sesiones cerradas, la zona se conserva |
| ADM-15 | Sobre una cuenta afiliada no se cambia plan, ni se suspende, ni se da de baja, ni se restablece contraseña: solo se desafilia |
| ADM-16 | Toda acción con confirmación previa y registro de quién, sobre quién, qué y cuándo |
| ADM-17 | Sin afiliar, la cuenta ve exactamente su plan propio; lo de empresa se explica, no se hace |
| ADM-18 | Invitar por correo con equipos propuestos: invitación pendiente, aviso en la aplicación y correo que solo avisa |
| ADM-19 | Invitar un correo sin cuenta no envía nada y ofrece darla de alta |
| ADM-20 | Aviso a la persona invitada: quién, a qué equipos, qué cambia y qué no; aceptar o rechazar |
| ADM-21 | Aceptar afilia, da el Plan Empresarial y no mueve ni muestra nada de lo suyo |
| ADM-22 | Rechazar o 14 días sin respuesta cierran la invitación sin cambiar nada |
| ADM-23 | Ninguna afiliación sin la aceptación de la persona, la pida quien la pida |
| ADM-24 | Una empresa a la vez: con una afiliación vigente, otra invitación se ve pero no se acepta |
| ADM-25 | Desafiliar: plan propio de vuelta, fuera de los equipos, tareas sin persona asignada, hilos con su nombre, disponibilidad cortada, aviso |
| ADM-26 | La persona afiliada puede salir por su cuenta, con el mismo efecto; los administradores lo ven |
| ADM-27 | Una cuenta propia no puede salir de su organización |
| ADM-28 | Crear equipo con nombre único en la organización |
| ADM-29 | Añadir a un equipo solo cuentas que pertenecen a la organización; una cuenta en varios equipos |
| ADM-30 | Un responsable por equipo como mucho, con autoridad solo en ese equipo |
| ADM-31 | Quitar de un equipo: tareas sin persona asignada, hilos con su nombre; si era responsable, el equipo queda sin |
| ADM-32 | Un equipo sin responsable no admite asignar tareas y se señala en el área |

## 4. Decisiones tomadas durante el diseño

Todas **pendientes de revisión del equipo**. Las 1 a 15 están en `spec.md` §7; las 16 a 21, en `plan.md` §11.

| # | Decisión |
|---|---|
| H-ADM-01 | Administrador como condición de la pertenencia, distinto de gerente; varios, nunca ninguno |
| H-ADM-02 | El primer administrador lo crea el alta de arranque; después el área sustituye a la línea de comandos en el uso diario |
| H-ADM-03 | La afiliación necesita la aceptación de la persona; la invitación caduca a los 14 días |
| H-ADM-04 | Una sola empresa a la vez |
| H-ADM-05 | Cuentas propias (la empresa decide) y afiliadas (solo se desafilian) |
| H-ADM-06 | Plan Empresarial mientras dura la afiliación; el plan propio se guarda y vuelve |
| H-ADM-07 | La afiliada puede salir; la propia no |
| H-ADM-08 | Al salir de un equipo, tareas sin persona asignada a la vista del responsable; los hilos se quedan con el equipo, firmados |
| H-ADM-09 | Un responsable por equipo, como mucho |
| H-ADM-10 | Solo web, como área aparte al pie de la navegación, no como cuarta sección |
| H-ADM-11 | El asistente no administra (P-04); por eso el área no es un camino manual paralelo (P-11). Choca con la premisa de §1 |
| H-ADM-12 | Toda acción del área con tarjeta de confirmación, aunque no salga de NexoAI |
| H-ADM-13 | Restablecer la contraseña no vuelve a pedir la zona horaria |
| H-ADM-14 | Al administrador se le dice si un correo tiene cuenta (inevitable en el alta), y nada más |
| H-ADM-15 | La baja no borra datos en esta versión |
| H-ADM-16 | Lo de una cuenta afiliada se queda en su organización personal (opción B del plan §3.1) |
| H-ADM-17 | Administrador, responsable y estado de la cuenta se leen de la base en cada petición, no del token |
| H-ADM-18 | Las Operaciones de un administrador se guardan en la organización de la empresa |
| H-ADM-19 | Las cuentas propias siguen viviendo en la organización de la empresa, sin organización personal |
| H-ADM-20 | `rol` queda en desuso; la guarda deja de leerlo en T-073; se retira después |
| H-ADM-21 | Al migrar, el gerente más antiguo de cada empresa (o la cuenta más antigua) pasa a administrador |

## 5. Enmiendas propuestas a requisitos y documentos existentes

No se editó ninguno. Propuestas para que el equipo las decida:

| Dónde | Hoy dice | Propuesta | Por qué |
|---|---|---|---|
| REQ-ACC-01 | «Las cuentas se crean en el sistema con su rol asignado» | «Las cuentas se crean en el sistema: la primera de cada organización, en su alta de arranque; las demás, desde el área de administración (REQ-ADM-09). La aplicación no ofrece registro abierto» | La autoridad ya no va en la cuenta (REQ-ACC-16); el área es la vía diaria |
| REQ-ACC-02 | «la vista que corresponde a su rol» | «la vista que corresponde a su plan y a su pertenencia» | Mismo motivo; toca también H-ACC-05 |
| REQ-ACC-12 | «Esas tres cosas las decide la organización que creó la cuenta (R-45)» | Añadir: «Para una cuenta afiliada, esa organización es la suya, no la empresa. Aceptar o dejar una afiliación (REQ-ADM-20 a 26) no es administrar la cuenta» | Que no se lea como que la persona no puede aceptar ni salir |
| REQ-ACC-13 | «MIENTRAS una cuenta tenga el rol colaborador…» | «MIENTRAS una cuenta sea miembro de un equipo sin ser su responsable, en ese equipo…» | REQ-ACC-16; lo exige T-073 |
| REQ-ACC-14 | «DONDE la cuenta tiene el rol colaborador…» | Pasar a ubicuo: «toda cuenta puede conectar los dos permisos» | Sin rol colaborador, la condición sobra |
| REQ-ACC-15 | «SI una cuenta con el rol colaborador pide asignar…» | «SI una cuenta que no es responsable del equipo afectado pide asignar…» | REQ-ACC-16; lo exige T-073 |
| `06-acceso` §3 | «No invita compañeros desde la aplicación» | «Solo el administrador invita, desde el área de administración (`08-administracion`)» | REQ-ADM-18 |
| `06-acceso` H-ACC-01 y `plan.md` §1 | «no hay interfaz de administración en la fase 1» · «Administración del equipo desde la interfaz (S-5, sin especificar)» | Remitir a `08-administracion` | Ya está especificada |
| Glosario, «Organización» | «Cliente que crea las cuentas, asigna roles y decide el plan» | «Cliente que crea las cuentas y decide su plan. Puede ser personal o de empresa» | Los roles pasan a los equipos |
| Glosario, «Colaborador» | «Tiene cuenta, con el rol `colaborador`» | «Miembro de un equipo del que no es responsable» | REQ-ACC-16 |
| `design/ARQUITECTURA-VISUAL-WEB.md` §7 | «Equipo y permisos … vive en Ajustes» | «Los permisos, en Ajustes; la organización y sus equipos, en Administración, al pie de la navegación, solo para quien administra» | H-ADM-10 |
| REQ-CUN05-12 | «CUANDO el gerente incorpore a un participante externo» | Sin cambio por ahora; ver la pregunta 7 | Quién compone un equipo |

## 6. Líneas para `SPEC.md`

El encargo pedía «§4 fases»; en `SPEC.md` las fases están en §10. Van las dos cosas.

**§4, última línea (módulos de dominio):** añadir «Administración» tras «Identidad y perfil».

**§5, fila nueva** (antes de Total, que pasa a sumar 32 más):

`| Administración | specs/08-administracion/spec.md | — (sistema) | Web (el aviso de afiliación, también en el móvil) | E | ADM-01…32 (32) | borrador | — | borrador | T-065 a T-074 (pendientes) | — | — |`

**§8:**
- «Rol por equipo (REQ-ACC-16)»: añadir «**Propuesta el 2026-11-06** en `08-administracion`: `miembro_equipo.responsable` y `@SoloResponsable(equipo)` (T-073). Se tacha cuando el equipo apruebe el área y las enmiendas a REQ-ACC-13 y 15».
- Fila nueva: «**Hallazgos de administración** H-ADM-01 a 21, pendientes de revisión. Los que más pesan: la afiliación necesita la aceptación de la persona (H-ADM-03); la cuenta no se mueve de organización (H-ADM-16); el asistente no administra (H-ADM-11) | `specs/08-administracion/spec.md` §7, `plan.md` §11; T-065».
- D-18: añadir «Con la afiliación, cada cuenta afiliada tiene el Plan Empresarial mientras dura (H-ADM-06)».

**§9, inconsistencias nuevas:**
- **INC-19.** La premisa de §1 («entre una pantalla más y pedírselo al agente, se elige el agente») frente al área de administración, que es una pantalla sin asistente (H-ADM-11). Propuesta: declarar en §1 que la premisa vale para el trabajo de la persona (los CUN), no para administrar a otras personas.
- **INC-20.** REQ-ACC-13, 14 y 15 y el glosario definen al colaborador por el rol de la cuenta; REQ-ACC-16 lleva la autoridad al equipo. Propuesta: las enmiendas de §5 de este informe.
- **INC-21.** `design/ARQUITECTURA-VISUAL-WEB.md` §7 pone la administración del equipo en Ajustes; `08-administracion` la pone en un área aparte. Propuesta: la enmienda de §5.

**§10, fila de la fase 4:** «**Empieza por `08-administracion`** (T-065 a T-074): sin pertenencia, equipos ni responsable no hay sobre qué apoyar CUN-05 a CUN-09».

**§11:** `| 2026-11-06 | 2.21.0 | **Área nueva de administración, en borrador.** REQ-ADM-01 a 32: administrador de la organización, distinto del gerente; cuentas propias y afiliadas; alta, plan, suspensión, baja y contraseña; afiliación que propone un administrador y acepta la persona; desafiliación; equipos con un responsable. La cuenta no se mueve de organización al afiliarse (opción B, plan §3.1). Hallazgos H-ADM-01 a 21. Tareas T-065 a T-074, pendientes. Términos nuevos en el glosario. INC-19 a 21. Sin cambios de código | specs/08-administracion/spec.md, plan.md, tasks.md, specs/glosario.md, specs/trazabilidad.md, tools/trazabilidad.py, SPEC.md | Equipo (decisión), redactado por Claude |`

## 7. Preguntas para el equipo

1. **¿Opción B?** La cuenta afiliada no se mueve y lo suyo queda en su organización personal (plan §3.1). ¿Y las cuentas propias: siguen viviendo en la empresa, como hoy, o tendrían también su organización personal (H-ADM-19)?
2. **¿La persona acepta la afiliación?** Es lo que más se aparta de la letra de la decisión de hoy («no la pide el usuario ni la asume el sistema»). ¿Y 14 días de plazo?
3. **¿Una sola empresa a la vez** (H-ADM-04)?
4. **¿Se le dice al administrador si un correo tiene cuenta** (H-ADM-14), o se responde igual en los dos casos aunque el alta lo delate?
5. **¿Cuánto se conservan los datos de una cuenta dada de baja** (H-ADM-15)? ¿Y una baja puede devolverle la cuenta a la persona como Personal, en vez de cerrarla?
6. **¿El asistente no administra** (H-ADM-11, INC-19)?
7. **¿Quién compone un equipo:** solo el administrador, como dice esta área, o también su responsable? REQ-CUN05-12 dice que el gerente incorpora a los participantes externos.
8. **¿Un solo responsable por equipo** (H-ADM-09)?
9. **¿Quién lee el registro de las acciones administrativas?** Queda registro, pero esta área no lo muestra.
10. **¿Cuándo se retira `rol`** (H-ADM-20), y se aceptan las enmiendas a REQ-ACC-01, 02, 12, 13, 14 y 15?
11. **Cuadros de diseño.** No existe ninguno del área ni del aviso de afiliación; `spec.md` §5 pide cinco web y el aviso en web y móvil.

## 8. Nota sobre la autoría de los commits

El encargo pedía terminar cada mensaje con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Los commits llevan `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, que es el modelo que hizo el trabajo y la línea que fija la configuración de la sesión, y la misma línea `Claude-Session` pedida. Si hace falta otra, se puede cambiar al convertirlos en parches.
