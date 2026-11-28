import { useEffect, useMemo, useRef } from 'react';
import type { AudioGrabado, Grabadora } from './grabadora';

// T-156 · REQ-CAP-27 · plan de 07-agente §15.3. En Expo web, la grabación del dictado con `MediaRecorder`, como
// la web (§15.2): Opus en WebM, que dan Chrome, Edge y Firefox, y MPEG-4 en Safari. Metro toma este archivo en
// lugar de `grabadora.ts`, así que `expo-audio` no se carga en el navegador.

const TIPOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

const tipoAdmitido = () =>
  typeof MediaRecorder.isTypeSupported === 'function' ? TIPOS.find((t) => MediaRecorder.isTypeSupported(t)) : undefined;

const soltar = (flujo: MediaStream) => flujo.getTracks().forEach((pista) => pista.stop());

export function useGrabadora(): Grabadora {
  const grabador = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  const grabadora = useMemo<Grabadora>(
    () => ({
      async empezar() {
        let flujo: MediaStream | null = null;
        try {
          flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
          const tipo = tipoAdmitido();
          const r = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
          trozos.current = [];
          r.ondataavailable = (e) => {
            if (e.data.size > 0) trozos.current.push(e.data);
          };
          r.start();
          grabador.current = r;
          return true;
        } catch {
          // Sin permiso, sin micrófono o sin `mediaDevices` (una página que no es segura)
          if (flujo) soltar(flujo);
          return false;
        }
      },
      detener() {
        const r = grabador.current;
        grabador.current = null;
        if (!r) return Promise.resolve(null);
        return new Promise<AudioGrabado | null>((resolver) => {
          const terminar = () => {
            soltar(r.stream);
            const tipo = r.mimeType || 'audio/webm';
            const audio = new Blob(trozos.current, { type: tipo });
            trozos.current = [];
            resolver(
              audio.size === 0
                ? null
                : {
                    adjuntar: (formulario) => formulario.append('audio', audio, tipo.includes('mp4') ? 'dictado.m4a' : 'dictado.webm'),
                    // H-CAP-08: el audio solo vive en memoria
                    olvidar: () => undefined,
                  },
            );
          };
          if (r.state === 'inactive') return terminar();
          r.onstop = terminar;
          r.stop();
        });
      },
      descartar() {
        const r = grabador.current;
        grabador.current = null;
        trozos.current = [];
        if (!r) return;
        r.ondataavailable = null;
        if (r.state !== 'inactive') r.stop();
        soltar(r.stream);
      },
    }),
    [],
  );

  // Si la capa desaparece mientras graba, el micrófono se suelta
  useEffect(() => () => grabadora.descartar(), [grabadora]);
  return grabadora;
}
