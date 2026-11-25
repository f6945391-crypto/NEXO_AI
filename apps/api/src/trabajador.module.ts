import { Module } from '@nestjs/common';
import { AgendaModule } from './agenda/agenda.module';
import { TrabajadorCalendario } from './agenda/trabajador-calendario';
import { AgenteModule } from './agente/agente.module';
import { TrabajadorCicloDeVida } from './agente/trabajador-ciclo-de-vida';
import { TrabajadorEnEspera } from './agente/trabajador-en-espera';
import { PlataformaModule } from './plataforma/plataforma.module';
import { ResumenesModule } from './tareas/resumenes.module';
import { TrabajadorResumenes } from './tareas/trabajador-resumenes';

// Segundo punto de entrada (AD-01): los trabajos en segundo plano. Sin HTTP. T-033: también atiende lo
// que quedó en espera mientras el asistente no respondía; T-041, el ciclo de vida de los episodios; T-129,
// el resumen diario de la bitácora de cada tarea.
@Module({
  imports: [PlataformaModule, AgendaModule, AgenteModule, ResumenesModule],
  providers: [TrabajadorCalendario, TrabajadorEnEspera, TrabajadorCicloDeVida, TrabajadorResumenes],
})
export class TrabajadorModule {}
