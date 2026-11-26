import type { EventoAgenda } from '@nexoai/contratos';

// T-021 · REQ-CUN01-10. El día de hoy en la zona del perfil, de medianoche a medianoche con su desfase,
// y las horas de cada compromiso en esa zona. Es el mismo cálculo que la web (apps/web/src/lib/agenda.ts).

// Desfase de la zona en un instante, como «-05:00».
function desfase(instante: number, zona: string): string {
  try {
    const nombre = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })
      .formatToParts(new Date(instante))
      .find((parte) => parte.type === 'timeZoneName')?.value;
    return /GMT([+-]\d{2}:\d{2})/.exec(nombre ?? '')?.[1] ?? '+00:00';
  } catch {
    return '+00:00';
  }
}

const fechaEn = (instante: number, zona: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(new Date(instante));
const diaSiguiente = (fecha: string) => new Date(Date.parse(`${fecha}T12:00:00Z`) + 24 * 3600_000).toISOString().slice(0, 10);

// Medianoche de esa fecha en la zona, con su desfase. Se calcula dos veces por si cambia la hora ese día.
function medianoche(fecha: string, zona: string): string {
  const aproximada = Date.parse(`${fecha}T00:00:00${desfase(Date.parse(`${fecha}T12:00:00Z`), zona)}`);
  return `${fecha}T00:00:00${desfase(aproximada, zona)}`;
}

export function rangoDeHoy(zona: string): { desde: string; hasta: string } {
  const hoy = fechaEn(Date.now(), zona);
  return { desde: medianoche(hoy, zona), hasta: medianoche(diaSiguiente(hoy), zona) };
}

// T-044 · REQ-CUN01-14, 15. Semana y Mes trabajan con fechas de calendario («2026-11-06») en la zona del
// perfil. La aritmética se hace a mediodía UTC, así un cambio de hora no salta de día.
const aMediodia = (fecha: string) => Date.parse(`${fecha}T12:00:00Z`);
const DIA_MS = 24 * 3600_000;

export const hoyEn = (zona: string) => fechaEn(Date.now(), zona);
export const sumarDias = (fecha: string, dias: number) => new Date(aMediodia(fecha) + dias * DIA_MS).toISOString().slice(0, 10);

// Lunes de la semana de esa fecha
export function lunesDe(fecha: string): string {
  const diaSemana = (new Date(aMediodia(fecha)).getUTCDay() + 6) % 7;
  return sumarDias(fecha, -diaSemana);
}

export function sumarMeses(fecha: string, meses: number): string {
  const d = new Date(aMediodia(fecha.slice(0, 7) + '-01'));
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}

// Los días seguidos desde `desde`
export const dias = (desde: string, cuantos: number) => Array.from({ length: cuantos }, (_, i) => sumarDias(desde, i));

// La rejilla del mes: de lunes a domingo, desde la semana del día 1 hasta la del último
export function rejillaDelMes(fecha: string): string[] {
  const primero = fecha.slice(0, 7) + '-01';
  const ultimo = sumarDias(sumarMeses(primero, 1), -1);
  const desde = lunesDe(primero);
  const hasta = sumarDias(lunesDe(ultimo), 6);
  return dias(desde, Math.round((aMediodia(hasta) - aMediodia(desde)) / DIA_MS) + 1);
}

// De la medianoche del primer día a la del día siguiente al último, en la zona
export function rangoDeFechas(primera: string, ultima: string, zona: string): { desde: string; hasta: string } {
  return { desde: medianoche(primera, zona), hasta: medianoche(diaSiguiente(ultima), zona) };
}

// Los compromisos de cada fecha: los que se solapan con su día, como en Hoy. Uno que dura varios días va en todos.
export function porDia(eventos: EventoAgenda[], fechas: string[], zona: string): Map<string, EventoAgenda[]> {
  const mapa = new Map<string, EventoAgenda[]>();
  for (const fecha of fechas) {
    const desde = Date.parse(medianoche(fecha, zona));
    const hasta = Date.parse(medianoche(diaSiguiente(fecha), zona));
    mapa.set(fecha, ordenar(eventos.filter((e) => Date.parse(e.inicio) < hasta && Date.parse(e.fin) > desde)));
  }
  return mapa;
}

const formato = (opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es', { timeZone: 'UTC', ...opciones });
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

// «Viernes 6 de noviembre»
export const fechaLarga = (fecha: string) => mayuscula(formato({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(aMediodia(fecha))));

// «Noviembre de 2026»
export const nombreDelMes = (fecha: string) => mayuscula(formato({ month: 'long', year: 'numeric' }).format(new Date(aMediodia(fecha))));

// «3 – 9 de noviembre», o «27 de octubre – 2 de noviembre» si cruza de mes
export function nombreDeLaSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  const dia = (f: string) => Number(f.slice(8, 10));
  const mes = (f: string) => formato({ month: 'long' }).format(new Date(aMediodia(f)));
  if (lunes.slice(0, 7) === domingo.slice(0, 7)) return `${dia(lunes)} – ${dia(domingo)} de ${mes(domingo)}`;
  return `${dia(lunes)} de ${mes(lunes)} – ${dia(domingo)} de ${mes(domingo)}`;
}

// REQ-CUN01-15: un punto por cada dos compromisos, como mucho tres
export const puntosDelDia = (compromisos: number) => Math.min(3, Math.ceil(compromisos / 2));

const ciudad = (zona: string) => (zona.split('/').pop() ?? zona).replaceAll('_', ' ');

export function nombreDeZona(zona: string): string {
  const corto = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName')?.value;
  return `Hora de ${ciudad(zona)} (${corto ?? zona})`;
}

export function fechaDeHoy(zona: string): string {
  const texto = new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function horario(evento: Pick<EventoAgenda, 'inicio' | 'fin' | 'todoElDia'>, zona: string): string {
  if (evento.todoElDia) return 'Todo el día';
  const hora = new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${hora.format(new Date(evento.inicio))} – ${hora.format(new Date(evento.fin))}`;
}

// «Hora de Madrid: 17:00 – 17:30» cuando el compromiso es de otra zona; si no, nulo.
export function enSuZona(evento: EventoAgenda, zona: string): string | null {
  if (evento.todoElDia || evento.zonaHoraria === zona) return null;
  return `Hora de ${ciudad(evento.zonaHoraria)}: ${horario(evento, evento.zonaHoraria)}`;
}

// Los de todo el día primero, como en el calendario
export const ordenar = (eventos: EventoAgenda[]) => [...eventos].sort((a, b) => Number(b.todoElDia) - Number(a.todoElDia));
