import { Module } from '@nestjs/common';
import { AgenteModule } from '../agente/agente.module';
import { ResumenesBitacora } from './resumenes-bitacora';

// T-129 · specs/09-tareas-personales/plan.md §13.8. El resumen diario de la bitácora necesita la llamada
// auditada al modelo (P-06, P-07), que vive en el agente; y el agente ya importa Tareas. Por eso va en su
// propio módulo, que solo importa el proceso trabajador (y las pruebas), sin ciclo entre los dos.
@Module({
  imports: [AgenteModule],
  providers: [ResumenesBitacora],
  exports: [ResumenesBitacora],
})
export class ResumenesModule {}
