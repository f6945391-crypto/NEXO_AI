import { Module } from '@nestjs/common';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { ConsultaTareasService } from './consulta-tareas.service';
import { ControlesTareasService } from './controles-tareas.service';
import { EjecutoresTareas } from './ejecutores-tareas';
import { TareasController } from './tareas.controller';
import { TareasRepositorio } from './tareas.repositorio';

// specs/09-tareas-personales/plan.md §2 · T-048. Dominio de la tarea personal (CUN-03). No depende de la
// agenda ni de Google (REQ-CUN03-20): agenda no lee la tabla `tarea`, y aquí no se lee la réplica.
@Module({
  // Operaciones se importa aunque sea global: así el módulo también arranca en el proceso trabajador
  imports: [OperacionesModule],
  controllers: [TareasController],
  providers: [TareasRepositorio, EjecutoresTareas, ConsultaTareasService, ControlesTareasService],
  exports: [ConsultaTareasService],
})
export class TareasModule {}
