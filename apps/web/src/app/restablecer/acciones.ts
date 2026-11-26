'use server';

import { ConfirmarRestablecimientoSolicitud, RestablecerSolicitud } from '@nexoai/contratos';
import { codigoDeError, borrarTokens, llamarApi, mensajeDeError } from '../../lib/sesion';
import { borrarTokensEmpresa } from '../(empresa)/administracion/_comun/sesion';

// REQ-ACC-19 · T-123 · specs/06-acceso/plan.md §5.8. Restablecer la contraseña por enlace, sin sesión.

const SIN_CONEXION = 'No pudimos conectar con NexoAI. Revisa tu conexión e inténtalo de nuevo.';
// El mismo texto que la API: un token que ni siquiera tiene la forma de uno no llega a ella
const ENLACE_NO_VALIDO = 'El enlace no es válido o ya venció. Pide otro desde Entrar.';

export type EstadoPedido = { enviado?: boolean; error?: string };

// La API responde 204 exista o no la cuenta: la página dice lo mismo en los dos casos
export async function pedirEnlace(_: EstadoPedido, datos: FormData): Promise<EstadoPedido> {
  const solicitud = RestablecerSolicitud.safeParse({ correo: datos.get('correo') ?? '' });
  if (!solicitud.success) return { error: 'Escribe tu correo.' };
  try {
    const respuesta = await llamarApi('/auth/restablecer', { metodo: 'POST', cuerpo: solicitud.data });
    if (respuesta.estado !== 204) return { error: mensajeDeError(respuesta.cuerpo) };
  } catch {
    return { error: SIN_CONEXION };
  }
  return { enviado: true };
}

export type ResultadoConfirmacion = { listo?: boolean; enlaceNoValido?: string; error?: string };

export async function confirmarRestablecimiento(token: string, nueva: string): Promise<ResultadoConfirmacion> {
  const solicitud = ConfirmarRestablecimientoSolicitud.safeParse({ token, nueva });
  if (!solicitud.success) {
    const corta = solicitud.error.issues.some((i) => i.path[0] === 'nueva');
    return corta ? { error: 'La contraseña nueva necesita al menos 12 caracteres.' } : { enlaceNoValido: ENLACE_NO_VALIDO };
  }
  try {
    const respuesta = await llamarApi('/auth/restablecer/confirmar', { metodo: 'POST', cuerpo: solicitud.data });
    if (respuesta.estado === 400 && codigoDeError(respuesta.cuerpo) === 'ENLACE_NO_VALIDO') return { enlaceNoValido: mensajeDeError(respuesta.cuerpo, ENLACE_NO_VALIDO) };
    if (respuesta.estado !== 204) return { error: mensajeDeError(respuesta.cuerpo, 'No se pudo cambiar la contraseña. Inténtalo de nuevo.') };
  } catch {
    return { error: SIN_CONEXION };
  }
  // La API ya cerró todas las sesiones de la cuenta, de la aplicación y de la zona de empresa: si este navegador
  // guardaba alguna, sus cookies se borran. Las de la zona no llegan a esta ruta, pero se pueden borrar igual
  await borrarTokens();
  await borrarTokensEmpresa();
  return { listo: true };
}
