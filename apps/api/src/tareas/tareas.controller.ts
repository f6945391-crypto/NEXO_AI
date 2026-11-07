import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ConsultaTareas,
  ConsultaTareasDelDia,
  type ControlTarea,
  type RespuestaTareas,
  type TareaPersonal,
  type TareasDelDia,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, SobreLoPropio } from '../identidad/decoradores';
import { ValidarCon } from '../plataforma/errores';
import { ConsultaTareasService } from './consulta-tareas.service';
import { ControlesTareasService } from './controles-tareas.service';
import { noEncontrada } from './tareas.repositorio';

// Un id que no es UUID no puede ser una tarea: se responde igual que si no existiera, o fuera de otro
const idValido = new ParseUUIDPipe({ exceptionFactory: () => noEncontrada() });

// specs/09-tareas-personales/plan.md §5 · T-049. Las tareas de quien pregunta, también las del colaborador
// (REQ-ACC-13), y de nadie más (REQ-CUN03-19). Sin @RequiereGoogle: no necesitan el calendario (REQ-CUN03-20).
// Crear y cambiar no tienen ruta propia: se le piden al asistente (R-42); descartar va por /operaciones, con
// su tarjeta (H-TP-07).
@SobreLoPropio()
@Controller('tareas')
export class TareasController {
  constructor(
    private readonly consulta: ConsultaTareasService,
    private readonly controles: ControlesTareasService,
  ) {}

  @Get()
  listar(@Contexto() contexto: ContextoSolicitud, @Query(new ValidarCon(ConsultaTareas)) consulta: ConsultaTareas): Promise<RespuestaTareas> {
    return this.consulta.listar(contexto, consulta);
  }

  @Get('dia')
  delDia(@Contexto() contexto: ContextoSolicitud, @Query(new ValidarCon(ConsultaTareasDelDia)) consulta: ConsultaTareasDelDia): Promise<TareasDelDia> {
    return this.consulta.delDia(contexto, consulta.fecha);
  }

  @Get(':id')
  obtener(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<TareaPersonal> {
    return this.consulta.porId(contexto, id);
  }

  @Post(':id/hecha')
  @HttpCode(200)
  hecha(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<ControlTarea> {
    return this.controles.darPorHecha(contexto, id);
  }

  @Post(':id/reabrir')
  @HttpCode(200)
  reabrir(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<ControlTarea> {
    return this.controles.reabrir(contexto, id);
  }
}
