import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Actividad, ErrorApi, EventoAgenda, IngresoRespuesta, OperacionRespuesta, type Rol } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { periodoDe } from '../../src/actividad/periodo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-081 · REQ-CUN02-25 a 29, 34, 35 · specs/02-jornada/plan.md §8. Solo lectura: lo que se ejecuta aquí lo
// ejecuta la propia API por sus Operaciones, como lo haría la persona.

const CONTRASENA = 'una-contrasena-de-prueba';
const calendario = new ProveedorCalendarioSimulado();
const HORA = 3600_000;

// Una zona en la que ahora es de día (entre las 05:00 y las 19:59): así «hace dos horas» y «dentro de dos
// horas» caen hoy, sea cual sea la hora a la que corre la prueba. Los desfases están a menos de seis horas.
function zonaDeDia(): string {
  const zonas = ['Pacific/Kiritimati', 'Asia/Tokyo', 'Asia/Kolkata', 'Europe/Madrid', 'America/Lima', 'Pacific/Honolulu'];
  const hora = (zona: string) => Number(new Intl.DateTimeFormat('en-US', { timeZone: zona, hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const zona = zonas.find((z) => hora(z) >= 5 && hora(z) <= 19);
  if (!zona) throw new Error('Ninguna zona de la lista está de día');
  return zona;
}

describe('T-081 · consulta de Actividad', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;
  const ZONA = zonaDeDia();

  const http = () => request(app.getHttpServer());

  async function persona({ conCalendario = true, rol = 'usuario_personal' as Rol } = {}) {
    const correo = `act${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan: rol === 'usuario_personal' ? 'personal' : 'empresarial' }, CONTRASENA, ZONA);
    if (conCalendario) {
      await prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
    }
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  const consultar = async (autorizacion: string, consulta: Record<string, string> = {}) =>
    Actividad.parse((await http().get('/actividad').query(consulta).set('Authorization', autorizacion).expect(200)).body);

  async function proponer(autorizacion: string, tipo: string, carga: unknown, origen: 'agente' | 'control_directo') {
    const r = await http().post('/operaciones').set('Authorization', autorizacion).send({ tipo, carga, origen }).expect(201);
    return OperacionRespuesta.parse(r.body);
  }
  const confirmar = async (autorizacion: string, id: string) =>
    OperacionRespuesta.parse((await http().post(`/operaciones/${id}/confirmar`).set('Authorization', autorizacion).expect(200)).body);

  async function eventoPorTitulo(autorizacion: string, titulo: string) {
    const r = await http()
      .get('/agenda/eventos')
      .query({ desde: new Date(Date.now() - 3 * 24 * HORA).toISOString(), hasta: new Date(Date.now() + 3 * 24 * HORA).toISOString() })
      .set('Authorization', autorizacion)
      .expect(200);
    const evento = EventoAgenda.array().parse(r.body).find((e) => e.titulo === titulo);
    if (!evento) throw new Error(`No está «${titulo}»`);
    return evento;
  }

  const haceHoras = (h: number) => new Date(Date.now() - h * HORA);

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

  describe('actividad.compromisos-ocurridos', () => {
    it('Día de hoy: solo los terminados, sin cancelados, en curso ni futuros, con su duración', async () => {
      const ana = await persona();
      calendario.sembrar(ana.perfilId, { titulo: 'Revisión de sprint', inicio: haceHoras(3), fin: haceHoras(2), zonaHoraria: ZONA });
      calendario.sembrar(ana.perfilId, { titulo: 'Café corto', inicio: haceHoras(1.75), fin: haceHoras(1.5), zonaHoraria: ZONA });
      calendario.sembrar(ana.perfilId, { titulo: 'Comité', inicio: haceHoras(2.5), fin: haceHoras(1.25), zonaHoraria: ZONA });
      calendario.sembrar(ana.perfilId, { titulo: 'En curso', inicio: haceHoras(0.5), fin: haceHoras(-0.5), zonaHoraria: ZONA });
      calendario.sembrar(ana.perfilId, { titulo: 'Más tarde', inicio: haceHoras(-1), fin: haceHoras(-2), zonaHoraria: ZONA });
      // Uno cancelado: el control directo de Hoy en la agenda (DP-01)
      const comite = await eventoPorTitulo(ana.autorizacion, 'Comité');
      await confirmar(ana.autorizacion, (await proponer(ana.autorizacion, 'agenda.cancelar', { eventoId: comite.id }, 'control_directo')).id);

      const hoy = await consultar(ana.autorizacion);
      expect(hoy).toMatchObject({ nivel: 'dia', esActual: true, hastaAhora: true, siguiente: null, calendario: 'conectado', zonaHoraria: ZONA });
      expect(hoy.fecha).toBe(hoy.hoy);
      expect(hoy.compromisos.map((c) => [c.titulo, c.duracionMinutos, c.dia])).toEqual([
        ['Revisión de sprint', 60, hoy.hoy],
        ['Café corto', 15, hoy.hoy],
      ]);
    });

    it('un día pasado muestra lo de ese día, el de todo el día también, y permite volver al siguiente', async () => {
      const ana = await persona();
      const ayer = periodoDe('dia', undefined, ZONA, new Date(Date.now() - 24 * HORA));
      calendario.sembrar(ana.perfilId, { titulo: 'Aniversario', inicio: ayer.desde, fin: ayer.hasta, zonaHoraria: ZONA, todoElDia: true });
      calendario.sembrar(ana.perfilId, { titulo: 'Taller', inicio: haceHoras(25), fin: haceHoras(23.5), zonaHoraria: ZONA });

      const r = await consultar(ana.autorizacion, { nivel: 'dia', fecha: ayer.fecha });
      expect(r).toMatchObject({ fecha: ayer.fecha, esActual: false, hastaAhora: false });
      expect(r.siguiente).toBe(r.hoy);
      expect(r.compromisos.map((c) => [c.titulo, c.todoElDia])).toEqual([
        ['Aniversario', true],
        ['Taller', false],
      ]);
      expect(r.compromisos[1]!.duracionMinutos).toBe(90);
    });

    it('Semana y Mes traen lo terminado del período, cada uno en su día dentro del período', async () => {
      const ana = await persona();
      calendario.sembrar(ana.perfilId, { titulo: 'Hace un rato', inicio: haceHoras(3), fin: haceHoras(2), zonaHoraria: ZONA });
      calendario.sembrar(ana.perfilId, { titulo: 'Futuro', inicio: haceHoras(-30), fin: haceHoras(-31), zonaHoraria: ZONA });
      for (const nivel of ['semana', 'mes']) {
        const r = await consultar(ana.autorizacion, { nivel });
        expect(r.nivel).toBe(nivel);
        expect(r.primerDia <= r.hoy && r.hoy <= r.ultimoDia).toBe(true);
        expect(r.compromisos.map((c) => c.titulo)).toEqual(['Hace un rato']);
        expect(r.compromisos[0]!.dia).toBe(r.hoy);
      }
    });

    it('un compromiso que empezó antes del período se agrupa en su primer día (H-JOR-03)', async () => {
      const ana = await persona();
      const hoy = periodoDe('dia', undefined, ZONA, new Date());
      calendario.sembrar(ana.perfilId, { titulo: 'Guardia de noche', inicio: new Date(hoy.desde.getTime() - 2 * HORA), fin: new Date(hoy.desde.getTime() + HORA), zonaHoraria: ZONA });
      const r = await consultar(ana.autorizacion);
      expect(r.compromisos.map((c) => [c.titulo, c.dia, c.duracionMinutos])).toEqual([['Guardia de noche', hoy.fecha, 180]]);
    });

    it('rechaza un nivel o una fecha que no valen', async () => {
      const ana = await persona();
      for (const consulta of [{ nivel: 'anio' }, { fecha: '2026-02-30' }, { fecha: 'ayer' }, { nivel: 'dia', otro: '1' }]) {
        const r = await http().get('/actividad').query(consulta).set('Authorization', ana.autorizacion).expect(400);
        expect(ErrorApi.parse(r.body).codigo).toBe('SOLICITUD_INVALIDA');
      }
      await http().get('/actividad').expect(401);
    });
  });

  describe('actividad.registro-del-asistente', () => {
    it('solo lo ejecutado, por hora de ejecución, con qué se hizo, sus datos y desde dónde', async () => {
      const ana = await persona();
      calendario.sembrar(ana.perfilId, { titulo: 'Demo con el cliente', inicio: haceHoras(-3), fin: haceHoras(-4), zonaHoraria: ZONA });
      const manana = new Date(Date.now() + 26 * HORA);
      manana.setUTCMinutes(0, 0, 0);

      // En la conversación: registrar (solo lo propone el asistente, R-42)
      const registrar = await proponer(ana.autorizacion, 'agenda.registrar', { titulo: 'Dentista', inicio: manana.toISOString(), zonaHoraria: ZONA }, 'agente');
      await confirmar(ana.autorizacion, registrar.id);
      // Desde la pantalla: cancelar (DP-01)
      const demo = await eventoPorTitulo(ana.autorizacion, 'Demo con el cliente');
      await confirmar(ana.autorizacion, (await proponer(ana.autorizacion, 'agenda.cancelar', { eventoId: demo.id }, 'control_directo')).id);
      // Descartada, sin decidir y fallida: no entran
      const dentista = await eventoPorTitulo(ana.autorizacion, 'Dentista');
      const mover = await proponer(ana.autorizacion, 'agenda.modificar', { eventoId: dentista.id, titulo: 'Dentista (control)' }, 'agente');
      await http().post(`/operaciones/${mover.id}/descartar`).set('Authorization', ana.autorizacion).expect(200);
      await proponer(ana.autorizacion, 'agenda.modificar', { eventoId: dentista.id, titulo: 'Sin decidir' }, 'agente');
      const fallara = await proponer(ana.autorizacion, 'agenda.registrar', { titulo: 'No llegó', inicio: new Date(manana.getTime() + 3 * HORA).toISOString(), zonaHoraria: ZONA }, 'agente');
      calendario.caido = true;
      const fallida = await confirmar(ana.autorizacion, fallara.id);
      calendario.caido = false;
      expect(fallida.estado).toBe('fallida');
      // En espera: tampoco
      await prisma.operacion.create({
        data: {
          organizacionId,
          perfilId: ana.perfilId,
          tipo: 'asistente.en_espera',
          origen: 'agente',
          carga: {},
          vistaConfirmacion: { accion: 'Atender lo que pediste', datos: [], irreversible: null, confirmable: false, motivoNoConfirmable: 'El asistente no respondía.' },
          estado: 'en_espera',
          motivoEspera: 'asistente_no_disponible',
        },
      });

      const r = await consultar(ana.autorizacion);
      expect(r.registro.map((a) => [a.descripcion, a.origen])).toEqual([
        ['Registró un compromiso', 'agente'],
        ['Canceló un compromiso', 'control_directo'],
      ]);
      const [registro, cancelacion] = r.registro;
      expect(registro!.id).toBe(registrar.id);
      expect(registro!.datos).toContainEqual({ etiqueta: 'Título', valor: 'Dentista' });
      expect(registro!.dia).toBe(r.hoy);
      expect(Date.parse(registro!.ejecutadaEn)).toBeLessThanOrEqual(Date.parse(cancelacion!.ejecutadaEn));
      // La hora de ejecución, con el desfase de la zona del perfil (P-05)
      expect(registro!.ejecutadaEn).toMatch(/[+-]\d{2}:\d{2}$/);
      expect(Math.abs(Date.parse(registro!.ejecutadaEn) - Date.now())).toBeLessThan(5 * 60_000);
      // Ayer no hizo nada
      const ayer = await consultar(ana.autorizacion, { fecha: r.anterior });
      expect(ayer.registro).toEqual([]);
    });

    it('la acción de un tipo sin frase propia se nombra con el título de su tarjeta', async () => {
      const ana = await persona();
      await prisma.operacion.create({
        data: {
          organizacionId,
          perfilId: ana.perfilId,
          tipo: 'tareas.completar',
          origen: 'control_directo',
          carga: {},
          vistaConfirmacion: { accion: 'Marcar como hecha', datos: [{ etiqueta: 'Tarea', valor: 'Pagar la luz' }], irreversible: null, confirmable: true, motivoNoConfirmable: null },
          estado: 'ejecutada',
          ejecutadaEn: new Date(),
        },
      });
      const r = await consultar(ana.autorizacion);
      expect(r.registro.map((a) => [a.descripcion, a.datos])).toEqual([['Marcar como hecha', [{ etiqueta: 'Tarea', valor: 'Pagar la luz' }]]]);
    });
  });

  describe('actividad.sin-calendario', () => {
    it('sin el calendario conectado, trae el registro del asistente y lo dice, sin llamar a Google', async () => {
      const ana = await persona({ conCalendario: false });
      const otra = ZONA === 'America/Lima' ? 'Europe/Madrid' : 'America/Lima';
      await confirmar(ana.autorizacion, (await proponer(ana.autorizacion, 'perfil.cambiar_zona_horaria', { zonaHoraria: otra }, 'control_directo')).id);
      calendario.reiniciar();
      const r = await consultar(ana.autorizacion);
      expect(r).toMatchObject({ calendario: 'sin_conectar', compromisos: [], zonaHoraria: otra });
      expect(r.registro.map((a) => [a.descripcion, a.origen])).toEqual([['Cambió tu zona horaria', 'control_directo']]);
      expect(calendario.llamadas).toEqual({ lecturas: 0, escrituras: 0 });
    });

    it('si Google no responde y nunca se leyó, lo dice; si ya se leyó, muestra la última copia (H-JOR-10)', async () => {
      const ana = await persona();
      calendario.sembrar(ana.perfilId, { titulo: 'Revisión', inicio: haceHoras(3), fin: haceHoras(2), zonaHoraria: ZONA });
      calendario.caido = true;
      expect(await consultar(ana.autorizacion)).toMatchObject({ calendario: 'no_disponible', compromisos: [] });

      calendario.caido = false;
      expect((await consultar(ana.autorizacion)).compromisos.map((c) => c.titulo)).toEqual(['Revisión']);
      await prisma.sincronizacionCalendario.update({ where: { perfilId: ana.perfilId }, data: { ultimaSincronizacion: new Date(Date.now() - 10 * 60_000) } });
      calendario.caido = true;
      expect(await consultar(ana.autorizacion)).toMatchObject({ calendario: 'conectado', compromisos: [expect.objectContaining({ titulo: 'Revisión' })] });
    });
  });

  describe('actividad.solo-lo-propio', () => {
    it('cada persona ve solo sus compromisos y sus acciones; también el colaborador', async () => {
      const ana = await persona();
      const beto = await persona({ rol: 'colaborador' });
      calendario.sembrar(ana.perfilId, { titulo: 'De Ana', inicio: haceHoras(3), fin: haceHoras(2), zonaHoraria: ZONA });
      calendario.sembrar(ana.perfilId, { titulo: 'Otra de Ana', inicio: haceHoras(4), fin: haceHoras(3), zonaHoraria: ZONA });
      calendario.sembrar(beto.perfilId, { titulo: 'De Beto', inicio: haceHoras(3), fin: haceHoras(2), zonaHoraria: ZONA });
      const deAna = await eventoPorTitulo(ana.autorizacion, 'De Ana');
      await confirmar(ana.autorizacion, (await proponer(ana.autorizacion, 'agenda.cancelar', { eventoId: deAna.id }, 'control_directo')).id);

      const paraAna = await consultar(ana.autorizacion);
      const paraBeto = await consultar(beto.autorizacion);
      expect(paraAna.compromisos.map((c) => c.titulo)).toEqual(['Otra de Ana']);
      expect(paraAna.registro).toHaveLength(1);
      expect(paraBeto.compromisos.map((c) => c.titulo)).toEqual(['De Beto']);
      expect(paraBeto.registro).toEqual([]);
    });
  });

  describe('actividad.sin-proveedor-de-modelo', () => {
    it('Actividad se consulta sin ningún proveedor de modelo configurado (P-11)', async () => {
      for (const variable of Object.keys(process.env)) {
        if (/ANTHROPIC|OPENAI|MODELO|LLM|GROQ/i.test(variable)) delete process.env[variable];
      }
      const ana = await persona();
      calendario.sembrar(ana.perfilId, { titulo: 'Revisión', inicio: haceHoras(3), fin: haceHoras(2), zonaHoraria: ZONA });
      expect((await consultar(ana.autorizacion)).compromisos.map((c) => c.titulo)).toEqual(['Revisión']);
    });
  });
});
