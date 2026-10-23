import { Module } from '@nestjs/common';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { ReplicaEventosRepositorio } from './replica-eventos.repositorio';
import { SincronizadorCalendario } from './sincronizador-calendario';

// specs/02-agenda/plan.md §2. Réplica del calendario, sincronización y consulta.
@Module({
  imports: [IntegracionesModule],
  providers: [SincronizadorCalendario, ReplicaEventosRepositorio],
  exports: [SincronizadorCalendario, ReplicaEventosRepositorio],
})
export class AgendaModule {}
