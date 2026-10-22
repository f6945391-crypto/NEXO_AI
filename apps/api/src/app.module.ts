import { Module } from '@nestjs/common';
import { PlataformaModule } from './plataforma/plataforma.module';
import { SaludController } from './salud/salud.controller';

// Un módulo por módulo de dominio (PROPUESTA-TECNICA.md §3.3). Se añaden a medida que llegan sus tareas.
@Module({
  imports: [PlataformaModule],
  controllers: [SaludController],
})
export class AppModule {}
