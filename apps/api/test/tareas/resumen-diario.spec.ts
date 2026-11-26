import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IngresoRespuesta, OperacionRespuesta, RespuestaAsistente, RespuestaTareas, TareaPersonal, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AVISO_CONTENIDO_EXTERNO } from '../../src/agente/herramientas/contenido-externo';
import { GUION_DEMOSTRACION } from '../../src/agente/modelo/guion-demostracion';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { diaLargo } from '../../src/tareas/dominio/formato';
import { diaEn } from '../../src/tareas/dominio/franja';
import { INSTRUCCIONES_RESUMEN, ResumenesBitacora } from '../../src/tareas/resumenes-bitacora';
import { ResumenesModule } from '../../src/tareas/resumenes.module';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-129 · specs/09-tareas-personales/plan.md §13.8 · REQ-CUN03-28 · H-TP-33 a 35. El resumen diario de la
// bitácora, con el simulado y el guion de demostración. El reloj se mueve pasando `ahora` a la pasada. `en` sale
// en ISO con desfase, sin milisegundos.

const CONTRASENA = 'una-contrasena-de-prueba';
const LIMA = 'America/Lima';
const HORA = 3_600_000;
const calendario = new ProveedorCalendarioSimulado();
const simulado = new ModeloSimulado(GUION_DEMOSTRACION);
// Las llamadas del resumen, distintas de las de la conversación
const llamadasDeResumen = () => simulado.peticiones.filter((p) => p.sistema === INSTRUCCIONES_RESUMEN).length;
const de = <T extends TurnoAsistente['tipo']>(turnos: TurnoAsistente[], tipo: T) => turnos.find((t) => t.tipo === tipo) as Extract<TurnoAsistente, { tipo: T }> | undefined;

describe('tareas.resumen-diario', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let resumenes: ResumenesBitacora;
  let autorizacion: string;
  let perfilId: string;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const tarea = async (id: string) => TareaPersonal.parse((await http().get(`/tareas/${id}`).set('Authorization', autorizacion).expect(200)).body);
  async function confirmada(tipo: string, carga: object): Promise<TareaPersonal> {
    const op = OperacionRespuesta.parse((await http().post('/operaciones').set('Authorization', autorizacion).send({ tipo, carga, origen: 'agente' }).expect(201)).body);
    return TareaPersonal.parse(OperacionRespuesta.parse((await http().post(`/operaciones/${op.id}/confirmar`).set('Authorization', autorizacion).expect(200)).body).resultado);
  }
  const registrada = (texto: string, contexto?: string) => confirmada('tareas.registrar', { texto, ...(contexto ? { contexto } : {}) });
  const anotar = (tareaId: string, texto: string) => confirmada('tareas.anotar_avance', { tareaId, texto });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule, ResumenesModule] })
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
    resumenes = app.get(ResumenesBitacora);
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    calendario.reiniciar();
    simulado.recuperar();
    simulado.usarGuion(GUION_DEMOSTRACION);
    simulado.peticiones.length = 0;
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `rd${++n}@nexoai.test`;
    ({ perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, LIMA));
    autorizacion = `Bearer ${IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body).tokenAcceso}`;
  });

  it('una tarea con avances recibe su resumen en la pasada, con su fecha, y los avances siguen tal cual; sin avances no se llama', async () => {
    const cocina = await registrada('Presupuesto de la cocina', 'Lo veo con Juan y Rosa');
    await anotar(cocina.id, 'Ya hablé con Juan, me falta hablar con Rosa');
    await anotar(cocina.id, 'Rosa pasa el precio el viernes');
    const dni = await registrada('Renovar el DNI');
    expect((await tarea(cocina.id)).resumen).toBeNull();

    const ahora = new Date();
    expect(await resumenes.repasar(ahora)).toEqual({ resumidas: 1, fallidas: 0 });
    expect(llamadasDeResumen()).toBe(1);

    // Lo que vio el modelo: solo esta tarea, sus avances marcados como datos y sin herramientas (H-TP-34)
    const peticion = simulado.peticiones.find((p) => p.sistema === INSTRUCCIONES_RESUMEN)!;
    expect(peticion.herramientas).toEqual([]);
    const entrada = (peticion.mensajes[0] as { texto: string }).texto;
    expect(entrada).toContain(AVISO_CONTENIDO_EXTERNO);
    expect(entrada).toContain('Contexto: Lo veo con Juan y Rosa');
    expect(entrada).toContain('Rosa pasa el precio el viernes');
    expect(entrada).not.toContain('Renovar el DNI');

    const t = await tarea(cocina.id);
    expect(t.resumen).toEqual({
      texto: 'Lo último anotado: Rosa pasa el precio el viernes',
      en: expect.any(String),
      cuando: `Resumen al ${diaLargo(diaEn(ahora, LIMA))}`,
    });
    expect(Date.parse(t.resumen!.en)).toBe(Math.floor(ahora.getTime() / 1000) * 1000);
    expect(t.bitacora.map((a) => a.texto)).toEqual(['Rosa pasa el precio el viernes', 'Ya hablé con Juan, me falta hablar con Rosa']);
    expect((await tarea(dni.id)).resumen).toBeNull();
    const fila = await prisma.tareaPersonal.findUniqueOrThrow({ where: { id: cocina.id } });
    expect(fila.resumenEn?.getTime()).toBe(ahora.getTime());

    // GET /tareas también lo trae
    const lista = RespuestaTareas.parse((await http().get('/tareas').set('Authorization', autorizacion).expect(200)).body);
    expect(lista.pendientes.find((x) => x.id === cocina.id)!.resumen?.texto).toBe('Lo último anotado: Rosa pasa el precio el viernes');
  });

  it('la llamada queda en llamada_modelo con su costo, sin conversación (P-07)', async () => {
    const t = await registrada('Presupuesto de la cocina');
    await anotar(t.id, 'Ya hablé con Juan');
    await resumenes.repasar();
    const filas = await prisma.llamadaModelo.findMany();
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ organizacionId, perfilId, conversacionId: null, proveedor: 'simulado', modelo: 'simulado', desenlace: 'ok' });
    expect(filas[0]!.tokensEntrada).toBeGreaterThan(0);
    expect(filas[0]!.costoUsd).not.toBeNull();
    expect(Number(filas[0]!.costoUsd)).toBe(0);
  });

  it('otra pasada en menos de 24 horas no llama aunque haya un avance nuevo; pasadas las 24 horas, sí; sin avances nuevos, no', async () => {
    const t = await registrada('Presupuesto de la cocina');
    await anotar(t.id, 'Ya hablé con Juan');
    const ahora = new Date();
    await resumenes.repasar(ahora);
    expect(llamadasDeResumen()).toBe(1);

    await anotar(t.id, 'Rosa pasa el precio el viernes');
    expect(await resumenes.repasar(new Date(ahora.getTime() + HORA))).toEqual({ resumidas: 0, fallidas: 0 });
    expect(await resumenes.repasar(new Date(ahora.getTime() + 23 * HORA))).toEqual({ resumidas: 0, fallidas: 0 });
    expect(llamadasDeResumen()).toBe(1);
    expect((await tarea(t.id)).resumen?.texto).toBe('Lo último anotado: Ya hablé con Juan');

    const despues = new Date(ahora.getTime() + 25 * HORA);
    expect(await resumenes.repasar(despues)).toEqual({ resumidas: 1, fallidas: 0 });
    expect(llamadasDeResumen()).toBe(2);
    expect((await tarea(t.id)).resumen).toMatchObject({ texto: 'Lo último anotado: Rosa pasa el precio el viernes', cuando: `Resumen al ${diaLargo(diaEn(despues, LIMA))}` });

    // Sin avances desde el último resumen: ninguna llamada, aunque hayan pasado otras 24 horas
    expect(await resumenes.repasar(new Date(ahora.getTime() + 50 * HORA))).toEqual({ resumidas: 0, fallidas: 0 });
    expect(llamadasDeResumen()).toBe(2);
  });

  it('una tarea hecha no se resume', async () => {
    const t = await registrada('Presupuesto de la cocina');
    await anotar(t.id, 'Ya hablé con Juan');
    await http().post(`/tareas/${t.id}/hecha`).set('Authorization', autorizacion).expect(200);
    expect((await tarea(t.id)).estado).toBe('hecha');
    expect(await resumenes.repasar()).toEqual({ resumidas: 0, fallidas: 0 });
    expect(llamadasDeResumen()).toBe(0);
  });

  it('con el modelo caído, queda el resumen anterior y la llamada fallida queda auditada', async () => {
    const t = await registrada('Presupuesto de la cocina');
    await anotar(t.id, 'Ya hablé con Juan');
    const ahora = new Date();
    await resumenes.repasar(ahora);
    await anotar(t.id, 'Rosa pasa el precio el viernes');

    simulado.caer();
    expect(await resumenes.repasar(new Date(ahora.getTime() + 25 * HORA))).toEqual({ resumidas: 0, fallidas: 1 });
    const r = (await tarea(t.id)).resumen;
    expect(r?.texto).toBe('Lo último anotado: Ya hablé con Juan');
    expect(Date.parse(r!.en)).toBe(Math.floor(ahora.getTime() / 1000) * 1000);
    expect((await tarea(t.id)).bitacora).toHaveLength(2);
    expect(await prisma.llamadaModelo.count({ where: { desenlace: 'no_disponible', conversacionId: null } })).toBe(1);

    // Al volver, la pasada siguiente lo resume
    simulado.recuperar();
    expect(await resumenes.repasar(new Date(ahora.getTime() + 26 * HORA))).toEqual({ resumidas: 1, fallidas: 0 });
    expect((await tarea(t.id)).resumen?.texto).toBe('Lo último anotado: Rosa pasa el precio el viernes');
  });

  it('una respuesta de más de 280 caracteres, o vacía, no se guarda', async () => {
    const t = await registrada('Presupuesto de la cocina');
    // El simulado responde «Lo último anotado: …» con el avance entero: más de 280 caracteres
    await anotar(t.id, `Ya hablé con Juan ${'y con Rosa '.repeat(25)}`.trim());
    expect(await resumenes.repasar()).toEqual({ resumidas: 0, fallidas: 1 });
    expect((await tarea(t.id)).resumen).toBeNull();
    expect(await prisma.tareaPersonal.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ resumen: null, resumenEn: null });

    simulado.usarGuion([{ si: '^Resumen de la bitácora', pasos: [{ texto: '   ' }] }]);
    expect(await resumenes.repasar()).toEqual({ resumidas: 0, fallidas: 1 });
    expect((await tarea(t.id)).resumen).toBeNull();
  });

  it('«¿cómo va X?» trae el resumen junto a los avances, y leer no genera ninguno', async () => {
    const t = await registrada('Presupuesto de la cocina', 'Lo veo con Juan y Rosa');
    await anotar(t.id, 'Ya hablé con Juan, me falta hablar con Rosa');

    // Antes de la pasada: sin resumen, y preguntar no llama al resumen
    let r = RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto: '¿cómo va el presupuesto de la cocina?' }).expect(200)).body);
    expect(de(r.turnos, 'bitacora')!.bitacora.resumen).toBeNull();
    expect(llamadasDeResumen()).toBe(0);

    const ahora = new Date();
    await resumenes.repasar(ahora);
    r = RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto: '¿cómo va el presupuesto de la cocina?' }).expect(200)).body);
    const b = de(r.turnos, 'bitacora')!.bitacora;
    expect(b.resumen).toMatchObject({ texto: 'Lo último anotado: Ya hablé con Juan, me falta hablar con Rosa', cuando: `Resumen al ${diaLargo(diaEn(ahora, LIMA))}` });
    expect(b.avances.map((a) => a.texto)).toEqual(['Ya hablé con Juan, me falta hablar con Rosa']);
    expect(llamadasDeResumen()).toBe(1);
  });
});
