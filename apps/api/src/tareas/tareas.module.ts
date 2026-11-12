import { Module } from '@nestjs/common';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { ActualizarTarea } from './actualizar-tarea';
import { CompletarTarea } from './completar-tarea';
import { ConsultaTareasService } from './consulta-tareas.service';
import { RegistrarTarea } from './registrar-tarea';
import { TareasController } from './tareas.controller';
import { TareasRepositorio } from './tareas.repositorio';

// specs/08-tareas-personales/plan.md §2 · T-048. Tareas personales: consulta por franja y Operaciones.
@Module({
  // Operaciones se importa aunque sea global: así el módulo también arranca en el proceso trabajador
  imports: [OperacionesModule],
  controllers: [TareasController],
  providers: [TareasRepositorio, ConsultaTareasService, RegistrarTarea, ActualizarTarea, CompletarTarea],
  exports: [TareasRepositorio, ConsultaTareasService],
})
export class TareasModule {}
