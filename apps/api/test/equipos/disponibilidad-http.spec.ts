import { DisponibilidadEquipoRespuesta } from '@nexoai/contratos';
import {
  respuestaSinIntervalos,
} from './respuesta-disponibilidad';

import 'reflect-metadata';
import { ErrorApi } from '@nexoai/contratos';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EquiposController } from '../../src/equipos/equipos.controller';
import { EquiposService } from '../../src/equipos/equipos.service';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';
import type { ContextoSolicitud } from '../../src/identidad/contexto';

describe('CUN-05 - Disponibilidad mediante HTTP', () => {
  let app: INestApplication;

  const contexto: ContextoSolicitud = {
    perfilId: 'perfil-prueba',
    organizacionId: 'organizacion-prueba',
    rol: 'gerente',
    plan: 'empresarial',
    primerIngresoPendiente: false,
  };

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
      ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'],
    ),
  );

  const obtenerZonaHorariaSolicitante = vi
    .fn()
    .mockResolvedValue('America/Lima');

  const equipoId = '11111111-1111-4111-8111-111111111111';

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
            obtenerZonaHorariaSolicitante,
          },
        },
      ],
    }).compile();

    app = modulo.createNestApplication();

    // Contexto simulado exclusivamente para estas pruebas.
    app.use((req: { contexto?: ContextoSolicitud },
             _res: unknown,
             next: () => void) => {
      req.contexto = contexto;
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 al consultar disponibilidad con fechas validas', async () => {
    const respuesta = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .query({
        desde: '2026-11-12T08:00:00-05:00',
        hasta: '2026-11-12T20:00:00-05:00',
      })
      .expect(200);

    expect(respuesta.body).toMatchObject({
      disponibilidadCompleta: true,
      estadoDisponibilidad: 'sin_intervalos_comunes',
      participantesConsultados: 2,
      intervalosComunes: [],
      intervalos: [],
      advertencia: null,
    });

    expect(respuesta.body.disponibilidadIndividual)
      .toHaveLength(2);

    for (
      const participante of
      respuesta.body.disponibilidadIndividual
    ) {
      expect(participante).toMatchObject({
        estado: 'consultado',
        intervalosLibres: [],
      });

      expect(participante.intervalosOcupados)
        .toHaveLength(1);
    }

    expect(
      DisponibilidadEquipoRespuesta.safeParse(
        respuesta.body,
      ).success,
    ).toBe(true);

    expect(consultarEquipo).toHaveBeenCalledTimes(1);
  });

  it.each([
    { duracion: undefined, esperado: undefined },
    { duracion: '30', esperado: 30 },
    { duracion: '60', esperado: 60 },
    { duracion: '120', esperado: 120 },
  ])('transmite la duracion opcional al servicio %j', async ({
    duracion,
    esperado,
  }) => {
    consultarEquipo.mockClear();

    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .query({
        desde: '2026-11-12T08:00:00-05:00',
        hasta: '2026-11-12T20:00:00-05:00',
        ...(duracion === undefined
          ? {}
          : { duracionMinutos: duracion }),
      })
      .expect(200);

    expect(consultarEquipo).toHaveBeenCalledTimes(1);

    const llamada = consultarEquipo.mock.calls[0]!;

    expect(llamada[4]).toBe(esperado);
  });

  it('rechaza por HTTP una consulta con una sola fecha', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .query({
        desde: '2026-11-12T08:00:00-05:00',
      })
      .expect(400);
  });

  it('rechaza por HTTP una banda horaria desconocida', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .query({
        desde: '2026-11-12T08:00:00-05:00',
        hasta: '2026-11-12T20:00:00-05:00',
        bandaHoraria: 'desconocida',
      })
      .expect(400);
  });

  it('permite por HTTP la banda extendida para un colaborador', async () => {
    contexto.rol = 'colaborador';

    try {
      await request(app.getHttpServer())
        .get(`/equipos/${equipoId}/disponibilidad`)
        .query({
          desde: '2026-11-12T08:00:00-05:00',
          hasta: '2026-11-12T22:00:00-05:00',
          bandaHoraria: 'extendida',
        })
        .expect(200);
    } finally {
      contexto.rol = 'gerente';
    }
  });

  it('consulta por HTTP sin fechas utiliza el rango automatico', async () => {
    consultarEquipo.mockClear();
    obtenerZonaHorariaSolicitante.mockClear();

    const respuesta = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .expect(200);

    expect(respuesta.body.disponibilidadCompleta).toBe(true);

    expect(obtenerZonaHorariaSolicitante).toHaveBeenCalledWith(
      expect.objectContaining({
        perfilId: 'perfil-prueba',
      }),
      equipoId,
    );

    expect(consultarEquipo).toHaveBeenCalledTimes(1);

    const llamada = consultarEquipo.mock.calls[0]!;
    const desde = llamada[2] as Date;
    const hasta = llamada[3] as Date;

    expect(desde).toBeInstanceOf(Date);
    expect(hasta).toBeInstanceOf(Date);
    expect(desde.getTime()).toBeLessThan(hasta.getTime());

    expect(llamada[5]).toBe('normal');
  });


  it('devuelve ErrorApi para un UUID invalido', async () => {
    consultarEquipo.mockClear();

    const respuesta = await request(app.getHttpServer())
      .get('/equipos/identificador-invalido/disponibilidad')
      .expect(400);

    expect(ErrorApi.safeParse(respuesta.body).success)
      .toBe(true);

    expect(respuesta.body.codigo)
      .toBe('SOLICITUD_INVALIDA');

    expect(consultarEquipo).not.toHaveBeenCalled();
  });

  it.each([
    { desde: '2026-11-12T08:00:00-05:00' },
    { bandaHoraria: 'desconocida' },
    { duracionMinutos: '0' },
  ])('devuelve ErrorApi para consulta invalida %j', async (consulta) => {
    consultarEquipo.mockClear();

    const respuesta = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .query(consulta)
      .expect(400);

    expect(ErrorApi.safeParse(respuesta.body).success)
      .toBe(true);

    expect(respuesta.body.codigo)
      .toBe('SOLICITUD_INVALIDA');

    expect(consultarEquipo).not.toHaveBeenCalled();
  });

});
