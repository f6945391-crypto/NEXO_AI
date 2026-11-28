import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IngresoRespuesta, RespuestaAsistente, TareaPersonal, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado, type ReglaGuion } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-143 · REQ-AGT-07 · decisión 31 de 07-agente · H-TP-09. Con una propuesta sin decidir, lo que la persona escribe
// después se interpreta contra ella: corregirla la descarta y propone otra; un horario para una tarea se explica
// con un texto fijo y se ofrece como compromiso. El simulado lee el id de la propuesta abierta de la nota
// ({nota:propuestaId}); sin esa marca no sabría a qué referirse, como pasó con Groq (captura 06).

const CONTRASENA = 'una-contrasena-de-prueba';
const OTRO_ID = '0b6e7d1c-3a52-4c1f-9a7e-2f0c5d9e8b11';
const GUION: ReglaGuion[] = [
  {
    si: '^quiero que agendes una tarea para el (jueves) llamada (.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '$2', fecha: '{$1}' } }] }, { texto: '' }],
  },
  {
    si: '^mejor el (viernes|jueves)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_cambiar', argumentos: { tareaId: '{nota:propuestaId}', fecha: '{$1}' } }] }, { texto: '' }],
  },
  {
    si: '^será ese día de 3 pm a 6 pm$',
    pasos: [{ llamadas: [{ nombre: 'tareas_cambiar', argumentos: { tareaId: '{nota:propuestaId}', horaInicio: '15:00', horaFin: '18:00' } }] }, { texto: '' }],
  },
  // Lo que hizo Groq: pasar un id que no es el de ninguna tarea. Igual se refiere a la propuesta abierta
  {
    si: '^de 3 a 6$',
    pasos: [{ llamadas: [{ nombre: 'tareas_cambiar', argumentos: { tareaId: OTRO_ID, horaInicio: '15:00', horaFin: '18:00' } }] }, { texto: '' }],
  },
  {
    si: '^agéndame dentista el viernes a las 4$',
    pasos: [{ llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: 'Dentista', fecha: '{viernes}', horaInicio: '16:00' } }] }, { texto: '' }],
  },
  {
    si: '^el dentista mejor el jueves$',
    pasos: [{ llamadas: [{ nombre: 'agenda_modificar_evento', argumentos: { eventoId: '{nota:propuestaId}', fecha: '{jueves}' } }] }, { texto: '' }],
  },
  { si: '^hola$', pasos: [{ texto: 'Hola, ¿qué hacemos?' }] },
];
const simulado = new ModeloSimulado(GUION);
const calendario = new ProveedorCalendarioSimulado();

const tipos = (turnos: TurnoAsistente[]) => turnos.map((t) => t.tipo);
const propuesta = (turnos: TurnoAsistente[]) => turnos.find((t) => t.tipo === 'propuesta') as Extract<TurnoAsistente, { tipo: 'propuesta' }>;
const texto = (turnos: TurnoAsistente[]) => (turnos.find((t) => t.tipo === 'texto') as { texto: string } | undefined)?.texto;
const valor = (turnos: TurnoAsistente[], etiqueta: string) => propuesta(turnos).operacion.vistaConfirmacion.datos.find((d) => d.etiqueta === etiqueta)?.valor;

describe('agente.sigue-a-la-propuesta', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let autorizacion: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const enviar = async (t: string) => RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto: t }).expect(200)).body);
  const decidir = async (cuerpo: object) => RespuestaAsistente.parse((await http().post('/asistente/decisiones').set('Authorization', autorizacion).send(cuerpo).expect(200)).body);
  const estado = async (id: string | null) => (await prisma.operacion.findUniqueOrThrow({ where: { id: id! } })).estado;

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
    simulado.peticiones.length = 0;
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `sigue${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima');
    await prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
    autorizacion = `Bearer ${IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body).tokenAcceso}`;
  });

  it('«mejor el viernes» sobre la tarjeta de una tarea la descarta y propone otra para el viernes', async () => {
    const primera = await enviar('quiero que agendes una tarea para el jueves llamada exposición sei');
    expect(propuesta(primera.turnos).operacion.vistaConfirmacion.accion).toBe('Nueva tarea');
    expect(valor(primera.turnos, 'Cuándo')).toMatch(/^Para el jueves \d+ de \p{Ll}+$/u);

    const segunda = await enviar('mejor el viernes');
    expect(tipos(segunda.turnos)).toEqual(['persona', 'propuesta']);
    expect(propuesta(segunda.turnos).operacion.vistaConfirmacion.accion).toBe('Nueva tarea');
    expect(valor(segunda.turnos, 'Tarea')).toBe('exposición sei');
    expect(valor(segunda.turnos, 'Cuándo')).toMatch(/^Para el viernes \d+ de \p{Ll}+$/u);
    expect(segunda.pendiente).not.toBe(primera.pendiente);
    expect(await estado(primera.pendiente)).toBe('descartada');
    expect(segunda.episodioId).toBe(primera.episodioId);
    // El modelo leyó la propuesta abierta como datos, con su id
    const nota = simulado.peticiones.at(-1)!.nota ?? '';
    expect(nota).toContain('Propuesta abierta');
    expect(nota).toContain(`propuestaId ${primera.pendiente}`);

    // Confirmar la nueva deja una sola tarea, la del viernes
    await decidir({ operacionId: segunda.pendiente, decision: 'confirmar' });
    const tareas = await prisma.tareaPersonal.findMany();
    expect(tareas).toHaveLength(1);
    expect(new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long' }).format(tareas[0]!.fecha!)).toBe('viernes');
  });

  it('«será ese día de 3 pm a 6 pm» no dice «No existe esa tarea»: explica que una tarea no lleva horario y ofrece el compromiso; «sí» lo propone', async () => {
    const primera = await enviar('quiero que agendes una tarea para el jueves llamada exposición sei');
    const jueves = valor(primera.turnos, 'Cuándo')!.replace(/^Para el /, '');

    const r = await enviar('será ese día de 3 pm a 6 pm');
    expect(tipos(r.turnos)).toEqual(['persona', 'texto']);
    expect(texto(r.turnos)).toBe(
      `Una tarea lleva fecha, pero no horario. ¿Quieres que «exposición sei» quede como compromiso en tu calendario el ${jueves}, de 15:00 a 18:00? ` +
        `Si me dices que sí, te muestro su tarjeta; si no, la tarea queda para el ${jueves}, sin horario.`,
    );
    expect(JSON.stringify(r.turnos)).not.toContain('No existe esa tarea');
    // La tarjeta de la tarea sigue esperando su decisión
    expect(r.pendiente).toBe(primera.pendiente);
    expect(await estado(primera.pendiente)).toBe('propuesta');

    const llamadasAntes = simulado.peticiones.length;
    const si = await enviar('Sí');
    // El compromiso lo propone el código, sin pasar por el modelo
    expect(simulado.peticiones).toHaveLength(llamadasAntes);
    expect(tipos(si.turnos)).toEqual(['persona', 'propuesta']);
    const vista = propuesta(si.turnos).operacion.vistaConfirmacion;
    expect(propuesta(si.turnos).operacion.tipo).toBe('agenda.registrar');
    expect(JSON.stringify(vista)).toContain('Exposición sei');
    expect(JSON.stringify(vista)).toContain('15:00 – 18:00');
    expect(await estado(primera.pendiente)).toBe('descartada');
    // Con la frase que lo motivó, no con el «sí»
    expect((await prisma.operacion.findUniqueOrThrow({ where: { id: si.pendiente! } })).solicitudOriginal).toBe('será ese día de 3 pm a 6 pm');

    await decidir({ operacionId: si.pendiente, decision: 'confirmar' });
    expect(calendario.llamadas.escrituras).toBe(1);
    expect(await prisma.tareaPersonal.count()).toBe(0);
  });

  it('con «no», la tarea sigue solo con su fecha y su tarjeta sigue abierta', async () => {
    const primera = await enviar('quiero que agendes una tarea para el jueves llamada exposición sei');
    const jueves = valor(primera.turnos, 'Cuándo')!.replace(/^Para el /, '');
    await enviar('será ese día de 3 pm a 6 pm');

    const no = await enviar('no');
    expect(tipos(no.turnos)).toEqual(['persona', 'texto']);
    expect(texto(no.turnos)).toBe(`De acuerdo: la tarea queda para el ${jueves}, sin horario. Puedes confirmarla en su tarjeta.`);
    expect(no.pendiente).toBe(primera.pendiente);

    const hecha = await decidir({ operacionId: primera.pendiente, decision: 'confirmar' });
    expect((hecha.turnos[0] as { texto: string }).texto).toBe(`Listo: «exposición sei» quedó en tus tareas para el ${jueves}.`);
    const tarea = TareaPersonal.parse((await prisma.operacion.findUniqueOrThrow({ where: { id: primera.pendiente! } })).resultado);
    expect(tarea).toMatchObject({ horaLimite: null, franja: 'con_fecha' });
    expect(calendario.llamadas.escrituras).toBe(0);
  });

  it('un id que no es de ninguna tarea se lee como la propuesta abierta, no como una tarea que no existe', async () => {
    const primera = await enviar('quiero que agendes una tarea para el jueves llamada exposición sei');
    const r = await enviar('de 3 a 6');
    expect(texto(r.turnos)).toMatch(/^Una tarea lleva fecha, pero no horario\. ¿Quieres que «exposición sei» quede como compromiso/);
    expect(r.pendiente).toBe(primera.pendiente);
  });

  it('sobre la tarjeta de un compromiso, «mejor el jueves» propone otro el jueves a la misma hora y descarta el anterior', async () => {
    const primera = await enviar('Agéndame dentista el viernes a las 4');
    expect(propuesta(primera.turnos).operacion.tipo).toBe('agenda.registrar');
    const segunda = await enviar('el dentista mejor el jueves');
    expect(tipos(segunda.turnos)).toEqual(['persona', 'propuesta']);
    expect(propuesta(segunda.turnos).operacion.tipo).toBe('agenda.registrar');
    expect(await estado(primera.pendiente)).toBe('descartada');
    const carga = (await prisma.operacion.findUniqueOrThrow({ where: { id: segunda.pendiente! } })).carga as { titulo: string; inicio: string; fin: string };
    expect(carga.titulo).toBe('Dentista');
    expect(new Intl.DateTimeFormat('es', { timeZone: 'America/Lima', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(carga.inicio))).toBe('jueves, 16:00');
    // Sin hora de fin nueva, la misma duración: una hora
    expect(Date.parse(carga.fin) - Date.parse(carga.inicio)).toBe(3600_000);
  });

  it('algo que no tiene que ver con la propuesta la descarta, como antes (REQ-AGT-01)', async () => {
    const primera = await enviar('quiero que agendes una tarea para el jueves llamada exposición sei');
    const r = await enviar('hola');
    expect(texto(r.turnos)).toBe('Hola, ¿qué hacemos?');
    expect(r.pendiente).toBeNull();
    expect(await estado(primera.pendiente)).toBe('descartada');
  });
});
