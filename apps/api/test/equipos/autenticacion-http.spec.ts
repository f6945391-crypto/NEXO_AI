import {
  respuestaSinIntervalos,
} from './respuesta-disponibilidad';

import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IngresoRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../../src/app.module';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { ContextoSolicitud } from '../../src/identidad/contexto';
import type { PrismaClient } from '../../src/plataforma/prisma';
import {
  clientePrueba,
  crearCuentaLista,
  vaciarTablas,
} from '../utilidades/base-prueba';

describe('CUN-05 - Autenticacion HTTP real', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const consultarEquipo = vi.fn();
  const obtenerZonaHorariaSolicitante = vi.fn();

  const equipoId = '11111111-1111-4111-8111-111111111111';
  const contrasena = 'contrasena-segura-de-prueba';

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DisponibilidadEquipoService)
      .useValue({
        consultarEquipo,
        obtenerZonaHorariaSolicitante,
      })
      .compile();

    app = modulo.createNestApplication();
    await app.init();

    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('rechaza con 401 una consulta sin token JWT', async () => {
    consultarEquipo.mockClear();
    obtenerZonaHorariaSolicitante.mockClear();

    const respuesta = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .expect(401);

    expect(respuesta.body).toBeDefined();
    expect(consultarEquipo).not.toHaveBeenCalled();
    expect(obtenerZonaHorariaSolicitante).not.toHaveBeenCalled();
  });

  it('acepta un JWT valido y transmite el contexto del usuario', async () => {
    await vaciarTablas();

    const organizacionId = await crearOrganizacion(
      prisma,
      'Organizacion de prueba CUN-05',
    );

    const correo = 'gerente-cun05@nexoai.test';

    const { perfilId } = await crearCuentaLista(
      prisma,
      {
        organizacionId,
        correo,
        rol: 'gerente',
        plan: 'empresarial',
      },
      contrasena,
    );

    const ingreso = await request(app.getHttpServer())
      .post('/auth/ingreso')
      .send({ correo, contrasena })
      .expect(200);

    const sesion = IngresoRespuesta.parse(ingreso.body);

    consultarEquipo.mockReset();
    consultarEquipo.mockImplementation(
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

    const respuesta = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/disponibilidad`)
      .set('Authorization', `Bearer ${sesion.tokenAcceso}`)
      .query({
        desde: '2026-11-12T08:00:00-05:00',
        hasta: '2026-11-12T20:00:00-05:00',
      })
      .expect(200);

    expect(respuesta.body.disponibilidadCompleta).toBe(true);
    expect(consultarEquipo).toHaveBeenCalledTimes(1);

    const llamada = consultarEquipo.mock.calls[0]!;
    const contexto = llamada[0] as ContextoSolicitud;

    expect(contexto).toMatchObject({
      perfilId,
      organizacionId,
      rol: 'gerente',
      plan: 'empresarial',
      primerIngresoPendiente: false,
    });

    expect(llamada[1]).toBe(equipoId);
  });
});
