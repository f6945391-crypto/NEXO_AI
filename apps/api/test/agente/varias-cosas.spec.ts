import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConversacionAsistente, IngresoRespuesta, RespuestaAsistente, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { diasDelPeriodo } from '../../src/agente/herramientas/periodo';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado, type ReglaGuion } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { diaLargo } from '../../src/tareas/dominio/formato';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// specs/07-agente/plan.md §16 · T-157, T-158 · REQ-AGT-09, REQ-AGT-10 · decisiones 38 a 41. La frase de Franco del 28
// de noviembre de 2026, con el simulado: el modelo solo separa la frase y pasa el período; la lista, los días y lo
// que falta los pone el código. Con dos acciones, la segunda tarjeta llega al decidir la primera.

const CONTRASENA = 'una-contrasena-de-prueba';
const FRASE = 'qué tareas y compromisos tengo la semana siguiente, y agrega un bloque de 12 a 7 que se llame ENTREGA DE PROYECTO SEI';
const GUION: ReglaGuion[] = [
  {
    si: '^qué tareas y compromisos tengo la semana siguiente, y agrega un bloque de 12 a 7 que se llame (.+)$',
    pasos: [
      {
        llamadas: [
          {
            nombre: 'asistente_desglosar',
            argumentos: {
              partes: [
                { clase: 'consulta_tareas', que: 'tus tareas', periodo: 'semana_siguiente' },
                { clase: 'consulta_agenda', que: 'tus compromisos', periodo: 'semana_siguiente' },
                { clase: 'compromiso', que: '$1', horaInicio: '12:00', horaFin: '19:00' },
              ],
            },
          },
          { nombre: 'tareas_consultar', argumentos: { periodo: 'semana_siguiente' } },
          { nombre: 'agenda_consultar', argumentos: { periodo: 'semana_siguiente' } },
          // Lo que hizo el modelo en la nube: pedirlo como tarea. El código lo pasa a la agenda (decisión 40)
          { nombre: 'tareas_registrar', argumentos: { texto: '$1', horaInicio: '12:00', horaFin: '19:00' } },
        ],
      },
      { texto: '' },
    ],
  },
  {
    si: '^el (lunes)$',
    pasos: [{ llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: 'ENTREGA DE PROYECTO SEI', fecha: '{$1}', horaInicio: '12:00', horaFin: '19:00' } }] }, { texto: '' }],
  },
  {
    si: '^agenda dentista el viernes a las 4 y recuérdame pagar el recibo$',
    pasos: [
      {
        llamadas: [
          {
            nombre: 'asistente_desglosar',
            argumentos: {
              partes: [
                { clase: 'compromiso', que: 'Dentista', fecha: '{viernes}', horaInicio: '16:00' },
                { clase: 'tarea', que: 'pagar el recibo' },
              ],
            },
          },
          { nombre: 'agenda_registrar_evento', argumentos: { titulo: 'Dentista', fecha: '{viernes}', horaInicio: '16:00' } },
          { nombre: 'tareas_registrar', argumentos: { texto: 'pagar el recibo' } },
        ],
      },
      // Tras proponer, el grafo espera: esta vuelta no se usa
      { texto: '' },
      // Decidida la primera tarjeta, la siguiente de la lista
      { llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: 'pagar el recibo' } }] },
      { texto: '' },
    ],
  },
  {
    si: '^recuérdame pagar el recibo$',
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: 'pagar el recibo' } }] }, { texto: '' }],
  },
  { si: '^¿?qué hicimos\\??$', pasos: [{ texto: '{nota:resumen}' }] },
];
const simulado = new ModeloSimulado(GUION);
const calendario = new ProveedorCalendarioSimulado();

const tipos = (turnos: TurnoAsistente[]) => turnos.map((t) => t.tipo);
const de = <T extends TurnoAsistente['tipo']>(turnos: TurnoAsistente[], tipo: T) => turnos.find((t) => t.tipo === tipo) as Extract<TurnoAsistente, { tipo: T }>;

describe('agente.periodos', () => {
  const ref = (iso: string) => ({ instante: new Date(iso), zonaHoraria: 'America/Lima' });

  it('el sábado 28 de noviembre de 2026: semanas de lunes a domingo y meses enteros', () => {
    const sabado = ref('2026-11-28T15:00:00-05:00');
    expect(diasDelPeriodo('hoy', sabado)).toEqual({ desde: '2026-11-28', hasta: '2026-11-28' });
    expect(diasDelPeriodo('manana', sabado)).toEqual({ desde: '2026-11-29', hasta: '2026-11-29' });
    expect(diasDelPeriodo('esta_semana', sabado)).toEqual({ desde: '2026-11-23', hasta: '2026-11-29' });
    expect(diasDelPeriodo('semana_siguiente', sabado)).toEqual({ desde: '2026-11-30', hasta: '2026-12-06' });
    expect(diasDelPeriodo('este_mes', sabado)).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(diasDelPeriodo('mes_siguiente', sabado)).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
  });

  it('un domingo es el último día de su semana, y al final del año el siguiente es enero', () => {
    expect(diasDelPeriodo('esta_semana', ref('2026-11-29T22:00:00-05:00'))).toEqual({ desde: '2026-11-23', hasta: '2026-11-29' });
    const fin = ref('2026-12-30T10:00:00-05:00');
    expect(diasDelPeriodo('semana_siguiente', fin)).toEqual({ desde: '2027-01-04', hasta: '2027-01-10' });
    expect(diasDelPeriodo('mes_siguiente', fin)).toEqual({ desde: '2027-01-01', hasta: '2027-01-31' });
  });

  it('en la zona de la persona: el sábado a las 23:00 en Lima ya es domingo en UTC', () => {
    expect(diasDelPeriodo('hoy', ref('2026-11-28T23:00:00-05:00'))).toEqual({ desde: '2026-11-28', hasta: '2026-11-28' });
  });
});

describe('agente.varias-cosas', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let autorizacion: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const enviar = async (t: string) => RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto: t }).expect(200)).body);
  const decidir = async (cuerpo: object) => RespuestaAsistente.parse((await http().post('/asistente/decisiones').set('Authorization', autorizacion).send(cuerpo).expect(200)).body);
  const conversacion = async () => ConversacionAsistente.parse((await http().get('/asistente/conversacion').set('Authorization', autorizacion).expect(200)).body);

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
    simulado.usarGuion(GUION);
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `varias${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima');
    await prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
    autorizacion = `Bearer ${IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body).tokenAcceso}`;
  });

  it('la frase de Franco: la lista primero, las dos listas de la semana siguiente de lunes a domingo y «¿Qué día?», sin tarjeta', async () => {
    const r = await enviar(FRASE);
    expect(tipos(r.turnos)).toEqual(['persona', 'desglose', 'tareas', 'agenda', 'pregunta']);
    const { desde, hasta } = diasDelPeriodo('semana_siguiente', { instante: new Date(), zonaHoraria: 'America/Lima' });
    const lista = de(r.turnos, 'desglose').desglose;
    expect(lista.titulo).toBe('Entendí tres cosas:');
    expect(lista.partes).toEqual([
      { clase: 'consulta_tareas', texto: `Tus tareas pendientes de la semana siguiente, del ${diaLargo(desde)} al ${diaLargo(hasta)}`, falta: null },
      { clase: 'consulta_agenda', texto: `Tus compromisos de la semana siguiente, del ${diaLargo(desde)} al ${diaLargo(hasta)}`, falta: null },
      { clase: 'compromiso', texto: 'Un compromiso «ENTREGA DE PROYECTO SEI» de 12:00 a 19:00', falta: 'Falta el día' },
    ]);
    expect(diaLargo(desde)).toMatch(/^lunes /);
    expect(diaLargo(hasta)).toMatch(/^domingo /);
    expect(de(r.turnos, 'tareas').lista.alcance).toBe(`Pendientes del ${diaLargo(desde)} al ${diaLargo(hasta)}, y las vencidas`);
    expect(de(r.turnos, 'pregunta').texto).toBe('¿Qué día?');
    expect(r.pendiente).toBeNull();
    // Ninguna tarea se guardó: era un bloque de tiempo
    expect(await prisma.operacion.count({ where: { tipo: 'tareas.registrar' } })).toBe(0);

    // Con el día, la tarjeta es de un compromiso de 12:00 a 19:00
    const dia = await enviar('el lunes');
    const tarjeta = de(dia.turnos, 'propuesta').operacion;
    expect(tarjeta.tipo).toBe('agenda.registrar');
    expect(JSON.stringify(tarjeta.vistaConfirmacion)).toContain('ENTREGA DE PROYECTO SEI');
    expect(JSON.stringify(tarjeta.vistaConfirmacion)).toContain('12:00');
  });

  it('dos acciones: la segunda tarjeta llega al confirmar la primera, y el episodio se cierra con la última', async () => {
    const r = await enviar('agenda dentista el viernes a las 4 y recuérdame pagar el recibo');
    expect(tipos(r.turnos)).toEqual(['persona', 'desglose', 'propuesta']);
    expect(de(r.turnos, 'desglose').desglose.partes.map((p) => p.falta)).toEqual([null, null]);
    expect(de(r.turnos, 'propuesta').operacion.tipo).toBe('agenda.registrar');

    const primera = await decidir({ decision: 'confirmar', operacionId: r.pendiente });
    expect(tipos(primera.turnos)).toEqual(['resultado', 'propuesta']);
    expect(de(primera.turnos, 'propuesta').operacion.tipo).toBe('tareas.registrar');
    expect(primera.episodioCerrado).toBe(false);
    expect(primera.episodioId).toBe(r.episodioId);

    const segunda = await decidir({ decision: 'descartar', operacionId: primera.pendiente });
    expect(tipos(segunda.turnos)).toEqual(['texto']);
    expect(segunda.episodioCerrado).toBe(true);
  });

  it('una frase con una sola cosa no muestra lista', async () => {
    const r = await enviar('recuérdame pagar el recibo');
    expect(tipos(r.turnos)).toEqual(['persona', 'propuesta']);
  });

  describe('agente.bloque-es-compromiso', () => {
    it('una tarea con hora de inicio se propone como compromiso; sin día, se pregunta el día', async () => {
      const r = await enviar(FRASE);
      expect(de(r.turnos, 'pregunta').campo).toBe('fecha');
      const invocaciones = await prisma.invocacionHerramienta.findMany({ orderBy: { ocurridaEn: 'asc' } });
      expect(invocaciones.map((i) => i.herramienta)).toContain('agenda.registrar_evento');
    });
  });

  describe('asistente.limpiar-conversacion', () => {
    it('oculta lo cerrado antes, deja el episodio abierto con su tarjeta y el asistente sigue recordando', async () => {
      const r = await enviar('recuérdame pagar el recibo');
      await decidir({ decision: 'confirmar', operacionId: r.pendiente });
      expect((await conversacion()).episodios).toHaveLength(1);

      const abierta = await enviar('agenda dentista el viernes a las 4 y recuérdame pagar el recibo');
      await http().post('/asistente/conversacion/limpiar').set('Authorization', autorizacion).expect(204);

      const despues = await conversacion();
      expect(despues.episodios.map((e) => e.id)).toEqual([abierta.episodioId]);
      // Del episodio abierto solo queda la tarjeta sin decidir
      expect(tipos(despues.episodios[0]!.turnos)).toEqual(['propuesta']);
      expect(despues.pendiente).toBe(abierta.pendiente);
      expect(await prisma.turnoTranscripcion.count({ where: { conversacionId: r.episodioId } })).toBeGreaterThan(0);
      expect(await prisma.eventoAuditoria.count({ where: { accion: 'conversacion.limpiada' } })).toBe(1);

      await decidir({ decision: 'descartar', operacionId: abierta.pendiente });
      const siguiente = await decidir({ decision: 'descartar', operacionId: (await conversacion()).pendiente });
      expect(siguiente.episodioCerrado).toBe(true);
      // La nota de continuidad no cambia: «¿qué hicimos?» sigue nombrando la tarea de antes de limpiar
      const hicimos = await enviar('¿qué hicimos?');
      expect(de(hicimos.turnos, 'texto').texto).toContain('pagar el recibo');
    });

    it('sin sesión, 401', async () => {
      await http().post('/asistente/conversacion/limpiar').expect(401);
    });
  });
});
