'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ClaveAlcanceGoogle,
  EnlaceGoogleRespuesta,
  IngresoRespuesta,
  IngresoSolicitud,
  PrimerIngresoSolicitud,
} from '@nexoai/contratos';
import {
  borrarTokens,
  COOKIE_ACCESO,
  COOKIE_RENOVACION,
  destinoTrasIngreso,
  guardarTokens,
  llamarApi,
  mensajeDeError,
} from '../lib/sesion';

export type EstadoFormulario = { error?: string };

const SIN_CONEXION = 'No pudimos conectar con NexoAI. Revisa tu conexión e inténtalo de nuevo.';

// REQ-ACC-02, REQ-ACC-03 · T-011
export async function ingresar(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const solicitud = IngresoSolicitud.safeParse({ correo: datos.get('correo'), contrasena: datos.get('contrasena') });
  if (!solicitud.success) return { error: 'Escribe tu correo y tu contraseña.' };

  let destino: string;
  try {
    const respuesta = await llamarApi('/auth/ingreso', { metodo: 'POST', cuerpo: solicitud.data });
    if (respuesta.estado !== 200) return { error: mensajeDeError(respuesta.cuerpo) };
    const sesion = IngresoRespuesta.parse(respuesta.cuerpo);
    await guardarTokens(sesion);
    destino = destinoTrasIngreso(sesion);
  } catch {
    return { error: SIN_CONEXION };
  }
  redirect(destino);
}

// REQ-ACC-04, REQ-ACC-05 · T-011. La zona llega solo si la persona la eligió: el selector empieza vacío.
export async function completarPrimerIngreso(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const zonaHoraria = String(datos.get('zonaHoraria') ?? '');
  if (!zonaHoraria) return { error: 'Elige tu zona horaria para continuar.' };

  const solicitud = PrimerIngresoSolicitud.safeParse({ contrasenaNueva: datos.get('contrasenaNueva'), zonaHoraria });
  if (!solicitud.success) {
    const contrasenaCorta = solicitud.error.issues.some((i) => i.path[0] === 'contrasenaNueva');
    return { error: contrasenaCorta ? 'La contraseña nueva necesita al menos 12 caracteres.' : 'Esa zona horaria no es válida.' };
  }

  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) redirect('/entrar');

  let destino: string;
  try {
    const respuesta = await llamarApi('/auth/primer-ingreso', { metodo: 'POST', cuerpo: solicitud.data, token: acceso });
    if (respuesta.estado !== 200) return { error: mensajeDeError(respuesta.cuerpo) };
    const sesion = IngresoRespuesta.parse(respuesta.cuerpo);
    await guardarTokens(sesion);
    destino = destinoTrasIngreso(sesion);
  } catch {
    return { error: SIN_CONEXION };
  }
  redirect(destino);
}

// REQ-ACC-06 · T-022. Pide a la API un enlace firmado para ese permiso y lleva el navegador a Google.
export async function conectarGoogle(datos: FormData): Promise<void> {
  const alcance = ClaveAlcanceGoogle.safeParse(datos.get('alcance'));
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!alcance.success || !acceso) redirect('/');

  let url = '/?google=error';
  try {
    const respuesta = await llamarApi('/integraciones/google/enlace', {
      metodo: 'POST',
      cuerpo: { alcance: alcance.data, cliente: 'web' },
      token: acceso,
    });
    if (respuesta.estado === 200) url = EnlaceGoogleRespuesta.parse(respuesta.cuerpo).url;
  } catch {
    // Sin respuesta de la API: se vuelve con el aviso de error.
  }
  redirect(url);
}

// REQ-ACC-12: lo único que el usuario hace con su cuenta.
export async function salir(): Promise<void> {
  const renovacion = (await cookies()).get(COOKIE_RENOVACION)?.value;
  if (renovacion) {
    try {
      await llamarApi('/auth/salida', { metodo: 'POST', cuerpo: { tokenRenovacion: renovacion } });
    } catch {
      // Aunque la API no responda, la sesión se cierra en este navegador.
    }
  }
  await borrarTokens();
  redirect('/entrar');
}
