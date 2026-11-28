import { z } from 'zod';
import { Desglose, ListaAgenda, MotivoEspera } from './agente';
import { OperacionRespuesta } from './operaciones';
import { BitacoraTarea, CandidatasDeReferente, ListaTareas } from './tareas';
import { PropuestasDeReunion } from './reuniones';

// Conversación con el asistente (specs/07-agente/plan.md §9) · T-032. Lo que ven la web y la capa de
// captura del móvil. Cada turno tiene un tipo, para que la interfaz muestre distinto lo que es distinto
// (REQ-CAP-23): una respuesta, una tarjeta, una pregunta, algo en espera o un fallo.

const Instante = z.iso.datetime({ offset: true });

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
  // T-050 · REQ-CUN03-14: las tareas pendientes armadas por el código, como la lista de agenda
  z.strictObject({ ...base, tipo: z.literal('tareas'), lista: ListaTareas }),
  // T-051 · REQ-CUN03-15, REQ-AGT-04: varias tareas encajan; la persona elige una y ve su tarjeta
  z.strictObject({ ...base, tipo: z.literal('alternativas_de_referente'), lista: CandidatasDeReferente }),
  // T-126 · REQ-CUN03-23: la bitácora de una tarea, armada por el código
  z.strictObject({ ...base, tipo: z.literal('bitacora'), bitacora: BitacoraTarea }),
  // T-133 · REQ-CUN06-01: las propuestas de horario de una reunión; elegir una no pasa por el modelo
  z.strictObject({ ...base, tipo: z.literal('reunion'), propuestas: PropuestasDeReunion }),
  // T-157 · REQ-AGT-09: lo que entendió de una frase con varias cosas
  z.strictObject({ ...base, tipo: z.literal('desglose'), desglose: Desglose }),
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
  // T-051 · plan §14.9: elegir una de las candidatas. Lo propone el código, sin pasar por el modelo
  z.strictObject({ decision: z.literal('referente'), referenteId: z.uuid() }),
  // T-133 · REQ-CUN06-10: elegir una de las propuestas de horario de una reunión. Lo propone el código
  z.strictObject({ decision: z.literal('horario'), reunionId: z.uuid(), inicio: Instante }),
]);
export type DecisionAsistente = z.infer<typeof DecisionAsistente>;

// T-038 · plan §14.6 · REQ-AGT-03: cómo terminó un episodio, para el separador. Lo arma el servidor con su
// Operación; el cliente solo lo pinta. Sin acción: se cerró sin confirmar ni descartar nada
// `guardado` (decisión 27): una tarea quedó en espera; a propósito no es `registrado`, porque la tarea aún no existe.
// Desde T-050 ya no se produce: registrar una tarea da `registrado`. Se conserva para lo ya transcrito.
// T-046 · 09-tareas-personales plan §6: `hecho`, `reabierto`, `cambiado` y `quitado` (una tarea descartada,
// distinto de `descartado`, que es una propuesta descartada)
// T-125: `anotado`, un avance en la bitácora de una tarea
// T-133: `convocada`, una reunión agendada con sus invitados
export const DesenlaceEpisodio = z.enum(['registrado', 'movido', 'cancelado', 'descartado', 'guardado', 'hecho', 'reabierto', 'cambiado', 'quitado', 'anotado', 'convocada', 'sin_accion']);
export type DesenlaceEpisodio = z.infer<typeof DesenlaceEpisodio>;

export const CierreEpisodio = z.strictObject({ en: Instante, desenlace: DesenlaceEpisodio, titulo: z.string().nullable() });
export type CierreEpisodio = z.infer<typeof CierreEpisodio>;

// Respuesta de las dos rutas anteriores: solo los turnos nuevos
export const RespuestaAsistente = z.strictObject({
  // T-038: el episodio, una intención con su acción (glosario). Es el id de lo que antes se llamaba conversación
  episodioId: z.uuid(),
  turnos: z.array(TurnoAsistente),
  // La Operación que espera la decisión de la persona, si hay una
  pendiente: z.uuid().nullable(),
  // REQ-AGT-01: la acción se cerró y la próxima solicitud empieza otro episodio. La transcripción sigue (REQ-AGT-03)
  episodioCerrado: z.boolean(),
  // T-039: cómo se cerró, para el separador; nulo mientras sigue abierto
  cierre: CierreEpisodio.nullable(),
});
export type RespuestaAsistente = z.infer<typeof RespuestaAsistente>;

export const EpisodioAsistente = z.strictObject({
  id: z.uuid(),
  abiertoEn: Instante,
  // Nulo mientras está abierto
  cierre: CierreEpisodio.nullable(),
  turnos: z.array(TurnoAsistente),
});
export type EpisodioAsistente = z.infer<typeof EpisodioAsistente>;

// GET /asistente/conversacion?antes=&limite=: la transcripción por páginas de episodios, de lo más reciente
// hacia atrás. `antes` es el `cursor` de la página anterior
export const ConsultaConversacion = z.strictObject({
  antes: z.uuid().optional(),
  limite: z.coerce.number().int().min(1).max(20).default(3),
});
export type ConsultaConversacion = z.infer<typeof ConsultaConversacion>;

export const ConversacionAsistente = z.strictObject({
  // Del más antiguo al más reciente de esta página
  episodios: z.array(EpisodioAsistente),
  episodioAbierto: z.uuid().nullable(),
  pendiente: z.uuid().nullable(),
  hayAnteriores: z.boolean(),
  cursor: z.uuid().nullable(),
});
export type ConversacionAsistente = z.infer<typeof ConversacionAsistente>;
