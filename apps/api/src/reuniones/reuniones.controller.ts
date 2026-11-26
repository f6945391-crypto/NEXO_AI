import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ConsultaDetalleReunion } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, SobreLoPropio } from '../identidad/decoradores';
import { errorApi, ValidarCon } from '../plataforma/errores';
import { ReunionesService } from './reuniones.service';

// specs/10-reuniones/plan.md §1 · T-132 · REQ-CUN06-07 a 09. Solo lectura: crear una reunión lo hace el
// asistente (R-42) y convocar, mover o cancelar va por Operaciones (AD-09).

@SobreLoPropio()
@Controller('reuniones')
export class ReunionesController {
  constructor(private readonly reuniones: ReunionesService) {}

  @Get()
  lista(@Contexto() contexto: ContextoSolicitud) {
    return this.reuniones.lista(contexto);
  }

  @Get(':id')
  detalle(
    @Contexto() contexto: ContextoSolicitud,
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => errorApi(400, 'SOLICITUD_INVALIDA', 'El identificador de la reunión no es válido.') })) id: string,
    @Query(new ValidarCon(ConsultaDetalleReunion)) consulta: ConsultaDetalleReunion,
  ) {
    return this.reuniones.detalle(contexto, id, {
      ...(consulta.duracionMinutos ? { duracionMinutos: consulta.duracionMinutos } : {}),
      ...(consulta.opcionales ? { opcionales: consulta.opcionales } : {}),
    });
  }
}
