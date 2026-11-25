
import { Injectable } from '@nestjs/common';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PrismaService } from '../plataforma/prisma.service';
import { errorApi } from '../plataforma/errores';

@Injectable()
export class EquiposService {
  constructor(private readonly prisma: PrismaService) {}

  // Devuelve los equipos a los que pertenece el usuario autenticado.
  async misEquipos(contexto: ContextoSolicitud) {
    const db = this.prisma.deOrganizacion(contexto.organizacionId);

    return db.miembroDeEquipo.findMany({
      where: { perfilId: contexto.perfilId },
      select: {
        equipoId: true,
        rolEnEquipo: true,
        equipo: {
          select: {
            id: true,
            nombre: true,
            creadoEn: true,
          },
        },
      },
    });
  }

  // Verifica que el solicitante pertenece al equipo indicado.
  async verificarMembresia(
    contexto: ContextoSolicitud,
    equipoId: string,
  ) {
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
