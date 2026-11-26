import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import {
  CambioContrasenaSolicitud,
  IngresoSolicitud,
  PrimerIngresoSolicitud,
  TokenRenovacionSolicitud,
  type IngresoRespuesta,
  type SesionActual,
} from '@nexoai/contratos';
import { ValidarCon } from '../plataforma/errores';
import { AutenticacionService } from './autenticacion.service';
import type { ContextoSolicitud } from './contexto';
import { Contexto, PermitidoDurantePrimerIngreso, Publico, SobreLoPropio } from './decoradores';
import { LimiteContrasenaGuard, LimiteIngresoGuard } from './guardas';

// REQ-ACC-02, REQ-ACC-03, REQ-ACC-12 · T-004
@SobreLoPropio()
@Controller('auth')
export class AutenticacionController {
  constructor(private readonly autenticacion: AutenticacionService) {}

  @Publico()
  @UseGuards(LimiteIngresoGuard)
  @Post('ingreso')
  @HttpCode(200)
  ingresar(@Body(new ValidarCon(IngresoSolicitud)) cuerpo: IngresoSolicitud): Promise<IngresoRespuesta> {
    return this.autenticacion.ingresar(cuerpo.correo, cuerpo.contrasena);
  }

  @Publico()
  @Post('renovar')
  @HttpCode(200)
  renovar(@Body(new ValidarCon(TokenRenovacionSolicitud)) cuerpo: TokenRenovacionSolicitud): Promise<IngresoRespuesta> {
    return this.autenticacion.renovar(cuerpo.tokenRenovacion);
  }

  // Lo único que el usuario hace con su cuenta (REQ-ACC-12).
  @Publico()
  @Post('salida')
  @HttpCode(204)
  salir(@Body(new ValidarCon(TokenRenovacionSolicitud)) cuerpo: TokenRenovacionSolicitud): Promise<void> {
    return this.autenticacion.salir(cuerpo.tokenRenovacion);
  }

  // REQ-ACC-04, REQ-ACC-05 · T-005
  @PermitidoDurantePrimerIngreso()
  @Post('primer-ingreso')
  @HttpCode(200)
  completarPrimerIngreso(
    @Contexto() contexto: ContextoSolicitud,
    @Body(new ValidarCon(PrimerIngresoSolicitud)) cuerpo: PrimerIngresoSolicitud,
  ): Promise<IngresoRespuesta> {
    return this.autenticacion.completarPrimerIngreso(contexto, cuerpo.contrasenaNueva, cuerpo.zonaHoraria);
  }

  // REQ-ACC-18 · T-121 · plan §5.7. Tokens nuevos para esta sesión; las demás de la cuenta se cierran
  @UseGuards(LimiteContrasenaGuard)
  @Patch('contrasena')
  @HttpCode(200)
  cambiarContrasena(
    @Contexto() contexto: ContextoSolicitud,
    @Body(new ValidarCon(CambioContrasenaSolicitud)) cuerpo: CambioContrasenaSolicitud,
  ): Promise<IngresoRespuesta> {
    return this.autenticacion.cambiarContrasena(contexto, cuerpo.actual, cuerpo.nueva);
  }

  @Get('sesion')
  sesion(@Contexto() contexto: ContextoSolicitud): Promise<SesionActual> {
    return this.autenticacion.sesionActual(contexto);
  }
}
