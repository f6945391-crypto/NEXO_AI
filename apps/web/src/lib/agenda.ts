import { cookies } from 'next/headers';
import { EventoAgenda } from '@nexoai/contratos';
import { codigoDeError, COOKIE_ACCESO, llamarApi, mensajeDeError } from './sesion';

// T-025 · REQ-CUN01-10, REQ-CUN01-12. La agenda, en la zona horaria de la persona. Se lee y se
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

// T-044 · REQ-CUN01-14, REQ-CUN01-15. Los tres niveles: un día (hoy u otro elegido en el mes), la semana de
// lunes a domingo y la rejilla del mes. Las fechas viajan como «2026-11-06», siempre en la zona del perfil.
export type NivelAgenda = 'dia' | 'semana' | 'mes';
export type VistaAgenda = { nivel: NivelAgenda; fecha: string | null };

export type DiaDeSemana = { fecha: string; nombre: string; esHoy: boolean; compromisos: CompromisoDelDia[] };
export type DiaDeMes = { fecha: string; numero: number; delMes: boolean; esHoy: boolean; total: number; puntos: number; etiqueta: string };

type Base = { zona: string; hoy: string };
export type AgendaLista =
  | (Base & { nivel: 'dia'; fecha: string; fechaIso: string; esHoy: boolean; compromisos: CompromisoDelDia[] })
  | (Base & { nivel: 'semana'; titulo: string; dias: DiaDeSemana[]; anterior: string; siguiente: string; esActual: boolean })
  | (Base & { nivel: 'mes'; titulo: string; semanas: DiaDeMes[][]; anterior: string; siguiente: string; esActual: boolean });

export type Agenda = ({ estado: 'lista' } & AgendaLista) | { estado: 'sin-calendario' } | { estado: 'error'; mensaje: string };

const sumarDias = (fecha: string, dias: number) => new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 24 * 3600_000).toISOString().slice(0, 10);
// 0 es lunes y 6 domingo
const diaDeLaSemana = (fecha: string) => (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7;
const lunesDe = (fecha: string) => sumarDias(fecha, -diaDeLaSemana(fecha));
const primeroDeMes = (fecha: string) => `${fecha.slice(0, 7)}-01`;
function mesDesplazado(fecha: string, meses: number): string {
  const [anio, mes] = fecha.split('-').map(Number);
  const d = new Date(Date.UTC(anio!, mes! - 1 + meses, 1, 12));
  return d.toISOString().slice(0, 10);
}
// Una fecha de calendario, sin zona: se formatea al mediodía en UTC para que no se corra de día
const formatoFecha = (fecha: string, opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es', { timeZone: 'UTC', ...opciones }).format(new Date(`${fecha}T12:00:00Z`));

export function fechaValida(texto: string | undefined): string | null {
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const d = new Date(`${texto}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== texto ? null : texto;
}

// REQ-CUN01-15: un punto por cada dos compromisos, como mucho tres. Lo cancelado no cuenta: ya no ocupa el día.
export const puntosDe = (total: number) => Math.min(3, Math.ceil(total / 2));

function etiquetaZona(zona: string): string {
  const desfaseCorto = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value;
  return `Hora de ${ciudad(zona)} (${desfaseCorto ?? zona})`;
}

function aCompromiso(evento: EventoAgenda, zona: string): CompromisoDelDia {
  return {
    id: evento.id,
    titulo: evento.titulo,
    horario: evento.todoElDia ? 'Todo el día' : horario(evento, zona),
    enSuZona: evento.todoElDia || evento.zonaHoraria === zona ? null : `Hora de ${ciudad(evento.zonaHoraria)}: ${horario(evento, evento.zonaHoraria)}`,
    cancelado: evento.estado === 'cancelado',
    invitado: !evento.esOrganizador,
  };
}

// Los compromisos que tocan esa fecha, los de todo el día primero y luego por hora de inicio
function delDia(eventos: EventoAgenda[], fecha: string, zona: string): EventoAgenda[] {
  const desde = Date.parse(medianoche(fecha, zona));
  const hasta = Date.parse(medianoche(diaSiguiente(fecha), zona));
  return eventos
    .filter((e) => Date.parse(e.inicio) < hasta && Date.parse(e.fin) > desde)
    .sort((a, b) => Number(b.todoElDia) - Number(a.todoElDia) || Date.parse(a.inicio) - Date.parse(b.inicio));
}

async function leerEventos(desde: string, hasta: string, zona: string): Promise<EventoAgenda[] | Exclude<Agenda, { estado: 'lista' }>> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return { estado: 'error', mensaje: 'Tu sesión terminó. Vuelve a entrar.' };
  const consulta = new URLSearchParams({ desde: medianoche(desde, zona), hasta: medianoche(hasta, zona) });
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
  return eventos.data;
}

export async function obtenerAgenda(zona: string, vista: VistaAgenda): Promise<Agenda> {
  const hoy = fechaEn(Date.now(), zona);
  const fecha = vista.fecha ?? hoy;
  const base = { zona: etiquetaZona(zona), hoy };

  if (vista.nivel === 'semana') {
    const lunes = lunesDe(fecha);
    const eventos = await leerEventos(lunes, sumarDias(lunes, 7), zona);
    if (!Array.isArray(eventos)) return eventos;
    const domingo = sumarDias(lunes, 6);
    const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
    const titulo = mismoMes
      ? `${formatoFecha(lunes, { day: 'numeric' })} – ${formatoFecha(domingo, { day: 'numeric', month: 'long' })}`
      : `${formatoFecha(lunes, { day: 'numeric', month: 'long' })} – ${formatoFecha(domingo, { day: 'numeric', month: 'long' })}`;
    return {
      estado: 'lista',
      nivel: 'semana',
      ...base,
      titulo: `Semana del ${titulo}`,
      esActual: lunes === lunesDe(hoy),
      anterior: sumarDias(lunes, -7),
      siguiente: sumarDias(lunes, 7),
      dias: Array.from({ length: 7 }, (_, i) => {
        const dia = sumarDias(lunes, i);
        return {
          fecha: dia,
          nombre: formatoFecha(dia, { weekday: 'long', day: 'numeric', month: 'long' }),
          esHoy: dia === hoy,
          compromisos: delDia(eventos, dia, zona).map((e) => aCompromiso(e, zona)),
        };
      }),
    };
  }

  if (vista.nivel === 'mes') {
    const primero = primeroDeMes(fecha);
    const siguienteMes = mesDesplazado(primero, 1);
    const inicio = lunesDe(primero);
    const fin = sumarDias(lunesDe(sumarDias(siguienteMes, -1)), 7);
    const eventos = await leerEventos(inicio, fin, zona);
    if (!Array.isArray(eventos)) return eventos;
    const semanas: DiaDeMes[][] = [];
    for (let dia = inicio; dia < fin; dia = sumarDias(dia, 1)) {
      if (diaDeLaSemana(dia) === 0) semanas.push([]);
      const total = delDia(eventos, dia, zona).filter((e) => e.estado !== 'cancelado').length;
      const nombre = formatoFecha(dia, { weekday: 'long', day: 'numeric', month: 'long' });
      semanas.at(-1)!.push({
        fecha: dia,
        numero: Number(dia.slice(8)),
        delMes: dia.slice(0, 7) === primero.slice(0, 7),
        esHoy: dia === hoy,
        total,
        puntos: puntosDe(total),
        etiqueta: `${nombre}: ${total === 0 ? 'sin compromisos' : total === 1 ? '1 compromiso' : `${total} compromisos`}`,
      });
    }
    const titulo = formatoFecha(primero, { month: 'long', year: 'numeric' });
    return {
      estado: 'lista',
      nivel: 'mes',
      ...base,
      titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
      esActual: primero === primeroDeMes(hoy),
      anterior: mesDesplazado(primero, -1),
      siguiente: siguienteMes,
      semanas,
    };
  }

  const eventos = await leerEventos(fecha, diaSiguiente(fecha), zona);
  if (!Array.isArray(eventos)) return eventos;
  return {
    estado: 'lista',
    nivel: 'dia',
    ...base,
    fecha: formatoFecha(fecha, { weekday: 'long', day: 'numeric', month: 'long' }),
    fechaIso: fecha,
    esHoy: fecha === hoy,
    compromisos: delDia(eventos, fecha, zona).map((e) => aCompromiso(e, zona)),
  };
}
