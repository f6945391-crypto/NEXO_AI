import { Module } from '@nestjs/common';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { AgendaController } from './agenda.controller';
import { ConsultaAgendaService } from './consulta-agenda.service';
import { ReplicaEventosRepositorio } from './replica-eventos.repositorio';
import { SincronizadorCalendario } from './sincronizador-calendario';

// specs/02-agenda/plan.md §2. Réplica del calendario, sincronización y consulta.
@Module({
  imports: [IntegracionesModule],
  controllers: [AgendaController],
  providers: [SincronizadorCalendario, ReplicaEventosRepositorio, ConsultaAgendaService],
  exports: [SincronizadorCalendario, ReplicaEventosRepositorio],
})
export class AgendaModule {}
