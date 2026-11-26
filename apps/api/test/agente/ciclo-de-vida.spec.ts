import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConversacionAsistente, IngresoRespuesta, RespuestaAsistente, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CicloDeVidaAsistente } from '../../src/agente/ciclo-de-vida';
import { TOPE_VUELTAS } from '../../src/agente/grafo/grafo-asistente';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado, type ReglaGuion } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';
import { VIERNES } from '../utilidades/fechas';

// T-041 · specs/07-agente/plan.md §14.3 y §14.8 · REQ-AGT-01 v2, REQ-AGT-03 · decisiones 18, 20, 21 · H-AG-08 ·
// H-AGT-10. El reloj se mueve cambiando las fechas guardadas o pasando `ahora` al trabajador.

const CONTRASENA = 'una-contrasena-de-prueba';
const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;
const calendario = new ProveedorCalendarioSimulado();
const GUION: ReglaGuion[] = [
  { si: '^agéndame dentista el viernes a las 4$', pasos: [{ llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: 'Dentista', fecha: VIERNES, horaInicio: '16:00' } }] }, { texto: '' }] },
  { si: '^hola$', pasos: [{ texto: 'Hola, ¿qué hacemos?' }] },
  // H-AGT-10: un modelo que nunca deja de pedir herramientas
  { si: '^sin fin$', pasos: Array.from({ length: TOPE_VUELTAS + 2 }, () => ({ llamadas: [{ nombre: 'agenda_consultar', argumentos: { desde: VIERNES, hasta: VIERNES } }] })) },
];
const simulado = new ModeloSimulado(GUION);
const textos = (turnos: TurnoAsistente[]) => turnos.map((t) => (t as { texto?: string }).texto ?? t.tipo);

describe('T-041 · ciclo de vida de los episodios', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ciclo: CicloDeVidaAsistente;
  let autorizacion: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const enviar = async (texto: string) =>
    RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto }).expect(200)).body);
  const leer = async () => ConversacionAsistente.parse((await http().get('/asistente/conversacion').set('Authorization', autorizacion).expect(200)).body);
  const envejecer = (id: string, ms: number) =>
    prisma.conversacionAgente.update({ where: { id }, data: { ultimaActividadEn: new Date(Date.now() - ms), abiertaEn: new Date(Date.now() - ms) } });

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
    ciclo = app.get(CicloDeVidaAsistente);
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    calendario.reiniciar();
    simulado.recuperar();
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `ciclo${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima');
    await prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
    const sesion = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    autorizacion = `Bearer ${sesion.tokenAcceso}`;
  });

  describe('agente.episodio-caduca', () => {
    it('tras 30 minutos sin actividad, el siguiente mensaje abre otro episodio', async () => {
      const primero = await enviar('hola');
      await envejecer(primero.episodioId, 31 * MINUTO);
      const segundo = await enviar('hola');
      expect(segundo.episodioId).not.toBe(primero.episodioId);
      expect(await prisma.conversacionAgente.findUniqueOrThrow({ where: { id: primero.episodioId } })).toMatchObject({ estado: 'cerrada' });
    });

    it('con 29 minutos, sigue el mismo', async () => {
      const primero = await enviar('hola');
      await envejecer(primero.episodioId, 29 * MINUTO);
      expect((await enviar('hola')).episodioId).toBe(primero.episodioId);
    });

    it('el trabajador cierra los inactivos, pero no uno con una propuesta esperando', async () => {
      const charla = await enviar('hola');
      await envejecer(charla.episodioId, 31 * MINUTO);
      const resultado = await ciclo.repasar();
      expect(resultado.cerrados).toBe(1);

      const tarjeta = await enviar('Agéndame dentista el viernes a las 4');
      expect(tarjeta.pendiente).toBeTruthy();
      await envejecer(tarjeta.episodioId, 2 * 60 * MINUTO);
      await ciclo.repasar();
      expect(await prisma.conversacionAgente.findUniqueOrThrow({ where: { id: tarjeta.episodioId } })).toMatchObject({ estado: 'abierta' });
      expect((await leer()).pendiente).toBe(tarjeta.pendiente);
    });
  });

  describe('agente.propuesta-caduca', () => {
    it('a las 25 horas el trabajador la descarta, con su turno visible, y cierra el episodio', async () => {
      const tarjeta = await enviar('Agéndame dentista el viernes a las 4');
      await prisma.operacion.update({ where: { id: tarjeta.pendiente! }, data: { creadaEn: new Date(Date.now() - 25 * 60 * MINUTO) } });
      const resultado = await ciclo.repasar();
      expect(resultado.caducadas).toBe(1);
      expect(await prisma.operacion.findUniqueOrThrow({ where: { id: tarjeta.pendiente! } })).toMatchObject({ estado: 'descartada' });
      expect(calendario.llamadas.escrituras).toBe(0);

      const conversacion = await leer();
      expect(conversacion.episodioAbierto).toBeNull();
      const episodio = conversacion.episodios.find((e) => e.id === tarjeta.episodioId)!;
      expect(textos(episodio.turnos)).toContain('Esta propuesta caducó; no se hizo nada.');
      expect(episodio.cierre).toMatchObject({ desenlace: 'descartado' });
    });

    it('a las 23 horas sigue esperando', async () => {
      const tarjeta = await enviar('Agéndame dentista el viernes a las 4');
      await prisma.operacion.update({ where: { id: tarjeta.pendiente! }, data: { creadaEn: new Date(Date.now() - 23 * 60 * MINUTO) } });
      expect((await ciclo.repasar()).caducadas).toBe(0);
      expect(await prisma.operacion.findUniqueOrThrow({ where: { id: tarjeta.pendiente! } })).toMatchObject({ estado: 'propuesta' });
    });
  });

  describe('agente.retencion-puntos-de-control', () => {
    it('el punto de control de un episodio cerrado hace 8 días desaparece; su transcripción y su auditoría siguen', async () => {
      const charla = await enviar('hola');
      await prisma.conversacionAgente.update({ where: { id: charla.episodioId }, data: { estado: 'cerrada', cerradaEn: new Date(Date.now() - 8 * DIA) } });
      const llamadas = await prisma.llamadaModelo.count();
      expect(await prisma.puntoControlAgente.count()).toBe(1);

      expect((await ciclo.repasar()).puntosBorrados).toBe(1);
      expect(await prisma.puntoControlAgente.count()).toBe(0);
      expect(await prisma.turnoTranscripcion.count({ where: { conversacionId: charla.episodioId } })).toBeGreaterThan(0);
      expect(await prisma.llamadaModelo.count()).toBe(llamadas);
    });

    it('uno cerrado hace 6 días se queda', async () => {
      const charla = await enviar('hola');
      await prisma.conversacionAgente.update({ where: { id: charla.episodioId }, data: { estado: 'cerrada', cerradaEn: new Date(Date.now() - 6 * DIA) } });
      expect((await ciclo.repasar()).puntosBorrados).toBe(0);
    });
  });

  describe('agente.retencion-transcripcion', () => {
    it('un turno de hace 91 días desaparece y uno de hace 89 sigue; la conversación no se borra', async () => {
      const charla = await enviar('hola');
      const [viejo, reciente] = await prisma.turnoTranscripcion.findMany({ where: { conversacionId: charla.episodioId }, orderBy: { secuencia: 'asc' } });
      await prisma.turnoTranscripcion.update({ where: { id: viejo!.id }, data: { en: new Date(Date.now() - 91 * DIA) } });
      await prisma.turnoTranscripcion.update({ where: { id: reciente!.id }, data: { en: new Date(Date.now() - 89 * DIA) } });

      expect((await ciclo.repasar()).turnosBorrados).toBe(1);
      expect(await prisma.turnoTranscripcion.findUnique({ where: { id: viejo!.id } })).toBeNull();
      expect(await prisma.turnoTranscripcion.findUnique({ where: { id: reciente!.id } })).not.toBeNull();
      expect(await prisma.conversacionAgente.count({ where: { id: charla.episodioId } })).toBe(1);
    });
  });

  describe('agente.tope-del-grafo', () => {
    it('un modelo que no deja de pedir herramientas termina en el turno de fallo, sin el error de LangGraph (H-AGT-10)', async () => {
      const r = await enviar('sin fin');
      expect(textos(r.turnos).at(-1)).toBe('No pude resolverlo esta vez. No se ha creado ni enviado nada.');
    });
  });
});
