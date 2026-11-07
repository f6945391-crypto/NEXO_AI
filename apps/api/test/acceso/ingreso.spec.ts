import 'reflect-metadata';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, SesionActual, type Plan, type Rol } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// Ruta sin alcance declarado: al colaborador se le cierra igual, para que un olvido no deje nada abierto
// (REQ-ACC-13, T-026). La prueba acceso.toda-ruta-declara-su-alcance impide que exista en la aplicación.
@Controller('ruta-de-prueba')
class RutaDePruebaController {
  @Get()
  responder() {
    return { ok: true };
  }
}

const CONTRASENA = 'una-contrasena-de-prueba';

describe('T-004 · ingreso y sesión', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;

  const http = () => request(app.getHttpServer());
  const ingresar = (correo: string, contrasena = CONTRASENA) => http().post('/auth/ingreso').send({ correo, contrasena });
  // Por defecto con el primer ingreso ya completado, para llegar a las rutas protegidas.
  // El primer ingreso pendiente lo prueba test/acceso/primer-ingreso.spec.ts.
  const alta = (correo: string, rol: Rol, plan: Plan) =>
    crearCuentaLista(prisma, { organizacionId, correo, rol, plan }, CONTRASENA);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule], controllers: [RutaDePruebaController] }).compile();
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

  describe('acceso.ingreso-devuelve-rol', () => {
    it.each([
      ['usuario_personal', 'personal'],
      ['gerente', 'empresarial'],
      ['colaborador', 'empresarial'],
    ] as const)('una cuenta %s entra y recibe su rol y su plan', async (rol, plan) => {
      const { perfilId } = await alta(`${rol}@nexoai.test`, rol, plan);
      const respuesta = await ingresar(`${rol}@nexoai.test`).expect(200);

      const cuerpo = IngresoRespuesta.parse(respuesta.body);
      expect(cuerpo.rol).toBe(rol);
      expect(cuerpo.plan).toBe(plan);
      expect(cuerpo.primerIngresoPendiente).toBe(false);

      const sesion = await http().get('/auth/sesion').set('Authorization', `Bearer ${cuerpo.tokenAcceso}`).expect(200);
      // T-066: la organización de prueba es una empresa; la cuenta pertenece a ella y no la administra
      expect(SesionActual.parse(sesion.body)).toEqual({
        perfilId,
        organizacionId,
        rol,
        plan,
        primerIngresoPendiente: false,
        administrador: false,
        organizacion: { nombre: 'Organización de prueba', tipo: 'empresa' },
      });
    });

    it('el correo no distingue mayúsculas', async () => {
      await alta('maria.quispe@nexoai.test', 'gerente', 'empresarial');
      await ingresar('  Maria.Quispe@NexoAI.test ').expect(200);
    });

    it('el ingreso queda en la auditoría', async () => {
      const { perfilId } = await alta('g2@nexoai.test', 'gerente', 'empresarial');
      await ingresar('g2@nexoai.test').expect(200);
      const acciones = await prisma.eventoAuditoria.findMany({ where: { perfilId }, orderBy: { ocurridoEn: 'asc' } });
      expect(acciones.map((e) => e.accion)).toEqual(['cuenta.creada', 'ingreso']);
    });

    it('sin token de acceso no se entra a una ruta protegida', async () => {
      const respuesta = await http().get('/auth/sesion').expect(401);
      expect(ErrorApi.parse(respuesta.body).codigo).toBe('NO_AUTENTICADO');
      await http().get('/auth/sesion').set('Authorization', 'Bearer token-inventado').expect(401);
    });
  });

  describe('acceso.error-no-revela-correo', () => {
    it('un correo inexistente y una contraseña errónea dan exactamente la misma respuesta', async () => {
      await alta('existe@nexoai.test', 'gerente', 'empresarial');
      const inexistente = await ingresar('no-existe@nexoai.test').expect(401);
      const erronea = await ingresar('existe@nexoai.test', 'otra-contrasena').expect(401);

      expect(inexistente.body).toEqual(erronea.body);
      expect(ErrorApi.parse(erronea.body).codigo).toBe('CREDENCIALES_INVALIDAS');
    });

    it('el intento fallido de una cuenta existente queda en su auditoría', async () => {
      const { perfilId } = await alta('existe@nexoai.test', 'gerente', 'empresarial');
      await ingresar('existe@nexoai.test', 'otra-contrasena').expect(401);
      expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'ingreso.fallido' } })).toBe(1);
    });
  });

  describe('acceso.sesion-rotativa', () => {
    it('renovar entrega tokens nuevos y el anterior deja de valer', async () => {
      await alta('g6@nexoai.test', 'gerente', 'empresarial');
      const primero = IngresoRespuesta.parse((await ingresar('g6@nexoai.test').expect(200)).body);

      const segundo = IngresoRespuesta.parse(
        (await http().post('/auth/renovar').send({ tokenRenovacion: primero.tokenRenovacion }).expect(200)).body,
      );
      expect(segundo.tokenRenovacion).not.toBe(primero.tokenRenovacion);
      await http().get('/auth/sesion').set('Authorization', `Bearer ${segundo.tokenAcceso}`).expect(200);
    });

    it('reutilizar un token rotado fuera del margen de gracia revoca toda la familia', async () => {
      await alta('g7@nexoai.test', 'gerente', 'empresarial');
      const primero = IngresoRespuesta.parse((await ingresar('g7@nexoai.test').expect(200)).body);
      const segundo = IngresoRespuesta.parse(
        (await http().post('/auth/renovar').send({ tokenRenovacion: primero.tokenRenovacion }).expect(200)).body,
      );
      // Pasó un minuto desde la rotación: ya no puede ser un duplicado (DP-04).
      await prisma.sesionRenovacion.updateMany({
        where: { rotadaEn: { not: null } },
        data: { rotadaEn: new Date(Date.now() - 60_000) },
      });

      const reutilizado = await http().post('/auth/renovar').send({ tokenRenovacion: primero.tokenRenovacion }).expect(401);
      expect(ErrorApi.parse(reutilizado.body).codigo).toBe('SESION_INVALIDA');
      await http().post('/auth/renovar').send({ tokenRenovacion: segundo.tokenRenovacion }).expect(401);
    });

    // T-024 · DP-04
    it('acceso.renovacion-concurrente · dos renovaciones a la vez con el mismo token no cierran la sesión', async () => {
      const { perfilId } = await alta('g12@nexoai.test', 'gerente', 'empresarial');
      const sesion = IngresoRespuesta.parse((await ingresar('g12@nexoai.test').expect(200)).body);

      const [a, b] = await Promise.all([
        http().post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion }),
        http().post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion }),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
      for (const r of [a, b]) {
        const nuevo = IngresoRespuesta.parse(r.body);
        await http().post('/auth/renovar').send({ tokenRenovacion: nuevo.tokenRenovacion }).expect(200);
      }
      expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'sesion.reutilizada' } })).toBe(0);
    });

    it('acceso.renovacion-concurrente · repetir un token recién rotado devuelve tokens válidos de la misma sesión', async () => {
      await alta('g13@nexoai.test', 'gerente', 'empresarial');
      const primero = IngresoRespuesta.parse((await ingresar('g13@nexoai.test').expect(200)).body);
      const segundo = IngresoRespuesta.parse(
        (await http().post('/auth/renovar').send({ tokenRenovacion: primero.tokenRenovacion }).expect(200)).body,
      );
      const duplicado = IngresoRespuesta.parse(
        (await http().post('/auth/renovar').send({ tokenRenovacion: primero.tokenRenovacion }).expect(200)).body,
      );
      await http().get('/auth/sesion').set('Authorization', `Bearer ${duplicado.tokenAcceso}`).expect(200);
      await http().post('/auth/renovar').send({ tokenRenovacion: segundo.tokenRenovacion }).expect(200);
    });

    it('acceso.renovacion-concurrente · tras cerrar sesión, el margen no reabre nada', async () => {
      const { perfilId } = await alta('g14@nexoai.test', 'gerente', 'empresarial');
      const primero = IngresoRespuesta.parse((await ingresar('g14@nexoai.test').expect(200)).body);
      const segundo = IngresoRespuesta.parse(
        (await http().post('/auth/renovar').send({ tokenRenovacion: primero.tokenRenovacion }).expect(200)).body,
      );
      await http().post('/auth/salida').send({ tokenRenovacion: segundo.tokenRenovacion }).expect(204);
      await http().post('/auth/renovar').send({ tokenRenovacion: primero.tokenRenovacion }).expect(401);
      await http().post('/auth/renovar').send({ tokenRenovacion: segundo.tokenRenovacion }).expect(401);
      expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'sesion.reutilizada' } })).toBe(1);
    });

    it('cerrar sesión invalida el token de renovación', async () => {
      await alta('g8@nexoai.test', 'gerente', 'empresarial');
      const sesion = IngresoRespuesta.parse((await ingresar('g8@nexoai.test').expect(200)).body);
      await http().post('/auth/salida').send({ tokenRenovacion: sesion.tokenRenovacion }).expect(204);
      await http().post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion }).expect(401);
    });

    it('el token de renovación se guarda solo como hash', async () => {
      await alta('g9@nexoai.test', 'gerente', 'empresarial');
      const sesion = IngresoRespuesta.parse((await ingresar('g9@nexoai.test').expect(200)).body);
      const guardadas = await prisma.sesionRenovacion.findMany();
      expect(guardadas).toHaveLength(1);
      expect(guardadas[0]!.hashToken).not.toContain(sesion.tokenRenovacion);
    });
  });

  describe('acceso.colaborador-solo-ve-lo-suyo', () => {
    it('al colaborador se le cierra una ruta que no declara su alcance', async () => {
      await alta('c@nexoai.test', 'colaborador', 'empresarial');
      const { tokenAcceso } = IngresoRespuesta.parse((await ingresar('c@nexoai.test').expect(200)).body);

      const denegada = await http().get('/ruta-de-prueba').set('Authorization', `Bearer ${tokenAcceso}`).expect(403);
      expect(ErrorApi.parse(denegada.body).codigo).toBe('ROL_NO_PERMITIDO');
      await http().get('/auth/sesion').set('Authorization', `Bearer ${tokenAcceso}`).expect(200);
    });

    it('a los otros roles esa misma ruta sí se les permite', async () => {
      await alta('g11@nexoai.test', 'gerente', 'empresarial');
      const { tokenAcceso } = IngresoRespuesta.parse((await ingresar('g11@nexoai.test').expect(200)).body);
      await http().get('/ruta-de-prueba').set('Authorization', `Bearer ${tokenAcceso}`).expect(200);
    });
  });

  describe('acceso.limite-de-intentos', () => {
    it('el sexto intento en un minuto con el mismo correo se rechaza', async () => {
      for (let i = 0; i < 5; i++) await ingresar('limite@nexoai.test', 'mala').expect(401);
      const bloqueado = await ingresar('limite@nexoai.test', 'mala').expect(429);
      expect(ErrorApi.parse(bloqueado.body).codigo).toBe('DEMASIADOS_INTENTOS');
    });
  });
});
