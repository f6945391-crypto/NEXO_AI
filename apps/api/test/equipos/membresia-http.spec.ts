import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IngresoRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import {
  clientePrueba,
  crearCuentaLista,
  vaciarTablas,
} from '../utilidades/base-prueba';

describe('CUN-05 - Autorizacion real por membresia HTTP', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const contrasena = 'contrasena-segura-de-prueba';

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modulo.createNestApplication();
    await app.init();

    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('rechaza con 403 a un usuario autenticado que no pertenece al equipo', async () => {
    await vaciarTablas();

    const organizacionId = await crearOrganizacion(
      prisma,
      'Organizacion de prueba membresia CUN-05',
    );

    const correo = 'usuario-ajeno-cun05@nexoai.test';

    await crearCuentaLista(
      prisma,
      {
        organizacionId,
        correo,
        rol: 'gerente',
        plan: 'empresarial',
      },
      contrasena,
    );

    const equipo = await prisma.equipo.create({
      data: {
        organizacionId,
        nombre: 'Equipo privado de prueba',
      },
    });

    // No se crea una membresia para el usuario.

    const ingreso = await request(app.getHttpServer())
      .post('/auth/ingreso')
      .send({ correo, contrasena })
      .expect(200);

    const sesion = IngresoRespuesta.parse(ingreso.body);

    const respuesta = await request(app.getHttpServer())
      .get(`/equipos/${equipo.id}/disponibilidad`)
      .set('Authorization', `Bearer ${sesion.tokenAcceso}`)
      .query({
        desde: '2026-11-12T08:00:00-05:00',
        hasta: '2026-11-12T20:00:00-05:00',
      })
      .expect(403);

    expect(respuesta.body).toMatchObject({
      codigo: 'SOLICITUD_INVALIDA',
    });
  });

  it('permite consultar integrantes al usuario que pertenece al equipo', async () => {
    await vaciarTablas();

    const organizacionId = await crearOrganizacion(
      prisma,
      'Organizacion de prueba acceso autorizado CUN-05',
    );

    const correo = 'integrante-autorizado@nexoai.test';

    const { perfilId } = await crearCuentaLista(
      prisma,
      {
        organizacionId,
        correo,
        rol: 'colaborador',
        plan: 'empresarial',
      },
      contrasena,
    );

    const equipo = await prisma.equipo.create({
      data: {
        organizacionId,
        nombre: 'Equipo autorizado de prueba',
      },
    });

    await prisma.miembroDeEquipo.create({
      data: {
        organizacionId,
        equipoId: equipo.id,
        perfilId,
        rolEnEquipo: 'integrante',
        estadoConsentimiento: 'pendiente',
      },
    });

    const ingreso = await request(app.getHttpServer())
      .post('/auth/ingreso')
      .send({ correo, contrasena })
      .expect(200);

    const sesion = IngresoRespuesta.parse(ingreso.body);

    const respuesta = await request(app.getHttpServer())
      .get(`/equipos/${equipo.id}/integrantes`)
      .set('Authorization', `Bearer ${sesion.tokenAcceso}`)
      .expect(200);

    expect(respuesta.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          perfilId,
          rolEnEquipo: 'integrante',
          estadoConsentimiento: 'pendiente',
        }),
      ]),
    );
  });

  it('advierte disponibilidad incompleta cuando falta consentimiento', async () => {
    await vaciarTablas();

    const organizacionId = await crearOrganizacion(
      prisma,
      'Organizacion de prueba consentimiento CUN-05',
    );

    const correo = 'consentimiento-pendiente@nexoai.test';

    const { perfilId } = await crearCuentaLista(
      prisma,
      {
        organizacionId,
        correo,
        rol: 'colaborador',
        plan: 'empresarial',
      },
      contrasena,
    );

    const equipo = await prisma.equipo.create({
      data: {
        organizacionId,
        nombre: 'Equipo con consentimiento pendiente',
      },
    });

    await prisma.miembroDeEquipo.create({
      data: {
        organizacionId,
        equipoId: equipo.id,
        perfilId,
        rolEnEquipo: 'integrante',
        estadoConsentimiento: 'pendiente',
      },
    });

    const ingreso = await request(app.getHttpServer())
      .post('/auth/ingreso')
      .send({ correo, contrasena })
      .expect(200);

    const sesion = IngresoRespuesta.parse(ingreso.body);

    const respuesta = await request(app.getHttpServer())
      .get(`/equipos/${equipo.id}/disponibilidad`)
      .set('Authorization', `Bearer ${sesion.tokenAcceso}`)
      .query({
        desde: '2026-11-12T08:00:00-05:00',
        hasta: '2026-11-12T20:00:00-05:00',
      })
      .expect(200);

    expect(respuesta.body).toMatchObject({
      equipoId: equipo.id,
      disponibilidadCompleta: false,
      participantesConsultados: 0,
      participantesSinDatos: [perfilId],
      intervalos: [],
    });

    expect(respuesta.body.advertencia).toContain(
      'No se puede confirmar la disponibilidad',
    );
  });
});
