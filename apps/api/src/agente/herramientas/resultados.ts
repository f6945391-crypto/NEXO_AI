import type { OperacionRespuesta, TurnoDeHerramienta } from '@nexoai/contratos';
import type { ResultadoHerramienta } from './herramienta';

// T-051. Lo que devuelven las herramientas de tareas, con la misma forma que las de agenda.

export const conError = (codigo: string, mensaje: string, campos?: string[]): ResultadoHerramienta => ({
  paraModelo: { error: { codigo, mensaje, ...(campos ? { campos } : {}) } },
});

// La tarjeta la muestra el código; al modelo le basta saber que la hay y si se puede confirmar.
export function comoPropuesta(op: OperacionRespuesta): ResultadoHerramienta {
  const turno: TurnoDeHerramienta = { tipo: 'propuesta', operacion: op };
  return {
    paraModelo: {
      propuesta: {
        id: op.id,
        accion: op.vistaConfirmacion.accion,
        confirmable: op.vistaConfirmacion.confirmable,
        motivoNoConfirmable: op.vistaConfirmacion.motivoNoConfirmable,
      },
      nota: 'La persona ya ve la tarjeta de confirmación. No repitas sus datos.',
    },
    operacionId: op.id,
    turno,
  };
}
