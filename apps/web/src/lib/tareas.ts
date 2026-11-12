import { cookies } from 'next/headers';
import { TareasPorFranja } from '@nexoai/contratos';
import { COOKIE_ACCESO, llamarApi, mensajeDeError } from './sesion';

// T-053 · REQ-CUN03-03, 10. Las tareas pendientes de la persona, en sus tres franjas, leídas en el servidor
// al cargar la página. Qué franja es cada una, el orden y cuáles están atrasadas lo decidió la API, no este
// archivo. Las tareas son solo de quien las tiene: la API no tiene ninguna ruta para ver las de otra persona.

export type Tareas = ({ estado: 'lista' } & TareasPorFranja) | { estado: 'error'; mensaje: string };

export async function obtenerTareas(): Promise<Tareas> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return { estado: 'error', mensaje: 'No pudimos leer tus tareas.' };
  try {
    const respuesta = await llamarApi('/tareas', { token: acceso });
    const franjas = TareasPorFranja.safeParse(respuesta.cuerpo);
    if (respuesta.estado !== 200 || !franjas.success) {
      return { estado: 'error', mensaje: mensajeDeError(respuesta.cuerpo, 'No pudimos leer tus tareas.') };
    }
    return { estado: 'lista', ...franjas.data };
  } catch {
    return { estado: 'error', mensaje: 'No pudimos conectar con NexoAI para leer tus tareas.' };
  }
}
