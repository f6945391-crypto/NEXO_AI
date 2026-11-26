import { describe, expect, it, vi } from 'vitest';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

describe('CUN-05 - Revocacion de consentimiento', () => {
  it('no confirma disponibilidad y registra al integrante que revoca durante la consulta', async () => {
    const contexto = {
      perfilId: 'usuario-1',
      organizacionId: 'organizacion-1',
      rol: 'gerente' as const,
      plan: 'empresarial' as const,
      primerIngresoPendiente: false,
    };

    const equipoId = '11111111-1111-4111-8111-111111111111';
    const desde = new Date('2026-11-12T08:00:00-05:00');
    const hasta = new Date('2026-11-12T20:00:00-05:00');

    const integrante = {
      perfilId: 'integrante-1',
      estadoConsentimiento: 'concedida',
    };

    const integranteRevocado = {
      perfilId: 'integrante-1',
      estadoConsentimiento: 'revocada',
    };

    const equipos = {
      verificarMembresia: vi.fn().mockResolvedValue(undefined),
      integrantes: vi.fn()
        .mockResolvedValueOnce([integrante])
        .mockResolvedValueOnce([integranteRevocado]),
    };

    const prisma = {
      deOrganizacion: vi.fn().mockReturnValue({
        perfilUsuario: {
          findFirst: vi.fn().mockResolvedValue({
            zonaHoraria: 'America/Lima',
          }),
        },
      }),
    };

    const servicio = new DisponibilidadEquipoService(
      prisma as never,
      {} as never,
      {} as never,
      equipos as never,
    );

    vi.spyOn(servicio, 'verificarCalendario')
      .mockResolvedValue(true);

    vi.spyOn(servicio, 'obtenerOcupados')
      .mockResolvedValue([]);

    const resultado = await servicio.consultarEquipo(
      contexto,
      equipoId,
      desde,
      hasta,
      undefined,
      'normal',
    );

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.intervalos).toEqual([]);
    expect(resultado.participantesSinDatos).toContain(
      'integrante-1',
    );
    expect(resultado.advertencia).toContain(
      'No se puede confirmar la disponibilidad',
    );

    expect(equipos.integrantes).toHaveBeenCalledTimes(2);
  });
});
