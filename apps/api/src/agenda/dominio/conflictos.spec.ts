import { describe, expect, it } from 'vitest';
import { detectarConflictos, generarAlternativas, type EventoParaConflictos } from './conflictos';
import { instanteLocal } from './tiempo';

// T-016 · REQ-CUN01-02, REQ-CUN01-05 · DP-02, H-AG-03
// Calendario de referencia: el viernes 23 de octubre de 2026; el lunes siguiente es el 26.
const LIMA = 'America/Lima';
const VIERNES = { anio: 2026, mes: 10, dia: 23 };
const LUNES = { anio: 2026, mes: 10, dia: 26 };
const ANTES = new Date('2026-10-01T00:00:00Z');

const h = (hhmm: string) => {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh! * 60 + mm!;
};
const en = (fecha: typeof VIERNES, hhmm: string, zona = LIMA) => instanteLocal(fecha, h(hhmm), zona);

let n = 0;
function evento(fecha: typeof VIERNES, desde: string, hasta: string, extra: Partial<EventoParaConflictos> = {}): EventoParaConflictos {
  return { id: `e${++n}`, inicio: en(fecha, desde), fin: en(fecha, hasta), todoElDia: false, estado: 'confirmado', ...extra };
}

// Representa cada alternativa como «AAAA-MM-DD HH:MM–HH:MM» en hora de Lima, para leer los casos.
function ver(intervalos: { inicio: Date; fin: Date }[], zona = LIMA) {
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: zona, dateStyle: 'short', timeStyle: 'short' });
  return intervalos.map((i) => `${f.format(i.inicio)}–${f.format(i.fin).slice(11)}`);
}

const pedido = (fecha: typeof VIERNES, desde: string, hasta: string) => ({ inicio: en(fecha, desde), fin: en(fecha, hasta) });

describe('alternativas.dp02', () => {
  it('detecta el evento que causa el conflicto', () => {
    const comite = evento(VIERNES, '10:00', '11:00');
    expect(detectarConflictos([comite], pedido(VIERNES, '10:30', '11:30'))).toEqual([comite]);
  });

  it('dos eventos que solo se tocan no chocan', () => {
    const comite = evento(VIERNES, '10:00', '11:00');
    expect(detectarConflictos([comite], pedido(VIERNES, '11:00', '12:00'))).toEqual([]);
  });

  it('no chocan los eventos cancelados, los de todo el día (H-AG-03) ni el que se está modificando', () => {
    const cancelado = evento(VIERNES, '10:00', '11:00', { estado: 'cancelado' });
    const todoElDia = evento(VIERNES, '00:00', '23:59', { todoElDia: true });
    const propio = evento(VIERNES, '10:00', '11:00');
    expect(detectarConflictos([cancelado, todoElDia, propio], pedido(VIERNES, '10:00', '11:00'), propio.id)).toEqual([]);
  });

  it('1 y 3 · misma duración, el mismo día primero y por cercanía a la hora pedida', () => {
    const alternativas = generarAlternativas([evento(VIERNES, '10:00', '11:00')], pedido(VIERNES, '10:00', '11:00'), {
      zonaHoraria: LIMA,
      ahora: ANTES,
    });
    expect(ver(alternativas)).toEqual(['2026-10-23 09:00–10:00', '2026-10-23 11:00–12:00', '2026-10-23 08:00–09:00']);
  });

  it('2 · solo dentro de la banda horaria de 08:00 a 20:00', () => {
    const alternativas = generarAlternativas([evento(VIERNES, '18:00', '20:00')], pedido(VIERNES, '19:00', '20:30'), {
      zonaHoraria: LIMA,
      ahora: ANTES,
    });
    expect(ver(alternativas)).toEqual(['2026-10-23 16:30–18:00', '2026-10-23 15:00–16:30', '2026-10-23 13:30–15:00']);
  });

  it('4 · si el viernes está lleno, salta el fin de semana y sigue el lunes desde la misma hora', () => {
    const alternativas = generarAlternativas([evento(VIERNES, '08:00', '20:00')], pedido(VIERNES, '10:00', '11:00'), {
      zonaHoraria: LIMA,
      ahora: ANTES,
    });
    expect(ver(alternativas)).toEqual(['2026-10-26 10:00–11:00', '2026-10-26 09:00–10:00', '2026-10-26 11:00–12:00']);
  });

  it('5 · como mucho siete días adelante, y nunca más de tres', () => {
    const lleno = (dias: number[]) =>
      dias.map((d) => evento({ anio: 2026, mes: 10, dia: d }, '08:00', '20:00'));
    // Ocupados los días hábiles del 23 al 30: el 30 es el día 7 y ya no queda nada.
    const sinHueco = generarAlternativas(lleno([23, 26, 27, 28, 29, 30]), pedido(VIERNES, '10:00', '11:00'), {
      zonaHoraria: LIMA,
      ahora: ANTES,
    });
    expect(sinHueco).toEqual([]);
    // Libre solo el día 7: entran sus tres mejores horarios.
    const soloElUltimo = generarAlternativas(lleno([23, 26, 27, 28, 29]), pedido(VIERNES, '10:00', '11:00'), {
      zonaHoraria: LIMA,
      ahora: ANTES,
    });
    expect(ver(soloElUltimo)).toEqual(['2026-10-30 10:00–11:00', '2026-10-30 09:00–10:00', '2026-10-30 11:00–12:00']);
  });

  it('6 · un evento de todo el día no bloquea las alternativas', () => {
    const alternativas = generarAlternativas(
      [evento(VIERNES, '10:00', '11:00'), evento(VIERNES, '00:00', '23:59', { todoElDia: true })],
      pedido(VIERNES, '10:00', '11:00'),
      { zonaHoraria: LIMA, ahora: ANTES },
    );
    expect(alternativas).toHaveLength(3);
    expect(ver(alternativas)[0]).toBe('2026-10-23 09:00–10:00');
  });

  it('7 · nunca propone un horario que ya pasó', () => {
    const alternativas = generarAlternativas([evento(VIERNES, '10:00', '11:00')], pedido(VIERNES, '10:00', '11:00'), {
      zonaHoraria: LIMA,
      ahora: en(VIERNES, '10:30'),
    });
    expect(ver(alternativas)).toEqual(['2026-10-23 11:00–12:00', '2026-10-23 12:00–13:00', '2026-10-23 13:00–14:00']);
  });

  it('respeta la hora local aunque cambie el horario de verano por el camino', () => {
    // En Madrid el horario de verano termina el domingo 25: el viernes es UTC+2 y el lunes UTC+1.
    const madrid = 'Europe/Madrid';
    const ocupado: EventoParaConflictos = {
      id: 'madrid',
      inicio: instanteLocal(VIERNES, h('08:00'), madrid),
      fin: instanteLocal(VIERNES, h('20:00'), madrid),
      todoElDia: false,
      estado: 'confirmado',
    };
    const [primera] = generarAlternativas(
      [ocupado],
      { inicio: instanteLocal(VIERNES, h('10:00'), madrid), fin: instanteLocal(VIERNES, h('11:00'), madrid) },
      { zonaHoraria: madrid, ahora: ANTES },
    );
    expect(primera!.inicio.toISOString()).toBe('2026-10-26T09:00:00.000Z');
    expect(instanteLocal(LUNES, h('10:00'), madrid).toISOString()).toBe('2026-10-26T09:00:00.000Z');
  });

  it('si la duración no cabe en la banda, no hay alternativas', () => {
    expect(generarAlternativas([], pedido(VIERNES, '06:00', '20:00'), { zonaHoraria: LIMA, ahora: ANTES })).toEqual([]);
  });
});
