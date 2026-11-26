import { z } from 'zod';
import { Fecha, Hora } from './comunes';
import { OperacionRespuesta } from './operaciones';
import { BitacoraTarea, CandidatasDeReferente, ListaTareas } from './tareas';
import { PropuestasDeReunion } from './reuniones';

// Herramientas del agente (specs/07-agente/plan.md §5) · T-031. Los argumentos que da el modelo: fechas y
// horas **en la zona de la persona y sin desfase**. El código las convierte (P-05, decisión 16 de
// 02-agenda), así el modelo nunca escribe un desfase equivocado. De estos esquemas sale lo que ve el modelo.

const Titulo = z.string().trim().min(1).max(200);

export const ArgsConsultarAgenda = z
  .strictObject({
    desde: Fecha.describe('Primer día del rango, AAAA-MM-DD'),
    hasta: Fecha.describe('Último día del rango, incluido, AAAA-MM-DD'),
    horaDesde: Hora.optional().describe('Solo desde esta hora, HH:mm; por ejemplo 12:00 para «por la tarde»'),
    horaHasta: Hora.optional().describe('Solo hasta esta hora, HH:mm'),
  })
  .describe('Lee los compromisos de la persona entre dos fechas');
export type ArgsConsultarAgenda = z.infer<typeof ArgsConsultarAgenda>;

// Todo opcional: lo que la persona no dijo no se inventa. Si falta algo, la herramienta dice qué (REQ-CUN01-07)
export const ArgsRegistrarEvento = z.strictObject({
  titulo: Titulo.optional().describe('Título breve del compromiso'),
  fecha: Fecha.optional(),
  horaInicio: Hora.optional(),
  horaFin: Hora.optional().describe('Solo si la persona dijo cuándo termina; si no, omítela'),
});
export type ArgsRegistrarEvento = z.infer<typeof ArgsRegistrarEvento>;

export const ArgsModificarEvento = z.strictObject({
  eventoId: z.uuid().describe('Id del compromiso, tal como lo dio agenda_consultar'),
  titulo: Titulo.optional(),
  fecha: Fecha.optional().describe('Fecha nueva; sin ella, el mismo día'),
  horaInicio: Hora.optional().describe('Hora nueva de inicio; sin ella, la misma hora'),
  horaFin: Hora.optional().describe('Hora nueva de fin; sin ella, se conserva la duración'),
});
export type ArgsModificarEvento = z.infer<typeof ArgsModificarEvento>;

export const ArgsCancelarEvento = z.strictObject({
  eventoId: z.uuid().describe('Id del compromiso, tal como lo dio agenda_consultar'),
});
export type ArgsCancelarEvento = z.infer<typeof ArgsCancelarEvento>;

// specs/07-agente/plan.md §7 · H-AGT-09: por qué espera algo que se pidió. `funcion_por_llegar` se conserva
// para las filas que ya lo tienen, pero desde T-050 ninguna herramienta lo escribe (09-tareas-personales §3.2)
export const MotivoEspera = z.enum(['asistente_no_disponible', 'permiso_faltante', 'funcion_por_llegar']);
export type MotivoEspera = z.infer<typeof MotivoEspera>;

// T-050: `ArgsGuardarTarea` y `ClaseTarea` se retiraron con `captura.guardar_tarea`; las tareas tienen sus
// herramientas en tareas.ts

// REQ-CUN01-13: la lista de compromisos la arma el código con los datos de la réplica, no el modelo.
export const CompromisoListado = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  // «Sábado 31 de octubre»
  dia: z.string(),
  // «09:00 – 10:00» en la zona de la persona, o «Todo el día»
  horario: z.string(),
  // «Hora de Madrid: 17:00 – 17:30» si el compromiso está en otra zona
  enSuZona: z.string().nullable(),
  cancelado: z.boolean(),
  invitado: z.boolean(),
});
export type CompromisoListado = z.infer<typeof CompromisoListado>;

export const ListaAgenda = z.strictObject({
  // «Del sábado 31 de octubre al lunes 2 de noviembre, de 12:00 a 20:00»
  rango: z.string(),
  // «Hora de Lima (GMT-5)» (REQ-CUN01-10)
  zona: z.string(),
  compromisos: z.array(CompromisoListado),
});
export type ListaAgenda = z.infer<typeof ListaAgenda>;

// Lo que una herramienta deja para la interfaz, sin pasar por el modelo
export const TurnoDeHerramienta = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('agenda'), lista: ListaAgenda }),
  z.strictObject({ tipo: z.literal('propuesta'), operacion: OperacionRespuesta }),
  // T-033: lo pedido quedó guardado sin crear nada (REQ-AGT-02, REQ-CAP-23)
  z.strictObject({ tipo: z.literal('en_espera'), texto: z.string(), motivo: MotivoEspera, operacionId: z.uuid() }),
  // T-050 · REQ-CUN03-14: las tareas pendientes armadas por el código, tal como están
  z.strictObject({ tipo: z.literal('tareas'), lista: ListaTareas }),
  // T-051 · REQ-CUN03-15, REQ-AGT-04: varias tareas encajan con lo dicho; la persona elige
  z.strictObject({ tipo: z.literal('alternativas_de_referente'), lista: CandidatasDeReferente }),
  // T-126 · REQ-CUN03-23: la bitácora de una tarea, armada por el código
  z.strictObject({ tipo: z.literal('bitacora'), bitacora: BitacoraTarea }),
  // T-133 · REQ-CUN06-01: las propuestas de horario de una reunión, armadas por el código
  z.strictObject({ tipo: z.literal('reunion'), propuestas: PropuestasDeReunion }),
]);
export type TurnoDeHerramienta = z.infer<typeof TurnoDeHerramienta>;
