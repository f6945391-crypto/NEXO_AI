import type { FranjaTarea } from '@nexoai/contratos';
import { enZona, instanteLocal, sumarDias, type FechaLocal } from '../../agenda/dominio/tiempo';

// specs/09-tareas-personales/plan.md §2 · T-047 · REQ-CUN03-03, 06, 07 · H-TP-01, 03, 04, 05. Funciones puras
// (P-02): la franja, el instante límite, «vencida» y el orden de cada franja los decide el código, nunca el
// modelo. Las fechas viajan como «2026-11-14», un día del calendario de la persona (H-TP-03).

export interface DatosFranja {
  fecha: string | null;
  horaLimite: string | null;
  // La zona en que se dijo la fecha (P-05)
  zonaHoraria: string;
  deQuien: string | null;
  esperadaDesde: string | null;
  creadaEn: Date;
}

export const fechaLocal = (texto: string): FechaLocal => {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return { anio: anio!, mes: mes!, dia: dia! };
};

export const comoTexto = (f: FechaLocal) => `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;

// El día que marca el calendario en esa zona en ese instante
export const diaEn = (instante: Date, zona: string): string => comoTexto(enZona(instante, zona));

const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

// H-TP-04: lo que se espera de alguien va solo a «Esperando de alguien», aunque tenga fecha
export function franjaDe(tarea: Pick<DatosFranja, 'fecha' | 'deQuien'>): FranjaTarea {
  if (tarea.deQuien) return 'esperando';
  return tarea.fecha ? 'con_fecha' : 'sin_fecha';
}

// Con hora límite, ese minuto en la zona de la tarea; sin ella, el final de su día en esa zona. Nulo sin fecha.
export function instanteLimite(tarea: Pick<DatosFranja, 'fecha' | 'horaLimite' | 'zonaHoraria'>): Date | null {
  if (!tarea.fecha) return null;
  const dia = fechaLocal(tarea.fecha);
  return tarea.horaLimite ? instanteLocal(dia, minutos(tarea.horaLimite), tarea.zonaHoraria) : instanteLocal(sumarDias(dia, 1), 0, tarea.zonaHoraria);
}

// REQ-CUN03-07. Sin hora límite, vence cuando en la zona del perfil ya es otro día: la tarea conserva su día
// aunque la persona cambie de zona (H-TP-03). Con hora límite, cuando pasa ese instante. Es una marca, no
// un estado: nada cambia por vencer.
export function vencida(tarea: Pick<DatosFranja, 'fecha' | 'horaLimite' | 'zonaHoraria'>, ahora: Date, zonaPerfil: string): boolean {
  if (!tarea.fecha) return false;
  if (tarea.horaLimite) return ahora.getTime() >= instanteLimite(tarea)!.getTime();
  return diaEn(ahora, zonaPerfil) > tarea.fecha;
}

// Las tareas con hora límite, antes que las del mismo día sin ella
const claveFecha = (t: DatosFranja) => `${t.fecha ?? '9999-12-31'} ${t.horaLimite ?? '24:00'}`;
const porCreacion = (a: DatosFranja, b: DatosFranja) => a.creadaEn.getTime() - b.creadaEn.getTime();

// H-TP-05 · REQ-CUN03-06. Con fecha: vencidas primero, después por fecha y hora. Sin fecha: la más reciente
// primero. Esperando: las pasadas de fecha primero, después la que más lleva esperando. Sin orden manual.
export function ordenar<T extends DatosFranja>(franja: FranjaTarea, tareas: readonly T[], ahora: Date, zonaPerfil: string): T[] {
  const lista = [...tareas];
  if (franja === 'sin_fecha') return lista.sort((a, b) => porCreacion(b, a));
  const vence = new Map(lista.map((t) => [t, vencida(t, ahora, zonaPerfil)]));
  const primeroVencidas = (a: T, b: T) => Number(vence.get(b)) - Number(vence.get(a));
  if (franja === 'con_fecha') {
    return lista.sort((a, b) => primeroVencidas(a, b) || claveFecha(a).localeCompare(claveFecha(b)) || porCreacion(a, b));
  }
  const desde = (t: T) => t.esperadaDesde ?? diaEn(t.creadaEn, zonaPerfil);
  return lista.sort(
    (a, b) =>
      primeroVencidas(a, b) ||
      (vence.get(a) ? claveFecha(a).localeCompare(claveFecha(b)) : 0) ||
      desde(a).localeCompare(desde(b)) ||
      porCreacion(a, b),
  );
}

export const ORDEN_DE_FRANJAS: readonly FranjaTarea[] = ['con_fecha', 'sin_fecha', 'esperando'];

// Las tres franjas, cada una en su orden, una detrás de otra
export function ordenarPorFranja<T extends DatosFranja>(tareas: readonly T[], ahora: Date, zonaPerfil: string): T[] {
  return ORDEN_DE_FRANJAS.flatMap((franja) =>
    ordenar(
      franja,
      tareas.filter((t) => franjaDe(t) === franja),
      ahora,
      zonaPerfil,
    ),
  );
}

// Días de calendario entre dos fechas «AAAA-MM-DD»
export function diasEntre(desde: string, hasta: string): number {
  const a = fechaLocal(desde);
  const b = fechaLocal(hasta);
  return Math.round((Date.UTC(b.anio, b.mes - 1, b.dia) - Date.UTC(a.anio, a.mes - 1, a.dia)) / 86_400_000);
}
