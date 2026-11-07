import { Controller, Get, Query } from '@nestjs/common';
import { ConsultaActividad, type Actividad } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, SobreLoPropio } from '../identidad/decoradores';
import { ValidarCon } from '../plataforma/errores';
import { ConsultaActividadService } from './consulta-actividad.service';

// specs/02-jornada/plan.md §2 · T-081. Lo ocurrido de quien pregunta, también del colaborador (REQ-CUN02-34).
// Sin @RequiereGoogle: sin el calendario, la respuesta trae igual el registro del asistente (REQ-CUN02-29).
@SobreLoPropio()
@Controller('actividad')
export class ActividadController {
  constructor(private readonly consulta: ConsultaActividadService) {}

  @Get()
  consultar(
    @Contexto() contexto: ContextoSolicitud,
    @Query(new ValidarCon(ConsultaActividad)) consulta: ConsultaActividad,
  ): Promise<Actividad> {
    return this.consulta.consultar(contexto, consulta);
  }
}
