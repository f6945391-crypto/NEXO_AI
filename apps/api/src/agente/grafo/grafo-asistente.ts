import { randomUUID } from 'node:crypto';
import { Annotation, END, interrupt, START, StateGraph } from '@langchain/langgraph';
import { EventoAgenda, TurnoDeHerramienta, type OperacionRespuesta, type TurnoAsistente } from '@nexoai/contratos';
import { fechaLarga, horario, nombreDeZona } from '../../agenda/formato';
import type { ContextoSolicitud } from '../../identidad/contexto';
import type { EjecutorHerramientas } from '../herramientas/ejecutor-herramientas';
import type { LlamadasAuditadas } from '../llamadas-auditadas';
import { ModeloNoDisponible, type LlamadaHerramienta, type MensajeModelo } from '../modelo/proveedor-modelo';
import { instrucciones } from './instrucciones';
import type { PuntoControlConversacion } from './punto-control-prisma';

// specs/07-agente/plan.md §4 · T-032. El grafo del asistente: interpreta con el modelo, ejecuta las
// herramientas y, cuando una propone una Operación, **se interrumpe** hasta que la persona decide (P-03).
// La confirmación sigue siendo una sola, la de Operaciones (AD-09): el grafo no ejecuta nada por su cuenta.
// Preguntar lo que falta, comunicar el resultado y elegir una alternativa no pasan por el modelo (P-02).

// H-AGT-10: como mucho cuatro llamadas al modelo por mensaje
export const TOPE_VUELTAS = 4;
// H-AGT-05: contexto de como mucho 20 mensajes
export const MENSAJES_DE_CONTEXTO = 20;

// REQ-CUN01-07, REQ-CAP-04, R-20: una frase fija por dato que falta, y solo el primero
export const PREGUNTAS: Readonly<Record<string, string>> = {
  fecha: '¿Qué día?',
  horaInicio: '¿A qué hora empieza?',
  titulo: '¿Cómo lo llamo?',
  cambio: '¿Qué quieres cambiar: el día, la hora o el título?',
};

export const SIN_RESPUESTA = 'El asistente no responde en este momento. No se ha creado ni enviado nada.';
const FALLO = 'No pude resolverlo esta vez. No se ha creado ni enviado nada.';
const SIN_CALENDARIO = 'Para eso necesito permiso para ver y editar tu calendario de Google. Puedes conectarlo en Ajustes.';

// Lo que la persona decide sobre una propuesta, o un mensaje nuevo mientras había una
export type Reanudacion =
  | { tipo: 'confirmada' | 'descartada' | 'alternativa'; operacion: OperacionRespuesta }
  | { tipo: 'nuevo_mensaje'; texto: string; referencia: Referencia };

type Referencia = { instante: string; zonaHoraria: string };
type Siguiente = 'interpretar' | 'herramientas' | 'preguntar' | 'esperar' | 'fin';

const reemplazar = <T>(valor: T) => Annotation<T>({ reducer: (_actual: T, nuevo: T) => nuevo, default: () => valor });
const acumular = <T>() => Annotation<T[]>({ reducer: (actual: T[], nuevos: T[]) => actual.concat(nuevos), default: () => [] });

export const EstadoAsistente = Annotation.Root({
  mensajes: acumular<MensajeModelo>(),
  // Todo lo que vio la persona en esta conversación
  turnos: acumular<TurnoAsistente>(),
  referencia: reemplazar<Referencia | null>(null),
  pendiente: reemplazar<string | null>(null),
  llamadas: reemplazar<{ lista: LlamadaHerramienta[]; llamadaModeloId: string | null } | null>(null),
  faltante: reemplazar<string | null>(null),
  decision: reemplazar<Reanudacion | null>(null),
  vueltas: reemplazar<number>(0),
  siguiente: reemplazar<Siguiente>('fin'),
  // T-033: el modelo no respondió; lo pedido queda en espera
  noDisponible: reemplazar<boolean>(false),
  // REQ-AGT-01: la acción se cerró y la conversación termina
  cerrada: reemplazar<boolean>(false),
});
export type EstadoAsistente = typeof EstadoAsistente.State;

const ahora = () => new Date().toISOString();
export const turnoPersona = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'persona', texto });
const turnoTexto = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'texto', texto });
const turnoFallo = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'fallo', texto });
const deAsistente = (texto: string): MensajeModelo => ({ rol: 'asistente', texto, llamadas: [] });

const ultimaFrase = (mensajes: MensajeModelo[]) => {
  const persona = mensajes.findLast((m) => m.rol === 'persona');
  return persona?.rol === 'persona' ? persona.texto : '';
};

// El contexto empieza siempre en un mensaje de la persona, para no cortar una herramienta por la mitad
function recortar(mensajes: MensajeModelo[]): MensajeModelo[] {
  const ultimos = mensajes.slice(-MENSAJES_DE_CONTEXTO);
  const inicio = ultimos.findIndex((m) => m.rol === 'persona');
  return inicio > 0 ? ultimos.slice(inicio) : ultimos;
}

// REQ-CUN01-04: el resultado sale de lo que devolvió la Operación, no de lo propuesto
function textoDelResultado(op: OperacionRespuesta, zona: string): string {
  const evento = EventoAgenda.safeParse(op.resultado);
  if (!evento.success) return 'Listo.';
  const { titulo, inicio, fin, todoElDia } = evento.data;
  const cuando = `el ${fechaLarga(new Date(inicio), zona)}${todoElDia ? '' : `, de ${horario(new Date(inicio), new Date(fin), zona)}`} (${nombreDeZona(zona, new Date(inicio)).toLowerCase()})`;
  if (op.tipo === 'agenda.cancelar') return `Listo: cancelé «${titulo}», que era ${cuando}.`;
  if (op.tipo === 'agenda.modificar') return `Listo: «${titulo}» quedó ${cuando}.`;
  return `Listo: «${titulo}» quedó en tu calendario ${cuando}.`;
}

export interface DependenciasGrafo {
  llamadas: LlamadasAuditadas;
  ejecutor: EjecutorHerramientas;
}

// Se compila en cada petición: los nodos cierran sobre la identidad de quien pide, que nunca pasa por el
// estado ni por el modelo (P-04).
export function construirGrafo(deps: DependenciasGrafo, contexto: ContextoSolicitud, conversacionId: string, punto: PuntoControlConversacion) {
  const referenciaDe = (estado: EstadoAsistente) => {
    const r = estado.referencia ?? { instante: ahora(), zonaHoraria: 'UTC' };
    return { instante: new Date(r.instante), zonaHoraria: r.zonaHoraria };
  };

  async function interpretar(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    if (estado.vueltas >= TOPE_VUELTAS) return { turnos: [turnoFallo(FALLO)], siguiente: 'fin' };
    const referencia = referenciaDe(estado);
    const r = await deps.llamadas.llamar(contexto, conversacionId, {
      sistema: instrucciones(referencia),
      mensajes: recortar(estado.mensajes),
      herramientas: deps.ejecutor.definiciones(),
      maxTokens: 1024,
      referencia,
    });
    if (!r.ok) {
      const noDisponible = r.error instanceof ModeloNoDisponible;
      return { turnos: [turnoFallo(noDisponible ? SIN_RESPUESTA : FALLO)], noDisponible, siguiente: 'fin' };
    }
    const { texto, llamadas } = r.respuesta;
    const mensaje: MensajeModelo = { rol: 'asistente', texto, llamadas };
    if (llamadas.length > 0) {
      return { mensajes: [mensaje], vueltas: estado.vueltas + 1, llamadas: { lista: llamadas, llamadaModeloId: r.llamadaModeloId }, siguiente: 'herramientas' };
    }
    const dicho = texto?.trim();
    return { mensajes: [mensaje], vueltas: estado.vueltas + 1, turnos: dicho ? [turnoTexto(dicho)] : [], siguiente: 'fin' };
  }

  async function herramientas(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    const { lista, llamadaModeloId } = estado.llamadas ?? { lista: [], llamadaModeloId: null };
    const entorno = { conversacionId, solicitudOriginal: ultimaFrase(estado.mensajes), referencia: referenciaDe(estado) };
    const mensajes: MensajeModelo[] = [];
    const turnos: TurnoAsistente[] = [];
    let pendiente: string | null = null;
    let faltante: string | null = null;
    let sinCalendario = false;

    for (const llamada of lista) {
      // Una acción a la vez: la persona decide sobre una tarjeta antes de ver otra
      if (pendiente) {
        const contenido = { error: { codigo: 'UNA_ACCION_A_LA_VEZ', mensaje: 'Ya hay una acción esperando la confirmación de la persona.' } };
        mensajes.push({ rol: 'herramienta', llamadaId: llamada.id, contenido: JSON.stringify(contenido) });
        continue;
      }
      const r = await deps.ejecutor.ejecutar(contexto, entorno, llamada, llamadaModeloId);
      mensajes.push({ rol: 'herramienta', llamadaId: llamada.id, contenido: JSON.stringify(r.paraModelo) });
      const turno = TurnoDeHerramienta.safeParse(r.turno);
      if (turno.success) {
        const base = { id: randomUUID(), en: ahora() };
        turnos.push(turno.data.tipo === 'agenda' ? { ...base, tipo: 'agenda', lista: turno.data.lista } : { ...base, tipo: 'propuesta', operacion: turno.data.operacion });
      }
      if (r.operacionId) pendiente = r.operacionId;
      const error = (r.paraModelo as { error?: { codigo?: string; campos?: string[] } } | null)?.error;
      if (error?.codigo === 'DATOS_FALTANTES' && !faltante) faltante = error.campos?.[0] ?? 'cambio';
      if (error?.codigo === 'PERMISO_GOOGLE_FALTANTE') sinCalendario = true;
    }

    // REQ-CUN01-08: el permiso que falta lo dice el código, igual siempre
    if (sinCalendario && !pendiente) return { mensajes: [...mensajes, deAsistente(SIN_CALENDARIO)], turnos: [...turnos, turnoTexto(SIN_CALENDARIO)], siguiente: 'fin' };
    const siguiente: Siguiente = pendiente ? 'esperar' : faltante ? 'preguntar' : 'interpretar';
    return { mensajes, turnos, pendiente, faltante, siguiente };
  }

  async function preguntar(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    const campo = estado.faltante ?? 'cambio';
    const texto = PREGUNTAS[campo] ?? PREGUNTAS.cambio!;
    return {
      mensajes: [deAsistente(texto)],
      turnos: [{ id: randomUUID(), en: ahora(), tipo: 'pregunta', texto, campo }],
      faltante: null,
      siguiente: 'fin',
    };
  }

  // Al reanudar, este nodo se vuelve a ejecutar desde el principio: no hace nada antes de interrumpirse
  function esperarDecision(estado: EstadoAsistente): Partial<EstadoAsistente> {
    const decision = interrupt<{ operacionId: string | null }, Reanudacion>({ operacionId: estado.pendiente });
    return { decision };
  }

  async function comunicar(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    const decision = estado.decision;
    const zona = referenciaDe(estado).zonaHoraria;
    if (!decision) return { siguiente: 'fin' };

    if (decision.tipo === 'nuevo_mensaje') {
      // REQ-AGT-01: la propuesta anterior ya se descartó y el mensaje nuevo se interpreta con lo hablado
      return {
        mensajes: [deAsistente('(La propuesta anterior quedó descartada.)'), { rol: 'persona', texto: decision.texto }],
        turnos: [turnoPersona(decision.texto)],
        referencia: decision.referencia,
        pendiente: null,
        decision: null,
        vueltas: 0,
        siguiente: 'interpretar',
      };
    }

    const op = decision.operacion;
    const base = { id: randomUUID(), en: ahora() };
    // Elegir una alternativa ya la propuso el código; se muestra la tarjeta nueva y se vuelve a esperar
    if (decision.tipo === 'alternativa' || op.estado === 'propuesta') {
      return {
        mensajes: [deAsistente('(Se propuso de nuevo con otro horario.)')],
        turnos: [{ ...base, tipo: 'propuesta', operacion: op }],
        pendiente: op.id,
        decision: null,
        siguiente: 'esperar',
      };
    }
    if (decision.tipo === 'descartada') {
      const texto = 'De acuerdo, no hice nada.';
      return { mensajes: [deAsistente(texto)], turnos: [turnoTexto(texto)], pendiente: null, decision: null, cerrada: true, siguiente: 'fin' };
    }
    if (op.estado === 'ejecutada') {
      const texto = textoDelResultado(op, zona);
      return { mensajes: [deAsistente(texto)], turnos: [{ ...base, tipo: 'resultado', texto, operacion: op }], pendiente: null, decision: null, cerrada: true, siguiente: 'fin' };
    }
    const texto = `No se pudo hacer: ${op.error ?? 'el calendario rechazó la acción'}. No cambió nada.`;
    return { mensajes: [deAsistente(texto)], turnos: [turnoFallo(texto)], pendiente: null, decision: null, cerrada: true, siguiente: 'fin' };
  }

  const ir = (estado: EstadoAsistente) => (estado.siguiente === 'esperar' ? 'esperar_decision' : estado.siguiente === 'fin' ? END : estado.siguiente);

  return new StateGraph(EstadoAsistente)
    .addNode('interpretar', interpretar)
    .addNode('herramientas', herramientas)
    .addNode('preguntar', preguntar)
    .addNode('esperar_decision', esperarDecision)
    .addNode('comunicar', comunicar)
    .addEdge(START, 'interpretar')
    .addConditionalEdges('interpretar', ir, ['herramientas', END])
    .addConditionalEdges('herramientas', ir, ['interpretar', 'preguntar', 'esperar_decision', END])
    .addEdge('preguntar', END)
    .addEdge('esperar_decision', 'comunicar')
    .addConditionalEdges('comunicar', ir, ['interpretar', 'esperar_decision', END])
    .compile({ checkpointer: punto });
}
