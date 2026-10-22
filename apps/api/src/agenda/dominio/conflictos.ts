import { diaDeLaSemana, enZona, instanteLocal, sumarDias } from './tiempo';

// Reglas deterministas de agenda (P-02, AD-05) · T-016. Funciones puras: sin base de datos, sin red,
// sin modelo de lenguaje. Las usan las Operaciones de agenda (T-017, T-018).

export interface Intervalo {
  inicio: Date;
  fin: Date;
}

export interface EventoParaConflictos extends Intervalo {
  id: string;
  todoElDia: boolean;
  estado: 'confirmado' | 'cancelado';
}

const seSolapan = (a: Intervalo, b: Intervalo) => a.inicio < b.fin && b.inicio < a.fin;

// Solo bloquean los eventos confirmados con hora (H-AG-03: los de todo el día no cuentan como conflicto).
function bloqueantes(eventos: readonly EventoParaConflictos[], ignorar?: string) {
  return eventos.filter((e) => !e.todoElDia && e.estado === 'confirmado' && e.id !== ignorar);
}

// REQ-CUN01-02, REQ-CUN01-05. Dos intervalos que solo se tocan (uno termina cuando empieza el otro) no
// chocan. `ignorar` es el evento que se está modificando, que no choca consigo mismo.
export function detectarConflictos(
  eventos: readonly EventoParaConflictos[],
  rango: Intervalo,
  ignorar?: string,
): EventoParaConflictos[] {
  return bloqueantes(eventos, ignorar)
    .filter((e) => seSolapan(e, rango))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

export interface OpcionesAlternativas {
  zonaHoraria: string;
  // Banda horaria de la plataforma (specs/05-equipos §1, R-44), en minutos del día.
  bandaDesde?: number;
  bandaHasta?: number;
  maximo?: number;
  diasMaximos?: number;
  pasoMinutos?: number;
  ahora?: Date;
  ignorar?: string;
}

export const DP02 = {
  bandaDesde: 8 * 60,
  bandaHasta: 20 * 60,
  maximo: 3,
  diasMaximos: 7,
  pasoMinutos: 15,
} as const;

// DP-02, provisional (specs/02-agenda/plan.md §9):
//  1. misma duración que la pedida;
//  2. dentro de la banda horaria;
//  3. primero el mismo día, por cercanía a la hora pedida; después los días siguientes, igual;
//  4. sin sábado ni domingo;
//  5. hasta tres, como mucho siete días adelante;
//  6. los eventos de todo el día no bloquean;
//  7. horarios cada 15 minutos, sin solaparse entre sí y nunca en el pasado.
export function generarAlternativas(
  eventos: readonly EventoParaConflictos[],
  pedido: Intervalo,
  opciones: OpcionesAlternativas,
): Intervalo[] {
  const { zonaHoraria: zona, ignorar } = opciones;
  const bandaDesde = opciones.bandaDesde ?? DP02.bandaDesde;
  const bandaHasta = opciones.bandaHasta ?? DP02.bandaHasta;
  const maximo = opciones.maximo ?? DP02.maximo;
  const diasMaximos = opciones.diasMaximos ?? DP02.diasMaximos;
  const paso = opciones.pasoMinutos ?? DP02.pasoMinutos;
  const ahora = opciones.ahora ?? new Date();

  const duracionMs = pedido.fin.getTime() - pedido.inicio.getTime();
  const duracionMin = Math.ceil(duracionMs / 60_000);
  if (duracionMin <= 0 || duracionMin > bandaHasta - bandaDesde) return [];

  const ocupados = bloqueantes(eventos, ignorar);
  const pedidoLocal = enZona(pedido.inicio, zona);
  const elegidas: Intervalo[] = [];

  for (let d = 0; d <= diasMaximos && elegidas.length < maximo; d++) {
    const fecha = sumarDias(pedidoLocal, d);
    const diaSemana = diaDeLaSemana(fecha);
    if (diaSemana === 0 || diaSemana === 6) continue;

    const candidatas: { intervalo: Intervalo; distancia: number; minutos: number }[] = [];
    for (let m = bandaDesde; m + duracionMin <= bandaHasta; m += paso) {
      const inicio = instanteLocal(fecha, m, zona);
      const intervalo = { inicio, fin: new Date(inicio.getTime() + duracionMs) };
      if (inicio < ahora) continue;
      if (ocupados.some((e) => seSolapan(e, intervalo))) continue;
      candidatas.push({ intervalo, distancia: Math.abs(m - pedidoLocal.minutos), minutos: m });
    }

    candidatas.sort((a, b) => a.distancia - b.distancia || a.minutos - b.minutos);
    for (const { intervalo } of candidatas) {
      if (elegidas.length >= maximo) break;
      if (elegidas.some((e) => seSolapan(e, intervalo))) continue;
      elegidas.push(intervalo);
    }
  }
  return elegidas;
}
