import { Module } from '@nestjs/common';
import { AgendaModule } from './agenda/agenda.module';
import { TrabajadorCalendario } from './agenda/trabajador-calendario';
import { PlataformaModule } from './plataforma/plataforma.module';

// Segundo punto de entrada (AD-01): los trabajos en segundo plano. Sin HTTP.
@Module({
  imports: [PlataformaModule, AgendaModule],
  providers: [TrabajadorCalendario],
})
export class TrabajadorModule {}
