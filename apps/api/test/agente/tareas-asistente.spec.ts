import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CierreTarea, IngresoRespuesta, OperacionRespuesta, PropuestaTarea, RespuestaAsistente, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EjecutorHerramientas } from '../../src/agente/herramientas/ejecutor-herramientas';
import type { EntornoHerramienta } from '../../src/agente/herramientas/herramienta';
import { GUION_DEMOSTRACION } from '../../src/agente/modelo/guion-demostracion';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { cierreDe } from '../../src/agente/transcripcion';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { ContextoSolicitud } from '../../src/identidad/contexto';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';
import { VIERNES } from '../utilidades/fechas';

// T-051 · REQ-CUN03-01, 02, 04, 05, 06 · specs/08-tareas-personales/plan.md §7. El asistente con el guion de
// demostración del simulado, el mismo de la web: lo que interpreta las frases es el guion, y lo que se prueba
// es que el código solo propone, que la lista la arma el código y que nada se crea sin confirmar.

const CONTRASENA = 'una-contrasena-de-prueba';
const simulado = new ModeloSimulado(GUION_DEMOSTRACION);
const textos = (turnos: TurnoAsistente[]) => turnos.flatMap((t) => (t.tipo === 'texto' ? [t.texto] : []));

// «el viernes» para el guion es el próximo viernes desde hoy en Lima (nunca hoy mismo), no el `VIERNES` de las
// pruebas de agenda, que va al menos diez días adelante
function proximoViernesEnLima(): string {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const d = new Date(`${hoy}T12:00:00Z`);
  const faltan = (5 - d.getUTCDay() + 7) % 7 || 7;
  return new Date(d.getTime() + faltan * 86_400_000).toISOString().slice(0, 10);
}

describe('T-051 · el asistente y las tareas personales', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ejecutor: EjecutorHerramientas;
  let organizacionId: string;
  let perfilId: string;
  let autorizacion: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const enviar = async (texto: string) =>
    RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto }).expect(200)).body);
  const tarea = (titulo: string, extra: object = {}) => prisma.tarea.create({ data: { organizacionId, perfilId, titulo, ...extra } });

  // Las herramientas, llamadas como las llamaría el modelo
  const usar = async (nombre: string, argumentos: unknown) => {
    const contexto: ContextoSolicitud = { perfilId, organizacionId, rol: 'usuario_personal', plan: 'personal', primerIngresoPendiente: false };
    const conversacion = await prisma.conversacionAgente.create({ data: { organizacionId, perfilId, estado: 'abierta' } });
    const entorno: EntornoHerramienta = { conversacionId: conversacion.id, solicitudOriginal: 'una frase', referencia: { instante: new Date(), zonaHoraria: 'America/Lima' } };
    return ejecutor.ejecutar(contexto, entorno, { id: `l-${++n}`, nombre, argumentos }, null);
  };
  const propuestaDe = (r: Awaited<ReturnType<typeof usar>>) => OperacionRespuesta.parse((r.turno as { operacion: unknown }).operacion);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROVEEDOR_MODELO)
      .useValue(simulado)
      .overrideProvider(OPCIONES_LLAMADOR)
      .useValue({ limiteMs: 2_000, esperasMs: [0, 0] })
      .compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
    ejecutor = app.get(EjecutorHerramientas);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    simulado.recuperar();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `tas${++n}@nexoai.test`;
    ({ perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima'));
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    autorizacion = `Bearer ${s.tokenAcceso}`;
  });

  describe('agente.apunte-no-es-tarea', () => {
    it('lo que no pide hacer nada no propone ninguna tarea ni crea nada (REQ-CUN03-02)', async () => {
      const r = await enviar('Hoy me encontré con Juan en el banco');
      expect(r.turnos.some((t) => t.tipo === 'propuesta')).toBe(false);
      expect(await prisma.operacion.count({ where: { tipo: { startsWith: 'tareas.' } } })).toBe(0);
      expect(await prisma.tarea.count()).toBe(0);
    });
  });

  describe('agente.consultar-pendientes', () => {
    it('«¿Qué tengo pendiente?» lista exactamente las pendientes, con su fecha, armado por el código (REQ-CUN03-04)', async () => {
      await tarea('Pagar el recibo', { fecha: new Date(`${VIERNES}T00:00:00Z`) });
      await tarea('Renovar el pasaporte');
      await tarea('Contrato', { esperaDe: 'Marta', esperaQue: 'el contrato' });
      await tarea('Comprar pan', { estado: 'completada', completadaEn: new Date() });

      const r = await enviar('¿Qué tengo pendiente?');
      const lista = textos(r.turnos).join('\n');
      expect(lista).toMatch(/3 tareas pendientes/);
      // La que tiene fecha la lleva; la que espera dice qué y de quién
      expect(lista).toMatch(/• Pagar el recibo — \S/);
      expect(lista).toContain('• Renovar el pasaporte');
      expect(lista).toContain('• el contrato, de Marta');
      expect(lista).not.toContain('Comprar pan');
      // Consultar no propone ni cambia nada
      expect(r.turnos.some((t) => t.tipo === 'propuesta')).toBe(false);
      expect(await prisma.operacion.count()).toBe(0);
    });
  });

  describe('agente.herramientas-de-tareas', () => {
    it('anotar propone una tarjeta con la fecha dicha; la tarea no existe hasta confirmar (REQ-CUN03-01)', async () => {
      const r = await enviar('Recuérdame pagar el recibo el viernes');
      const propuesta = r.turnos.find((t) => t.tipo === 'propuesta');
      if (propuesta?.tipo !== 'propuesta') throw new Error('no hubo tarjeta');
      const fila = await prisma.operacion.findUniqueOrThrow({ where: { id: propuesta.operacion.id } });
      expect(fila).toMatchObject({ tipo: 'tareas.registrar', estado: 'propuesta', origen: 'agente' });
      expect(PropuestaTarea.parse(fila.carga)).toEqual({ titulo: 'Pagar el recibo', fecha: proximoViernesEnLima() });
      expect(await prisma.tarea.count()).toBe(0);
    });

    it('sin día, la tarjeta no lleva fecha: el sistema no la inventa (REQ-CUN03-01)', async () => {
      const r = await enviar('Tengo que renovar mi pasaporte');
      const propuesta = r.turnos.find((t) => t.tipo === 'propuesta');
      if (propuesta?.tipo !== 'propuesta') throw new Error('no hubo tarjeta');
      const fila = await prisma.operacion.findUniqueOrThrow({ where: { id: propuesta.operacion.id } });
      expect(PropuestaTarea.parse(fila.carga)).toEqual({ titulo: 'Renovar mi pasaporte' });
    });

    it('completar y cancelar pedidos al asistente solo proponen: la tarea sigue pendiente (REQ-CUN03-05, 06)', async () => {
      const t = await tarea('Pagar el recibo');
      const completar = propuestaDe(await usar('tareas_completar', { tareaId: t.id }));
      const cancelar = propuestaDe(await usar('tareas_actualizar', { tareaId: t.id, cancelar: true }));
      const posponer = propuestaDe(await usar('tareas_actualizar', { tareaId: t.id, fecha: VIERNES }));

      expect([completar.tipo, cancelar.tipo, posponer.tipo]).toEqual(['tareas.completar', 'tareas.actualizar', 'tareas.actualizar']);
      expect([completar.estado, cancelar.estado, posponer.estado]).toEqual(['propuesta', 'propuesta', 'propuesta']);
      expect(CierreTarea.parse((await prisma.operacion.findUniqueOrThrow({ where: { id: completar.id } })).carga)).toEqual({ tareaId: t.id });
      expect(await prisma.tarea.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ estado: 'pendiente', fecha: null });
    });

    it('el separador dice qué se hizo con la tarea: movida, cambiada, cancelada o reabierta (REQ-AGT-03)', () => {
      const en = new Date('2026-11-25T15:00:00Z');
      const tareaId = '6f1c2b8e-3a1d-4c7e-9b2a-1f0e5d4c3b2a';
      const cierre = (tipo: string, carga: object) => cierreDe(en, [{ tipo, estado: 'ejecutada', carga: { tareaId, ...carga }, resultado: null }])?.desenlace;
      expect(cierre('tareas.actualizar', { fecha: VIERNES })).toBe('movido');
      expect(cierre('tareas.actualizar', { titulo: 'Pagar la luz' })).toBe('cambiado');
      expect(cierre('tareas.actualizar', { cancelar: true })).toBe('cancelado');
      expect(cierre('tareas.completar', {})).toBe('completado');
      expect(cierre('tareas.completar', { reabrir: true })).toBe('reabierto');
    });

    it('un cambio vacío, o cancelar junto con otro cambio, se rechaza sin proponer nada', async () => {
      const t = await tarea('Pagar el recibo');
      const vacio = await usar('tareas_actualizar', { tareaId: t.id });
      const mezclado = await usar('tareas_actualizar', { tareaId: t.id, cancelar: true, titulo: 'Otro' });
      expect(vacio.turno).toBeUndefined();
      expect(mezclado.turno).toBeUndefined();
      expect(await prisma.operacion.count()).toBe(0);
    });
  });
});
