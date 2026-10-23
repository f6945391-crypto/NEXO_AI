import type { Quien } from '../integraciones/calendario/proveedor-calendario';
import { errorApi } from '../plataforma/errores';
import type { ReplicaEventosRepositorio } from './replica-eventos.repositorio';

// T-019 · REQ-CUN01-06 · H-AG-05. Un compromiso solo se cambia o se cancela si es de la persona, lo
// organiza ella y sigue vigente. Si no, se explica por qué antes de proponer nada ni llamar a Google.

export async function eventoQueSePuedeCambiar(replica: ReplicaEventosRepositorio, quien: Quien, id: string) {
  const evento = await replica.porId(quien, id);
  if (!evento) throw errorApi(404, 'EVENTO_NO_ENCONTRADO', 'No existe ese compromiso en tu agenda.');
  if (evento.estado === 'cancelado') throw errorApi(409, 'EVENTO_NO_MODIFICABLE', 'Ese compromiso ya está cancelado.');
  if (!evento.esOrganizador) {
    // H-AG-05: no se declina la invitación por la persona
    throw errorApi(
      403,
      'EVENTO_NO_MODIFICABLE',
      'Ese compromiso lo organiza otra persona: solo quien lo organiza puede cambiarlo o cancelarlo. Si no vas a ir, puedes rechazar la invitación en Google Calendar.',
    );
  }
  return evento;
}

// H-AG-04: lo que la tarjeta dice cuando el compromiso es una vez de una serie.
export const SOLO_ESTA_VEZ = { etiqueta: 'Repetición', valor: 'Solo esta vez: el resto de la serie queda igual' };

// H-AG-11: NexoAI no avisa a los invitados al cambiar o cancelar (T-013 usa sendUpdates=none).
export const SIN_AVISOS = { etiqueta: 'Aviso', valor: 'No se avisa a nadie de este cambio' };
