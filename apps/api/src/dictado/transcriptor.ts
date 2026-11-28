// 01-captura · T-154 · REQ-CAP-27 · plan de 07-agente §15.1. El puerto del dictado: un audio entra, un texto sale.
// No es el modelo del asistente (P-06): es otro proveedor, detrás de su propia interfaz. El audio nunca se guarda
// (REQ-CAP-13, H-CAP-08): las implementaciones lo leen en memoria y lo olvidan.

export const TRANSCRIPTOR_VOZ = Symbol('TRANSCRIPTOR_VOZ');

export interface AudioDictado {
  datos: Buffer;
  // El tipo MIME que mandó el cliente: audio/webm, audio/mp4, audio/m4a…
  tipo: string;
  nombre: string;
}

export interface ResultadoDictado {
  texto: string;
  // Lo que informa el proveedor, para la auditoría; nunca el texto ni el audio
  segundos: number | null;
  costoUsd: number | null;
}

export interface TranscriptorVoz {
  readonly nombre: string;
  transcribir(audio: AudioDictado, senal: AbortSignal): Promise<ResultadoDictado>;
}

// Sin configurar, el proveedor no responde o rechaza la petición: el dictado no está disponible (503)
export class DictadoNoDisponible extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'DictadoNoDisponible';
  }
}

export class TranscriptorNoConfigurado implements TranscriptorVoz {
  readonly nombre = 'no-configurado';
  async transcribir(): Promise<ResultadoDictado> {
    throw new DictadoNoDisponible('el dictado no está configurado');
  }
}

// Para las pruebas y el desarrollo: devuelve siempre el mismo texto, sin mirar el audio
export const TEXTO_DICTADO_SIMULADO = 'informe de Vasco el jueves';

export class TranscriptorSimulado implements TranscriptorVoz {
  readonly nombre = 'simulado';
  constructor(private readonly texto = TEXTO_DICTADO_SIMULADO) {}
  async transcribir(audio: AudioDictado): Promise<ResultadoDictado> {
    if (audio.datos.length === 0) throw new DictadoNoDisponible('audio vacío');
    return { texto: this.texto, segundos: null, costoUsd: 0 };
  }
}
