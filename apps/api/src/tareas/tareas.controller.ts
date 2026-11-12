import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ConsultaTareas, ConsultaTareasEnFechas, type Tarea, type TareasPorFranja } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, SobreLoPropio } from '../identidad/decoradores';
import { OperacionesService } from '../operaciones/operaciones.service';
import { errorApi, ValidarCon } from '../plataforma/errores';
import { ConsultaTareasService } from './consulta-tareas.service';

// Un id que no es UUID no puede ser una tarea: se responde igual que si no existiera.
const idValido = new ParseUUIDPipe({
  exceptionFactory: () => errorApi(404, 'TAREA_NO_ENCONTRADA', 'No existe esa tarea entre las tuyas.'),
});

// specs/08-tareas-personales/plan.md §5 · T-049. Las tareas son de quien pregunta, también del colaborador
// (REQ-ACC-13). No hay ruta para ver las de otra persona (REQ-CUN03-10). Completar y reabrir son controles
// directos (DP-01): crean la Operación y la confirman en el acto, sin tarjeta (decisión 2).
@SobreLoPropio()
@Controller('tareas')
export class TareasController {
  constructor(
    private readonly consulta: ConsultaTareasService,
    private readonly operaciones: OperacionesService,
  ) {}

  // Sin `?estado`, las pendientes en sus tres franjas. Con `?estado=completada,cancelada`, una lista plana.
  @Get()
  listar(
    @Contexto() contexto: ContextoSolicitud,
    @Query(new ValidarCon(ConsultaTareas)) consulta: ConsultaTareas,
  ): Promise<TareasPorFranja | Tarea[]> {
    return consulta.estado ? this.consulta.porEstado(contexto, consulta.estado) : this.consulta.franjas(contexto);
  }

  // Definida antes que `:id`, para que «en-fechas» no se tome por un id
  @Get('en-fechas')
  enFechas(
    @Contexto() contexto: ContextoSolicitud,
    @Query(new ValidarCon(ConsultaTareasEnFechas)) consulta: ConsultaTareasEnFechas,
  ): Promise<Tarea[]> {
    return this.consulta.enFechas(contexto, consulta.desde, consulta.hasta);
  }

  @Get(':id')
  obtener(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<Tarea> {
    return this.consulta.porId(contexto, id);
  }

  @Post(':id/completar')
  @HttpCode(200)
  completar(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<Tarea> {
    return this.cerrar(contexto, id, false);
  }

  @Post(':id/reabrir')
  @HttpCode(200)
  reabrir(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<Tarea> {
    return this.cerrar(contexto, id, true);
  }

  private async cerrar(contexto: ContextoSolicitud, id: string, reabrir: boolean): Promise<Tarea> {
    const propuesta = await this.operaciones.proponer(contexto, { tipo: 'tareas.completar', carga: { tareaId: id, ...(reabrir ? { reabrir } : {}) }, origen: 'control_directo' });
    await this.operaciones.confirmar(contexto, propuesta.id);
    return this.consulta.porId(contexto, id);
  }
}
