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

// T-157 · decisión 39 de 07-agente: un período dicho con palabras; los días los calcula el código, nunca el modelo.
// Las semanas van de lunes a domingo (decisión 20 de 02-agenda)
export const Periodo = z
  .enum(['hoy', 'manana', 'esta_semana', 'semana_siguiente', 'este_mes', 'mes_siguiente'])
  .describe('Si la persona dijo hoy, mañana, esta semana, la semana siguiente o próxima, este mes o el mes siguiente: pásalo aquí y no calcules los días');
export type Periodo = z.infer<typeof Periodo>;
