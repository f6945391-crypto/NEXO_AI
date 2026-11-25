import { describe, expect, it } from 'vitest';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

describe('CUN-05 - Disponibilidad común', () => {
  const servicio = Object.create(
    DisponibilidadEquipoService.prototype,
  ) as DisponibilidadEquipoService;

  it('encuentra los intervalos libres entre eventos ocupados', () => {
    const desde = new Date('2026-11-12T08:00:00-05:00');
    const hasta = new Date('2026-11-12T20:00:00-05:00');

    const resultado = servicio.calcularDisponibilidadComun(
      desde,
      hasta,
      [
        [
          {
            inicio: new Date('2026-11-12T09:00:00-05:00'),
            fin: new Date('2026-11-12T10:00:00-05:00'),
          },
        ],
        [
          {
            inicio: new Date('2026-11-12T14:00:00-05:00'),
            fin: new Date('2026-11-12T15:00:00-05:00'),
          },
        ],
      ],
      30,
    );

    expect(
      resultado.map((intervalo) => [
        intervalo.inicio.toISOString(),
        intervalo.fin.toISOString(),
      ]),
    ).toEqual([
      ['2026-11-12T13:00:00.000Z', '2026-11-12T14:00:00.000Z'],
      ['2026-11-12T15:00:00.000Z', '2026-11-12T19:00:00.000Z'],
      ['2026-11-12T20:00:00.000Z', '2026-11-13T01:00:00.000Z'],
    ]);
  });
});

describe('CUN-05 - Reglas de bandas horarias', () => {
  const servicio = Object.create(
    DisponibilidadEquipoService.prototype,
  ) as DisponibilidadEquipoService;

  const intervalo = (inicio: string, fin: string) => ({
    inicio: new Date(inicio),
    fin: new Date(fin),
  });

  it('recorta un intervalo a la banda normal 08:00-20:00', () => {
    const resultado = servicio.aplicarBandaHoraria(
      [
        intervalo(
          '2026-11-12T07:00:00-05:00',
          '2026-11-12T21:00:00-05:00',
        ),
      ],
      'America/Lima',
      'normal',
    );

    expect(resultado).toEqual([
      intervalo(
        '2026-11-12T08:00:00-05:00',
        '2026-11-12T20:00:00-05:00',
      ),
    ]);
  });

  it('permite hasta las 22:00 con solicitud extendida', () => {
    const resultado = servicio.aplicarBandaHoraria(
      [
        intervalo(
          '2026-11-12T19:00:00-05:00',
          '2026-11-12T23:00:00-05:00',
        ),
      ],
      'America/Lima',
      'extendida',
    );

    expect(resultado).toEqual([
      intervalo(
        '2026-11-12T19:00:00-05:00',
        '2026-11-12T22:00:00-05:00',
      ),
    ]);
  });

  it('permite horarios nocturnos cuando se solicitan explícitamente', () => {
    const resultado = servicio.aplicarBandaHoraria(
      [
        intervalo(
          '2026-11-12T23:00:00-05:00',
          '2026-11-12T23:30:00-05:00',
        ),
      ],
      'America/Lima',
      'fueraDeBanda',
    );

    expect(resultado).toEqual([
      intervalo(
        '2026-11-12T23:00:00-05:00',
        '2026-11-12T23:30:00-05:00',
      ),
    ]);
  });
});
