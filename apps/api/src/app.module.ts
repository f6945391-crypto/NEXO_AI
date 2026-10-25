import { Module } from '@nestjs/common';
import { AgendaModule } from './agenda/agenda.module';
import { AgenteModule } from './agente/agente.module';
import { IdentidadModule } from './identidad/identidad.module';
import { IntegracionesModule } from './integraciones/integraciones.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { PlataformaModule } from './plataforma/plataforma.module';
import { SaludController } from './salud/salud.controller';

// Un módulo por módulo de dominio (PROPUESTA-TECNICA.md §3.3). Se añaden a medida que llegan sus tareas.
@Module({
  imports: [PlataformaModule, IdentidadModule, OperacionesModule, IntegracionesModule, AgendaModule, AgenteModule],
  controllers: [SaludController],
})
export class AppModule {}
