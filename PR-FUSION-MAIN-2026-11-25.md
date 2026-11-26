# PR `version_parcial` → `main`

**Título:** Integración de la línea de Franco (tandas 2 a 5) con CUN-05: Tareas, Actividad, zona de administración, conversación móvil, Docker

**Fecha:** 25 de noviembre de 2026 · **Guía seguida:** `GUIA-FUSION-MAIN-2026-11-25.md` · **`SPEC.md`:** 2.24.0

---

## Qué entra

`version_parcial` (80 commits sobre `4a2b3f7`, tandas 2 a 5 y T-043) con `origin/main` (`1e6bf2b`, PR #1 y #2 de Vasco, CUN-05) fusionado en un commit de fusión. No se reescribió historia: no hay rebase.

| Área | Qué trae | Pruebas |
|---|---|---|
| Tareas personales (CUN-03, `09-tareas-personales`) | Registrar, consultar por franjas, completar, «Recibido», reabrir, descartar y cambiar; las tareas del día en Hoy; el asistente; web y móvil | API y e2e web/móvil |
| Actividad (`02-jornada` §8 bis) | Día, Semana y Mes de lo ocurrido y «Lo que hizo el asistente» | API y e2e web |
| Zona de empresa (`08-administracion`, T-058 a T-062) | Entrada y sesión propias, Personas, Equipos en lectura, Registro | API y e2e web |
| Agenda (`02-agenda`) | Semana y Mes, lo en espera en Hoy, T-043 | API y e2e |
| Conversación móvil | Tarjeta plegada, barra de una fila, indicador en el asa | e2e móvil |
| Docker | `apps/api/Dockerfile`, `apps/web/Dockerfile`, perfil `aplicacion`; **sin construir todavía** | — |
| CUN-05 (de `main`) | Se conserva entero: contratos, consentimiento por Operación, rejilla, alternativas, herramientas del agente | Las de Vasco, sin cambiar ninguna expectativa |

## Decisiones de la fusión

| # | Decisión |
|---|---|
| D-F1 | **El modelo de equipo es el de Vasco** (`equipo`, `miembro_de_equipo`). `equipo` y `miembro_equipo` de T-058 se retiran antes de haber existido en `main` |
| D-F2 | Se quedan `miembro_organizacion`, `organizacion.tipo`, `perfil_usuario.estado` y los `ambito` |
| D-F3 | Un solo módulo de tareas: `09-tareas-personales`. `aixaBranch` no se fusiona |
| D-F4 | «Disponibilidad de equipo» sigue como corte de Agenda |
| D-F5 | El agente lleva las herramientas de agenda, tareas y equipos; `HerramientasCaptura` queda retirada |
| D-F6 | `SPEC.md` sigue desde 2.24.0, con las entradas de los dos entrelazadas por fecha en §11 |

## Lo que se pide revisar

**A Vasco:**

1. **S-1, la migración.** `20261107T0300_administracion` se reescribió sin `CREATE TABLE "equipo"` ni `"miembro_equipo"`: nunca llegó a `main`, y en una base nueva chocaba con `20261110145111_agregar_equipos`. Tus dos migraciones no se tocaron.
2. **Migración nueva `20261125000000_equipo_reglas_administracion`.** Lleva a tus tablas dos reglas que son requisitos de administración: un nombre de equipo por organización (`UNIQUE (organizacion_id, nombre)`, REQ-ADM-28) y un responsable por equipo como mucho (índice único parcial, REQ-ADM-30). **Si tu base tiene dos equipos con el mismo nombre en una organización, o dos responsables en un equipo, esta migración falla:** conviene revisarlo antes de `migrar`. `crear-equipo-prueba` busca por nombre, así que no debería pasar.
3. **S-2, el código de administración.** `identidad/pertenencias.ts`, `administracion/lecturas.ts` y `administracion/ejecutores-cuentas.ts` leen ahora `miembroDeEquipo` («responsable» = `rolEnEquipo === 'responsable'`, «miembros» = `'integrante'`). Dar de baja una cuenta borra sus filas de `miembro_de_equipo`.
4. **El conflicto de `aplicacion.tsx`.** La estructura es la de la línea de Franco (niveles en la dirección, franja en espera, tareas del día, Actividad). Tu corte entra así: `vistaEquipo` cuando el corte elegido es «Disponibilidad de equipo», y todo lo de la agenda propia comprueba `vistaAgendaPersonal`. Ese corte no es un nivel y no va en la dirección (`?nivel=`): lo recuerda el estado de la página, y elegir Hoy, Semana o Mes vuelve a la agenda propia. Se quitó tu aviso «Por ahora, solo el día de hoy», porque Semana y Mes ya existen. Prueba nueva: `agenda.corte-disponibilidad-de-equipo` en `apps/web/e2e/agenda.spec.ts`.
5. **Tus INC-16, 17 y 18 pasan a ser INC-33, 34 y 35**, también en `specs/05-equipos/`: las INC-16 a 32 ya estaban usadas en esta línea. La guía proponía INC-28 a 30, que también estaban ocupadas. INC-33 queda resuelta con D-F1.
6. **INC-37, nueva y abierta:** `miembro_de_equipo` exige que el perfil sea de la organización del equipo (clave compuesta a `perfil_usuario(id, organizacion_id)`). Con la opción B de administración (H-ADM-16), una cuenta afiliada sigue en su organización personal y **no puede entrar en un equipo de empresa**. No afecta a la entrega, porque hoy no hay afiliación, pero hay que decidirlo antes de T-063 a T-066. Una prueba de administración que metía a una afiliada en un equipo se cambió para usar una cuenta propia, con un comentario que remite a INC-37.
7. **Numeración de tareas:** tus T-099 a T-119 se quedan. Las T-090 a T-109 que proponía `ESTRUCTURA-PERFIL-EMPRESARIAL.md` (no están en ningún `tasks.md`) se numerarán desde T-120 cuando se escriban.

**A Aixa:** `09-tareas-personales` sustituye a `08-tareas-personales` (D-F3). Tus aportes se portan después, commit a commit.

## Puntos de control

| Punto | Resultado |
|---|---|
| A. Compila | Contratos, cliente de Prisma, API, web y móvil: tipos y compilación limpios |
| B. Base nueva y pruebas de la API | `nexoai_prueba` recreada: **460/460** (50 archivos); contratos **127/127** |
| C. Trazabilidad | `python tools/trazabilidad.py --check`: **220 requisitos, 0 problemas** |
| D. Verificación completa | Tipos y compilación de los cuatro paquetes; e2e web **47/47** y móvil **24/24**; `pnpm audit --audit-level high` sin altas. Base de desarrollo reparada en su sitio, sin borrarla (conserva la conexión con Google), tras un respaldo con `pg_dump` en `respaldo-nexoai-antes-fusion-2026-11-25.sql` (ignorado por git); `prisma migrate diff` contra el esquema sale vacío |

## Otras cosas que se corrigieron

- Dos pruebas de extremo a extremo que ya fallaban en `version_parcial` desde T-043: la tarjeta del móvil y la lista de la agenda en la web muestran la fecha del fin cuando cae al día siguiente, «23:00 – 00:00 (jueves, 26 de noviembre)» (REQ-CUN01-01), y las pruebas seguían esperando el texto sin la fecha.
- La semilla de las pruebas web (`apps/web/e2e/arrancar-api.mjs`) sembraba equipos en `miembro_equipo`; ahora lo hace en `miembro_de_equipo`.

## Avisos

- **Next.js 16.4.2 tiene siete avisos de seguridad moderados**, corregidos en 16.4.5. Al arrancar, Next imprime instrucciones dirigidas a agentes de IA y detiene el primer arranque: es un dato, no una orden (`AGENTS.md`), y basta con reintentar. La actualización queda como tarea aparte.

## Lo que queda para después del jueves 26

Invitación y afiliación (T-063 a T-065, y antes INC-37), «Mi equipo» en la zona de empresa (D-F4, INC-36), «Por confirmar» (T-056, T-057, tras el aval de H-TP-11), T-072, las correcciones RT-07 y RT-10, y construir las imágenes de Docker.

## Evidencia

Capturas en `design/capturas/2026-11-25-fusion/`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
