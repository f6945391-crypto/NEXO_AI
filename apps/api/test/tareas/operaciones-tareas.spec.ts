import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, OperacionRespuesta, TareaPersonal } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { diaEn } from '../../src/tareas/dominio/franja';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';
import { diaSiguiente, VIERNES } from '../utilidades/fechas';

// T-048 · REQ-CUN03-01, 04, 05, 11, 12 · AD-09 · H-TP-07, H-TP-08, H-TP-15. Las Operaciones de tareas por
// HTTP, como las usa el agente (origen `agente`) y la lista (origen `control_directo`).

const CONTRASENA = 'una-contrasena-de-prueba';
const calendario = new ProveedorCalendarioSimulado();

describe('T-048 · Operaciones de tareas', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  // Sin calendario conectado: las tareas no lo necesitan (REQ-CUN03-20)
  async function persona() {
    const correo = `ot${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima');
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  const proponer = (autorizacion: string, tipo: string, carga: unknown, origen = 'agente') =>
    http().post('/operaciones').set('Authorization', autorizacion).send({ tipo, carga, origen });
  const confirmar = (autorizacion: string, id: string) => http().post(`/operaciones/${id}/confirmar`).set('Authorization', autorizacion);
  const descartarOp = (autorizacion: string, id: string) => http().post(`/operaciones/${id}/descartar`).set('Authorization', autorizacion);

  // Propone y confirma con origen agente; devuelve la tarea que quedó
  async function registrada(autorizacion: string, carga: object): Promise<TareaPersonal> {
    const op = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.registrar', carga).expect(201)).body);
    const hecha = OperacionRespuesta.parse((await confirmar(autorizacion, op.id).expect(200)).body);
    expect(hecha.estado).toBe('ejecutada');
    return TareaPersonal.parse(hecha.resultado);
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
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
  });

  describe('tareas.sin-confirmar-no-registra', () => {
    it('la tarjeta dice la tarea, cuándo y dónde aparece; sin confirmar no existe, y confirmar dos veces crea una', async () => {
      const { autorizacion } = await persona();
      const op = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.registrar', { texto: 'Pagar el recibo', fecha: VIERNES }).expect(201)).body);
      expect(op.vistaConfirmacion.accion).toBe('Nueva tarea');
      expect(op.vistaConfirmacion.datos).toEqual([
        { etiqueta: 'Tarea', valor: 'Pagar el recibo' },
        { etiqueta: 'Cuándo', valor: expect.stringMatching(/^Para el viernes \d+ de \w+$/) },
        { etiqueta: 'Dónde aparece', valor: 'En Tareas, en «Con fecha»' },
      ]);
      // H-TP-10: ninguna tarjeta promete un aviso
      expect(JSON.stringify(op.vistaConfirmacion)).not.toMatch(/recordar|aviso|avisar/i);
      expect(await prisma.tareaPersonal.count()).toBe(0);

      // Dos confirmaciones a la vez: una ejecuta; la otra devuelve lo mismo o dice que ya está en curso
      const respuestas = await Promise.all([confirmar(autorizacion, op.id), confirmar(autorizacion, op.id)]);
      expect(respuestas.some((r) => r.status === 200)).toBe(true);
      expect(respuestas.every((r) => r.status === 200 || r.status === 409)).toBe(true);
      await confirmar(autorizacion, op.id).expect(200);
      expect(await prisma.tareaPersonal.count()).toBe(1);
      // Ni compromiso ni Google (REQ-CUN03-01)
      expect(calendario.llamadas.escrituras).toBe(0);
      expect(await prisma.eventoAgenda.count()).toBe(0);
    });

    it('sin fecha también se propone, y solo el texto es obligatorio (REQ-CUN03-02)', async () => {
      const { autorizacion } = await persona();
      const sinTexto = ErrorApi.parse((await proponer(autorizacion, 'tareas.registrar', { fecha: VIERNES }).expect(400)).body);
      expect(sinTexto).toMatchObject({ codigo: 'DATOS_FALTANTES', mensaje: 'Falta qué hay que hacer.', campos: ['texto'] });
      const tarea = await registrada(autorizacion, { texto: 'Llamar al dentista' });
      expect(tarea).toMatchObject({ texto: 'Llamar al dentista', estado: 'pendiente', franja: 'sin_fecha', fecha: null, vencida: false, cuando: null });
    });

    it('crear y cambiar solo los pide el asistente (R-42, H-TP-08)', async () => {
      const { autorizacion } = await persona();
      const r = ErrorApi.parse((await proponer(autorizacion, 'tareas.registrar', { texto: 'Pagar' }, 'control_directo').expect(403)).body);
      expect(r.codigo).toBe('ORIGEN_NO_PERMITIDO');
      const tarea = await registrada(autorizacion, { texto: 'Pagar' });
      const c = ErrorApi.parse((await proponer(autorizacion, 'tareas.cambiar', { tareaId: tarea.id, texto: 'Pagar la luz' }, 'control_directo').expect(403)).body);
      expect(c.codigo).toBe('ORIGEN_NO_PERMITIDO');
    });
  });

  describe('tareas.esperando-y-recibido', () => {
    it('guarda qué, de quién, desde cuándo y para cuándo, sin contacto; recibido la da por hecha sin crear otra', async () => {
      const { autorizacion } = await persona();
      const op = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.registrar', { texto: 'Presupuesto', deQuien: 'Juan', fecha: VIERNES }).expect(201)).body);
      expect(op.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'De quién', valor: 'Juan' });
      expect(op.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Dónde aparece', valor: 'En Tareas, en «Esperando de alguien»' });
      // R-12: un dato de contacto no entra en la carga
      await proponer(autorizacion, 'tareas.registrar', { texto: 'Presupuesto', deQuien: 'Juan', correo: 'juan@x.pe' }).expect(400);

      const tarea = TareaPersonal.parse(OperacionRespuesta.parse((await confirmar(autorizacion, op.id).expect(200)).body).resultado);
      const hoy = diaEn(new Date(), 'America/Lima');
      expect(tarea).toMatchObject({ franja: 'esperando', deQuien: 'Juan', esperadaDesde: hoy, fecha: VIERNES, espera: 'De Juan · Desde hoy' });
      expect(tarea.cuando).toMatch(/^Para el viernes/);
      const columnas = Object.keys((await prisma.tareaPersonal.findFirstOrThrow()) as object);
      expect(columnas.some((c) => /correo|telefono|contacto|nota/i.test(c))).toBe(false);

      // Dar por hecha no corresponde a lo que se espera; recibido sí
      const mal = ErrorApi.parse((await proponer(autorizacion, 'tareas.completar', { tareaId: tarea.id }, 'control_directo').expect(409)).body);
      expect(mal.codigo).toBe('TAREA_NO_MODIFICABLE');
      const recibido = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.recibido', { tareaId: tarea.id }).expect(201)).body);
      expect(recibido.vistaConfirmacion.accion).toBe('Marcar como recibido');
      expect(recibido.vistaConfirmacion.datos[0]).toEqual({ etiqueta: 'Tarea', valor: 'Presupuesto' });
      const hecha = TareaPersonal.parse(OperacionRespuesta.parse((await confirmar(autorizacion, recibido.id).expect(200)).body).resultado);
      expect(hecha).toMatchObject({ estado: 'hecha', cierre: expect.stringMatching(/^Recibido el /) });
      expect(await prisma.tareaPersonal.count()).toBe(1);
    });
  });

  describe('tareas.descartar-requiere-confirmacion', () => {
    it('la tarjeta dice la tarea y lo que no se deshace; descartarla no la cambia; confirmar no borra la fila', async () => {
      const { autorizacion } = await persona();
      const tarea = await registrada(autorizacion, { texto: 'Llamar al dentista' });
      const op = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.descartar', { tareaId: tarea.id }, 'control_directo').expect(201)).body);
      expect(op.vistaConfirmacion).toMatchObject({ accion: 'Descartar la tarea', confirmable: true });
      expect(op.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Tarea', valor: 'Llamar al dentista' });
      expect(op.vistaConfirmacion.irreversible).toContain('Ya no aparecerá en tus tareas');

      await descartarOp(autorizacion, op.id).expect(200);
      expect((await prisma.tareaPersonal.findFirstOrThrow()).estado).toBe('pendiente');

      const otra = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.descartar', { tareaId: tarea.id }, 'control_directo').expect(201)).body);
      const hecha = OperacionRespuesta.parse((await confirmar(autorizacion, otra.id).expect(200)).body);
      expect(TareaPersonal.parse(hecha.resultado).estado).toBe('descartada');
      const fila = await prisma.tareaPersonal.findFirstOrThrow();
      expect(fila).toMatchObject({ estado: 'descartada', texto: 'Llamar al dentista' });
      expect(fila.descartadaEn).toBeInstanceOf(Date);
      // Lo descartado ya no se cambia ni se reabre
      await proponer(autorizacion, 'tareas.reabrir', { tareaId: tarea.id }, 'control_directo').expect(409);
      await proponer(autorizacion, 'tareas.cambiar', { tareaId: tarea.id, texto: 'Otra' }).expect(409);
    });
  });

  describe('tareas.modificar-muestra-antes-y-ahora', () => {
    it('cambiar la fecha muestra antes y ahora; sin confirmar no cambia; quitar la fecha la pasa a «Sin fecha»', async () => {
      const { autorizacion } = await persona();
      const lunes = diaSiguiente(diaSiguiente(diaSiguiente(VIERNES)));
      const tarea = await registrada(autorizacion, { texto: 'Pagar el recibo', fecha: VIERNES, horaLimite: '18:00' });

      const op = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.cambiar', { tareaId: tarea.id, fecha: lunes }).expect(201)).body);
      expect(op.vistaConfirmacion.accion).toBe('Cambiar la tarea');
      expect(op.vistaConfirmacion.datos).toEqual([
        { etiqueta: 'Tarea', valor: 'Pagar el recibo' },
        { etiqueta: 'Antes', valor: expect.stringMatching(/^Para el viernes \d+ de \w+, antes de las 18:00$/) },
        { etiqueta: 'Ahora', valor: expect.stringMatching(/^Para el lunes \d+ de \w+, antes de las 18:00$/) },
      ]);
      expect((await prisma.tareaPersonal.findFirstOrThrow()).fecha?.toISOString().slice(0, 10)).toBe(VIERNES);
      const cambiada = TareaPersonal.parse(OperacionRespuesta.parse((await confirmar(autorizacion, op.id).expect(200)).body).resultado);
      expect(cambiada).toMatchObject({ fecha: lunes, horaLimite: '18:00', texto: 'Pagar el recibo', franja: 'con_fecha' });

      // REQ-CUN03-03: sin fecha pasa a «Sin fecha», sigue pendiente, conserva su texto y pierde la hora
      const quitar = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.cambiar', { tareaId: tarea.id, fecha: null }).expect(201)).body);
      expect(quitar.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Ahora', valor: 'Sin fecha' });
      expect(quitar.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Dónde aparece', valor: 'En Tareas, en «Sin fecha»' });
      const sinFecha = TareaPersonal.parse(OperacionRespuesta.parse((await confirmar(autorizacion, quitar.id).expect(200)).body).resultado);
      expect(sinFecha).toMatchObject({ franja: 'sin_fecha', estado: 'pendiente', texto: 'Pagar el recibo', fecha: null, horaLimite: null });
    });

    it('decir de quién se espera la mueve a «Esperando de alguien»; una hecha no se cambia', async () => {
      const { autorizacion } = await persona();
      const tarea = await registrada(autorizacion, { texto: 'Informe' });
      const op = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.cambiar', { tareaId: tarea.id, deQuien: 'María Fernanda' }).expect(201)).body);
      expect(op.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Antes', valor: 'No se espera de nadie' });
      expect(op.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Ahora', valor: 'De María Fernanda' });
      const esperada = TareaPersonal.parse(OperacionRespuesta.parse((await confirmar(autorizacion, op.id).expect(200)).body).resultado);
      expect(esperada.franja).toBe('esperando');

      const recibido = OperacionRespuesta.parse((await proponer(autorizacion, 'tareas.recibido', { tareaId: tarea.id }, 'control_directo').expect(201)).body);
      await confirmar(autorizacion, recibido.id).expect(200);
      const r = ErrorApi.parse((await proponer(autorizacion, 'tareas.cambiar', { tareaId: tarea.id, texto: 'Otro' }).expect(409)).body);
      expect(r.codigo).toBe('TAREA_NO_MODIFICABLE');
    });

    it('la tarea de otra persona no se puede tocar (REQ-CUN03-19)', async () => {
      const ana = await persona();
      const beto = await persona();
      const tarea = await registrada(ana.autorizacion, { texto: 'Pedir cita médica' });
      for (const tipo of ['tareas.cambiar', 'tareas.completar', 'tareas.descartar']) {
        const r = ErrorApi.parse((await proponer(beto.autorizacion, tipo, { tareaId: tarea.id, ...(tipo === 'tareas.cambiar' ? { texto: 'x' } : {}) }).expect(404)).body);
        expect(r.codigo).toBe('TAREA_NO_ENCONTRADA');
      }
    });
  });
});
