'use server';

import { cookies } from 'next/headers';
import { Actividad, type CompromisoOcurrido, type NivelActividad } from '@nexoai/contratos';
import { COOKIE_ACCESO, llamarApi, mensajeDeError } from '../../lib/sesion';

// T-082 · REQ-CUN02-25 a 30, 33, 34 · specs/02-jornada/plan.md §5. Lee GET /actividad con la sesión y devuelve
// el texto ya formateado en la zona del perfil, como hace la agenda (lib/agenda.ts): el navegador recibe frases,
// no instantes. La sección elige el nivel en el cliente, por eso es una función de servidor y no la página.

export type ElementoCompromiso = { id: string; horario: string; titulo: string; duracion: string | null; enSuZona: string | null };
export type ElementoAccion = { id: string; hora: string; descripcion: string; datos: { etiqueta: string; valor: string }[]; desde: string };
export type Grupo<T> = { fecha: string; nombre: string; elementos: T[] };

export type VistaActividad =
  | {
      estado: 'lista';
      nivel: NivelActividad;
      fecha: string;
      titulo: string;
      zona: string;
      esActual: boolean;
      hastaAhora: boolean;
      anterior: string;
      siguiente: string | null;
      // «hoy», «ese día», «esta semana»…: para los textos de vacío
      periodo: string;
      calendario: Actividad['calendario'];
      compromisos: { total: number; grupos: Grupo<ElementoCompromiso>[] };
      registro: { total: number; grupos: Grupo<ElementoAccion>[] };
    }
  | { estado: 'error'; mensaje: string };

const ciudad = (zona: string) => (zona.split('/').pop() ?? zona).replaceAll('_', ' ');
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
// Una fecha de calendario se formatea a mediodía UTC para que no se corra de día
const formatoFecha = (fecha: string, opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es', { timeZone: 'UTC', ...opciones }).format(new Date(`${fecha}T12:00:00Z`));
const reloj = (zona: string) => new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function etiquetaZona(zona: string): string {
  const corto = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value;
  return `Hora de ${ciudad(zona)} (${corto ?? zona})`;
}

const sumarDias = (fecha: string, dias: number) => new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 24 * 3600_000).toISOString().slice(0, 10);

function tituloDe(a: Actividad): string {
  if (a.nivel === 'dia') return mayuscula(formatoFecha(a.fecha, { weekday: 'long', day: 'numeric', month: 'long' }));
  if (a.nivel === 'mes') return mayuscula(formatoFecha(a.fecha, { month: 'long', year: 'numeric' }));
  const domingo = sumarDias(a.primerDia, 6);
  const desde = a.primerDia.slice(0, 7) === domingo.slice(0, 7) ? formatoFecha(a.primerDia, { day: 'numeric' }) : formatoFecha(a.primerDia, { day: 'numeric', month: 'long' });
  return `Semana del ${desde} – ${formatoFecha(domingo, { day: 'numeric', month: 'long' })}`;
}

function periodoDe(a: Actividad): string {
  if (a.nivel === 'dia') return a.esActual ? 'hoy' : 'ese día';
  if (a.nivel === 'semana') return a.esActual ? 'esta semana' : 'esa semana';
  return a.esActual ? 'este mes' : 'ese mes';
}

// «1 h», «45 min», «1 h 30 min»
function duracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

function aCompromiso(c: CompromisoOcurrido, zona: string): ElementoCompromiso {
  const horario = (z: string) => `${reloj(z).format(new Date(c.inicio))} – ${reloj(z).format(new Date(c.fin))}`;
  return {
    id: c.id,
    titulo: c.titulo,
    horario: c.todoElDia ? 'Todo el día' : horario(zona),
    duracion: c.todoElDia ? null : duracion(c.duracionMinutos),
    enSuZona: c.todoElDia || c.zonaHoraria === zona ? null : `Hora de ${ciudad(c.zonaHoraria)}: ${horario(c.zonaHoraria)}`,
  };
}

// REQ-CUN02-33: en Día, un solo grupo; en Semana y Mes, uno por día con algo, en orden
function agrupar<T, E extends { dia: string }>(elementos: E[], convertir: (e: E) => T): Grupo<T>[] {
  const grupos = new Map<string, T[]>();
  for (const e of elementos) grupos.set(e.dia, [...(grupos.get(e.dia) ?? []), convertir(e)]);
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, lista]) => ({ fecha, nombre: mayuscula(formatoFecha(fecha, { weekday: 'long', day: 'numeric', month: 'long' })), elementos: lista }));
}

// H-JOR-07: desde dónde se pidió, en palabras llanas
const DESDE = { agente: 'En la conversación', control_directo: 'Desde la pantalla' } as const;

export async function leerActividad(nivel: NivelActividad, fecha: string | null): Promise<VistaActividad> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) return { estado: 'error', mensaje: 'Tu sesión terminó. Vuelve a entrar.' };
  const consulta = new URLSearchParams({ nivel, ...(fecha ? { fecha } : {}) });
  let respuesta;
  try {
    respuesta = await llamarApi(`/actividad?${consulta}`, { token: acceso });
  } catch {
    return { estado: 'error', mensaje: 'No pudimos conectar con NexoAI para leer tu actividad.' };
  }
  const leida = Actividad.safeParse(respuesta.cuerpo);
  if (respuesta.estado !== 200 || !leida.success) {
    return { estado: 'error', mensaje: mensajeDeError(respuesta.cuerpo, 'NexoAI no respondió como esperábamos. Inténtalo de nuevo en un momento.') };
  }
  const a = leida.data;
  const zona = a.zonaHoraria;
  return {
    estado: 'lista',
    nivel: a.nivel,
    fecha: a.fecha,
    titulo: tituloDe(a),
    zona: etiquetaZona(zona),
    esActual: a.esActual,
    hastaAhora: a.hastaAhora,
    anterior: a.anterior,
    siguiente: a.siguiente,
    periodo: periodoDe(a),
    calendario: a.calendario,
    compromisos: { total: a.compromisos.length, grupos: agrupar(a.compromisos, (c) => aCompromiso(c, zona)) },
    registro: {
      total: a.registro.length,
      grupos: agrupar(a.registro, (r) => ({ id: r.id, hora: reloj(zona).format(new Date(r.ejecutadaEn)), descripcion: r.descripcion, datos: r.datos, desde: DESDE[r.origen] })),
    },
  };
}
