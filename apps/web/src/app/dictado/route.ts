import { AUDIO_DICTADO_MAXIMO_BYTES, type ErrorApi } from '@nexoai/contratos';
import { tokenVigente, urlApi } from '../../lib/sesion';

// T-155 · REQ-CAP-27, 13 · plan de 07-agente §15.2. El audio del dictado va del navegador a este manejador y de
// aquí a POST /asistente/dictado, con el acceso de la sesión (cookie httpOnly): el navegador nunca ve el token.
// Un manejador y no una acción de servidor, porque las acciones limitan el cuerpo a 1 MB. El audio no se guarda:
// se reenvía tal cual llega y se olvida (H-CAP-08). Responde con el mismo estado y el mismo cuerpo que la API.

// El del proveedor (60 s, plan §15.1), con un margen para la subida
const TIEMPO_LIMITE_MS = 70_000;
const MENSAJE_VOZ_NO_DISPONIBLE = 'El dictado no está disponible ahora. Puedes escribirlo.';

const error = (estado: number, codigo: ErrorApi['codigo'], mensaje: string) =>
  Response.json({ codigo, mensaje } satisfies ErrorApi, { status: estado });

const extension = (tipo: string) => (tipo.includes('mp4') ? 'mp4' : tipo.includes('ogg') ? 'ogg' : 'webm');

export async function POST(solicitud: Request) {
  const acceso = await tokenVigente();
  if (!acceso) return error(401, 'NO_AUTENTICADO', 'Tu sesión terminó. Vuelve a iniciar sesión.');

  let audio: FormDataEntryValue | null;
  try {
    audio = (await solicitud.formData()).get('audio');
  } catch {
    audio = null;
  }
  if (!(audio instanceof Blob) || audio.size === 0) return error(400, 'AUDIO_NO_VALIDO', 'No llegó un audio que se pueda transcribir.');
  // La API también lo comprueba; aquí se evita subirle un audio que va a rechazar
  if (audio.size > AUDIO_DICTADO_MAXIMO_BYTES) return error(413, 'AUDIO_DEMASIADO_GRANDE', 'El audio es demasiado largo. Graba como mucho cinco minutos.');

  const reenvio = new FormData();
  reenvio.append('audio', audio, audio instanceof File && audio.name ? audio.name : `dictado.${extension(audio.type)}`);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${urlApi()}/asistente/dictado`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${acceso}` },
      body: reenvio,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch {
    // Sin respuesta de la API, para la persona es lo mismo que un dictado que no responde (REQ-CAP-27)
    return error(503, 'VOZ_NO_DISPONIBLE', MENSAJE_VOZ_NO_DISPONIBLE);
  }
  return new Response(await respuesta.text(), {
    status: respuesta.status,
    headers: { 'Content-Type': respuesta.headers.get('content-type') ?? 'application/json' },
  });
}
