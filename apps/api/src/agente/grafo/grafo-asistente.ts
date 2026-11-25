import { randomUUID } from 'node:crypto';
import { Annotation, END, interrupt, START, StateGraph } from '@langchain/langgraph';
import { EventoAgenda, TareaPersonal, TurnoDeHerramienta, type OperacionRespuesta, type TurnoAsistente } from '@nexoai/contratos';
import { fechaLarga, horario, nombreDeZona } from '../../agenda/formato';
import type { ContextoSolicitud } from '../../identidad/contexto';
import type { OperacionesService } from '../../operaciones/operaciones.service';
import type { EjecutorHerramientas } from '../herramientas/ejecutor-herramientas';
import type { LlamadasAuditadas } from '../llamadas-auditadas';
import { ModeloNoDisponible, type LlamadaHerramienta, type MensajeModelo } from '../modelo/proveedor-modelo';
import { instrucciones } from './instrucciones';
import type { PuntoControlConversacion } from './punto-control-prisma';

// specs/07-agente/plan.md §4 · T-032. El grafo del asistente: interpreta con el modelo, ejecuta las
// herramientas y, cuando una propone una Operación, **se interrumpe** hasta que la persona decide (P-03).
// La confirmación sigue siendo una sola, la de Operaciones (AD-09): el grafo no ejecuta nada por su cuenta.
// T-038 · plan §14.2: lo que ve la persona **no vive en el estado**. Cada nodo entrega sus turnos a `anotar`,
// un recolector de esta invocación que el servicio guarda en la transcripción; así el punto de control solo
// lleva lo que necesita el modelo. Ningún nodo anota antes de `interrupt()`, que al reanudar vuelve a ejecutarse.
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
  // REQ-CUN03-02: de una tarea solo se pregunta qué hay que hacer, nunca para cuándo (H-TP-02)
  texto: '¿Qué hay que hacer?',
  cambio_tarea: '¿Qué quieres cambiar de la tarea: el texto, la fecha o de quién la esperas?',
};

// P-11, REQ-CUN01-11, REQ-CAP-24 · T-033: el aviso de lo que queda en espera lo escribe el código
export const EN_ESPERA = 'El asistente no responde en este momento. Lo que pediste quedó en espera: no se ha creado ni enviado nada. Lo retomo en cuanto vuelva.';
const FALLO = 'No pude resolverlo esta vez. No se ha creado ni enviado nada.';
const SIN_CALENDARIO = 'Para eso necesito permiso para ver y editar tu calendario de Google. Puedes conectarlo en Ajustes. Lo que pediste quedó guardado y lo retomo cuando lo conectes.';

// Lo que la persona decide sobre una propuesta, o un mensaje nuevo mientras había una
export type Reanudacion =
  | { tipo: 'confirmada' | 'descartada' | 'alternativa'; operacion: OperacionRespuesta; caducada?: boolean }
  | { tipo: 'nuevo_mensaje'; texto: string; referencia: Referencia };

type Referencia = { instante: string; zonaHoraria: string };
type Siguiente = 'interpretar' | 'herramientas' | 'preguntar' | 'esperar' | 'fin';

const reemplazar = <T>(valor: T) => Annotation<T>({ reducer: (_actual: T, nuevo: T) => nuevo, default: () => valor });
const acumular = <T>() => Annotation<T[]>({ reducer: (actual: T[], nuevos: T[]) => actual.concat(nuevos), default: () => [] });

export const EstadoAsistente = Annotation.Root({
  mensajes: acumular<MensajeModelo>(),
  referencia: reemplazar<Referencia | null>(null),
  pendiente: reemplazar<string | null>(null),
  llamadas: reemplazar<{ lista: LlamadaHerramienta[]; llamadaModeloId: string | null } | null>(null),
  faltante: reemplazar<string | null>(null),
  decision: reemplazar<Reanudacion | null>(null),
  vueltas: reemplazar<number>(0),
  siguiente: reemplazar<Siguiente>('fin'),
  // T-033: el modelo no respondió; lo pedido queda en espera
  noDisponible: reemplazar<boolean>(false),
  // T-033: la Operación en espera que se está atendiendo al volver el asistente
  enEspera: reemplazar<string | null>(null),
  // REQ-AGT-01: la acción se cerró y el episodio termina; la transcripción sigue (REQ-AGT-03)
  cerrada: reemplazar<boolean>(false),
  // T-051 · REQ-CUN03-15: las tareas candidatas que se ofrecieron y qué se haría con la elegida. Escribir otra
  // cosa las descarta (plan §14.9)
  candidatas: reemplazar<{ accion: string; ids: string[] } | null>(null),
});
export type EstadoAsistente = typeof EstadoAsistente.State;

const ahora = () => new Date().toISOString();
export const turnoPersona = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'persona', texto });
const turnoTexto = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'texto', texto });
const turnoFallo = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'fallo', texto });
const deAsistente = (texto: string): MensajeModelo => ({ rol: 'asistente', texto, llamadas: [] });

// «Hora de Lima (GMT-5)» dentro de una frase: solo la primera letra en minúscula
export const zonaEnFrase = (zona: string, instante: Date) => {
  const nombre = nombreDeZona(zona, instante);
  return nombre.charAt(0).toLowerCase() + nombre.slice(1);
};

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
  const tarea = op.tipo.startsWith('tareas.') ? TareaPersonal.safeParse(op.resultado) : null;
  if (tarea?.success) return textoDeTarea(op.tipo, tarea.data);
  const evento = EventoAgenda.safeParse(op.resultado);
  if (!evento.success) return 'Listo.';
  const { titulo, inicio, fin, todoElDia } = evento.data;
  const cuando = `el ${fechaLarga(new Date(inicio), zona)}${todoElDia ? '' : `, de ${horario(new Date(inicio), new Date(fin), zona)}`} (${zonaEnFrase(zona, new Date(inicio))})`;
  if (op.tipo === 'agenda.cancelar') return `Listo: cancelé «${titulo}», que era ${cuando}.`;
  if (op.tipo === 'agenda.modificar') return `Listo: «${titulo}» quedó ${cuando}.`;
  return `Listo: «${titulo}» quedó en tu calendario ${cuando}.`;
}

// T-050 · 09-tareas-personales: lo que quedó, dicho por el código y sin prometer avisos (H-TP-10)
const DONDE: Readonly<Record<TareaPersonal['franja'], string>> = { con_fecha: 'Con fecha', sin_fecha: 'Sin fecha', esperando: 'Esperando de alguien' };
function textoDeTarea(tipo: string, tarea: TareaPersonal): string {
  const t = `«${tarea.texto}»`;
  if (tipo === 'tareas.registrar') return `Listo: ${t} quedó en tus tareas, en «${DONDE[tarea.franja]}».`;
  if (tipo === 'tareas.cambiar') return `Listo: cambié ${t}. Ahora está en «${DONDE[tarea.franja]}».`;
  if (tipo === 'tareas.completar') return `Listo: ${t} quedó hecha.`;
  if (tipo === 'tareas.recibido') return `Listo: marqué ${t} como recibido.`;
  if (tipo === 'tareas.reabrir') return `Listo: ${t} vuelve a estar pendiente, en «${DONDE[tarea.franja]}».`;
  return `Listo: descarté ${t}. Ya no aparece en tus tareas.`;
}

export interface DependenciasGrafo {
  llamadas: LlamadasAuditadas;
  ejecutor: EjecutorHerramientas;
  operaciones: OperacionesService;
}

// Se compila en cada petición: los nodos cierran sobre la identidad de quien pide, que nunca pasa por el
// estado ni por el modelo (P-04).
export function construirGrafo(
  deps: DependenciasGrafo,
  contexto: ContextoSolicitud,
  conversacionId: string,
  punto: PuntoControlConversacion,
  anotar: (turnos: TurnoAsistente[]) => void,
) {
  const con = (turnos: TurnoAsistente[], cambio: Partial<EstadoAsistente>): Partial<EstadoAsistente> => {
    anotar(turnos);
    return cambio;
  };
  const referenciaDe = (estado: EstadoAsistente) => {
    const r = estado.referencia ?? { instante: ahora(), zonaHoraria: 'UTC' };
    return { instante: new Date(r.instante), zonaHoraria: r.zonaHoraria };
  };

  // P-11 · T-033: lo pedido se guarda en espera con su motivo y el momento de la captura, sin crear nada
  async function enEspera(estado: EstadoAsistente, motivo: 'asistente_no_disponible' | 'permiso_faltante', texto: string): Promise<TurnoAsistente> {
    const frase = ultimaFrase(estado.mensajes);
    const op = await deps.operaciones.encolar(contexto, {
      tipo: 'asistente.solicitud',
      carga: { texto: frase },
      motivo,
      solicitudOriginal: frase,
      capturadaEn: referenciaDe(estado).instante,
      conversacionId,
    });
    return { id: randomUUID(), en: ahora(), tipo: 'en_espera', texto, motivo, operacionId: op.id };
  }

  async function interpretar(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    if (estado.vueltas >= TOPE_VUELTAS) return con([turnoFallo(FALLO)], { siguiente: 'fin' });
    const referencia = referenciaDe(estado);
    const r = await deps.llamadas.llamar(contexto, conversacionId, {
      sistema: instrucciones(referencia),
      mensajes: recortar(estado.mensajes),
      herramientas: deps.ejecutor.definiciones(),
      maxTokens: 1024,
      referencia,
    });
    if (!r.ok) {
      if (!(r.error instanceof ModeloNoDisponible)) return con([turnoFallo(FALLO)], { siguiente: 'fin' });
      // Lo que ya estaba en espera sigue igual; lo nuevo se encola (REQ-CUN01-11, REQ-CAP-24)
      if (estado.enEspera) return { noDisponible: true, siguiente: 'fin' };
      return con([await enEspera(estado, 'asistente_no_disponible', EN_ESPERA)], { noDisponible: true, siguiente: 'fin' });
    }
    const { texto, llamadas } = r.respuesta;
    const mensaje: MensajeModelo = { rol: 'asistente', texto, llamadas };
    if (llamadas.length > 0) {
      return { mensajes: [mensaje], vueltas: estado.vueltas + 1, llamadas: { lista: llamadas, llamadaModeloId: r.llamadaModeloId }, siguiente: 'herramientas' };
    }
    const dicho = texto?.trim();
    return con(dicho ? [turnoTexto(dicho)] : [], { mensajes: [mensaje], vueltas: estado.vueltas + 1, siguiente: 'fin' });
  }

  async function herramientas(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    const { lista, llamadaModeloId } = estado.llamadas ?? { lista: [], llamadaModeloId: null };
    const entorno = {
      conversacionId,
      solicitudOriginal: ultimaFrase(estado.mensajes),
      referencia: referenciaDe(estado),
      ...(estado.enEspera ? { enEspera: estado.enEspera } : {}),
    };
    const mensajes: MensajeModelo[] = [];
    const turnos: TurnoAsistente[] = [];
    let pendiente: string | null = null;
    let faltante: string | null = null;
    let sinCalendario = false;
    let guardada = false;
    let candidatas: EstadoAsistente['candidatas'] = null;
    let sinTarea: string | null = null;

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
        if (turno.data.tipo === 'agenda') turnos.push({ ...base, tipo: 'agenda', lista: turno.data.lista });
        else if (turno.data.tipo === 'tareas') turnos.push({ ...base, tipo: 'tareas', lista: turno.data.lista });
        else if (turno.data.tipo === 'propuesta') turnos.push({ ...base, tipo: 'propuesta', operacion: turno.data.operacion });
        else if (turno.data.tipo === 'alternativas_de_referente') {
          turnos.push({ ...base, tipo: 'alternativas_de_referente', lista: turno.data.lista });
          candidatas = { accion: turno.data.lista.accion, ids: turno.data.lista.candidatas.map((c) => c.id) };
        } else {
          turnos.push({ ...base, ...turno.data });
          guardada = true;
        }
      }
      if (r.operacionId) pendiente = r.operacionId;
      const error = (r.paraModelo as { error?: { codigo?: string; campos?: string[] } } | null)?.error;
      if (error?.codigo === 'DATOS_FALTANTES' && !faltante) faltante = error.campos?.[0] ?? 'cambio';
      if (error?.codigo === 'PERMISO_GOOGLE_FALTANTE') sinCalendario = true;
      if (error?.codigo === 'TAREA_NO_ENCONTRADA' && !sinTarea) sinTarea = (error as { mensaje?: string }).mensaje ?? null;
    }

    // REQ-CUN01-08, REQ-ACC-08: el permiso que falta lo dice el código, y lo pedido queda guardado
    if (sinCalendario && !pendiente) {
      const aviso = estado.enEspera ? turnoTexto(SIN_CALENDARIO) : await enEspera(estado, 'permiso_faltante', SIN_CALENDARIO);
      return con([...turnos, aviso], { mensajes: [...mensajes, deAsistente(SIN_CALENDARIO)], siguiente: 'fin' });
    }
    // REQ-AGT-02: una tarea guardada en espera no necesita otra vuelta del modelo, y cierra el episodio (decisión 27)
    if (guardada && !pendiente) return con(turnos, { mensajes, cerrada: true, siguiente: 'fin' });
    // T-051 · REQ-CUN03-15: con varias candidatas no se propone nada; la persona elige sin pasar por el modelo
    if (candidatas && !pendiente) return con(turnos, { mensajes, candidatas, siguiente: 'fin' });
    // Ninguna tarea encaja: se dice con las palabras del código, sin otra vuelta del modelo
    if (sinTarea && !pendiente) return con([...turnos, turnoTexto(sinTarea)], { mensajes: [...mensajes, deAsistente(sinTarea)], siguiente: 'fin' });
    const siguiente: Siguiente = pendiente ? 'esperar' : faltante ? 'preguntar' : 'interpretar';
    return con(turnos, { mensajes, pendiente, faltante, siguiente });
  }

  async function preguntar(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    const campo = estado.faltante ?? 'cambio';
    const texto = PREGUNTAS[campo] ?? PREGUNTAS.cambio!;
    return con([{ id: randomUUID(), en: ahora(), tipo: 'pregunta', texto, campo }], {
      mensajes: [deAsistente(texto)],
      faltante: null,
      siguiente: 'fin',
    });
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
      return con([turnoPersona(decision.texto)], {
        mensajes: [deAsistente('(La propuesta anterior quedó descartada.)'), { rol: 'persona', texto: decision.texto }],
        referencia: decision.referencia,
        pendiente: null,
        decision: null,
        vueltas: 0,
        siguiente: 'interpretar',
      });
    }

    const op = decision.operacion;
    const base = { id: randomUUID(), en: ahora() };
    // Elegir una alternativa ya la propuso el código; se muestra la tarjeta nueva y se vuelve a esperar
    if (decision.tipo === 'alternativa' || op.estado === 'propuesta') {
      return con([{ ...base, tipo: 'propuesta', operacion: op }], {
        mensajes: [deAsistente('(Se propuso de nuevo con otro horario.)')],
        pendiente: op.id,
        decision: null,
        siguiente: 'esperar',
      });
    }
    if (decision.tipo === 'descartada') {
      // T-041 · H-AG-08: la que descartó el trabajador a las 24 horas lo dice así
      const texto = decision.caducada ? 'Esta propuesta caducó; no se hizo nada.' : 'De acuerdo, no hice nada.';
      return con([turnoTexto(texto)], { mensajes: [deAsistente(texto)], pendiente: null, decision: null, cerrada: true, siguiente: 'fin' });
    }
    if (op.estado === 'ejecutada') {
      const texto = textoDelResultado(op, zona);
      return con([{ ...base, tipo: 'resultado', texto, operacion: op }], { mensajes: [deAsistente(texto)], pendiente: null, decision: null, cerrada: true, siguiente: 'fin' });
    }
    const texto = `No se pudo hacer: ${op.error ?? 'el calendario rechazó la acción'}. No cambió nada.`;
    return con([turnoFallo(texto)], { mensajes: [deAsistente(texto)], pendiente: null, decision: null, cerrada: true, siguiente: 'fin' });
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
