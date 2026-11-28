import type { z } from 'zod';
import type { ContextoSolicitud } from '../../identidad/contexto';
import type { PropuestaAbierta } from '../../operaciones/operaciones.service';

// specs/07-agente/plan.md §5 · T-030. Lo que hace una herramienta del agente. La identidad llega siempre del
// contexto de la petición, nunca de los argumentos que dé el modelo (P-04).

export interface EntornoHerramienta {
  conversacionId: string;
  // La frase de la persona, que se guarda con la Operación propuesta (AD-09)
  solicitudOriginal: string;
  // Desde cuándo se resuelven «hoy» y «mañana» (REQ-CAP-24)
  referencia: { instante: Date; zonaHoraria: string };
  // T-033: la Operación en espera que se está atendiendo; lo que se proponga ocupa esa misma fila
  enEspera?: string;
  // T-143 · REQ-AGT-07: la propuesta sin decidir del episodio, mientras se interpreta lo que la persona escribió
  // después. Cambiar una tarea o un compromiso puede referirse a ella
  propuestaAbierta?: PropuestaAbierta;
}

// T-143 · REQ-AGT-07: lo que el código ofrece hacer en lugar de lo pedido («¿la registro como compromiso?»). Si
// la persona acepta, el grafo llama a esa herramienta sin pasar por el modelo; si no, dice `alNegar`
export interface Oferta {
  llamada: { nombre: string; argumentos: Record<string, unknown> };
  // La frase de la persona que la motivó: la que se guarda con lo que se proponga al aceptar
  frase: string;
  alNegar: string;
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
