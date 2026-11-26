import type { Plan } from '@nexoai/contratos';
import type { PerfilUsuario } from '../generado/prisma/client';
import type { PrismaService } from '../plataforma/prisma.service';
import type { ContextoSolicitud, PertenenciaEmpresa } from './contexto';

// specs/08-administracion/plan.md §4.3 · T-059. Lecturas de la pertenencia de una cuenta a una empresa. Las que
// cruzan organizaciones usan `sinAislar` y cada una está justificada en el plan; ninguna escribe nada.
// Lo demás se lee aislado por la organización de la empresa.

export class PertenenciasRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  // `sinAislar` (plan §4.3, «Ingreso y renovación»): se busca la pertenencia de un perfil antes de saber a qué
  // empresa pertenece. Lee solo la fila vigente de ese perfil, y solo en una organización de empresa.
  async vigenteDe(perfilId: string): Promise<(PertenenciaEmpresa & { administrador: boolean }) | null> {
    const fila = await this.prisma.sinAislar.miembroOrganizacion.findFirst({
      where: { perfilId, estado: 'vigente', organizacion: { tipo: 'empresa' } },
      select: { id: true, organizacionId: true, origen: true, administrador: true },
    });
    return fila ? { organizacionId: fila.organizacionId, miembroId: fila.id, origen: fila.origen, administrador: fila.administrador } : null;
  }

  // Plan efectivo (plan §4.2, H-ADM-06): con una afiliación vigente, el Empresarial; si no, el plan propio.
  planEfectivo(perfil: Pick<PerfilUsuario, 'plan'>, pertenencia: Pick<PertenenciaEmpresa, 'origen'> | null): Plan {
    return pertenencia?.origen === 'afiliacion' ? 'empresarial' : perfil.plan;
  }

  // Si sigue vigente la pertenencia del contexto, leída ahora, no del token
  async sigueVigente(contexto: ContextoSolicitud): Promise<boolean> {
    if (!contexto.empresa) return false;
    const n = await this.prisma.deOrganizacion(contexto.empresa.organizacionId).miembroOrganizacion.count({
      where: { id: contexto.empresa.miembroId, perfilId: contexto.perfilId, estado: 'vigente' },
    });
    return n === 1;
  }

  async esAdministrador(contexto: Pick<ContextoSolicitud, 'perfilId' | 'empresa'>): Promise<boolean> {
    if (!contexto.empresa) return false;
    const n = await this.prisma.deOrganizacion(contexto.empresa.organizacionId).miembroOrganizacion.count({
      where: { perfilId: contexto.perfilId, estado: 'vigente', administrador: true },
    });
    return n > 0;
  }

  async esResponsable(contexto: Pick<ContextoSolicitud, 'perfilId' | 'empresa'>): Promise<boolean> {
    if (!contexto.empresa) return false;
    const n = await this.prisma.deOrganizacion(contexto.empresa.organizacionId).miembroDeEquipo.count({
      where: { perfilId: contexto.perfilId, rolEnEquipo: 'responsable' },
    });
    return n > 0;
  }

  // Plan §7.1: entra en la zona de empresa quien administra la organización o es responsable de un equipo
  async puedeEntrarEnZona(contexto: Pick<ContextoSolicitud, 'perfilId' | 'empresa'>): Promise<boolean> {
    return (await this.esAdministrador(contexto)) || (await this.esResponsable(contexto));
  }

  // REQ-ADM-16: también queda registro de lo rechazado por falta de autoridad, en la empresa si la hay
  async registrarRechazo(contexto: ContextoSolicitud, detalle: Record<string, string>): Promise<void> {
    const organizacionId = contexto.empresa?.organizacionId ?? contexto.organizacionId;
    await this.prisma.deOrganizacion(organizacionId).eventoAuditoria.create({
      data: { organizacionId, perfilId: contexto.perfilId, accion: 'administracion.rechazada', detalle },
    });
  }
}
