import { z } from 'zod';
import { OrigenOperacion } from './operaciones';

// Actividad: lo que pasó (specs/02-jornada/spec.md §8 bis, plan.md §3) · T-080. Solo lectura. Las horas de
// un compromiso van con el desfase de su zona, como EventoAgenda; la de una acción, con el de la zona del
// perfil (P-05). `dia` es la fecha del perfil en la que se agrupa cada elemento: la calcula la API (H-JOR-03).

const Instante = z.iso.datetime({ offset: true });

// Una fecha de calendario que existe: «2026-11-07», no «2026-02-30»
export const FechaCalendario = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha con la forma AAAA-MM-DD')
  .refine((texto) => {
    const d = new Date(`${texto}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
  }, 'esa fecha no existe');
export type FechaCalendario = z.infer<typeof FechaCalendario>;

export const NivelActividad = z.enum(['dia', 'semana', 'mes']);
export type NivelActividad = z.infer<typeof NivelActividad>;

// GET /actividad?nivel=dia|semana|mes&fecha=AAAA-MM-DD. Sin nivel, Día; sin fecha, hoy en la zona del perfil.
export const ConsultaActividad = z.strictObject({
  nivel: NivelActividad.default('dia'),
  fecha: FechaCalendario.optional(),
});
export type ConsultaActividad = z.infer<typeof ConsultaActividad>;

// REQ-CUN02-26: un compromiso que ya terminó y no se canceló
export const CompromisoOcurrido = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  inicio: Instante,
  fin: Instante,
  zonaHoraria: z.string().min(1),
  todoElDia: z.boolean(),
  duracionMinutos: z.number().int().nonnegative(),
  dia: FechaCalendario,
});
export type CompromisoOcurrido = z.infer<typeof CompromisoOcurrido>;

// REQ-CUN02-27: una acción confirmada y ejecutada. `descripcion` es la frase en pasado (H-JOR-06) y `datos`,
// los de la tarjeta que se confirmó.
export const AccionDelAsistente = z.strictObject({
  id: z.uuid(),
  tipo: z.string(),
  descripcion: z.string().min(1),
  datos: z.array(z.strictObject({ etiqueta: z.string(), valor: z.string() })),
  origen: OrigenOperacion,
  ejecutadaEn: Instante,
  dia: FechaCalendario,
});
export type AccionDelAsistente = z.infer<typeof AccionDelAsistente>;

// REQ-CUN02-29, H-JOR-10: sin el permiso, o con el calendario sin responder y sin copia, no hay compromisos
export const EstadoCalendarioActividad = z.enum(['conectado', 'sin_conectar', 'no_disponible']);
export type EstadoCalendarioActividad = z.infer<typeof EstadoCalendarioActividad>;

export const Actividad = z.strictObject({
  nivel: NivelActividad,
  // El foco del período: el día, el lunes de la semana o el día 1 del mes
  fecha: FechaCalendario,
  primerDia: FechaCalendario,
  ultimoDia: FechaCalendario,
  hoy: FechaCalendario,
  zonaHoraria: z.string().min(1),
  esActual: z.boolean(),
  anterior: FechaCalendario,
  // H-JOR-08: no se pasa del período actual
  siguiente: FechaCalendario.nullable(),
  // REQ-CUN02-28: el período incluye este momento, así que lo que muestra es lo ocurrido hasta ahora
  hastaAhora: z.boolean(),
  calendario: EstadoCalendarioActividad,
  compromisos: z.array(CompromisoOcurrido),
  registro: z.array(AccionDelAsistente),
});
export type Actividad = z.infer<typeof Actividad>;
