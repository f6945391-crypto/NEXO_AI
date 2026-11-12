import { describe, expect, it } from 'vitest';
import { aplicarCambio, type DatosTarea } from '../../src/tareas/dominio/cambios';
import { clasificarFranja, estaAtrasada, hoyEnZona, ordenarFranja } from '../../src/tareas/dominio/franjas';

// T-047 · REQ-CUN03-03 · decisiones 3 y 4. Funciones puras: sin base de datos ni modelo.

describe('tareas.franjas-y-atrasadas', () => {
  it('clasifica en las tres franjas; «esperando» gana aunque tenga fecha', () => {
    expect(clasificarFranja({ fecha: '2026-11-14', esperaDe: null })).toBe('con_fecha');
    expect(clasificarFranja({ fecha: null, esperaDe: null })).toBe('sin_fecha');
    expect(clasificarFranja({ fecha: null, esperaDe: 'Marta' })).toBe('esperando');
    expect(clasificarFranja({ fecha: '2026-11-14', esperaDe: 'Marta' })).toBe('esperando');
  });

  it('está atrasada solo si es pendiente y su día ya pasó; hoy no, sin fecha nunca', () => {
    expect(estaAtrasada({ estado: 'pendiente', fecha: '2026-11-10' }, '2026-11-11')).toBe(true);
    expect(estaAtrasada({ estado: 'pendiente', fecha: '2026-11-11' }, '2026-11-11')).toBe(false);
    expect(estaAtrasada({ estado: 'pendiente', fecha: '2026-11-12' }, '2026-11-11')).toBe(false);
    expect(estaAtrasada({ estado: 'pendiente', fecha: null }, '2026-11-11')).toBe(false);
    expect(estaAtrasada({ estado: 'completada', fecha: '2026-11-01' }, '2026-11-11')).toBe(false);
    expect(estaAtrasada({ estado: 'cancelada', fecha: '2026-11-01' }, '2026-11-11')).toBe(false);
  });

  it('«hoy» es el día del calendario en la zona de la persona, también cerca de la medianoche', () => {
    // 03:30 UTC del día 12 son las 22:30 del día 11 en Lima
    const instante = new Date('2026-11-12T03:30:00Z');
    expect(hoyEnZona(instante, 'America/Lima')).toBe('2026-11-11');
    expect(hoyEnZona(instante, 'UTC')).toBe('2026-11-12');
    expect(hoyEnZona(instante, 'Asia/Tokyo')).toBe('2026-11-12');
  });

  it('ordena «con fecha» de la más próxima a la más lejana, con hora antes que sin hora, y las demás por la más reciente', () => {
    const t = (fecha: string | null, hora: string | null, creada: string) => ({ fecha, hora, creadaEn: new Date(creada), n: `${fecha}-${hora}-${creada}` });
    const con = [
      t('2026-11-14', null, '2026-11-01T00:00:00Z'),
      t('2026-11-09', null, '2026-11-02T00:00:00Z'),
      t('2026-11-14', '09:00', '2026-11-03T00:00:00Z'),
      t('2026-11-12', null, '2026-11-04T00:00:00Z'),
    ];
    expect(ordenarFranja('con_fecha', con).map((x) => [x.fecha, x.hora])).toEqual([
      ['2026-11-09', null], // la atrasada, primero
      ['2026-11-12', null],
      ['2026-11-14', '09:00'],
      ['2026-11-14', null],
    ]);
    const sin = [t(null, null, '2026-11-01T00:00:00Z'), t(null, null, '2026-11-05T00:00:00Z'), t(null, null, '2026-11-03T00:00:00Z')];
    expect(ordenarFranja('sin_fecha', sin).map((x) => x.creadaEn.toISOString().slice(0, 10))).toEqual(['2026-11-05', '2026-11-03', '2026-11-01']);
    expect(ordenarFranja('esperando', sin)[0]!.creadaEn.toISOString()).toBe('2026-11-05T00:00:00.000Z');
  });

  it('no modifica la lista que recibe', () => {
    const lista = [
      { fecha: '2026-11-14', hora: null, creadaEn: new Date(0) },
      { fecha: '2026-11-01', hora: null, creadaEn: new Date(0) },
    ];
    ordenarFranja('con_fecha', lista);
    expect(lista.map((x) => x.fecha)).toEqual(['2026-11-14', '2026-11-01']);
  });
});

describe('tareas.cambios', () => {
  const antes: DatosTarea = { titulo: 'Pagar el recibo', fecha: '2026-11-14', hora: '09:00', esperaDe: null, esperaQue: null };

  it('pospone, cambia el texto y conserva lo que no se toca', () => {
    expect(aplicarCambio(antes, { fecha: '2026-11-17' })).toEqual({ tipo: 'ok', despues: { ...antes, fecha: '2026-11-17' } });
    expect(aplicarCambio(antes, { titulo: 'Pagar la luz' })).toEqual({ tipo: 'ok', despues: { ...antes, titulo: 'Pagar la luz' } });
  });

  it('«quítale la fecha» quita también la hora, que no existe sin fecha', () => {
    expect(aplicarCambio(antes, { fecha: null })).toEqual({ tipo: 'ok', despues: { ...antes, fecha: null, hora: null } });
  });

  it('rechaza una hora sin fecha y una espera a medias', () => {
    expect(aplicarCambio({ ...antes, fecha: null, hora: null }, { hora: '10:00' })).toMatchObject({ tipo: 'invalido' });
    expect(aplicarCambio(antes, { esperaDe: 'Marta' })).toMatchObject({ tipo: 'invalido' });
    expect(aplicarCambio(antes, { esperaDe: 'Marta', esperaQue: 'el contrato' })).toMatchObject({ tipo: 'ok' });
  });
});
