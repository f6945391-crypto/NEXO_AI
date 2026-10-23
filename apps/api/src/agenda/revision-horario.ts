import { Injectable } from '@nestjs/common';
import type { VistaConfirmacion } from '@nexoai/contratos';
import type { Quien } from '../integraciones/calendario/proveedor-calendario';
import { detectarConflictos, generarAlternativas, type Intervalo } from './dominio/conflictos';
import { isoConDesfase } from './dominio/tiempo';
import { fechaLarga, horario } from './formato';
import { ReplicaEventosRepositorio } from './replica-eventos.repositorio';

// REQ-CUN01-02, REQ-CUN01-05 · T-018, T-019. Lo que la tarjeta de confirmación dice de un horario: si
// choca, con qué, y hasta tres alternativas (DP-02). La usan registrar y modificar, al proponer y otra
// vez al confirmar (H-AG-07). Mira la réplica: quien la llama la sincroniza antes.

export type RevisionDeHorario = Pick<VistaConfirmacion, 'confirmable' | 'motivoNoConfirmable' | 'conflicto'> & {
  // Las alternativas en texto, para los datos de la tarjeta
  datos: VistaConfirmacion['datos'];
};

const DIA_MS = 24 * 3600_000;

@Injectable()
export class RevisionHorario {
  constructor(private readonly replica: ReplicaEventosRepositorio) {}

  // `ignorar`: el evento que se está modificando, que no choca consigo mismo.
  async revisar(quien: Quien, pedido: Intervalo, zonaHoraria: string, ignorar?: string): Promise<RevisionDeHorario> {
    // Lo que hay alrededor: los solapes y, si los hay, los días donde buscar alternativas
    const cercanos = await this.replica.enRango(quien, new Date(pedido.inicio.getTime() - DIA_MS), new Date(pedido.inicio.getTime() + 9 * DIA_MS));
    const choques = detectarConflictos(cercanos, pedido, ignorar);
    if (choques.length === 0) return { confirmable: true, motivoNoConfirmable: null, conflicto: null, datos: [] };

    const alternativas = generarAlternativas(cercanos, pedido, { zonaHoraria, ignorar });
    const causas = choques.map((c) => cercanos.find((e) => e.id === c.id)!);
    const iso = (d: Date) => isoConDesfase(d, zonaHoraria);
    return {
      // REQ-CUN01-05: un solape impide confirmar hasta que se elija otro horario
      confirmable: false,
      motivoNoConfirmable: `Se superpone con ${causas.map((e) => `«${e.titulo}», de ${horario(e.inicio, e.fin, zonaHoraria)}`).join(' y con ')}. ${
        alternativas.length ? 'Elige una de las alternativas u otro horario.' : 'Elige otro horario.'
      }`,
      conflicto: {
        eventos: causas.map((e) => ({ id: e.id, titulo: e.titulo, inicio: iso(e.inicio), fin: iso(e.fin) })),
        alternativas: alternativas.map((a) => ({ inicio: iso(a.inicio), fin: iso(a.fin) })),
      },
      datos: alternativas.length
        ? [{ etiqueta: 'Alternativas', valor: alternativas.map((a) => `${fechaLarga(a.inicio, zonaHoraria)}, ${horario(a.inicio, a.fin, zonaHoraria)}`).join(' · ') }]
        : [],
    };
  }
}
