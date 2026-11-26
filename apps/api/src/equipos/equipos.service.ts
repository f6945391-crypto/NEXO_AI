
import { Injectable } from '@nestjs/common';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PrismaService } from '../plataforma/prisma.service';
import { errorApi } from '../plataforma/errores';

@Injectable()
export class EquiposService {
  constructor(private readonly prisma: PrismaService) {}

  // REQ-CUN05-18 · T-120. Sin plan efectivo Empresarial, o sin ningún equipo, no hay consulta de
  // disponibilidad. El plan del contexto ya es el efectivo (H-ADM-06). No alcanza al consentimiento
  // propio, que va por su Operación (H-EQ-03).
  async comprobarAcceso(contexto: ContextoSolicitud): Promise<void> {
    if (contexto.plan !== 'empresarial') {
      throw errorApi(403, 'SIN_PLAN_EMPRESARIAL', 'La disponibilidad de equipo es del Plan Empresarial.');
    }
    const equipos = await this.prisma.deOrganizacion(contexto.organizacionId).miembroDeEquipo.count({
      where: { perfilId: contexto.perfilId },
    });
    if (equipos === 0) {
      throw errorApi(403, 'SIN_EQUIPO', 'La disponibilidad de equipo requiere pertenecer a un equipo.');
    }
  }

  // Devuelve los equipos a los que pertenece el usuario autenticado, con su responsable y cuántas personas
  // tiene cada uno, responsable incluido (REQ-CUN05-19, H-EQ-01).
  async misEquipos(contexto: ContextoSolicitud) {
    await this.comprobarAcceso(contexto);
    const db = this.prisma.deOrganizacion(contexto.organizacionId);

    const membresias = await db.miembroDeEquipo.findMany({
      where: { perfilId: contexto.perfilId },
      select: {
        equipoId: true,
        rolEnEquipo: true,
        equipo: {
          select: {
            id: true,
            nombre: true,
            creadoEn: true,
            miembros: {
              select: { rolEnEquipo: true, perfil: { select: { correo: true } } },
            },
          },
        },
      },
    });

    return membresias.map(({ equipo: { miembros, ...equipo }, ...membresia }) => {
      const responsable = miembros.find((m) => m.rolEnEquipo === 'responsable');
      return {
        ...membresia,
        equipo,
        responsable: responsable ? { correo: responsable.perfil.correo } : null,
        integrantes: miembros.length,
      };
    });
  }

  // Verifica que el solicitante pertenece al equipo indicado.
  async verificarMembresia(
    contexto: ContextoSolicitud,
    equipoId: string,
  ) {
    await this.comprobarAcceso(contexto);
    const db = this.prisma.deOrganizacion(contexto.organizacionId);

    const membresia = await db.miembroDeEquipo.findFirst({
      where: {
        equipoId,
        perfilId: contexto.perfilId,
      },
    });

    if (!membresia) {
  throw errorApi(
    403,
    'SOLICITUD_INVALIDA',
    'No tienes permiso para consultar este equipo.',
     );
    }

    return membresia;
  }

  // Lista los integrantes de un equipo autorizado.
  // No devuelve datos privados del calendario.
  async integrantes(
    contexto: ContextoSolicitud,
    equipoId: string,
  ) {
    await this.verificarMembresia(contexto, equipoId);

    const db = this.prisma.deOrganizacion(contexto.organizacionId);

    return db.miembroDeEquipo.findMany({
      where: { equipoId },
      select: {
        perfilId: true,
        rolEnEquipo: true,
        estadoConsentimiento: true,
        perfil: {
          select: {
            id: true,
            correo: true,
            zonaHoraria: true,
          },
        },
      },
    });
  }
}
