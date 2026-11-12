import type { ActualizacionTarea, FechaDia } from '@nexoai/contratos';

// REQ-CUN03-06 · T-048. Lo que quedaría de una tarea tras aplicarle un cambio. Es función pura para que la
// tarjeta («cómo está, cómo quedaría») y la ejecución usen exactamente lo mismo.

export interface DatosTarea {
  titulo: string;
  fecha: FechaDia | null;
  hora: string | null;
  esperaDe: string | null;
  esperaQue: string | null;
}

export type ResultadoCambio = { tipo: 'ok'; despues: DatosTarea } | { tipo: 'invalido'; motivo: string };

export function aplicarCambio(antes: DatosTarea, cambio: Omit<ActualizacionTarea, 'tareaId' | 'cancelar'>): ResultadoCambio {
  const despues: DatosTarea = {
    titulo: cambio.titulo ?? antes.titulo,
    fecha: cambio.fecha !== undefined ? cambio.fecha : antes.fecha,
    hora: cambio.hora !== undefined ? cambio.hora : antes.hora,
    esperaDe: cambio.esperaDe !== undefined ? cambio.esperaDe : antes.esperaDe,
    esperaQue: cambio.esperaQue !== undefined ? cambio.esperaQue : antes.esperaQue,
  };
  // «Quítale la fecha» quita también la hora, que no existe sin fecha (decisión 4)
  if (cambio.fecha === null && cambio.hora === undefined) despues.hora = null;
  if (despues.hora !== null && despues.fecha === null) return { tipo: 'invalido', motivo: 'la hora necesita una fecha' };
  if ((despues.esperaDe === null) !== (despues.esperaQue === null)) {
    return { tipo: 'invalido', motivo: 'hay que decir de quién y qué se espera' };
  }
  return { tipo: 'ok', despues };
}
