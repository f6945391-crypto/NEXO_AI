import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, EventoAgenda, IngresoRespuesta, OperacionRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { z } from 'zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';
import { diaSiguiente, enLima, instante } from '../utilidades/fechas';

// T-019 · REQ-CUN01-06, REQ-CUN01-11 (control directo) · DP-01, H-AG-04, H-AG-05, H-AG-11

const CONTRASENA = 'una-contrasena-de-prueba';
const calendario = new ProveedorCalendarioSimulado();
const Lista = z.array(EventoAgenda);
const todo = { desde: new Date(0), hasta: new Date('2100-01-01') };

describe('T-019 · modificar y cancelar un compromiso', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function persona() {
    const correo = `mc${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima');
    await prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  // Lo que la persona ve en su agenda ese viernes y el siguiente día, con los ids de la réplica
  async function agenda(autorizacion: string) {
    const r = await http().get('/agenda/eventos').query({ desde: enLima('00:00'), hasta: `${diaSiguiente(diaSiguiente())}T23:59:00-05:00` }).set('Authorization', autorizacion).expect(200);
    return Lista.parse(r.body);
  }
  const idDe = async (autorizacion: string, titulo: string) => (await agenda(autorizacion)).find((e) => e.titulo === titulo)!.id;

  const proponer = (autorizacion: string, tipo: string, carga: unknown, origen = 'agente') =>
    http().post('/operaciones').set('Authorization', autorizacion).send({ tipo, carga, origen });
  const confirmar = (autorizacion: string, id: string) => http().post(`/operaciones/${id}/confirmar`).set('Authorization', autorizacion);
  const enGoogle = async (perfilId: string) =>
    (await calendario.listar({ perfilId, organizacionId }, { tipo: 'completa', ...todo })).cambios.flatMap((c) => (c.tipo === 'evento' ? [c.evento] : []));

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

  describe('agenda.cancelar-requiere-confirmacion', () => {
    it('cancelar, también como control directo, solo quita el evento de Google al confirmar, y queda cancelado', async () => {
      const { perfilId, autorizacion } = await persona();
      calendario.sembrar(perfilId, { titulo: 'Dentista', inicio: instante('10:00'), fin: instante('11:00'), zonaHoraria: 'America/Lima' });
      const id = await idDe(autorizacion, 'Dentista');

      const propuesta = OperacionRespuesta.parse((await proponer(autorizacion, 'agenda.cancelar', { eventoId: id }, 'control_directo').expect(201)).body);
      expect(propuesta.vistaConfirmacion).toMatchObject({ accion: 'Cancelar este compromiso', confirmable: true });
      expect(propuesta.vistaConfirmacion.irreversible).toContain('Se quita de tu calendario de Google');
      expect(propuesta.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Aviso', valor: 'No se avisa a nadie de este cambio' });
      // Sin confirmar, nada cambió
      expect(calendario.llamadas.escrituras).toBe(0);
      expect((await enGoogle(perfilId)).map((e) => e.titulo)).toEqual(['Dentista']);

      const confirmada = OperacionRespuesta.parse((await confirmar(autorizacion, propuesta.id).expect(200)).body);
      expect(confirmada.estado).toBe('ejecutada');
      expect(EventoAgenda.parse(confirmada.resultado)).toMatchObject({ id, titulo: 'Dentista', estado: 'cancelado' });
      expect(await enGoogle(perfilId)).toEqual([]);
      // R-25: en la réplica queda a la vista como cancelado
      expect((await agenda(autorizacion)).find((e) => e.id === id)?.estado).toBe('cancelado');

      await confirmar(autorizacion, propuesta.id).expect(200);
      expect(calendario.llamadas.escrituras).toBe(1);
    });

    it('descartar la cancelación no toca nada, y un compromiso ya cancelado no se vuelve a cancelar', async () => {
      const { perfilId, autorizacion } = await persona();
      const e = calendario.sembrar(perfilId, { titulo: 'Clase', inicio: instante('16:00'), fin: instante('17:00'), zonaHoraria: 'America/Lima' });
      const id = await idDe(autorizacion, 'Clase');
      const p = OperacionRespuesta.parse((await proponer(autorizacion, 'agenda.cancelar', { eventoId: id }).expect(201)).body);
      await http().post(`/operaciones/${p.id}/descartar`).set('Authorization', autorizacion).expect(200);
      expect(calendario.llamadas.escrituras).toBe(0);

      calendario.borrarEnGoogle(perfilId, e.id);
      const r = await proponer(autorizacion, 'agenda.cancelar', { eventoId: id }).expect(409);
      expect(ErrorApi.parse(r.body)).toMatchObject({ codigo: 'EVENTO_NO_MODIFICABLE', mensaje: 'Ese compromiso ya está cancelado.' });
    });
  });

  it('H-AG-05: un compromiso ajeno no se cambia ni se cancela, se explica por qué y no se llama a Google', async () => {
    const { perfilId, autorizacion } = await persona();
    calendario.sembrar(perfilId, { titulo: 'Me invitaron', inicio: instante('12:00'), fin: instante('13:00'), zonaHoraria: 'America/Lima', esOrganizador: false });
    const id = await idDe(autorizacion, 'Me invitaron');

    for (const [tipo, carga] of [['agenda.cancelar', { eventoId: id }], ['agenda.modificar', { eventoId: id, inicio: enLima('15:00') }]] as const) {
      const r = await proponer(autorizacion, tipo, carga).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('EVENTO_NO_MODIFICABLE');
      expect(ErrorApi.parse(r.body).mensaje).toContain('rechazar la invitación en Google Calendar');
    }
    expect(await prisma.operacion.count({ where: { perfilId } })).toBe(0);
    expect(calendario.llamadas.escrituras).toBe(0);
  });

  it('H-AG-04: modificar una vez de una serie no toca las demás', async () => {
    const { perfilId, autorizacion } = await persona();
    const primera = calendario.sembrar(perfilId, { titulo: 'Diaria', inicio: instante('09:00'), fin: instante('09:15'), zonaHoraria: 'America/Lima', serieId: 'serie-1' });
    const segunda = calendario.sembrar(perfilId, {
      titulo: 'Diaria',
      inicio: instante('09:00', diaSiguiente()),
      fin: instante('09:15', diaSiguiente()),
      zonaHoraria: 'America/Lima',
      serieId: 'serie-1',
    });
    const id = (await agenda(autorizacion)).find((e) => e.inicio === enLima('09:00'))!.id;

    const p = OperacionRespuesta.parse((await proponer(autorizacion, 'agenda.modificar', { eventoId: id, inicio: enLima('09:30') }).expect(201)).body);
    expect(p.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Repetición', valor: 'Solo esta vez: el resto de la serie queda igual' });
    await confirmar(autorizacion, p.id).expect(200);

    const tras = await enGoogle(perfilId);
    expect(tras.find((e) => e.id === primera.id)!.inicio.getTime()).toBe(instante('09:30').getTime());
    expect(tras.find((e) => e.id === segunda.id)!.inicio.getTime()).toBe(instante('09:00', diaSiguiente()).getTime());
  });

  it('modificar solo el inicio conserva la duración, y muestra el antes y el ahora', async () => {
    const { perfilId, autorizacion } = await persona();
    calendario.sembrar(perfilId, { titulo: 'Taller', inicio: instante('10:00'), fin: instante('11:30'), zonaHoraria: 'America/Lima' });
    const id = await idDe(autorizacion, 'Taller');

    const p = OperacionRespuesta.parse((await proponer(autorizacion, 'agenda.modificar', { eventoId: id, inicio: enLima('14:00'), titulo: 'Taller de ventas' }).expect(201)).body);
    const dato = (etiqueta: string) => p.vistaConfirmacion.datos.find((d) => d.etiqueta === etiqueta)?.valor;
    expect(dato('Título nuevo')).toBe('Taller de ventas');
    expect(dato('Antes')).toMatch(/10:00 – 11:30$/);
    expect(dato('Ahora')).toMatch(/14:00 – 15:30$/);

    const c = OperacionRespuesta.parse((await confirmar(autorizacion, p.id).expect(200)).body);
    expect(EventoAgenda.parse(c.resultado)).toMatchObject({ id, titulo: 'Taller de ventas', inicio: enLima('14:00'), fin: enLima('15:30') });
  });

  it('el propio evento no choca consigo mismo, pero otro sí, con su causa y alternativas', async () => {
    const { perfilId, autorizacion } = await persona();
    calendario.sembrar(perfilId, { titulo: 'Reunión', inicio: instante('10:00'), fin: instante('11:00'), zonaHoraria: 'America/Lima' });
    calendario.sembrar(perfilId, { titulo: 'Almuerzo', inicio: instante('13:00'), fin: instante('14:00'), zonaHoraria: 'America/Lima' });
    const id = await idDe(autorizacion, 'Reunión');

    const mediaHora = OperacionRespuesta.parse((await proponer(autorizacion, 'agenda.modificar', { eventoId: id, inicio: enLima('10:30') }).expect(201)).body);
    expect(mediaHora.vistaConfirmacion.confirmable).toBe(true);

    const choca = OperacionRespuesta.parse((await proponer(autorizacion, 'agenda.modificar', { eventoId: id, inicio: enLima('13:30') }).expect(201)).body);
    expect(choca.vistaConfirmacion.confirmable).toBe(false);
    expect(choca.vistaConfirmacion.conflicto?.eventos.map((e) => e.titulo)).toEqual(['Almuerzo']);
    expect(choca.vistaConfirmacion.conflicto?.alternativas.length).toBeGreaterThan(0);
    // Decisión 28 de 02-agenda: no se repiten en texto en los datos de la tarjeta
    expect(choca.vistaConfirmacion.datos.map((d) => d.etiqueta)).not.toContain('Alternativas');
    await confirmar(autorizacion, choca.id).expect(409);
    expect(calendario.llamadas.escrituras).toBe(0);
  });

  it('cambiar un compromiso no es un control directo, y uno de todo el día no se cambia de hora', async () => {
    const { perfilId, autorizacion } = await persona();
    calendario.sembrar(perfilId, { titulo: 'Feriado', inicio: instante('00:00'), fin: instante('00:00', diaSiguiente()), zonaHoraria: 'America/Lima', todoElDia: true });
    const id = await idDe(autorizacion, 'Feriado');

    const directo = await proponer(autorizacion, 'agenda.modificar', { eventoId: id, titulo: 'Feriado nacional' }, 'control_directo').expect(403);
    expect(ErrorApi.parse(directo.body).codigo).toBe('ORIGEN_NO_PERMITIDO');
    const deHora = await proponer(autorizacion, 'agenda.modificar', { eventoId: id, inicio: enLima('10:00') }).expect(409);
    expect(ErrorApi.parse(deHora.body).codigo).toBe('EVENTO_NO_MODIFICABLE');
    // Cambiarle el título sí
    const titulo = OperacionRespuesta.parse((await proponer(autorizacion, 'agenda.modificar', { eventoId: id, titulo: 'Feriado nacional' }).expect(201)).body);
    expect(titulo.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Cuándo', valor: expect.stringContaining('todo el día') });
  });
});
