import { describe, expect, it } from 'vitest';
import { SaludRespuesta } from './plataforma';

describe('contratos.salud', () => {
  it('acepta la respuesta esperada', () => {
    expect(SaludRespuesta.parse({ estado: 'ok' })).toEqual({ estado: 'ok' });
  });

  it('rechaza campos de más', () => {
    expect(() => SaludRespuesta.parse({ estado: 'ok', extra: 1 })).toThrow();
  });
});
