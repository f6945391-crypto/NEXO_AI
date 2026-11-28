import { useCallback, useEffect, useRef, useState } from 'react';
import { DICTADO_SEGUNDOS_MAXIMOS, RespuestaDictado } from '@nexoai/contratos';
import { useGrabadora } from './grabadora';
import { conSesion, mensajeDeError, SIN_CONEXION } from './sesion';

// T-156 · REQ-CAP-27 · plan de 07-agente §15.3 · H-CAP-06 a 08. El dictado en la capa de captura: graba, al
// detener manda el audio a `POST /asistente/dictado` con el token, como el resto del móvil, y entrega el texto
// para ponerlo en el campo. Nunca envía nada al asistente: eso lo decide la persona (H-CAP-06).

export const SIN_MICROFONO = 'No pude usar el micrófono. Revisa el permiso del navegador o del teléfono.';
// Si la API no trae su mensaje: el texto fijo de REQ-CAP-27 para la transcripción que no responde
const DICTADO_NO_DISPONIBLE = 'El dictado no está disponible ahora. Puedes escribirlo.';

// `preparando`: pidiendo el micrófono, antes de grabar
export type FaseDictado = 'inactivo' | 'preparando' | 'grabando' | 'transcribiendo';

// «0:07», «4:59»
export const reloj = (segundos: number) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

// Lo dictado va a continuación de lo escrito, con un espacio si hacía falta
export const juntar = (escrito: string, dictado: string) => (!escrito ? dictado : /\s$/.test(escrito) ? `${escrito}${dictado}` : `${escrito} ${dictado}`);

export function useDictado({ alTexto, alSalir }: { alTexto: (texto: string) => void; alSalir: () => void }) {
  const grabadora = useGrabadora();
  const [fase, setFase] = useState<FaseDictado>('inactivo');
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inicio = useRef(0);
  // Detener una sola vez, lo pulse la persona o llegue a los cinco minutos
  const deteniendo = useRef(false);
  // Sube al descartar: una grabación que arrancó después de cerrar la capa se suelta en seguida
  const intento = useRef(0);

  const hablar = useCallback(async () => {
    if (fase !== 'inactivo') return;
    setError(null);
    setFase('preparando');
    const este = ++intento.current;
    const empezo = await grabadora.empezar();
    if (este !== intento.current) {
      if (empezo) grabadora.descartar();
      return;
    }
    if (!empezo) {
      setFase('inactivo');
      return setError(SIN_MICROFONO);
    }
    inicio.current = Date.now();
    deteniendo.current = false;
    setSegundos(0);
    setFase('grabando');
  }, [fase, grabadora]);

  const detener = useCallback(async () => {
    if (deteniendo.current) return;
    deteniendo.current = true;
    setFase('transcribiendo');
    let audio = null;
    try {
      audio = await grabadora.detener();
      if (!audio) return setError(SIN_MICROFONO);
      const formulario = new FormData();
      audio.adjuntar(formulario);
      const r = await conSesion('/asistente/dictado', { metodo: 'POST', cuerpo: formulario });
      if (!r) return alSalir();
      const respuesta = RespuestaDictado.safeParse(r.cuerpo);
      // 503 `VOZ_NO_DISPONIBLE`, 400 o 413: el mensaje de la API, y el campo no cambia
      if (r.estado !== 200 || !respuesta.success) return setError(mensajeDeError(r.cuerpo, DICTADO_NO_DISPONIBLE));
      if (respuesta.data.texto) alTexto(respuesta.data.texto);
    } catch {
      setError(SIN_CONEXION);
    } finally {
      // H-CAP-08: lo grabado no queda en el teléfono
      audio?.olvidar();
      setFase('inactivo');
    }
  }, [grabadora, alTexto, alSalir]);

  // El tiempo que lleva, y a los cinco minutos se detiene sola y se transcribe igual
  useEffect(() => {
    if (fase !== 'grabando') return;
    const intervalo = setInterval(() => {
      const llevados = Math.min(Math.floor((Date.now() - inicio.current) / 1000), DICTADO_SEGUNDOS_MAXIMOS);
      setSegundos(llevados);
      if (llevados >= DICTADO_SEGUNDOS_MAXIMOS) void detener();
    }, 250);
    return () => clearInterval(intervalo);
  }, [fase, detener]);

  // La capa se cerró mientras grababa: no se transcribe nada
  const descartar = useCallback(() => {
    if (fase !== 'grabando' && fase !== 'preparando') return;
    intento.current++;
    deteniendo.current = true;
    grabadora.descartar();
    setFase('inactivo');
  }, [fase, grabadora]);

  return { fase, segundos, error, hablar, detener, descartar, limpiarError: () => setError(null) };
}
