import { Injectable } from '@nestjs/common';
import type { OrigenOperacion, VistaConfirmacion } from '@nexoai/contratos';
import type { z } from 'zod';
import type { ContextoSolicitud } from '../identidad/contexto';

// Cada tipo de operación declara cómo se valida su carga, cómo se propone y cómo se ejecuta.
// Los módulos de dominio registran sus ejecutores al iniciarse (onModuleInit).

export type ResultadoEjecucion =
  // T-067: `efimero` viaja en la respuesta de la confirmación y nunca se guarda (plan de 08-administracion §5.2)
  | { tipo: 'ejecutada'; resultado: unknown; efimero?: { contrasenaTemporal: string } }
  // H-AG-07: algo cambió desde la propuesta (por ejemplo, un conflicto nuevo); no se ejecuta y se propone de nuevo.
  | { tipo: 'reproponer'; vistaConfirmacion: VistaConfirmacion };

// T-017: la propuesta puede completar la carga (un valor por defecto, la zona del perfil). Se guarda la
// carga completada, que es la que se ejecuta al confirmar: lo registrado es lo mostrado (REQ-CUN01-04).
export type Propuesta<C> = VistaConfirmacion | { vista: VistaConfirmacion; carga: C };

export interface EjecutorOperacion<C = unknown> {
  readonly tipo: string;
  readonly esquema: z.ZodType<C>;
  // Orígenes admitidos; sin declarar, todos. Crear algo nuevo solo lo hace el agente (R-42, DP-01).
  readonly origenes?: readonly OrigenOperacion[];
  // Asigna trabajo a otros: el colaborador no puede proponerla ni confirmarla (REQ-ACC-15, T-026)
  readonly soloResponsable?: boolean;
  // T-067 · specs/08-administracion/plan.md §5.2. `empresa`: se propone desde la zona de empresa y se guarda en
  // la organización de la empresa, fuera de lo del usuario. Sin declarar, `propio`.
  readonly ambito?: 'propio' | 'empresa';
  // Solo quien administra la organización, comprobado contra la base al proponer y al confirmar (REQ-ADM-06)
  readonly soloAdministrador?: boolean;
  // Qué se le dice a la persona si pide este tipo por un origen que no admite
  readonly textoOrigenNoPermitido?: string;
  // Cómo nombrar a la persona cada campo obligatorio cuando falta (REQ-CUN01-07)
  readonly nombresDeCampos?: Readonly<Record<string, string>>;
  proponer(contexto: ContextoSolicitud, carga: C): Promise<Propuesta<C>>;
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
