import { describe, expect, it } from 'vitest';
import { rangoDisponibilidadPorDefecto } from '../../src/equipos/rango-disponibilidad';

describe('CUN-05 - Rango de disponibilidad por defecto', () => {
  it('comienza manana en la zona horaria de Lima', () => {
    const ahora = new Date('2026-11-12T02:00:00Z');

    const resultado = rangoDisponibilidadPorDefecto(
      'America/Lima',
      ahora,
    );

    expect(resultado.desde.toISOString()).toBe(
      '2026-11-12T05:00:00.000Z',
    );

    expect(resultado.hasta.toISOString()).toBe(
      '2026-11-19T05:00:00.000Z',
    );
  });

  it('respeta el cambio al horario de verano en Nueva York', () => {
    const ahora = new Date('2026-03-07T17:00:00Z');

    const resultado = rangoDisponibilidadPorDefecto(
      'America/New_York',
      ahora,
    );

    expect(resultado.desde.toISOString()).toBe(
      '2026-03-08T05:00:00.000Z',
    );

    expect(resultado.hasta.toISOString()).toBe(
      '2026-03-15T04:00:00.000Z',
    );
  });

  it('mantiene un rango valido y ordenado', () => {
    const resultado = rangoDisponibilidadPorDefecto(
      'America/Lima',
      new Date('2026-11-11T15:00:00Z'),
    );

    expect(resultado.desde.getTime()).toBeLessThan(
      resultado.hasta.getTime(),
    );
  });

  it('respeta el retorno al horario de invierno en Nueva York', () => {
    const resultado = rangoDisponibilidadPorDefecto(
      'America/New_York',
      new Date('2026-10-31T17:00:00Z'),
    );

    expect(resultado.desde.toISOString()).toBe(
      '2026-11-01T04:00:00.000Z',
    );

    expect(resultado.hasta.toISOString()).toBe(
      '2026-11-08T05:00:00.000Z',
    );
  });

});
