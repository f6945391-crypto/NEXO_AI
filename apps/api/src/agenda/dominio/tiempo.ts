// Hora local en una zona IANA sin librerías externas (P-05). Solo lo que necesitan las reglas de agenda.

export interface FechaLocal {
  anio: number;
  mes: number; // 1-12
  dia: number;
}

const formateadores = new Map<string, Intl.DateTimeFormat>();

function formateador(zona: string): Intl.DateTimeFormat {
  let f = formateadores.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formateadores.set(zona, f);
  }
  return f;
}

// Fecha y minutos del día de un instante, vistos en la zona.
export function enZona(instante: Date, zona: string): FechaLocal & { minutos: number } {
  const p = Object.fromEntries(formateador(zona).formatToParts(instante).map((x) => [x.type, x.value]));
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    minutos: Number(p.hour) * 60 + Number(p.minute),
  };
}

// Desfase de la zona en un instante, en milisegundos (hora local − UTC).
function desfase(instante: Date, zona: string): number {
  const l = enZona(instante, zona);
  const segundos = instante.getUTCSeconds();
  const comoUtc = Date.UTC(l.anio, l.mes - 1, l.dia, Math.floor(l.minutos / 60), l.minutos % 60, segundos);
  return comoUtc - (instante.getTime() - instante.getUTCMilliseconds());
}

// Instante en que el reloj de la zona marca esa fecha y esos minutos. Ajusta dos veces por si el
// cambio de hora cae entre la estimación y el resultado.
export function instanteLocal(fecha: FechaLocal, minutos: number, zona: string): Date {
  const comoUtc = Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia, 0, minutos);
  let instante = new Date(comoUtc - desfase(new Date(comoUtc), zona));
  instante = new Date(comoUtc - desfase(instante, zona));
  return instante;
}

export function sumarDias(fecha: FechaLocal, dias: number): FechaLocal {
  const d = new Date(Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia + dias));
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

// 0 domingo … 6 sábado, del calendario, sin depender de la zona.
export function diaDeLaSemana(fecha: FechaLocal): number {
  return new Date(Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia)).getUTCDay();
}
