import {
  respuestaSinIntervalos,
} from './respuesta-disponibilidad';

import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EquiposController } from '../../src/equipos/equipos.controller';
import { EquiposService } from '../../src/equipos/equipos.service';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';
import type { ContextoSolicitud } from '../../src/identidad/contexto';

describe('CUN-05 - Seleccion de participantes HTTP', () => {
  let app: INestApplication;

  const contexto: ContextoSolicitud = {
    perfilId: 'perfil-prueba',
    organizacionId: 'organizacion-prueba',
    rol: 'gerente',
    plan: 'empresarial',
    primerIngresoPendiente: false,
  };

  const equipoId = '11111111-1111-4111-8111-111111111111';
  const participante1 = '22222222-2222-4222-8222-222222222222';
  const participante2 = '33333333-3333-4333-8333-333333333333';

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
      seleccion ?? [participante1, participante2],
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

    app.use(
      (
        req: { contexto?: ContextoSolicitud },
        _res: unknown,
        next: () => void,
      ) => {
        req.contexto = contexto;
        next();
      },
    );

    await app.init();
  });

  beforeEach(() => {
    consultarEquipo.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('transmite los participantes seleccionados al servicio', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .query({
        desde: '2026-11-12T08:00:00-05:00',
        hasta: '2026-11-12T20:00:00-05:00',
        participantes: `${participante1},${participante2}`,
      })
      .expect(200);

    expect(consultarEquipo).toHaveBeenCalledTimes(1);
    expect(consultarEquipo).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'gerente' }),
      equipoId,
      expect.any(Date),
      expect.any(Date),
      undefined,
      'normal',
      [participante1, participante2],
    );
  });

  it('rechaza una seleccion vacia con HTTP 400', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .query({
        participantes: '',
      })
      .expect(400);

    expect(consultarEquipo).not.toHaveBeenCalled();
  });

  it('rechaza participantes duplicados con HTTP 400', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .query({
        participantes: `${participante1},${participante1}`,
      })
      .expect(400);

    expect(consultarEquipo).not.toHaveBeenCalled();
  });

  it('mantiene la consulta completa cuando no hay seleccion', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .expect(200);

    expect(consultarEquipo).toHaveBeenCalledTimes(1);
    expect(consultarEquipo.mock.calls[0]?.[6]).toBeUndefined();
  });
});