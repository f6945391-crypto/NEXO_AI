import { describe, expect, it } from 'vitest';
import { PrimerIngresoSolicitud, ZonaHoraria } from './acceso';

describe('contratos.zona-horaria', () => {
  // Nombres vigentes de IANA que Intl.supportedValuesOf omite: tienen que aceptarse igual.
  it.each(['America/Lima', 'Europe/Madrid', 'America/Argentina/Buenos_Aires', 'Asia/Kolkata', 'UTC'])('acepta %s', (zona) => {
    expect(ZonaHoraria.safeParse(zona).success).toBe(true);
  });

  it.each(['+05:00', 'Etc/GMT+5', 'Etc/GMT-5', 'GMT-5', 'Marte/Base', 'america/lima', ''])('rechaza %s', (zona) => {
    expect(ZonaHoraria.safeParse(zona).success).toBe(false);
  });
});

describe('contratos.primer-ingreso', () => {
  it('exige al menos 12 caracteres en la contraseña nueva (H-ACC-02)', () => {
    expect(PrimerIngresoSolicitud.safeParse({ contrasenaNueva: 'corta', zonaHoraria: 'America/Lima' }).success).toBe(false);
    expect(PrimerIngresoSolicitud.safeParse({ contrasenaNueva: 'doce-caracte', zonaHoraria: 'America/Lima' }).success).toBe(true);
  });

  it('no admite campos de más, como una franja horaria (R-44)', () => {
    const conFranja = { contrasenaNueva: 'una-contrasena-larga', zonaHoraria: 'America/Lima', franja: '08-20' };
    expect(PrimerIngresoSolicitud.safeParse(conFranja).success).toBe(false);
  });
});
