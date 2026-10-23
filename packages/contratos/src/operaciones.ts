import { z } from 'zod';

// Operaciones (AD-09, specs/02-agenda/plan.md §3) · T-012.

const Instante = z.iso.datetime({ offset: true });

export const EstadoOperacion = z.enum(['en_espera', 'propuesta', 'ejecutada', 'descartada', 'fallida']);
export type EstadoOperacion = z.infer<typeof EstadoOperacion>;

export const OrigenOperacion = z.enum(['agente', 'control_directo']);
export type OrigenOperacion = z.infer<typeof OrigenOperacion>;

// Lo que muestra la tarjeta de confirmación: la acción exacta, sus datos y qué parte no se puede
// deshacer (RN-ER-03). Un «¿estás seguro?» genérico no cumple.
export const VistaConfirmacion = z.strictObject({
  accion: z.string().min(1),
  datos: z.array(z.strictObject({ etiqueta: z.string(), valor: z.string() })),
  irreversible: z.string().nullable(),
  // Falso cuando algo impide confirmar, como un conflicto de horario (REQ-CUN01-05).
  confirmable: z.boolean(),
  motivoNoConfirmable: z.string().nullable(),
  // T-018 · REQ-CUN01-05: los eventos que causan el choque y hasta tres alternativas (DP-02). Elegir
  // una es proponer de nuevo con ese horario.
  conflicto: z
    .strictObject({
      eventos: z.array(z.strictObject({ id: z.uuid(), titulo: z.string(), inicio: Instante, fin: Instante })),
      alternativas: z.array(z.strictObject({ inicio: Instante, fin: Instante })),
    })
    .nullable()
    .optional(),
});
export type VistaConfirmacion = z.infer<typeof VistaConfirmacion>;

// POST /operaciones
export const OperacionSolicitud = z.strictObject({
  tipo: z.string().min(1).max(100),
  carga: z.unknown(),
  origen: OrigenOperacion,
  solicitudOriginal: z.string().max(2000).optional(),
});
export type OperacionSolicitud = z.infer<typeof OperacionSolicitud>;

export const OperacionRespuesta = z.strictObject({
  id: z.uuid(),
  tipo: z.string(),
  origen: OrigenOperacion,
  estado: EstadoOperacion,
  vistaConfirmacion: VistaConfirmacion,
  resultado: z.unknown().nullable(),
  error: z.string().nullable(),
  creadaEn: z.iso.datetime(),
});
export type OperacionRespuesta = z.infer<typeof OperacionRespuesta>;

// GET /operaciones?estado=en_espera,propuesta
export const ConsultaOperaciones = z.strictObject({
  estado: z
    .string()
    .optional()
    .transform((valor) => (valor ? valor.split(',') : undefined))
    .pipe(z.array(EstadoOperacion).optional()),
});
export type ConsultaOperaciones = z.infer<typeof ConsultaOperaciones>;
