import { Injectable } from '@nestjs/common';
import {
  EventoAgenda,
  Tarea,
  TurnoAsistente,
  type CierreEpisodio,
  type ConsultaConversacion,
  type DesenlaceEpisodio,
  type EpisodioAsistente,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PrismaService } from '../plataforma/prisma.service';

// specs/07-agente/plan.md §14.4 y §14.6 · T-038 · REQ-AGT-03. La transcripción: lo que la persona vio en
// cada episodio, guardado fuera del punto de control del grafo. No se borra al cerrarse un episodio, y lo
// que lee el modelo no crece con ella (REQ-AGT-01). Se lee siempre por perfil: lo de una persona no lo ve
// nadie más de su organización (P-10).

type Pagina = { episodios: EpisodioAsistente[]; hayAnteriores: boolean; cursor: string | null };

const DESENLACE_POR_TIPO: Readonly<Record<string, DesenlaceEpisodio>> = {
  'agenda.registrar': 'registrado',
  'agenda.modificar': 'movido',
  'agenda.cancelar': 'cancelado',
  // T-051: tareas personales. `tareas.actualizar` se distingue por su carga, en `desenlaceDe`
  'tareas.registrar': 'registrado',
  'tareas.actualizar': 'movido',
  'tareas.completar': 'completado',
};

function desenlaceDe(op: { tipo: string; carga: unknown }): DesenlaceEpisodio {
  const carga = op.carga as { cancelar?: unknown; reabrir?: unknown } | null;
  if (op.tipo === 'tareas.actualizar' && carga?.cancelar === true) return 'cancelado';
  if (op.tipo === 'tareas.completar' && carga?.reabrir === true) return 'movido';
  return DESENLACE_POR_TIPO[op.tipo] ?? 'sin_accion';
}

type OperacionDelEpisodio = { tipo: string; estado: string; motivoEspera?: string | null; carga: unknown; resultado: unknown };

// El separador lo arma el código con la Operación que cerró el episodio: la ejecutada si la hay; si no, una
// tarea guardada en espera (decisión 27); si no, la última descartada. Lo demás (un fallo, una pregunta sin
// respuesta) es «sin acción»
export function cierreDe(cerradaEn: Date | null, operaciones: OperacionDelEpisodio[]): CierreEpisodio | null {
  if (!cerradaEn) return null;
  const op =
    operaciones.find((o) => o.estado === 'ejecutada') ??
    operaciones.find((o) => o.estado === 'en_espera' && o.motivoEspera === 'funcion_por_llegar') ??
    operaciones.find((o) => o.estado === 'descartada');
  if (!op) return { en: cerradaEn.toISOString(), desenlace: 'sin_accion', titulo: null };
  const desenlace = op.estado === 'descartada' ? 'descartado' : op.estado === 'en_espera' ? 'guardado' : desenlaceDe(op);
  const evento = EventoAgenda.safeParse(op.resultado);
  const tarea = Tarea.safeParse(op.resultado);
  const carga = op.carga as { titulo?: unknown; texto?: unknown } | null;
  const deCarga = carga?.titulo ?? carga?.texto;
  const titulo = evento.success ? evento.data.titulo : tarea.success ? tarea.data.titulo : typeof deCarga === 'string' ? deCarga : null;
  return { en: cerradaEn.toISOString(), desenlace, titulo };
}

@Injectable()
export class TranscripcionService {
  constructor(private readonly prisma: PrismaService) {}

  // Después de que el grafo guardó su punto de control. El id lo puso el grafo: un reintento no duplica
  async anotar(contexto: ContextoSolicitud, episodioId: string, turnos: TurnoAsistente[]): Promise<void> {
    if (turnos.length === 0) return;
    await this.datos(contexto).turnoTranscripcion.createMany({
      data: turnos.map((turno) => ({
        id: turno.id,
        organizacionId: contexto.organizacionId,
        perfilId: contexto.perfilId,
        conversacionId: episodioId,
        en: new Date(turno.en),
        tipo: turno.tipo,
        datos: TurnoAsistente.parse(turno) as object,
      })),
      skipDuplicates: true,
    });
  }

  // De lo más reciente hacia atrás, por episodios. Cada página se devuelve del más antiguo al más reciente
  async listar(contexto: ContextoSolicitud, consulta: ConsultaConversacion): Promise<Pagina> {
    const db = this.datos(contexto);
    const desde = consulta.antes ? await db.conversacionAgente.findFirst({ where: { id: consulta.antes, perfilId: contexto.perfilId } }) : null;
    if (consulta.antes && !desde) return { episodios: [], hayAnteriores: false, cursor: null };

    const filas = await db.conversacionAgente.findMany({
      where: {
        perfilId: contexto.perfilId,
        turnos: { some: {} },
        ...(desde ? { OR: [{ abiertaEn: { lt: desde.abiertaEn } }, { abiertaEn: desde.abiertaEn, id: { lt: desde.id } }] } : {}),
      },
      orderBy: [{ abiertaEn: 'desc' }, { id: 'desc' }],
      take: consulta.limite + 1,
    });
    const hayAnteriores = filas.length > consulta.limite;
    const pagina = filas.slice(0, consulta.limite);
    if (pagina.length === 0) return { episodios: [], hayAnteriores: false, cursor: null };

    const ids = pagina.map((e) => e.id);
    const [turnos, operaciones] = await Promise.all([
      db.turnoTranscripcion.findMany({ where: { perfilId: contexto.perfilId, conversacionId: { in: ids } }, orderBy: { secuencia: 'asc' } }),
      db.operacion.findMany({
        where: { perfilId: contexto.perfilId, conversacionId: { in: ids }, estado: { in: ['ejecutada', 'descartada', 'en_espera'] } },
        orderBy: { creadaEn: 'desc' },
      }),
    ]);

    const episodios = pagina
      .map((e) => ({
        id: e.id,
        abiertoEn: e.abiertaEn.toISOString(),
        cierre: e.estado === 'cerrada' ? cierreDe(e.cerradaEn ?? e.ultimaActividadEn, operaciones.filter((o) => o.conversacionId === e.id)) : null,
        turnos: turnos.filter((t) => t.conversacionId === e.id).map((t) => TurnoAsistente.parse(t.datos)),
      }))
      .reverse();
    return { episodios, hayAnteriores, cursor: hayAnteriores ? pagina.at(-1)!.id : null };
  }

  // T-039: el cierre de un episodio recién cerrado, para que la respuesta lo traiga y el cliente pinte el separador
  async cierre(contexto: ContextoSolicitud, episodioId: string): Promise<CierreEpisodio | null> {
    const db = this.datos(contexto);
    const episodio = await db.conversacionAgente.findFirst({ where: { id: episodioId, perfilId: contexto.perfilId } });
    if (!episodio || episodio.estado !== 'cerrada') return null;
    const operaciones = await db.operacion.findMany({
      where: { perfilId: contexto.perfilId, conversacionId: episodioId, estado: { in: ['ejecutada', 'descartada', 'en_espera'] } },
      orderBy: { creadaEn: 'desc' },
    });
    return cierreDe(episodio.cerradaEn ?? episodio.ultimaActividadEn, operaciones);
  }

  private datos(contexto: ContextoSolicitud) {
    return this.prisma.deOrganizacion(contexto.organizacionId);
  }
}
