import { describe, expect, it } from 'vitest';
import { periodoDe } from './periodo';

// T-081 · REQ-CUN02-25, 28 · H-JOR-02, H-JOR-08
describe('actividad.periodos', () => {
  // Sábado 7 de noviembre de 2026, 12:00 en Lima (GMT-5)
  const ahora = new Date('2026-11-07T17:00:00Z');
  const LIMA = 'America/Lima';

  it('Día sin fecha es hoy, de medianoche a medianoche en la zona, y no tiene siguiente', () => {
    const p = periodoDe('dia', undefined, LIMA, ahora);
    expect(p).toMatchObject({ fecha: '2026-11-07', primerDia: '2026-11-07', ultimoDia: '2026-11-07', hoy: '2026-11-07', anterior: '2026-11-06', siguiente: null, esActual: true, hastaAhora: true });
    expect(p.desde.toISOString()).toBe('2026-11-07T05:00:00.000Z');
    expect(p.hasta.toISOString()).toBe('2026-11-08T05:00:00.000Z');
  });

  it('un día pasado tiene siguiente y no es «hasta ahora»', () => {
    const p = periodoDe('dia', '2026-11-05', LIMA, ahora);
    expect(p).toMatchObject({ fecha: '2026-11-05', anterior: '2026-11-04', siguiente: '2026-11-06', esActual: false, hastaAhora: false });
  });

  it('Semana va de lunes a domingo aunque se pida otro día', () => {
    const p = periodoDe('semana', '2026-11-05', LIMA, ahora);
    expect(p).toMatchObject({ fecha: '2026-11-02', primerDia: '2026-11-02', ultimoDia: '2026-11-08', anterior: '2026-10-26', siguiente: null, esActual: true });
    expect(periodoDe('semana', '2026-10-28', LIMA, ahora)).toMatchObject({ primerDia: '2026-10-26', siguiente: '2026-11-02', esActual: false });
  });

  it('Mes va del 1 al último y cruza de año', () => {
    expect(periodoDe('mes', undefined, LIMA, ahora)).toMatchObject({ primerDia: '2026-11-01', ultimoDia: '2026-11-30', anterior: '2026-10-01', siguiente: null });
    expect(periodoDe('mes', '2026-01-20', LIMA, ahora)).toMatchObject({ primerDia: '2026-01-01', ultimoDia: '2026-01-31', anterior: '2025-12-01', siguiente: '2026-02-01' });
    expect(periodoDe('mes', '2028-02-10', LIMA, ahora)).toMatchObject({ ultimoDia: '2028-02-29' });
  });

  it('hoy depende de la zona del perfil', () => {
    // A las 17:00 UTC ya es domingo 8 en Kiritimati (GMT+14)
    expect(periodoDe('dia', undefined, 'Pacific/Kiritimati', ahora).hoy).toBe('2026-11-08');
  });

  it('un día con cambio de hora dura lo que dura en la zona', () => {
    // Madrid pasa de +02:00 a +01:00 el 25 de octubre de 2026: ese día tiene 25 horas
    const p = periodoDe('dia', '2026-10-25', 'Europe/Madrid', ahora);
    expect((p.hasta.getTime() - p.desde.getTime()) / 3600_000).toBe(25);
  });

  it('un período futuro no ofrece siguiente', () => {
    expect(periodoDe('dia', '2026-12-01', LIMA, ahora)).toMatchObject({ siguiente: null, esActual: false, hastaAhora: false });
  });
});
