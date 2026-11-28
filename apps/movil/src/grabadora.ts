import { useMemo } from 'react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';

// T-156 · REQ-CAP-27 · plan de 07-agente §15.3. La grabación del dictado en el teléfono, con `expo-audio`
// (incluido en Expo Go). En Expo web, Metro toma `grabadora.web.ts`, que graba con `MediaRecorder` como la web.
// H-CAP-08: el audio no se guarda. `expo-audio` lo escribe en la caché de la app; tras enviarlo se borra.

// Lo grabado, listo para el multipart de `POST /asistente/dictado` (campo `audio`)
export type AudioGrabado = {
  adjuntar(formulario: FormData): void;
  // Lo borra del teléfono, se haya enviado o no
  olvidar(): void;
};

export type Grabadora = {
  // Pide el micrófono y empieza a grabar. Falso si no hay permiso o no se pudo usar el micrófono
  empezar(): Promise<boolean>;
  // Detiene la grabación y devuelve lo grabado, o nulo si no quedó nada
  detener(): Promise<AudioGrabado | null>;
  // Detiene sin devolver nada: la capa se cerró mientras grababa
  descartar(): void;
};

// Al terminar, el audio de la app vuelve a ser solo de reproducción (iOS deja de mostrar el micrófono en uso)
const soltarMicrofono = () => setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);

function borrar(uri: string | null) {
  if (!uri) return;
  try {
    new File(uri).delete();
  } catch {
    // Ya no estaba
  }
}

export function useGrabadora(): Grabadora {
  // AAC en un contenedor MPEG-4 (.m4a), en iOS y en Android: unos 5 MB en cinco minutos, lejos de los 25 MB
  const grabador = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  return useMemo<Grabadora>(
    () => ({
      async empezar() {
        try {
          const permiso = await requestRecordingPermissionsAsync();
          if (!permiso.granted) return false;
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
          await grabador.prepareToRecordAsync();
          grabador.record();
          return true;
        } catch {
          await soltarMicrofono();
          return false;
        }
      },
      async detener() {
        try {
          await grabador.stop();
        } finally {
          await soltarMicrofono();
        }
        const uri = grabador.uri;
        if (!uri) return null;
        return {
          // En React Native el archivo va por su dirección; `fetch` lo lee al enviar
          adjuntar: (formulario) => formulario.append('audio', { uri, name: 'dictado.m4a', type: 'audio/mp4' } as unknown as Blob),
          olvidar: () => borrar(uri),
        };
      },
      descartar() {
        if (!grabador.isRecording) return;
        void grabador
          .stop()
          .then(() => borrar(grabador.uri))
          .catch(() => undefined)
          .finally(() => void soltarMicrofono());
      },
    }),
    [grabador],
  );
}
