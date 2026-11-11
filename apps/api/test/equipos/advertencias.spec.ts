import { describe, expect, it, vi } from 'vitest';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

describe('CUN-05 - Advertencias de disponibilidad', () => {
  const contexto = {
    perfilId: 'usuario-1',
    organizacionId: 'organizacion-1',
    rol: 'gerente' as const,
    plan: 'empresarial' as const,
    primerIngresoPendiente: false,
  };

  const equipoId = '11111111-1111-4111-8111-111111111111';
  const desde = new Date('2026-11-12T08:00:00-05:00');
  const hasta = new Date('2026-11-12T23:00:00-05:00');

  function crearServicio(disponible: boolean) {
    const integrante = {
      perfilId: 'integrante-1',
      estadoConsentimiento: 'concedida',
    };

    const equipos = {
      verificarMembresia: vi.fn().mockResolvedValue(undefined),
      integrantes: vi.fn().mockResolvedValue([integrante]),
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
      .mockResolvedValue(disponible);

    vi.spyOn(servicio, 'obtenerOcupados')
      .mockResolvedValue([]);

    return servicio;
  }

  it('no genera advertencias cuando todo esta disponible', async () => {
    const servicio = crearServicio(true);

    const resultado = await servicio.consultarEquipo(
      contexto,
      equipoId,
      desde,
      hasta,
      undefined,
      'normal',
    );

    expect(resultado.disponibilidadCompleta).toBe(true);
    expect(resultado.advertencia).toBeNull();
  });

  it('advierte cuando faltan datos de un integrante', async () => {
    const servicio = crearServicio(false);

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
    expect(resultado.advertencia).toContain(
      'No se puede confirmar la disponibilidad',
    );
  });

  it('advierte sobre horarios excepcionales', async () => {
    const servicio = crearServicio(true);

    const resultado = await servicio.consultarEquipo(
      contexto,
      equipoId,
      desde,
      hasta,
      undefined,
      'fueraDeBanda',
    );

    expect(resultado.advertencia).toContain(
      'fuera de la banda habitual',
    );
  });

  it('muestra ambas advertencias simultaneamente', async () => {
    const servicio = crearServicio(false);

    const resultado = await servicio.consultarEquipo(
      contexto,
      equipoId,
      desde,
      hasta,
      undefined,
      'fueraDeBanda',
    );

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.intervalos).toEqual([]);

    expect(resultado.advertencia).toContain(
      'No se puede confirmar la disponibilidad',
    );

    expect(resultado.advertencia).toContain(
      'fuera de la banda habitual',
    );
  });
});
