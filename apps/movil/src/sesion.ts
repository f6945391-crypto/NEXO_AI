import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ErrorApi, IngresoRespuesta } from '@nexoai/contratos';

// T-028 · specs/06-acceso/plan.md §5.6. El móvil habla con la API directamente y guarda él mismo los dos
// tokens: en el almacenamiento seguro del teléfono (Keychain, Keystore) y, en Expo web, que solo usan las
// pruebas, en memoria. Al caducar el acceso lo renueva una vez y repite la petición.

// En un teléfono, «localhost» es el propio teléfono: EXPO_PUBLIC_API_URL apunta a la API en tu red.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const CLAVE = 'nexoai.sesion';
let enMemoria: string | null = null;

const almacen = {
  async leer(): Promise<string | null> {
    return Platform.OS === 'web' ? enMemoria : SecureStore.getItemAsync(CLAVE);
  },
  async guardar(valor: string): Promise<void> {
    if (Platform.OS === 'web') enMemoria = valor;
    else await SecureStore.setItemAsync(CLAVE, valor);
  },
  async borrar(): Promise<void> {
    if (Platform.OS === 'web') enMemoria = null;
    else await SecureStore.deleteItemAsync(CLAVE);
  },
};

export type Respuesta = { estado: number; cuerpo: unknown };

export const SIN_CONEXION = 'No pudimos conectar con NexoAI. Revisa tu conexión e inténtalo de nuevo.';

export function mensajeDeError(cuerpo: unknown, porDefecto = 'Algo no salió bien. Inténtalo de nuevo.'): string {
  const error = ErrorApi.safeParse(cuerpo);
  return error.success ? error.data.mensaje : porDefecto;
}

export async function llamar(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; token?: string } = {}): Promise<Respuesta> {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
    },
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status, cuerpo: texto ? (JSON.parse(texto) as unknown) : null };
}

export async function sesionGuardada(): Promise<IngresoRespuesta | null> {
  const texto = await almacen.leer();
  if (!texto) return null;
  const sesion = IngresoRespuesta.safeParse(JSON.parse(texto));
  return sesion.success ? sesion.data : null;
}

export const guardarSesion = (sesion: IngresoRespuesta) => almacen.guardar(JSON.stringify(sesion));

// Una petición con la sesión guardada. Si el acceso caducó (401), se renueva una vez y se repite;
// si la renovación también falla, la sesión se borra y se devuelve nulo: hay que volver a entrar.
export async function conSesion(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<Respuesta | null> {
  const sesion = await sesionGuardada();
  if (!sesion) return null;
  const primera = await llamar(ruta, { ...opciones, token: sesion.tokenAcceso });
  if (primera.estado !== 401) return primera;

  const renovada = await llamar('/auth/renovar', { metodo: 'POST', cuerpo: { tokenRenovacion: sesion.tokenRenovacion } });
  const nueva = IngresoRespuesta.safeParse(renovada.cuerpo);
  if (renovada.estado !== 200 || !nueva.success) {
    await almacen.borrar();
    return null;
  }
  await guardarSesion(nueva.data);
  return llamar(ruta, { ...opciones, token: nueva.data.tokenAcceso });
}

// REQ-ACC-12: lo único que la persona hace con su cuenta. Aunque la API no responda, se sale en el teléfono.
export async function salir(): Promise<void> {
  const sesion = await sesionGuardada();
  if (sesion) {
    try {
      await llamar('/auth/salida', { metodo: 'POST', cuerpo: { tokenRenovacion: sesion.tokenRenovacion } });
    } catch {
      // Sin conexión, la sesión se cierra igual en este teléfono
    }
  }
  await almacen.borrar();
}
