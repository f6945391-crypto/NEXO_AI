# Guía para Claude Code: fusionar `main` (CUN-05 de Vasco) en `version_parcial` (línea de Franco)

**Fecha:** miércoles 25 de noviembre de 2026. **Entrega:** jueves 26.
**Punto de partida:** rama local `version_parcial` = `36d5ceb` (80 commits sobre `4a2b3f7`: tandas 2 a 5, `SPEC.md` 2.23.2, T-043). `origin/main` = `1e6bf2b` (PR #1 y PR #2 de Vasco: CUN-05 con contratos, consentimiento por Operación, rejilla, agente, `SPEC.md` 2.18.25).
**Resultado esperado:** `version_parcial` con `main` fusionado, `pnpm verificar` en verde, subido, y un PR `version_parcial → main` listo para que Vasco lo revise y se fusione hoy.

**Simulación previa (hecha el 25 de noviembre sobre una reconstrucción de la línea de Franco):** `git merge origin/main` deja **11 archivos en conflicto** y fusiona 55 solos. Además hay **tres choques semánticos** que git no marca (§3). Todo lo de abajo sale de esa simulación.

## Índice

1. Decisiones que fijan la resolución (ya tomadas; no se reabren durante la fusión)
2. Los 11 conflictos, uno por uno: qué lado gana y por qué
3. Los choques que git no marca
4. Orden de trabajo con puntos de control
5. `SPEC.md`: cómo entrelazar 2.18.15–2.18.25 con 2.19–2.23.2
6. Qué no hacer
7. Mensaje para el PR

---

## 1. Decisiones que fijan la resolución

| # | Decisión | Motivo |
|---|---|---|
| D-F1 | **El modelo de equipo es el de Vasco**: tablas `equipo` y `miembro_de_equipo` (enum `rol_en_equipo`: `responsable` / `integrante`; consentimiento como columnas). Las tablas `equipo` y `miembro_equipo` de la tanda 4 **se retiran** antes de haber existido en `main` | Sobre el modelo de Vasco hay ya contratos, Operación de consentimiento, rejilla, agente y 98 pruebas; sobre el de Franco, solo una lectura en la zona de administración (5 usos de `miembroEquipo`) |
| D-F2 | **`miembro_organizacion`, `organizacion.tipo`, `perfil_usuario.estado`, `operacion.ambito` y `sesion_renovacion.ambito` se quedan** (tanda 4) | No chocan con nada de Vasco |
| D-F3 | **Un solo módulo `tareas`**: el de la tanda 4 (`tarea_personal`, 20 REQ). `aixaBranch` no se fusiona; sus aportes se portan después por commits | Ver `SINTESIS-EQUIPO-Y-PLAN-2026-11-24.md` §6.1 |
| D-F4 | **«Disponibilidad de equipo» queda como corte de Agenda** tal como lo dejó Vasco (tres secciones, R-32). Pasarlo a «Mi equipo» de la zona de empresa es tarea posterior al jueves | No cabe antes de la entrega |
| D-F5 | El agente conserva **las dos familias de herramientas**: tareas (Franco) y equipos (Vasco); `HerramientasCaptura` se retira porque la tanda 4 la sustituyó por `HerramientasTareas` (T-050) | Las dos son necesarias; captura quedó obsoleta |
| D-F6 | `SPEC.md` sigue desde **2.24.0**, con las entradas de los dos entrelazadas por fecha en §11 | Dos secuencias de versión no pueden convivir |

## 2. Los 11 conflictos

Notación: **HEAD** = `version_parcial` (Franco); **main** = Vasco.

| # | Archivo | Resolución | Detalle |
|---|---|---|---|
| 1 | `apps/api/src/app.module.ts` | **Unión** | `imports: [Plataforma, Identidad, Operaciones, Integraciones, Agenda, Agente, Actividad, Administracion, Tareas, Equipos]`. Conservar los dos `import` de arriba |
| 2 | `packages/contratos/src/index.ts` | **Unión** | Las cuatro líneas: `actividad`, `administracion`, `tareas`, `equipos` |
| 3 | `apps/api/src/agente/agente.module.ts` | **Unión menos captura** (D-F5) | `import { HerramientasTareas }` + `import { HerramientasEquipos }`; **no** `HerramientasCaptura`. `imports: [AgendaModule, IntegracionesModule, TareasModule, EquiposModule]`. En `providers`: `HerramientasTareas, HerramientasEquipos`. Comprobar que `herramientas-captura.ts` ya no existe en HEAD (T-050 la retiró); si `main` la trae de vuelta por el merge, borrarla |
| 4 | `apps/api/src/plataforma/aislamiento.ts` | **HEAD menos `Equipo`/`MiembroEquipo`, más `MiembroDeEquipo`** (D-F1) | Lista final: …, `'TurnoTranscripcion'`, `'MiembroOrganizacion'`, `'Equipo'`, `'MiembroDeEquipo'`, `'TareaPersonal'`. Un solo `'Equipo'` |
| 5 | `apps/api/prisma/schema.prisma` | **Mixto** (D-F1) | (a) En `Organizacion`: conservar `miembros MiembroOrganizacion[]`, `equipos Equipo[]`, `miembrosDeEquipo MiembroDeEquipo[]`; quitar `miembrosEquipo MiembroEquipo[]`. (b) En `PerfilUsuario`: conservar `membresiasEquipo MiembroDeEquipo[]`; quitar `equipos MiembroEquipo[]`. (c) Conservar de HEAD: `TurnoTranscripcion`, enums `TipoOrganizacion`, `EstadoCuenta`, `OrigenPertenencia`, `EstadoPertenencia`, `AmbitoOperacion`, `AmbitoSesion`, `MotivoRetiro`, `MiembroOrganizacion`, `EstadoTarea`, `TareaPersonal`. (d) **El bloque `model Equipo` es el de main** (comentario «EN-05 … CUN-05», `miembros MiembroDeEquipo[]`, `@@unique([id, organizacionId])`). (e) **Borrar `model MiembroEquipo` de HEAD**; conservar `enum RolEnEquipo`, `enum EstadoConsentimientoEquipo` y `model MiembroDeEquipo` de main. (f) Después: `npx prisma validate` y `npx prisma format` |
| 6 | `apps/api/src/agente/grafo/instrucciones.ts` | **Fusión redactada** | Primera línea: «Eres el asistente de NexoAI…». Segunda: «Sabes, con las herramientas, consultar, registrar, mover y cancelar compromisos de la agenda, consultar, registrar, cambiar, dar por hechas, reabrir y descartar las tareas personales de la persona, y consultar la disponibilidad de sus equipos.» Luego **todas** las viñetas de main sobre equipos (equipo_listar antes de equipo_consultar_disponibilidad, no inventar identificadores ni participantes, parcial, banda solo si se pide, no crea reuniones) y las de HEAD sobre tareas y confirmación. La viñeta «Nunca inventes fechas…» en su versión de HEAD («…compromisos ni tareas»). Después, correr `apps/api/test/agente` entero: las pruebas de instrucciones de los dos lados deben pasar |
| 7 | `apps/web/src/app/aplicacion/aplicacion.tsx` | **HEAD como base, injertando lo de main** | Es el conflicto más largo (6 bloques). Regla: la estructura es la de HEAD (router, `vista`, `corteVisible`, `irA`, `elegirCorte`, franja en espera, tareas del día, Actividad). De main se injerta: (1) `import { DisponibilidadEquipo }`; (2) `const vistaEquipo = seccion === 'agenda' && actual.cortes[corteVisible] === 'Disponibilidad de equipo'` y `const vistaAgendaPersonal = seccion === 'agenda' && !vistaEquipo`; (3) `ejemplos` cambia a los de equipo cuando `vistaEquipo`; (4) en `conLista`, añadir `|| vistaEquipo`; (5) todos los bloques de Agenda de HEAD que hoy comprueban `seccion === 'agenda'` pasan a comprobar `vistaAgendaPersonal` (sin-calendario, estado vacío de Hoy, lista, franja en espera); (6) el bloque `{vistaEquipo && <DisponibilidadEquipo zona={…} />}` de main dentro del lienzo. **Ojo con `elegirCorte`:** en HEAD el corte de Agenda navega por dirección (`?nivel=`); «Disponibilidad de equipo» es el índice 3 de `cortes` y no es un nivel: cuando `indice === 3` en Agenda, `setCorte(3)` sin `router.push`, y `corteVisible` debe devolver 3 en ese caso (hoy devuelve `NIVELES.indexOf(vista.nivel)`). Prueba e2e de Vasco que lo cubre: buscar en `apps/web/e2e` «Disponibilidad de equipo» y hacerla pasar junto con `agenda.spec.ts` de HEAD |
| 8 | `apps/web/src/app/aplicacion/iconos.tsx` | **Unión** | `IconoAnterior`, `IconoSiguiente` (HEAD) e `IconoEquipo` (main), los tres |
| 9 | `apps/web/src/app/globales.css` | **Unión** | Bloque de HEAD (franja en espera, tareas, actividad, tokens `--estado-cargando-opacidad`) y bloque de main (rejilla, consentimiento) uno tras otro. Comprobar que no se repite ningún selector (`grep -c` de cada clase nueva) |
| 10 | `specs/05-equipos/plan.md` | **main**, más la sección de HEAD | El plan de Vasco (§1–§12 con sus avances) es el vigente. La sección que la tanda 4 añadió («Dónde vive cada cosa desde el 7 de noviembre de 2026», carril empresarial) se conserva al final como §13, con una línea que diga que el modelo de datos es el de este plan y no el de `08-administracion` |
| 11 | `SPEC.md` | **Entrelazar** (§5 de esta guía) | No tomar ningún lado entero |

## 3. Los choques que git no marca

| # | Qué | Corrección |
|---|---|---|
| S-1 | **Dos migraciones crean `equipo`**: `20261107T0300_administracion` (Franco) y `20261110145111_agregar_equipos` (Vasco). En una base nueva, la segunda falla | Reescribir `20261107T0300_administracion/migration.sql`: **quitar** `CREATE TABLE "equipo"`, `CREATE TABLE "miembro_equipo"`, sus índices (`equipo_*`, `miembro_equipo_*`, `miembro_equipo_un_responsable`) y sus `ALTER TABLE … FOREIGN KEY`. Conservar `organizacion.tipo`, `perfil_usuario.estado`, `miembro_organizacion` y la migración de datos. Se puede reescribir porque esa migración **nunca llegó a `main`** (solo a la base de Franco, que se recrea). Dejar un comentario en la cabecera: «Reescrita el 25 de noviembre de 2026: las tablas de equipo son las de `20261110145111_agregar_equipos` (CUN-05)». Si `miembro_organizacion.equipos_propuestos` referencia equipos, se queda (es un arreglo de UUID sin clave foránea) |
| S-2 | **Código de administración que lee `miembroEquipo`** (5 usos: `identidad/pertenencias.ts`, `administracion/lecturas.ts`, `administracion/ejecutores-cuentas.ts`) | Cambiar a `miembroDeEquipo`; «responsable» = `rolEnEquipo === 'responsable'`; «miembros» = `rolEnEquipo === 'integrante'`. Las pruebas `administracion.*` que siembran equipos pasan a crear `miembroDeEquipo` con `rolEnEquipo`. La prueba `plataforma.aislamiento-entre-organizaciones` ya cubre las dos tablas de Vasco |
| S-3 | **`specs/trazabilidad.md`** se fusiona «sola» pero queda mal (filas de los dos lados, columnas manuales desalineadas) | Tomar la de HEAD, luego `python tools/trazabilidad.py`, luego reponer a mano las filas `REQ-CUN05-*` tal como están en main (todas «en curso» con sus pruebas) y comprobar `--check` = 0. Total esperado: **220 requisitos** (los 17 de CUN-05 ya estaban contados) |
| S-4 | **Numeración de tareas**: Vasco usa T-099 a T-119; Franco llegó a T-098 tras la renumeración del 7 de noviembre | Compatible. Verificar con `grep -rho "T-[01][0-9][0-9]" specs | sort -u` que no hay duplicados |
| S-5 | **`secciones.ts`** se fusiona sola (Vasco añadió el corte «Disponibilidad de equipo» a Agenda; HEAD no la tocó) | Aceptar. Revisar que el comentario de cabecera siga diciendo tres secciones |
| S-6 | **`herramientas-captura.ts`**: main la modifica (Vasco), HEAD la borró (T-050) | Git la deja borrada o la restaura según el orden; debe quedar **borrada**. Si `herramientas-equipos.ts` importa algo de ella, mover eso a un archivo común |
| S-7 | **Dos `.env.example`** y `pnpm-workspace.yaml`: Vasco añadió `effect@<=3.22.0: 3.22.1`; HEAD añadió `node-forge` (tanda 1) | Unión; `pnpm audit --audit-level high` limpio |

## 4. Orden de trabajo con puntos de control

```
# 0. Punto de partida limpio
git checkout version_parcial && git status --short      # nada en M; solo ?? permitidos
git fetch origin && git log --oneline -1 origin/main     # 1e6bf2b

# 1. Fusión
git merge --no-ff origin/main                            # 11 conflictos esperados (§2)
#    resolver §2 en este orden: 1, 2, 4, 5, 8, 9, 10, 3, 6, 7, 11
#    después §3: S-1, S-2, S-6, S-7

# 2. Punto de control A: compila
npx pnpm@12.10.1 install --frozen-lockfile
pnpm --filter @nexoai/contratos build
pnpm --filter @nexoai/api generar && pnpm --filter @nexoai/api build
npx tsc --noEmit  (en apps/web y apps/movil)

# 3. Punto de control B: base nueva y pruebas
docker compose exec postgres psql -U nexoai -d postgres -c "DROP DATABASE IF EXISTS nexoai_prueba; CREATE DATABASE nexoai_prueba;"
pnpm --filter @nexoai/api test                           # esperado: ~430 (334 de Franco + 98 de CUN-05 − solapes)
#    si falla algo de administracion.* → S-2; si falla una migración → S-1

# 4. Punto de control C: trazabilidad y SPEC
python tools/trazabilidad.py && python tools/trazabilidad.py --check   # 220, 0
#    SPEC.md según §5

# 5. Punto de control D: verificación completa
npx pnpm@12.10.1 verificar                               # tipos, build, API, contratos, e2e web y móvil, trazabilidad

# 6. Commit de fusión y push
git commit -m "Fusión de main (CUN-05) en version_parcial: modelo de equipo de CUN-05, SPEC 2.24.0"
git push origin version_parcial

# 7. Base de desarrollo de Franco
docker compose exec postgres psql -U nexoai -d postgres -c "DROP DATABASE nexoai; CREATE DATABASE nexoai;"
pnpm --filter @nexoai/api migrar && pnpm --filter @nexoai/api semilla
```

Si en el paso 1 aparece un conflicto **que no está en §2**, es porque `version_parcial` difiere de la reconstrucción (T-043 o el commit de integración): resolverlo con el mismo criterio (estructura de HEAD, funciones de main) y anotarlo en el mensaje del PR.

## 5. `SPEC.md`: cómo entrelazar

- **Cabecera:** versión **2.24.0**, última actualización 25 de noviembre de 2026.
- **§4:** fila «Despliegue» de HEAD (Docker). Añadir módulo «Equipos y reuniones» como implementado parcial.
- **§5:** tabla de HEAD (08-administracion, 09-tareas-personales, 02-jornada §8 bis) **y** la fila «Equipos» de main (T-099 a T-119, «parcial», pruebas de Vasco). Total **220 (214 vigentes)**: contar de la trazabilidad regenerada.
- **§6:** CUN-05 con el texto de main; CUN-03 y Actividad con el de HEAD.
- **§8:** las filas de HEAD más las dos de main («Modelo compartido de equipos», «Consentimiento individual CUN-05»). La primera se **cierra hoy** con D-F1: tachar y escribir «Resuelta el 25 de noviembre de 2026: el modelo es el de CUN-05 (`equipo`, `miembro_de_equipo`); la administración lo lee y lo administrará».
- **§9:** INC-16, 17 y 18 de main (de Vasco) **chocan con la numeración** de HEAD (INC-16 a 27 ya usadas en la integración del 7 de noviembre). Las de Vasco pasan a **INC-28, 29 y 30**, y se cambia la referencia en `specs/05-equipos/plan.md` y en sus líneas de §11. Añadir **INC-31**: «el corte Disponibilidad de equipo en Agenda no es un nivel de período (R-38, gramática de Agenda); destino previsto: Mi equipo».
- **§10:** fase 4 «en curso»: CUN-05 parcial funcional; 08 en construcción; hito del jueves.
- **§11:** una sola tabla ordenada por fecha descendente. Las once entradas de Vasco (2.18.15 a 2.18.25, 24 y 25 de noviembre) van **arriba** de las de Franco del 7 de noviembre porque son posteriores; **no se renumeran** (son historia), pero se añade al final de cada una «(numerada desde 2.18.14 en `main`)». Encima de todas, la entrada nueva: `2026-11-25 · 2.24.0 · Fusión de main en version_parcial: modelo de equipo de CUN-05 (D-F1), retiro de equipo/miembro_equipo de 08-administracion, administración sobre miembro_de_equipo, INC de Vasco renumeradas a 28–30, INC-31 · SPEC.md, schema.prisma, migración 0300, apps/api/src/administracion, identidad/pertenencias.ts, agente, aplicacion.tsx, trazabilidad · Franco con Claude Code`.
- `specs/08-administracion/plan.md` §3: nota de que `equipo`/`miembro_equipo` no se crearon y el modelo es el de 05-equipos; `tasks.md` T-066/T-067 (crear equipos, responsable) pasan a escribirse sobre `miembro_de_equipo`.

## 6. Qué no hacer

- No `git rebase` de los 80 commits sobre `main`: reescribe historia que ya está en `version_parcial` remota y vuelve a abrir los conflictos uno por uno.
- No fusionar `aixaBranch` (D-F3).
- No tocar `20261110145111_agregar_equipos` ni `20261110145735_consentimiento…`: están aplicadas en las bases de Vasco (y de Aixa si actualizó).
- No resolver `SPEC.md` tomando un lado entero: se pierde o la historia de Vasco o la de Franco.
- No «arreglar» pruebas de CUN-05 que fallen por el merge cambiando su expectativa: si fallan, es S-2 o S-6.
- No renumerar REQ ni T-nnn.

## 7. Mensaje para el PR `version_parcial → main`

Título: «Integración de la línea de Franco (tandas 2–5) con CUN-05: Tareas, Actividad, zona de administración, conversación móvil, Docker».
Cuerpo: qué entra (lista corta por área con el número de pruebas), las decisiones D-F1 a D-F6, los puntos de control pasados con sus cifras, lo que se pide revisar a Vasco (S-1, S-2, conflicto 7) y a Aixa (CUN-03: `09-tareas-personales` sustituye a `08-tareas-personales`; sus aportes se portan después), y lo que queda para después del jueves (invitación/afiliación, «Mi equipo», «Por confirmar», T-084).
