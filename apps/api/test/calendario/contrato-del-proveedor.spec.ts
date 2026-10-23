import { describe, expect, it } from 'vitest';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { contratoDelProveedor } from '../../src/integraciones/calendario/contrato';
import { SincronizacionCaducada } from '../../src/integraciones/calendario/proveedor-calendario';

// T-013 · AD-10. Los mismos pasos se ejecutan contra Google con `probar-calendario` (ver tasks.md).

const quien = { perfilId: 'perfil-1', organizacionId: 'organizacion-1' };

describe('calendario.contrato-del-proveedor', () => {
  describe('implementación simulada', () => {
    const proveedor = new ProveedorCalendarioSimulado();
    proveedor.sembrar(quien.perfilId, {
      titulo: 'Ya estaba',
      inicio: new Date('2026-10-23T15:00:00Z'),
      fin: new Date('2026-10-23T16:00:00Z'),
      zonaHoraria: 'America/Lima',
    });
    const { pasos } = contratoDelProveedor(proveedor, quien, new Date('2026-10-22T12:00:00Z'));
    for (const paso of pasos) it(paso.nombre, () => paso.ejecutar());
  });

  it('un token caducado obliga a leer desde cero', async () => {
    const proveedor = new ProveedorCalendarioSimulado();
    const { syncToken } = await proveedor.listar(quien, { tipo: 'completa', desde: new Date(0), hasta: new Date('2100-01-01') });
    proveedor.caducarTokens(quien.perfilId);
    await expect(proveedor.listar(quien, { tipo: 'incremental', syncToken })).rejects.toBeInstanceOf(SincronizacionCaducada);
  });

  it('cada persona ve solo su calendario', async () => {
    const proveedor = new ProveedorCalendarioSimulado();
    proveedor.sembrar('otra', { titulo: 'Ajeno', inicio: new Date('2026-10-23T15:00:00Z'), fin: new Date('2026-10-23T16:00:00Z'), zonaHoraria: 'UTC' });
    const r = await proveedor.listar(quien, { tipo: 'completa', desde: new Date(0), hasta: new Date('2100-01-01') });
    expect(r.cambios).toEqual([]);
  });

  it('cuenta lecturas y escrituras, pero no lo que se hace directamente en Google', async () => {
    const proveedor = new ProveedorCalendarioSimulado();
    const e = proveedor.sembrar(quien.perfilId, { titulo: 'A', inicio: new Date('2026-10-23T15:00:00Z'), fin: new Date('2026-10-23T16:00:00Z'), zonaHoraria: 'UTC' });
    proveedor.borrarEnGoogle(quien.perfilId, e.id);
    await proveedor.listar(quien, { tipo: 'completa', desde: new Date(0), hasta: new Date('2100-01-01') });
    await proveedor.cancelar(quien, e.id);
    expect(proveedor.llamadas).toEqual({ lecturas: 1, escrituras: 1 });
  });
});
