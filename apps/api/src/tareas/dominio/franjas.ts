import type { EstadoTarea, FechaDia, FranjaTarea } from '@nexoai/contratos';
import { enZona } from '../../agenda/dominio/tiempo';

// REQ-CUN03-03 · T-047 · specs/08-tareas-personales/plan.md §2. Funciones puras: ni base de datos ni
// modelo de lenguaje. Qué franja es una tarea y si está atrasada lo decide el código (P-02).

export interface TareaClasificable {
  estado: EstadoTarea;
  fecha: FechaDia | null;
  esperaDe: string | null;
}

export interface TareaOrdenable {
  fecha: FechaDia | null;
  hora: string | null;
  creadaEn: Date;
}

const dos = (n: number) => String(n).padStart(2, '0');

// «Hoy» en la zona de la persona, como día del calendario
export function hoyEnZona(ahora: Date, zona: string): FechaDia {
  const { anio, mes, dia } = enZona(ahora, zona);
  return `${anio}-${dos(mes)}-${dos(dia)}`;
}

// Una tarea que depende de otra persona va a «esperando» aunque tenga fecha
export function clasificarFranja(tarea: Pick<TareaClasificable, 'fecha' | 'esperaDe'>): FranjaTarea {
  if (tarea.esperaDe !== null) return 'esperando';
  return tarea.fecha !== null ? 'con_fecha' : 'sin_fecha';
}

// Atrasada: pendiente y con un día ya pasado. Una sin fecha nunca lo es; una de hoy tampoco. Las fechas
// «AAAA-MM-DD» se comparan como texto, que es su orden cronológico.
export function estaAtrasada(tarea: Pick<TareaClasificable, 'estado' | 'fecha'>, hoy: FechaDia): boolean {
  return tarea.estado === 'pendiente' && tarea.fecha !== null && tarea.fecha < hoy;
}

// Decisión 3: «con fecha» por fecha, la más próxima arriba (las atrasadas, que son las más antiguas, salen
// primero) y a igual fecha primero la que tiene hora, por hora; «sin fecha» y «esperando», la más reciente arriba.
export function ordenarFranja<T extends TareaOrdenable>(franja: FranjaTarea, tareas: readonly T[]): T[] {
  const copia = [...tareas];
  if (franja !== 'con_fecha') return copia.sort((a, b) => b.creadaEn.getTime() - a.creadaEn.getTime());
  return copia.sort((a, b) => {
    if (a.fecha !== b.fecha) return (a.fecha ?? '') < (b.fecha ?? '') ? -1 : 1;
    if (a.hora !== b.hora) {
      if (a.hora === null) return 1;
      if (b.hora === null) return -1;
      return a.hora < b.hora ? -1 : 1;
    }
    return a.creadaEn.getTime() - b.creadaEn.getTime();
  });
}
