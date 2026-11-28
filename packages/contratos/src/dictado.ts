import { z } from 'zod';

// 01-captura · T-154 · REQ-CAP-27 · plan de 07-agente §15. El dictado: lo dicho al micrófono, pasado a texto para
// escribirlo en el campo de la conversación. El audio va en multipart (campo `audio`); aquí solo la respuesta.

// El tamaño máximo del audio, el del proveedor de OpenRouter (25 MB)
export const AUDIO_DICTADO_MAXIMO_BYTES = 25 * 1024 * 1024;
// REQ-CAP-09: una nota de voz dura como mucho cinco minutos; el cliente detiene la grabación ahí
export const DICTADO_SEGUNDOS_MAXIMOS = 5 * 60;

export const RespuestaDictado = z.strictObject({ texto: z.string() });
export type RespuestaDictado = z.infer<typeof RespuestaDictado>;
