
import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { PlataformaModule } from '../plataforma/plataforma.module';
import { DisponibilidadEquipoService } from './disponibilidad-equipo.service';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';

@Module({
  imports: [
    PlataformaModule,
    AgendaModule,
    IntegracionesModule,
  ],
  controllers: [EquiposController],
  providers: [
    EquiposService,
    DisponibilidadEquipoService,
  ],
  exports: [
    EquiposService,
    DisponibilidadEquipoService,
  ],
})
export class EquiposModule {}
