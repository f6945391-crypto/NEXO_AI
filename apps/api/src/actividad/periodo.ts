import type { NivelActividad } from '@nexoai/contratos';
import { diaDeLaSemana, enZona, instanteLocal, sumarDias, type FechaLocal } from '../agenda/dominio/tiempo';

// T-081 · REQ-CUN02-25, 28 · H-JOR-02, H-JOR-08. Función pura: el período de un nivel alrededor de una fecha,
// contado en la zona del perfil. Día de medianoche a medianoche, Semana de lunes a domingo, Mes del 1 al
// último. No se pasa del período actual: `siguiente` es nulo en él (lo que va a pasar está en Agenda).

export type Periodo = {
  nivel: NivelActividad;
  // El foco: el día, el lunes o el día 1
  fecha: string;
  primerDia: string;
  ultimoDia: string;
  hoy: string;
  // [desde, hasta): del primer instante del período al primero del siguiente
  desde: Date;
  hasta: Date;
  anterior: string;
  siguiente: string | null;
  esActual: boolean;
  hastaAhora: boolean;
};

const dos = (n: number) => String(n).padStart(2, '0');
export const aTexto = (f: FechaLocal) => `${f.anio}-${dos(f.mes)}-${dos(f.dia)}`;
function aFecha(texto: string): FechaLocal {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return { anio: anio!, mes: mes!, dia: dia! };
}

// La fecha de calendario de un instante en la zona: «2026-11-07»
export function fechaEnZona(instante: Date, zona: string): string {
  const { anio, mes, dia } = enZona(instante, zona);
  return aTexto({ anio, mes, dia });
}

function inicioDelPeriodo(nivel: NivelActividad, fecha: FechaLocal): FechaLocal {
  if (nivel === 'semana') return sumarDias(fecha, -((diaDeLaSemana(fecha) + 6) % 7));
  if (nivel === 'mes') return { anio: fecha.anio, mes: fecha.mes, dia: 1 };
  return fecha;
}

function desplazar(nivel: NivelActividad, inicio: FechaLocal, pasos: number): FechaLocal {
  if (nivel === 'dia') return sumarDias(inicio, pasos);
  if (nivel === 'semana') return sumarDias(inicio, 7 * pasos);
  const d = new Date(Date.UTC(inicio.anio, inicio.mes - 1 + pasos, 1));
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: 1 };
}

export function periodoDe(nivel: NivelActividad, fecha: string | undefined, zona: string, ahora: Date): Periodo {
  const hoy = aFecha(fechaEnZona(ahora, zona));
  const foco = inicioDelPeriodo(nivel, fecha ? aFecha(fecha) : hoy);
  const siguiente = desplazar(nivel, foco, 1);
  const actual = aTexto(inicioDelPeriodo(nivel, hoy));
  const desde = instanteLocal(foco, 0, zona);
  const hasta = instanteLocal(siguiente, 0, zona);
  // Las fechas AAAA-MM-DD se ordenan como texto
  const esActual = aTexto(foco) === actual;
  return {
    nivel,
    fecha: aTexto(foco),
    primerDia: aTexto(foco),
    ultimoDia: aTexto(sumarDias(siguiente, -1)),
    hoy: aTexto(hoy),
    desde,
    hasta,
    anterior: aTexto(desplazar(nivel, foco, -1)),
    siguiente: aTexto(foco) >= actual ? null : aTexto(siguiente),
    esActual,
    hastaAhora: desde.getTime() <= ahora.getTime() && ahora.getTime() < hasta.getTime(),
  };
}
