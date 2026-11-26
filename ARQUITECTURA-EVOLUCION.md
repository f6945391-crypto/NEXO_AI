# Arquitectura de NexoAI: estado, refactors y despliegue futuro

**Fecha:** 7 de noviembre de 2026.
**Base:** commit `4a2b3f7` de `modificacion/vision-nexoai` más la tanda 2 de entregas (`entregas/tanda-2/`).
**Para quién:** el equipo y Claude Code. Es una valoración y una lista ordenada de refactors con su momento; no cambia ningún requisito ni decisión de `SPEC.md`.

## Índice

1. Veredicto en una página
2. Qué hay hoy, medido
3. Lo que está bien y no se toca
4. Refactors, por orden de valor, con su momento
5. La zona de administración: subdominio sí, otra máquina todavía no
6. Criterios para separar algo en un proceso o servicio aparte
7. Lo que no conviene hacer
8. Resumen para `SPEC.md`

---

## 1. Veredicto en una página

La arquitectura está ordenada. Las fronteras entre módulos son reales (no solo carpetas), toda escritura pasa por un único mecanismo (Operaciones, AD-09), los contratos viven en un solo paquete que comparten tres clientes, y la trazabilidad une requisito, tarea y prueba de forma automática. Para un proyecto de dos personas y un curso, eso es más de lo habitual.

Los problemas que tiene son los de un sistema que creció rápido en un punto: el módulo del agente es el doble de grande que cualquier otro y mezcla cinco responsabilidades; el armazón de la web concentra navegación, sesión y secciones en un archivo; y queda una columna (`rol`) que contradice una decisión ya tomada (autoridad por equipo). Ninguno de los tres bloquea lo que viene, pero los tres encarecen lo siguiente si no se atienden en el momento que indica §4.

Sobre el despliegue: el subdominio para la administración (`administracion.<dominio>`) es correcto y barato de preparar ahora. Una máquina aparte en AWS no lo es: comparte base, autenticación y cifrado con la aplicación, así que separar la máquina sin separar los datos añade costo sin aislamiento. La forma de dejarlo listo es «misma imagen, otro proceso», que la tanda 2 ya permite.

## 2. Qué hay hoy, medido

### API (`apps/api/src`)

| Módulo | Archivos | Líneas | Importa | Observación |
|---|---|---|---|---|
| `agente` | 24 | 2 174 | `AgendaModule`, `IntegracionesModule` | Grafo, herramientas, modelo, transcripción, punto de control, en-espera y trabajador en un módulo |
| `agenda` | 15 | 1 064 | `IntegracionesModule`, `OperacionesModule` | Bien delimitado |
| `integraciones` | 11 | 903 | `JwtModule` | Google (OAuth, calendario, correo) y el calendario simulado |
| `identidad` | 10 | 585 | — | Cuentas, contraseñas, guardas, contexto, zona horaria |
| `operaciones` | 4 | 354 | — | Proponer, confirmar, descartar, listar; registro de ejecutores |
| `plataforma` | 8 | 257 | — | Prisma, aislamiento por organización, errores, CORS, entorno |
| `cli` | 4 | 273 | — | Alta de cuentas, semilla, probar calendario, evaluar asistente |
| `salud` | 1 | 12 | — | `GET /salud` |

Dos procesos: `main.ts` (API, importa los seis módulos) y `trabajador.ts` (BullMQ, importa `PlataformaModule`, `AgendaModule` y `AgenteModule` entero).

### Datos y contratos

- `prisma/schema.prisma`: un archivo, 16 modelos y 8 enumeraciones. 11 tablas llevan `organizacionId` y el aislamiento (`plataforma/aislamiento.ts`) filtra por él en toda lectura salvo las justificadas con `sinAislar`.
- `packages/contratos/src`: 7 archivos, 952 líneas, un esquema zod por área. Único lugar donde se definen formas de datos (AGENTS.md).

### Web (`apps/web/src`)

- `app/aplicacion/aplicacion.tsx` (313 líneas): armazón de tres columnas, navegación, estado de sesión, selección de sección y montaje de `conversacion.tsx` (334) y `agenda.tsx` (190).
- `app/acciones.ts` (205): acciones de servidor que hablan con la API.
- `lib/`: cliente de la API por área (`agenda.ts`, `asistente.ts`, `sesion.ts`).

### Móvil (`apps/movil/src`)

Pantallas por sección (`inicio`, `agenda`, `captura`, `en-espera`), tokens en `tokens.ts`, mismo contrato zod. Sin estado global más allá de la sesión.

## 3. Lo que está bien y no se toca

1. **Monolito modular con dos procesos (AD-01).** Un despliegue, una base, módulos que se importan explícitamente. Es lo correcto para el tamaño y lo será hasta que un criterio de §6 diga lo contrario.
2. **Operaciones como único camino de escritura (AD-09).** Es lo que permitió que el carril de Administración añadiera 20 acciones nuevas sin inventar otra forma de confirmar ni de auditar. Cualquier refactor tiene que conservarlo.
3. **Contratos zod en un paquete (AD-08).** API, web y móvil validan la misma forma. El costo de cambiar un contrato es visible (los tres compilan o no).
4. **Aislamiento por organización en la capa de datos**, con `sinAislar` justificado por escrito. Cuando entre la administración, sigue siendo la frontera correcta: la organización personal de cada cuenta queda intacta (plan de administración §3.1, opción B).
5. **Reglas de negocio fuera del prompt (P-02, AD-05)**: conflicto, alternativas, caducidad y franjas se calculan en código. No hay que «arreglar» el agente para corregir una regla.
6. **Trazabilidad automática** (`tools/trazabilidad.py`): 209 requisitos con su tarea y su prueba, y `--check` en la integración continua.
7. **Pruebas de extremo a extremo con la API real** sobre una base propia por cliente (web y móvil). Caras, pero son las que detectaron los problemas de pantalla de esta semana.

## 4. Refactors, por orden de valor, con su momento

Cada fila dice qué, por qué, cómo (a grandes rasgos), qué prueba lo cubre y **cuándo**. El «cuándo» importa más que el «qué»: hacerlos antes de tiempo es trabajo que se tira; después, trabajo que se duplica.

### R-1. Partir `AgenteModule` en tres

**Por qué.** 2 174 líneas y siete responsabilidades: el grafo (`grafo/`), las herramientas (`herramientas/`), el proveedor del modelo (`modelo/`), la transcripción (T-038), el punto de control, lo que queda en espera y el proceso del trabajador. Cada tarea nueva del agente (T-040 nota de continuidad, herramientas de tareas para CUN-03, caducidad de T-041) toca este módulo entero y sus pruebas.

**Cómo.**
- `AgenteModule`: grafo, nodos, punto de control, servicio del asistente y su controlador. Solo el flujo.
- `HerramientasAgenteModule`: las herramientas tipadas (P-01). Importa `AgendaModule` y, cuando exista, `TareasPersonalesModule`. El grafo recibe las herramientas por inyección, no las importa.
- `TranscripcionModule`: `turno_asistente`, `GET /asistente/conversacion`, paginación. Lo lee la web y el móvil; no necesita LangGraph.
- `modelo/` se queda como está (es la interfaz del proveedor, P-06); solo cambia de módulo contenedor si hace falta.

**Prueba.** Las de `apps/api/test/agente` se reparten; no se añade ninguna. `pnpm verificar` en verde antes y después.

**Cuándo.** Después de T-040 (nota de continuidad) y **antes** de las herramientas de tareas de CUN-03 (T-050 del carril CUN-03). Hacerlo antes de T-040 obligaría a Claude Code a mover código a la vez que lo cambia.

### R-2. El trabajador sin LangGraph

**Por qué.** `trabajador.module.ts` importa `AgenteModule` entero para dos cosas: caducar propuestas (decisión 28) y lo que queda en espera cuando vuelve el asistente. Arrastra el grafo y el proveedor del modelo a un proceso que nunca conversa; arranca más lento y falla por variables que no necesita.

**Cómo.** Un `TareasProgramadasModule` pequeño con los dos trabajos de BullMQ, que importa `OperacionesModule` y `AgendaModule`. `AgenteModule` deja de aparecer en `trabajador.module.ts`.

**Cuándo.** Junto con R-1; es una consecuencia suya.

### R-3. Retirar `rol` de `perfil_usuario`

**Por qué.** El equipo decidió el 23 de octubre que la autoridad va **por equipo** (REQ-ACC-16). Mientras la columna exista, `@SoloResponsable()` la lee (T-026) y todo lo nuevo (administración, equipos) tiene que fingir que no está. Dos fuentes de verdad para lo mismo.

**Cómo.** Lo describe el plan de administración §3.4 y §4.2: `miembro_equipo.responsable` sustituye a `rol = gerente`; `@SoloResponsable(resolverEquipo)` comprueba el equipo afectado; la columna queda en desuso en T-066 y se retira en una tarea aparte cuando se acepten las enmiendas a REQ-ACC-01, 02, 13 y 15.

**Cuándo.** En T-066, no antes. Retirarla hoy rompería T-026 y sus pruebas sin que exista lo que la reemplaza.

### R-4. Partir `aplicacion.tsx` en la web

**Por qué.** 313 líneas que hacen de armazón, navegación, dueño de la sesión y enrutador de secciones. Lo que viene le añade: el botón de administración, el aviso de invitación (REQ-ADM-20), la pantalla de Tareas con sus tres cortes (CUN-03) y el grupo «Por confirmar». A 500 líneas nadie quiere tocarlo.

**Cómo.**
- `navegacion.tsx`: la columna de 72 px y sus botones (incluido el futuro enlace a la zona de empresa).
- `sesion-contexto.tsx`: quién está, su plan, si puede administrar; hoy eso viaja por propiedades.
- `aplicacion.tsx` queda como disposición de columnas y montaje de la sección activa.
- `secciones.ts` sigue siendo el único lugar que lista las secciones (R-32).

**Prueba.** `apps/web/e2e/armazon.spec.ts` ya cubre la disposición; se añade un caso para la navegación con y sin botón de administración cuando exista.

**Cuándo.** Antes de la pantalla de Tareas (T-052 del carril CUN-03). Es un refactor de medio día que ahorra una semana de conflictos después.

### R-5. Un solo `CorreoPlataforma`

**Por qué.** Dos requisitos piden un correo que solo avisa, sin botones ni enlaces con token: la delegación (REQ-CUN07-16) y la invitación a una empresa (REQ-ADM-18). Si cada uno trae su envío, habrá dos simulados, dos reales y dos formas de dejar registro.

**Cómo.** El puerto `CorreoPlataforma.avisar({ para, asunto, cuerpo })` del plan de administración §8, en un `AvisosModule` propio, con la implementación simulada ahora (deja `correo.aviso` en la auditoría) y la real cuando se resuelva PT-3. CUN-07 lo reutiliza.

**Cuándo.** Al construir la invitación (T-063 del carril de administración); CUN-07 llega después y lo encuentra hecho.

### R-6. Esquema de Prisma por área

**Por qué.** Un `schema.prisma` que ya tiene 16 modelos y recibirá `tarea`, `miembro_organizacion`, `equipo`, `miembro_equipo` y, en la fase 4, hilos, peticiones y reportes. Prisma 7 admite varios archivos en `prisma/schema/`; cada área deja de competir por el mismo archivo en cada parche.

**Cómo.** `prisma/schema/base.prisma` (generator, datasource, `Organizacion`, `PerfilUsuario`, auditoría), `acceso.prisma`, `operaciones.prisma`, `agenda.prisma`, `agente.prisma`, `administracion.prisma`, `tareas.prisma`. Sin cambiar ningún modelo: es mover texto y apuntar `prisma.config.ts` a la carpeta.

**Cuándo.** Con la primera migración de CUN-03 o de administración, la que llegue antes. No antes: hoy no hay conflicto.

### R-7. Cliente de la API en un solo lugar por plataforma

**Por qué.** En la web, `lib/agenda.ts`, `lib/asistente.ts` y `app/acciones.ts` repiten la forma de llamar a la API (cabeceras, sesión, manejo de 401 y renovación). En el móvil pasa lo mismo por pantalla. Un cambio en la autenticación (por ejemplo, el `ambito` de la sesión de empresa) habría que hacerlo en cinco sitios.

**Cómo.** `lib/api.ts` con una función `llamar(ruta, opciones)` que pone la sesión, parsea con el contrato zod y traduce los errores de `plataforma/errores.ts`; las funciones por área la usan. Igual en `apps/movil/src/api.ts`.

**Cuándo.** Antes de la sesión de empresa (T-059), porque es exactamente lo que la sesión de empresa toca.

### Lo que **no** entra en la lista

- Cambiar NestJS, Prisma o LangGraph por otra cosa: no hay ningún problema que lo justifique.
- Un ORM o capa de repositorio encima de Prisma: Prisma ya es esa capa; otra encima solo duplica.
- Microservicios, una segunda base para administración, un gateway delante de la API: véase §7.

## 5. La zona de administración: subdominio sí, otra máquina todavía no

### Lo que se prepara ahora (barato, y evita una reescritura después)

1. **La web y la API no asumen que la zona vive bajo `/administracion`.** La web de la zona lee su base de ruta de una variable (`ADMINISTRACION_URL`, como hoy `WEB_URL` y `API_URL`); los enlaces desde la aplicación la usan. Si la variable es `https://administracion.nexoai.pe`, todo apunta allí; si es `https://app.nexoai.pe/administracion`, también.
2. **La cookie de la sesión de empresa se emite para el host de la zona**, no para el de la aplicación. Con subdominios distintos, cada sesión queda en su host sin que haya que compartir nada; es más seguro que una sola cookie para los dos.
3. **La zona es un grupo de rutas propio en el mismo proyecto Next** (`app/(empresa)/administracion/…`, plan de administración §7.3) y un módulo de la misma API, sin dependencias del agente. Eso es lo que permite el paso siguiente sin reescribir.
4. **Misma imagen, otro proceso.** La imagen de la API de la tanda 2 ya corre con distintos comandos (`dist/main.js`, `dist/trabajador.js`). Si algún día la zona corre aparte, es un tercer comando (`dist/administracion.js`, que monta solo `PlataformaModule`, `IdentidadModule`, `OperacionesModule` y `AdministracionModule`) y un tercer servicio en compose o en ECS. Cero código nuevo de negocio.

### Por qué no otra VM hoy

- Comparte la **base de datos** (son las mismas tablas de cuentas y pertenencias), la **autenticación** (`JWT_SECRETO`) y el **cifrado de tokens** (`TOKENS_CLAVE_CIFRADO`). Separar la máquina sin separar esos tres no aísla nada: quien compromete una compromete la otra por la base.
- Duplica despliegue, monitoreo, variables, certificados y la red interna entre las dos máquinas. Para dos personas es tiempo que no va al producto.
- En AWS, además, «otra VM» (EC2 administrada a mano) es la opción más cara de operar. Si llega el momento, la forma natural es **otra tarea del mismo clúster** (ECS o App Runner) con la misma imagen y otro comando, detrás del mismo balanceador con una regla por host: `app.` a la API/web, `administracion.` a la zona. Misma base RDS, mismo Redis.

### Cómo quedaría cuando toque

```
Internet
  └─ Balanceador (ALB) con certificados para app.<dominio> y administracion.<dominio>
       ├─ app.<dominio>              → servicio web (Next, standalone)   → servicio api (dist/main.js)
       ├─ administracion.<dominio>   → servicio web (mismo Next, grupo (empresa)) → servicio api o servicio administracion (misma imagen, dist/administracion.js)
       └─ (sin entrada pública)      → servicio trabajador (dist/trabajador.js)
  Base: RDS PostgreSQL (una) · Cola: ElastiCache Redis (uno) · Secretos: Secrets Manager
```

Si el día de mañana la administración necesita su propia base (por cumplimiento, por ejemplo), lo que la hace posible es que sus tablas ya están delimitadas y que no escribe en la organización personal de nadie (prueba `administracion.no-escribe-en-lo-personal` del plan).

## 6. Criterios para separar algo en un proceso o servicio aparte

Separar cuando se cumpla **al menos uno** y se pueda medir:

| Criterio | Ejemplo en NexoAI |
|---|---|
| Ritmo de cambio distinto y conflictos reales al desplegar | La administración cambia una vez al mes y la aplicación tres veces por semana, y cada despliegue de la aplicación corta sesiones de administradores |
| Perfil de carga distinto | El agente consume CPU y espera al modelo; la administración es tráfico bajo. Hoy no compiten |
| Requisito de aislamiento externo | Un cliente empresarial exige que sus datos de personal no compartan proceso con el agente |
| Fallo que debe quedar contenido | Que el proveedor del modelo caiga no debe impedir dar de alta una cuenta (hoy ya no lo impide: módulos distintos, mismo proceso) |

Mientras no se cumpla ninguno, un proceso. El trabajador es el único que ya cumple uno (perfil de carga y fallo contenido), y por eso ya es un proceso aparte.

## 7. Lo que no conviene hacer

- **Microservicios por módulo.** Siete módulos, dos personas: la red entre servicios sería el componente más grande del sistema.
- **Segunda base para la administración.** Rompe las claves foráneas con `perfil_usuario` y `organizacion`, y obliga a copiar datos entre bases para algo que hoy es una consulta.
- **Gateway o API de borde delante de NestJS.** NestJS ya hace autenticación, límite de intentos (throttler) y CORS; un gateway duplicaría eso y añadiría un salto.
- **Una tercera aplicación Next para la zona.** Duplica sesión, despliegue, CI, Docker y tokens de diseño para cuatro apartados; el grupo de rutas da la misma separación de código.
- **Mover reglas al modelo para «simplificar».** Es lo contrario de P-02 y de lo que hizo posible probar el agente sin clave.

## 8. Resumen para `SPEC.md`

Para que Claude Code lo registre cuando integre la tanda 2 (una línea en §11 y, si el equipo lo avala, una fila en §8):

- **Decisión propuesta (D-19):** la zona de administración se publica en un subdominio propio (`administracion.<dominio>`) cuando haya despliegue; hasta entonces, `/administracion` en la misma dirección. La base de ruta sale de `ADMINISTRACION_URL`. Misma imagen de la API, otro proceso solo si se cumple un criterio de §6.
- **Refactors con momento asignado:** R-1 y R-2 tras T-040 y antes de T-050; R-3 en T-066; R-4 antes de T-052; R-5 en T-063; R-6 con la primera migración de CUN-03 o administración; R-7 antes de T-059. Conviene darles número de tarea en el área que los motiva, no una tarea «refactor» suelta.
