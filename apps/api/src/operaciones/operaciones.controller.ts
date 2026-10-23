import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ConsultaOperaciones,
  OperacionSolicitud,
  type OperacionRespuesta,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto } from '../identidad/decoradores';
import { errorApi, ValidarCon } from '../plataforma/errores';
import { OperacionesService } from './operaciones.service';

// Un id que no es UUID no puede ser una operación: se responde igual que si no existiera.
const idValido = new ParseUUIDPipe({
  exceptionFactory: () => errorApi(404, 'OPERACION_NO_ENCONTRADA', 'No existe esa operación.'),
});

// specs/02-agenda/plan.md §3.3 · T-012
@Controller('operaciones')
export class OperacionesController {
  constructor(private readonly operaciones: OperacionesService) {}

  @Post()
  proponer(
    @Contexto() contexto: ContextoSolicitud,
    @Body(new ValidarCon(OperacionSolicitud)) cuerpo: OperacionSolicitud,
  ): Promise<OperacionRespuesta> {
    return this.operaciones.proponer(contexto, cuerpo);
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

  @Get()
  listar(
    @Contexto() contexto: ContextoSolicitud,
    @Query(new ValidarCon(ConsultaOperaciones)) consulta: ConsultaOperaciones,
  ): Promise<OperacionRespuesta[]> {
    return this.operaciones.listar(contexto, consulta.estado);
  }
}
