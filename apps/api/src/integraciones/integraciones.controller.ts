import { Body, Controller, Get, HttpCode, Post, Query, Redirect } from '@nestjs/common';
import {
  EnlaceGoogleRespuesta,
  EnlaceGoogleSolicitud,
  type PermisoGoogle,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, PermitidoPara, Publico } from '../identidad/decoradores';
import { ValidarCon } from '../plataforma/errores';
import { IntegracionesGoogleService } from './integraciones-google.service';

// specs/06-acceso/plan.md §4 · T-007. Ajuste del plan: en lugar de GET /conectar, el cliente pide
// con su sesión un enlace firmado (POST /enlace) y lo abre; un enlace normal no puede llevar el token.
@Controller('integraciones/google')
export class IntegracionesController {
  constructor(private readonly google: IntegracionesGoogleService) {}

  @PermitidoPara('colaborador')
  @Get('permisos')
  permisos(@Contexto() contexto: ContextoSolicitud): Promise<PermisoGoogle[]> {
    return this.google.permisos(contexto);
  }

  @PermitidoPara('colaborador')
  @Post('enlace')
  @HttpCode(200)
  async enlace(
    @Contexto() contexto: ContextoSolicitud,
    @Body(new ValidarCon(EnlaceGoogleSolicitud)) cuerpo: EnlaceGoogleSolicitud,
  ): Promise<EnlaceGoogleRespuesta> {
    return EnlaceGoogleRespuesta.parse({ url: await this.google.crearEnlace(contexto, cuerpo) });
  }

  // Google redirige aquí al navegador; quién es lo dice el estado firmado, no una sesión.
  @Publico()
  @Get('retorno')
  @Redirect()
  async retorno(@Query() consulta: Record<string, string | undefined>) {
    return { url: await this.google.retorno(consulta), statusCode: 302 };
  }
}
