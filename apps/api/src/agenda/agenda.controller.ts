import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ConsultaAgenda, type EventoAgenda } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto } from '../identidad/decoradores';
import { RequiereGoogle } from '../integraciones/requiere-google';
import { errorApi, ValidarCon } from '../plataforma/errores';
import { ConsultaAgendaService } from './consulta-agenda.service';

// Un id que no es UUID no puede ser un evento: se responde igual que si no existiera.
const idValido = new ParseUUIDPipe({
  exceptionFactory: () => errorApi(404, 'EVENTO_NO_ENCONTRADO', 'No existe ese compromiso en tu agenda.'),
});

// specs/02-agenda/plan.md §5 · T-015. Sin el permiso de calendario, @RequiereGoogle responde
// PERMISO_GOOGLE_FALTANTE antes de llegar aquí, sin llamar a Google (REQ-CUN01-08). El colaborador no
// tiene agenda propia en NexoAI: su calendario solo sirve para compartir disponibilidad (REQ-ACC-13, 14).
@Controller('agenda')
export class AgendaController {
  constructor(private readonly consulta: ConsultaAgendaService) {}

  @RequiereGoogle('calendario')
  @Get('eventos')
  listar(
    @Contexto() contexto: ContextoSolicitud,
    @Query(new ValidarCon(ConsultaAgenda)) consulta: ConsultaAgenda,
  ): Promise<EventoAgenda[]> {
    return this.consulta.enRango(contexto, new Date(consulta.desde), new Date(consulta.hasta));
  }

  @RequiereGoogle('calendario')
  @Get('eventos/:id')
  obtener(@Contexto() contexto: ContextoSolicitud, @Param('id', idValido) id: string): Promise<EventoAgenda> {
    return this.consulta.porId(contexto, id);
  }
}
