import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import {
  ConsultaDisponibilidadEquipo,
} from '@nexoai/contratos';

import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, SobreLoPropio } from '../identidad/decoradores';
import { errorApi, ValidarCon } from '../plataforma/errores';
import { DisponibilidadEquipoService } from './disponibilidad-equipo.service';
import { EquiposService } from './equipos.service';
import { rangoDisponibilidadPorDefecto } from './rango-disponibilidad';

@SobreLoPropio()
@Controller('equipos')
export class EquiposController {
  constructor(
    private readonly equipos: EquiposService,
    private readonly disponibilidad: DisponibilidadEquipoService,
  ) {}

  @Get()
  misEquipos(@Contexto() contexto: ContextoSolicitud) {
    return this.equipos.misEquipos(contexto);
  }

  @Get(':equipoId/integrantes')
  integrantes(
    @Contexto() contexto: ContextoSolicitud,
    @Param(
      'equipoId',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          errorApi(
            400,
            'SOLICITUD_INVALIDA',
            'El identificador del equipo no es valido.',
          ),
      }),
    ) equipoId: string,
  ) {
    return this.equipos.integrantes(contexto, equipoId);
  }

  // CUN-05 - T-105. Validacion mediante contratos compartidos.
  @Get(':equipoId/disponibilidad')
  async consultarDisponibilidad(
    @Contexto() contexto: ContextoSolicitud,
    @Param(
      'equipoId',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          errorApi(
            400,
            'SOLICITUD_INVALIDA',
            'El identificador del equipo no es valido.',
          ),
      }),
    ) equipoId: string,
    @Query(new ValidarCon(ConsultaDisponibilidadEquipo))
    consulta: ConsultaDisponibilidadEquipo,
  ) {
    let desde: Date;
    let hasta: Date;

    if (
      consulta.desde === undefined ||
      consulta.hasta === undefined
    ) {
      const zonaHoraria =
        await this.disponibilidad.obtenerZonaHorariaSolicitante(
          contexto,
          equipoId,
        );

      const rango =
        rangoDisponibilidadPorDefecto(zonaHoraria);

      desde = rango.desde;
      hasta = rango.hasta;
    } else {
      desde = new Date(consulta.desde);
      hasta = new Date(consulta.hasta);
    }

    // REQ-CUN05-17: autorizacion contextual por membresia.
    return this.disponibilidad.consultarEquipo(
      contexto,
      equipoId,
      desde,
      hasta,
      consulta.duracionMinutos,
      consulta.bandaHoraria,
      consulta.participantes,
    );
  }
}
