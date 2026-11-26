import { describe, expect, it } from 'vitest';
import { direccionDeLista } from '../../src/integraciones/calendario/google-calendar';

// T-137 · P-REU-07 · D-REU-11: con el permiso `calendar.events`, la dirección de la cuenta sale de la lista de
// eventos. Lo encontró la prueba con Google real: `calendars/primary` respondía 403.
describe('calendario.direccion-de-google', () => {
  it('toma a quien organizó o creó un evento propio', () => {
    const cuerpo = {
      summary: 'Mi agenda',
      items: [
        { organizer: { email: 'otra@gmail.com' }, creator: { email: 'otra@gmail.com' } },
        { organizer: { email: 'grupo@group.calendar.google.com' }, creator: { email: 'yo@gmail.com', self: true } },
      ],
    };
    expect(direccionDeLista(cuerpo)).toBe('yo@gmail.com');
  });

  it('sin eventos propios, usa el nombre del calendario principal si es una dirección', () => {
    expect(direccionDeLista({ summary: 'yo@gmail.com', items: [] })).toBe('yo@gmail.com');
  });

  it('si la persona renombró su calendario y no tiene eventos propios, no inventa una dirección', () => {
    expect(direccionDeLista({ summary: 'Trabajo', items: [{ organizer: { email: 'otra@gmail.com' } }] })).toBeNull();
  });
});
