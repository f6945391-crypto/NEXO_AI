import { describe, expect, it } from 'vitest';
import { ConsultaActividad, FechaCalendario } from './actividad';

// T-080 · REQ-CUN02-25
describe('actividad.consulta-valida-nivel-y-fecha', () => {
  it('sin nada, es el nivel Día de hoy', () => {
    expect(ConsultaActividad.parse({})).toEqual({ nivel: 'dia' });
  });

  it.each(['dia', 'semana', 'mes'])('acepta el nivel %s', (nivel) => {
    expect(ConsultaActividad.safeParse({ nivel, fecha: '2026-11-07' }).success).toBe(true);
  });

  it.each(['hoy', 'anio', ''])('rechaza el nivel «%s»', (nivel) => {
    expect(ConsultaActividad.safeParse({ nivel }).success).toBe(false);
  });

  it.each(['2026-02-30', '2026-13-01', '7/11/2026', '2026-11-7', '2026-11-07T00:00:00Z'])('rechaza la fecha %s', (fecha) => {
    expect(FechaCalendario.safeParse(fecha).success).toBe(false);
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(FechaCalendario.safeParse('2028-02-29').success).toBe(true);
  });

  it('no admite campos de más', () => {
    expect(ConsultaActividad.safeParse({ nivel: 'dia', desde: '2026-11-01' }).success).toBe(false);
  });
});
