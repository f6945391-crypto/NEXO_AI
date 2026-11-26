import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DisponibilidadEquipoRespuesta, ErrorApi, IngresoRespuesta, MisEquiposRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-124 · specs/05-equipos/casos-de-prueba.md. El escenario «Proyecto Alfa» de Reuniones Demo: un administrador
// sin equipo, un líder, cuatro integrantes con estados distintos y una cuenta de Plan Personal, con el
// calendario simulado. Los casos comparten los datos y van en orden: CP-R-10 y 11 cambian autorizaciones.
const CONTRASENA = 'una-contrasena-de-prueba';
const ZONA = 'America/Lima';
const calendario = new ProveedorCalendarioSimulado();

type Clave = 'admin' | 'lider' | 'ana' | 'beto' | 'carla' | 'diego' | 'pablo';

const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
const manana = new Date(Date.parse(`${hoy}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const aLas = (hora: string) => `${manana}T${hora}:00-05:00`;
const RANGO = { desde: aLas('08:00'), hasta: aLas('20:00') };
// Las horas de un intervalo, en Lima
const horas = (i: { inicio: string; fin: string }) =>
  [i.inicio, i.fin].map((t) => new Intl.DateTimeFormat('es', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t))).join('–');

describe('equipos.escenario-reuniones', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let equipoId: string;
  const p = {} as Record<Clave, { perfilId: string; autorizacion: string; correo: string }>;

  const http = () => request(app.getHttpServer());
  const consultar = (quien: Clave, extra: Record<string, string> = {}) =>
    http().get(`/equipos/${equipoId}/disponibilidad`).query({ ...RANGO, ...extra }).set('Authorization', p[quien].autorizacion);
  const leer = async (quien: Clave, extra: Record<string, string> = {}) =>
    DisponibilidadEquipoRespuesta.parse((await consultar(quien, extra).expect(200)).body);
  const ids = (...claves: Clave[]) => claves.map((c) => p[c].perfilId).join(',');

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROVEEDOR_CALENDARIO)
      .useValue(calendario)
      .compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
    await vaciarTablas();

    // §1.1 y §1.2: todas son cuentas propias de Reuniones Demo (INC-37)
    const organizacionId = await crearOrganizacion(prisma, 'Reuniones Demo');
    const personas: [Clave, 'gerente' | 'colaborador' | 'usuario_personal', 'empresarial' | 'personal', boolean][] = [
      ['admin', 'gerente', 'empresarial', true],
      ['lider', 'gerente', 'empresarial', false],
      ['ana', 'colaborador', 'empresarial', false],
      ['beto', 'colaborador', 'empresarial', false],
      ['carla', 'colaborador', 'empresarial', false],
      ['diego', 'colaborador', 'empresarial', false],
      ['pablo', 'usuario_personal', 'personal', false],
    ];
    for (const [clave, rol, plan, administrador] of personas) {
      const correo = `${clave}@reuniones.test`;
      const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan, administrador }, CONTRASENA, ZONA);
      const sesion = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
      p[clave] = { perfilId, autorizacion: `Bearer ${sesion.tokenAcceso}`, correo };
    }

    // Calendario conectado: todos los del equipo salvo diego
    for (const clave of ['lider', 'ana', 'beto', 'carla'] as const) {
      await prisma.consentimientoIntegracion.create({
        data: { organizacionId, perfilId: p[clave].perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
      });
    }
    // §1.3
    const eventos: [Clave, string, string, string][] = [
      ['lider', '09:00', '10:00', 'Comité'],
      ['lider', '15:00', '16:00', 'Revisión'],
      ['ana', '10:00', '11:00', 'Cliente'],
      ['ana', '15:30', '17:00', 'Taller'],
      ['beto', '08:00', '09:30', 'Desayuno'],
      ['beto', '13:00', '14:00', 'Almuerzo'],
      ['carla', '11:00', '12:00', 'Privado'],
    ];
    for (const [clave, inicio, fin, titulo] of eventos) {
      calendario.sembrar(p[clave].perfilId, { titulo, inicio: new Date(aLas(inicio)), fin: new Date(aLas(fin)), zonaHoraria: ZONA });
    }

    const equipo = await prisma.equipo.create({ data: { organizacionId, nombre: 'Proyecto Alfa' } });
    equipoId = equipo.id;
    const miembros: [Clave, 'responsable' | 'integrante', 'concedida' | 'pendiente'][] = [
      ['lider', 'responsable', 'concedida'],
      ['ana', 'integrante', 'concedida'],
      ['beto', 'integrante', 'concedida'],
      ['carla', 'integrante', 'pendiente'],
      ['diego', 'integrante', 'concedida'],
    ];
    for (const [clave, rolEnEquipo, estadoConsentimiento] of miembros) {
      await prisma.miembroDeEquipo.create({ data: { organizacionId, equipoId, perfilId: p[clave].perfilId, rolEnEquipo, estadoConsentimiento } });
    }
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('CP-R-01 · la cuenta de Plan Personal no lista equipos', async () => {
    const r = await http().get('/equipos').set('Authorization', p.pablo.autorizacion).expect(403);
    expect(ErrorApi.parse(r.body).codigo).toBe('SIN_PLAN_EMPRESARIAL');
  });

  it('CP-R-02 · el administrador sin equipo tampoco', async () => {
    const r = await http().get('/equipos').set('Authorization', p.admin.autorizacion).expect(403);
    expect(ErrorApi.parse(r.body).codigo).toBe('SIN_EQUIPO');
  });

  it('CP-R-04 · el líder ve el equipo con su responsable y sus 5 personas', async () => {
    const [alfa] = MisEquiposRespuesta.parse((await http().get('/equipos').set('Authorization', p.lider.autorizacion).expect(200)).body);
    expect({ nombre: alfa!.equipo.nombre, responsable: alfa!.responsable, integrantes: alfa!.integrantes }).toEqual({
      nombre: 'Proyecto Alfa',
      responsable: { correo: 'lider@reuniones.test' },
      integrantes: 5,
    });
  });

  it('CP-R-05 · a todos: parcial, con carla y diego sin datos y tres huecos comunes', async () => {
    const r = await leer('lider');
    expect(r.disponibilidadCompleta).toBe(false);
    expect(r.participantesConsultados).toBe(3);
    expect(Object.fromEntries(r.detalleParticipantesSinDatos.map((d) => [d.perfilId, d.motivo]))).toEqual({
      [p.carla.perfilId]: 'sin_consentimiento',
      [p.diego.perfilId]: 'calendario_no_disponible',
    });
    expect(r.intervalosComunes.map(horas)).toEqual(['11:00–13:00', '14:00–15:00', '17:00–20:00']);
    expect(r.advertencia).not.toBeNull();
  });

  it('CP-R-06 · solo lider, ana y beto: completa y sin advertencia', async () => {
    const r = await leer('lider', { participantes: ids('lider', 'ana', 'beto') });
    expect(r.disponibilidadCompleta).toBe(true);
    expect(r.estadoDisponibilidad).toBe('disponible');
    expect(r.intervalos.map(horas)).toEqual(['11:00–13:00', '14:00–15:00', '17:00–20:00']);
    expect(r.advertencia).toBeNull();
  });

  it('CP-R-07 · con 90 minutos quedan los dos huecos que los admiten', async () => {
    const r = await leer('lider', { participantes: ids('lider', 'ana', 'beto'), duracionMinutos: '90' });
    expect(r.intervalosComunes.map(horas)).toEqual(['11:00–13:00', '14:00–15:00', '17:00–20:00']);
    expect(r.intervalos.map(horas)).toEqual(['11:00–13:00', '17:00–20:00']);
  });

  it('CP-R-08 · una integrante consulta igual que el líder', async () => {
    const delLider = await leer('lider', { participantes: ids('lider', 'ana', 'beto') });
    const deAna = await leer('ana', { participantes: ids('lider', 'ana', 'beto') });
    expect(deAna.intervalos).toEqual(delLider.intervalos);
  });

  it('CP-R-09 · ninguna respuesta trae títulos de eventos', async () => {
    const texto = JSON.stringify([await leer('lider'), await leer('ana')]);
    for (const titulo of ['Comité', 'Revisión', 'Cliente', 'Taller', 'Desayuno', 'Almuerzo', 'Privado']) expect(texto).not.toContain(titulo);
  });

  it('CP-R-10 · cuando carla autoriza, su hora ocupada cuenta', async () => {
    await prisma.miembroDeEquipo.updateMany({ where: { perfilId: p.carla.perfilId }, data: { estadoConsentimiento: 'concedida' } });
    const r = await leer('lider', { participantes: ids('lider', 'ana', 'beto', 'carla') });
    expect(r.disponibilidadCompleta).toBe(true);
    expect(r.intervalos.map(horas)).toEqual(['12:00–13:00', '14:00–15:00', '17:00–20:00']);
  });

  it('CP-R-11 · cuando ana retira su autorización, pasa a sin datos', async () => {
    await prisma.miembroDeEquipo.updateMany({ where: { perfilId: p.ana.perfilId }, data: { estadoConsentimiento: 'revocada' } });
    const r = await leer('lider');
    expect(r.detalleParticipantesSinDatos.find((d) => d.perfilId === p.ana.perfilId)?.motivo).toBe('sin_consentimiento');
  });

  it('CP-R-12 · un equipo ajeno se rechaza', async () => {
    const otro = await prisma.equipo.create({ data: { organizacionId: (await prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })).organizacionId, nombre: 'Proyecto Beta' } });
    const r = await http().get(`/equipos/${otro.id}/disponibilidad`).query(RANGO).set('Authorization', p.lider.autorizacion).expect(403);
    expect(ErrorApi.parse(r.body).codigo).toBe('SOLICITUD_INVALIDA');
  });
});
