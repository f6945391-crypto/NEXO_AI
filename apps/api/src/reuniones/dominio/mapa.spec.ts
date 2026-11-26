import { describe, expect, it } from 'vitest';
import { instanteLocal } from '../../agenda/dominio/tiempo';
import { equiposQueEncajan, nombreVisible, personaEncaja } from './grupo';
import { calcularMapa, calcularPropuestas, diasHabiles, rangoPorDefecto, type PersonaCalculo } from './mapa';

// T-131 · REQ-CUN06-03, 04, 05, 06, 08 · D-REU-02, 17, 18, 19, 21. Semana de referencia: lunes 30 de
// noviembre a viernes 4 de diciembre de 2026, en Lima (GMT-5) y Madrid (GMT+1).
const LIMA = 'America/Lima';
const MADRID = 'Europe/Madrid';
const LUNES = { anio: 2026, mes: 11, dia: 30 };
const MARTES = { anio: 2026, mes: 12, dia: 1 };
const VIERNES = { anio: 2026, mes: 12, dia: 4 };
const ANTES = new Date('2026-11-25T12:00:00Z');
const h = (dia: typeof LUNES, hhmm: string, zona = LIMA) => {
  const [hh, mm] = hhmm.split(':').map(Number);
  return instanteLocal(dia, hh! * 60 + mm!, zona);
};
const persona = (perfilId: string, ocupados: PersonaCalculo['ocupados'], opcional = false, zonaHoraria = LIMA): PersonaCalculo => ({
  perfilId,
  zonaHoraria,
  opcional,
  ocupados,
});

describe('reuniones.mapa', () => {
  it('cuenta solo los días hábiles y, sin días, toma los próximos cinco', () => {
    expect(diasHabiles(LUNES, { anio: 2026, mes: 12, dia: 6 })).toHaveLength(5);
    // Miércoles 25 de noviembre: del jueves 26 al miércoles 2 de diciembre
    const rango = rangoPorDefecto(new Date('2026-11-25T15:00:00Z'), LIMA);
    expect(rango.desde).toEqual({ anio: 2026, mes: 11, dia: 26 });
    expect(rango.hasta).toEqual({ anio: 2026, mes: 12, dia: 2 });
  });

  it('marca libre solo lo que cae en la banda de cada persona, en su zona', () => {
    const mapa = calcularMapa([LUNES], LIMA, null, [persona('lima', []), persona('madrid', [], false, MADRID)]);
    const franjas = mapa[0]!.franjas;
    expect(franjas).toHaveLength(24); // 08:00 a 20:00 cada media hora
    // 08:00 en Lima son las 14:00 en Madrid: libres los dos
    expect(franjas[0]!.libres).toEqual(['lima', 'madrid']);
    // 14:00 en Lima son las 20:00 en Madrid: fuera de su banda
    expect(franjas.find((f) => f.inicio.getTime() === h(LUNES, '14:00').getTime())!.libres).toEqual(['lima']);
  });

  it('no cuenta a quien no tiene datos', () => {
    const mapa = calcularMapa([LUNES], LIMA, null, [persona('ana', []), persona('beto', null)]);
    expect(mapa[0]!.franjas[0]!.libres).toEqual(['ana']);
  });

  it('la franja de la tarde empieza a las 13:00', () => {
    const mapa = calcularMapa([LUNES], LIMA, 'tarde', [persona('ana', [])]);
    expect(mapa[0]!.franjas[0]!.inicio).toEqual(h(LUNES, '13:00'));
    expect(mapa[0]!.franjas).toHaveLength(14);
  });
});

describe('reuniones.propuestas', () => {
  it('exige a los obligatorios, prefiere los opcionales libres y reparte en días distintos', () => {
    const ana = persona('ana', [{ inicio: h(LUNES, '08:00'), fin: h(LUNES, '10:00') }]);
    const beto = persona('beto', []);
    // Lucía, opcional, solo libre el martes desde las 15:00
    const lucia = persona('lucia', [{ inicio: h(LUNES, '00:00'), fin: h(MARTES, '15:00') }, { inicio: h({ anio: 2026, mes: 12, dia: 2 }, '00:00'), fin: h(VIERNES, '23:00') }], true);
    const propuestas = calcularPropuestas(diasHabiles(LUNES, VIERNES), LIMA, null, 60, [ana, beto, lucia], ANTES);
    expect(propuestas).toHaveLength(3);
    // Primero la que tiene a Lucía libre
    expect(propuestas[0]!.inicio).toEqual(h(MARTES, '15:00'));
    expect(propuestas[0]).toMatchObject({ libres: 3, de: 3, opcionalesLibres: 1 });
    // Después, la más cercana: el lunes a las 10:00, cuando Ana ya terminó
    expect(propuestas[1]!.inicio).toEqual(h(LUNES, '10:00'));
    const dias = propuestas.map((p) => p.inicio.toISOString().slice(0, 10));
    expect(new Set(dias).size).toBe(3);
  });

  it('no propone en el pasado ni fuera de la banda de nadie', () => {
    const madrid = persona('madrid', [], false, MADRID);
    const ahora = h(LUNES, '09:10');
    const propuestas = calcularPropuestas([LUNES], LIMA, null, 60, [persona('lima', []), madrid], ahora, 10);
    expect(propuestas[0]!.inicio).toEqual(h(LUNES, '09:30'));
    // Madrid termina a las 20:00 suyas, las 14:00 de Lima: la última empieza a las 13:00
    expect(propuestas.every((p) => p.fin <= h(LUNES, '14:00'))).toBe(true);
  });

  it('sin horario común no propone nada', () => {
    const beto = persona('beto', [{ inicio: h(LUNES, '00:00'), fin: h(VIERNES, '23:59') }]);
    expect(calcularPropuestas(diasHabiles(LUNES, VIERNES), LIMA, null, 60, [persona('ana', []), beto], ANTES)).toEqual([]);
  });

  it('un opcional ocupado no impide el horario', () => {
    const beto = persona('beto', [{ inicio: h(LUNES, '00:00'), fin: h(VIERNES, '23:59') }], true);
    const propuestas = calcularPropuestas([LUNES], LIMA, null, 60, [persona('ana', []), beto], ANTES);
    expect(propuestas[0]).toMatchObject({ libres: 1, de: 2, opcionalesLibres: 0 });
  });
});

describe('reuniones.grupo', () => {
  const equipos = [{ nombre: 'Proyecto Alfa' }, { nombre: 'Diseño' }, { nombre: 'Proyecto Beta' }];

  it('reconoce un proyecto como el nombre de un equipo', () => {
    expect(equiposQueEncajan('el proyecto Alfa', equipos)).toEqual([{ nombre: 'Proyecto Alfa' }]);
    expect(equiposQueEncajan('equipo Proyecto Alfa', equipos)).toEqual([{ nombre: 'Proyecto Alfa' }]);
    expect(equiposQueEncajan('diseno', equipos)).toEqual([{ nombre: 'Diseño' }]);
    expect(equiposQueEncajan('proyecto', equipos)).toHaveLength(2);
  });

  it('reconoce a una persona por su correo', () => {
    expect(personaEncaja('Ana', 'ana.perez@empresa.test')).toBe(true);
    expect(personaEncaja('Ana Pérez', 'ana.perez@empresa.test')).toBe(true);
    expect(personaEncaja('ana.perez@empresa.test', 'ana.perez@empresa.test')).toBe(true);
    expect(personaEncaja('Pérez', 'ana.perez@empresa.test')).toBe(false);
    expect(personaEncaja('Beto', 'ana@empresa.test')).toBe(false);
    expect(nombreVisible('ana.perez@empresa.test')).toBe('Ana Perez');
  });
});
