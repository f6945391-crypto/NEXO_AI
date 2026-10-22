import { Module } from '@nestjs/common';
import { SaludController } from './salud/salud.controller';

// Un módulo por módulo de dominio (PROPUESTA-TECNICA.md §3.3). Se añaden a medida que llegan sus tareas.
@Module({
  controllers: [SaludController],
})
export class AppModule {}
