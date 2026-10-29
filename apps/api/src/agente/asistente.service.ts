import { Injectable } from '@nestjs/common';
import { Command } from '@langchain/langgraph';
import {
  OperacionRespuesta,
  VistaConfirmacion,
  type ConversacionAsistente,
  type DecisionAsistente,
  type RespuestaAsistente,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { OperacionesService } from '../operaciones/operaciones.service';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { construirGrafo, turnoPersona, type EstadoAsistente, type Reanudacion } from './grafo/grafo-asistente';
import { PuntoControlConversacion } from './grafo/punto-control-prisma';
import { EjecutorHerramientas } from './herramientas/ejecutor-herramientas';
import { LlamadasAuditadas } from './llamadas-auditadas';

// specs/07-agente/plan.md §4.3 y §9 · T-032 · REQ-AGT-01. La conversación con el asistente: cada persona
// tiene como mucho una abierta; se cierra cuando se cierra su acción (H-AGT-05), y la siguiente solicitud
// empieza otra sin ese contexto. Decidir sobre una propuesta pasa por OperacionesService, la única
// confirmación que existe (AD-09), y con su desenlace se reanuda el grafo.

const sinAccion = () => errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Esta acción ya no está esperando tu decisión.');

@Injectable()
export class AsistenteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operaciones: OperacionesService,
    private readonly llamadas: LlamadasAuditadas,
    private readonly ejecutor: EjecutorHerramientas,
  ) {}

  async conversacion(contexto: ContextoSolicitud): Promise<ConversacionAsistente> {
    const abierta = await this.abierta(contexto);
    if (!abierta) return { conversacionId: null, turnos: [], pendiente: null };
    const { grafo, config } = await this.grafo(contexto, abierta.id);
    const estado = await grafo.getState(config);
    const valores = estado.values as Partial<EstadoAsistente>;
    return { conversacionId: abierta.id, turnos: valores.turnos ?? [], pendiente: estado.next.includes('esperar_decision') ? (valores.pendiente ?? null) : null };
  }

  async enviar(contexto: ContextoSolicitud, texto: string): Promise<RespuestaAsistente> {
    const conversacion = (await this.abierta(contexto)) ?? (await this.abrir(contexto));
    const { grafo, config } = await this.grafo(contexto, conversacion.id);
    const estado = await grafo.getState(config);
    const antes = ((estado.values as Partial<EstadoAsistente>).turnos ?? []).length;
    const referencia = { instante: new Date().toISOString(), zonaHoraria: await this.zona(contexto) };

    if (estado.next.includes('esperar_decision')) {
      const pendiente = (estado.values as EstadoAsistente).pendiente;
      const op = pendiente ? await this.operacion(contexto, pendiente) : null;
      // La propuesta se decidió por otra vía (un control directo, otro dispositivo): se da por cerrada y el
      // mensaje empieza una conversación nueva
      if (op && op.estado !== 'propuesta') {
        const decidida: Reanudacion = { tipo: op.estado === 'ejecutada' ? 'confirmada' : 'descartada', operacion: op };
        await this.cerrarSiHaceFalta(contexto, conversacion.id, await grafo.invoke(new Command({ resume: decidida }), config));
        return this.enviar(contexto, texto);
      }
      // REQ-AGT-01: un mensaje nuevo con una propuesta pendiente la descarta y se interpreta con lo hablado
      if (op) await this.operaciones.descartar(contexto, op.id);
      const resultado = await grafo.invoke(new Command({ resume: { tipo: 'nuevo_mensaje', texto, referencia } satisfies Reanudacion }), config);
      return this.responder(contexto, conversacion.id, resultado, antes);
    }

    const resultado = await grafo.invoke(
      {
        mensajes: [{ rol: 'persona', texto }],
        turnos: [turnoPersona(texto)],
        referencia,
        vueltas: 0,
        pendiente: null,
        llamadas: null,
        faltante: null,
        decision: null,
        noDisponible: false,
        cerrada: false,
      },
      config,
    );
    return this.responder(contexto, conversacion.id, resultado, antes);
  }

  async decidir(contexto: ContextoSolicitud, decision: DecisionAsistente): Promise<RespuestaAsistente> {
    const conversacion = await this.abierta(contexto);
    if (!conversacion) throw sinAccion();
    const { grafo, config } = await this.grafo(contexto, conversacion.id);
    const estado = await grafo.getState(config);
    if (!estado.next.includes('esperar_decision') || (estado.values as EstadoAsistente).pendiente !== decision.operacionId) throw sinAccion();
    const antes = (estado.values as EstadoAsistente).turnos.length;

    let reanudacion: Reanudacion;
    if (decision.decision === 'confirmar') {
      reanudacion = { tipo: 'confirmada', operacion: await this.operaciones.confirmar(contexto, decision.operacionId) };
    } else if (decision.decision === 'descartar') {
      reanudacion = { tipo: 'descartada', operacion: await this.operaciones.descartar(contexto, decision.operacionId) };
    } else {
      reanudacion = { tipo: 'alternativa', operacion: await this.proponerAlternativa(contexto, conversacion.id, decision) };
    }
    return this.responder(contexto, conversacion.id, await grafo.invoke(new Command({ resume: reanudacion }), config), antes);
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

  private async responder(contexto: ContextoSolicitud, conversacionId: string, resultado: unknown, antes: number): Promise<RespuestaAsistente> {
    const estado = resultado as EstadoAsistente & { __interrupt__?: unknown[] };
    const cerrada = await this.cerrarSiHaceFalta(contexto, conversacionId, estado);
    return {
      conversacionId,
      turnos: estado.turnos.slice(antes),
      pendiente: estado.__interrupt__?.length ? estado.pendiente : null,
      cerrada,
    };
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

  private async grafo(contexto: ContextoSolicitud, conversacionId: string) {
    const punto = await PuntoControlConversacion.cargar(this.datos(contexto), contexto.organizacionId, conversacionId);
    const grafo = construirGrafo({ llamadas: this.llamadas, ejecutor: this.ejecutor }, contexto, conversacionId, punto);
    return { grafo, config: { configurable: { thread_id: conversacionId } } };
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
