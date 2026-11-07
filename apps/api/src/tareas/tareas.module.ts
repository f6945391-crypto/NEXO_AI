import { Module } from '@nestjs/common';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { EjecutoresTareas } from './ejecutores-tareas';
import { TareasRepositorio } from './tareas.repositorio';

// specs/09-tareas-personales/plan.md §2 · T-048. Dominio de la tarea personal (CUN-03). No depende de la
// agenda ni de Google (REQ-CUN03-20): agenda no lee la tabla `tarea`, y aquí no se lee la réplica.
@Module({
  // Operaciones se importa aunque sea global: así el módulo también arranca en el proceso trabajador
  imports: [OperacionesModule],
  providers: [TareasRepositorio, EjecutoresTareas],
  exports: [TareasRepositorio],
})
export class TareasModule {}
