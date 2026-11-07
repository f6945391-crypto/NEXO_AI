import { Module } from '@nestjs/common';
import { IdentidadModule } from '../identidad/identidad.module';
import { AdministracionController } from './administracion.controller';
import { EJECUTORES_DE_CUENTAS } from './ejecutores-cuentas';
import { LecturasAdministracion } from './lecturas';
import { OperacionesEmpresaController } from './operaciones-empresa.controller';

// specs/08-administracion/plan.md §2 y §7.3. Importa solo IdentidadModule y OperacionesModule (global); no
// importa ni la agenda, ni el agente, ni la captura, ni es importado por ellos.
@Module({
  imports: [IdentidadModule],
  controllers: [AdministracionController, OperacionesEmpresaController],
  providers: [LecturasAdministracion, ...EJECUTORES_DE_CUENTAS],
})
export class AdministracionModule {}
