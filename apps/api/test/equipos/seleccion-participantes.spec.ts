import { describe, expect, it, vi } from 'vitest';

import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

describe('CUN-05 - Seleccion de participantes', () => {
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

  function crearServicio() {
    const integrantes = [
      { perfilId: 'integrante-1', estadoConsentimiento: 'concedida' },
      { perfilId: 'integrante-2', estadoConsentimiento: 'concedida' },
    ];

    const equipos = {
      verificarMembresia: vi.fn().mockResolvedValue(undefined),
      integrantes: vi.fn().mockResolvedValue(integrantes),
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

    const verificarCalendario = vi.spyOn(
      servicio,
      'verificarCalendario',
    ).mockResolvedValue(true);

    const obtenerOcupados = vi.spyOn(
      servicio,
      'obtenerOcupados',
    ).mockResolvedValue([]);

    return { servicio, verificarCalendario, obtenerOcupados };
  }

  it('consulta solo los integrantes seleccionados', async () => {
    const { servicio, obtenerOcupados } = crearServicio();

    const resultado = await servicio.consultarEquipo(
      contexto, equipoId, desde, hasta,
      undefined, 'normal', ['integrante-1'],
    );

    expect(resultado.disponibilidadCompleta).toBe(true);
    expect(resultado.participantesConsultados).toBe(1);
    expect(obtenerOcupados).toHaveBeenCalledTimes(1);
    expect(obtenerOcupados).toHaveBeenCalledWith(
      contexto.organizacionId,
      'integrante-1',
      desde,
      hasta,
    );
  });

  it('rechaza integrantes ajenos al equipo', async () => {
    const { servicio, obtenerOcupados } = crearServicio();

    await expect(
      servicio.consultarEquipo(
        contexto, equipoId, desde, hasta,
        undefined, 'normal', ['integrante-ajeno'],
      ),
    ).rejects.toMatchObject({
      status: 403,
      response: {
        codigo: 'SOLICITUD_INVALIDA',
      },
    });

    expect(obtenerOcupados).not.toHaveBeenCalled();
  });

  it('rechaza una seleccion vacia', async () => {
    const { servicio } = crearServicio();

    await expect(
      servicio.consultarEquipo(
        contexto, equipoId, desde, hasta,
        undefined, 'normal', [],
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        codigo: 'SOLICITUD_INVALIDA',
      },
    });
  });

  it('rechaza integrantes duplicados', async () => {
    const { servicio } = crearServicio();

    await expect(
      servicio.consultarEquipo(
        contexto, equipoId, desde, hasta,
        undefined, 'normal', ['integrante-1', 'integrante-1'],
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        codigo: 'SOLICITUD_INVALIDA',
      },
    });
  });
});
