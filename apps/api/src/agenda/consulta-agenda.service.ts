import { HttpException, Injectable, Logger } from '@nestjs/common';
import { EventoAgenda, type ErrorApi } from '@nexoai/contratos';
import type { Quien } from '../integraciones/calendario/proveedor-calendario';
import { errorApi } from '../plataforma/errores';
import { isoConDesfase } from './dominio/tiempo';
import { ReplicaEventosRepositorio } from './replica-eventos.repositorio';
import { SincronizadorCalendario } from './sincronizador-calendario';

// REQ-CUN01-09, 10, 11 · T-015 · specs/02-agenda/plan.md §4 y §5. La consulta lee la réplica; antes, si
// la última sincronización tiene más de 2 minutos, la actualiza. No depende de ningún proveedor de modelo.

export const MARGEN_SINCRONIZACION_MS = 2 * 60_000;

type Fila = Awaited<ReturnType<ReplicaEventosRepositorio['enRango']>>[number];

const codigoDe = (error: unknown) =>
  error instanceof HttpException ? (error.getResponse() as Partial<ErrorApi>).codigo : undefined;

// Una fila de la réplica tal como sale de la API; también es el resultado de las Operaciones de agenda.
export function aContrato(fila: Fila): EventoAgenda {
  return EventoAgenda.parse({
    id: fila.id,
    titulo: fila.titulo,
    inicio: isoConDesfase(fila.inicio, fila.zonaHoraria),
    fin: isoConDesfase(fila.fin, fila.zonaHoraria),
    zonaHoraria: fila.zonaHoraria,
    todoElDia: fila.todoElDia,
    esOrganizador: fila.esOrganizador,
    serieId: fila.serieId,
    estado: fila.estado,
  });
}

@Injectable()
export class ConsultaAgendaService {
  private readonly registro = new Logger('ConsultaAgenda');

  constructor(
    private readonly replica: ReplicaEventosRepositorio,
    private readonly sincronizador: SincronizadorCalendario,
  ) {}

  async enRango(quien: Quien, desde: Date, hasta: Date): Promise<EventoAgenda[]> {
    await this.actualizarSiHaceFalta(quien);
    return (await this.replica.enRango(quien, desde, hasta)).map(aContrato);
  }

  async porId(quien: Quien, id: string): Promise<EventoAgenda> {
    await this.actualizarSiHaceFalta(quien);
    const fila = await this.replica.porId(quien, id);
    if (!fila) throw errorApi(404, 'EVENTO_NO_ENCONTRADO', 'No existe ese compromiso en tu agenda.');
    return aContrato(fila);
  }

  private async actualizarSiHaceFalta(quien: Quien): Promise<void> {
    const ultima = await this.sincronizador.ultimaSincronizacion(quien);
    if (ultima && Date.now() - ultima.getTime() <= MARGEN_SINCRONIZACION_MS) return;
    try {
      await this.sincronizador.sincronizar(quien);
    } catch (error) {
      // Si Google no responde y ya hay réplica, se muestra lo que hay (lo existente sigue consultable, P-11).
      // La primera vez no hay nada que mostrar, y un permiso retirado se avisa siempre (REQ-ACC-09).
      if (!ultima || codigoDe(error) !== 'GOOGLE_NO_DISPONIBLE') throw error;
      this.registro.warn('Google no responde; se muestra la última copia de la agenda');
    }
  }
}
