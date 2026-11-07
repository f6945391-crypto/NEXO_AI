# Plan técnico — Jornada (CUN-02), sección Actividad

**Especificación:** `specs/02-jornada/spec.md` §8 bis (REQ-CUN02-25 a 35). El resto de CUN-02 (§3 a §8: propuesta de jornada, registro de tiempo, rutinas, acompañamiento) **no está planificado todavía**: espera D-5 / PT-5 y el hito 5 de `PLAN-VALOR-USUARIO.md`
**Fase:** 2 (hito 4 de `PLAN-VALOR-USUARIO.md`)
**Decisiones que aplica:** AD-08, AD-09 · P-04, P-05, P-11 · DP-01 · R-21, R-25, R-40, R-42 · H-JOR-01 a 13
**Depende de:** `specs/02-agenda/plan.md` (réplica del calendario, `ConsultaAgendaService`, Operaciones §3) y `specs/06-acceso/plan.md` (sesión, `@SobreLoPropio()`, permiso de Google)
**Estado:** propuesta del 7 de noviembre de 2026, pendiente de aval del equipo junto con la especificación

Este plan dice **dónde y cómo** se cumple cada requisito de §8 bis. Lo que la especificación no decidía está en `spec.md` §11 (H-JOR-nn).

---

## 1. Qué se construye

| Pieza | Para qué |
|---|---|
| Contrato `packages/contratos/src/actividad.ts` | La consulta y la respuesta de Actividad, únicas para la API, la web y el móvil (AD-08) |
| Módulo `ActividadModule` (`apps/api/src/actividad/`), **solo lectura** | Arma lo ocurrido en un período: compromisos terminados y registro del asistente |
| Ruta `GET /actividad?nivel=dia\|semana\|mes&fecha=AAAA-MM-DD` | La única lectura de la sección |
| Web: `app/aplicacion/actividad.tsx` y `actividad-servidor.ts` | La sección en el lienzo, con el selector que ya pinta `aplicacion.tsx` |
| Móvil: `pantallas/actividad.tsx` | La sección en su pestaña, con el mismo selector que Agenda |

**No entra:** ninguna tabla ni migración (no se toca `schema.prisma`); ninguna Operación ni escritura (REQ-CUN02-31); herramienta del asistente para «¿qué hiciste por mí ayer?» (va con el carril del agente); tareas completadas (REQ-CUN02-32, §7); registro de tiempo (REQ-CUN02-10 a 13); modo Registro del lienzo web (H-JOR-13); informes de horas (R-21).

## 2. Módulo `ActividadModule`

| Componente | Responsabilidad |
|---|---|
| `periodo.ts` | **Función pura** `periodoDe(nivel, fecha, zona, ahora)`: primer y último día, instantes de inicio y fin en la zona del perfil, foco, anterior, siguiente (nulo en el período actual) y si es el actual (H-JOR-02, H-JOR-08). Usa `agenda/dominio/tiempo.ts` |
| `descripcion.ts` | **Función pura**: la frase en pasado de cada tipo de Operación (H-JOR-06) |
| `ConsultaActividadService` | Lee el perfil (zona), el permiso de calendario, la réplica y las Operaciones; arma la respuesta |
| `ActividadController` | `GET /actividad`, `@SobreLoPropio()` |

**Importa:** `AgendaModule`, que exporta `ConsultaAgendaService` (`enRango` lee la réplica tras actualizarla si tiene más de 2 minutos, con la última copia si Google no responde: H-JOR-10), e `IntegracionesModule`, que exporta `ClienteGoogle` (`tienePermiso`). **No importa** `OperacionesModule`: su `listar` no filtra por fecha de ejecución y corta en 100. Las Operaciones se leen con `prismaService.deOrganizacion(contexto.organizacionId)`, filtradas además por `perfilId`, como el resto del dominio. Sin `sinAislar`.

**La ruta no lleva `@RequiereGoogle`**: sin el permiso, la respuesta trae el registro del asistente y `calendario: 'sin_conectar'` (REQ-CUN02-29).

## 3. Contrato

```ts
// GET /actividad?nivel=dia|semana|mes&fecha=AAAA-MM-DD
ConsultaActividad = { nivel: 'dia' | 'semana' | 'mes' (por defecto 'dia'), fecha?: AAAA-MM-DD (por defecto hoy en la zona del perfil) }

Actividad = {
  nivel, fecha /* foco: el día, el lunes o el día 1 */, primerDia, ultimoDia, hoy, zonaHoraria,
  esActual, anterior, siguiente /* nulo si esActual */,
  hastaAhora /* verdadero si el período incluye este momento: «hasta ahora» (REQ-CUN02-28) */,
  calendario: 'conectado' | 'sin_conectar' | 'no_disponible',
  compromisos: CompromisoOcurrido[],
  registro: AccionDelAsistente[],
}
CompromisoOcurrido = { id, titulo, inicio, fin, zonaHoraria, todoElDia, duracionMinutos, dia }
AccionDelAsistente = { id, tipo, descripcion, datos: { etiqueta, valor }[], origen: 'agente' | 'control_directo', ejecutadaEn, dia }
```

Toda hora va en ISO 8601 con desfase (P-05): las de los compromisos en la zona del evento, como `EventoAgenda`; `ejecutadaEn` en la zona del perfil. `dia` es la fecha del perfil en la que se agrupa cada elemento (H-JOR-03): lo calcula la API, para que web y móvil agrupen igual sin repetir la regla.

## 4. La consulta

1. Zona del perfil (`perfil_usuario.zona_horaria`, UTC si falta) y `periodoDe`.
2. **Compromisos** (REQ-CUN02-26). Si `tienePermiso(calendario)` es falso: `sin_conectar` y lista vacía. Si no, `ConsultaAgendaService.enRango(desde, hasta)`; si responde `GOOGLE_NO_DISPONIBLE` (nunca se leyó) → `no_disponible`; si responde `PERMISO_GOOGLE_FALTANTE` → `sin_conectar`. Se quedan los que **no están cancelados y cuyo fin ya pasó**, ordenados por inicio. `duracionMinutos = (fin − inicio) / 60 000`. `dia` = fecha del inicio en la zona del perfil, o `primerDia` si empezó antes.
3. **Registro del asistente** (REQ-CUN02-27). `operacion` con `perfilId` del contexto, `estado = 'ejecutada'` y `ejecutada_en` dentro del período, ordenadas por `ejecutada_en`, hasta 500. Lo descartado, en espera, propuesto o fallido no entra (H-JOR-04). `descripcion` sale de `descripcion.ts`; `datos`, de `vista_confirmacion.datos`, que es lo que se confirmó (H-JOR-06). `origen` tal cual; el texto «En la conversación» / «Desde la pantalla» lo pone el cliente (H-JOR-07).
4. Nada llama al proveedor del modelo (REQ-CUN02-35).

| Tipo de Operación | `descripcion` |
|---|---|
| `agenda.registrar` | Registró un compromiso |
| `agenda.modificar` | Cambió un compromiso |
| `agenda.cancelar` | Canceló un compromiso |
| `perfil.cambiar_zona_horaria` | Cambió tu zona horaria |
| Cualquier otro (por ejemplo, `tareas.*` cuando llegue) | El título de su tarjeta (`vista_confirmacion.accion`) |

**Rango.** El mes cabe en 31 días: dentro del máximo de la réplica (`RANGO_MAXIMO_DIAS`). La réplica empieza 30 días antes de conectar el calendario (H-JOR-11).

**Errores.** `SOLICITUD_INVALIDA` si el nivel o la fecha no valen. No hay errores propios: un calendario sin conectar o sin respuesta se dice en `calendario`, no con un código.

## 5. Pantallas

Las dos siguen `design/ARQUITECTURA-VISUAL-MOVIL.md` §2 y §3 ter y la disposición de Agenda: cabecera del período con anterior y siguiente, la zona a la vista, y debajo **dos bloques**, «Compromisos» y «Lo que hizo el asistente», cada uno con su cantidad (REQ-CUN02-33). Sin botones de acción (REQ-CUN02-31). Textos sin vocabulario interno (R-40).

| Pieza | Web | Móvil |
|---|---|---|
| Selector Día · Semana · Mes | El de `aplicacion.tsx`, que ya pinta `SECCIONES.actividad.cortes`; `aplicacion.tsx` solo monta `<Actividad corte={…} />` en lugar del vacío | Propio de la pantalla, con el estilo de `pantallas/agenda.tsx`; `aplicacion.tsx` solo monta `<ActividadPantalla />` |
| Lectura | Acción de servidor `leerActividad(nivel, fecha)` en `actividad-servidor.ts`: lee la API con la cookie y devuelve el texto ya formateado en la zona del perfil, como `lib/agenda.ts` | `conSesion('/actividad?…')`, con los formatos de `agenda/dia.ts` |
| Período | `periodo`, `periodo__pasos` y «Volver a hoy» / «Esta semana» / «Este mes» de Agenda; «Siguiente» deshabilitado en el actual | «Anterior» · título · «Siguiente» como Agenda; «Volver a hoy» si no es el actual |
| Compromiso | Horario arriba en `marca/base`, título y duración debajo | Igual, con los estilos de la fila de Agenda |
| Acción del asistente | Hora de ejecución arriba en `agente/base`, frase, pares etiqueta / valor y «En la conversación» / «Desde la pantalla» | Igual |
| Hoy | Rótulo «Lo ocurrido hasta ahora» (REQ-CUN02-28) | Igual |
| Sin calendario | En el bloque de compromisos: «Tus compromisos aparecen aquí cuando conectes tu calendario», con «Conectar mi calendario» que abre Ajustes (no es una acción sobre Actividad) | El mismo texto, remitiendo a la web como hace Agenda |
| Vacío | Por nivel: «Hoy todavía no ha pasado nada», «Esta semana todavía no ha pasado nada», «Este mes todavía no ha pasado nada» (o «Ese día / Esa semana / Ese mes no pasó nada» en otro período); por bloque: «Sin compromisos terminados» y «El asistente no hizo nada por ti en este período» | Igual |

## 6. Requisito por requisito

| REQ | Dónde se cumple |
|---|---|
| CUN02-25 | Contrato (`nivel`, `fecha`, `anterior`, `siguiente`, `esActual`); `periodoDe`; cada pantalla abre en Día y hoy, y vuelve a hoy al cambiar de nivel |
| CUN02-26 | `ConsultaActividadService`, paso 2 |
| CUN02-27 | `ConsultaActividadService`, paso 3, y `descripcion.ts` |
| CUN02-28 | `hastaAhora` en la respuesta; rótulo en las pantallas |
| CUN02-29 | Sin `@RequiereGoogle`; `calendario` en la respuesta; bloque de compromisos en las pantallas |
| CUN02-30 | Pantallas: vacío por nivel y por bloque |
| CUN02-31 | El módulo no registra ningún tipo de Operación ni tiene rutas de escritura; las pantallas no tienen botones de acción |
| CUN02-32 | §7 |
| CUN02-33 | `dia` en cada elemento; las pantallas agrupan por `dia` y pintan la cantidad |
| CUN02-34 | Filtro por `perfilId` del contexto en las dos lecturas (la réplica ya filtra, REQ-CUN01-09); horas en la zona del perfil |
| CUN02-35 | La consulta no pasa por el agente |

## 7. Tareas completadas (REQ-CUN02-32), cuando lleguen

Hueco previsto, sin código en esta tanda (H-JOR-12). Al integrar `09-tareas-personales`: el contrato suma `tareasCompletadas: { id, titulo, hechaEn, dia }[]`; la consulta lee `tarea` con `estado = 'hecha'` y `hecha_en` en el período (`specs/09-tareas-personales/plan.md`, columna `hechaEn`); las pantallas suman un tercer bloque, «Tareas completadas», entre los dos actuales. Lo que hoy completa una tarea es una Operación `tareas.completar`, así que mientras tanto aparece ya en el registro del asistente con el título de su tarjeta.

## 8. Verificación

| REQ | Prueba | Tipo |
|---|---|---|
| CUN02-25 | `actividad.periodos` | Unitaria |
| CUN02-25, 26, 28 | `actividad.compromisos-ocurridos` | Integración |
| CUN02-27 | `actividad.registro-del-asistente` | Integración |
| CUN02-29 | `actividad.sin-calendario` | Integración |
| CUN02-34 | `actividad.solo-lo-propio` | Integración |
| CUN02-35 | `actividad.sin-proveedor-de-modelo` | Integración |
| CUN02-25 a 31, 33 | `web.actividad` | Extremo a extremo |
| CUN02-25 a 31, 33 | `movil.actividad` | Extremo a extremo |

Las de integración usan el calendario simulado y Operaciones creadas por la propia API (`POST /operaciones` y `/confirmar`, y `/descartar`). Las de extremo a extremo usan la cuenta `actividad` de `cuentas.json`, que `apps/web/e2e/arrancar-api.mjs` siembra con compromisos de ayer, de hoy ya terminados, uno cancelado, uno de hoy por venir y Operaciones ejecutadas y descartadas; y `actividadVacia`, sin nada.
