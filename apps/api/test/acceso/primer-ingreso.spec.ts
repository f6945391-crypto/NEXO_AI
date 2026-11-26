import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, SesionActual } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { verificarContrasena } from '../../src/identidad/contrasenas';
import { crearCuenta, crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, vaciarTablas } from '../utilidades/base-prueba';

// REQ-ACC-04, REQ-ACC-05 · H-ACC-02 · T-005
const TEMPORAL = 'contrasena-temporal-de-prueba';
const NUEVA = 'contrasena-nueva-de-prueba';

describe('acceso.primer-ingreso-bloquea-hasta-completar', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const con = (token: string) => ({ Authorization: `Bearer ${token}` });

  // Cuenta recién dada de alta: primer ingreso pendiente. Cada prueba usa un correo distinto por el límite de intentos.
  async function cuentaNueva(rol: 'gerente' | 'colaborador' = 'gerente') {
    const correo = `nuevo${++n}@nexoai.test`;
    const { perfilId } = await crearCuenta(prisma, { organizacionId, correo, rol, plan: 'empresarial' }, TEMPORAL);
    const sesion = IngresoRespuesta.parse(
      (await http().post('/auth/ingreso').send({ correo, contrasena: TEMPORAL }).expect(200)).body,
    );
    return { correo, perfilId, sesion };
  }

  const completar = (token: string, cuerpo: object) =>
    http().post('/auth/primer-ingreso').set(con(token)).send(cuerpo);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
  });

  it('una cuenta nueva entra con el primer ingreso pendiente', async () => {
    const { sesion } = await cuentaNueva();
    expect(sesion.primerIngresoPendiente).toBe(true);
  });

  it('mientras está pendiente, toda ruta protegida responde PRIMER_INGRESO_PENDIENTE', async () => {
    const { sesion } = await cuentaNueva();
    const bloqueada = await http().get('/auth/sesion').set(con(sesion.tokenAcceso)).expect(403);
    expect(ErrorApi.parse(bloqueada.body).codigo).toBe('PRIMER_INGRESO_PENDIENTE');
  });

  it('mientras está pendiente, salir sí se puede', async () => {
    const { sesion } = await cuentaNueva();
    await http().post('/auth/salida').send({ tokenRenovacion: sesion.tokenRenovacion }).expect(204);
  });

  it('al completarlo se libera el acceso, con tokens nuevos', async () => {
    const { sesion, perfilId } = await cuentaNueva();
    const respuesta = await completar(sesion.tokenAcceso, { contrasenaNueva: NUEVA, zonaHoraria: 'America/Lima' }).expect(200);
    const nueva = IngresoRespuesta.parse(respuesta.body);
    expect(nueva.primerIngresoPendiente).toBe(false);

    const actual = await http().get('/auth/sesion').set(con(nueva.tokenAcceso)).expect(200);
    expect(SesionActual.parse(actual.body).primerIngresoPendiente).toBe(false);

    const perfil = await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: perfilId } });
    expect(perfil.zonaHoraria).toBe('America/Lima');
    expect(perfil.debeCambiarContrasena).toBe(false);
    expect(await verificarContrasena(perfil.hashContrasena, NUEVA)).toBe(true);
  });

  it('después se entra con la contraseña nueva y no con la temporal', async () => {
    const { sesion, correo } = await cuentaNueva();
    await completar(sesion.tokenAcceso, { contrasenaNueva: NUEVA, zonaHoraria: 'Europe/Madrid' }).expect(200);
    await http().post('/auth/ingreso').send({ correo, contrasena: TEMPORAL }).expect(401);
    const otra = IngresoRespuesta.parse(
      (await http().post('/auth/ingreso').send({ correo, contrasena: NUEVA }).expect(200)).body,
    );
    expect(otra.primerIngresoPendiente).toBe(false);
  });

  it('cambiar la contraseña cierra las sesiones abiertas con la temporal', async () => {
    const { sesion } = await cuentaNueva();
    await completar(sesion.tokenAcceso, { contrasenaNueva: NUEVA, zonaHoraria: 'America/Lima' }).expect(200);
    await http().post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion }).expect(401);
  });

  it('el colaborador también completa su primer ingreso', async () => {
    const { sesion } = await cuentaNueva('colaborador');
    await completar(sesion.tokenAcceso, { contrasenaNueva: NUEVA, zonaHoraria: 'America/Lima' }).expect(200);
  });

  it.each([
    ['contraseña de menos de 12 caracteres', { contrasenaNueva: 'corta', zonaHoraria: 'America/Lima' }, 'SOLICITUD_INVALIDA'],
    ['desfase fijo en vez de zona con nombre', { contrasenaNueva: NUEVA, zonaHoraria: '+05:00' }, 'SOLICITUD_INVALIDA'],
    ['sin zona horaria (REQ-ACC-05)', { contrasenaNueva: NUEVA }, 'SOLICITUD_INVALIDA'],
    ['con franja horaria, que no se pregunta (R-44)', { contrasenaNueva: NUEVA, zonaHoraria: 'America/Lima', franja: '08-20' }, 'SOLICITUD_INVALIDA'],
    ['la misma contraseña temporal', { contrasenaNueva: TEMPORAL, zonaHoraria: 'America/Lima' }, 'CONTRASENA_NO_VALIDA'],
  ])('rechaza %s y no cambia nada', async (_, cuerpo, codigo) => {
    const { sesion, perfilId } = await cuentaNueva();
    const respuesta = await completar(sesion.tokenAcceso, cuerpo).expect(400);
    expect(ErrorApi.parse(respuesta.body).codigo).toBe(codigo);

    const perfil = await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: perfilId } });
    expect(perfil.debeCambiarContrasena).toBe(true);
    expect(perfil.zonaHoraria).toBeNull();
  });

  it('no se puede repetir una vez completado', async () => {
    const { sesion } = await cuentaNueva();
    const nueva = IngresoRespuesta.parse(
      (await completar(sesion.tokenAcceso, { contrasenaNueva: NUEVA, zonaHoraria: 'America/Lima' }).expect(200)).body,
    );
    const repetido = await completar(nueva.tokenAcceso, { contrasenaNueva: 'otra-contrasena-larga', zonaHoraria: 'UTC' }).expect(409);
    expect(ErrorApi.parse(repetido.body).codigo).toBe('PRIMER_INGRESO_YA_COMPLETADO');
  });

  it('queda en la auditoría con la zona elegida', async () => {
    const { sesion, perfilId } = await cuentaNueva();
    await completar(sesion.tokenAcceso, { contrasenaNueva: NUEVA, zonaHoraria: 'America/Lima' }).expect(200);
    const evento = await prisma.eventoAuditoria.findFirstOrThrow({ where: { perfilId, accion: 'primer-ingreso.completado' } });
    expect(evento.detalle).toEqual({ zonaHoraria: 'America/Lima' });
  });
});
