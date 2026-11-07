import { cookies } from 'next/headers';
import { ConversacionAsistente, OperacionRespuesta } from '@nexoai/contratos';
import { COOKIE_ACCESO, llamarApi } from './sesion';

// T-034 · REQ-CAP-23 · specs/07-agente/plan.md §9. La conversación abierta, leída en el servidor al cargar la
// página: lo que quedó en espera o esperando confirmación se ve al volver, también tras recargar.
export async function obtenerConversacion(): Promise<ConversacionAsistente | null> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return null;
  try {
    const respuesta = await llamarApi('/asistente/conversacion', { token: acceso });
    const conversacion = ConversacionAsistente.safeParse(respuesta.cuerpo);
    return respuesta.estado === 200 && conversacion.success ? conversacion.data : null;
  } catch {
    // Sin la API, la conversación empieza en blanco; la agenda dice por su cuenta que no se pudo leer
    return null;
  }
}

// T-045 · REQ-CAP-25. Lo que está en espera, para verlo fuera de la conversación. La frase pedida y el
// motivo salen de la tarjeta que ya arma la API (`vistaConfirmacion`): el contrato de la Operación no los
// trae aparte, y aquí no se inventa ningún texto.
export type CosaEnEspera = { id: string; pedido: string; motivo: string | null };

export async function obtenerEnEspera(): Promise<CosaEnEspera[]> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return [];
  try {
    const respuesta = await llamarApi('/operaciones?estado=en_espera', { token: acceso });
    const operaciones = OperacionRespuesta.array().safeParse(respuesta.cuerpo);
    if (respuesta.estado !== 200 || !operaciones.success) return [];
    return operaciones.data.map(({ id, vistaConfirmacion: vista }) => ({
      id,
      pedido: vista.datos.find((dato) => dato.etiqueta === 'Lo que pediste')?.valor ?? vista.accion,
      motivo: vista.motivoNoConfirmable,
    }));
  } catch {
    // Sin la API no se muestra la franja: no hay nada que afirmar
    return [];
  }
}
