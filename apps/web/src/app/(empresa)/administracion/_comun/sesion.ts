import { cache } from 'react';
import { cookies } from 'next/headers';
import { SesionEmpresa, type IngresoRespuesta } from '@nexoai/contratos';
import { codigoDeError, llamarApi, type RespuestaApi } from '../../../../lib/sesion';

// T-062 · specs/08-administracion/plan.md §7.1. La sesión de la zona de empresa: sus propias cookies, solo
// enviadas bajo /administracion, distintas de las de la aplicación. Cerrar una no cierra la otra.
export const COOKIE_EMPRESA_ACCESO = 'nexoai_empresa_acceso';
export const COOKIE_EMPRESA_RENOVACION = 'nexoai_empresa_renovacion';
export const RUTA_ZONA = '/administracion';

const DURACION_RENOVACION_S = 30 * 24 * 60 * 60;

// Solo desde acciones de servidor o route handlers
export async function guardarTokensEmpresa(sesion: IngresoRespuesta): Promise<void> {
  const almacen = await cookies();
  const comunes = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: RUTA_ZONA } as const;
  almacen.set(COOKIE_EMPRESA_ACCESO, sesion.tokenAcceso, { ...comunes, expires: new Date(sesion.accesoExpiraEn) });
  almacen.set(COOKIE_EMPRESA_RENOVACION, sesion.tokenRenovacion, { ...comunes, maxAge: DURACION_RENOVACION_S });
}

export async function borrarTokensEmpresa(): Promise<void> {
  const almacen = await cookies();
  almacen.delete({ name: COOKIE_EMPRESA_ACCESO, path: RUTA_ZONA });
  almacen.delete({ name: COOKIE_EMPRESA_RENOVACION, path: RUTA_ZONA });
}

export type EstadoSesionEmpresa = { estado: 'ninguna' } | { estado: 'caducada' } | { estado: 'activa'; sesion: SesionEmpresa };

// Para páginas y el armazón: solo lee. Una vez por petición, aunque la pidan el armazón y la página.
export const obtenerSesionEmpresa = cache(async (): Promise<EstadoSesionEmpresa> => {
  const almacen = await cookies();
  const acceso = almacen.get(COOKIE_EMPRESA_ACCESO)?.value;
  const hayRenovacion = almacen.has(COOKIE_EMPRESA_RENOVACION);
  if (!acceso) return hayRenovacion ? { estado: 'caducada' } : { estado: 'ninguna' };
  try {
    const respuesta = await llamarApi('/administracion/sesion', { token: acceso });
    const sesion = SesionEmpresa.safeParse(respuesta.cuerpo);
    if (respuesta.estado === 200 && sesion.success) return { estado: 'activa', sesion: sesion.data };
  } catch {
    // Sin respuesta de la API, como una sesión que hay que renovar
  }
  return hayRenovacion ? { estado: 'caducada' } : { estado: 'ninguna' };
});

// GET con el token de la zona; nulo si no se pudo leer
export async function leerDeLaZona<T>(ruta: string, esquema: { safeParse(v: unknown): { success: true; data: T } | { success: false } }): Promise<T | null> {
  const acceso = (await cookies()).get(COOKIE_EMPRESA_ACCESO)?.value;
  if (!acceso) return null;
  try {
    const respuesta = await llamarApi(ruta, { token: acceso });
    const leido = esquema.safeParse(respuesta.cuerpo);
    return respuesta.estado === 200 && leido.success ? leido.data : null;
  } catch {
    return null;
  }
}

export { codigoDeError, type RespuestaApi };
