import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IngresoRespuesta, OperacionRespuesta, RespuestaAsistente, TareaPersonal, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GUION_DEMOSTRACION } from '../../src/agente/modelo/guion-demostracion';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-126 · specs/09-tareas-personales/plan.md §13.5 · REQ-CUN03-21, 23, 25, 26 · H-TP-26, H-TP-29. La bitácora
// por conversación, con el simulado y el guion de demostración. Sin calendario conectado (REQ-CUN03-20).

const CONTRASENA = 'una-contrasena-de-prueba';
const LIMA = 'America/Lima';
const calendario = new ProveedorCalendarioSimulado();
const simulado = new ModeloSimulado(GUION_DEMOSTRACION);
const de = <T extends TurnoAsistente['tipo']>(turnos: TurnoAsistente[], tipo: T) => turnos.find((t) => t.tipo === tipo) as Extract<TurnoAsistente, { tipo: T }> | undefined;

describe('T-126 · la bitácora por conversación', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let autorizacion: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const enviar = async (texto: string) => RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto }).expect(200)).body);
  const decidir = async (cuerpo: object) => RespuestaAsistente.parse((await http().post('/asistente/decisiones').set('Authorization', autorizacion).send(cuerpo).expect(200)).body);
  const tarea = async (id: string) => TareaPersonal.parse((await http().get(`/tareas/${id}`).set('Authorization', autorizacion).expect(200)).body);
  async function confirmada(tipo: string, carga: object) {
    const op = OperacionRespuesta.parse((await http().post('/operaciones').set('Authorization', autorizacion).send({ tipo, carga, origen: 'agente' }).expect(201)).body);
    return TareaPersonal.parse(OperacionRespuesta.parse((await http().post(`/operaciones/${op.id}/confirmar`).set('Authorization', autorizacion).expect(200)).body).resultado);
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROVEEDOR_MODELO)
      .useValue(simulado)
      .overrideProvider(OPCIONES_LLAMADOR)
      .useValue({ limiteMs: 2_000, esperasMs: [0, 0] })
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
    simulado.recuperar();
    simulado.usarGuion(GUION_DEMOSTRACION);
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `ab${++n}@nexoai.test`;
    await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, LIMA);
    autorizacion = `Bearer ${IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body).tokenAcceso}`;
  });

  describe('agente.tareas-anotar-avance', () => {
    it('el contexto dicho al pedirla va en la tarjeta y en la tarea (REQ-CUN03-26)', async () => {
      const r = await enviar('recuérdame el presupuesto de la cocina, lo veo con Juan y Rosa');
      const tarjeta = de(r.turnos, 'propuesta')!;
      expect(tarjeta.operacion.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Contexto', valor: 'Lo veo con Juan y Rosa' });
      const hecha = await decidir({ operacionId: tarjeta.operacion.id, decision: 'confirmar' });
      const t = TareaPersonal.parse(de(hecha.turnos, 'resultado')!.operacion.resultado);
      expect(t).toMatchObject({ texto: 'Presupuesto de la cocina', contexto: 'Lo veo con Juan y Rosa' });
    });

    it('«sobre X: …» propone anotar en esa tarea, y al confirmar queda en la bitácora con el separador (REQ-CUN03-21)', async () => {
      const t = await confirmada('tareas.registrar', { texto: 'Presupuesto de la cocina' });
      await confirmada('tareas.registrar', { texto: 'Renovar el DNI' });
      const r = await enviar('sobre el presupuesto de la cocina: ya hablé con Juan, me falta hablar con Rosa');
      const tarjeta = de(r.turnos, 'propuesta')!;
      expect(tarjeta.operacion).toMatchObject({ tipo: 'tareas.anotar_avance', estado: 'propuesta' });
      expect(tarjeta.operacion.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Avance', valor: 'Ya hablé con Juan, me falta hablar con Rosa' });
      expect((await tarea(t.id)).bitacora).toEqual([]);

      const hecha = await decidir({ operacionId: tarjeta.operacion.id, decision: 'confirmar' });
      expect(hecha.cierre).toMatchObject({ desenlace: 'anotado', titulo: 'Presupuesto de la cocina' });
      expect((await tarea(t.id)).bitacora.map((a) => a.texto)).toEqual(['Ya hablé con Juan, me falta hablar con Rosa']);
    });

    it('«ya hablé con Rosa: …» encaja por el contexto de la ficha, aunque el título no la nombre (H-TP-26)', async () => {
      const t = await confirmada('tareas.registrar', { texto: 'Presupuesto de la cocina', contexto: 'Lo veo con Juan y Rosa' });
      await confirmada('tareas.registrar', { texto: 'Renovar el DNI' });
      const r = await enviar('ya hablé con Rosa: pasa el precio el viernes');
      const datos = de(r.turnos, 'propuesta')!.operacion.vistaConfirmacion.datos;
      expect(datos).toContainEqual({ etiqueta: 'Tarea', valor: t.texto });
      expect(datos).toContainEqual({ etiqueta: 'Avance', valor: 'Ya hablé con Rosa: pasa el precio el viernes' });
    });

    it('también encaja por un avance anterior de la ficha', async () => {
      const t = await confirmada('tareas.registrar', { texto: 'Presupuesto de la cocina' });
      await confirmada('tareas.anotar_avance', { tareaId: t.id, texto: 'Falta hablar con el gasfitero' });
      await confirmada('tareas.registrar', { texto: 'Renovar el DNI' });
      const r = await enviar('ya hablé con el gasfitero, viene el lunes');
      expect(de(r.turnos, 'propuesta')!.operacion.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Tarea', valor: t.texto });
    });

    it('con dos que encajan, salen las candidatas y elegir una propone el avance guardado (REQ-CUN03-21)', async () => {
      await confirmada('tareas.registrar', { texto: 'Presupuesto de la cocina' });
      const bano = await confirmada('tareas.registrar', { texto: 'Presupuesto del baño' });
      const r = await enviar('avancé con el presupuesto: ya llamé al gasfitero');
      const lista = de(r.turnos, 'alternativas_de_referente')!.lista;
      expect(lista).toMatchObject({ accion: 'Anotar avance', avance: 'Ya llamé al gasfitero' });
      expect(lista.candidatas).toHaveLength(2);
      expect(de(r.turnos, 'propuesta')).toBeUndefined();

      const elegida = await decidir({ decision: 'referente', referenteId: bano.id });
      const datos = de(elegida.turnos, 'propuesta')!.operacion.vistaConfirmacion.datos;
      expect(datos).toContainEqual({ etiqueta: 'Tarea', valor: bano.texto });
      expect(datos).toContainEqual({ etiqueta: 'Avance', valor: 'Ya llamé al gasfitero' });
    });

    it('sin ninguna que encaje, pregunta a qué tarea corresponde y no anota nada', async () => {
      await confirmada('tareas.registrar', { texto: 'Renovar el DNI' });
      const r = await enviar('ya hablé con el contador: todo en orden');
      expect(de(r.turnos, 'propuesta')).toBeUndefined();
      expect((r.turnos.at(-1) as { texto?: string }).texto).toMatch(/¿A qué tarea corresponde\?/);
      expect(await prisma.avanceTarea.count()).toBe(0);
    });

    it('en una tarea hecha, ofrece reabrirla sin anotar nada (REQ-CUN03-25)', async () => {
      const t = await confirmada('tareas.registrar', { texto: 'Pagar el recibo de la luz' });
      await http().post(`/tareas/${t.id}/hecha`).set('Authorization', autorizacion).expect(200);
      const r = await enviar('sobre el recibo de la luz: pagué en el banco');
      expect(de(r.turnos, 'propuesta')).toBeUndefined();
      expect((r.turnos.at(-1) as { texto?: string }).texto).toMatch(/ya está hecha.*reabra/);
    });

    it('sin asistente, lo pedido queda en espera y no se anota nada (REQ-CUN03-25)', async () => {
      await confirmada('tareas.registrar', { texto: 'Presupuesto de la cocina' });
      simulado.caer();
      const r = await enviar('sobre el presupuesto de la cocina: ya hablé con Juan');
      expect(de(r.turnos, 'en_espera')).toBeTruthy();
      expect(await prisma.avanceTarea.count()).toBe(0);
    });
  });

  describe('agente.tareas-bitacora', () => {
    it('«¿cómo va X?» muestra los avances tal como están, el más reciente primero (REQ-CUN03-23)', async () => {
      const t = await confirmada('tareas.registrar', { texto: 'Presupuesto de la cocina', contexto: 'Lo veo con Juan y Rosa' });
      await confirmada('tareas.anotar_avance', { tareaId: t.id, texto: 'Ya hablé con Juan, me falta hablar con Rosa' });
      await confirmada('tareas.anotar_avance', { tareaId: t.id, texto: 'Rosa pasa el precio el viernes' });
      const r = await enviar('¿cómo va el presupuesto de la cocina?');
      const b = de(r.turnos, 'bitacora')!.bitacora;
      expect(b).toMatchObject({ tarea: 'Presupuesto de la cocina', contexto: 'Lo veo con Juan y Rosa', vacia: null });
      expect(b.avances.map((a) => a.texto)).toEqual(['Rosa pasa el precio el viernes', 'Ya hablé con Juan, me falta hablar con Rosa']);
      expect(de(r.turnos, 'propuesta')).toBeUndefined();
      expect(r.episodioCerrado).toBe(false);
    });

    it('una tarea sin avances lo dice', async () => {
      await confirmada('tareas.registrar', { texto: 'Renovar el DNI' });
      const r = await enviar('¿cómo va renovar el DNI?');
      expect(de(r.turnos, 'bitacora')!.bitacora).toMatchObject({ avances: [], vacia: 'Esta tarea no tiene avances anotados.' });
    });

    it('con dos que encajan, elegir una muestra su bitácora sin proponer nada', async () => {
      const cocina = await confirmada('tareas.registrar', { texto: 'Presupuesto de la cocina' });
      await confirmada('tareas.registrar', { texto: 'Presupuesto del baño' });
      await confirmada('tareas.anotar_avance', { tareaId: cocina.id, texto: 'Ya hablé con Juan' });
      const r = await enviar('¿cómo va el presupuesto?');
      expect(de(r.turnos, 'alternativas_de_referente')!.lista.accion).toBe('Ver cómo va');
      const elegida = await decidir({ decision: 'referente', referenteId: cocina.id });
      expect(de(elegida.turnos, 'bitacora')!.bitacora.avances.map((a) => a.texto)).toEqual(['Ya hablé con Juan']);
      expect(de(elegida.turnos, 'propuesta')).toBeUndefined();
    });
  });
});
