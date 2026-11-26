import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { OperacionEmpresaSolicitud, type EntradaRegistroEmpresa, type OperacionRespuesta } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, EnEmpresa, SoloAdministrador, ZonaEmpresa } from '../identidad/decoradores';
import { OperacionesService } from '../operaciones/operaciones.service';
import { errorApi, ValidarCon } from '../plataforma/errores';
import { LecturasAdministracion } from './lecturas';

const idValido = new ParseUUIDPipe({
  exceptionFactory: () => errorApi(404, 'OPERACION_NO_ENCONTRADA', 'No existe esa operación.'),
});

// T-060 · specs/08-administracion/plan.md §5.2 y §7.3. Las Operaciones de la zona de empresa: se proponen y se
// confirman aquí, con la sesión de la zona, y se guardan en la organización de la empresa. Cada tipo decide si
// es solo del administrador (`soloAdministrador`); la ruta solo exige pertenecer a la empresa.
@ZonaEmpresa()
@EnEmpresa()
@Controller('administracion/operaciones')
export class OperacionesEmpresaController {
  constructor(
    private readonly operaciones: OperacionesService,
    private readonly lecturas: LecturasAdministracion,
  ) {}

  @Post()
  proponer(
    @Contexto() contexto: ContextoSolicitud,
    @Body(new ValidarCon(OperacionEmpresaSolicitud)) cuerpo: OperacionEmpresaSolicitud,
  ): Promise<OperacionRespuesta> {
    return this.operaciones.proponer(contexto, { ...cuerpo, origen: 'control_directo' });
  }

  @Post(':id/confirmar')
  @HttpCode(200)
  confirmar(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<OperacionRespuesta> {
    return this.operaciones.confirmar(contexto, id);
  }

  @Post(':id/descartar')
  @HttpCode(200)
  descartar(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<OperacionRespuesta> {
    return this.operaciones.descartar(contexto, id);
  }

  // El registro de la empresa (plan §7.2, §9): las acciones de todos sus administradores
  @SoloAdministrador()
  @Get()
  registro(@Contexto() contexto: ContextoSolicitud): Promise<EntradaRegistroEmpresa[]> {
    return this.lecturas.registro(contexto);
  }
}
