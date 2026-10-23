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
// T-018 · REQ-CUN01-05 · DP-02 · H-AG-07

const CONTRASENA = 'una-contrasena-de-prueba';
const calendario = new ProveedorCalendarioSimulado();
const todo = { desde: new Date(0), hasta: new Date('2100-01-01') };
const DIA = 24 * 3600_000;

// Un viernes al menos diez días adelante: dentro de la ventana de la réplica y nunca en el pasado, sea
// cual sea el día en que corran las pruebas. Las horas son de Lima, que no cambia de hora.
function viernesProximo(): string {
  const d = new Date(Date.now() + 10 * DIA);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const VIERNES = viernesProximo();
const enLima = (hora: string, dia = VIERNES) => `${dia}T${hora}:00-05:00`;
const instante = (hora: string, dia = VIERNES) => new Date(enLima(hora, dia));
const fechaEnLima = (hora: string) =>
  new Intl.DateTimeFormat('es', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(instante(hora));

describe('T-017 y T-018 · registrar un compromiso', () => {
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

  const confirmar = (autorizacion: string, id: string) => http().post(`/operaciones/${id}/confirmar`).set('Authorization', autorizacion);

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
      calendario.sembrar(perfilId, { titulo: 'Dentista', inicio: instante('10:00'), fin: instante('11:00'), zonaHoraria: 'America/Lima' });

      const r = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión con Vasco', inicio: enLima('10:30') }).expect(201)).body);
      expect(calendario.llamadas.lecturas).toBeGreaterThan(0);
      expect(r.vistaConfirmacion.confirmable).toBe(false);
      expect(r.vistaConfirmacion.motivoNoConfirmable).toBe('Se superpone con «Dentista», de 10:00 – 11:00. Elige una de las alternativas u otro horario.');
      await confirmar(autorizacion, r.id).expect(409);
      expect(calendario.llamadas.escrituras).toBe(0);
    });

    it('sin solapes se puede confirmar; un evento que solo toca el pedido, o de todo el día, no choca', async () => {
      const { perfilId, autorizacion } = await persona();
      calendario.sembrar(perfilId, { titulo: 'Antes', inicio: instante('09:00'), fin: instante('10:00'), zonaHoraria: 'America/Lima' });
      calendario.sembrar(perfilId, { titulo: 'Feriado', inicio: instante('00:00'), fin: new Date(instante('00:00').getTime() + DIA), zonaHoraria: 'America/Lima', todoElDia: true });
      const r = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión', inicio: enLima('10:00') }).expect(201)).body);
      expect(r.vistaConfirmacion.confirmable).toBe(true);
      expect(r.vistaConfirmacion.conflicto).toBeNull();
    });
  });

  describe('agenda.sin-confirmar-no-escribe-ni-notifica', () => {
    it('proponer y descartar no escribe nada en Google ni en la réplica', async () => {
      const { perfilId, autorizacion } = await persona();
      const r = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión', inicio: enLima('10:00') }).expect(201)).body);
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
      const propuesta = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión con Vasco', inicio: enLima('10:00') }).expect(201)).body);
      expect(propuesta.vistaConfirmacion.datos).toEqual([
        { etiqueta: 'Título', valor: 'Reunión con Vasco' },
        { etiqueta: 'Fecha', valor: fechaEnLima('10:00') },
        { etiqueta: 'Hora', valor: '10:00 – 11:00' },
        { etiqueta: 'Zona horaria', valor: 'Hora de Lima (GMT-5)' },
        { etiqueta: 'Duración', valor: '1 hora, porque no indicaste la hora de fin' },
      ]);

      const confirmada = OperacionRespuesta.parse((await confirmar(autorizacion, propuesta.id).expect(200)).body);
      expect(confirmada.estado).toBe('ejecutada');
      // El resultado es el evento tal como quedó, para la tarjeta de resultado (REQ-CUN01-04)
      expect(EventoAgenda.parse(confirmada.resultado)).toMatchObject({
        titulo: 'Reunión con Vasco',
        inicio: enLima('10:00'),
        fin: enLima('11:00'),
        zonaHoraria: 'America/Lima',
        esOrganizador: true,
        estado: 'confirmado',
      });

      const [enGoogle] = await delCalendario(perfilId);
      expect(enGoogle).toMatchObject({ titulo: 'Reunión con Vasco', zonaHoraria: 'America/Lima' });
      expect(enGoogle!.inicio.getTime()).toBe(instante('10:00').getTime());
      expect(enGoogle!.fin.getTime()).toBe(instante('11:00').getTime());
      expect(await prisma.eventoAgenda.findMany({ where: { perfilId } })).toMatchObject([{ googleEventoId: enGoogle!.id, titulo: 'Reunión con Vasco' }]);

      // Confirmar otra vez no vuelve a escribir (P-07)
      await confirmar(autorizacion, propuesta.id).expect(200);
      expect(calendario.llamadas.escrituras).toBe(1);
    });

    it('con hora de fin y otra zona, respeta las dos y no menciona la duración por defecto', async () => {
      const { autorizacion } = await persona();
      const r = OperacionRespuesta.parse(
        (await proponer(autorizacion, { titulo: 'Llamada', inicio: `${VIERNES}T09:00:00+09:00`, fin: `${VIERNES}T09:30:00+09:00`, zonaHoraria: 'Asia/Tokyo' }).expect(201)).body,
      );
      expect(r.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Hora', valor: '09:00 – 09:30' });
      expect(r.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Zona horaria', valor: 'Hora de Tokyo (GMT+9)' });
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
      const r = await proponer(autorizacion, { titulo: 'Reunión', inicio: enLima('10:00'), fin: enLima('09:00') }).expect(400);
      expect(ErrorApi.parse(r.body).codigo).toBe('SOLICITUD_INVALIDA');
    });
  });

  describe('agenda.conflicto-identifica-causa-y-ofrece-alternativas', () => {
    it('viernes de 10:00 a 11:00 ocupado: dice qué compromiso choca, ofrece hasta tres alternativas y no registra nada', async () => {
      const { perfilId, autorizacion } = await persona();
      const dentista = calendario.sembrar(perfilId, { titulo: 'Dentista', inicio: instante('10:00'), fin: instante('11:00'), zonaHoraria: 'America/Lima' });

      const r = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión con Vasco', inicio: enLima('10:00'), fin: enLima('11:00') }).expect(201)).body);
      const { conflicto } = r.vistaConfirmacion;
      expect(r.vistaConfirmacion.confirmable).toBe(false);
      expect(conflicto?.eventos).toMatchObject([{ titulo: 'Dentista', inicio: enLima('10:00'), fin: enLima('11:00') }]);
      const fila = await prisma.eventoAgenda.findFirstOrThrow({ where: { googleEventoId: dentista.id } });
      expect(conflicto?.eventos[0]?.id).toBe(fila.id);

      // DP-02: de una a tres, de la misma hora de duración, el mismo día primero, sin chocar con nada
      const alternativas = conflicto?.alternativas ?? [];
      expect(alternativas.length).toBeGreaterThan(0);
      expect(alternativas.length).toBeLessThanOrEqual(3);
      expect(alternativas[0]!.inicio.slice(0, 10)).toBe(VIERNES);
      for (const a of alternativas) {
        expect(Date.parse(a.fin) - Date.parse(a.inicio)).toBe(3600_000);
        expect(Date.parse(a.inicio) >= instante('11:00').getTime() || Date.parse(a.fin) <= instante('10:00').getTime()).toBe(true);
      }
      expect(r.vistaConfirmacion.datos.find((d) => d.etiqueta === 'Alternativas')?.valor).toContain(' – ');

      await confirmar(autorizacion, r.id).expect(409);
      expect(calendario.llamadas.escrituras).toBe(0);
    });

    it('elegir una alternativa es proponer de nuevo con ese horario, y esa sí se puede confirmar', async () => {
      const { autorizacion, perfilId } = await persona();
      calendario.sembrar(perfilId, { titulo: 'Dentista', inicio: instante('10:00'), fin: instante('11:00'), zonaHoraria: 'America/Lima' });
      const primera = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión', inicio: enLima('10:00') }).expect(201)).body);
      const [elegida] = primera.vistaConfirmacion.conflicto!.alternativas;

      await http().post(`/operaciones/${primera.id}/descartar`).set('Authorization', autorizacion).expect(200);
      const segunda = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Reunión', inicio: elegida!.inicio, fin: elegida!.fin }).expect(201)).body);
      expect(segunda.vistaConfirmacion.confirmable).toBe(true);
      expect(OperacionRespuesta.parse((await confirmar(autorizacion, segunda.id).expect(200)).body).estado).toBe('ejecutada');
    });

    it('H-AG-07: si al confirmar apareció un choque, no escribe y vuelve a proponer con el conflicto nuevo', async () => {
      const { perfilId, autorizacion } = await persona();
      const r = OperacionRespuesta.parse((await proponer(autorizacion, { titulo: 'Revisión', inicio: enLima('15:00') }).expect(201)).body);
      expect(r.vistaConfirmacion.confirmable).toBe(true);

      // Mientras tanto, alguien agenda algo en Google a esa hora
      calendario.sembrar(perfilId, { titulo: 'Llamada urgente', inicio: instante('15:30'), fin: instante('16:30'), zonaHoraria: 'America/Lima' });
      const c = OperacionRespuesta.parse((await confirmar(autorizacion, r.id).expect(200)).body);
      expect(c.estado).toBe('propuesta');
      expect(c.vistaConfirmacion.confirmable).toBe(false);
      expect(c.vistaConfirmacion.conflicto?.eventos.map((e) => e.titulo)).toEqual(['Llamada urgente']);
      expect(c.vistaConfirmacion.conflicto?.alternativas.length).toBeGreaterThan(0);
      expect(calendario.llamadas.escrituras).toBe(0);
    });
  });

  it('crear un compromiso no es un control directo: solo lo propone el asistente (R-42, DP-01)', async () => {
    const { perfilId, autorizacion } = await persona();
    const r = await proponer(autorizacion, { titulo: 'Reunión', inicio: enLima('10:00') }, 'control_directo').expect(403);
    expect(ErrorApi.parse(r.body).codigo).toBe('ORIGEN_NO_PERMITIDO');
    expect(await prisma.operacion.count({ where: { perfilId } })).toBe(0);
  });

  it('sin permiso de calendario no hay propuesta ni llamadas a Google (REQ-CUN01-08)', async () => {
    const { perfilId, autorizacion } = await persona(false);
    const r = await proponer(autorizacion, { titulo: 'Reunión', inicio: enLima('10:00') }).expect(403);
    expect(ErrorApi.parse(r.body).codigo).toBe('PERMISO_GOOGLE_FALTANTE');
    expect(await prisma.operacion.count({ where: { perfilId } })).toBe(0);
    expect(calendario.llamadas).toEqual({ lecturas: 0, escrituras: 0 });
  });
});
