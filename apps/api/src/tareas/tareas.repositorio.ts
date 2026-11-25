import { Injectable } from '@nestjs/common';
import { TareaPersonal } from '@nexoai/contratos';
import { isoConDesfase } from '../agenda/dominio/tiempo';
import type { AvanceTarea as FilaAvanceTarea, Prisma, TareaPersonal as FilaTareaPersonal } from '../generado/prisma/client';
import type { ContextoSolicitud } from '../identidad/contexto';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { textoAvance, textoCierre, textoCuando, textoEspera, textoResumen } from './dominio/formato';
import { franjaDe, vencida, type DatosFranja } from './dominio/franja';

// specs/09-tareas-personales/plan.md §2 · T-048 · REQ-CUN03-19. Lectura y escritura de `tarea`, **siempre
// por perfil** además de por organización: una tarea personal solo la ve su dueño, tampoco el responsable
// de su equipo (P-10). Solo lo usan los ejecutores de Operaciones y la consulta.

export type FilaTarea = FilaTareaPersonal;
export type FilaAvance = FilaAvanceTarea;

// `date` de Postgres llega como medianoche en UTC
const comoFecha = (valor: Date | null) => (valor ? valor.toISOString().slice(0, 10) : null);
export const aColumnaFecha = (fecha: string | null | undefined) => (fecha ? new Date(`${fecha}T00:00:00Z`) : fecha === null ? null : undefined);

export const noEncontrada = () => errorApi(404, 'TAREA_NO_ENCONTRADA', 'No existe esa tarea entre las tuyas.');
export const noModificable = () => errorApi(409, 'TAREA_NO_MODIFICABLE', 'Esa tarea ya no está pendiente: no se puede cambiar.');

export function datosFranja(fila: FilaTarea): DatosFranja {
  return {
    fecha: comoFecha(fila.fecha),
    horaLimite: fila.horaLimite,
    zonaHoraria: fila.zonaHoraria,
    deQuien: fila.deQuien,
    esperadaDesde: comoFecha(fila.esperadaDesde),
    creadaEn: fila.creadaEn,
  };
}

// La tarea tal como sale de la API, con su franja, «vencida» y sus textos en la zona del perfil (P-02).
// `avances`, de esa tarea y del más reciente al más antiguo (T-125); quien no los tenga a mano pasa ninguno.
export function aContrato(fila: FilaTarea, ahora: Date, zonaPerfil: string, avances: FilaAvance[] = []): TareaPersonal {
  const datos = datosFranja(fila);
  const pendiente = fila.estado === 'pendiente';
  const estaVencida = pendiente && vencida(datos, ahora, zonaPerfil);
  return TareaPersonal.parse({
    id: fila.id,
    texto: fila.texto,
    estado: fila.estado,
    franja: franjaDe(datos),
    fecha: datos.fecha,
    horaLimite: datos.horaLimite,
    zonaHoraria: datos.zonaHoraria,
    deQuien: datos.deQuien,
    esperadaDesde: datos.esperadaDesde,
    vencida: estaVencida,
    hechaEn: fila.hechaEn ? isoConDesfase(fila.hechaEn, zonaPerfil) : null,
    creadaEn: isoConDesfase(fila.creadaEn, zonaPerfil),
    // Una hecha dice cuándo se hizo; su fecha ya no apremia
    cuando: pendiente ? textoCuando(datos, ahora, zonaPerfil) : null,
    espera: pendiente ? textoEspera(datos, ahora, zonaPerfil) : null,
    cierre: fila.estado === 'hecha' ? textoCierre({ deQuien: fila.deQuien, hechaEn: fila.hechaEn }, zonaPerfil) : null,
    contexto: fila.contexto,
    bitacora: avances.map((a) => ({ id: a.id, texto: a.texto, anotadoEn: isoConDesfase(a.anotadoEn, zonaPerfil), cuando: textoAvance(a.anotadoEn, zonaPerfil) })),
    // REQ-CUN03-28 · T-129: el último resumen guardado, tal cual. Leer nunca genera uno
    resumen: fila.resumen && fila.resumenEn ? { texto: fila.resumen, en: isoConDesfase(fila.resumenEn, zonaPerfil), cuando: textoResumen(fila.resumenEn, zonaPerfil) } : null,
    // REQ-CUN03-27 · H-TP-30, 31: solo lo de «Con fecha», y no si ya eligió mantenerla abierta para esa fecha
    avisoVencida: estaVencida && !fila.deQuien && comoFecha(fila.vencimientoAtendido) !== datos.fecha,
  });
}

@Injectable()
export class TareasRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  porId(contexto: ContextoSolicitud, id: string): Promise<FilaTarea | null> {
    return this.datos(contexto).tareaPersonal.findFirst({ where: { id, perfilId: contexto.perfilId } });
  }

  async existente(contexto: ContextoSolicitud, id: string): Promise<FilaTarea> {
    const fila = await this.porId(contexto, id);
    if (!fila) throw noEncontrada();
    return fila;
  }

  porOrigen(contexto: ContextoSolicitud, operacionId: string): Promise<FilaTarea | null> {
    return this.datos(contexto).tareaPersonal.findFirst({ where: { operacionOrigenId: operacionId, perfilId: contexto.perfilId } });
  }

  pendientes(contexto: ContextoSolicitud): Promise<FilaTarea[]> {
    return this.datos(contexto).tareaPersonal.findMany({ where: { perfilId: contexto.perfilId, estado: 'pendiente' } });
  }

  hechasDesde(contexto: ContextoSolicitud, desde: Date): Promise<FilaTarea[]> {
    return this.datos(contexto).tareaPersonal.findMany({
      where: { perfilId: contexto.perfilId, estado: 'hecha', hechaEn: { gte: desde } },
      orderBy: { hechaEn: 'desc' },
    });
  }

  crear(contexto: ContextoSolicitud, datos: Omit<Prisma.TareaPersonalUncheckedCreateInput, 'organizacionId' | 'perfilId'>): Promise<FilaTarea> {
    return this.datos(contexto).tareaPersonal.create({ data: { ...datos, organizacionId: contexto.organizacionId, perfilId: contexto.perfilId } });
  }

  // Solo si sigue en uno de los estados de partida: dos controles a la vez no se pisan
  async cambiar(contexto: ContextoSolicitud, id: string, desde: FilaTarea['estado'][], datos: Prisma.TareaPersonalUncheckedUpdateManyInput): Promise<FilaTarea | null> {
    const r = await this.datos(contexto).tareaPersonal.updateMany({ where: { id, perfilId: contexto.perfilId, estado: { in: desde } }, data: datos });
    return r.count === 1 ? this.porId(contexto, id) : null;
  }

  // T-125 · REQ-CUN03-22: los avances de varias tareas, en una consulta aparte (no un `include`, para que pase
  // por el filtro de organización), del más reciente al más antiguo
  async avancesDe(contexto: ContextoSolicitud, tareaIds: string[]): Promise<Map<string, FilaAvance[]>> {
    const porTarea = new Map<string, FilaAvance[]>();
    if (tareaIds.length === 0) return porTarea;
    const filas = await this.datos(contexto).avanceTarea.findMany({
      where: { tareaId: { in: tareaIds }, perfilId: contexto.perfilId },
      orderBy: [{ anotadoEn: 'desc' }, { id: 'desc' }],
    });
    for (const f of filas) porTarea.set(f.tareaId, [...(porTarea.get(f.tareaId) ?? []), f]);
    return porTarea;
  }

  // La tarea tal como sale de la API, con su bitácora
  async contrato(contexto: ContextoSolicitud, fila: FilaTarea, ahora = new Date(), zona?: string): Promise<TareaPersonal> {
    const avances = await this.avancesDe(contexto, [fila.id]);
    return aContrato(fila, ahora, zona ?? (await this.zonaDe(contexto)), avances.get(fila.id) ?? []);
  }

  avancePorOrigen(contexto: ContextoSolicitud, operacionId: string): Promise<FilaAvance | null> {
    return this.datos(contexto).avanceTarea.findFirst({ where: { operacionOrigenId: operacionId, perfilId: contexto.perfilId } });
  }

  crearAvance(contexto: ContextoSolicitud, datos: { tareaId: string; texto: string; zonaHoraria: string; operacionOrigenId: string }): Promise<FilaAvance> {
    return this.datos(contexto).avanceTarea.create({ data: { ...datos, organizacionId: contexto.organizacionId, perfilId: contexto.perfilId } });
  }

  async zonaDe(contexto: ContextoSolicitud): Promise<string> {
    const perfil = await this.datos(contexto).perfilUsuario.findFirst({ where: { id: contexto.perfilId } });
    return perfil?.zonaHoraria ?? 'UTC';
  }

  private datos(contexto: ContextoSolicitud) {
    return this.prisma.deOrganizacion(contexto.organizacionId);
  }
}
