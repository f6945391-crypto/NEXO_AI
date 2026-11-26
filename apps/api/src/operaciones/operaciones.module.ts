import { Global, Module } from '@nestjs/common';
import { OperacionesController } from './operaciones.controller';
import { OperacionesService } from './operaciones.service';
import { RegistroOperaciones } from './registro';

// Transversal (AD-09). Global para que cada módulo de dominio registre sus ejecutores.
@Global()
@Module({
  controllers: [OperacionesController],
  providers: [OperacionesService, RegistroOperaciones],
  exports: [OperacionesService, RegistroOperaciones],
})
export class OperacionesModule {}
