import { Module } from '@nestjs/common';
import { AgendaModule } from './agenda/agenda.module';
import { TrabajadorCalendario } from './agenda/trabajador-calendario';
import { AgenteModule } from './agente/agente.module';
import { TrabajadorEnEspera } from './agente/trabajador-en-espera';
import { PlataformaModule } from './plataforma/plataforma.module';

// Segundo punto de entrada (AD-01): los trabajos en segundo plano. Sin HTTP. T-033: también atiende lo
// que quedó en espera mientras el asistente no respondía.
@Module({
  imports: [PlataformaModule, AgendaModule, AgenteModule],
  providers: [TrabajadorCalendario, TrabajadorEnEspera],
})
export class TrabajadorModule {}
