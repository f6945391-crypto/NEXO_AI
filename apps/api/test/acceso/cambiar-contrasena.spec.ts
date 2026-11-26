import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// REQ-ACC-18 · T-121 · specs/06-acceso/plan.md §5.7 · H-ACC-08
const ACTUAL = 'la-contrasena-de-siempre';
const NUEVA = 'una-contrasena-nueva-y-larga';

describe('acceso.cambiar-contrasena', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const ingresar = async (correo: string, contrasena = ACTUAL) =>
    IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena }).expect(200)).body);
  const cambiar = (sesion: IngresoRespuesta, cuerpo: Record<string, string>) =>
    http().patch('/auth/contrasena').set('Authorization', `Bearer ${sesion.tokenAcceso}`).send(cuerpo);
  const renovar = (sesion: IngresoRespuesta) => http().post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion });

  async function cuenta() {
    const correo = `contrasena${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, ACTUAL);
    return { correo, perfilId };
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba', 'personal');
  });

  it('con la actual correcta cambia, cierra las demás sesiones, esta sigue y queda en la auditoría', async () => {
    const { correo, perfilId } = await cuenta();
    const web = await ingresar(correo);
    const movil = await ingresar(correo);

    const nueva = IngresoRespuesta.parse((await cambiar(web, { actual: ACTUAL, nueva: NUEVA }).expect(200)).body);

    // La sesión que lo pidió sigue, con tokens nuevos
    await http().get('/auth/sesion').set('Authorization', `Bearer ${nueva.tokenAcceso}`).expect(200);
    await renovar(nueva).expect(200);
    // La otra falla en su siguiente renovación
    expect(ErrorApi.parse((await renovar(movil).expect(401)).body).codigo).toBe('SESION_INVALIDA');
    // La contraseña nueva entra y la anterior ya no
    await ingresar(correo, NUEVA);
    await http().post('/auth/ingreso').send({ correo, contrasena: ACTUAL }).expect(401);
    expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'contrasena.cambiada' } })).toBe(1);
  });

  it('con la actual incorrecta, un solo error y nada cambia', async () => {
    const { correo, perfilId } = await cuenta();
    const web = await ingresar(correo);
    const movil = await ingresar(correo);

    const r = await cambiar(web, { actual: 'no-es-la-actual', nueva: NUEVA }).expect(400);
    expect(ErrorApi.parse(r.body)).toEqual({ codigo: 'CONTRASENA_NO_VALIDA', mensaje: 'La contraseña actual no es correcta.' });
    await renovar(movil).expect(200);
    await ingresar(correo, ACTUAL);
    expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'contrasena.cambiada' } })).toBe(0);
  });

  it('rechaza una nueva corta o igual a la actual', async () => {
    const { correo } = await cuenta();
    const web = await ingresar(correo);
    expect(ErrorApi.parse((await cambiar(web, { actual: ACTUAL, nueva: 'corta' }).expect(400)).body).codigo).toBe('SOLICITUD_INVALIDA');
    const igual = await cambiar(web, { actual: ACTUAL, nueva: ACTUAL }).expect(400);
    expect(ErrorApi.parse(igual.body).mensaje).toBe('La contraseña nueva tiene que ser distinta de la actual.');
    await ingresar(correo, ACTUAL);
  });

  it('sin sesión no se puede', async () => {
    await http().patch('/auth/contrasena').send({ actual: ACTUAL, nueva: NUEVA }).expect(401);
  });

  it('H-ACC-08: más de 5 intentos por minuto en la misma cuenta se frenan', async () => {
    const { correo } = await cuenta();
    const web = await ingresar(correo);
    for (let i = 0; i < 5; i++) await cambiar(web, { actual: `mala-${i}`, nueva: NUEVA }).expect(400);
    const r = await cambiar(web, { actual: ACTUAL, nueva: NUEVA }).expect(429);
    expect(ErrorApi.parse(r.body).codigo).toBe('DEMASIADOS_INTENTOS');
  });
});
