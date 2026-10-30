import { cookies } from 'next/headers';
import { ConversacionAsistente } from '@nexoai/contratos';
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
