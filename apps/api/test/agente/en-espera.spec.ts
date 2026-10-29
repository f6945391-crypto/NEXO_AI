import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IngresoRespuesta, PropuestaEvento, RespuestaAsistente, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProcesadorEnEspera } from '../../src/agente/en-espera';
import { ModeloSimulado, type ReglaGuion } from '../../src/agente/modelo/modelo-simulado';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-033 · P-11 · REQ-CUN01-11, REQ-CAP-23, REQ-CAP-24, REQ-AGT-02, REQ-ACC-08 · specs/07-agente/plan.md §7

const CONTRASENA = 'una-contrasena-de-prueba';
const calendario = new ProveedorCalendarioSimulado();
const GUION: ReglaGuion[] = [
  // «mañana» lo resuelve el simulado respecto de la referencia de la petición, como lo haría un modelo
  { si: '^dentista mañana a las 9$', pasos: [{ llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: 'Dentista', fecha: '{mañana}', horaInicio: '09:00' } }] }, { texto: '' }] },
  { si: '^recuérdame (.+)$', pasos: [{ llamadas: [{ nombre: 'captura_guardar_tarea', argumentos: { texto: '$1', clase: 'tarea' } }] }, { texto: '' }] },
  { si: '^hola$', pasos: [{ texto: 'Hola' }] },
];
const simulado = new ModeloSimulado(GUION);

const tipos = (turnos: TurnoAsistente[]) => turnos.map((t) => t.tipo);
const fechaEnLima = (instante: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(instante);

describe('T-033 · lo pedido en espera', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let procesador: ProcesadorEnEspera;
  let autorizacion: string;
  let perfilId: string;
  let organizacionId: string;
  let n = 0;

  const enviar = async (texto: string) =>
    RespuestaAsistente.parse((await request(app.getHttpServer()).post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto }).expect(200)).body);
  const conectarCalendario = () =>
    prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROVEEDOR_MODELO)
      .useValue(simulado)
      // Sin las esperas de 1 y 3 segundos entre reintentos
      .overrideProvider(OPCIONES_LLAMADOR)
      .useValue({ limiteMs: 2_000, esperasMs: [0, 0] })
      .overrideProvider(PROVEEDOR_CALENDARIO)
      .useValue(calendario)
      .compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
    procesador = app.get(ProcesadorEnEspera);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    calendario.reiniciar();
    simulado.recuperar();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `espera${++n}@nexoai.test`;
    ({ perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima'));
    const sesion = IngresoRespuesta.parse((await request(app.getHttpServer()).post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    autorizacion = `Bearer ${sesion.tokenAcceso}`;
  });

  describe('agente.sin-modelo-queda-en-espera', () => {
    it('con el asistente caído, lo pedido queda en espera con su motivo y no se crea nada (REQ-CUN01-11, REQ-CAP-24)', async () => {
      await conectarCalendario();
      simulado.caer();
      const r = await enviar('Dentista mañana a las 9');
      expect(tipos(r.turnos)).toEqual(['persona', 'en_espera']);
      expect(r.turnos[1]).toMatchObject({ motivo: 'asistente_no_disponible' });
      expect((r.turnos[1] as { texto: string }).texto).toMatch(/quedó en espera: no se ha creado ni enviado nada/);
      const op = await prisma.operacion.findFirstOrThrow();
      expect(op).toMatchObject({ estado: 'en_espera', motivoEspera: 'asistente_no_disponible', tipo: 'asistente.solicitud', solicitudOriginal: 'Dentista mañana a las 9' });
      expect(calendario.llamadas.escrituras).toBe(0);
      // Lo existente se sigue consultando: la agenda no depende del modelo
      await request(app.getHttpServer())
        .get(`/agenda/eventos?desde=${encodeURIComponent(new Date().toISOString())}&hasta=${encodeURIComponent(new Date(Date.now() + 86_400_000).toISOString())}`)
        .set('Authorization', autorizacion)
        .expect(200);
    });

    it('mientras no responde, el trabajador lo deja como está y para', async () => {
      simulado.caer();
      await enviar('Dentista mañana a las 9');
      await enviar('Hola');
      expect(await procesador.repasar()).toMatchObject({ atendidas: 0, detenida: true });
      expect(await prisma.operacion.count({ where: { estado: 'en_espera' } })).toBe(2);
    });
  });

  describe('agente.en-espera-desde-la-captura', () => {
    it('al volver, la misma fila pasa a propuesta, y «mañana» es el día siguiente a la captura, no al proceso', async () => {
      await conectarCalendario();
      simulado.caer();
      const r = await enviar('Dentista mañana a las 9');
      const id = (r.turnos[1] as { operacionId: string }).operacionId;
      // Se capturó hace dos días
      const capturadaEn = new Date(Date.now() - 2 * 86_400_000);
      await prisma.operacion.update({ where: { id }, data: { capturadaEn } });

      simulado.recuperar();
      expect(await procesador.repasar()).toMatchObject({ atendidas: 1, propuestas: 1 });
      const op = await prisma.operacion.findUniqueOrThrow({ where: { id } });
      expect(op).toMatchObject({ estado: 'propuesta', tipo: 'agenda.registrar', motivoEspera: null, solicitudOriginal: 'Dentista mañana a las 9' });
      expect(op.capturadaEn).toEqual(capturadaEn);
      const inicio = new Date(PropuestaEvento.parse(op.carga).inicio);
      expect(fechaEnLima(inicio)).toBe(fechaEnLima(new Date(capturadaEn.getTime() + 86_400_000)));
      // Nada se escribe hasta que la persona confirme, como siempre
      expect(calendario.llamadas.escrituras).toBe(0);
      expect(await prisma.operacion.count()).toBe(1);
    });

    it('lo que al interpretarse no es una acción se responde y la fila se cierra sin efecto (H-AGT-04)', async () => {
      simulado.caer();
      await enviar('Hola');
      simulado.recuperar();
      expect(await procesador.repasar()).toMatchObject({ atendidas: 1, propuestas: 0 });
      expect(await prisma.operacion.findFirstOrThrow()).toMatchObject({ estado: 'descartada' });
    });
  });

  describe('agente.tarea-queda-en-espera', () => {
    it('una tarea se reconoce, se dice y queda en espera; no se crea ninguna tarea ni compromiso, y el trabajador no la toca (REQ-AGT-02)', async () => {
      const r = await enviar('Recuérdame pagar el recibo antes del sábado');
      expect(tipos(r.turnos)).toEqual(['persona', 'en_espera']);
      expect(r.turnos[1]).toMatchObject({ motivo: 'funcion_por_llegar' });
      expect((r.turnos[1] as { texto: string }).texto).toBe(
        'Lo guardé como tarea: «pagar el recibo antes del sábado». Las tareas llegan en una próxima versión, así que por ahora no se ha creado nada.',
      );
      expect(await prisma.operacion.findFirstOrThrow()).toMatchObject({ estado: 'en_espera', motivoEspera: 'funcion_por_llegar', tipo: 'tareas.registrar' });
      // No hace falta otra vuelta del modelo
      expect(simulado.peticiones.at(-1)!.mensajes.filter((m) => m.rol === 'herramienta')).toHaveLength(0);
      expect(await procesador.repasar()).toMatchObject({ atendidas: 0 });
      expect(await prisma.operacion.findFirstOrThrow()).toMatchObject({ estado: 'en_espera' });
    });
  });

  describe('agente.sin-calendario-no-agenda', () => {
    it('sin calendario, dice qué permiso falta y lo guarda; al conectarlo, el trabajador lo propone (REQ-ACC-08)', async () => {
      const r = await enviar('Dentista mañana a las 9');
      expect(tipos(r.turnos)).toEqual(['persona', 'en_espera']);
      expect(r.turnos[1]).toMatchObject({ motivo: 'permiso_faltante' });
      expect((r.turnos[1] as { texto: string }).texto).toMatch(/permiso para ver y editar tu calendario de Google/);
      // Sin el calendario conectado, el trabajador no lo intenta
      expect(await procesador.repasar()).toMatchObject({ atendidas: 0 });

      await conectarCalendario();
      expect(await procesador.repasar()).toMatchObject({ atendidas: 1, propuestas: 1 });
      expect(await prisma.operacion.findFirstOrThrow()).toMatchObject({ estado: 'propuesta', tipo: 'agenda.registrar' });
    });
  });
});
