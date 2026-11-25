import {
  respuestaSinIntervalos,
} from './respuesta-disponibilidad';

import 'reflect-metadata';
import { ConsultaDisponibilidadEquipo } from '@nexoai/contratos';
import { ValidarCon } from '../../src/plataforma/errores';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EquiposController } from '../../src/equipos/equipos.controller';
import { EquiposService } from '../../src/equipos/equipos.service';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

describe('CUN-05 - Autorizacion de bandas horarias', () => {
  let app: INestApplication;

  const consultarEquipo = vi.fn().mockImplementation(
    async (
    _contexto: unknown,
    equipoId: string,
    desde: Date,
    hasta: Date,
    _duracion?: number,
    _banda?: string,
    seleccion?: string[],
    ) => respuestaSinIntervalos(
      equipoId,
      desde,
      hasta,
      ['22222222-2222-4222-8222-222222222222'],
    ),
  );

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [EquiposController],
      providers: [
        {
          provide: EquiposService,
          useValue: {
            misEquipos: vi.fn(),
            integrantes: vi.fn(),
          },
        },
        {
          provide: DisponibilidadEquipoService,
          useValue: {
            consultarEquipo,
            obtenerZonaHorariaSolicitante: vi
              .fn()
              .mockResolvedValue('America/Lima'),
          },
        },
      ],
    }).compile();

    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const equipoId = '11111111-1111-4111-8111-111111111111';

  const fechas = {
    desde: '2026-11-12T08:00:00-05:00',
    hasta: '2026-11-12T22:00:00-05:00',
  };

  // El controlador recibe un contexto autenticado.
  // En estas pruebas se simula mediante la invocacion directa.
  const controlador = () => app.get(EquiposController);

  // Reproduce la validacion HTTP en las pruebas directas.
  async function consultarValidado(
    contexto: Parameters<
      EquiposController['consultarDisponibilidad']
    >[0],
    equipoId: string,
    consulta: unknown,
  ) {
    const validada =
      new ValidarCon(ConsultaDisponibilidadEquipo)
        .transform(consulta);

    return controlador().consultarDisponibilidad(
      contexto,
      equipoId,
      validada,
    );
  }


  it('rechaza una banda desconocida con error 400', async () => {
    await expect(
      consultarValidado(
        {
          perfilId: 'perfil-prueba',
          organizacionId: 'organizacion-prueba',
          rol: 'gerente',
          plan: 'empresarial',
          primerIngresoPendiente: false,
        },
        equipoId,
        { ...fechas, bandaHoraria: 'desconocida' },
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        codigo: 'SOLICITUD_INVALIDA',
      },
    });
  });

  it('permite al colaborador solicitar la banda extendida', async () => {
    consultarEquipo.mockClear();

    await consultarValidado(
      {
        perfilId: 'perfil-prueba',
        organizacionId: 'organizacion-prueba',
        rol: 'colaborador',
        plan: 'empresarial',
        primerIngresoPendiente: false,
      },
      equipoId,
      { ...fechas, bandaHoraria: 'extendida' },
    );

    expect(consultarEquipo).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'colaborador' }),
      equipoId,
      expect.any(Date),
      expect.any(Date),
      undefined,
      'extendida',
      undefined,
    );
  });

  it.each(['gerente', 'colaborador'] as const)(
    'permite solicitar fuera de banda al rol %s',
    async (rol) => {
      consultarEquipo.mockClear();

      await consultarValidado(
        {
          perfilId: 'perfil-prueba',
          organizacionId: 'organizacion-prueba',
          rol,
          plan: 'empresarial',
          primerIngresoPendiente: false,
        },
        equipoId,
        { ...fechas, bandaHoraria: 'fueraDeBanda' },
      );

      expect(consultarEquipo).toHaveBeenCalledWith(
        expect.objectContaining({ rol }),
        equipoId,
        expect.any(Date),
        expect.any(Date),
        undefined,
        'fueraDeBanda',
        undefined,
      );
    },
  );

  it('permite al gerente solicitar la banda extendida', async () => {
    await consultarValidado(
      {
        perfilId: 'perfil-prueba',
        organizacionId: 'organizacion-prueba',
        rol: 'gerente',
        plan: 'empresarial',
        primerIngresoPendiente: false,
      },
      equipoId,
      { ...fechas, bandaHoraria: 'extendida' },
    );

    expect(consultarEquipo).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'gerente' }),
      equipoId,
      expect.any(Date),
      expect.any(Date),
      undefined,
      'extendida',
      undefined,
    );
  });

  it('utiliza fechas automaticas cuando no se indican', async () => {
    consultarEquipo.mockClear();

    const antes = new Date();

    await consultarValidado(
      {
        perfilId: 'perfil-prueba',
        organizacionId: 'organizacion-prueba',
        rol: 'gerente',
        plan: 'empresarial',
        primerIngresoPendiente: false,
      },
      equipoId,
      {},
    );

    const despues = new Date();

    expect(consultarEquipo).toHaveBeenCalledTimes(1);

    const llamada = consultarEquipo.mock.calls[0]!;
    const desde = llamada[2] as Date;
    const hasta = llamada[3] as Date;

    const { rangoDisponibilidadPorDefecto } =
      await import('../../src/equipos/rango-disponibilidad.js');

    const rangoAntes = rangoDisponibilidadPorDefecto(
      'America/Lima',
      antes,
    );

    const rangoDespues = rangoDisponibilidadPorDefecto(
      'America/Lima',
      despues,
    );

    expect([
      rangoAntes.desde.getTime(),
      rangoDespues.desde.getTime(),
    ]).toContain(desde.getTime());

    expect([
      rangoAntes.hasta.getTime(),
      rangoDespues.hasta.getTime(),
    ]).toContain(hasta.getTime());
  });

  it('respeta las fechas indicadas explicitamente', async () => {
    consultarEquipo.mockClear();

    await consultarValidado(
      {
        perfilId: 'perfil-prueba',
        organizacionId: 'organizacion-prueba',
        rol: 'gerente',
        plan: 'empresarial',
        primerIngresoPendiente: false,
      },
      equipoId,
      fechas,
    );

    const llamada = consultarEquipo.mock.calls[0]!;

    expect((llamada[2] as Date).toISOString()).toBe(
      new Date(fechas.desde).toISOString(),
    );

    expect((llamada[3] as Date).toISOString()).toBe(
      new Date(fechas.hasta).toISOString(),
    );
  });

  it('rechaza consultas con una sola fecha', async () => {
    await expect(
      consultarValidado(
        {
          perfilId: 'perfil-prueba',
          organizacionId: 'organizacion-prueba',
          rol: 'gerente',
          plan: 'empresarial',
          primerIngresoPendiente: false,
        },
        equipoId,
        { desde: fechas.desde },
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        codigo: 'SOLICITUD_INVALIDA',
      },
    });
  });
});
