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
