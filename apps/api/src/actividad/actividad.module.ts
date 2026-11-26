import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { ActividadController } from './actividad.controller';
import { ConsultaActividadService } from './consulta-actividad.service';

// specs/02-jornada/plan.md §2 · T-069. La sección Actividad: solo lectura, sin tablas propias.
@Module({
  imports: [AgendaModule, IntegracionesModule],
  controllers: [ActividadController],
  providers: [ConsultaActividadService],
})
export class ActividadModule {}
