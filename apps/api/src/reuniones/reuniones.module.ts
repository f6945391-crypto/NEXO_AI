import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { EquiposModule } from '../equipos/equipos.module';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { PlataformaModule } from '../plataforma/plataforma.module';
import { CancelarReunionOperacion, ConvocarReunionOperacion, MoverReunionOperacion } from './operaciones-reunion';
import { ReunionesController } from './reuniones.controller';
import { ReunionesService } from './reuniones.service';

// specs/10-reuniones/plan.md §1 · T-132 · CUN-06
@Module({
  imports: [PlataformaModule, AgendaModule, EquiposModule, IntegracionesModule, OperacionesModule],
  controllers: [ReunionesController],
  providers: [ReunionesService, ConvocarReunionOperacion, MoverReunionOperacion, CancelarReunionOperacion],
  exports: [ReunionesService],
})
export class ReunionesModule {}
