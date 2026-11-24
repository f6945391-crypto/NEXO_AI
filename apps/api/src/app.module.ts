
import { Module } from '@nestjs/common';
import { AgendaModule } from './agenda/agenda.module';
import { AgenteModule } from './agente/agente.module';
import { EquiposModule } from './equipos/equipos.module';
import { IdentidadModule } from './identidad/identidad.module';
import { IntegracionesModule } from './integraciones/integraciones.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { PlataformaModule } from './plataforma/plataforma.module';
import { SaludController } from './salud/salud.controller';

@Module({
  imports: [
    PlataformaModule,
    IdentidadModule,
    OperacionesModule,
    IntegracionesModule,
    AgendaModule,
    AgenteModule,
    EquiposModule,
  ],
  controllers: [SaludController],
})
export class AppModule {}
