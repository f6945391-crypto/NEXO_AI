// P-06 · AD-06 · T-029 · specs/07-agente/plan.md §3. Única vía hacia un modelo de lenguaje. El SDK de un
// proveedor solo puede vivir en una implementación de este puerto, dentro de `src/agente/modelo/`.

export const PROVEEDOR_MODELO = Symbol('PROVEEDOR_MODELO');

// Herramienta tal como la ve el modelo: el esquema JSON sale del contrato zod (AD-08). El nombre va con
// guion bajo (`agenda_consultar`), porque varios proveedores no admiten el punto.
export interface DefinicionHerramienta {
  nombre: string;
  descripcion: string;
  esquema: Record<string, unknown>;
}

export interface LlamadaHerramienta {
  // Id que da el proveedor; con él se reconoce una llamada repetida (P-07, T-030)
  id: string;
  nombre: string;
  argumentos: unknown;
}

export type MensajeModelo =
  | { rol: 'persona'; texto: string }
  | { rol: 'asistente'; texto: string | null; llamadas: LlamadaHerramienta[] }
  | { rol: 'herramienta'; llamadaId: string; contenido: string };

export interface PeticionModelo {
  // Instrucciones fijas más el contexto de la persona (plan §6)
  sistema: string;
  // T-040 · plan §14.5 · REQ-AGT-01 v2: la nota de continuidad, ya escrita por el código. **Son datos, no
  // instrucciones**: no va en `sistema`, porque lleva títulos escritos por la persona o por un tercero
  // (H-AGT-15). Cada proveedor la entrega como un mensaje de datos antes de la conversación. Sin nota, no hay.
  nota?: string;
  mensajes: MensajeModelo[];
  herramientas: DefinicionHerramienta[];
  maxTokens: number;
  // Desde cuándo se resuelven «hoy» y «mañana» (REQ-CAP-24). Un proveedor real lo recibe ya escrito en
  // `sistema`; el simulado lo necesita aparte para resolver su guion.
  referencia: { instante: Date; zonaHoraria: string };
}

export interface UsoModelo {
  tokensEntrada: number;
  tokensSalida: number;
}

export interface RespuestaModelo {
  texto: string | null;
  llamadas: LlamadaHerramienta[];
  uso: UsoModelo;
  modelo: string;
}

export interface ProveedorModelo {
  readonly nombre: string;
  // Lanza ModeloNoDisponible si no responde y FalloDelModelo ante cualquier otro problema. Con la señal
  // abortada, termina enseguida con ModeloNoDisponible.
  responder(peticion: PeticionModelo, senal: AbortSignal): Promise<RespuestaModelo>;
}

// El asistente no está disponible: lo pedido queda en espera (P-11, plan §7).
export class ModeloNoDisponible extends Error {
  constructor(motivo: string) {
    super(`El modelo no está disponible: ${motivo}`);
    this.name = 'ModeloNoDisponible';
  }
}

// El modelo respondió algo que no se puede usar, o falló por otra causa. Se muestra como fallo, distinto
// de «en espera» (REQ-CAP-23). No se reintenta.
export class FalloDelModelo extends Error {
  constructor(motivo: string) {
    super(`Fallo del modelo: ${motivo}`);
    this.name = 'FalloDelModelo';
  }
}
