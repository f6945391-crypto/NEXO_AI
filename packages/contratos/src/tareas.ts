import { z } from 'zod';

// Tareas personales (specs/08-tareas-personales/plan.md §3 a §5) · T-046. Una fecha es un día del
// calendario («2026-11-14»), no un instante: no cambia si la persona cambia de zona horaria (decisión 4).

const DIA_VALIDO = /^\d{4}-\d{2}-\d{2}$/;

export const FechaDia = z
  .string()
  .regex(DIA_VALIDO, 'una fecha como 2026-11-14')
  .refine((valor) => {
    const fecha = new Date(`${valor}T00:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
  }, 'no es un día del calendario');
export type FechaDia = z.infer<typeof FechaDia>;

export const HoraLocal = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'una hora como 18:30');
export type HoraLocal = z.infer<typeof HoraLocal>;

const Texto = z.string().trim().min(1).max(200);

export const EstadoTarea = z.enum(['pendiente', 'completada', 'cancelada']);
export type EstadoTarea = z.infer<typeof EstadoTarea>;

// Las tres franjas de REQ-CUN03-03, sin niveles de período
export const FranjaTarea = z.enum(['con_fecha', 'sin_fecha', 'esperando']);
export type FranjaTarea = z.infer<typeof FranjaTarea>;

// EN-04 Tarea personal, tal como sale de la API. `franja` y `atrasada` las calcula el código, no el modelo.
export const Tarea = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  estado: EstadoTarea,
  fecha: FechaDia.nullable(),
  hora: HoraLocal.nullable(),
  esperaDe: z.string().nullable(),
  esperaQue: z.string().nullable(),
  franja: FranjaTarea,
  atrasada: z.boolean(),
  completadaEn: z.iso.datetime().nullable(),
  canceladaEn: z.iso.datetime().nullable(),
});
export type Tarea = z.infer<typeof Tarea>;

// GET /tareas: las pendientes, ya ordenadas (decisión 3)
export const TareasPorFranja = z.strictObject({
  conFecha: z.array(Tarea),
  sinFecha: z.array(Tarea),
  esperando: z.array(Tarea),
});
export type TareasPorFranja = z.infer<typeof TareasPorFranja>;

// GET /tareas?estado=completada,cancelada: lo que ya no está en las franjas, para consultarlo (R-25)
export const ConsultaTareas = z.strictObject({
  estado: z
    .string()
    .optional()
    .transform((valor) => (valor ? valor.split(',') : undefined))
    .pipe(z.array(EstadoTarea).optional()),
});
export type ConsultaTareas = z.infer<typeof ConsultaTareas>;

// Carga de la Operación `tareas.registrar` (REQ-CUN03-01, 07). La fecha solo la pone la persona; el
// sistema no inventa ninguna (REQ-CUN03-01). `esperaDe` y `esperaQue` van juntos.
export const PropuestaTarea = z
  .strictObject({
    titulo: Texto,
    fecha: FechaDia.optional(),
    hora: HoraLocal.optional(),
    esperaDe: Texto.optional(),
    esperaQue: Texto.optional(),
  })
  .refine(({ hora, fecha }) => hora === undefined || fecha !== undefined, { message: 'la hora necesita una fecha', path: ['hora'] })
  .refine(({ esperaDe, esperaQue }) => (esperaDe === undefined) === (esperaQue === undefined), {
    message: 'hay que decir de quién y qué se espera',
    path: ['esperaDe'],
  });
export type PropuestaTarea = z.infer<typeof PropuestaTarea>;

// Carga de la Operación `tareas.actualizar` (REQ-CUN03-06). Solo lo que cambia; `null` quita el valor
// («quítale la fecha»). `cancelar` la deja cancelada, sin borrarla.
export const ActualizacionTarea = z
  .strictObject({
    tareaId: z.uuid(),
    titulo: Texto.optional(),
    fecha: FechaDia.nullable().optional(),
    hora: HoraLocal.nullable().optional(),
    esperaDe: Texto.nullable().optional(),
    esperaQue: Texto.nullable().optional(),
    cancelar: z.literal(true).optional(),
  })
  .refine(
    (c) => [c.titulo, c.fecha, c.hora, c.esperaDe, c.esperaQue, c.cancelar].some((valor) => valor !== undefined),
    'no dice qué cambiar',
  )
  .refine((c) => !c.cancelar || [c.titulo, c.fecha, c.hora, c.esperaDe, c.esperaQue].every((valor) => valor === undefined), {
    message: 'cancelar no se combina con otros cambios',
    path: ['cancelar'],
  });
export type ActualizacionTarea = z.infer<typeof ActualizacionTarea>;

// Carga de la Operación `tareas.completar` (REQ-CUN03-05). `reabrir` devuelve una completada a su franja.
export const CierreTarea = z.strictObject({ tareaId: z.uuid(), reabrir: z.boolean().optional() });
export type CierreTarea = z.infer<typeof CierreTarea>;

// GET /tareas/en-fechas?desde=2026-11-10&hasta=2026-11-16: las pendientes con fecha en esos días, para
// pintarlas en la agenda como bloques distintos de un compromiso (REQ-CUN03-08). Aparte de
// GET /agenda/eventos, que no cambia.
const DIA_MS = 24 * 3600_000;
export const RANGO_TAREAS_MAXIMO_DIAS = 366;
export const ConsultaTareasEnFechas = z
  .strictObject({ desde: FechaDia, hasta: FechaDia })
  .refine(({ desde, hasta }) => Date.parse(desde) <= Date.parse(hasta), 'desde no puede ser posterior a hasta')
  .refine(({ desde, hasta }) => Date.parse(hasta) - Date.parse(desde) <= RANGO_TAREAS_MAXIMO_DIAS * DIA_MS, `como mucho ${RANGO_TAREAS_MAXIMO_DIAS} días`);
export type ConsultaTareasEnFechas = z.infer<typeof ConsultaTareasEnFechas>;
