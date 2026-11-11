import 'reflect-metadata';
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

  const consultarEquipo = vi.fn().mockResolvedValue({
    disponibilidadCompleta: true,
    participantesConsultados: 2,
    participantesSinDatos: [],
    intervalos: [],
    advertencia: null,
  });

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
            cambiarMiConsentimiento: vi.fn(),
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
      participantesConsultados: 2,
      intervalos: [],
      advertencia: null,
    });

    expect(consultarEquipo).toHaveBeenCalledTimes(1);
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

  it('rechaza por HTTP la banda extendida para un colaborador', async () => {
    contexto.rol = 'colaborador';

    try {
      await request(app.getHttpServer())
        .get(`/equipos/${equipoId}/disponibilidad`)
        .query({
          desde: '2026-11-12T08:00:00-05:00',
          hasta: '2026-11-12T22:00:00-05:00',
          bandaHoraria: 'extendida',
        })
        .expect(403);
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
});
