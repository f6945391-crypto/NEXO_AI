import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ControlTarea, ErrorApi, IngresoRespuesta, OperacionRespuesta, RespuestaAsistente, RespuestaTareas, TareaPersonal, TareasDelDia } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { diaEn } from '../../src/tareas/dominio/franja';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-049 · REQ-CUN03-06, 07, 09, 10, 13, 18, 19, 20 · H-TP-06, H-TP-07. Las rutas de consulta y los dos
// controles directos, con tareas sembradas por Operaciones, como las crea el asistente. Las fechas son
// relativas al día en que corre la prueba, en Lima.

const CONTRASENA = 'una-contrasena-de-prueba';
const LIMA = 'America/Lima';
const DIA_MS = 24 * 3600_000;
const calendario = new ProveedorCalendarioSimulado();

const hoy = () => diaEn(new Date(), LIMA);
const dias = (n: number) => new Date(Date.parse(`${hoy()}T12:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);

describe('T-049 · consulta y rutas de tareas', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function persona(rol: 'usuario_personal' | 'gerente' | 'colaborador' = 'usuario_personal') {
    const correo = `ct${++n}@nexoai.test`;
    const plan = rol === 'usuario_personal' ? 'personal' : 'empresarial';
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan }, CONTRASENA, LIMA);
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  async function sembrar(autorizacion: string, carga: object): Promise<TareaPersonal> {
    const op = OperacionRespuesta.parse((await http().post('/operaciones').set('Authorization', autorizacion).send({ tipo: 'tareas.registrar', carga, origen: 'agente' }).expect(201)).body);
    return TareaPersonal.parse(OperacionRespuesta.parse((await http().post(`/operaciones/${op.id}/confirmar`).set('Authorization', autorizacion).expect(200)).body).resultado);
  }

  const tareas = async (autorizacion: string, consulta: Record<string, string> = {}) =>
    RespuestaTareas.parse((await http().get('/tareas').query(consulta).set('Authorization', autorizacion).expect(200)).body);
  const delDia = async (autorizacion: string, fecha: string) =>
    TareasDelDia.parse((await http().get('/tareas/dia').query({ fecha }).set('Authorization', autorizacion).expect(200)).body);
  const hecha = (autorizacion: string, id: string) => http().post(`/tareas/${id}/hecha`).set('Authorization', autorizacion);
  const reabrir = (autorizacion: string, id: string) => http().post(`/tareas/${id}/reabrir`).set('Authorization', autorizacion);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PROVEEDOR_CALENDARIO).useValue(calendario).compile();
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

  it('las pendientes salen por franja y en el orden de H-TP-05, con franja, vencida y textos (REQ-CUN03-06, 07)', async () => {
    const { autorizacion } = await persona();
    await sembrar(autorizacion, { texto: 'Pagar el recibo', fecha: dias(5) });
    await sembrar(autorizacion, { texto: 'Renovar el DNI', fecha: dias(-3) });
    await sembrar(autorizacion, { texto: 'Llamar al dentista' });
    await sembrar(autorizacion, { texto: 'Presupuesto', deQuien: 'Juan', esperadaDesde: dias(-6) });

    const r = await tareas(autorizacion);
    expect(r.zona).toBe('Hora de Lima (GMT-5)');
    expect(r.pendientes.map((t) => [t.texto, t.franja, t.vencida])).toEqual([
      ['Renovar el DNI', 'con_fecha', true],
      ['Pagar el recibo', 'con_fecha', false],
      ['Llamar al dentista', 'sin_fecha', false],
      ['Presupuesto', 'esperando', false],
    ]);
    expect(r.pendientes[0]!.cuando).toMatch(/^Vencía el \p{L}+ \d+ de \p{L}+$/u);
    expect(r.pendientes[3]!.espera).toMatch(/^De Juan · Desde el \p{L}+ \d+ de \p{L}+, hace 6 días$/u);
    expect(r.porConfirmar).toEqual([]);

    // Una franja sola, y con `hasta` solo «Con fecha» hasta ese día con las vencidas (H-TP-18)
    expect((await tareas(autorizacion, { franja: 'sin_fecha' })).pendientes.map((t) => t.texto)).toEqual(['Llamar al dentista']);
    expect((await tareas(autorizacion, { hasta: dias(2) })).pendientes.map((t) => t.texto)).toEqual(['Renovar el DNI']);
    await http().get('/tareas').query({ franja: 'encargadas' }).set('Authorization', autorizacion).expect(400);
  });

  describe('tareas.hecha-y-reabrir', () => {
    it('«Hecho» sin tarjeta, idempotente, con Operaciones de control directo; «Reabrir» la devuelve con sus datos', async () => {
      const { autorizacion } = await persona();
      const recibo = await sembrar(autorizacion, { texto: 'Pagar el recibo', fecha: dias(5), horaLimite: '18:00' });

      const primera = ControlTarea.parse((await hecha(autorizacion, recibo.id).expect(200)).body);
      expect(primera.tarea).toMatchObject({ estado: 'hecha', cierre: `Hecha el ${new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${hoy()}T12:00:00Z`)).replace(',', '')}` });
      const segunda = ControlTarea.parse((await hecha(autorizacion, recibo.id).expect(200)).body);
      expect(segunda.operacionId).not.toBe(primera.operacionId);
      const ops = await prisma.operacion.findMany({ where: { tipo: 'tareas.completar' } });
      expect(ops).toHaveLength(2);
      expect(ops.every((o) => o.origen === 'control_directo' && o.estado === 'ejecutada' && o.conversacionId === null)).toBe(true);

      let r = await tareas(autorizacion);
      expect(r.pendientes).toEqual([]);
      expect(r.hechasRecientes.map((t) => t.texto)).toEqual(['Pagar el recibo']);

      const abierta = ControlTarea.parse((await reabrir(autorizacion, recibo.id).expect(200)).body);
      expect(abierta.tarea).toMatchObject({ estado: 'pendiente', franja: 'con_fecha', fecha: dias(5), horaLimite: '18:00', texto: 'Pagar el recibo', hechaEn: null });
      r = await tareas(autorizacion);
      expect(r.pendientes.map((t) => t.id)).toEqual([recibo.id]);
      expect(r.hechasRecientes).toEqual([]);
    });

    it('«Recibido» sobre lo que se espera; las hechas de más de siete días no salen (H-TP-06)', async () => {
      const { autorizacion } = await persona();
      const presupuesto = await sembrar(autorizacion, { texto: 'Presupuesto', deQuien: 'Juan' });
      const vieja = await sembrar(autorizacion, { texto: 'Enviar la tesis' });
      const r = ControlTarea.parse((await hecha(autorizacion, presupuesto.id).expect(200)).body);
      expect(r.tarea.cierre).toMatch(/^Recibido el /);
      expect((await prisma.operacion.findFirstOrThrow({ where: { id: r.operacionId } })).tipo).toBe('tareas.recibido');

      await hecha(autorizacion, vieja.id).expect(200);
      await prisma.tareaPersonal.update({ where: { id: vieja.id }, data: { hechaEn: new Date(Date.now() - 8 * DIA_MS) } });
      expect((await tareas(autorizacion)).hechasRecientes.map((t) => t.texto)).toEqual(['Presupuesto']);
      // Una descartada no se da por hecha ni se reabre
      const tercera = await sembrar(autorizacion, { texto: 'Otra' });
      await prisma.tareaPersonal.update({ where: { id: tercera.id }, data: { estado: 'descartada', descartadaEn: new Date() } });
      expect(ErrorApi.parse((await hecha(autorizacion, tercera.id).expect(409)).body).codigo).toBe('TAREA_NO_MODIFICABLE');
      expect((await tareas(autorizacion)).pendientes).toEqual([]);
    });
  });

  describe('tareas.del-dia-con-vencidas', () => {
    it('hoy: las del día por hora límite y después las vencidas; otro día, solo las suyas (REQ-CUN03-13)', async () => {
      const { autorizacion } = await persona();
      await sembrar(autorizacion, { texto: 'Pagar el recibo', fecha: hoy(), horaLimite: '23:59' });
      await sembrar(autorizacion, { texto: 'Comprar pan', fecha: hoy() });
      await sembrar(autorizacion, { texto: 'Renovar el DNI', fecha: dias(-3) });
      await sembrar(autorizacion, { texto: 'Enviar la tesis', fecha: dias(4) });
      await sembrar(autorizacion, { texto: 'Llamar al dentista' });
      // Lo que se espera de alguien no es un plazo propio (H-TP-04)
      await sembrar(autorizacion, { texto: 'Presupuesto', deQuien: 'Juan', fecha: hoy() });

      const deHoy = await delDia(autorizacion, hoy());
      expect(deHoy.esHoy).toBe(true);
      expect(deHoy.tareas.map((t) => [t.texto, t.vencida])).toEqual([
        ['Pagar el recibo', false],
        ['Comprar pan', false],
        ['Renovar el DNI', true],
      ]);
      expect(deHoy.tareas[0]!.cuando).toMatch(/· Antes de las 23:59$/);

      const otro = await delDia(autorizacion, dias(4));
      expect(otro.esHoy).toBe(false);
      expect(otro.tareas.map((t) => t.texto)).toEqual(['Enviar la tesis']);
      expect((await delDia(autorizacion, dias(1))).tareas).toEqual([]);
      await http().get('/tareas/dia').query({ fecha: 'mañana' }).set('Authorization', autorizacion).expect(400);
    });
  });

  describe('tareas.solo-las-propias', () => {
    it('ni otra persona ni el responsable del equipo ven las tareas de alguien (REQ-CUN03-19)', async () => {
      const colaborador = await persona('colaborador');
      const gerente = await persona('gerente');
      const tarea = await sembrar(colaborador.autorizacion, { texto: 'Pedir cita médica' });

      expect((await tareas(gerente.autorizacion)).pendientes).toEqual([]);
      expect((await delDia(gerente.autorizacion, hoy())).tareas).toEqual([]);
      for (const ruta of [`/tareas/${tarea.id}`, '/tareas/no-es-un-id']) {
        const r = ErrorApi.parse((await http().get(ruta).set('Authorization', gerente.autorizacion).expect(404)).body);
        expect(r.codigo).toBe('TAREA_NO_ENCONTRADA');
      }
      expect(ErrorApi.parse((await hecha(gerente.autorizacion, tarea.id).expect(404)).body).codigo).toBe('TAREA_NO_ENCONTRADA');
      // El colaborador sí usa sus tareas (REQ-ACC-13)
      expect(TareaPersonal.parse((await http().get(`/tareas/${tarea.id}`).set('Authorization', colaborador.autorizacion).expect(200)).body).texto).toBe('Pedir cita médica');
      await http().get('/tareas').expect(401);
    });
  });

  describe('tareas.sin-calendario', () => {
    it('sin el calendario de Google conectado se registra, se ve y se completa, sin llamar a Google (REQ-CUN03-20)', async () => {
      const { autorizacion, perfilId } = await persona();
      expect(await prisma.consentimientoIntegracion.count({ where: { perfilId } })).toBe(0);
      const tarea = await sembrar(autorizacion, { texto: 'Llamar al banco', fecha: dias(3) });
      expect((await delDia(autorizacion, dias(3))).tareas.map((t) => t.id)).toEqual([tarea.id]);
      await hecha(autorizacion, tarea.id).expect(200);
      await reabrir(autorizacion, tarea.id).expect(200);
      expect(calendario.llamadas.escrituras).toBe(0);
    });
  });

  describe('tareas.consulta-sin-proveedor-de-modelo', () => {
    it('con el asistente sin responder, la lista se ve y «Hecho» funciona; lo pedido queda en espera sin crear nada (REQ-CUN03-18)', async () => {
      const { autorizacion } = await persona();
      const recibo = await sembrar(autorizacion, { texto: 'Pagar el recibo' });

      // En las pruebas no hay proveedor de modelo: el asistente no responde
      const r = RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto: 'recuérdame comprar pan' }).expect(200)).body);
      expect(r.turnos.some((t) => t.tipo === 'en_espera' && t.motivo === 'asistente_no_disponible')).toBe(true);
      expect(await prisma.tareaPersonal.count()).toBe(1);

      expect((await tareas(autorizacion)).pendientes.map((t) => t.texto)).toEqual(['Pagar el recibo']);
      await hecha(autorizacion, recibo.id).expect(200);
      expect((await tareas(autorizacion)).hechasRecientes.map((t) => t.texto)).toEqual(['Pagar el recibo']);
    });
  });
});
