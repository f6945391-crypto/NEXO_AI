import type { CompromisoListado, EventoAgenda, ListaAgenda } from '@nexoai/contratos';
import type { FechaLocal } from '../../agenda/dominio/tiempo';
import { horario, nombreDeZona } from '../../agenda/formato';

// REQ-CUN01-13 · T-031. La respuesta a «¿qué tengo mañana?» la arma el código con los compromisos de la
// réplica, tal como están: ni el modelo añade uno que no existe ni se le olvida uno que existe.

const ciudad = (zona: string) => (zona.split('/').pop() ?? zona).replaceAll('_', ' ');
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export const diaLargo = (fecha: FechaLocal) =>
  new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia, 12)),
  );

const diaDeInstante = (instante: Date, zona: string) =>
  new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(instante);

const iguales = (a: FechaLocal, b: FechaLocal) => a.anio === b.anio && a.mes === b.mes && a.dia === b.dia;

export function describirRango(desde: FechaLocal, hasta: FechaLocal, horaDesde?: string, horaHasta?: string): string {
  const dias = iguales(desde, hasta) ? mayuscula(diaLargo(desde)) : `Del ${diaLargo(desde)} al ${diaLargo(hasta)}`;
  if (horaDesde && horaHasta) return `${dias}, de ${horaDesde} a ${horaHasta}`;
  if (horaDesde) return `${dias}, desde las ${horaDesde}`;
  if (horaHasta) return `${dias}, hasta las ${horaHasta}`;
  return dias;
}

export function armarLista(eventos: EventoAgenda[], zona: string, rango: string, ahora = new Date()): ListaAgenda {
  // Por día, y dentro de cada día los de todo el día primero, como en el calendario
  const ordenados = [...eventos].sort(
    (a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || Number(b.todoElDia) - Number(a.todoElDia),
  );
  const compromisos: CompromisoListado[] = ordenados.map((e) => {
    const inicio = new Date(e.inicio);
    const fin = new Date(e.fin);
    return {
      id: e.id,
      titulo: e.titulo,
      dia: mayuscula(diaDeInstante(inicio, e.todoElDia ? e.zonaHoraria : zona)),
      horario: e.todoElDia ? 'Todo el día' : horario(inicio, fin, zona),
      enSuZona: e.todoElDia || e.zonaHoraria === zona ? null : `Hora de ${ciudad(e.zonaHoraria)}: ${horario(inicio, fin, e.zonaHoraria)}`,
      cancelado: e.estado === 'cancelado',
      invitado: !e.esOrganizador,
    };
  });
  return { rango, zona: nombreDeZona(zona, ahora), compromisos };
}
