import {
  FalloDelModelo,
  ModeloNoDisponible,
  type LlamadaHerramienta,
  type MensajeModelo,
  type PeticionModelo,
  type ProveedorModelo,
  type RespuestaModelo,
} from './proveedor-modelo';

// T-036 · plan §3.1 · H-AGT-13. Un proveedor con la API de chat de OpenAI: Groq (elegido para probar el 29 de
// octubre de 2026), Cerebras, OpenRouter u Ollama. Sin SDK: `fetch` a `{url}/chat/completions`. La clave
// nunca se escribe en un registro ni en un mensaje de error.

export interface ConfiguracionCompatibleOpenAI {
  url: string;
  modelo: string;
  clave: string | null;
}

// Lo que se envía y se recibe, solo lo que usamos
type MensajeOpenAI =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; tool_call_id: string; content: string };

type RespuestaOpenAI = {
  model?: string;
  choices?: { message?: { content?: string | null; tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[] } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function aMensajes(sistema: string, mensajes: MensajeModelo[]): MensajeOpenAI[] {
  return [
    { role: 'system', content: sistema },
    ...mensajes.map((m): MensajeOpenAI => {
      if (m.rol === 'persona') return { role: 'user', content: m.texto };
      if (m.rol === 'herramienta') return { role: 'tool', tool_call_id: m.llamadaId, content: m.contenido };
      return {
        role: 'assistant',
        content: m.texto,
        ...(m.llamadas.length > 0
          ? { tool_calls: m.llamadas.map((l) => ({ id: l.id, type: 'function' as const, function: { name: l.nombre, arguments: JSON.stringify(l.argumentos ?? {}) } })) }
          : {}),
      };
    }),
  ];
}

// Sin respuesta, saturado (429, el límite del nivel gratuito) o caído, o con la clave rechazada: no disponible (H-AGT-03)
const NO_DISPONIBLE = new Set([401, 403, 408, 429]);

export class ModeloCompatibleOpenAI implements ProveedorModelo {
  readonly nombre = 'compatible-openai';

  constructor(
    private readonly configuracion: ConfiguracionCompatibleOpenAI,
    private readonly hacerFetch: typeof fetch = fetch,
  ) {}

  async responder(peticion: PeticionModelo, senal: AbortSignal): Promise<RespuestaModelo> {
    if (senal.aborted) throw new ModeloNoDisponible('la petición se canceló');
    const { url, modelo, clave } = this.configuracion;

    let respuesta: Response;
    try {
      respuesta = await this.hacerFetch(`${url.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        signal: senal,
        headers: { 'Content-Type': 'application/json', ...(clave ? { Authorization: `Bearer ${clave}` } : {}) },
        body: JSON.stringify({
          model: modelo,
          messages: aMensajes(peticion.sistema, peticion.mensajes),
          ...(peticion.herramientas.length > 0
            ? {
                tools: peticion.herramientas.map((h) => ({ type: 'function', function: { name: h.nombre, description: h.descripcion, parameters: h.esquema } })),
                tool_choice: 'auto',
              }
            : {}),
          max_tokens: peticion.maxTokens,
        }),
      });
    } catch {
      // Sin red, o la señal cortó la espera: el motivo real no incluye la clave, pero tampoco hace falta
      throw new ModeloNoDisponible('no se pudo conectar con el proveedor');
    }

    if (!respuesta.ok) {
      if (respuesta.status >= 500 || NO_DISPONIBLE.has(respuesta.status)) throw new ModeloNoDisponible(`el proveedor respondió ${respuesta.status}`);
      throw new FalloDelModelo(`el proveedor rechazó la petición (${respuesta.status})`);
    }

    let cuerpo: RespuestaOpenAI;
    try {
      cuerpo = (await respuesta.json()) as RespuestaOpenAI;
    } catch {
      throw new FalloDelModelo('la respuesta no es JSON');
    }
    const mensaje = cuerpo.choices?.[0]?.message;
    if (!mensaje) throw new FalloDelModelo('la respuesta no trae ningún mensaje');

    const llamadas: LlamadaHerramienta[] = (mensaje.tool_calls ?? []).map((l, i) => {
      let argumentos: unknown;
      try {
        argumentos = JSON.parse(l.function?.arguments || '{}');
      } catch {
        throw new FalloDelModelo('los argumentos de una herramienta no son JSON');
      }
      if (!l.function?.name) throw new FalloDelModelo('una llamada a herramienta no trae nombre');
      return { id: l.id || `llamada-${i}`, nombre: l.function.name, argumentos };
    });
    const texto = mensaje.content ?? null;
    if (!texto && llamadas.length === 0) throw new FalloDelModelo('la respuesta no trae texto ni herramientas');

    return {
      texto,
      llamadas,
      uso: { tokensEntrada: cuerpo.usage?.prompt_tokens ?? 0, tokensSalida: cuerpo.usage?.completion_tokens ?? 0 },
      modelo: cuerpo.model || modelo,
    };
  }
}
