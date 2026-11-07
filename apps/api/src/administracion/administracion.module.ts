import { Module } from '@nestjs/common';
import { IdentidadModule } from '../identidad/identidad.module';
import { LecturasAdministracion } from './lecturas';
import { OperacionesEmpresaController } from './operaciones-empresa.controller';

// specs/08-administracion/plan.md §2 y §7.3. Importa solo IdentidadModule y OperacionesModule (global); no
// importa ni la agenda, ni el agente, ni la captura, ni es importado por ellos.
@Module({
  imports: [IdentidadModule],
  controllers: [OperacionesEmpresaController],
  providers: [LecturasAdministracion],
})
export class AdministracionModule {}
