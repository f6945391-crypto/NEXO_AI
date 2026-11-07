import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IngresoSolicitud, type IngresoRespuesta } from '@nexoai/contratos';
import { ValidarCon } from '../plataforma/errores';
import { AutenticacionService } from './autenticacion.service';
import { Publico, ZonaEmpresa } from './decoradores';
import { LimiteIngresoGuard } from './guardas';

// T-066 · specs/08-administracion/plan.md §7.1. Entrada propia de la zona de empresa, con las mismas
// credenciales. Renovar y salir son los de siempre (`/auth/renovar`, `/auth/salida`): la sesión guarda su ámbito.
@ZonaEmpresa()
@Controller('administracion')
export class IngresoEmpresaController {
  constructor(private readonly autenticacion: AutenticacionService) {}

  @Publico()
  @UseGuards(LimiteIngresoGuard)
  @Post('entrar')
  @HttpCode(200)
  entrar(@Body(new ValidarCon(IngresoSolicitud)) cuerpo: IngresoSolicitud): Promise<IngresoRespuesta> {
    return this.autenticacion.ingresarEnEmpresa(cuerpo.correo, cuerpo.contrasena);
  }
}
