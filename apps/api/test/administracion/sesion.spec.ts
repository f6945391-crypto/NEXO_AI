import 'reflect-metadata';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, SesionActual, type Plan } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { EnEmpresa, SoloAdministrador, ZonaEmpresa } from '../../src/identidad/decoradores';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-066 · REQ-ADM-06, REQ-ADM-12, REQ-ADM-17 · specs/08-administracion/plan.md §4 y §7.1

// Una ruta de la zona de empresa, como lo serán las de Administración
@ZonaEmpresa()
@SoloAdministrador()
@Controller('prueba-zona')
class RutaDeAdministracion {
  llamadas = 0;

  @Get()
  responder() {
    this.llamadas += 1;
    return { ok: true };
  }
}

// Una ruta de la aplicación que necesita pertenecer a una empresa, como lo serán las del equipo
@EnEmpresa()
@Controller('prueba-empresa')
class RutaDeEmpresa {
  @Get()
  responder() {
    return { ok: true };
  }
}

const CONTRASENA = 'una-contrasena-de-prueba';
const CREDENCIALES_INVALIDAS = { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'El correo o la contraseña no son correctos.' };

describe('T-066 · pertenencia en la sesión, estado de la cuenta y zona de empresa', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ruta: RutaDeAdministracion;
  let acme: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const entrarEnApp = (correo: string, contrasena = CONTRASENA) => http().post('/auth/ingreso').send({ correo, contrasena });
  const entrarEnZona = (correo: string, contrasena = CONTRASENA) => http().post('/administracion/entrar').send({ correo, contrasena });
  const bearer = (cuerpo: unknown) => `Bearer ${IngresoRespuesta.parse(cuerpo).tokenAcceso}`;

  async function cuentaDeAcme(opciones: { administrador?: boolean; plan?: Plan } = {}) {
    const correo = `ac${++n}@acme.test`;
    const { perfilId } = await crearCuentaLista(
      prisma,
      { organizacionId: acme, correo, rol: 'gerente', plan: opciones.plan ?? 'empresarial', administrador: opciones.administrador ?? false },
      CONTRASENA,
    );
    return { correo, perfilId };
  }

  async function cuentaPersonal() {
    const correo = `pe${++n}@correo.test`;
    const organizacionId = await crearOrganizacion(prisma, `Personal ${n}`, 'personal');
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA);
    return { correo, perfilId, organizacionId };
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule], controllers: [RutaDeAdministracion, RutaDeEmpresa] }).compile();
    app = modulo.createNestApplication();
    await app.init();
    ruta = app.get(RutaDeAdministracion);
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    acme = await crearOrganizacion(prisma, 'Acme', 'empresa');
    ruta.llamadas = 0;
  });

  describe('administracion.solo-el-administrador', () => {
    it('la administradora entra en la zona y usa sus rutas; su sesión de la aplicación no vale allí', async () => {
      const { correo } = await cuentaDeAcme({ administrador: true });
      const zona = await entrarEnZona(correo).expect(200);
      await http().get('/prueba-zona').set('Authorization', bearer(zona.body)).expect(200);

      const app_ = await entrarEnApp(correo).expect(200);
      const r = await http().get('/prueba-zona').set('Authorization', bearer(app_.body)).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('AMBITO_INCORRECTO');
      // Y al revés: la sesión de la zona no abre la aplicación
      const r2 = await http().get('/perfil').set('Authorization', bearer(zona.body)).expect(403);
      expect(ErrorApi.parse(r2.body).codigo).toBe('AMBITO_INCORRECTO');
      expect(ruta.llamadas).toBe(1);
    });

    it('quien no administra ni es responsable recibe el mismo texto que unas credenciales inválidas', async () => {
      const { correo } = await cuentaDeAcme();
      const personal = await cuentaPersonal();
      for (const c of [correo, personal.correo]) {
        expect((await entrarEnZona(c).expect(401)).body).toEqual(CREDENCIALES_INVALIDAS);
      }
      expect((await entrarEnZona(correo, 'no-es-la-contrasena').expect(401)).body).toEqual(CREDENCIALES_INVALIDAS);
      expect((await entrarEnZona('nadie@acme.test').expect(401)).body).toEqual(CREDENCIALES_INVALIDAS);
    });

    it('un responsable que no administra entra en la zona, pero una ruta de administración lo rechaza y deja registro', async () => {
      const { correo, perfilId } = await cuentaDeAcme();
      const ventas = await prisma.equipo.create({ data: { organizacionId: acme, nombre: 'Ventas' } });
      await prisma.miembroEquipo.create({ data: { organizacionId: acme, equipoId: ventas.id, perfilId, responsable: true } });

      const zona = await entrarEnZona(correo).expect(200);
      const r = await http().get('/prueba-zona').set('Authorization', bearer(zona.body)).expect(403);
      expect(ErrorApi.parse(r.body)).toEqual({ codigo: 'ADMINISTRACION_NO_PERMITIDA', mensaje: 'Esto lo hace quien administra la organización.' });
      expect(ruta.llamadas).toBe(0);
      expect(await prisma.eventoAuditoria.count({ where: { organizacionId: acme, perfilId, accion: 'administracion.rechazada' } })).toBe(1);
    });

    it('quitarle la condición surte efecto en la petición siguiente, sin esperar a que caduque el acceso', async () => {
      const { correo, perfilId } = await cuentaDeAcme({ administrador: true });
      const zona = await entrarEnZona(correo).expect(200);
      await http().get('/prueba-zona').set('Authorization', bearer(zona.body)).expect(200);

      await prisma.miembroOrganizacion.updateMany({ where: { perfilId }, data: { administrador: false } });
      const r = await http().get('/prueba-zona').set('Authorization', bearer(zona.body)).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('ADMINISTRACION_NO_PERMITIDA');
      expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'administracion.rechazada' } })).toBe(1);
      // Y la sesión de la zona ya no se renueva
      await http().post('/auth/renovar').send({ tokenRenovacion: IngresoRespuesta.parse(zona.body).tokenRenovacion }).expect(401);
    });

    it('la zona tiene su propia sesión: renovarla la mantiene en la zona y cerrarla no cierra la de la aplicación', async () => {
      const { correo } = await cuentaDeAcme({ administrador: true });
      const zona = IngresoRespuesta.parse((await entrarEnZona(correo).expect(200)).body);
      const app_ = IngresoRespuesta.parse((await entrarEnApp(correo).expect(200)).body);

      const renovada = await http().post('/auth/renovar').send({ tokenRenovacion: zona.tokenRenovacion }).expect(200);
      await http().get('/prueba-zona').set('Authorization', bearer(renovada.body)).expect(200);
      expect(await prisma.sesionRenovacion.count({ where: { ambito: 'empresa' } })).toBe(2);

      await http().post('/auth/salida').send({ tokenRenovacion: IngresoRespuesta.parse(renovada.body).tokenRenovacion }).expect(204);
      await http().post('/auth/renovar').send({ tokenRenovacion: app_.tokenRenovacion }).expect(200);
    });

    it('con el primer ingreso pendiente se le pide hacerlo antes en la aplicación', async () => {
      const { correo, perfilId } = await cuentaDeAcme({ administrador: true });
      await prisma.perfilUsuario.update({ where: { id: perfilId }, data: { debeCambiarContrasena: true } });
      const r = await entrarEnZona(correo).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('PRIMER_INGRESO_PENDIENTE');
    });
  });

  describe('afiliacion.sin-afiliar-es-plan-personal', () => {
    it('una cuenta personal sin afiliar tiene su plan y ninguna organización, y una función de empresa se le explica', async () => {
      const { correo } = await cuentaPersonal();
      const ingreso = await entrarEnApp(correo).expect(200);
      expect(IngresoRespuesta.parse(ingreso.body).plan).toBe('personal');

      const sesion = SesionActual.parse((await http().get('/auth/sesion').set('Authorization', bearer(ingreso.body)).expect(200)).body);
      expect([sesion.plan, sesion.administrador, sesion.organizacion]).toEqual(['personal', false, null]);
      const r = await http().get('/prueba-empresa').set('Authorization', bearer(ingreso.body)).expect(403);
      expect(ErrorApi.parse(r.body)).toEqual({ codigo: 'SIN_ORGANIZACION', mensaje: 'Tu cuenta no pertenece a ninguna organización.' });
    });

    it('afiliada, tiene el Plan Empresarial y pertenece a la empresa; la cuenta propia conserva su plan', async () => {
      const personal = await cuentaPersonal();
      await prisma.miembroOrganizacion.create({ data: { organizacionId: acme, perfilId: personal.perfilId, origen: 'afiliacion', estado: 'vigente' } });
      const afiliada = await entrarEnApp(personal.correo).expect(200);
      expect(IngresoRespuesta.parse(afiliada.body).plan).toBe('empresarial');
      const sesion = SesionActual.parse((await http().get('/auth/sesion').set('Authorization', bearer(afiliada.body)).expect(200)).body);
      expect([sesion.organizacionId, sesion.organizacion]).toEqual([personal.organizacionId, { nombre: 'Acme', tipo: 'empresa' }]);
      await http().get('/prueba-empresa').set('Authorization', bearer(afiliada.body)).expect(200);

      const propia = await cuentaDeAcme({ plan: 'personal' });
      expect(IngresoRespuesta.parse((await entrarEnApp(propia.correo).expect(200)).body).plan).toBe('personal');
    });
  });

  describe('administracion.suspension-cierra-sesiones', () => {
    it('suspendida, su sesión deja de valer en la petición siguiente y al entrar se le dice; con contraseña errónea, lo de siempre', async () => {
      const { correo, perfilId } = await cuentaDeAcme();
      const ingreso = IngresoRespuesta.parse((await entrarEnApp(correo).expect(200)).body);
      await http().get('/perfil').set('Authorization', `Bearer ${ingreso.tokenAcceso}`).expect(200);

      await prisma.perfilUsuario.update({ where: { id: perfilId }, data: { estado: 'suspendida' } });
      await http().get('/perfil').set('Authorization', `Bearer ${ingreso.tokenAcceso}`).expect(401);
      await http().post('/auth/renovar').send({ tokenRenovacion: ingreso.tokenRenovacion }).expect(401);
      expect((await entrarEnApp(correo).expect(403)).body).toEqual({
        codigo: 'CUENTA_SUSPENDIDA',
        mensaje: 'Tu cuenta está suspendida. Habla con quien administra tu organización.',
      });
      expect((await entrarEnApp(correo, 'no-es-la-contrasena').expect(401)).body).toEqual(CREDENCIALES_INVALIDAS);

      await prisma.perfilUsuario.update({ where: { id: perfilId }, data: { estado: 'activa' } });
      await entrarEnApp(correo).expect(200);
    });

    it('cerrada, no entra ni en la aplicación ni en la zona', async () => {
      const { correo, perfilId } = await cuentaDeAcme({ administrador: true });
      await prisma.perfilUsuario.update({ where: { id: perfilId }, data: { estado: 'cerrada' } });
      expect(ErrorApi.parse((await entrarEnApp(correo).expect(403)).body).codigo).toBe('CUENTA_CERRADA');
      expect(ErrorApi.parse((await entrarEnZona(correo).expect(403)).body).codigo).toBe('CUENTA_CERRADA');
    });
  });
});
