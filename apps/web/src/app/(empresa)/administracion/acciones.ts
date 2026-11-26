'use server';

import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { IngresoRespuesta, IngresoSolicitud, OperacionRespuesta } from '@nexoai/contratos';
import { llamarApi, mensajeDeError, tokenVigenteDe } from '../../../lib/sesion';
import { COOKIE_EMPRESA_ACCESO, COOKIE_EMPRESA_RENOVACION, borrarTokensEmpresa, guardarTokensEmpresa } from './_comun/sesion';
import { SIN_CONEXION } from './_comun/textos';

// T-062 · specs/08-administracion/plan.md §7. Las acciones de la zona de empresa. La web no decide nada: envía
// lo pedido, pinta la tarjeta tal como llega de la API y confirma o descarta (AD-09, P-03).

export type EstadoFormulario = { error?: string };

// Mismo formulario y mismas reglas que /entrar (REQ-ACC-02, 03). A quien no puede entrar, la API le responde
// como a unas credenciales inválidas.
export async function entrarEnEmpresa(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const solicitud = IngresoSolicitud.safeParse({ correo: datos.get('correo'), contrasena: datos.get('contrasena') });
  if (!solicitud.success) return { error: 'Escribe tu correo y tu contraseña.' };
  try {
    const respuesta = await llamarApi('/administracion/entrar', { metodo: 'POST', cuerpo: solicitud.data });
    if (respuesta.estado !== 200) return { error: mensajeDeError(respuesta.cuerpo) };
    await guardarTokensEmpresa(IngresoRespuesta.parse(respuesta.cuerpo));
  } catch {
    return { error: SIN_CONEXION };
  }
  redirect('/administracion');
}

export async function salirDeEmpresa(): Promise<void> {
  const renovacion = (await cookies()).get(COOKIE_EMPRESA_RENOVACION)?.value;
  if (renovacion) {
    try {
      await llamarApi('/auth/salida', { metodo: 'POST', cuerpo: { tokenRenovacion: renovacion } });
    } catch {
      // Aunque la API no responda, la sesión de la zona se cierra en este navegador
    }
  }
  await borrarTokensEmpresa();
  redirect('/administracion/entrar');
}

// El token de la zona; si el acceso falta o caduca en menos de 30 segundos, se renueva aquí, que sí puede
// escribir cookies (T-139 · H-ACC-16: la misma regla que la aplicación, con las cookies de la zona)
async function tokenDeLaZona(): Promise<string> {
  const acceso = await tokenVigenteDe({ acceso: COOKIE_EMPRESA_ACCESO, renovacion: COOKIE_EMPRESA_RENOVACION, guardar: guardarTokensEmpresa });
  if (acceso) return acceso;
  await borrarTokensEmpresa();
  redirect('/administracion/entrar');
}

export type ResultadoPropuesta = { propuesta?: OperacionRespuesta; error?: string };

export async function proponerEnEmpresa(tipo: string, carga: unknown): Promise<ResultadoPropuesta> {
  if (!tipo.startsWith('administracion.')) return { error: 'Esa acción no existe.' };
  const token = await tokenDeLaZona();
  try {
    const respuesta = await llamarApi('/administracion/operaciones', { metodo: 'POST', cuerpo: { tipo, carga }, token });
    if (respuesta.estado !== 201) return { error: mensajeDeError(respuesta.cuerpo) };
    return { propuesta: OperacionRespuesta.parse(respuesta.cuerpo) };
  } catch {
    return { error: SIN_CONEXION };
  }
}

// La contraseña temporal llega solo en esta respuesta y no se guarda en ningún sitio (REQ-ADM-09, 14)
export async function confirmarEnEmpresa(id: string): Promise<{ operacion?: OperacionRespuesta; error?: string }> {
  const token = await tokenDeLaZona();
  let operacion: OperacionRespuesta;
  try {
    const respuesta = await llamarApi(`/administracion/operaciones/${encodeURIComponent(id)}/confirmar`, { metodo: 'POST', token });
    if (respuesta.estado !== 200) return { error: mensajeDeError(respuesta.cuerpo, 'No se pudo completar. Inténtalo de nuevo.') };
    operacion = OperacionRespuesta.parse(respuesta.cuerpo);
  } catch {
    return { error: SIN_CONEXION };
  }
  // La lista se vuelve a pedir: llega ya con el cambio
  refresh();
  return { operacion };
}

export async function descartarEnEmpresa(id: string): Promise<void> {
  const token = await tokenDeLaZona();
  try {
    await llamarApi(`/administracion/operaciones/${encodeURIComponent(id)}/descartar`, { metodo: 'POST', token });
  } catch {
    // Sin confirmar no cambia nada, aunque la API no responda
  }
}
