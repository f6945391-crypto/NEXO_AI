
import { Module } from '@nestjs/common';
import { ActividadModule } from './actividad/actividad.module';
import { AdministracionModule } from './administracion/administracion.module';
import { AgendaModule } from './agenda/agenda.module';
import { AgenteModule } from './agente/agente.module';
import { EquiposModule } from './equipos/equipos.module';
import { IdentidadModule } from './identidad/identidad.module';
import { IntegracionesModule } from './integraciones/integraciones.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { PlataformaModule } from './plataforma/plataforma.module';
import { SaludController } from './salud/salud.controller';
import { TareasModule } from './tareas/tareas.module';

@Module({
  imports: [
    PlataformaModule,
    IdentidadModule,
    OperacionesModule,
    IntegracionesModule,
    AgendaModule,
    AgenteModule,
    ActividadModule,
    AdministracionModule,
    TareasModule,
    EquiposModule,
  ],
  controllers: [SaludController],
})
export class AppModule {}
