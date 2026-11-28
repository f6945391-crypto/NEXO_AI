import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Command } from '@langchain/langgraph';
import {
  OperacionRespuesta,
  VistaConfirmacion,
  type ConsultaConversacion,
  type ConversacionAsistente,
  type DecisionAsistente,
  type RespuestaAsistente,
  type TurnoAsistente,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { OperacionesService } from '../operaciones/operaciones.service';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { construirGrafo, TOPE_VUELTAS, turnoPersona, type EstadoAsistente, type Reanudacion } from './grafo/grafo-asistente';
import { PuntoControlConversacion } from './grafo/punto-control-prisma';
import { EjecutorHerramientas } from './herramientas/ejecutor-herramientas';
import { LlamadasAuditadas } from './llamadas-auditadas';
import { TranscripcionService } from './transcripcion';
import { NotaDeContinuidad } from './nota-de-continuidad';
import { ConsultaTareasService } from '../tareas/consulta-tareas.service';
import { accionDeEtiqueta, armarBitacora, tipoDe } from './herramientas/herramientas-tareas';
import { ReunionesService } from '../reuniones/reuniones.service';

// specs/07-agente/plan.md §4.3 y §9 · T-032 · REQ-AGT-01. La conversación con el asistente: cada persona
// tiene como mucho una abierta; se cierra cuando se cierra su acción (H-AGT-05), y la siguiente solicitud
// empieza otra sin ese contexto. Decidir sobre una propuesta pasa por OperacionesService, la única
// confirmación que existe (AD-09), y con su desenlace se reanuda el grafo.
// T-038 · plan §14: la «conversación» de la base es el **episodio**. Lo que ve la persona se anota en la
// transcripción después de cada invocación, y sigue visible cuando el episodio se cierra (REQ-AGT-03).

type Grafo = ReturnType<typeof construirGrafo>;
type Config = { configurable: { thread_id: string }; recursionLimit: number };

// T-041 · plan §14.8: el tope de pasos de LangGraph, explícito y holgado respecto de TOPE_VUELTAS. El grafo
// corta antes, con el turno de fallo de H-AGT-10; este límite solo evita que se vea el error de LangGraph
const LIMITE_PASOS = TOPE_VUELTAS * 3 + 6;
// Decisión 18: un episodio abierto sin actividad en 30 minutos se cierra al llegar el siguiente mensaje
const INACTIVIDAD_MS = 30 * 60_000;

const sinAccion = () => errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Esta acción ya no está esperando tu decisión.');

@Injectable()
export class AsistenteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operaciones: OperacionesService,
    private readonly llamadas: LlamadasAuditadas,
    private readonly ejecutor: EjecutorHerramientas,
    private readonly transcripcion: TranscripcionService,
    private readonly tareas: ConsultaTareasService,
    private readonly nota: NotaDeContinuidad,
    private readonly reuniones: ReunionesService,
  ) {}

  async conversacion(contexto: ContextoSolicitud, consulta: ConsultaConversacion = { limite: 3 }): Promise<ConversacionAsistente> {
    const abierta = await this.abierta(contexto);
    let pendiente: string | null = null;
    if (abierta) {
      const { grafo, config } = await this.grafo(contexto, abierta.id, []);
      const estado = await grafo.getState(config);
      if (estado.next.includes('esperar_decision')) pendiente = (estado.values as Partial<EstadoAsistente>).pendiente ?? null;
    }
    const pagina = await this.transcripcion.listar(contexto, consulta);
    return { ...pagina, episodioAbierto: abierta?.id ?? null, pendiente };
  }

  async enviar(contexto: ContextoSolicitud, texto: string): Promise<RespuestaAsistente> {
    let abierta = await this.abierta(contexto);
    // T-041: si pasó media hora sin actividad y no hay una propuesta esperando, ese episodio se cierra y el
    // mensaje abre otro
    if (abierta && (await this.inactivo(contexto, abierta))) {
      await this.datos(contexto).conversacionAgente.updateMany({
        where: { id: abierta.id, perfilId: contexto.perfilId, estado: 'abierta' },
        data: { estado: 'cerrada', cerradaEn: new Date() },
      });
      abierta = null;
    }
    const conversacion = abierta ?? (await this.abrir(contexto));
    await this.anotarActividad(contexto, conversacion.id);
    const turnos: TurnoAsistente[] = [];
    const { grafo, config } = await this.grafo(contexto, conversacion.id, turnos);
    const estado = await grafo.getState(config);
    const referencia = { instante: new Date().toISOString(), zonaHoraria: await this.zona(contexto) };

    if (estado.next.includes('esperar_decision')) {
      const pendiente = (estado.values as EstadoAsistente).pendiente;
      const op = pendiente ? await this.operacion(contexto, pendiente) : null;
      // La propuesta se decidió por otra vía (un control directo, otro dispositivo): se da por cerrada y el
      // mensaje empieza una conversación nueva
      if (op && op.estado !== 'propuesta') {
        const decidida: Reanudacion = { tipo: op.estado === 'ejecutada' ? 'confirmada' : 'descartada', operacion: op };
        await this.cerrarSiHaceFalta(contexto, conversacion.id, await grafo.invoke(new Command({ resume: decidida }), config));
        await this.transcripcion.anotar(contexto, conversacion.id, turnos);
        return this.enviar(contexto, texto);
      }
      // REQ-AGT-01 · T-143 · REQ-AGT-07: el mensaje nuevo se interpreta contra la propuesta pendiente, que sigue
      // abierta mientras tanto. Si el grafo no vuelve a esperarla (propuso otra, o era otra cosa), se descarta
      const resultado = (await grafo.invoke(new Command({ resume: { tipo: 'nuevo_mensaje', texto, referencia } satisfies Reanudacion }), config)) as EstadoAsistente & {
        __interrupt__?: unknown[];
      };
      const sigueEsperandola = !!resultado.__interrupt__?.length && resultado.pendiente === op?.id;
      if (op && !sigueEsperandola) await this.descartarSiSigue(contexto, op.id);
      return this.responder(contexto, conversacion.id, resultado, turnos);
    }

    turnos.push(turnoPersona(texto));
    const resultado = await grafo.invoke(
      {
        mensajes: [{ rol: 'persona', texto }],
        referencia,
        vueltas: 0,
        pendiente: null,
        llamadas: null,
        faltante: null,
        decision: null,
        noDisponible: false,
        enEspera: null,
        cerrada: false,
        candidatas: null,
      },
      config,
    );
    return this.responder(contexto, conversacion.id, resultado, turnos);
  }

  // P-11 · T-033 · plan §7: lo que esperaba al asistente o al calendario se interpreta ahora, con la fecha
  // de la captura como referencia (REQ-CAP-24). Si resulta una acción, la misma fila pasa a propuesta y
  // espera la confirmación de siempre; si no, la respuesta queda en la conversación y la fila se cierra sin
  // efecto (H-AGT-04). Devuelve qué pasó, para que el trabajador sepa si seguir.
  async atenderEnEspera(contexto: ContextoSolicitud, operacionId: string): Promise<'propuesta' | 'atendida' | 'no_disponible' | 'ocupada' | 'sin_cambios'> {
    const op = await this.datos(contexto).operacion.findFirst({ where: { id: operacionId, perfilId: contexto.perfilId, estado: 'en_espera' } });
    if (!op || op.motivoEspera === 'funcion_por_llegar') return 'sin_cambios';
    const texto = op.solicitudOriginal ?? '';
    const previa = op.conversacionId ? await this.datos(contexto).conversacionAgente.findFirst({ where: { id: op.conversacionId, estado: 'abierta' } }) : null;
    const conversacion = previa ?? (await this.abierta(contexto)) ?? (await this.abrir(contexto));
    const turnos: TurnoAsistente[] = [];
    const { grafo, config } = await this.grafo(contexto, conversacion.id, turnos, op.id);
    // Con una tarjeta esperando a la persona, no se le pone otra encima: se atiende en la siguiente pasada
    if ((await grafo.getState(config)).next.includes('esperar_decision')) return 'ocupada';

    turnos.push(turnoPersona(texto));
    const resultado = (await grafo.invoke(
      {
        mensajes: [{ rol: 'persona', texto }],
        referencia: { instante: op.capturadaEn.toISOString(), zonaHoraria: await this.zona(contexto) },
        vueltas: 0,
        pendiente: null,
        llamadas: null,
        faltante: null,
        decision: null,
        noDisponible: false,
        enEspera: op.id,
        cerrada: false,
        candidatas: null,
      },
      config,
    )) as EstadoAsistente;
    await this.cerrarSiHaceFalta(contexto, conversacion.id, resultado);
    await this.transcripcion.anotar(contexto, conversacion.id, turnos);

    const despues = await this.datos(contexto).operacion.findFirstOrThrow({ where: { id: op.id } });
    if (despues.estado === 'propuesta') return 'propuesta';
    if (despues.estado !== 'en_espera' || despues.motivoEspera === 'funcion_por_llegar') return 'atendida';
    if (resultado.noDisponible) return 'no_disponible';
    // Sigue sin calendario: queda como estaba
    if (despues.motivoEspera === 'permiso_faltante' && !(await this.tieneCalendario(contexto))) return 'sin_cambios';
    await this.operaciones.descartar(contexto, op.id);
    return 'atendida';
  }

  private async tieneCalendario(contexto: ContextoSolicitud): Promise<boolean> {
    const permiso = await this.datos(contexto).consentimientoIntegracion.findFirst({
      where: { perfilId: contexto.perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
    });
    return permiso !== null;
  }

  async decidir(contexto: ContextoSolicitud, decision: DecisionAsistente): Promise<RespuestaAsistente> {
    const conversacion = await this.abierta(contexto);
    if (!conversacion) throw sinAccion();
    const turnos: TurnoAsistente[] = [];
    const { grafo, config } = await this.grafo(contexto, conversacion.id, turnos);
    const estado = await grafo.getState(config);
    if (decision.decision === 'referente') return this.elegirReferente(contexto, conversacion.id, decision.referenteId, { grafo, config, estado, turnos });
    if (decision.decision === 'horario') return this.elegirHorario(contexto, conversacion.id, decision, { grafo, config, estado, turnos });
    if (!estado.next.includes('esperar_decision') || (estado.values as EstadoAsistente).pendiente !== decision.operacionId) throw sinAccion();
    await this.anotarActividad(contexto, conversacion.id);

    let reanudacion: Reanudacion;
    if (decision.decision === 'confirmar') {
      reanudacion = { tipo: 'confirmada', operacion: await this.operaciones.confirmar(contexto, decision.operacionId) };
    } else if (decision.decision === 'descartar') {
      reanudacion = { tipo: 'descartada', operacion: await this.operaciones.descartar(contexto, decision.operacionId) };
    } else {
      reanudacion = { tipo: 'alternativa', operacion: await this.proponerAlternativa(contexto, conversacion.id, decision) };
    }
    return this.responder(contexto, conversacion.id, await grafo.invoke(new Command({ resume: reanudacion }), config), turnos);
  }

  // T-051 · specs/07-agente/plan.md §14.9 · REQ-CUN03-15: elegir una de las tareas candidatas no pasa por el
  // modelo. Solo vale una de las ofrecidas en este episodio; el código propone la acción sobre ella y el grafo
  // queda esperando la decisión sobre esa tarjeta, como si la herramienta la hubiera propuesto.
  private async elegirReferente(
    contexto: ContextoSolicitud,
    episodioId: string,
    referenteId: string,
    { grafo, config, estado, turnos }: { grafo: Grafo; config: Config; estado: Awaited<ReturnType<Grafo['getState']>>; turnos: TurnoAsistente[] },
  ): Promise<RespuestaAsistente> {
    const valores = estado.values as Partial<EstadoAsistente>;
    const candidatas = valores.candidatas;
    if (estado.next.length > 0 || !candidatas || !candidatas.ids.includes(referenteId)) throw sinAccion();
    await this.anotarActividad(contexto, episodioId);
    const accion = accionDeEtiqueta(candidatas.accion);
    const tarea = await this.tareas.porId(contexto, referenteId);
    // T-126 · REQ-CUN03-23: con «Ver cómo va», la bitácora de la elegida, sin proponer nada
    if (accion === 'bitacora') {
      turnos.push({ id: randomUUID(), en: new Date().toISOString(), tipo: 'bitacora', bitacora: armarBitacora(tarea) });
      await grafo.updateState(config, { candidatas: null, siguiente: 'fin' }, 'herramientas');
      return this.responder(contexto, episodioId, (await grafo.getState(config)).values as EstadoAsistente, turnos);
    }
    const ultima = [...(valores.mensajes ?? [])].reverse().find((m) => m.rol === 'persona');
    const op = await this.operaciones.proponer(
      contexto,
      {
        tipo: tipoDe(accion, tarea),
        // T-126 · REQ-CUN03-21: con «Anotar avance», el texto guardado con las candidatas
        carga: accion === 'anotar' ? { tareaId: referenteId, texto: candidatas.avance ?? '' } : { tareaId: referenteId },
        origen: 'agente',
        ...(ultima?.rol === 'persona' ? { solicitudOriginal: ultima.texto.slice(0, 2000) } : {}),
      },
      { conversacionId: episodioId },
    );
    turnos.push({ id: randomUUID(), en: new Date().toISOString(), tipo: 'propuesta', operacion: op });
    await grafo.updateState(config, { pendiente: op.id, candidatas: null, siguiente: 'esperar' }, 'herramientas');
    return this.responder(contexto, episodioId, await grafo.invoke(null, config), turnos);
  }

  // T-133 · REQ-CUN06-10, 14: elegir una de las propuestas de una reunión no pasa por el modelo. Solo vale una de
  // las ofrecidas en este episodio; el código propone convocar (o mover, si ya está agendada) y el grafo espera
  private async elegirHorario(
    contexto: ContextoSolicitud,
    episodioId: string,
    decision: Extract<DecisionAsistente, { decision: 'horario' }>,
    { grafo, config, estado, turnos }: { grafo: Grafo; config: Config; estado: Awaited<ReturnType<Grafo['getState']>>; turnos: TurnoAsistente[] },
  ): Promise<RespuestaAsistente> {
    const valores = estado.values as Partial<EstadoAsistente>;
    const ofrecida = valores.reunion;
    if (estado.next.length > 0 || !ofrecida || ofrecida.id !== decision.reunionId || !ofrecida.inicios.some((i) => Date.parse(i) === Date.parse(decision.inicio))) throw sinAccion();
    await this.anotarActividad(contexto, episodioId);
    const reunion = await this.reuniones.resumenPorId(contexto, decision.reunionId);
    const ultima = [...(valores.mensajes ?? [])].reverse().find((m) => m.rol === 'persona');
    const op = await this.operaciones.proponer(
      contexto,
      {
        tipo: reunion.estado === 'agendada' ? 'reunion.mover' : 'reunion.convocar',
        carga: { reunionId: decision.reunionId, inicio: decision.inicio },
        origen: 'agente',
        ...(ultima?.rol === 'persona' ? { solicitudOriginal: ultima.texto.slice(0, 2000) } : {}),
      },
      { conversacionId: episodioId },
    );
    turnos.push({ id: randomUUID(), en: new Date().toISOString(), tipo: 'propuesta', operacion: op });
    await grafo.updateState(config, { pendiente: op.id, reunion: null, siguiente: 'esperar' }, 'herramientas');
    return this.responder(contexto, episodioId, await grafo.invoke(null, config), turnos);
  }

  // Decisión 17 de 02-agenda: elegir una alternativa no pasa por el modelo. Solo vale una de las que ofreció
  // la tarjeta; la propuesta anterior se descarta y se propone la misma acción con ese horario.
  private async proponerAlternativa(
    contexto: ContextoSolicitud,
    conversacionId: string,
    decision: Extract<DecisionAsistente, { decision: 'alternativa' }>,
  ): Promise<OperacionRespuesta> {
    const fila = await this.datos(contexto).operacion.findFirst({ where: { id: decision.operacionId, perfilId: contexto.perfilId } });
    if (!fila) throw sinAccion();
    const ofrecidas = VistaConfirmacion.parse(fila.vistaConfirmacion).conflicto?.alternativas ?? [];
    const { inicio, fin } = decision.alternativa;
    const elegida = ofrecidas.find((a) => Date.parse(a.inicio) === Date.parse(inicio) && Date.parse(a.fin) === Date.parse(fin));
    if (!elegida) throw errorApi(400, 'SOLICITUD_INVALIDA', 'Ese horario no es una de las alternativas ofrecidas.');
    await this.operaciones.descartar(contexto, fila.id);
    return this.operaciones.proponer(
      contexto,
      {
        tipo: fila.tipo,
        carga: { ...(fila.carga as object), inicio: elegida.inicio, fin: elegida.fin },
        origen: 'agente',
        ...(fila.solicitudOriginal ? { solicitudOriginal: fila.solicitudOriginal } : {}),
      },
      { conversacionId },
    );
  }

  // T-143: la propuesta que quedó atrás; si ya se decidió por otra vía, no hay nada que descartar
  private async descartarSiSigue(contexto: ContextoSolicitud, operacionId: string): Promise<void> {
    const fila = await this.datos(contexto).operacion.findFirst({ where: { id: operacionId, perfilId: contexto.perfilId, estado: 'propuesta' } });
    if (fila) await this.operaciones.descartar(contexto, operacionId);
  }

  // El punto de control ya se guardó dentro de `invoke`: los turnos se anotan después, para que un fallo a
  // mitad no deje en la transcripción algo que el grafo no recuerda (plan §14.4)
  private async responder(contexto: ContextoSolicitud, episodioId: string, resultado: unknown, turnos: TurnoAsistente[]): Promise<RespuestaAsistente> {
    const estado = resultado as EstadoAsistente & { __interrupt__?: unknown[] };
    const episodioCerrado = await this.cerrarSiHaceFalta(contexto, episodioId, estado);
    await this.transcripcion.anotar(contexto, episodioId, turnos);
    return {
      episodioId,
      turnos,
      pendiente: estado.__interrupt__?.length ? estado.pendiente : null,
      episodioCerrado,
      cierre: episodioCerrado ? await this.transcripcion.cierre(contexto, episodioId) : null,
    };
  }

  // T-041 · H-AG-08: el trabajador descarta la propuesta a las 24 horas; en la conversación queda el turno
  // «Esta propuesta caducó» y el episodio se cierra como descartado. Devuelve si la descartó.
  async caducarPropuesta(contexto: ContextoSolicitud, operacionId: string, ahora = new Date()): Promise<boolean> {
    const fila = await this.datos(contexto).operacion.findFirst({ where: { id: operacionId, perfilId: contexto.perfilId, estado: 'propuesta' } });
    if (!fila) return false;
    const operacion = await this.operaciones.descartar(contexto, operacionId);
    const episodio = fila.conversacionId
      ? await this.datos(contexto).conversacionAgente.findFirst({ where: { id: fila.conversacionId, perfilId: contexto.perfilId, estado: 'abierta' } })
      : null;
    if (!episodio) return true;
    const turnos: TurnoAsistente[] = [];
    const { grafo, config } = await this.grafo(contexto, episodio.id, turnos);
    const estado = await grafo.getState(config);
    if (estado.next.includes('esperar_decision') && (estado.values as EstadoAsistente).pendiente === operacionId) {
      const resultado = await grafo.invoke(new Command({ resume: { tipo: 'descartada', operacion, caducada: true } satisfies Reanudacion }), config);
      await this.cerrarSiHaceFalta(contexto, episodio.id, resultado);
    }
    // Si el grafo no esperaba esa tarjeta, el aviso queda igual en la transcripción
    if (turnos.length === 0) turnos.push({ id: randomUUID(), en: ahora.toISOString(), tipo: 'texto', texto: 'Esta propuesta caducó; no se hizo nada.' });
    await this.datos(contexto).conversacionAgente.updateMany({
      where: { id: episodio.id, perfilId: contexto.perfilId, estado: 'abierta' },
      data: { estado: 'cerrada', cerradaEn: ahora },
    });
    await this.transcripcion.anotar(contexto, episodio.id, turnos);
    return true;
  }

  // Decisión 18 · T-041: inactivo si pasaron 30 minutos sin mensajes ni decisiones y no espera una propuesta
  private async inactivo(contexto: ContextoSolicitud, episodio: { id: string; ultimaActividadEn: Date }): Promise<boolean> {
    if (Date.now() - episodio.ultimaActividadEn.getTime() < INACTIVIDAD_MS) return false;
    const esperando = await this.datos(contexto).operacion.count({ where: { conversacionId: episodio.id, estado: 'propuesta' } });
    return esperando === 0;
  }

  // Plan §14.3: con cada mensaje o decisión; el cierre por inactividad lo usa (T-041)
  private async anotarActividad(contexto: ContextoSolicitud, episodioId: string): Promise<void> {
    await this.datos(contexto).conversacionAgente.updateMany({ where: { id: episodioId, perfilId: contexto.perfilId }, data: { ultimaActividadEn: new Date() } });
  }

  // REQ-AGT-01, H-AGT-05: al ejecutarse o descartarse su acción, la conversación se cierra
  private async cerrarSiHaceFalta(contexto: ContextoSolicitud, conversacionId: string, resultado: unknown): Promise<boolean> {
    if (!(resultado as Partial<EstadoAsistente>).cerrada) return false;
    await this.datos(contexto).conversacionAgente.updateMany({
      where: { id: conversacionId, perfilId: contexto.perfilId, estado: 'abierta' },
      data: { estado: 'cerrada', cerradaEn: new Date() },
    });
    return true;
  }

  // `turnos` recoge lo que la persona verá de esta invocación (plan §14.2). T-040 · REQ-AGT-01 v2: la nota de
  // continuidad se arma una vez por invocación, y solo si el grafo llama al modelo; `excluir` deja fuera la
  // Operación en espera que se está atendiendo, que ya es el mensaje de la persona
  private async grafo(contexto: ContextoSolicitud, conversacionId: string, turnos: TurnoAsistente[], excluir?: string) {
    const punto = await PuntoControlConversacion.cargar(this.datos(contexto), contexto.organizacionId, conversacionId);
    const anotar = (nuevos: TurnoAsistente[]) => void turnos.push(...nuevos);
    let nota: Promise<string | null> | null = null;
    const deNota = () => (nota ??= this.nota.armar(contexto, excluir ? { excluir } : {}));
    const grafo = construirGrafo({ llamadas: this.llamadas, ejecutor: this.ejecutor, operaciones: this.operaciones }, contexto, conversacionId, punto, anotar, deNota);
    return { grafo, config: { configurable: { thread_id: conversacionId }, recursionLimit: LIMITE_PASOS } };
  }

  private abierta(contexto: ContextoSolicitud) {
    return this.datos(contexto).conversacionAgente.findFirst({
      where: { perfilId: contexto.perfilId, estado: 'abierta' },
      orderBy: { abiertaEn: 'desc' },
    });
  }

  private abrir(contexto: ContextoSolicitud) {
    return this.datos(contexto).conversacionAgente.create({
      data: { organizacionId: contexto.organizacionId, perfilId: contexto.perfilId, estado: 'abierta' },
    });
  }

  private async operacion(contexto: ContextoSolicitud, id: string): Promise<OperacionRespuesta | null> {
    const lista = await this.operaciones.listar(contexto);
    return lista.find((op) => op.id === id) ?? null;
  }

  private async zona(contexto: ContextoSolicitud): Promise<string> {
    const perfil = await this.datos(contexto).perfilUsuario.findFirst({ where: { id: contexto.perfilId } });
    return perfil?.zonaHoraria ?? 'UTC';
  }

  private datos(contexto: ContextoSolicitud) {
    return this.prisma.deOrganizacion(contexto.organizacionId);
  }
}
