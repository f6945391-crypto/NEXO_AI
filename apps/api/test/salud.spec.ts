import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SaludRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// T-001
describe('plataforma.salud-responde', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /salud responde 200 con el contrato de salud', async () => {
    const respuesta = await request(app.getHttpServer()).get('/salud').expect(200);
    expect(SaludRespuesta.parse(respuesta.body)).toEqual({ estado: 'ok' });
  });
});
