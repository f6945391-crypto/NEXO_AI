import type { FechaDia } from '@nexoai/contratos';
import type { DatosTarea } from './cambios';

// Textos de las tarjetas de tareas. Los escribe el servidor, no el modelo (RN-ER-03).

// «viernes, 14 de noviembre de 2026». Un día del calendario no depende de ninguna zona.
export function fechaDiaLarga(fecha: FechaDia): string {
  return new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${fecha}T12:00:00Z`),
  );
}

export const cuando = (t: Pick<DatosTarea, 'fecha' | 'hora'>) =>
  t.fecha === null ? 'Sin fecha' : `${fechaDiaLarga(t.fecha)}${t.hora ? `, ${t.hora}` : ', sin hora'}`;

// Una línea con todo lo de la tarea, para «ahora» y «quedaría»
export const resumen = (t: DatosTarea) =>
  `${t.titulo} · ${cuando(t)}${t.esperaDe ? ` · esperando «${t.esperaQue}» de ${t.esperaDe}` : ''}`;

// «viernes 14 de noviembre», sin año, para las listas
export function fechaDiaCorta(fecha: FechaDia): string {
  return new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${fecha}T12:00:00Z`));
}
