
import {
  BadRequestException,
  ForbiddenException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';

import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, SobreLoPropio } from '../identidad/decoradores';
import { DisponibilidadEquipoService } from './disponibilidad-equipo.service';
import { EquiposService } from './equipos.service';
import { rangoDisponibilidadPorDefecto } from './rango-disponibilidad';

type CambioConsentimiento = {
  estado: 'concedida' | 'rechazada' | 'revocada';
};

type ConsultaDisponibilidad = {
  desde?: string;
  hasta?: string;
  duracionMinutos?: string;
  bandaHoraria?: string;
};

@SobreLoPropio()
@Controller('equipos')
export class EquiposController {
  constructor(
    private readonly equipos: EquiposService,
    private readonly disponibilidad: DisponibilidadEquipoService,
  ) {}

  // GET /equipos
  // Lista los equipos del usuario autenticado.
  @Get()
  misEquipos(@Contexto() contexto: ContextoSolicitud) {
    return this.equipos.misEquipos(contexto);
  }

  // GET /equipos/:equipoId/integrantes
  // Lista los integrantes y sus consentimientos.
  @Get(':equipoId/integrantes')
  integrantes(
    @Contexto() contexto: ContextoSolicitud,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
  ) {
    return this.equipos.integrantes(contexto, equipoId);
  }

  // GET /equipos/:equipoId/disponibilidad
  // Consulta los intervalos libres comunes del equipo.
  @Get(':equipoId/disponibilidad')
  async consultarDisponibilidad(
    @Contexto() contexto: ContextoSolicitud,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
    @Query() consulta: ConsultaDisponibilidad,
  ) {
    const sinFechas = !consulta.desde && !consulta.hasta;

    if (!sinFechas && (!consulta.desde || !consulta.hasta)) {
      throw new BadRequestException(
        'Debes indicar ambas fechas o ninguna.',
      );
    }

    const formatoFecha =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

    if (
      !sinFechas &&
      (!formatoFecha.test(consulta.desde!) ||
        !formatoFecha.test(consulta.hasta!))
    ) {
      throw new BadRequestException(
        'Las fechas deben usar ISO 8601 con zona horaria.',
      );
    }

    let desde: Date;
    let hasta: Date;

    if (sinFechas) {
      const zonaHoraria =
        await this.disponibilidad.obtenerZonaHorariaSolicitante(
          contexto,
          equipoId,
        );

      const rango = rangoDisponibilidadPorDefecto(zonaHoraria);
      desde = rango.desde;
      hasta = rango.hasta;
    } else {
      desde = new Date(consulta.desde!);
      hasta = new Date(consulta.hasta!);
    }

    if (
      !Number.isFinite(desde.getTime()) ||
      !Number.isFinite(hasta.getTime()) ||
      desde >= hasta
    ) {
      throw new BadRequestException(
        'El rango de fechas no es válido.',
      );
    }

    let duracionMinutos: number | undefined;

    if (consulta.duracionMinutos !== undefined) {
      if (
        !/^\d+$/.test(consulta.duracionMinutos)
      ) {
        throw new BadRequestException(
          'La duración debe ser un número entero positivo.',
        );
      }

      duracionMinutos = Number(consulta.duracionMinutos);

      if (
        !Number.isSafeInteger(duracionMinutos) ||
        duracionMinutos <= 0
      ) {
        throw new BadRequestException(
          'La duración debe ser un número entero positivo.',
        );
      }
    }

    // RN-CAL-01: validar la banda horaria solicitada.
    const bandasPermitidas = [
      'normal',
      'extendida',
      'fueraDeBanda',
    ] as const;

    const bandaHoraria = consulta.bandaHoraria ?? 'normal';

    if (
      !bandasPermitidas.some(
        (banda) => banda === bandaHoraria,
      )
    ) {
      throw new BadRequestException(
        'La banda horaria debe ser normal, extendida o fueraDeBanda.',
      );
    }

    // La banda extendida requiere una solicitud explicita del gerente.
    if (
      bandaHoraria === 'extendida' &&
      contexto.rol !== 'gerente'
    ) {
      throw new ForbiddenException(
        'Solo un gerente puede solicitar la banda horaria extendida.',
      );
    }
    return this.disponibilidad.consultarEquipo(
      contexto,
      equipoId,
      desde,
      hasta,
      duracionMinutos,
    bandaHoraria as "normal" | "extendida" | "fueraDeBanda",
    );
  }

  // PATCH /equipos/:equipoId/mi-consentimiento
  // Solo cambia el consentimiento del usuario autenticado.
  @Patch(':equipoId/mi-consentimiento')
  cambiarConsentimiento(
    @Contexto() contexto: ContextoSolicitud,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
    @Body() cuerpo: CambioConsentimiento,
  ) {
    const estadosPermitidos = [
      'concedida',
      'rechazada',
      'revocada',
    ] as const;

    if (
      !cuerpo ||
      !estadosPermitidos.includes(cuerpo.estado)
    ) {
      throw new BadRequestException(
        'El estado debe ser concedida, rechazada o revocada.',
      );
    }

    return this.equipos.cambiarMiConsentimiento(
      contexto,
      equipoId,
      cuerpo.estado,
    );
  }
}
