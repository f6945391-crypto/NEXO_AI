import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configurarCors, origenesPermitidos } from '../../src/plataforma/cors';

// T-028 · specs/06-acceso/plan.md §5.6

const EXPO_WEB = 'http://localhost:3201';

describe('plataforma.cors-solo-origenes-listados', () => {
  let app: INestApplication;
  const anterior = process.env.CORS_ORIGENES;

  beforeAll(async () => {
    process.env.CORS_ORIGENES = ` ${EXPO_WEB} , * `;
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarCors(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (anterior === undefined) delete process.env.CORS_ORIGENES;
    else process.env.CORS_ORIGENES = anterior;
  });

  it('un origen de la lista puede llamar a la API, también con la consulta previa del navegador', async () => {
    const r = await request(app.getHttpServer()).get('/salud').set('Origin', EXPO_WEB).expect(200);
    expect(r.headers['access-control-allow-origin']).toBe(EXPO_WEB);

    const previa = await request(app.getHttpServer())
      .options('/auth/ingreso')
      .set('Origin', EXPO_WEB)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(previa.status).toBeLessThan(300);
    expect(previa.headers['access-control-allow-origin']).toBe(EXPO_WEB);
  });

  it('un origen que no está en la lista no recibe permiso, y «*» nunca cuenta', async () => {
    const r = await request(app.getHttpServer()).get('/salud').set('Origin', 'https://otro-sitio.example').expect(200);
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
    expect(origenesPermitidos()).toEqual([EXPO_WEB]);
  });
});
