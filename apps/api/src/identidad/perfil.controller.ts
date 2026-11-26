import { Controller, Get } from '@nestjs/common';
import { Perfil } from '@nexoai/contratos';
import { PrismaService } from '../plataforma/prisma.service';
import type { ContextoSolicitud } from './contexto';
import { Contexto, SobreLoPropio } from './decoradores';
import { PertenenciasRepositorio } from './pertenencias';

// REQ-ACC-10 (lectura), REQ-ACC-12, REQ-ACC-13 · T-006. Solo lectura: el correo, el plan, el rol y la baja
// los decide la organización (R-45). La zona horaria se cambia con una Operación (T-009).
@SobreLoPropio()
@Controller('perfil')
export class PerfilController {
  private readonly pertenencias: PertenenciasRepositorio;

  constructor(private readonly prisma: PrismaService) {
    this.pertenencias = new PertenenciasRepositorio(prisma);
  }

  @Get()
  async consultar(@Contexto() contexto: ContextoSolicitud): Promise<Perfil> {
    const perfil = await this.prisma.deOrganizacion(contexto.organizacionId).perfilUsuario.findUniqueOrThrow({
      where: { id: contexto.perfilId },
      include: { organizacion: { select: { nombre: true } } },
    });
    // H-ACC-07 · T-120: el plan efectivo y los equipos deciden qué ve la interfaz (REQ-CUN05-18)
    const equipos = await this.prisma.deOrganizacion(contexto.organizacionId).miembroDeEquipo.count({ where: { perfilId: contexto.perfilId } });
    return Perfil.parse({
      perfilId: perfil.id,
      correo: perfil.correo,
      rol: perfil.rol,
      plan: perfil.plan,
      planEfectivo: this.pertenencias.planEfectivo(perfil, contexto.empresa ?? null),
      equipos,
      zonaHoraria: perfil.zonaHoraria,
      organizacion: { nombre: perfil.organizacion.nombre },
    });
  }
}
