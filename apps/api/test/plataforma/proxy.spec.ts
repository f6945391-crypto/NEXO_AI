import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configurarProxy } from '../../src/plataforma/proxy';

// T-141 · H-ACC-17 · specs/06-acceso/plan.md §5.10. Detrás del proxy, el límite de intentos cuenta por la IP del
// cliente (X-Forwarded-For) y no por la del proxy, que sería la misma para todos.
describe('plataforma.ip-detras-del-proxy', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function arrancar(confiar: boolean) {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    expect(configurarProxy(app, confiar ? { CONFIAR_EN_PROXY: '1' } : {})).toBe(confiar);
    await app.init();
    return app;
  }

  // Seis intentos con el mismo correo desde una IP agotan su límite; el séptimo, desde otra IP, cuenta aparte
  async function intentos(instancia: INestApplication, correo: string) {
    const entrar = (ip: string) => request(instancia.getHttpServer()).post('/auth/ingreso').set('X-Forwarded-For', ip).send({ correo, contrasena: 'no-es-esta' });
    for (let i = 0; i < 5; i++) await entrar('203.0.113.10');
    const misma = (await entrar('203.0.113.10')).status;
    const otra = (await entrar('198.51.100.20')).status;
    return { misma, otra };
  }

  it('con CONFIAR_EN_PROXY, cada cliente tiene su propio límite', async () => {
    const r = await intentos(await arrancar(true), 'proxy-si@nexoai.test');
    expect(r).toEqual({ misma: 429, otra: 401 });
  });

  it('sin la variable, se ignora X-Forwarded-For: todos comparten la IP de la conexión', async () => {
    const r = await intentos(await arrancar(false), 'proxy-no@nexoai.test');
    expect(r).toEqual({ misma: 429, otra: 429 });
  });

  it('acepta «0» y «false» como apagado', () => {
    const falso = { getHttpAdapter: () => ({ getInstance: () => ({ set: () => undefined }) }) } as unknown as INestApplication;
    expect(configurarProxy(falso, { CONFIAR_EN_PROXY: '0' })).toBe(false);
    expect(configurarProxy(falso, { CONFIAR_EN_PROXY: 'false' })).toBe(false);
    expect(configurarProxy(falso, { CONFIAR_EN_PROXY: '1' })).toBe(true);
  });
});
