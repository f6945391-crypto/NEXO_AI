'use server';

import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { CancelarReunion, ConvocarReunion, DetalleReunion, ListaReuniones, OperacionRespuesta } from '@nexoai/contratos';
import { codigoDeError, COOKIE_ACCESO, llamarApi, mensajeDeError } from '../lib/sesion';

// T-134 · specs/10-reuniones/plan.md §10. Lo que la web le pide a la API sobre las reuniones. Leer es GET
// /reuniones; convocar y cancelar desde el detalle son Operaciones con origen `control_directo` (DP-01, AD-09):
// la web pide la propuesta, pinta su tarjeta tal como llega y la confirma o la descarta.

const SIN_CONEXION = 'No pudimos conectar con NexoAI. Revisa tu conexión e inténtalo de nuevo.';
const SIN_SESION = 'Tu sesión terminó. Vuelve a iniciar sesión.';

export type Resultado<T> = { datos: T; error?: never; codigo?: never } | { datos?: never; error: string; codigo?: string | null };

async function token(): Promise<string | null> {
  return (await cookies()).get(COOKIE_ACCESO)?.value ?? null;
}

export async function obtenerReuniones(): Promise<Resultado<ListaReuniones>> {
  const acceso = await token();
  if (!acceso) return { error: SIN_SESION };
  try {
    const respuesta = await llamarApi('/reuniones', { token: acceso });
    if (respuesta.estado !== 200) return { error: mensajeDeError(respuesta.cuerpo, 'No pudimos leer tus reuniones.'), codigo: codigoDeError(respuesta.cuerpo) };
    const lista = ListaReuniones.safeParse(respuesta.cuerpo);
    return lista.success ? { datos: lista.data } : { error: 'NexoAI no devolvió las reuniones esperadas.' };
  } catch {
    return { error: SIN_CONEXION };
  }
}

// REQ-CUN06-09: cambiar la duración o una marca vuelve a calcular; la API no guarda nada
export async function obtenerDetalleReunion(id: string, cambios: { duracionMinutos?: number; opcionales?: string[] } = {}): Promise<Resultado<DetalleReunion>> {
  const acceso = await token();
  if (!acceso) return { error: SIN_SESION };
  const consulta = new URLSearchParams();
  if (cambios.duracionMinutos) consulta.set('duracionMinutos', String(cambios.duracionMinutos));
  if (cambios.opcionales) consulta.set('opcionales', cambios.opcionales.join(','));
  const texto = consulta.toString();
  try {
    const respuesta = await llamarApi(`/reuniones/${encodeURIComponent(id)}${texto ? `?${texto}` : ''}`, { token: acceso });
    if (respuesta.estado !== 200) return { error: mensajeDeError(respuesta.cuerpo, 'No pudimos abrir la reunión.'), codigo: codigoDeError(respuesta.cuerpo) };
    const detalle = DetalleReunion.safeParse(respuesta.cuerpo);
    return detalle.success ? { datos: detalle.data } : { error: 'NexoAI no devolvió la reunión esperada.' };
  } catch {
    return { error: SIN_CONEXION };
  }
}

async function proponer(tipo: 'reunion.convocar' | 'reunion.cancelar', carga: unknown): Promise<Resultado<OperacionRespuesta>> {
  const acceso = await token();
  if (!acceso) return { error: SIN_SESION };
  try {
    const respuesta = await llamarApi('/operaciones', { metodo: 'POST', cuerpo: { tipo, carga, origen: 'control_directo' }, token: acceso });
    if (respuesta.estado !== 201) return { error: mensajeDeError(respuesta.cuerpo, 'No pudimos preparar la propuesta.'), codigo: codigoDeError(respuesta.cuerpo) };
    const operacion = OperacionRespuesta.safeParse(respuesta.cuerpo);
    return operacion.success ? { datos: operacion.data } : { error: 'NexoAI no devolvió una propuesta válida.' };
  } catch {
    return { error: SIN_CONEXION };
  }
}

// REQ-CUN06-10: «Confirmar horario» en el detalle propone convocar, con los opcionales marcados
export async function proponerConvocar(reunionId: string, inicio: string, opcionales: string[]): Promise<Resultado<OperacionRespuesta>> {
  const carga = ConvocarReunion.safeParse({ reunionId, inicio, opcionales });
  if (!carga.success) return { error: 'El horario elegido no es válido.' };
  return proponer('reunion.convocar', carga.data);
}

// REQ-CUN06-15: «Cancelar reunión», solo de quien la convocó (la API lo comprueba)
export async function proponerCancelarReunion(reunionId: string): Promise<Resultado<OperacionRespuesta>> {
  const carga = CancelarReunion.safeParse({ reunionId });
  if (!carga.success) return { error: 'La reunión no es válida.' };
  return proponer('reunion.cancelar', carga.data);
}

// REQ-CUN06-11: al confirmar, la API vuelve a comprobar. Si alguien se ocupó, devuelve la Operación otra vez como
// propuesta que no se puede confirmar, y la tarjeta lo dice. Si se ejecutó, la página se vuelve a pedir: la agenda
// de quien convoca ya trae el compromiso.
export async function confirmarOperacionReunion(id: string): Promise<Resultado<OperacionRespuesta>> {
  const acceso = await token();
  if (!acceso) return { error: SIN_SESION };
  try {
    const respuesta = await llamarApi(`/operaciones/${encodeURIComponent(id)}/confirmar`, { metodo: 'POST', token: acceso });
    const operacion = OperacionRespuesta.safeParse(respuesta.cuerpo);
    if (respuesta.estado !== 200 || !operacion.success) return { error: mensajeDeError(respuesta.cuerpo, 'No se pudo confirmar. Inténtalo de nuevo.') };
    if (operacion.data.estado === 'ejecutada') refresh();
    else if (operacion.data.estado !== 'propuesta') return { error: operacion.data.error ?? 'No se pudo hacer. Inténtalo de nuevo.' };
    return { datos: operacion.data };
  } catch {
    return { error: SIN_CONEXION };
  }
}
