import { Injectable } from '@nestjs/common';
import { TareaPersonal } from '@nexoai/contratos';
import { isoConDesfase } from '../agenda/dominio/tiempo';
import type { Prisma, TareaPersonal as FilaTareaPersonal } from '../generado/prisma/client';
import type { ContextoSolicitud } from '../identidad/contexto';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { textoCierre, textoCuando, textoEspera } from './dominio/formato';
import { franjaDe, vencida, type DatosFranja } from './dominio/franja';

// specs/09-tareas-personales/plan.md §2 · T-048 · REQ-CUN03-19. Lectura y escritura de `tarea`, **siempre
// por perfil** además de por organización: una tarea personal solo la ve su dueño, tampoco el responsable
// de su equipo (P-10). Solo lo usan los ejecutores de Operaciones y la consulta.

export type FilaTarea = FilaTareaPersonal;

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

// La tarea tal como sale de la API, con su franja, «vencida» y sus textos en la zona del perfil (P-02)
export function aContrato(fila: FilaTarea, ahora: Date, zonaPerfil: string): TareaPersonal {
  const datos = datosFranja(fila);
  const pendiente = fila.estado === 'pendiente';
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
    vencida: pendiente && vencida(datos, ahora, zonaPerfil),
    hechaEn: fila.hechaEn ? isoConDesfase(fila.hechaEn, zonaPerfil) : null,
    creadaEn: isoConDesfase(fila.creadaEn, zonaPerfil),
    // Una hecha dice cuándo se hizo; su fecha ya no apremia
    cuando: pendiente ? textoCuando(datos, ahora, zonaPerfil) : null,
    espera: pendiente ? textoEspera(datos, ahora, zonaPerfil) : null,
    cierre: fila.estado === 'hecha' ? textoCierre({ deQuien: fila.deQuien, hechaEn: fila.hechaEn }, zonaPerfil) : null,
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

  async zonaDe(contexto: ContextoSolicitud): Promise<string> {
    const perfil = await this.datos(contexto).perfilUsuario.findFirst({ where: { id: contexto.perfilId } });
    return perfil?.zonaHoraria ?? 'UTC';
  }

  private datos(contexto: ContextoSolicitud) {
    return this.prisma.deOrganizacion(contexto.organizacionId);
  }
}
