import { HttpException, Injectable } from '@nestjs/common';
import {
  Actividad,
  VistaConfirmacion,
  type AccionDelAsistente,
  type CompromisoOcurrido,
  type ConsultaActividad,
  type ErrorApi,
  type EstadoCalendarioActividad,
} from '@nexoai/contratos';
import { ConsultaAgendaService } from '../agenda/consulta-agenda.service';
import { isoConDesfase } from '../agenda/dominio/tiempo';
import type { ContextoSolicitud } from '../identidad/contexto';
import { ClienteGoogle } from '../integraciones/cliente-google';
import { PrismaService } from '../plataforma/prisma.service';
import { describirAccion } from './descripcion';
import { fechaEnZona, periodoDe, type Periodo } from './periodo';

// T-081 · specs/02-jornada/plan.md §4 · REQ-CUN02-25 a 29, 31, 34, 35. Solo lectura: no registra ningún tipo
// de Operación ni escribe nada. Los compromisos salen de la réplica a través de la consulta de la agenda
// (que la actualiza si hace falta y muestra la última copia si Google no responde); las acciones, de las
// Operaciones ejecutadas de la persona, con `deOrganizacion` y su `perfilId`. No pasa por el asistente.

// Más que esto en un mes no cabe en una pantalla; se corta sin fallar
const MAXIMO_ACCIONES = 500;

const codigoDe = (error: unknown) =>
  error instanceof HttpException ? (error.getResponse() as Partial<ErrorApi>).codigo : undefined;

@Injectable()
export class ConsultaActividadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agenda: ConsultaAgendaService,
    private readonly google: ClienteGoogle,
  ) {}

  async consultar(contexto: ContextoSolicitud, consulta: ConsultaActividad, ahora = new Date()): Promise<Actividad> {
    const perfil = await this.prisma.deOrganizacion(contexto.organizacionId).perfilUsuario.findUniqueOrThrow({ where: { id: contexto.perfilId } });
    const zona = perfil.zonaHoraria ?? 'UTC';
    const periodo = periodoDe(consulta.nivel, consulta.fecha, zona, ahora);
    const [{ calendario, compromisos }, registro] = await Promise.all([
      this.compromisos(contexto, periodo, zona, ahora),
      this.registro(contexto, periodo, zona),
    ]);
    return Actividad.parse({
      nivel: periodo.nivel,
      fecha: periodo.fecha,
      primerDia: periodo.primerDia,
      ultimoDia: periodo.ultimoDia,
      hoy: periodo.hoy,
      zonaHoraria: zona,
      esActual: periodo.esActual,
      anterior: periodo.anterior,
      siguiente: periodo.siguiente,
      hastaAhora: periodo.hastaAhora,
      calendario,
      compromisos,
      registro,
    });
  }

  // REQ-CUN02-26, 29 · H-JOR-03, H-JOR-10
  private async compromisos(
    contexto: ContextoSolicitud,
    periodo: Periodo,
    zona: string,
    ahora: Date,
  ): Promise<{ calendario: EstadoCalendarioActividad; compromisos: CompromisoOcurrido[] }> {
    if (!(await this.google.tienePermiso(contexto, 'calendario'))) return { calendario: 'sin_conectar', compromisos: [] };
    let eventos;
    try {
      eventos = await this.agenda.enRango(contexto, periodo.desde, periodo.hasta);
    } catch (error) {
      const codigo = codigoDe(error);
      if (codigo === 'GOOGLE_NO_DISPONIBLE') return { calendario: 'no_disponible', compromisos: [] };
      if (codigo === 'PERMISO_GOOGLE_FALTANTE') return { calendario: 'sin_conectar', compromisos: [] };
      throw error;
    }
    const compromisos = eventos
      .filter((e) => e.estado !== 'cancelado' && Date.parse(e.fin) <= ahora.getTime())
      .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || Date.parse(a.fin) - Date.parse(b.fin))
      .map((e) => {
        const empezo = new Date(e.inicio);
        return {
          id: e.id,
          titulo: e.titulo,
          inicio: e.inicio,
          fin: e.fin,
          zonaHoraria: e.zonaHoraria,
          todoElDia: e.todoElDia,
          duracionMinutos: Math.round((Date.parse(e.fin) - empezo.getTime()) / 60_000),
          // Se agrupa en el día en que empezó, o en el primero del período si empezó antes
          dia: empezo < periodo.desde ? periodo.primerDia : fechaEnZona(empezo, zona),
        };
      });
    return { calendario: 'conectado', compromisos };
  }

  // REQ-CUN02-27 · H-JOR-04 a 06: solo lo ejecutado, por la hora de ejecución
  private async registro(contexto: ContextoSolicitud, periodo: Periodo, zona: string): Promise<AccionDelAsistente[]> {
    const operaciones = await this.prisma.deOrganizacion(contexto.organizacionId).operacion.findMany({
      where: { perfilId: contexto.perfilId, estado: 'ejecutada', ejecutadaEn: { gte: periodo.desde, lt: periodo.hasta } },
      orderBy: [{ ejecutadaEn: 'asc' }, { creadaEn: 'asc' }],
      take: MAXIMO_ACCIONES,
    });
    return operaciones.flatMap((op) => {
      if (!op.ejecutadaEn) return [];
      const vista = VistaConfirmacion.safeParse(op.vistaConfirmacion);
      return [
        {
          id: op.id,
          tipo: op.tipo,
          descripcion: describirAccion(op.tipo, vista.success ? vista.data.accion : null),
          datos: vista.success ? vista.data.datos : [],
          origen: op.origen,
          ejecutadaEn: isoConDesfase(op.ejecutadaEn, zona),
          dia: fechaEnZona(op.ejecutadaEn, zona),
        },
      ];
    });
  }
}
