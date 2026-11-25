import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, OperacionRespuesta, Tarea, TareasPorFranja } from '@nexoai/contratos';
import request from 'supertest';
import { z } from 'zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { hoyEnZona } from '../../src/tareas/dominio/franjas';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-048, T-049 · REQ-CUN03-01, 03, 05, 06, 07, 08, 10 · specs/08-tareas-personales/plan.md §4 y §5

const CONTRASENA = 'una-contrasena-de-prueba';
const DIA_MS = 24 * 3600_000;
const dia = (desdeHoy: number) => new Date(Date.now() + desdeHoy * DIA_MS).toISOString().slice(0, 10);
const Lista = z.array(Tarea);
const calendario = new ProveedorCalendarioSimulado();

describe('T-048 y T-049 · tareas personales', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function persona(rol: 'usuario_personal' | 'gerente' | 'colaborador' = 'usuario_personal', conCalendario = false) {
    const correo = `ta${++n}@nexoai.test`;
    const plan = rol === 'usuario_personal' ? 'personal' : 'empresarial';
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan }, CONTRASENA, 'America/Lima');
    if (conCalendario) {
      await prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
    }
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  const proponer = (autorizacion: string, tipo: string, carga: unknown, origen = 'agente') =>
    http().post('/operaciones').set('Authorization', autorizacion).send({ tipo, carga, origen });
  const confirmar = (autorizacion: string, id: string) => http().post(`/operaciones/${id}/confirmar`).set('Authorization', autorizacion);
  const franjas = async (autorizacion: string) => TareasPorFranja.parse((await http().get('/tareas').set('Authorization', autorizacion).expect(200)).body);

  // Anota una tarea por la vía normal: propone y confirma
  async function anotar(autorizacion: string, carga: object) {
    const p = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.registrar', carga).expect(201)).body);
    const c = OperacionRespuesta.parse((await confirmar(autorizacion, p.id).expect(200)).body);
    return Tarea.parse(c.resultado);
  }

  beforeAll(async () => {
    // El calendario simulado: así se comprueba que una tarea no crea nada en Google (REQ-CUN03-08)
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

  describe('tareas.registrar-propone-y-confirma', () => {
    it('proponer no crea nada; al confirmar existe y aparece en «con fecha» (REQ-CUN03-01)', async () => {
      const { autorizacion } = await persona();
      const viernes = dia(3);
      const p = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.registrar', { titulo: 'Pagar el recibo', fecha: viernes }).expect(201)).body);
      expect(p.vistaConfirmacion).toMatchObject({ accion: 'Anotar esta tarea', confirmable: true });
      expect(p.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Tarea', valor: 'Pagar el recibo' });
      expect(p.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Calendario', valor: 'No se crea ningún evento en tu calendario de Google' });
      expect(await prisma.tarea.count()).toBe(0);

      const c = OperacionRespuesta.parse((await confirmar(autorizacion, p.id).expect(200)).body);
      expect(c.estado).toBe('ejecutada');
      expect(Tarea.parse(c.resultado)).toMatchObject({ titulo: 'Pagar el recibo', fecha: viernes, estado: 'pendiente', franja: 'con_fecha', atrasada: false });
      expect((await franjas(autorizacion)).conFecha.map((t) => t.titulo)).toEqual(['Pagar el recibo']);
      // Plan §3: la tarea guarda la Operación que la creó
      expect(await prisma.tarea.findFirstOrThrow()).toMatchObject({ operacionId: p.id });

      // Confirmar dos veces crea una sola (P-07)
      await confirmar(autorizacion, p.id).expect(200);
      expect(await prisma.tarea.count()).toBe(1);
    });

    it('descartar la propuesta no crea nada', async () => {
      const { autorizacion } = await persona();
      const p = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.registrar', { titulo: 'Algo' }).expect(201)).body);
      await http().post(`/operaciones/${p.id}/descartar`).set('Authorization', autorizacion).expect(200);
      expect(await prisma.tarea.count()).toBe(0);
    });

    it('registrar solo lo pide el asistente: no es un control directo (R-42)', async () => {
      const { autorizacion } = await persona();
      const r = await proponer(autorizacion, 'tareas.registrar', { titulo: 'Algo' }, 'control_directo').expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('ORIGEN_NO_PERMITIDO');
    });
  });

  describe('tareas.sin-fecha-no-inventa', () => {
    it('sin fecha queda en «sin fecha» y ninguna fecha la puso el sistema (REQ-CUN03-01)', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Renovar mi pasaporte' });
      expect(t).toMatchObject({ fecha: null, hora: null, franja: 'sin_fecha', atrasada: false });
      const f = await franjas(autorizacion);
      expect(f.sinFecha.map((x) => x.titulo)).toEqual(['Renovar mi pasaporte']);
      expect(f.conFecha).toEqual([]);
    });

    it('una hora sin fecha, o una fecha que no existe, no se acepta', async () => {
      const { autorizacion } = await persona();
      await proponer(autorizacion, 'tareas.registrar', { titulo: 'Algo', hora: '10:00' }).expect(400);
      await proponer(autorizacion, 'tareas.registrar', { titulo: 'Algo', fecha: '2026-02-31' }).expect(400);
    });

    it('sin título, dice qué falta y no crea la operación (REQ-CUN01-07)', async () => {
      const { autorizacion } = await persona();
      const r = await proponer(autorizacion, 'tareas.registrar', { fecha: dia(2) }).expect(400);
      expect(ErrorApi.parse(r.body)).toMatchObject({ codigo: 'DATOS_FALTANTES', campos: ['titulo'] });
    });
  });

  describe('tareas.modelo-y-restricciones', () => {
    // T-046: las restricciones de la migración, comprobadas en la base misma, sin pasar por la API
    it('la base rechaza una hora sin fecha, una espera a medias y un cierre que no casa con el estado', async () => {
      const { perfilId } = await persona();
      const base = { organizacionId, perfilId };
      await expect(prisma.tarea.create({ data: { ...base, titulo: 'Hora sin fecha', hora: '10:00' } })).rejects.toThrow(/tarea_hora_con_fecha/);
      await expect(prisma.tarea.create({ data: { ...base, titulo: 'Espera a medias', esperaDe: 'Marta' } })).rejects.toThrow(/tarea_espera_completa/);
      await expect(prisma.tarea.create({ data: { ...base, titulo: 'Hecha sin fecha de cierre', estado: 'completada' } })).rejects.toThrow(/tarea_cierre_coherente/);
      await expect(prisma.tarea.create({ data: { ...base, titulo: 'Pendiente con cierre', completadaEn: new Date() } })).rejects.toThrow(/tarea_cierre_coherente/);
      // Y una fila válida entra
      const ok = await prisma.tarea.create({ data: { ...base, titulo: 'Válida', fecha: new Date('2026-12-01T00:00:00Z'), hora: '10:00' } });
      expect(ok.estado).toBe('pendiente');
    });
  });

  describe('tareas.rutas-de-consulta', () => {
    it('cada tarea va a su franja y la de ayer sale atrasada, calculado por el código (REQ-CUN03-03)', async () => {
      const { autorizacion, perfilId } = await persona();
      await anotar(autorizacion, { titulo: 'Para el viernes', fecha: dia(3) });
      await anotar(autorizacion, { titulo: 'Sin fecha' });
      await anotar(autorizacion, { titulo: 'Contrato', esperaDe: 'Marta', esperaQue: 'el contrato' });
      // Una de ayer: se escribe directo, porque proponer una fecha pasada también se permite pero así es más claro
      await prisma.tarea.create({ data: { organizacionId, perfilId, titulo: 'De ayer', fecha: new Date(`${hoyEnZona(new Date(Date.now() - DIA_MS), 'America/Lima')}T00:00:00Z`) } });

      const f = await franjas(autorizacion);
      expect(f.conFecha.map((t) => [t.titulo, t.atrasada])).toEqual([['De ayer', true], ['Para el viernes', false]]);
      expect(f.sinFecha.map((t) => t.titulo)).toEqual(['Sin fecha']);
      expect(f.esperando.map((t) => [t.titulo, t.esperaDe, t.esperaQue])).toEqual([['Contrato', 'Marta', 'el contrato']]);
    });

    it('el detalle de una tarea se lee por su id; lo cerrado no está en las franjas y sí con ?estado= (T-049)', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Renovar el pasaporte' });
      expect(Tarea.parse((await http().get(`/tareas/${t.id}`).set('Authorization', autorizacion).expect(200)).body)).toMatchObject({ id: t.id, titulo: 'Renovar el pasaporte', franja: 'sin_fecha' });
      await http().get('/tareas/6f1c2b8e-3a1d-4c7e-9b2a-1f0e5d4c3b2a').set('Authorization', autorizacion).expect(404);

      await http().post(`/tareas/${t.id}/completar`).set('Authorization', autorizacion).expect(200);
      expect((await franjas(autorizacion)).sinFecha).toEqual([]);
      const cerradas = Lista.parse((await http().get('/tareas').query({ estado: 'completada' }).set('Authorization', autorizacion).expect(200)).body);
      expect(cerradas.map((x) => [x.titulo, x.estado])).toEqual([['Renovar el pasaporte', 'completada']]);
    });
  });

  describe('tareas.completar-y-reabrir', () => {
    it('completar desde la lista es de un toque, sin tarjeta, con fecha y hora de cierre; se puede reabrir (REQ-CUN03-05)', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Pagar el recibo', fecha: dia(2) });

      const hecha = Tarea.parse((await http().post(`/tareas/${t.id}/completar`).set('Authorization', autorizacion).expect(200)).body);
      expect(hecha.estado).toBe('completada');
      expect(hecha.completadaEn).not.toBeNull();
      const f = await franjas(autorizacion);
      expect([...f.conFecha, ...f.sinFecha, ...f.esperando]).toEqual([]);
      // Queda en el registro como control directo ya ejecutado
      expect(await prisma.operacion.findFirstOrThrow({ where: { tipo: 'tareas.completar' } })).toMatchObject({ origen: 'control_directo', estado: 'ejecutada' });

      const reabierta = Tarea.parse((await http().post(`/tareas/${t.id}/reabrir`).set('Authorization', autorizacion).expect(200)).body);
      expect(reabierta).toMatchObject({ estado: 'pendiente', completadaEn: null });
      expect((await franjas(autorizacion)).conFecha.map((x) => x.id)).toEqual([t.id]);
    });

    it('pedido al asistente lleva tarjeta y no se ejecuta hasta confirmar (decisión 2)', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Pagar el recibo' });
      const p = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.completar', { tareaId: t.id }).expect(201)).body);
      expect(p.vistaConfirmacion).toMatchObject({ accion: 'Marcar esta tarea como hecha', confirmable: true });
      expect((await franjas(autorizacion)).sinFecha).toHaveLength(1);
      await confirmar(autorizacion, p.id).expect(200);
      expect((await franjas(autorizacion)).sinFecha).toHaveLength(0);
    });

    it('completar una «esperando de alguien» solo la completa y no escribe a nadie (decisión 8)', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Contrato', esperaDe: 'Marta', esperaQue: 'el contrato' });
      await http().post(`/tareas/${t.id}/completar`).set('Authorization', autorizacion).expect(200);
      expect(await prisma.tarea.findFirstOrThrow()).toMatchObject({ estado: 'completada', esperaDe: 'Marta' });
      // No hay ninguna operación que no sea de tareas
      expect((await prisma.operacion.findMany()).every((o) => o.tipo.startsWith('tareas.'))).toBe(true);
    });

    it('una tarea que no existe, o que no es mía, responde 404', async () => {
      const { autorizacion } = await persona();
      await http().post('/tareas/00000000-0000-4000-8000-000000000000/completar').set('Authorization', autorizacion).expect(404);
      await http().post('/tareas/no-es-un-id/completar').set('Authorization', autorizacion).expect(404);
    });
  });

  describe('tareas.actualizar-muestra-antes-y-despues', () => {
    it('posponer muestra cómo está y cómo quedaría, y no cambia nada hasta confirmar (REQ-CUN03-06)', async () => {
      const { autorizacion } = await persona();
      const viernes = dia(3);
      const lunes = dia(6);
      const t = await anotar(autorizacion, { titulo: 'Pagar el recibo', fecha: viernes });

      const p = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.actualizar', { tareaId: t.id, fecha: lunes }).expect(201)).body);
      const [ahora, quedaria] = p.vistaConfirmacion.datos;
      expect(ahora!.etiqueta).toBe('Ahora');
      expect(quedaria!.etiqueta).toBe('Quedaría');
      expect(ahora!.valor).not.toBe(quedaria!.valor);
      expect((await franjas(autorizacion)).conFecha[0]!.fecha).toBe(viernes);

      await confirmar(autorizacion, p.id).expect(200);
      expect((await franjas(autorizacion)).conFecha[0]!.fecha).toBe(lunes);
    });

    it('«quítale la fecha» la pasa a «sin fecha», y con ella se va la hora', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Pagar', fecha: dia(3), hora: '09:00' });
      const p = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.actualizar', { tareaId: t.id, fecha: null }).expect(201)).body);
      await confirmar(autorizacion, p.id).expect(200);
      const f = await franjas(autorizacion);
      expect(f.conFecha).toEqual([]);
      expect(f.sinFecha[0]).toMatchObject({ titulo: 'Pagar', fecha: null, hora: null });
    });

    it('un cambio vacío, o que mezcla cancelar con otra cosa, no se acepta', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Algo' });
      await proponer(autorizacion, 'tareas.actualizar', { tareaId: t.id }).expect(400);
      await proponer(autorizacion, 'tareas.actualizar', { tareaId: t.id, cancelar: true, titulo: 'Otro' }).expect(400);
    });
  });

  describe('tareas.cancelar-no-borra', () => {
    it('cancelar deja la tarea cancelada, fuera de las franjas y todavía consultable (REQ-CUN03-06)', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Pagar el recibo', fecha: dia(3) });
      const p = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.actualizar', { tareaId: t.id, cancelar: true }).expect(201)).body);
      expect(p.vistaConfirmacion).toMatchObject({ accion: 'Cancelar esta tarea' });
      expect(p.vistaConfirmacion.irreversible).toContain('No se borra');
      expect((await franjas(autorizacion)).conFecha).toHaveLength(1);

      await confirmar(autorizacion, p.id).expect(200);
      const f = await franjas(autorizacion);
      expect([...f.conFecha, ...f.sinFecha, ...f.esperando]).toEqual([]);
      expect(await prisma.tarea.count()).toBe(1);
      const canceladas = Lista.parse((await http().get('/tareas').query({ estado: 'cancelada' }).set('Authorization', autorizacion).expect(200)).body);
      expect(canceladas).toMatchObject([{ id: t.id, estado: 'cancelada' }]);
      expect(canceladas[0]!.canceladaEn).not.toBeNull();
    });

    it('una tarea ya cancelada o completada no se vuelve a cambiar', async () => {
      const { autorizacion } = await persona();
      const t = await anotar(autorizacion, { titulo: 'Algo' });
      await http().post(`/tareas/${t.id}/completar`).set('Authorization', autorizacion).expect(200);
      const r = await proponer(autorizacion, 'tareas.actualizar', { tareaId: t.id, titulo: 'Otro' }).expect(409);
      expect(ErrorApi.parse(r.body).codigo).toBe('TAREA_NO_MODIFICABLE');
    });
  });

  describe('tareas.esperando-no-contacta', () => {
    it('guarda solo qué se espera y de quién, y no manda nada a nadie (REQ-CUN03-07)', async () => {
      const { autorizacion } = await persona();
      const p = OperacionRespuesta.parse(
        (await proponer(autorizacion, 'tareas.registrar', { titulo: 'Contrato', esperaDe: 'Marta', esperaQue: 'el contrato' }).expect(201)).body,
      );
      expect(p.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'De quién', valor: 'Marta' });
      expect(p.vistaConfirmacion.datos.some((d) => d.valor.includes('No se le escribe ni se le avisa a Marta'))).toBe(true);
      await confirmar(autorizacion, p.id).expect(200);
      expect((await franjas(autorizacion)).esperando).toMatchObject([{ esperaDe: 'Marta', esperaQue: 'el contrato', franja: 'esperando' }]);
    });

    it('quién y qué van juntos', async () => {
      const { autorizacion } = await persona();
      await proponer(autorizacion, 'tareas.registrar', { titulo: 'Contrato', esperaDe: 'Marta' }).expect(400);
    });
  });

  describe('agenda.tarea-no-es-conflicto', () => {
    it('una tarea con fecha y hora no crea nada en el calendario, y un compromiso a la misma hora no choca con ella (REQ-CUN03-08)', async () => {
      const { perfilId, autorizacion } = await persona('usuario_personal', true);
      await anotar(autorizacion, { titulo: 'Preparar el informe', fecha: dia(3), hora: '10:00' });
      // Anotar la tarea no escribió nada en Google
      expect(calendario.llamadas.escrituras).toBe(0);

      // Un compromiso justo a la hora de la tarea: la tarjeta no declara conflicto y se puede confirmar
      const p = OperacionRespuesta.parse(
        (await proponer(autorizacion, 'agenda.registrar', { titulo: 'Reunión', inicio: `${dia(3)}T10:00:00-05:00` }).expect(201)).body,
      );
      expect(p.vistaConfirmacion.confirmable).toBe(true);
      expect(p.vistaConfirmacion.conflicto ?? null).toBeNull();
      await confirmar(autorizacion, p.id).expect(200);

      // En el calendario solo está el compromiso
      const eventos = (await calendario.listar({ perfilId, organizacionId }, { tipo: 'completa', desde: new Date(0), hasta: new Date('2100-01-01') })).cambios.flatMap((c) =>
        c.tipo === 'evento' ? [c.evento.titulo] : [],
      );
      expect(eventos).toEqual(['Reunión']);
    });

    it('GET /tareas/en-fechas devuelve las pendientes con fecha en el rango, aparte de los eventos', async () => {
      const { autorizacion } = await persona();
      await anotar(autorizacion, { titulo: 'Dentro', fecha: dia(3), hora: '10:00' });
      await anotar(autorizacion, { titulo: 'Fuera', fecha: dia(20) });
      await anotar(autorizacion, { titulo: 'Sin fecha' });
      const r = Lista.parse((await http().get('/tareas/en-fechas').query({ desde: dia(1), hasta: dia(5) }).set('Authorization', autorizacion).expect(200)).body);
      expect(r.map((t) => t.titulo)).toEqual(['Dentro']);
      await http().get('/tareas/en-fechas').query({ desde: dia(5), hasta: dia(1) }).set('Authorization', autorizacion).expect(400);
    });
  });

  describe('tareas.aislamiento-por-perfil', () => {
    it('las tareas personales son solo de su dueño: ni un compañero ni el gerente ven las de otro (REQ-CUN03-10)', async () => {
      const colaborador = await persona('colaborador');
      const gerente = await persona('gerente');
      const t = await anotar(colaborador.autorizacion, { titulo: 'Mi tarea personal' });

      const delGerente = await franjas(gerente.autorizacion);
      expect([...delGerente.conFecha, ...delGerente.sinFecha, ...delGerente.esperando]).toEqual([]);
      // Ni por id ni para completarla
      await http().get(`/tareas/${t.id}`).set('Authorization', gerente.autorizacion).expect(404);
      await http().post(`/tareas/${t.id}/completar`).set('Authorization', gerente.autorizacion).expect(404);
      await proponer(gerente.autorizacion, 'tareas.actualizar', { tareaId: t.id, cancelar: true }).expect(404);
      // Y el colaborador sí ve la suya
      expect((await franjas(colaborador.autorizacion)).sinFecha.map((x) => x.titulo)).toEqual(['Mi tarea personal']);
    });

    it('sin sesión no se ve nada', async () => {
      await http().get('/tareas').expect(401);
    });
  });
});
