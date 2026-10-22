import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IngresoRespuesta, Perfil } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';
import { listarRutas } from '../utilidades/rutas';

// REQ-ACC-10 (lectura), REQ-ACC-12 · T-006
const CONTRASENA = 'una-contrasena-de-prueba';

describe('acceso.cuenta-no-autogestionable', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function sesionDe(rol: 'gerente' | 'colaborador') {
    const correo = `perfil${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan: 'empresarial' }, CONTRASENA, 'Europe/Madrid');
    const sesion = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { correo, perfilId, token: sesion.tokenAcceso };
  }

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

  it('el perfil se lee con su correo, rol, plan, zona y organización', async () => {
    const { correo, perfilId, token } = await sesionDe('gerente');
    const respuesta = await http().get('/perfil').set('Authorization', `Bearer ${token}`).expect(200);
    expect(Perfil.parse(respuesta.body)).toEqual({
      perfilId,
      correo,
      rol: 'gerente',
      plan: 'empresarial',
      zonaHoraria: 'Europe/Madrid',
      organizacion: { nombre: 'Organización de prueba' },
    });
  });

  it('el colaborador también puede leer su perfil (REQ-ACC-13)', async () => {
    const { token } = await sesionDe('colaborador');
    await http().get('/perfil').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('no hay ninguna ruta para cambiar el perfil, la cuenta o el plan, ni para darse de baja', async () => {
    const escrituras = listarRutas(app).filter(
      (r) => r.metodo !== 'GET' && /perfil|cuenta|plan|rol|correo|baja/i.test(r.ruta) && r.ruta !== '/auth/primer-ingreso',
    );
    expect(escrituras).toEqual([]);
  });

  it('intentar cambiar correo, plan o rol no cambia nada', async () => {
    const { perfilId, token } = await sesionDe('gerente');
    const cambios = { correo: 'otro@nexoai.test', plan: 'gratuito', rol: 'usuario_personal' };
    for (const metodo of ['patch', 'put', 'post', 'delete'] as const) {
      await http()[metodo]('/perfil').set('Authorization', `Bearer ${token}`).send(cambios).expect(404);
    }
    const perfil = await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: perfilId } });
    expect([perfil.correo, perfil.plan, perfil.rol]).toEqual([perfil.correo, 'empresarial', 'gerente']);
    expect(perfil.correo).not.toBe('otro@nexoai.test');
  });
});
