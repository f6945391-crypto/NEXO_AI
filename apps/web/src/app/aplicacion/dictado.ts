'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DICTADO_SEGUNDOS_MAXIMOS, ErrorApi, RespuestaDictado } from '@nexoai/contratos';

// T-155 · REQ-CAP-27, H-CAP-06 a 08 · plan de 07-agente §15.2. El dictado de la barra de la conversación: graba
// del micrófono con MediaRecorder, y al detener (o a los cinco minutos) manda el audio a /dictado, que lo reenvía
// a la API. El texto que vuelve solo se escribe en el campo: nunca se envía (H-CAP-06). El audio no se guarda en
// ningún sitio (H-CAP-08): vive en memoria hasta que sale hacia la API.

export const MENSAJE_SIN_MICROFONO = 'No pude usar el micrófono. Revisa el permiso del navegador o del teléfono.';
export const MENSAJE_VOZ_NO_DISPONIBLE = 'El dictado no está disponible ahora. Puedes escribirlo.';

// Lo que da cada navegador: Chrome, Edge y Firefox, webm con Opus; Safari, mp4
const TIPOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

export type EstadoDictado = 'inactivo' | 'pidiendo' | 'grabando' | 'transcribiendo';

function tipoDeGrabacion(): string | undefined {
  return TIPOS.find((tipo) => MediaRecorder.isTypeSupported(tipo));
}

const extension = (tipo: string) => (tipo.includes('mp4') ? 'mp4' : tipo.includes('ogg') ? 'ogg' : 'webm');

// «0:07», «4:59»
export function duracion(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

// Lo dictado va a continuación de lo escrito, con un espacio si hacía falta
export function aContinuacion(escrito: string, dictado: string): string {
  if (!escrito) return dictado;
  return /\s$/.test(escrito) ? `${escrito}${dictado}` : `${escrito} ${dictado}`;
}

async function transcribir(audio: Blob): Promise<{ texto: string } | { aviso: string }> {
  const datos = new FormData();
  datos.append('audio', audio, `dictado.${extension(audio.type)}`);
  try {
    const respuesta = await fetch('/dictado', { method: 'POST', body: datos });
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    if (respuesta.ok) {
      const dictado = RespuestaDictado.safeParse(cuerpo);
      return dictado.success ? { texto: dictado.data.texto } : { aviso: MENSAJE_VOZ_NO_DISPONIBLE };
    }
    if (respuesta.status === 503) return { aviso: MENSAJE_VOZ_NO_DISPONIBLE };
    const error = ErrorApi.safeParse(cuerpo);
    return { aviso: error.success ? error.data.mensaje : MENSAJE_VOZ_NO_DISPONIBLE };
  } catch {
    return { aviso: MENSAJE_VOZ_NO_DISPONIBLE };
  }
}

export function useDictado(alTexto: (texto: string) => void) {
  const [estado, setEstado] = useState<EstadoDictado>('inactivo');
  const [segundos, setSegundos] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  const grabador = useRef<MediaRecorder | null>(null);
  const microfono = useRef<MediaStream | null>(null);
  const relojes = useRef<{ tic?: ReturnType<typeof setInterval>; tope?: ReturnType<typeof setTimeout> }>({});
  const montado = useRef(true);
  const alTextoActual = useRef(alTexto);
  useEffect(() => {
    alTextoActual.current = alTexto;
  }, [alTexto]);

  const pararRelojes = useCallback(() => {
    clearInterval(relojes.current.tic);
    clearTimeout(relojes.current.tope);
    relojes.current = {};
  }, []);

  // Al terminar, el micrófono se suelta: el navegador deja de mostrar que graba
  const soltarMicrofono = useCallback(() => {
    microfono.current?.getTracks().forEach((pista) => pista.stop());
    microfono.current = null;
  }, []);

  const detener = useCallback(() => {
    pararRelojes();
    const actual = grabador.current;
    if (actual && actual.state !== 'inactive') {
      setEstado('transcribiendo');
      actual.stop();
    }
  }, [pararRelojes]);

  const empezar = useCallback(async () => {
    setAviso(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setAviso(MENSAJE_SIN_MICROFONO);
      return;
    }
    setEstado('pidiendo');
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Permiso denegado o sin micrófono: el campo no cambia
      if (!montado.current) return;
      setEstado('inactivo');
      setAviso(MENSAJE_SIN_MICROFONO);
      return;
    }
    if (!montado.current) {
      flujo.getTracks().forEach((pista) => pista.stop());
      return;
    }
    microfono.current = flujo;

    const tipo = tipoDeGrabacion();
    let nuevo: MediaRecorder;
    try {
      nuevo = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
    } catch {
      soltarMicrofono();
      setEstado('inactivo');
      setAviso(MENSAJE_SIN_MICROFONO);
      return;
    }
    const partes: Blob[] = [];
    nuevo.ondataavailable = (evento) => {
      if (evento.data.size > 0) partes.push(evento.data);
    };
    nuevo.onerror = () => {
      pararRelojes();
      soltarMicrofono();
      grabador.current = null;
      if (!montado.current) return;
      setEstado('inactivo');
      setAviso(MENSAJE_SIN_MICROFONO);
    };
    nuevo.onstop = async () => {
      soltarMicrofono();
      grabador.current = null;
      if (!montado.current) return;
      const resultado = await transcribir(new Blob(partes, { type: nuevo.mimeType || tipo || 'audio/webm' }));
      if (!montado.current) return;
      setEstado('inactivo');
      if ('aviso' in resultado) setAviso(resultado.aviso);
      else if (resultado.texto) alTextoActual.current(resultado.texto);
    };

    grabador.current = nuevo;
    const inicio = Date.now();
    setSegundos(0);
    setEstado('grabando');
    nuevo.start();
    relojes.current.tic = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 250);
    // REQ-CAP-27: a los cinco minutos se detiene sola y se transcribe igual
    relojes.current.tope = setTimeout(detener, DICTADO_SEGUNDOS_MAXIMOS * 1000);
  }, [detener, pararRelojes, soltarMicrofono]);

  // Si la conversación se desmonta a mitad, se suelta todo y no se transcribe nada
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      pararRelojes();
      const actual = grabador.current;
      if (actual) {
        actual.onstop = null;
        if (actual.state !== 'inactive') actual.stop();
      }
      grabador.current = null;
      soltarMicrofono();
    };
  }, [pararRelojes, soltarMicrofono]);

  const alternar = useCallback(() => {
    if (estado === 'grabando') detener();
    else if (estado === 'inactivo') void empezar();
  }, [estado, detener, empezar]);

  return { estado, segundos, aviso, alternar, quitarAviso: () => setAviso(null) };
}
