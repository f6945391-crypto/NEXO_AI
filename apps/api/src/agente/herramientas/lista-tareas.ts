import type { Tarea, TareasPorFranja } from '@nexoai/contratos';
import { fechaDiaCorta } from '../../tareas/dominio/formato';

// REQ-CUN03-04 · T-051. La respuesta a «¿qué tengo pendiente?» la arma el código con las tareas tal como
// están: ni el modelo añade una que no existe ni se le olvida una que existe. Espejo de lista-agenda.ts.

function linea(t: Tarea): string {
  if (t.franja === 'esperando') {
    return `• ${t.esperaQue ?? t.titulo}, de ${t.esperaDe}${t.fecha ? ` (${fechaDiaCorta(t.fecha)}${t.hora ? `, ${t.hora}` : ''})` : ''}${t.atrasada ? ' · atrasada' : ''}`;
  }
  const cuando = t.fecha ? ` — ${fechaDiaCorta(t.fecha)}${t.hora ? `, ${t.hora}` : ''}` : '';
  return `• ${t.titulo}${cuando}${t.atrasada ? ' · atrasada' : ''}`;
}

const SECCIONES: ReadonlyArray<readonly [keyof TareasPorFranja, string]> = [
  ['conFecha', 'Con fecha'],
  ['sinFecha', 'Sin fecha'],
  ['esperando', 'Esperando de alguien'],
];

export function armarListaTareas(franjas: TareasPorFranja, solo?: 'con_fecha' | 'sin_fecha' | 'esperando'): string {
  const clave = { con_fecha: 'conFecha', sin_fecha: 'sinFecha', esperando: 'esperando' } as const;
  const secciones = SECCIONES.filter(([k]) => !solo || clave[solo] === k).filter(([k]) => franjas[k].length > 0);
  const total = secciones.reduce((suma, [k]) => suma + franjas[k].length, 0);
  if (total === 0) return solo ? 'No tienes tareas pendientes en esa franja.' : 'No tienes tareas pendientes.';
  const cabecera = `Tienes ${total} ${total === 1 ? 'tarea pendiente' : 'tareas pendientes'}:`;
  return [cabecera, ...secciones.map(([k, titulo]) => `\n${titulo}\n${franjas[k].map(linea).join('\n')}`)].join('\n');
}
