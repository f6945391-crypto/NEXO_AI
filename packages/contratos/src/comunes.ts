import { z } from 'zod';

// T-046 · specs/09-tareas-personales/plan.md §6. Formas que comparten varios contratos, para no copiarlas
// una vez más. Misma definición que tenían en `agente.ts`; `agenda.ts`, `asistente.ts` y `operaciones.ts`
// conservan la suya por ahora (su `Instante` no es siempre el mismo) y se mueven aquí cuando se toquen.

export const Fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Fecha en la zona de la persona, AAAA-MM-DD');
export type Fecha = z.infer<typeof Fecha>;

export const Hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .describe('Hora en la zona de la persona, HH:mm de 24 horas');
export type Hora = z.infer<typeof Hora>;

// Instante con el desfase de su zona: «2026-11-09T10:00:00-05:00»
export const Instante = z.iso.datetime({ offset: true });
export type Instante = z.infer<typeof Instante>;
