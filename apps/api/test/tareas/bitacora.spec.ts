import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ControlTarea, ErrorApi, IngresoRespuesta, OperacionRespuesta, RespuestaTareas, TareaPersonal } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CicloDeVidaAsistente } from '../../src/agente/ciclo-de-vida';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { diaEn } from '../../src/tareas/dominio/franja';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-125 · specs/09-tareas-personales/plan.md §13 · REQ-CUN03-22, 24, 25, 26, 27 · H-TP-27, 30, 31. La bitácora,
// el contexto y el aviso al vencer, por HTTP, como los usan el agente (origen `agente`) y la lista
// (`control_directo`).

const CONTRASENA = 'una-contrasena-de-prueba';
const LIMA = 'America/Lima';
const DIA_MS = 24 * 3600_000;
const calendario = new ProveedorCalendarioSimulado();
const dias = (n: number) => new Date(Date.parse(`${diaEn(new Date(), LIMA)}T12:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);

describe('T-125 · bitácora, contexto y aviso al vencer', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let autorizacion: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const proponer = (tipo: string, carga: unknown, origen = 'agente') => http().post('/operaciones').set('Authorization', autorizacion).send({ tipo, carga, origen });
  const confirmar = (id: string) => http().post(`/operaciones/${id}/confirmar`).set('Authorization', autorizacion);
  const tareas = async () => RespuestaTareas.parse((await http().get('/tareas').set('Authorization', autorizacion).expect(200)).body);
  const tarea = async (id: string) => TareaPersonal.parse((await http().get(`/tareas/${id}`).set('Authorization', autorizacion).expect(200)).body);

  async function registrada(carga: object): Promise<TareaPersonal> {
    const op = OperacionRespuesta.parse((await proponer('tareas.registrar', carga).expect(201)).body);
    return TareaPersonal.parse(OperacionRespuesta.parse((await confirmar(op.id).expect(200)).body).resultado);
  }
  async function anotado(tareaId: string, texto: string): Promise<TareaPersonal> {
    const op = OperacionRespuesta.parse((await proponer('tareas.anotar_avance', { tareaId, texto }).expect(201)).body);
    return TareaPersonal.parse(OperacionRespuesta.parse((await confirmar(op.id).expect(200)).body).resultado);
  }

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
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `bt${++n}@nexoai.test`;
    await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, LIMA);
    autorizacion = `Bearer ${IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body).tokenAcceso}`;
  });

  describe('tareas.bitacora', () => {
    it('la tarjeta dice la tarea y el avance; sin confirmar no se anota, y confirmar dos veces anota uno (REQ-CUN03-21, 22)', async () => {
      const t = await registrada({ texto: 'Presupuesto de la cocina', contexto: 'Lo veo con Juan y Rosa' });
      expect(t.contexto).toBe('Lo veo con Juan y Rosa');
      expect(t.bitacora).toEqual([]);

      const op = OperacionRespuesta.parse((await proponer('tareas.anotar_avance', { tareaId: t.id, texto: 'Ya hablé con Juan, me falta hablar con Rosa' }).expect(201)).body);
      expect(op.vistaConfirmacion.accion).toBe('Anotar avance');
      expect(op.vistaConfirmacion.datos).toEqual([
        { etiqueta: 'Tarea', valor: 'Presupuesto de la cocina' },
        { etiqueta: 'Contexto', valor: 'Lo veo con Juan y Rosa' },
        { etiqueta: 'Avance', valor: 'Ya hablé con Juan, me falta hablar con Rosa' },
      ]);
      expect((await tarea(t.id)).bitacora).toEqual([]);

      await confirmar(op.id).expect(200);
      await confirmar(op.id).expect(200);
      const despues = await tarea(t.id);
      expect(despues.bitacora).toHaveLength(1);
      expect(despues.bitacora[0]).toMatchObject({ texto: 'Ya hablé con Juan, me falta hablar con Rosa', cuando: expect.stringMatching(/^\p{Lu}\p{Ll}+ \d+ de \p{Ll}+, \d{2}:\d{2}$/u) });
      expect(despues.bitacora[0]!.anotadoEn).toMatch(/-05:00$/);
      // No cambia ni el estado ni la franja
      expect(despues).toMatchObject({ estado: 'pendiente', franja: 'sin_fecha' });
      const fila = await prisma.avanceTarea.findFirstOrThrow({ where: { tareaId: t.id } });
      expect(fila.zonaHoraria).toBe(LIMA);
    });

    it('dos avances salen del más reciente al más antiguo, en Tareas, y la retención de la transcripción no los toca (REQ-CUN03-22, 24)', async () => {
      const t = await registrada({ texto: 'Presupuesto de la cocina' });
      await anotado(t.id, 'Ya hablé con Juan');
      await prisma.avanceTarea.updateMany({ where: { tareaId: t.id }, data: { anotadoEn: new Date(Date.now() - 2 * DIA_MS) } });
      await anotado(t.id, 'Rosa pasa el precio el viernes');

      const lista = await tareas();
      expect(lista.pendientes[0]!.bitacora.map((a) => a.texto)).toEqual(['Rosa pasa el precio el viernes', 'Ya hablé con Juan']);

      // Noventa días y más después: la transcripción se borra; la bitácora sigue (decisión 20 de 07-agente)
      await app.get(CicloDeVidaAsistente).repasar(new Date(Date.now() + 120 * DIA_MS));
      expect((await tarea(t.id)).bitacora).toHaveLength(2);
    });

    it('en una tarea hecha no se anota: se ofrece reabrirla; una descartada tampoco (REQ-CUN03-25)', async () => {
      const t = await registrada({ texto: 'Pagar el recibo de la luz' });
      ControlTarea.parse((await http().post(`/tareas/${t.id}/hecha`).set('Authorization', autorizacion).expect(200)).body);
      const r = ErrorApi.parse((await proponer('tareas.anotar_avance', { tareaId: t.id, texto: 'Pagué en el banco' }).expect(409)).body);
      expect(r.mensaje).toMatch(/ya está hecha.*reábrela/);
      expect(await prisma.avanceTarea.count()).toBe(0);
    });

    it('crear y anotar no son controles directos (R-42)', async () => {
      const t = await registrada({ texto: 'Presupuesto de la cocina' });
      await proponer('tareas.anotar_avance', { tareaId: t.id, texto: 'Algo' }, 'control_directo').expect(403);
    });
  });

  describe('tareas.aviso-al-vencer', () => {
    it('una vencida trae el aviso; «Mantener abierta» lo quita, queda auditado y la tarea sigue vencida (REQ-CUN03-27)', async () => {
      const t = await registrada({ texto: 'Renovar el DNI', fecha: dias(-1) });
      expect(t).toMatchObject({ vencida: true, avisoVencida: true });

      const r = ControlTarea.parse((await http().post(`/tareas/${t.id}/mantener-abierta`).set('Authorization', autorizacion).expect(200)).body);
      expect(r.tarea).toMatchObject({ estado: 'pendiente', vencida: true, avisoVencida: false });
      expect((await tarea(t.id)).avisoVencida).toBe(false);
      expect(await prisma.operacion.findUniqueOrThrow({ where: { id: r.operacionId } })).toMatchObject({ tipo: 'tareas.mantener_abierta', origen: 'control_directo', estado: 'ejecutada' });

      // Sigue admitiendo avances (REQ-CUN03-27)
      expect((await anotado(t.id, 'Pedí la cita para el lunes')).bitacora).toHaveLength(1);
    });

    it('con otra fecha que también pasa, el aviso vuelve (H-TP-31)', async () => {
      const t = await registrada({ texto: 'Renovar el DNI', fecha: dias(-3) });
      await http().post(`/tareas/${t.id}/mantener-abierta`).set('Authorization', autorizacion).expect(200);
      const op = OperacionRespuesta.parse((await proponer('tareas.cambiar', { tareaId: t.id, fecha: dias(-1) }).expect(201)).body);
      await confirmar(op.id).expect(200);
      expect((await tarea(t.id)).avisoVencida).toBe(true);
    });

    it('sin aviso: una tarea con fecha futura, una sin fecha y lo que se espera de alguien (H-TP-30)', async () => {
      const futura = await registrada({ texto: 'Enviar la tesis', fecha: dias(5) });
      const sinFecha = await registrada({ texto: 'Llamar al dentista' });
      const esperada = await registrada({ texto: 'Presupuesto', deQuien: 'Juan', fecha: dias(-2) });
      for (const t of [futura, sinFecha, esperada]) expect((await tarea(t.id)).avisoVencida).toBe(false);
      // Mantener abierta no vale sin fecha
      await http().post(`/tareas/${sinFecha.id}/mantener-abierta`).set('Authorization', autorizacion).expect(409);
    });

    it('el contexto se cambia y se quita por conversación, con el antes y el ahora (REQ-CUN03-26)', async () => {
      const t = await registrada({ texto: 'Presupuesto de la cocina', contexto: 'Lo veo con Juan' });
      const op = OperacionRespuesta.parse((await proponer('tareas.cambiar', { tareaId: t.id, contexto: 'Lo veo con Juan y Rosa' }).expect(201)).body);
      expect(op.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Antes', valor: 'Contexto: Lo veo con Juan' });
      await confirmar(op.id).expect(200);
      expect((await tarea(t.id)).contexto).toBe('Lo veo con Juan y Rosa');
      const quitar = OperacionRespuesta.parse((await proponer('tareas.cambiar', { tareaId: t.id, contexto: null }).expect(201)).body);
      await confirmar(quitar.id).expect(200);
      expect((await tarea(t.id)).contexto).toBeNull();
    });
  });
});
