import { z } from 'zod';
import { ListaAgenda } from './agente';
import { OperacionRespuesta } from './operaciones';

// Conversación con el asistente (specs/07-agente/plan.md §9) · T-032. Lo que ven la web y la capa de
// captura del móvil. Cada turno tiene un tipo, para que la interfaz muestre distinto lo que es distinto
// (REQ-CAP-23): una respuesta, una tarjeta, una pregunta, algo en espera o un fallo.

const Instante = z.iso.datetime({ offset: true });

// specs/07-agente/plan.md §7 · H-AGT-09
export const MotivoEspera = z.enum(['asistente_no_disponible', 'permiso_faltante', 'funcion_por_llegar']);
export type MotivoEspera = z.infer<typeof MotivoEspera>;

const base = { id: z.uuid(), en: Instante };

export const TurnoAsistente = z.discriminatedUnion('tipo', [
  // Lo que escribió la persona
  z.strictObject({ ...base, tipo: z.literal('persona'), texto: z.string() }),
  z.strictObject({ ...base, tipo: z.literal('texto'), texto: z.string() }),
  // REQ-CUN01-13: la agenda armada por el código, tal como está
  z.strictObject({ ...base, tipo: z.literal('agenda'), lista: ListaAgenda }),
  // La tarjeta de confirmación (P-03)
  z.strictObject({ ...base, tipo: z.literal('propuesta'), operacion: OperacionRespuesta }),
  // REQ-CUN01-07, R-20: el primer dato que falta
  z.strictObject({ ...base, tipo: z.literal('pregunta'), texto: z.string(), campo: z.string() }),
  // Lo que quedó hecho, con lo que devolvió la Operación (REQ-CUN01-04)
  z.strictObject({ ...base, tipo: z.literal('resultado'), texto: z.string(), operacion: OperacionRespuesta }),
  z.strictObject({ ...base, tipo: z.literal('en_espera'), texto: z.string(), motivo: MotivoEspera, operacionId: z.uuid().nullable() }),
  z.strictObject({ ...base, tipo: z.literal('fallo'), texto: z.string() }),
]);
export type TurnoAsistente = z.infer<typeof TurnoAsistente>;

// POST /asistente/mensajes
export const MensajeAsistente = z.strictObject({ texto: z.string().trim().min(1).max(2000) });
export type MensajeAsistente = z.infer<typeof MensajeAsistente>;

// POST /asistente/decisiones. Elegir una alternativa la propone el código, sin pasar por el modelo (decisión 17 de 02-agenda)
export const DecisionAsistente = z.discriminatedUnion('decision', [
  z.strictObject({ operacionId: z.uuid(), decision: z.literal('confirmar') }),
  z.strictObject({ operacionId: z.uuid(), decision: z.literal('descartar') }),
  z.strictObject({ operacionId: z.uuid(), decision: z.literal('alternativa'), alternativa: z.strictObject({ inicio: Instante, fin: Instante }) }),
]);
export type DecisionAsistente = z.infer<typeof DecisionAsistente>;

// Respuesta de las dos rutas anteriores: solo los turnos nuevos
export const RespuestaAsistente = z.strictObject({
  conversacionId: z.uuid(),
  turnos: z.array(TurnoAsistente),
  // La Operación que espera la decisión de la persona, si hay una
  pendiente: z.uuid().nullable(),
  // REQ-AGT-01: la acción se cerró y la próxima solicitud empieza una conversación nueva
  cerrada: z.boolean(),
});
export type RespuestaAsistente = z.infer<typeof RespuestaAsistente>;

// GET /asistente/conversacion: la conversación abierta, entera
export const ConversacionAsistente = z.strictObject({
  conversacionId: z.uuid().nullable(),
  turnos: z.array(TurnoAsistente),
  pendiente: z.uuid().nullable(),
});
export type ConversacionAsistente = z.infer<typeof ConversacionAsistente>;
