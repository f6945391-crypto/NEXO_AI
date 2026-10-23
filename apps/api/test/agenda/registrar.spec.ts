import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, EventoAgenda, IngresoRespuesta, OperacionRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-017 · REQ-CUN01-02, 03, 04, 07 · H-AG-01 · R-42

const CONTRASENA = 'una-contrasena-de-prueba';
const calendario = new ProveedorCalendarioSimulado();
const todo = { desde: new Date(0), hasta: new Date('2100-01-01') };

describe('T-017 · registrar un compromiso', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  // Una persona en Lima con el calendario conectado
  async function persona(conCalendario = true) {
    const correo = `rg${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima');
    if (conCalendario) {
      await prisma.consentimientoIntegracion.create({
        data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
      });
    }
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  const proponer = (autorizacion: string, carga: unknown, origen = 'agente') =>
    http().post('/operaciones').set('Authorization', autorizacion).send({ tipo: 'agenda.registrar', carga, origen });

  const delCalendario = async (perfilId: string) =>
    (await calendario.listar({ perfilId, organizacionId }, { tipo: 'completa', ...todo })).cambios.flatMap((c) => (c.tipo === 'evento' ? [c.evento] : []));

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

  describe('agenda.consulta-solapes-antes-de-proponer', () => {
    it('lee el calendario antes de proponer, y un solape impide confirmar diciendo con qué choca', async () => {
      const { perfilId, autorizacion } = await persona();
      // Creado en Google y todavía no replicado: la propuesta tiene que verlo igual
      calendario.sembrar(perfilId, { titulo: 'Dentista', inicio: new Date('2026-11-06T15:00:00Z'), fin: new Date('2026-11-06T16:00:00Z'), zonaHoraria: 'America/Lima' });

      const r = OperacionRespuesta.parse(
        (await proponer(autorizacion, { titulo: 'Reunión con Vasco', inicio: '2026-11-06T10:30:00-05:00' }).expect(201)).body,
      );
      expect(calendario.llamadas.lecturas).toBeGreaterThan(0);
      expect(r.vistaConfirmacion.confirmable).toBe(false);
      expect(r.vistaConfirmacion.motivoNoConfirmable).toBe('Se superpone con «Dentista», de 10:00 – 11:00. Elige otro horario.');
      await http().post(`/operaciones/${r.id}/confirmar`).set('Authorization', autorizacion).expect(409);
      expect(calendario.llamadas.escrituras).toBe(0);
    });

    it('sin solapes se puede confirmar; un evento que solo toca el pedido, o de todo el día, no choca', async () => {
      const { perfilId, autorizacion } = await persona();
      calendario.sembrar(perfilId, { titulo: 'Antes', inicio: new Date('2026-11-06T14:00:00Z'), fin: new Date('2026-11-06T15:00:00Z'), zonaHoraria: 'America/Lima' });
      calendario.sembrar(perfilId, { titulo: 'Feriado', inicio: new Date('2026-11-06T05:00:00Z'), fin: new Date('2026-11-07T05:00:00Z'), zonaHoraria: 'America/Lima', todoElDia: true });
      const r = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión', inicio: '2026-11-06T10:00:00-05:00' }).expect(201)).body);
      expect(r.vistaConfirmacion.confirmable).toBe(true);
    });
  });

  describe('agenda.sin-confirmar-no-escribe-ni-notifica', () => {
    it('proponer y descartar no escribe nada en Google ni en la réplica', async () => {
      const { perfilId, autorizacion } = await persona();
      const r = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión', inicio: '2026-11-06T10:00:00-05:00' }).expect(201)).body);
      expect(calendario.llamadas.escrituras).toBe(0);
      await http().post(`/operaciones/${r.id}/descartar`).set('Authorization', autorizacion).expect(200);

      expect(calendario.llamadas.escrituras).toBe(0);
      expect(await delCalendario(perfilId)).toEqual([]);
      expect(await prisma.eventoAgenda.count({ where: { perfilId } })).toBe(0);
    });
  });

  describe('agenda.confirmar-registra-lo-mostrado', () => {
    it('sin hora de fin propone una hora, y al confirmar el evento queda exactamente como se mostró', async () => {
      const { perfilId, autorizacion } = await persona();
      const propuesta = OperacionRespuesta.parse(
        (await proponer(autorizacion, { titulo: 'Reunión con Vasco', inicio: '2026-11-06T10:00:00-05:00' }).expect(201)).body,
      );
      expect(propuesta.vistaConfirmacion.datos).toEqual([
        { etiqueta: 'Título', valor: 'Reunión con Vasco' },
        { etiqueta: 'Fecha', valor: 'viernes, 6 de noviembre de 2026' },
        { etiqueta: 'Hora', valor: '10:00 – 11:00' },
        { etiqueta: 'Zona horaria', valor: 'Hora de Lima (GMT-5)' },
        { etiqueta: 'Duración', valor: '1 hora, porque no indicaste la hora de fin' },
      ]);

      const confirmada = OperacionRespuesta.parse((await http().post(`/operaciones/${propuesta.id}/confirmar`).set('Authorization', autorizacion).expect(200)).body);
      expect(confirmada.estado).toBe('ejecutada');
      // El resultado es el evento tal como quedó, para la tarjeta de resultado (REQ-CUN01-04)
      expect(EventoAgenda.parse(confirmada.resultado)).toMatchObject({
        titulo: 'Reunión con Vasco',
        inicio: '2026-11-06T10:00:00-05:00',
        fin: '2026-11-06T11:00:00-05:00',
        zonaHoraria: 'America/Lima',
        esOrganizador: true,
        estado: 'confirmado',
      });

      const [enGoogle] = await delCalendario(perfilId);
      expect(enGoogle).toMatchObject({ titulo: 'Reunión con Vasco', zonaHoraria: 'America/Lima' });
      expect(enGoogle!.inicio.toISOString()).toBe('2026-11-06T15:00:00.000Z');
      expect(enGoogle!.fin.toISOString()).toBe('2026-11-06T16:00:00.000Z');
      expect(await prisma.eventoAgenda.findMany({ where: { perfilId } })).toMatchObject([{ googleEventoId: enGoogle!.id, titulo: 'Reunión con Vasco' }]);

      // Confirmar otra vez no vuelve a escribir (P-07)
      await http().post(`/operaciones/${propuesta.id}/confirmar`).set('Authorization', autorizacion).expect(200);
      expect(calendario.llamadas.escrituras).toBe(1);
    });

    it('con hora de fin y otra zona, respeta las dos y no menciona la duración por defecto', async () => {
      const { autorizacion } = await persona();
      const r = OperacionRespuesta.parse(
        (await proponer(autorizacion, { titulo: 'Llamada', inicio: '2026-11-06T09:00:00+01:00', fin: '2026-11-06T09:30:00+01:00', zonaHoraria: 'Europe/Madrid' }).expect(201)).body,
      );
      expect(r.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Hora', valor: '09:00 – 09:30' });
      expect(r.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Zona horaria', valor: 'Hora de Madrid (GMT+1)' });
      expect(r.vistaConfirmacion.datos.some((d) => d.etiqueta === 'Duración')).toBe(false);
    });
  });

  describe('agenda.datos-faltantes-no-crea-operacion', () => {
    it('«Agéndame algo con Vasco», sin fecha ni hora: dice qué falta y no crea nada', async () => {
      const { perfilId, autorizacion } = await persona();
      const r = await proponer(autorizacion, { titulo: 'Algo con Vasco' }).expect(400);
      expect(ErrorApi.parse(r.body)).toEqual({ codigo: 'DATOS_FALTANTES', mensaje: 'Falta la fecha y la hora de inicio.', campos: ['inicio'] });

      const sinNada = ErrorApi.parse((await proponer(autorizacion, { titulo: '  ' }).expect(400)).body);
      expect(sinNada).toMatchObject({ codigo: 'DATOS_FALTANTES', campos: ['titulo', 'inicio'], mensaje: 'Falta el título y la fecha y la hora de inicio.' });

      expect(await prisma.operacion.count({ where: { perfilId } })).toBe(0);
      expect(calendario.llamadas).toEqual({ lecturas: 0, escrituras: 0 });
    });

    it('un dato que está pero es inválido no es un dato faltante', async () => {
      const { autorizacion } = await persona();
      const r = await proponer(autorizacion, { titulo: 'Reunión', inicio: '2026-11-06T10:00:00-05:00', fin: '2026-11-06T09:00:00-05:00' }).expect(400);
      expect(ErrorApi.parse(r.body).codigo).toBe('SOLICITUD_INVALIDA');
    });
  });

  it('crear un compromiso no es un control directo: solo lo propone el asistente (R-42, DP-01)', async () => {
    const { perfilId, autorizacion } = await persona();
    const r = await proponer(autorizacion, { titulo: 'Reunión', inicio: '2026-11-06T10:00:00-05:00' }, 'control_directo').expect(403);
    expect(ErrorApi.parse(r.body).codigo).toBe('ORIGEN_NO_PERMITIDO');
    expect(await prisma.operacion.count({ where: { perfilId } })).toBe(0);
  });

  it('sin permiso de calendario no hay propuesta ni llamadas a Google (REQ-CUN01-08)', async () => {
    const { perfilId, autorizacion } = await persona(false);
    const r = await proponer(autorizacion, { titulo: 'Reunión', inicio: '2026-11-06T10:00:00-05:00' }).expect(403);
    expect(ErrorApi.parse(r.body).codigo).toBe('PERMISO_GOOGLE_FALTANTE');
    expect(await prisma.operacion.count({ where: { perfilId } })).toBe(0);
    expect(calendario.llamadas).toEqual({ lecturas: 0, escrituras: 0 });
  });
});
