import { describe, expect, it } from 'vitest';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

// REQ-CUN05-03, REQ-CUN05-04 y REQ-CUN05-06.
describe('CUN-05 - Duracion opcional', () => {
  const servicio = Object.create(
    DisponibilidadEquipoService.prototype,
  ) as DisponibilidadEquipoService;

  const fecha = (hora: string) =>
    new Date(`2026-11-12T${hora}:00-05:00`);

  const intervalo = (inicio: string, fin: string) => ({
    inicio: fecha(inicio),
    fin: fecha(fin),
  });

  const consultar = (duracion?: number) =>
    servicio.calcularDisponibilidadComun(
      fecha('08:00'),
      fecha('14:00'),
      [
        [
          intervalo('08:30', '09:00'),
          intervalo('13:00', '14:00'),
        ],
        [
          intervalo('09:45', '11:00'),
        ],
      ],
      duracion,
    );

  const minutos = (duracion?: number) =>
    consultar(duracion).map(
      (i) => (i.fin.getTime() - i.inicio.getTime()) / 60000,
    );

  it('devuelve los tres intervalos sin duracion indicada', () => {
    expect(minutos()).toEqual([30, 45, 120]);
  });

  it('conserva los intervalos iguales a la duracion minima', () => {
    expect(minutos(30)).toEqual([30, 45, 120]);
  });

  it('excluye intervalos inferiores a 45 minutos', () => {
    expect(minutos(45)).toEqual([45, 120]);
  });

  it('devuelve solo intervalos de al menos 60 minutos', () => {
    expect(minutos(60)).toEqual([120]);
  });

  it('acepta un intervalo exactamente igual a 120 minutos', () => {
    expect(minutos(120)).toEqual([120]);
  });

  it('no devuelve alternativas para una duracion superior', () => {
    expect(minutos(180)).toEqual([]);
  });

  it('ordena los intervalos por inicio ascendente', () => {
    expect(
      consultar().map((i) => i.inicio.toISOString()),
    ).toEqual([
      fecha('08:00').toISOString(),
      fecha('09:00').toISOString(),
      fecha('11:00').toISOString(),
    ]);
  });

  it('conserva los limites completos de cada intervalo', () => {
    expect(
      consultar().map((i) => [
        i.inicio.toISOString(),
        i.fin.toISOString(),
      ]),
    ).toEqual([
      [
        fecha('08:00').toISOString(),
        fecha('08:30').toISOString(),
      ],
      [
        fecha('09:00').toISOString(),
        fecha('09:45').toISOString(),
      ],
      [
        fecha('11:00').toISOString(),
        fecha('13:00').toISOString(),
      ],
    ]);
  });
});
