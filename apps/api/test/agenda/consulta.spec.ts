import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, EventoAgenda, IngresoRespuesta, type Rol } from '@nexoai/contratos';
import request from 'supertest';
import { z } from 'zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-015 · REQ-CUN01-08, REQ-CUN01-09, REQ-CUN01-10, REQ-CUN01-11 (consulta)

const CONTRASENA = 'una-contrasena-de-prueba';
const calendario = new ProveedorCalendarioSimulado();
const Lista = z.array(EventoAgenda);
const DIA = 24 * 3600_000;

describe('T-015 · consulta de la agenda', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function persona({ conCalendario = true, rol = 'usuario_personal' as Rol } = {}) {
    const correo = `ca${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan: rol === 'usuario_personal' ? 'personal' : 'empresarial' }, CONTRASENA);
    if (conCalendario) {
      await prisma.consentimientoIntegracion.create({
        data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
      });
    }
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  // Una semana alrededor de ahora
  const rango = () => ({ desde: new Date(Date.now() - 3 * DIA).toISOString(), hasta: new Date(Date.now() + 4 * DIA).toISOString() });
  const consultar = (autorizacion: string, consulta: Record<string, string> = rango()) =>
    http().get('/agenda/eventos').query(consulta).set('Authorization', autorizacion);

  const enUnaHora = () => {
    const inicio = new Date(Math.ceil(Date.now() / 3600_000) * 3600_000 + 3600_000);
    return { inicio, fin: new Date(inicio.getTime() + 3600_000) };
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROVEEDOR_CALENDARIO)
      .useValue(calendario)
      .compile();
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
    calendario.reiniciar();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
  });

  describe('agenda.sin-permiso-no-invoca-proveedor', () => {
    it('sin el calendario conectado responde PERMISO_GOOGLE_FALTANTE y no llama a Google', async () => {
      const { autorizacion } = await persona({ conCalendario: false });
      const r = await consultar(autorizacion).expect(403);
      expect(ErrorApi.parse(r.body)).toMatchObject({ codigo: 'PERMISO_GOOGLE_FALTANTE' });
      expect(ErrorApi.parse(r.body).mensaje).toContain('Ajustes');
      await http().get(`/agenda/eventos/${crypto.randomUUID()}`).set('Authorization', autorizacion).expect(403);
      expect(calendario.llamadas).toEqual({ lecturas: 0, escrituras: 0 });
    });

    it('con el permiso retirado tampoco llama a Google', async () => {
      const { autorizacion, perfilId } = await persona();
      await prisma.consentimientoIntegracion.updateMany({ where: { perfilId }, data: { estado: 'revocado' } });
      await consultar(autorizacion).expect(403);
      expect(calendario.llamadas.lecturas).toBe(0);
    });
  });

  describe('agenda.consulta-sin-proveedor-de-modelo', () => {
    it('la agenda se consulta sin ningún proveedor de modelo configurado', async () => {
      for (const variable of Object.keys(process.env)) {
        if (/ANTHROPIC|OPENAI|MODELO|LLM/i.test(variable)) delete process.env[variable];
      }
      const { autorizacion, perfilId } = await persona();
      const { inicio, fin } = enUnaHora();
      calendario.sembrar(perfilId, { titulo: 'Revisión', inicio, fin, zonaHoraria: 'America/Lima' });
      const eventos = Lista.parse((await consultar(autorizacion).expect(200)).body);
      expect(eventos.map((e) => e.titulo)).toEqual(['Revisión']);
    });

    it('si Google no responde, se muestra la última copia (P-11)', async () => {
      const { autorizacion, perfilId } = await persona();
      const { inicio, fin } = enUnaHora();
      calendario.sembrar(perfilId, { titulo: 'Ya replicado', inicio, fin, zonaHoraria: 'UTC' });
      await consultar(autorizacion).expect(200);
      await prisma.sincronizacionCalendario.update({ where: { perfilId }, data: { ultimaSincronizacion: new Date(Date.now() - 10 * 60_000) } });
      calendario.caido = true;
      expect(Lista.parse((await consultar(autorizacion).expect(200)).body).map((e) => e.titulo)).toEqual(['Ya replicado']);
    });

    it('si Google no responde y nunca se sincronizó, lo dice', async () => {
      const { autorizacion } = await persona();
      calendario.caido = true;
      const r = await consultar(autorizacion).expect(502);
      expect(ErrorApi.parse(r.body).codigo).toBe('GOOGLE_NO_DISPONIBLE');
    });
  });

  describe('agenda.solo-eventos-propios', () => {
    it('la consulta no devuelve ni deja abrir eventos de otra persona', async () => {
      const ana = await persona();
      const beto = await persona({ rol: 'gerente' });
      const { inicio, fin } = enUnaHora();
      calendario.sembrar(ana.perfilId, { titulo: 'De Ana', inicio, fin, zonaHoraria: 'UTC' });
      calendario.sembrar(beto.perfilId, { titulo: 'De Beto', inicio, fin, zonaHoraria: 'UTC' });

      const deAna = Lista.parse((await consultar(ana.autorizacion).expect(200)).body);
      const deBeto = Lista.parse((await consultar(beto.autorizacion).expect(200)).body);
      expect(deAna.map((e) => e.titulo)).toEqual(['De Ana']);
      await http().get(`/agenda/eventos/${deAna[0]!.id}`).set('Authorization', ana.autorizacion).expect(200);
      const r = await http().get(`/agenda/eventos/${deBeto[0]!.id}`).set('Authorization', ana.autorizacion).expect(404);
      expect(ErrorApi.parse(r.body).codigo).toBe('EVENTO_NO_ENCONTRADO');
    });

    it('el colaborador no tiene agenda propia en NexoAI (REQ-ACC-13)', async () => {
      const { autorizacion } = await persona({ rol: 'colaborador' });
      const r = await consultar(autorizacion).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('ROL_NO_PERMITIDO');
    });
  });

  describe('agenda.horas-con-zona-horaria', () => {
    it('cada hora sale con el desfase de su zona y con la zona IANA aparte', async () => {
      const { autorizacion, perfilId } = await persona();
      // El lunes siguiente al cambio de hora de Madrid: 09:00 UTC son las 10:00 en Madrid (+01:00)
      calendario.sembrar(perfilId, { titulo: 'Madrid', inicio: new Date('2026-10-26T09:00:00Z'), fin: new Date('2026-10-26T10:00:00Z'), zonaHoraria: 'Europe/Madrid' });
      calendario.sembrar(perfilId, { titulo: 'Lima', inicio: new Date('2026-10-26T15:00:00Z'), fin: new Date('2026-10-26T16:00:00Z'), zonaHoraria: 'America/Lima' });
      const eventos = Lista.parse(
        (await consultar(autorizacion, { desde: '2026-10-26T00:00:00-05:00', hasta: '2026-10-27T00:00:00-05:00' }).expect(200)).body,
      );
      expect(eventos.map((e) => [e.titulo, e.inicio, e.fin, e.zonaHoraria])).toEqual([
        ['Madrid', '2026-10-26T10:00:00+01:00', '2026-10-26T11:00:00+01:00', 'Europe/Madrid'],
        ['Lima', '2026-10-26T10:00:00-05:00', '2026-10-26T11:00:00-05:00', 'America/Lima'],
      ]);
    });
  });

  it('sincroniza bajo demanda solo si la última sincronización tiene más de 2 minutos', async () => {
    const { autorizacion, perfilId } = await persona();
    await consultar(autorizacion).expect(200);
    await consultar(autorizacion).expect(200);
    expect(calendario.llamadas.lecturas).toBe(1);

    const { inicio, fin } = enUnaHora();
    calendario.sembrar(perfilId, { titulo: 'Nuevo en Google', inicio, fin, zonaHoraria: 'UTC' });
    await prisma.sincronizacionCalendario.update({ where: { perfilId }, data: { ultimaSincronizacion: new Date(Date.now() - 3 * 60_000) } });
    const eventos = Lista.parse((await consultar(autorizacion).expect(200)).body);
    expect(calendario.llamadas.lecturas).toBe(2);
    expect(eventos.map((e) => e.titulo)).toEqual(['Nuevo en Google']);
  });

  it('rechaza un rango al revés o sin desfase', async () => {
    const { autorizacion } = await persona();
    await consultar(autorizacion, { desde: '2026-10-27T00:00:00Z', hasta: '2026-10-26T00:00:00Z' }).expect(400);
    await consultar(autorizacion, { desde: '2026-10-26T00:00:00', hasta: '2026-10-27T00:00:00' }).expect(400);
    expect(calendario.llamadas.lecturas).toBe(0);
  });
});
