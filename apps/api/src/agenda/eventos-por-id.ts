import { Injectable } from '@nestjs/common';
import type { Quien } from '../integraciones/calendario/proveedor-calendario';

// T-138 · specs/10-reuniones/plan.md P-REU-10 · REQ-CUN06-13 v2. Eventos que la sincronización lee por su id
// además de la lista, porque Google puede no ponerlos en ella (P-REU-08). Otro módulo registra de dónde salen
// (Reuniones: las agendadas donde la persona es invitada), sin que la agenda dependa de él.
export type EventoPorId = { id: string; zonaHoraria: string };
export type FuenteEventosPorId = (quien: Quien) => Promise<EventoPorId[]>;

@Injectable()
export class EventosPorId {
  private readonly fuentes: FuenteEventosPorId[] = [];

  registrar(fuente: FuenteEventosPorId): void {
    this.fuentes.push(fuente);
  }

  async de(quien: Quien): Promise<EventoPorId[]> {
    const todos = (await Promise.all(this.fuentes.map((f) => f(quien)))).flat();
    return [...new Map(todos.map((e) => [e.id, e])).values()];
  }
}
