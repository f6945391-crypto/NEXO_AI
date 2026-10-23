import { cookies } from 'next/headers';
import { EventoAgenda } from '@nexoai/contratos';
import { codigoDeError, COOKIE_ACCESO, llamarApi, mensajeDeError } from './sesion';

// T-025 · REQ-CUN01-10, REQ-CUN01-12. La agenda de hoy, en la zona horaria de la persona. Se lee y se
// formatea en el servidor: así el navegador recibe el texto ya hecho y no hay diferencias de formato
// entre el servidor y el navegador.

export type CompromisoDelDia = {
  id: string;
  titulo: string;
  // «09:00 – 10:00» en la zona de la persona, o «Todo el día»
  horario: string;
  // «Hora de Madrid: 17:00 – 17:30» cuando el evento está en otra zona; si no, nulo
  enSuZona: string | null;
  cancelado: boolean;
  // H-AG-05: la persona fue invitada y no lo organiza
  invitado: boolean;
};

export type AgendaDelDia =
  | { estado: 'lista'; fecha: string; zona: string; compromisos: CompromisoDelDia[] }
  | { estado: 'sin-calendario' }
  | { estado: 'error'; mensaje: string };

// Desfase de la zona en un instante, como «-05:00».
function desfase(instante: number, zona: string): string {
  const nombre = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })
    .formatToParts(new Date(instante))
    .find((parte) => parte.type === 'timeZoneName')?.value;
  return /GMT([+-]\d{2}:\d{2})/.exec(nombre ?? '')?.[1] ?? '+00:00';
}

const fechaEn = (instante: number, zona: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(new Date(instante));

// Medianoche de esa fecha en la zona, con su desfase. Se calcula dos veces por si cambia la hora ese día.
function medianoche(fecha: string, zona: string): string {
  const aproximada = Date.parse(`${fecha}T00:00:00${desfase(Date.parse(`${fecha}T12:00:00Z`), zona)}`);
  return `${fecha}T00:00:00${desfase(aproximada, zona)}`;
}

const diaSiguiente = (fecha: string) => new Date(Date.parse(`${fecha}T12:00:00Z`) + 24 * 3600_000).toISOString().slice(0, 10);

const ciudad = (zona: string) => (zona.split('/').pop() ?? zona).replaceAll('_', ' ');

function horario(evento: EventoAgenda, zona: string): string {
  const hora = new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${hora.format(new Date(evento.inicio))} – ${hora.format(new Date(evento.fin))}`;
}

export async function obtenerAgendaDelDia(zona: string): Promise<AgendaDelDia> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return { estado: 'error', mensaje: 'Tu sesión terminó. Vuelve a entrar.' };

  const hoy = fechaEn(Date.now(), zona);
  const consulta = new URLSearchParams({ desde: medianoche(hoy, zona), hasta: medianoche(diaSiguiente(hoy), zona) });
  let respuesta;
  try {
    respuesta = await llamarApi(`/agenda/eventos?${consulta}`, { token: acceso });
  } catch {
    return { estado: 'error', mensaje: 'No pudimos conectar con NexoAI para leer tu agenda.' };
  }
  if (codigoDeError(respuesta.cuerpo) === 'PERMISO_GOOGLE_FALTANTE') return { estado: 'sin-calendario' };
  const eventos = EventoAgenda.array().safeParse(respuesta.cuerpo);
  if (respuesta.estado !== 200 || !eventos.success) {
    return { estado: 'error', mensaje: mensajeDeError(respuesta.cuerpo, 'NexoAI no respondió como esperábamos. Inténtalo de nuevo en un momento.') };
  }

  // Los de todo el día primero, como en el calendario
  const ordenados = [...eventos.data].sort((a, b) => Number(b.todoElDia) - Number(a.todoElDia));
  return {
    estado: 'lista',
    fecha: new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    // REQ-CUN01-10: en qué zona están las horas que se muestran
    zona: `Hora de ${ciudad(zona)} (${new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? zona})`,
    compromisos: ordenados.map((evento) => ({
      id: evento.id,
      titulo: evento.titulo,
      horario: evento.todoElDia ? 'Todo el día' : horario(evento, zona),
      enSuZona: evento.todoElDia || evento.zonaHoraria === zona ? null : `Hora de ${ciudad(evento.zonaHoraria)}: ${horario(evento, evento.zonaHoraria)}`,
      cancelado: evento.estado === 'cancelado',
      invitado: !evento.esOrganizador,
    })),
  };
}
