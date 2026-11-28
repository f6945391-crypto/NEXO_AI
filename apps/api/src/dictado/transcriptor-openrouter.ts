import { DictadoNoDisponible, type AudioDictado, type ResultadoDictado, type TranscriptorVoz } from './transcriptor';

// T-154 · plan de 07-agente §15.1. OpenRouter: POST {url}/audio/transcriptions en multipart, al estilo de OpenAI,
// con `file`, `model`, `language` y un `keyterms[]` por término. Responde `{ text, usage: { seconds, cost } }`.
// Sin SDK: `fetch`. La clave nunca aparece en un error.

export interface ConfiguracionOpenRouter {
  url: string;
  modelo: string;
  clave: string;
  // Nombres que debe reconocer: «NexoAI, Vasco, Aixa». Solo algunos modelos los admiten
  terminos: string[];
}

type RespuestaOpenRouter = { text?: unknown; usage?: { seconds?: unknown; cost?: unknown } };

const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export class TranscriptorOpenRouter implements TranscriptorVoz {
  readonly nombre = 'openrouter';

  constructor(
    private readonly configuracion: ConfiguracionOpenRouter,
    private readonly hacerFetch: typeof fetch = fetch,
  ) {}

  async transcribir(audio: AudioDictado, senal: AbortSignal): Promise<ResultadoDictado> {
    const { url, modelo, clave, terminos } = this.configuracion;
    const formulario = new FormData();
    formulario.append('file', new Blob([new Uint8Array(audio.datos)], { type: audio.tipo }), audio.nombre);
    formulario.append('model', modelo);
    formulario.append('language', 'es');
    for (const termino of terminos) formulario.append('keyterms[]', termino);

    let respuesta: Response;
    try {
      respuesta = await this.hacerFetch(`${url.replace(/\/+$/, '')}/audio/transcriptions`, {
        method: 'POST',
        signal: senal,
        headers: { Authorization: `Bearer ${clave}` },
        body: formulario,
      });
    } catch {
      throw new DictadoNoDisponible('no se pudo conectar con el proveedor');
    }
    if (!respuesta.ok) {
      let motivo = '';
      try {
        const error = ((await respuesta.json()) as { error?: { code?: unknown; message?: unknown } }).error;
        motivo = [error?.code, error?.message].filter((v) => typeof v === 'string').join(': ').slice(0, 200);
      } catch {
        // Sin cuerpo legible: basta el estado
      }
      throw new DictadoNoDisponible(`el proveedor respondió ${respuesta.status}${motivo ? `: ${motivo}` : ''}`);
    }
    let cuerpo: RespuestaOpenRouter;
    try {
      cuerpo = (await respuesta.json()) as RespuestaOpenRouter;
    } catch {
      throw new DictadoNoDisponible('la respuesta no es JSON');
    }
    if (typeof cuerpo.text !== 'string') throw new DictadoNoDisponible('la respuesta no trae texto');
    return { texto: cuerpo.text, segundos: numero(cuerpo.usage?.seconds), costoUsd: numero(cuerpo.usage?.cost) };
  }
}
