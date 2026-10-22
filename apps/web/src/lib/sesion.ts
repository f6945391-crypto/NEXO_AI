import { cookies } from 'next/headers';
import { ErrorApi, SesionActual, type IngresoRespuesta } from '@nexoai/contratos';

// Intermediario de sesión (specs/06-acceso/plan.md §5.1, ajuste de T-004). Next.js guarda los dos tokens
// en cookies httpOnly y es el único que habla con la API: el navegador nunca ve el token de renovación.

export const COOKIE_ACCESO = 'nexoai_acceso';
export const COOKIE_RENOVACION = 'nexoai_renovacion';

const DURACION_RENOVACION_S = 30 * 24 * 60 * 60;

export function urlApi(): string {
  return process.env.API_URL ?? 'http://localhost:3000';
}

export type RespuestaApi = { estado: number; cuerpo: unknown };

export async function llamarApi(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; token?: string } = {}): Promise<RespuestaApi> {
  const respuesta = await fetch(`${urlApi()}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
    },
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    cache: 'no-store',
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status, cuerpo: texto ? (JSON.parse(texto) as unknown) : null };
}

// Mensaje para la persona: el de la API si viene con la forma ErrorApi, o uno genérico.
export function mensajeDeError(cuerpo: unknown, porDefecto = 'Algo no salió bien. Inténtalo de nuevo.'): string {
  const error = ErrorApi.safeParse(cuerpo);
  return error.success ? error.data.mensaje : porDefecto;
}

export function codigoDeError(cuerpo: unknown): string | null {
  const error = ErrorApi.safeParse(cuerpo);
  return error.success ? error.data.codigo : null;
}

// Solo desde acciones de servidor o route handlers: Next.js no permite escribir cookies al renderizar.
export async function guardarTokens(sesion: IngresoRespuesta): Promise<void> {
  const almacen = await cookies();
  const comunes = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' } as const;
  almacen.set(COOKIE_ACCESO, sesion.tokenAcceso, { ...comunes, expires: new Date(sesion.accesoExpiraEn) });
  almacen.set(COOKIE_RENOVACION, sesion.tokenRenovacion, { ...comunes, maxAge: DURACION_RENOVACION_S });
}

export async function borrarTokens(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE_ACCESO);
  almacen.delete(COOKIE_RENOVACION);
}

export type EstadoSesion =
  | { estado: 'ninguna' }
  | { estado: 'caducada' }
  | { estado: 'pendiente' }
  | { estado: 'activa'; sesion: SesionActual };

// Para páginas: solo lee. Si el acceso caducó y hay renovación, la página redirige a /sesion/renovar.
export async function obtenerSesion(): Promise<EstadoSesion> {
  const almacen = await cookies();
  const acceso = almacen.get(COOKIE_ACCESO)?.value;
  const hayRenovacion = almacen.has(COOKIE_RENOVACION);
  if (!acceso) return hayRenovacion ? { estado: 'caducada' } : { estado: 'ninguna' };

  const respuesta = await llamarApi('/auth/sesion', { token: acceso });
  if (respuesta.estado === 200) return { estado: 'activa', sesion: SesionActual.parse(respuesta.cuerpo) };
  if (codigoDeError(respuesta.cuerpo) === 'PRIMER_INGRESO_PENDIENTE') return { estado: 'pendiente' };
  return hayRenovacion ? { estado: 'caducada' } : { estado: 'ninguna' };
}

// Destino tras entrar o completar el primer ingreso, según el rol (REQ-ACC-02, H-ACC-05, H-ACC-06).
export function destinoTrasIngreso(sesion: Pick<IngresoRespuesta, 'rol' | 'primerIngresoPendiente'>): string {
  if (sesion.primerIngresoPendiente) return '/primer-ingreso';
  if (sesion.rol === 'colaborador') return '/solo-movil';
  return '/';
}
