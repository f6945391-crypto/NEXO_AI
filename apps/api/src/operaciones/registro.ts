import { Injectable } from '@nestjs/common';
import type { VistaConfirmacion } from '@nexoai/contratos';
import type { z } from 'zod';
import type { ContextoSolicitud } from '../identidad/contexto';

// Cada tipo de operación declara cómo se valida su carga, cómo se propone y cómo se ejecuta.
// Los módulos de dominio registran sus ejecutores al iniciarse (onModuleInit).

export type ResultadoEjecucion =
  | { tipo: 'ejecutada'; resultado: unknown }
  // H-AG-07: algo cambió desde la propuesta (por ejemplo, un conflicto nuevo); no se ejecuta y se propone de nuevo.
  | { tipo: 'reproponer'; vistaConfirmacion: VistaConfirmacion };

export interface EjecutorOperacion<C = unknown> {
  readonly tipo: string;
  readonly esquema: z.ZodType<C>;
  proponer(contexto: ContextoSolicitud, carga: C): Promise<VistaConfirmacion>;
  // Único lugar donde una operación produce su efecto (AD-09).
  ejecutar(contexto: ContextoSolicitud, carga: C): Promise<ResultadoEjecucion>;
}

@Injectable()
export class RegistroOperaciones {
  private readonly ejecutores = new Map<string, EjecutorOperacion>();

  registrar<C>(ejecutor: EjecutorOperacion<C>): void {
    if (this.ejecutores.has(ejecutor.tipo)) throw new Error(`Tipo de operación repetido: ${ejecutor.tipo}`);
    this.ejecutores.set(ejecutor.tipo, ejecutor as EjecutorOperacion);
  }

  obtener(tipo: string): EjecutorOperacion | undefined {
    return this.ejecutores.get(tipo);
  }
}
