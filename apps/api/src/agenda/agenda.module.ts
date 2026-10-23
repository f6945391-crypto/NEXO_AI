import { Module } from '@nestjs/common';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { AgendaController } from './agenda.controller';
import { CancelarCompromiso } from './cancelar-compromiso';
import { ConsultaAgendaService } from './consulta-agenda.service';
import { ModificarCompromiso } from './modificar-compromiso';
import { RegistrarCompromiso } from './registrar-compromiso';
import { ReplicaEventosRepositorio } from './replica-eventos.repositorio';
import { RevisionHorario } from './revision-horario';
import { SincronizadorCalendario } from './sincronizador-calendario';

// specs/02-agenda/plan.md §2. Réplica del calendario, sincronización, consulta y Operaciones de agenda.
@Module({
  // Operaciones se importa aunque sea global: así el módulo también arranca en el proceso trabajador
  imports: [IntegracionesModule, OperacionesModule],
  controllers: [AgendaController],
  providers: [
    SincronizadorCalendario,
    ReplicaEventosRepositorio,
    ConsultaAgendaService,
    RevisionHorario,
    RegistrarCompromiso,
    ModificarCompromiso,
    CancelarCompromiso,
  ],
  exports: [SincronizadorCalendario, ReplicaEventosRepositorio],
})
export class AgendaModule {}
