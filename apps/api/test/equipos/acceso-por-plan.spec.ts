import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, MisEquiposRespuesta, Perfil } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-120 · REQ-CUN05-18 y 19 · H-ACC-07 · H-EQ-01. La disponibilidad de equipo, solo con plan efectivo
// Empresarial y algún equipo; el responsable y cuántas personas tiene cada equipo, a la vista.
const CONTRASENA = 'una-contrasena-de-prueba';
const RANGO = { desde: '2026-11-12T08:00:00-05:00', hasta: '2026-11-12T20:00:00-05:00' };

describe('T-120 · disponibilidad de equipo por plan y pertenencia', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let acme: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function cuenta(plan: 'personal' | 'empresarial', organizacionId = acme) {
    const correo = `t120-${++n}@acme.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'gerente', plan }, CONTRASENA);
    const sesion = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { correo, perfilId, autorizacion: `Bearer ${sesion.tokenAcceso}` };
  }

  async function equipo(nombre: string, miembros: { perfilId: string; rol: 'responsable' | 'integrante' }[]) {
    const creado = await prisma.equipo.create({ data: { organizacionId: acme, nombre } });
    for (const m of miembros) {
      await prisma.miembroDeEquipo.create({ data: { organizacionId: acme, equipoId: creado.id, perfilId: m.perfilId, rolEnEquipo: m.rol } });
    }
    return creado.id;
  }

  const codigo = (cuerpo: unknown) => ErrorApi.parse(cuerpo).codigo;

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
    acme = await crearOrganizacion(prisma, 'Acme');
  });

  describe('equipos.disponibilidad-sin-plan', () => {
    it('una cuenta de Plan Personal recibe 403 en la lista de equipos y en la consulta, aunque esté en un equipo', async () => {
      const personal = await cuenta('personal');
      const equipoId = await equipo('Ventas', [{ perfilId: personal.perfilId, rol: 'integrante' }]);

      const lista = await http().get('/equipos').set('Authorization', personal.autorizacion).expect(403);
      expect(codigo(lista.body)).toBe('SIN_PLAN_EMPRESARIAL');
      const consulta = await http().get(`/equipos/${equipoId}/disponibilidad`).query(RANGO).set('Authorization', personal.autorizacion).expect(403);
      expect(codigo(consulta.body)).toBe('SIN_PLAN_EMPRESARIAL');
      const integrantes = await http().get(`/equipos/${equipoId}/integrantes`).set('Authorization', personal.autorizacion).expect(403);
      expect(codigo(integrantes.body)).toBe('SIN_PLAN_EMPRESARIAL');
    });
  });

  describe('equipos.disponibilidad-sin-equipo', () => {
    it('una cuenta Empresarial que no está en ningún equipo recibe 403', async () => {
      const sola = await cuenta('empresarial');
      const ajeno = await cuenta('empresarial');
      const equipoId = await equipo('Ventas', [{ perfilId: ajeno.perfilId, rol: 'responsable' }]);

      const lista = await http().get('/equipos').set('Authorization', sola.autorizacion).expect(403);
      expect(codigo(lista.body)).toBe('SIN_EQUIPO');
      const consulta = await http().get(`/equipos/${equipoId}/disponibilidad`).query(RANGO).set('Authorization', sola.autorizacion).expect(403);
      expect(codigo(consulta.body)).toBe('SIN_EQUIPO');
    });
  });

  describe('equipos.disponibilidad-afiliada', () => {
    // INC-37: `miembro_de_equipo` exige que el perfil sea de la organización del equipo, y la cuenta afiliada
    // sigue en la suya (H-ADM-16). No se puede sembrar una afiliada en un equipo hasta resolverla.
    it.skip('una cuenta afiliada a una empresa (plan efectivo Empresarial) que está en un equipo lo consulta (INC-37)', () => {});
  });

  describe('equipos.responsable-visible', () => {
    it('cada equipo dice quién es su responsable y cuántas personas tiene, responsable incluido (H-EQ-01)', async () => {
      const rosa = await cuenta('empresarial');
      const lucia = await cuenta('empresarial');
      const mateo = await cuenta('empresarial');
      await equipo('Ventas', [
        { perfilId: rosa.perfilId, rol: 'responsable' },
        { perfilId: lucia.perfilId, rol: 'integrante' },
        { perfilId: mateo.perfilId, rol: 'integrante' },
      ]);
      await equipo('Soporte', [{ perfilId: mateo.perfilId, rol: 'integrante' }]);

      const equipos = MisEquiposRespuesta.parse((await http().get('/equipos').set('Authorization', mateo.autorizacion).expect(200)).body);
      const porNombre = Object.fromEntries(equipos.map((e) => [e.equipo.nombre, { responsable: e.responsable, integrantes: e.integrantes }]));
      expect(porNombre).toEqual({
        Ventas: { responsable: { correo: rosa.correo }, integrantes: 3 },
        Soporte: { responsable: null, integrantes: 1 },
      });
    });
  });

  describe('acceso.perfil-plan-efectivo', () => {
    it('una cuenta afiliada lee su plan propio y el efectivo, y en cuántos equipos está', async () => {
      const suya = await crearOrganizacion(prisma, 'Personal de Vasco', 'personal');
      const vasco = await cuenta('personal', suya);
      await prisma.miembroOrganizacion.create({ data: { organizacionId: acme, perfilId: vasco.perfilId, origen: 'afiliacion', estado: 'vigente' } });
      // La pertenencia entra en el token al ingresar
      const sesion = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo: vasco.correo, contrasena: CONTRASENA }).expect(200)).body);

      const perfil = Perfil.parse((await http().get('/perfil').set('Authorization', `Bearer ${sesion.tokenAcceso}`).expect(200)).body);
      expect({ plan: perfil.plan, planEfectivo: perfil.planEfectivo, equipos: perfil.equipos }).toEqual({ plan: 'personal', planEfectivo: 'empresarial', equipos: 0 });
    });

    it('una cuenta propia en un equipo cuenta sus equipos', async () => {
      const rosa = await cuenta('empresarial');
      await equipo('Ventas', [{ perfilId: rosa.perfilId, rol: 'responsable' }]);
      const perfil = Perfil.parse((await http().get('/perfil').set('Authorization', rosa.autorizacion).expect(200)).body);
      expect({ planEfectivo: perfil.planEfectivo, equipos: perfil.equipos }).toEqual({ planEfectivo: 'empresarial', equipos: 1 });
    });
  });
});
