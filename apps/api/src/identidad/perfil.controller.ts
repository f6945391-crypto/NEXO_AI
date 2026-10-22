import { Controller, Get } from '@nestjs/common';
import { Perfil } from '@nexoai/contratos';
import { PrismaService } from '../plataforma/prisma.service';
import type { ContextoSolicitud } from './contexto';
import { Contexto, PermitidoPara } from './decoradores';

// REQ-ACC-10 (lectura), REQ-ACC-12, REQ-ACC-13 · T-006. Solo lectura: el correo, el plan, el rol y la baja
// los decide la organización (R-45). La zona horaria se cambia con una Operación (T-009).
@Controller('perfil')
export class PerfilController {
  constructor(private readonly prisma: PrismaService) {}

  @PermitidoPara('colaborador')
  @Get()
  async consultar(@Contexto() contexto: ContextoSolicitud): Promise<Perfil> {
    const perfil = await this.prisma.deOrganizacion(contexto.organizacionId).perfilUsuario.findUniqueOrThrow({
      where: { id: contexto.perfilId },
      include: { organizacion: { select: { nombre: true } } },
    });
    return Perfil.parse({
      perfilId: perfil.id,
      correo: perfil.correo,
      rol: perfil.rol,
      plan: perfil.plan,
      zonaHoraria: perfil.zonaHoraria,
      organizacion: { nombre: perfil.organizacion.nombre },
    });
  }
}
