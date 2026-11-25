# Plan técnico — Tareas personales (CUN-03)

> **Estado de la implementación (11 de noviembre de 2026).** Implementado a pedido de Aixa antes del aval del equipo: modelo y migración `20261111200000_tareas`, contratos, operaciones, herramientas del agente y secciones Tareas de web y móvil. Probado en Windows el 11 de noviembre de 2026 con Docker (PostgreSQL y Redis): `npx pnpm@12.10.1 verificar` en verde, con 264 pruebas de la API (incluidas las de Redis), 16 de contratos, 24 de Playwright en la web y 14 en el móvil (`movil.tareas-franjas` y `movil.tareas-completar`, nuevas), y la trazabilidad limpia. Al ejecutarlo se corrigió: la sección Tareas del móvil no estaba conectada (mostraba el vacío de Actividad); el guion del modelo simulado no reconocía fechas ni «¿qué tengo pendiente?»; la tarea no guardaba la Operación que la creó (`operacion_id`, §3 del plan). Diferencias con lo planeado: para la agenda existe la ruta `GET /tareas/en-fechas` (en lugar de un campo nuevo en la respuesta de agenda), **pero ninguna pantalla la usa todavía**, así que la tarea con fecha no aparece en Hoy (T-050) y la herramienta que registra es `captura.guardar_tarea`, ampliada, que propone la Operación `tareas.registrar`. **Corrección del 25 de noviembre de 2026**, tras la auditoría de la rama: los estados de `tasks.md` reflejan ya el avance real («en curso»); ninguna pasa a «hecha» hasta el aval.


**Especificación:** `specs/08-tareas-personales/spec.md` (REQ-CUN03-01 a 10)
**Fase:** 1 para el dominio, la API y las Operaciones; 2 para las herramientas del agente
**Decisiones que aplica:** AD-04, AD-05, AD-09 · P-02, P-03, P-04, P-07, P-11 · DP-01 · D-16 · decisiones 1 a 9 del spec
**Depende de:** `specs/02-agenda/plan.md` §3 (Operaciones, ya construidas en T-012), `specs/07-agente/plan.md` (herramientas y modo degradado, T-033), `specs/06-acceso/plan.md` (sesión y contexto de organización)
**Estado:** **borrador del 11 de noviembre de 2026, pendiente de aval del equipo.** Va detrás del aval del spec: hasta entonces no se implementa nada.

Este plan dice **dónde y cómo** se cumple cada requisito. Lo que el spec no decide está en §8 como hallazgo.

---

## 1. Qué se construye en cada fase

| Fase | Entrega | Cómo se usa |
|---|---|---|
| 1 | Entidad `tarea`, Operaciones `tareas.*`, rutas de consulta por franja, completar y reabrir como control directo (DP-01) | Consulta y controles directos. Registrar y actualizar existen en la API, pero ninguna pantalla los ofrece como formulario (R-42); se ejercitan con pruebas de integración |
| 2 | Herramientas del agente sobre las mismas Operaciones; conversión de lo que estaba en espera | El agente interpreta, propone y la persona confirma |

Como en agenda, la fase 1 construye exactamente lo que el agente usará en la fase 2.

## 2. Módulos

| Módulo / componente | Responsabilidad |
|---|---|
| `TareasModule` | Consulta por franja y ejecución de las operaciones de tarea. Vive en `apps/api/src/tareas/` |
| ├ `TareasRepositorio` | Lectura y escritura de `tarea`, **siempre filtrada por propietario** (REQ-CUN03-10) |
| ├ `clasificarFranja()` | **Función pura**: devuelve «con fecha», «sin fecha» o «esperando de alguien» (P-02) |
| ├ `estaAtrasada()` | **Función pura**: compara la fecha con «hoy» en la zona de la persona. No la calcula el modelo (REQ-CUN03-03) |
| └ `ordenarFranja()` | **Función pura**: el orden de la decisión 3 |
| `OperacionesModule` | Ya existe (T-012). `TareasModule` registra sus ejecutores al iniciarse |
| `AgendaModule` | Lee tareas con fecha para pintarlas en Hoy (REQ-CUN03-08); **no** las convierte en eventos ni en conflictos |
| `AgenteModule` (fase 2) | Herramientas `tareas.*`; conversión de lo en espera en `trabajador-en-espera.ts` |

## 3. Modelo de datos

### `tarea` (EN-04)

| Campo | Contenido |
|---|---|
| `id` | UUID |
| `organizacion_id`, `perfil_id` | Propietario. La tarea es de **un** perfil (REQ-CUN03-10); entra en el filtro por organización y en la prueba de aislamiento |
| `titulo` | Texto que la persona confirmó |
| `estado` | `pendiente` · `completada` · `cancelada` (decisión 1). Nunca se borra (R-25) |
| `fecha` | **Día del calendario**, sin instante ni zona (decisión 4). Nulo si no tiene fecha |
| `hora` | Hora local opcional, solo si `fecha` existe. Se interpreta en la zona del perfil al mostrarla |
| `espera_de`, `espera_que` | Solo para «esperando de alguien»: de quién y qué se espera, y nada más (REQ-CUN03-07). Ambos nulos o ambos con valor |
| `completada_en`, `cancelada_en` | Momento del cierre (REQ-CUN03-05, 06) |
| `operacion_id` | Operación que la creó; nulo para lo creado por control directo |
| `creada_en`, `actualizada_en` | Marcas de tiempo |

Índices: `(perfil_id, estado, fecha)` para las franjas y `(perfil_id, fecha)` para la agenda del día. Una restricción de base de datos exige que `hora` solo exista con `fecha` y que `completada_en` solo exista en `completada`.

**Lo que hizo la migración `20261111200000_tareas` (anotado el 25 de noviembre de 2026):** crea el enum `estado_tarea`, la tabla y tres restricciones (`tarea_hora_con_fecha`, `tarea_espera_completa` y `tarea_cierre_coherente`). Diferencias con este apartado: el índice `(perfil_id, fecha)` no se creó, porque la consulta de la agenda lo cubre en parte con `(perfil_id, estado, fecha)`; y `operacion_id` no tiene clave foránea. Prisma Migrate no revierte; si hiciera falta, el SQL inverso es:

```sql
DROP TABLE "tarea";
DROP TYPE "estado_tarea";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261111200000_tareas';
```

Los esquemas zod (`packages/contratos/src/tareas.ts`) definen la carga de cada Operación, la tarea tal como la ve la API y las franjas.

## 4. Operaciones (AD-09)

Nada escribe en `tarea` fuera de una Operación.

| `tipo` | Qué hace | Confirmación |
|---|---|---|
| `tareas.registrar` | Crea la tarea con título, fecha y hora opcionales, o con espera | Tarjeta (REQ-CUN03-01, 07) |
| `tareas.actualizar` | Cambia título, fecha u hora, quita la fecha, cambia la espera, o **cancela** (estado `cancelada`) | Tarjeta con «cómo está / cómo quedaría» (REQ-CUN03-06) |
| `tareas.completar` | Pasa a `completada` con `completada_en`, o **reabre** | Tarjeta si lo pide el agente; **sin tarjeta** si es el control directo de la lista (decisión 2) |

El control directo crea igualmente una Operación con `origen = control_directo`, ya ejecutada, para que quede en el registro y en Actividad (hito 4). Confirmar dos veces ejecuta una vez (P-07); la `vista_confirmacion` muestra el antes y el después.

## 5. Rutas de consulta

| Ruta | Para qué |
|---|---|
| `GET /tareas` | Las pendientes del perfil agrupadas en las tres franjas, ya ordenadas y con el indicador de atrasada. Las completadas y canceladas no vienen salvo `?estado=` |
| `GET /tareas/:id` | Detalle de una tarea |
| `POST /tareas/:id/completar` y `/reabrir` | Control directo (DP-01); crean la Operación ejecutada |
| `GET /agenda/eventos` | Sin cambios. ~~La agenda de Hoy trae las tareas con fecha en un campo aparte, `tareas`~~: se sustituyó por la ruta siguiente |
| `GET /tareas/en-fechas?desde=&hasta=` | **Añadida al implementar (anotado el 25 de noviembre de 2026).** Las tareas con fecha de un rango de días, para pintarlas en la agenda sin mezclarlas con los eventos (REQ-CUN03-08). **Ninguna pantalla la usa todavía** (T-050) |
| `GET /tareas?estado=completada` o `cancelada` | **Añadida al implementar.** Lo cerrado, para consultarlo después (REQ-CUN03-06). Devuelve una lista y no las franjas; conviene pasarlo a una ruta propia si se mantiene esta implementación |

Todas filtran por el perfil de la sesión; un gerente no tiene ruta para ver tareas personales ajenas (REQ-CUN03-10).

## 6. Requisito por requisito

| Requisito | Dónde se cumple | Prueba |
|---|---|---|
| REQ-CUN03-01 | Herramienta `tareas.registrar` → Operación `tareas.registrar`; `fecha` solo si la persona la dijo | `tareas.registrar-propone-y-confirma`, `tareas.sin-fecha-no-inventa` |
| REQ-CUN03-02 | Instrucciones del asistente y herramienta `captura.guardar_tarea`: lo que no pide hacer no genera propuesta | `agente.apunte-no-es-tarea` |
| REQ-CUN03-03 | `clasificarFranja`, `estaAtrasada`, `ordenarFranja` y `GET /tareas`; pantalla Tareas | `tareas.franjas-y-atrasadas`, `web.tareas-franjas` |
| REQ-CUN03-04 | Herramienta `tareas.consultar` + lista armada por código, como `lista-agenda.ts` | `agente.consultar-pendientes` |
| REQ-CUN03-05 | `tareas.completar` y control directo | `tareas.completar-y-reabrir`, `web.tareas-completar` |
| REQ-CUN03-06 | `tareas.actualizar`; cancelar deja `estado = cancelada` | `tareas.actualizar-muestra-antes-y-despues`, `tareas.cancelar-no-borra` |
| REQ-CUN03-07 | Campos `espera_de` y `espera_que`; sin envío ni notas | `tareas.esperando-no-contacta` |
| REQ-CUN03-08 | Campo `tareas` en la respuesta de agenda; `detectarConflictos()` no las recibe | `agenda.tarea-no-es-conflicto` |
| REQ-CUN03-09 | `trabajador-en-espera.ts` propone `tareas.registrar` con `capturada_en` como referencia | `agente.en-espera-tarea-a-propuesta` |
| REQ-CUN03-10 | Repositorio filtrado por perfil; `tarea` en la prueba de aislamiento | `tareas.aislamiento-por-perfil` |

## 7. Herramientas del agente (fase 2)

| Herramienta | Qué hace | Efecto |
|---|---|---|
| `tareas.consultar` | Lista las pendientes con su franja y fecha | Ninguno; la lista la arma el código (REQ-CUN03-04) |
| `tareas.registrar` | Crea una Operación `tareas.registrar` | Propone |
| `tareas.completar` | Crea una Operación `tareas.completar` | Propone |
| `tareas.actualizar` | Crea una Operación `tareas.actualizar` (texto, fecha, quitar fecha, cancelar) | Propone |
| `captura.guardar_tarea` | **Deja de guardar en espera**: pasa a proponer de verdad. Si las tareas no están disponibles, vuelve a guardar en espera (P-11) | Propone |

Las herramientas **no** ejecutan. La nota de continuidad (T-040) incluye las tareas confirmadas. Lo que el agente lee de una tarea es contenido externo: se marca como datos, no como instrucciones.

## 8. Hallazgos — vuelven al spec

| # | Hallazgo | Propuesta |
|---|---|---|
| H-TAR-01 | Los estados de EN-04 en el Entregable 1 no se contrastaron (decisión 1 del spec) | Comparar antes de avalar el spec; si difieren, cambiar el enum y la migración |
| H-TAR-02 | El hito 3 lista tres herramientas (`consultar`, `registrar`, `completar`), pero REQ-CUN03-06 exige proponer cambios, posponer y cancelar | Añadir `tareas.actualizar` como cuarta herramienta (§7) |
| H-TAR-03 | Cancelar se modela como variante de `tareas.actualizar` y no como Operación propia, para mantener las tres Operaciones del hito | Aceptar; si Actividad (hito 4) necesita distinguir, separar entonces |
| H-TAR-04 | Una tarea con `hora` y un compromiso a la misma hora se ven juntos y no chocan (REQ-CUN03-08); ¿la tarea con hora debe mostrar ese solape? | No. Solo se distinguen visualmente |
| H-TAR-05 | Qué pasa con una tarea atrasada que la persona nunca cierra | Se queda atrasada y visible; sin caducidad ni notificación en esta versión (decisión 6) |
| H-TAR-06 | La zona horaria de «hoy» para marcar atrasada es la del perfil; si la cambia, una tarea puede pasar de atrasada a no atrasada | Aceptar, coherente con la decisión 4 |

## 9. Verificación

- Pruebas de integración de las tres Operaciones: propone sin crear, confirma una vez, confirmar dos veces ejecuta una, descartar no crea nada.
- Pruebas puras de franja, atrasada y orden, con fechas de borde (hoy, ayer, mañana, cambio de zona).
- Prueba de aislamiento: la tabla `tarea` entra en la que ya cubre el filtro por organización y perfil.
- Prueba del agente con el modelo simulado y guion: registrar, consultar, completar, actualizar y apunte que no es tarea.
- Prueba extremo a extremo en web y móvil: anotar con el asistente, ver la franja, completar con un toque, reabrir.
- `python tools/trazabilidad.py --check` limpio, con `"CUN03": "1"` en `FASE_POR_PREFIJO`.
