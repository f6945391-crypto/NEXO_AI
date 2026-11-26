import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import {
  CambioContrasenaSolicitud,
  ConfirmarRestablecimientoSolicitud,
  IngresoSolicitud,
  PrimerIngresoSolicitud,
  RestablecerSolicitud,
  TokenRenovacionSolicitud,
  type IngresoRespuesta,
  type SesionActual,
} from '@nexoai/contratos';
import { ValidarCon } from '../plataforma/errores';
import { AutenticacionService } from './autenticacion.service';
import type { ContextoSolicitud } from './contexto';
import { Contexto, PermitidoDurantePrimerIngreso, Publico, SobreLoPropio } from './decoradores';
import { LimiteContrasenaGuard, LimiteIngresoGuard, LimiteRestablecerGuard } from './guardas';
import { RestablecimientoService } from './restablecimiento.service';

// REQ-ACC-02, REQ-ACC-03, REQ-ACC-12 · T-004
@SobreLoPropio()
@Controller('auth')
export class AutenticacionController {
  constructor(
    private readonly autenticacion: AutenticacionService,
    private readonly restablecimiento: RestablecimientoService,
  ) {}

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

  // REQ-ACC-19 · T-123 · plan §5.8. Siempre 204, exista o no la cuenta; el límite del ingreso, con su contador
  @Publico()
  @UseGuards(LimiteRestablecerGuard)
  @Post('restablecer')
  @HttpCode(204)
  pedirRestablecimiento(@Body(new ValidarCon(RestablecerSolicitud)) cuerpo: RestablecerSolicitud): Promise<void> {
    return this.restablecimiento.pedir(cuerpo.correo);
  }

  @Publico()
  @UseGuards(LimiteRestablecerGuard)
  @Post('restablecer/confirmar')
  @HttpCode(204)
  confirmarRestablecimiento(@Body(new ValidarCon(ConfirmarRestablecimientoSolicitud)) cuerpo: ConfirmarRestablecimientoSolicitud): Promise<void> {
    return this.restablecimiento.confirmar(cuerpo.token, cuerpo.nueva);
  }

  @Get('sesion')
  sesion(@Contexto() contexto: ContextoSolicitud): Promise<SesionActual> {
    return this.autenticacion.sesionActual(contexto);
  }
}
