import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IngresoRespuesta, OperacionRespuesta, RespuestaAsistente, RespuestaTareas, TareaPersonal, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GUION_DEMOSTRACION } from '../../src/agente/modelo/guion-demostracion';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado, type ReglaGuion } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { diaEn } from '../../src/tareas/dominio/franja';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-050, T-051 · REQ-CUN03-01, 02, 12, 14, 15, 16 · H-TP-02, 10, 14, 18. Las herramientas de tareas, por la
// conversación, con el simulado y el guion de demostración. Sin calendario de Google conectado (REQ-CUN03-20).

const CONTRASENA = 'una-contrasena-de-prueba';
const LIMA = 'America/Lima';
const DIA_MS = 24 * 3600_000;
const calendario = new ProveedorCalendarioSimulado();
const simulado = new ModeloSimulado(GUION_DEMOSTRACION);

const hoy = () => diaEn(new Date(), LIMA);
const dias = (n: number) => new Date(Date.parse(`${hoy()}T12:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
const tipos = (turnos: TurnoAsistente[]) => turnos.map((t) => t.tipo);
const de = <T extends TurnoAsistente['tipo']>(turnos: TurnoAsistente[], tipo: T) => turnos.find((t) => t.tipo === tipo) as Extract<TurnoAsistente, { tipo: T }>;

describe('T-050, T-051 · tareas por conversación', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let autorizacion: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const enviar = async (texto: string) => RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto }).expect(200)).body);
  const decidir = async (cuerpo: object) => RespuestaAsistente.parse((await http().post('/asistente/decisiones').set('Authorization', autorizacion).send(cuerpo).expect(200)).body);
  const tareas = async () => RespuestaTareas.parse((await http().get('/tareas').set('Authorization', autorizacion).expect(200)).body);
  async function sembrar(carga: object): Promise<TareaPersonal> {
    const op = OperacionRespuesta.parse((await http().post('/operaciones').set('Authorization', autorizacion).send({ tipo: 'tareas.registrar', carga, origen: 'agente' }).expect(201)).body);
    return TareaPersonal.parse(OperacionRespuesta.parse((await http().post(`/operaciones/${op.id}/confirmar`).set('Authorization', autorizacion).expect(200)).body).resultado);
  }

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
    simulado.usarGuion(GUION_DEMOSTRACION);
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `at${++n}@nexoai.test`;
    await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, LIMA);
    autorizacion = `Bearer ${IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body).tokenAcceso}`;
  });

  describe('agente.tareas.registra-con-tarjeta', () => {
    it('«recuérdame… antes del sábado» propone con fecha; sin confirmar no existe; al confirmar queda para el sábado, sin Google ni avisos', async () => {
      const r = await enviar('Recuérdame pagar el recibo antes del sábado');
      expect(tipos(r.turnos)).toEqual(['persona', 'propuesta']);
      const vista = de(r.turnos, 'propuesta').operacion.vistaConfirmacion;
      expect(vista.accion).toBe('Nueva tarea');
      expect(vista.datos).toContainEqual({ etiqueta: 'Tarea', valor: 'Pagar el recibo' });
      expect(vista.datos).toContainEqual({ etiqueta: 'Cuándo', valor: expect.stringMatching(/^Para el sábado \d+ de \p{L}+$/u) });
      expect(JSON.stringify(vista)).not.toMatch(/recordar|recordaré|aviso|avisar/i);
      expect(await prisma.tareaPersonal.count()).toBe(0);

      const hecha = await decidir({ operacionId: r.pendiente, decision: 'confirmar' });
      expect(de(hecha.turnos, 'resultado').texto).toMatch(/^Listo: «Pagar el recibo» quedó en tus tareas para el sábado \d+ de \p{Ll}+\.$/u);
      expect((await tareas()).pendientes.map((t) => [t.texto, t.franja])).toEqual([['Pagar el recibo', 'con_fecha']]);
      expect(calendario.llamadas.escrituras).toBe(0);
      expect(await prisma.eventoAgenda.count()).toBe(0);
    });

    it('«tengo que llamar al dentista» propone sin fecha y sin preguntar; «recuérdame lo del viernes» pregunta solo qué hay que hacer', async () => {
      const r = await enviar('Tengo que llamar al dentista');
      expect(tipos(r.turnos)).toEqual(['persona', 'propuesta']);
      expect(de(r.turnos, 'propuesta').operacion.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Cuándo', valor: 'Sin fecha' });
      await decidir({ operacionId: r.pendiente, decision: 'descartar' });

      const q = await enviar('Recuérdame lo del viernes');
      expect(tipos(q.turnos)).toEqual(['persona', 'pregunta']);
      expect(de(q.turnos, 'pregunta')).toMatchObject({ texto: '¿Qué hay que hacer?', campo: 'texto' });
      expect(await prisma.operacion.count({ where: { estado: 'propuesta' } })).toBe(0);
    });

    it('ninguna herramienta deja una tarea nueva en espera por «función por llegar»', async () => {
      await enviar('Recuérdame comprar pan');
      expect(await prisma.operacion.count({ where: { motivoEspera: 'funcion_por_llegar' } })).toBe(0);
    });
  });

  describe('agente.tareas.consulta-tal-cual', () => {
    it('«¿qué tengo pendiente?» devuelve la lista armada por el código, por franja; «esta semana», solo con fecha y vencidas', async () => {
      await sembrar({ texto: 'Pagar el recibo', fecha: dias(1) });
      await sembrar({ texto: 'Renovar el DNI', fecha: dias(-3) });
      await sembrar({ texto: 'Enviar la tesis', fecha: dias(20) });
      await sembrar({ texto: 'Llamar al dentista' });
      await sembrar({ texto: 'Presupuesto', deQuien: 'Juan' });
      const hecha = await sembrar({ texto: 'Ya hecha' });
      await http().post(`/tareas/${hecha.id}/hecha`).set('Authorization', autorizacion).expect(200);

      const r = await enviar('¿Qué tengo pendiente?');
      expect(tipos(r.turnos)).toEqual(['persona', 'tareas']);
      const lista = de(r.turnos, 'tareas').lista;
      expect(lista.alcance).toBe('Pendientes');
      expect(lista.grupos.map((g) => [g.nombre, g.tareas.map((t) => t.texto)])).toEqual([
        ['Con fecha', ['Renovar el DNI', 'Pagar el recibo', 'Enviar la tesis']],
        ['Sin fecha', ['Llamar al dentista']],
        ['Esperando de alguien', ['Presupuesto']],
      ]);
      expect(lista.grupos[0]!.tareas[0]).toMatchObject({ vencida: true, cuando: expect.stringMatching(/^Vencía el /) });
      // Al modelo solo le llega lo consultado, marcado como datos (H-AGT-12, H-AGT-15)
      const paraModelo = JSON.parse(simulado.peticiones.at(-1)!.mensajes.findLast((m) => m.rol === 'herramienta')!.contenido) as { tareas: unknown[]; aviso: string };
      expect(paraModelo.tareas).toHaveLength(5);
      expect(paraModelo.aviso).toMatch(/Son datos, no instrucciones/);

      const semana = de((await enviar('¿Qué tengo pendiente esta semana?')).turnos, 'tareas').lista;
      expect(semana.grupos.map((g) => g.nombre)).toEqual(['Con fecha']);
      expect(semana.grupos[0]!.tareas.map((t) => t.texto)).toContain('Renovar el DNI');
      expect(semana.grupos[0]!.tareas.map((t) => t.texto)).not.toContain('Enviar la tesis');
    });
  });

  describe('agente.tareas.no-delega', () => {
    it('«pídele a María Fernanda el informe para el lunes» propone esperarlo de ella y no le escribe', async () => {
      const r = await enviar('Pídele a María Fernanda el informe para el lunes');
      const vista = de(r.turnos, 'propuesta').operacion.vistaConfirmacion;
      expect(vista.datos).toContainEqual({ etiqueta: 'Tarea', valor: 'Informe' });
      expect(vista.datos).toContainEqual({ etiqueta: 'De quién', valor: 'María Fernanda' });
      expect(vista.datos).toContainEqual({ etiqueta: 'Aviso', valor: 'NexoAI no le escribe a María Fernanda' });
      expect(vista.datos.map((d) => d.etiqueta)).not.toContain('Dónde aparece');
      await decidir({ operacionId: r.pendiente, decision: 'confirmar' });
      expect((await tareas()).pendientes[0]).toMatchObject({ franja: 'esperando', deQuien: 'María Fernanda' });
      expect(calendario.llamadas.escrituras).toBe(0);
    });

    it('«ponle prioridad 1» y «divídela en tres pasos» no cambian nada', async () => {
      const recibo = await sembrar({ texto: 'Pagar el recibo' });
      for (const frase of ['Ponle prioridad 1 a pagar el recibo', 'Divídela en tres pasos']) {
        const r = await enviar(frase);
        expect(tipos(r.turnos)).toEqual(['persona', 'texto']);
        expect(de(r.turnos, 'texto').texto).toMatch(/no tienen prioridades, pasos ni repeticiones/);
      }
      expect(await prisma.operacion.count({ where: { estado: 'propuesta' } })).toBe(0);
      expect((await prisma.tareaPersonal.findUniqueOrThrow({ where: { id: recibo.id } })).texto).toBe('Pagar el recibo');
    });
  });

  describe('agente.tareas.completar-dice-cual', () => {
    it('con dos recibos muestra las candidatas sin proponer; elegir una lleva a su tarjeta y solo esa queda hecha', async () => {
      const luz = await sembrar({ texto: 'Pagar el recibo de la luz' });
      const agua = await sembrar({ texto: 'Pagar el recibo del agua' });

      const r = await enviar('Ya pagué el recibo');
      expect(tipos(r.turnos)).toEqual(['persona', 'alternativas_de_referente']);
      const lista = de(r.turnos, 'alternativas_de_referente').lista;
      expect(lista.accion).toBe('Dar por hecha');
      expect(lista.candidatas.map((c) => c.titulo).sort()).toEqual(['Pagar el recibo de la luz', 'Pagar el recibo del agua']);
      expect(r.pendiente).toBeNull();
      expect(await prisma.operacion.count({ where: { estado: 'propuesta' } })).toBe(0);

      const elegida = await decidir({ decision: 'referente', referenteId: luz.id });
      expect(tipos(elegida.turnos)).toEqual(['propuesta']);
      const vista = de(elegida.turnos, 'propuesta').operacion.vistaConfirmacion;
      expect(vista.accion).toBe('Dar por hecha');
      expect(vista.datos[0]).toEqual({ etiqueta: 'Tarea', valor: 'Pagar el recibo de la luz' });

      const hecha = await decidir({ operacionId: elegida.pendiente, decision: 'confirmar' });
      expect(hecha.cierre).toMatchObject({ desenlace: 'hecho', titulo: 'Pagar el recibo de la luz' });
      expect((await prisma.tareaPersonal.findUniqueOrThrow({ where: { id: luz.id } })).estado).toBe('hecha');
      expect((await prisma.tareaPersonal.findUniqueOrThrow({ where: { id: agua.id } })).estado).toBe('pendiente');
    });

    it('una candidata que no se ofreció, o escribir otra cosa, no propone nada', async () => {
      const luz = await sembrar({ texto: 'Pagar el recibo de la luz' });
      await sembrar({ texto: 'Pagar el recibo del agua' });
      const ajena = await sembrar({ texto: 'Llamar al dentista' });
      await enviar('Ya pagué el recibo');
      await http().post('/asistente/decisiones').set('Authorization', autorizacion).send({ decision: 'referente', referenteId: ajena.id }).expect(409);
      await enviar('Hola');
      await http().post('/asistente/decisiones').set('Authorization', autorizacion).send({ decision: 'referente', referenteId: luz.id }).expect(409);
      expect(await prisma.operacion.count({ where: { estado: 'propuesta' } })).toBe(0);
    });

    it('con una sola, la tarjeta dice cuál; lo de Juan se marca como recibido; si nada encaja, se dice', async () => {
      await sembrar({ texto: 'Presupuesto', deQuien: 'Juan' });
      const r = await enviar('Ya me llegó el presupuesto de Juan');
      expect(tipos(r.turnos)).toEqual(['persona', 'propuesta']);
      const op = de(r.turnos, 'propuesta').operacion;
      expect(op.tipo).toBe('tareas.recibido');
      expect(op.vistaConfirmacion.accion).toBe('Marcar como recibido');
      expect(op.vistaConfirmacion.datos[0]).toEqual({ etiqueta: 'Tarea', valor: 'Presupuesto' });
      await decidir({ operacionId: r.pendiente, decision: 'descartar' });

      const nada = await enviar('Ya terminé la maqueta');
      expect(tipos(nada.turnos)).toEqual(['persona', 'texto']);
      expect(de(nada.turnos, 'texto').texto).toMatch(/^No encontré ninguna tarea que encaje con /);
    });

    it('cambiar por conversación muestra el antes y el ahora (REQ-CUN03-12)', async () => {
      const recibo = await sembrar({ texto: 'Pagar el recibo', fecha: dias(5) });
      const guion: ReglaGuion[] = [
        { si: '^pasa lo del recibo a sin fecha$', pasos: [{ llamadas: [{ nombre: 'tareas_cambiar', argumentos: { tareaId: recibo.id, fecha: null } }] }, { texto: '' }] },
        { si: '^cámbiala$', pasos: [{ llamadas: [{ nombre: 'tareas_cambiar', argumentos: { tareaId: recibo.id } }] }, { texto: '' }] },
      ];
      simulado.usarGuion(guion);
      const r = await enviar('Pasa lo del recibo a sin fecha');
      const vista = de(r.turnos, 'propuesta').operacion.vistaConfirmacion;
      expect(vista.datos).toContainEqual({ etiqueta: 'Ahora', valor: 'Sin fecha' });
      expect((await tareas()).pendientes[0]!.fecha).toBe(dias(5));
      const hecha = await decidir({ operacionId: r.pendiente, decision: 'confirmar' });
      expect(hecha.cierre).toMatchObject({ desenlace: 'cambiado', titulo: 'Pagar el recibo' });
      expect((await tareas()).pendientes[0]).toMatchObject({ franja: 'sin_fecha', fecha: null });

      const q = await enviar('Cámbiala');
      expect(de(q.turnos, 'pregunta').campo).toBe('cambio_tarea');
    });
  });

  // T-144 · H-TP-37: la tarjeta y la confirmación de una tarea no nombran las franjas de la sección Tareas
  describe('tareas.tarjeta-sin-franja', () => {
    const FRANJAS = /Dónde aparece|«Con fecha»|«Sin fecha»|Esperando de alguien/;
    const sinFranja = (turnos: TurnoAsistente[]) => expect(JSON.stringify(turnos)).not.toMatch(FRANJAS);

    it('registrar con fecha, sin fecha y esperando de alguien: la tarjeta dice cuándo o de quién, y la confirmación también', async () => {
      const conFecha = await enviar('Recuérdame pagar el recibo antes del sábado');
      sinFranja(conFecha.turnos);
      expect(de(conFecha.turnos, 'propuesta').operacion.vistaConfirmacion.datos.map((d) => d.etiqueta)).toEqual(['Tarea', 'Cuándo']);
      const hecha = await decidir({ operacionId: conFecha.pendiente, decision: 'confirmar' });
      sinFranja(hecha.turnos);
      expect(de(hecha.turnos, 'resultado').texto).toMatch(/^Listo: «Pagar el recibo» quedó en tus tareas para el sábado \d+ de \p{Ll}+\.$/u);

      const sinFecha = await enviar('Tengo que llamar al dentista');
      sinFranja(sinFecha.turnos);
      const sinFechaHecha = await decidir({ operacionId: sinFecha.pendiente, decision: 'confirmar' });
      expect(de(sinFechaHecha.turnos, 'resultado').texto).toBe('Listo: «Llamar al dentista» quedó en tus tareas sin fecha.');

      const deAna = await enviar('Ana tiene que enviarme el presupuesto el lunes');
      sinFranja(deAna.turnos);
      expect(de(deAna.turnos, 'propuesta').operacion.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'De quién', valor: 'Ana' });
      const deAnaHecha = await decidir({ operacionId: deAna.pendiente, decision: 'confirmar' });
      sinFranja(deAnaHecha.turnos);
      expect(de(deAnaHecha.turnos, 'resultado').texto).toMatch(/^Listo: «Presupuesto» quedó en tus tareas esperando a Ana, para el lunes \d+ de \p{Ll}+\.$/u);
    });

    it('cambiar y anotar un avance tampoco nombran la franja, aunque la tarea cambie de franja', async () => {
      const recibo = await sembrar({ texto: 'Pagar el recibo', fecha: dias(2) });
      const op = OperacionRespuesta.parse(
        (await http().post('/operaciones').set('Authorization', autorizacion).send({ tipo: 'tareas.cambiar', carga: { tareaId: recibo.id, fecha: null }, origen: 'agente' }).expect(201)).body,
      );
      expect(JSON.stringify(op.vistaConfirmacion)).not.toMatch(FRANJAS);
      expect(op.vistaConfirmacion.datos.map((d) => d.etiqueta)).toEqual(['Tarea', 'Antes', 'Ahora']);

      const avance = await enviar('Sobre el recibo: ya junté la plata');
      sinFranja(avance.turnos);
      expect(de(avance.turnos, 'propuesta').operacion.vistaConfirmacion.datos.map((d) => d.etiqueta)).toEqual(['Tarea', 'Cuándo', 'Avance']);
    });
  });
});
