import { cookies } from 'next/headers';
import { RespuestaTareas, TareasDelDia } from '@nexoai/contratos';
import { COOKIE_ACCESO, llamarApi, mensajeDeError } from './sesion';

// T-052, T-053 · specs/09-tareas-personales/plan.md §8.1. Las tareas de la persona, leídas en el servidor.
// Los textos de fecha y espera ya llegan armados por la API en la zona del perfil, los mismos que ve el
// móvil (REQ-CUN03-06, R-41): aquí no se formatea nada.

export type Tareas = ({ estado: 'lista' } & RespuestaTareas) | { estado: 'error'; mensaje: string };

export async function obtenerTareas(): Promise<Tareas> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return { estado: 'error', mensaje: 'Tu sesión terminó. Vuelve a entrar.' };
  try {
    const respuesta = await llamarApi('/tareas', { token: acceso });
    const tareas = RespuestaTareas.safeParse(respuesta.cuerpo);
    if (respuesta.estado !== 200 || !tareas.success) return { estado: 'error', mensaje: mensajeDeError(respuesta.cuerpo, 'No pudimos leer tus tareas.') };
    return { estado: 'lista', ...tareas.data };
  } catch {
    return { estado: 'error', mensaje: 'No pudimos conectar con NexoAI para leer tus tareas.' };
  }
}

// REQ-CUN03-13: las tareas del día que muestra Hoy. Sin ellas, Hoy se ve como siempre: no hay nada que afirmar
export async function obtenerTareasDelDia(fecha: string): Promise<TareasDelDia | null> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return null;
  try {
    const respuesta = await llamarApi(`/tareas/dia?fecha=${encodeURIComponent(fecha)}`, { token: acceso });
    const dia = TareasDelDia.safeParse(respuesta.cuerpo);
    return respuesta.estado === 200 && dia.success ? dia.data : null;
  } catch {
    return null;
  }
}
