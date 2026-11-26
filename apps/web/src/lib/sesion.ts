import { cookies } from 'next/headers';
import { ErrorApi, IngresoRespuesta, Perfil, PermisoGoogle, SesionActual } from '@nexoai/contratos';

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
  // Lax y no Strict: al volver de Google (otro sitio) el navegador tiene que enviar la sesión. Lax sigue sin
  // enviarla en formularios que llegan desde otros sitios.
  const comunes = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' } as const;
  almacen.set(COOKIE_ACCESO, sesion.tokenAcceso, { ...comunes, expires: new Date(sesion.accesoExpiraEn) });
  almacen.set(COOKIE_RENOVACION, sesion.tokenRenovacion, { ...comunes, maxAge: DURACION_RENOVACION_S });
}

// T-139 · H-ACC-16 · plan §5.9. Margen antes de que caduque el acceso: por debajo de él se renueva, para que no
// caduque entre la lectura de la cookie y la llamada a la API, ni por un reloj algo desfasado.
const MARGEN_RENOVACION_MS = 30_000;

// Lee `exp` del token sin verificar la firma: solo decide si conviene renovar; quien lo valida es la API. Un token
// que no se puede leer se usa tal cual y la API dice si vale.
function caducaPronto(token: string): boolean {
  const carga = token.split('.')[1];
  if (!carga) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof exp === 'number' && exp * 1000 - Date.now() < MARGEN_RENOVACION_MS;
  } catch {
    return false;
  }
}

export type CookiesDeSesion = {
  acceso: string;
  renovacion: string;
  guardar: (sesion: IngresoRespuesta) => Promise<void>;
};

// El token de acceso vigente de una sesión (la de la aplicación o la de la zona de empresa). Si falta o caduca en
// menos de 30 segundos, se renueva con POST /auth/renovar y se guardan las cookies nuevas. Nulo si no hay
// renovación o la API la rechaza: la sesión terminó de verdad. Dos acciones a la vez pueden renovar las dos: la
// API trata la segunda como duplicada (DP-04). Solo desde acciones de servidor o route handlers: escribe cookies.
export async function tokenVigenteDe(nombres: CookiesDeSesion): Promise<string | null> {
  const almacen = await cookies();
  const acceso = almacen.get(nombres.acceso)?.value;
  if (acceso && !caducaPronto(acceso)) return acceso;
  const renovacion = almacen.get(nombres.renovacion)?.value;
  if (!renovacion) return acceso ?? null;
  try {
    const respuesta = await llamarApi('/auth/renovar', { metodo: 'POST', cuerpo: { tokenRenovacion: renovacion } });
    const sesion = IngresoRespuesta.safeParse(respuesta.cuerpo);
    if (respuesta.estado !== 200 || !sesion.success) return null;
    await nombres.guardar(sesion.data);
    return sesion.data.tokenAcceso;
  } catch {
    // Sin respuesta de la API: si el acceso de antes todavía no caducó, que lo intente con él
    return acceso ?? null;
  }
}

// La sesión de la aplicación. Las páginas no la usan: no pueden escribir cookies y redirigen a /sesion/renovar.
export async function tokenVigente(): Promise<string | null> {
  return tokenVigenteDe({ acceso: COOKIE_ACCESO, renovacion: COOKIE_RENOVACION, guardar: guardarTokens });
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

// GET /perfil con el token de acceso de la cookie (T-006). Nulo si no se pudo leer.
export async function obtenerPerfil(): Promise<Perfil | null> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return null;
  const respuesta = await llamarApi('/perfil', { token: acceso });
  const perfil = Perfil.safeParse(respuesta.cuerpo);
  return respuesta.estado === 200 && perfil.success ? perfil.data : null;
}

// GET /integraciones/google/permisos (T-022). Lista vacía si no se pudo leer.
export async function obtenerPermisosGoogle(): Promise<PermisoGoogle[]> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return [];
  const respuesta = await llamarApi('/integraciones/google/permisos', { token: acceso });
  const permisos = PermisoGoogle.array().safeParse(respuesta.cuerpo);
  return respuesta.estado === 200 && permisos.success ? permisos.data : [];
}

// Destino tras entrar o completar el primer ingreso (REQ-ACC-02, H-ACC-05). Desde T-026 el colaborador
// también usa la web: todos van a la aplicación.
export function destinoTrasIngreso(sesion: Pick<IngresoRespuesta, 'primerIngresoPendiente'>): string {
  return sesion.primerIngresoPendiente ? '/primer-ingreso' : '/';
}
