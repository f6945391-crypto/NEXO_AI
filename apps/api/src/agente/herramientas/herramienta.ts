import type { z } from 'zod';
import type { ContextoSolicitud } from '../../identidad/contexto';

// specs/07-agente/plan.md §5 · T-030. Lo que hace una herramienta del agente. La identidad llega siempre del
// contexto de la petición, nunca de los argumentos que dé el modelo (P-04).

export interface EntornoHerramienta {
  conversacionId: string;
  // La frase de la persona, que se guarda con la Operación propuesta (AD-09)
  solicitudOriginal: string;
  // Desde cuándo se resuelven «hoy» y «mañana» (REQ-CAP-24)
  referencia: { instante: Date; zonaHoraria: string };
}

export interface ResultadoHerramienta {
  // Lo que vuelve al modelo: lo mínimo para seguir (H-AGT-12)
  paraModelo: unknown;
  // La Operación que propuso, si propuso una: el grafo se detiene hasta que la persona decida (P-03)
  operacionId?: string;
  // Lo que la interfaz muestra tal cual, armado por el código y no por el modelo (REQ-CUN01-13)
  turno?: unknown;
}

export interface Herramienta<A = unknown> {
  // Nombre interno, con punto: `agenda.consultar`
  readonly nombre: string;
  readonly descripcion: string;
  // Contrato en packages/contratos (AD-08); de él sale el esquema JSON que ve el modelo
  readonly esquema: z.ZodType<A>;
  ejecutar(contexto: ContextoSolicitud, argumentos: A, entorno: EntornoHerramienta): Promise<ResultadoHerramienta>;
}

// Varios proveedores no admiten el punto en el nombre de una herramienta.
export const nombreParaModelo = (nombre: string) => nombre.replaceAll('.', '_');
