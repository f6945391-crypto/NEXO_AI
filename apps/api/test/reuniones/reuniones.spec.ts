import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DetalleReunion, ErrorApi, IngresoRespuesta, ListaReuniones, OperacionRespuesta, RespuestaAsistente, type TurnoAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { instanteLocal, sumarDias, diaDeLaSemana, type FechaLocal } from '../../src/agenda/dominio/tiempo';
import { ProcesadorEnEspera } from '../../src/agente/en-espera';
import { GUION_DEMOSTRACION } from '../../src/agente/modelo/guion-demostracion';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { rangoPorDefecto } from '../../src/reuniones/dominio/mapa';
import { SincronizadorCalendario } from '../../src/agenda/sincronizador-calendario';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-132, T-133 · specs/10-reuniones · REQ-CUN06-01 a 21. «Reuniones Demo»: el líder convoca a Ana, Beto y Lucía,
// del equipo «Proyecto Alfa»; Ana también está en «Diseño». Lucía no autorizó ni conectó Google. Con el
// calendario y el modelo simulados. Los casos comparten los datos y van en orden.
const CONTRASENA = 'una-contrasena-de-prueba';
const LIMA = 'America/Lima';
const calendario = new ProveedorCalendarioSimulado();
const simulado = new ModeloSimulado(GUION_DEMOSTRACION);
type Clave = 'lider' | 'ana' | 'beto' | 'lucia' | 'pablo';

const de = <T extends TurnoAsistente['tipo']>(turnos: TurnoAsistente[], tipo: T) => turnos.find((t) => t.tipo === tipo) as Extract<TurnoAsistente, { tipo: T }> | undefined;
const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dias: FechaLocal[] = [];
{
  const r = rangoPorDefecto(new Date(), LIMA);
  for (let d = r.desde; dias.length < 5; d = sumarDias(d, 1)) if (diaDeLaSemana(d) % 6 !== 0) dias.push(d);
}
const D = (i: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return instanteLocal(dias[i]!, h! * 60 + m!, LIMA);
};

describe('reuniones', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  const p = {} as Record<Clave, { perfilId: string; autorizacion: string; correo: string }>;
  let reunionId: string;
  let googleEventoId: string;

  const http = () => request(app.getHttpServer());
  const enviar = async (quien: Clave, texto: string) =>
    RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', p[quien].autorizacion).send({ texto }).expect(200)).body);
  const decidir = async (quien: Clave, cuerpo: object) =>
    RespuestaAsistente.parse((await http().post('/asistente/decisiones').set('Authorization', p[quien].autorizacion).send(cuerpo).expect(200)).body);
  const reuniones = async (quien: Clave) => ListaReuniones.parse((await http().get('/reuniones').set('Authorization', p[quien].autorizacion).expect(200)).body);
  const detalle = async (quien: Clave, id: string, query: Record<string, string> = {}) =>
    DetalleReunion.parse((await http().get(`/reuniones/${id}`).query(query).set('Authorization', p[quien].autorizacion).expect(200)).body);
  const proponer = async (quien: Clave, tipo: string, carga: object) =>
    OperacionRespuesta.parse((await http().post('/operaciones').set('Authorization', p[quien].autorizacion).send({ tipo, carga, origen: 'control_directo' }).expect(201)).body);
  const confirmar = async (quien: Clave, id: string) =>
    OperacionRespuesta.parse((await http().post(`/operaciones/${id}/confirmar`).set('Authorization', p[quien].autorizacion).expect(200)).body);
  const dato = (op: OperacionRespuesta, etiqueta: string) => op.vistaConfirmacion.datos.find((d) => d.etiqueta.startsWith(etiqueta))?.valor;

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
    await vaciarTablas();
    calendario.reiniciar();

    organizacionId = await crearOrganizacion(prisma, 'Reuniones Demo');
    const cuentas: [Clave, 'gerente' | 'colaborador' | 'usuario_personal', 'empresarial' | 'personal'][] = [
      ['lider', 'gerente', 'empresarial'],
      ['ana', 'colaborador', 'empresarial'],
      ['beto', 'colaborador', 'empresarial'],
      ['lucia', 'colaborador', 'empresarial'],
      ['pablo', 'usuario_personal', 'personal'],
    ];
    for (const [clave, rol, plan] of cuentas) {
      const correo = `${clave}@reuniones.test`;
      const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan }, CONTRASENA, LIMA);
      const sesion = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
      p[clave] = { perfilId, autorizacion: `Bearer ${sesion.tokenAcceso}`, correo };
    }
    for (const clave of ['lider', 'ana', 'beto'] as const) {
      await prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId: p[clave].perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
    }
    // D-REU-11: Ana conectó otra dirección de Google
    calendario.fijarDireccion(p.ana.perfilId, 'ana.real@gmail.com');

    // El primer día hábil, solo hay un hueco común de los tres: de 15:00 a 16:00
    calendario.sembrar(p.lider.perfilId, { titulo: 'Comité', inicio: D(0, '08:00'), fin: D(0, '09:00'), zonaHoraria: LIMA });
    calendario.sembrar(p.ana.perfilId, { titulo: 'Cliente', inicio: D(0, '09:00'), fin: D(0, '10:00'), zonaHoraria: LIMA });
    calendario.sembrar(p.beto.perfilId, { titulo: 'Taller', inicio: D(0, '08:00'), fin: D(0, '15:00'), zonaHoraria: LIMA });
    calendario.sembrar(p.beto.perfilId, { titulo: 'Viaje', inicio: D(0, '16:00'), fin: D(0, '20:00'), zonaHoraria: LIMA });

    const alfa = await prisma.equipo.create({ data: { organizacionId, nombre: 'Proyecto Alfa' } });
    const diseno = await prisma.equipo.create({ data: { organizacionId, nombre: 'Diseño' } });
    const miembros: [string, Clave, 'responsable' | 'integrante', 'concedida' | 'pendiente'][] = [
      [alfa.id, 'lider', 'responsable', 'concedida'],
      [alfa.id, 'ana', 'integrante', 'concedida'],
      [alfa.id, 'beto', 'integrante', 'concedida'],
      [alfa.id, 'lucia', 'integrante', 'pendiente'],
      [diseno.id, 'lider', 'responsable', 'concedida'],
      [diseno.id, 'ana', 'integrante', 'concedida'],
    ];
    for (const [equipoId, clave, rolEnEquipo, estadoConsentimiento] of miembros) {
      await prisma.miembroDeEquipo.create({ data: { organizacionId, equipoId, perfilId: p[clave].perfilId, rolEnEquipo, estadoConsentimiento } });
    }
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  describe('agente.reuniones', () => {
    it('REQ-CUN06-01, 17 · «reunión con el proyecto Alfa» deja la reunión pendiente y propone 3 horarios sin tarjeta', async () => {
      const r = await enviar('lider', 'reunión con el proyecto Alfa');
      expect(de(r.turnos, 'propuesta')).toBeUndefined();
      const turno = de(r.turnos, 'reunion')!;
      expect(turno.propuestas.reunion).toMatchObject({ titulo: 'Reunión de Proyecto Alfa', estado: 'pendiente', invitados: 3 });
      expect(turno.propuestas.texto).toBe(
        'Encontré 3 horarios en los que están libres los 3. Elige uno. No pude comprobar a Lucia: no autorizó compartir su disponibilidad o no tiene calendario.',
      );
      expect(turno.propuestas.propuestas.map((x) => Date.parse(x.inicio))).toEqual([D(0, '15:00'), D(1, '08:00'), D(2, '08:00')].map((d) => d.getTime()));
      reunionId = turno.propuestas.reunion.id;
      // Nada en Google, y solo la ve quien la pidió
      expect(calendario.avisos).toHaveLength(0);
      expect((await reuniones('lider')).map((x) => x.estado)).toEqual(['pendiente']);
      expect(await reuniones('ana')).toEqual([]);
    });

    it('REQ-CUN06-08, 09 · el detalle trae el mapa y recalcula con un opcional', async () => {
      const d = await detalle('lider', reunionId);
      expect(d.mapa!.dias).toHaveLength(5);
      expect(d.mapa!.dias[0]!.franjas).toHaveLength(24);
      expect(d.mapa!.personasConDatos).toHaveLength(3);
      expect(d.invitados.map((i) => [i.nombre, i.datos, i.direccion])).toEqual([
        ['Ana', 'con_datos', 'ana.real@gmail.com'],
        ['Beto', 'con_datos', 'beto@reuniones.test'],
        ['Lucia', 'sin_consentimiento', 'lucia@reuniones.test'],
      ]);
      // Con Beto opcional, el primer día ya sirve a las 10:00
      const conOpcional = await detalle('lider', reunionId, { opcionales: p.beto.perfilId });
      expect(Date.parse(conOpcional.propuestas[0]!.inicio)).toBe(D(0, '15:00').getTime());
      expect(conOpcional.propuestas[0]!.opcionalesLibres).toBe(1);
      expect(conOpcional.propuestas.map((x) => Date.parse(x.inicio))).toContain(D(1, '08:00').getTime());
      expect(conOpcional.opcionales).toEqual([p.beto.perfilId]);
    });

    it('REQ-CUN06-10, 11, 12, 13 · elegir propone convocar; confirmar crea el evento con invitados y aviso', async () => {
      const r = await decidir('lider', { decision: 'horario', reunionId, inicio: D(0, '15:00').toISOString() });
      const tarjeta = de(r.turnos, 'propuesta')!.operacion;
      expect(tarjeta.tipo).toBe('reunion.convocar');
      expect(tarjeta.vistaConfirmacion.accion).toBe('Convocar esta reunión');
      expect(dato(tarjeta, 'Invitados')).toBe('Ana (ana.real@gmail.com); Beto (beto@reuniones.test); Lucia (lucia@reuniones.test, sin Google conectado)');
      expect(dato(tarjeta, 'Sin comprobar')).toMatch(/^Lucia: no se comprobó su disponibilidad/);
      expect(tarjeta.vistaConfirmacion.irreversible).toBe('Google enviará la invitación por correo a 3 personas. Deshacerlo es cancelar la reunión, que también les avisa.');

      const hecho = await decidir('lider', { operacionId: tarjeta.id, decision: 'confirmar' });
      expect(de(hecho.turnos, 'resultado')!.texto).toMatch(/^Listo: «Reunión de Proyecto Alfa» quedó agendada el .+ Google envía la invitación a 3 personas\.$/);
      expect(hecho.cierre?.desenlace).toBe('convocada');
      expect(calendario.avisos).toEqual([{ tipo: 'crear', id: expect.any(String), avisar: true, invitados: ['ana.real@gmail.com', 'beto@reuniones.test', 'lucia@reuniones.test'] }]);
      googleEventoId = calendario.avisos[0]!.id;

      const [delLider] = await reuniones('lider');
      expect(delLider).toMatchObject({ estado: 'agendada', soyConvocante: true });
      expect(Date.parse(delLider!.inicio!)).toBe(D(0, '15:00').getTime());
      const [deAna] = await reuniones('ana');
      expect(deAna).toMatchObject({ estado: 'agendada', soyConvocante: false, convocante: { correo: 'lider@reuniones.test' } });
      // Confirmar otra vez no crea otro evento
      await confirmar('lider', tarjeta.id);
      expect(calendario.avisos).toHaveLength(1);
    });

    it('REQ-CUN06-13 · la invitada ve el compromiso en su agenda, como invitada', async () => {
      const eventos = (await http().get('/agenda/eventos').query({ desde: D(0, '00:00').toISOString(), hasta: D(0, '23:00').toISOString() }).set('Authorization', p.ana.autorizacion).expect(200)).body as { titulo: string; esOrganizador: boolean }[];
      expect(eventos.find((e) => e.titulo === 'Reunión de Proyecto Alfa')).toMatchObject({ esOrganizador: false });
    });

    it('REQ-CUN06-21 · el compromiso de la reunión no se cancela desde la agenda', async () => {
      const evento = await prisma.eventoAgenda.findFirstOrThrow({ where: { perfilId: p.lider.perfilId, googleEventoId } });
      const r = await http().post('/operaciones').set('Authorization', p.lider.autorizacion).send({ tipo: 'agenda.cancelar', carga: { eventoId: evento.id }, origen: 'control_directo' }).expect(409);
      expect(ErrorApi.parse(r.body)).toMatchObject({ codigo: 'ES_REUNION', mensaje: 'Es una reunión con invitados. Cámbiala o cancélala desde Reuniones, así Google les avisa.' });
    });

    it('REQ-CUN06-16 · una invitada no la cancela', async () => {
      const r = await enviar('ana', 'cancela la reunión de Proyecto Alfa');
      expect(de(r.turnos, 'propuesta')).toBeUndefined();
      expect(de(r.turnos, 'texto')!.texto).toBe('Solo puede cancelarla quien la convocó: lider@reuniones.test. Tú puedes responder a la invitación en Google.');
    });

    it('REQ-CUN06-14 · moverla propone horarios del día pedido y avisa al confirmar', async () => {
      const dia = NOMBRE_DIA[diaDeLaSemana(dias[2]!)]!;
      const r = await enviar('lider', `mueve la reunión de Proyecto Alfa al ${dia}`);
      const turno = de(r.turnos, 'reunion')!;
      expect(turno.propuestas.mover).toBe(true);
      expect(turno.propuestas.texto).toMatch(/^Para mover «Reunión de Proyecto Alfa», encontré/);
      const elegida = turno.propuestas.propuestas[0]!;
      expect(Date.parse(elegida.inicio)).toBe(D(2, '08:00').getTime());
      const tarjeta = de((await decidir('lider', { decision: 'horario', reunionId, inicio: elegida.inicio })).turnos, 'propuesta')!.operacion;
      expect(tarjeta.tipo).toBe('reunion.mover');
      expect(tarjeta.vistaConfirmacion.irreversible).toBe('Google avisará del cambio por correo a 3 personas.');
      await decidir('lider', { operacionId: tarjeta.id, decision: 'confirmar' });
      expect(calendario.avisos.at(-1)).toMatchObject({ tipo: 'actualizar', avisar: true });
      const [movida] = await reuniones('lider');
      expect(Date.parse(movida!.inicio!)).toBe(D(2, '08:00').getTime());
    });

    it('REQ-CUN06-17 · si se mueve en Google, manda Google', async () => {
      calendario.cambiarEnGoogle(p.lider.perfilId, googleEventoId, { inicio: D(2, '10:00'), fin: D(2, '11:00') });
      const [r] = await reuniones('lider');
      expect(Date.parse(r!.inicio!)).toBe(D(2, '10:00').getTime());
    });

    it('REQ-CUN06-15 · cancelarla desde el detalle avisa a los invitados y la saca de todas las listas', async () => {
      const op = await proponer('lider', 'reunion.cancelar', { reunionId });
      expect(op.vistaConfirmacion.irreversible).toBe('Se quita de tu calendario de Google y Google avisará a los 3 invitados de que se canceló.');
      await confirmar('lider', op.id);
      expect(calendario.avisos.at(-1)).toMatchObject({ tipo: 'cancelar', avisar: true });
      expect(await reuniones('lider')).toEqual([]);
      expect(await reuniones('ana')).toEqual([]);
    });

    it('REQ-CUN06-06, 04 · «Beto si puede» lo deja opcional y no lo exige', async () => {
      const r = await enviar('lider', 'reunión con Ana y Lucia, Beto si puede');
      const turno = de(r.turnos, 'reunion')!;
      const primera = turno.propuestas.propuestas[0]!;
      // Ana y el líder libres a las 10:00 del primer día, pero con Beto libre gana las 15:00
      expect(Date.parse(primera.inicio)).toBe(D(0, '15:00').getTime());
      expect(primera.opcionalesLibres).toBe(1);
      const d = await detalle('lider', turno.propuestas.reunion.id);
      expect(d.invitados.find((i) => i.nombre === 'Beto')!.opcional).toBe(true);
    });

    it('REQ-CUN06-11 · si un obligatorio se ocupa antes de confirmar, no se escribe nada', async () => {
      const r = await enviar('lider', 'reunión con Ana y Beto');
      const turno = de(r.turnos, 'reunion')!;
      const id = turno.propuestas.reunion.id;
      const tarjeta = de((await decidir('lider', { decision: 'horario', reunionId: id, inicio: D(0, '15:00').toISOString() })).turnos, 'propuesta')!.operacion;
      expect(tarjeta.vistaConfirmacion.confirmable).toBe(true);
      calendario.sembrar(p.beto.perfilId, { titulo: 'Urgente', inicio: D(0, '15:00'), fin: D(0, '15:30'), zonaHoraria: LIMA });
      const antes = calendario.avisos.length;
      const r2 = await decidir('lider', { operacionId: tarjeta.id, decision: 'confirmar' });
      const otra = de(r2.turnos, 'propuesta')!.operacion;
      expect(otra.vistaConfirmacion).toMatchObject({ confirmable: false, motivoNoConfirmable: 'Beto no está libre a esa hora.' });
      expect(calendario.avisos).toHaveLength(antes);
    });

    it('REQ-CUN06-02 · lo que no se puede resolver se pregunta', async () => {
      const texto = async (frase: string) => de((await enviar('lider', frase)).turnos, 'texto')?.texto;
      expect(await texto('reunión con Ana mañana')).toBe('Ana está en 2 de tus equipos: «Proyecto Alfa» y «Diseño». ¿Con cuál es la reunión?');
      expect(await texto('reunión con Carlos')).toBe('No encuentro a Carlos en tus equipos.');
      expect(await texto('agenda una reunión')).toBe('¿Con quién es la reunión? Puedes decirme un equipo o los nombres de las personas.');
    });

    it('REQ-CUN06-19 · con el Plan Personal no hay reuniones', async () => {
      expect(de((await enviar('pablo', 'reunión con el proyecto Alfa')).turnos, 'texto')!.texto).toBe('Las reuniones son del Plan Empresarial y requieren pertenecer a un equipo.');
      const r = await http().get('/reuniones').set('Authorization', p.pablo.autorizacion).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('SIN_PLAN_EMPRESARIAL');
    });
  });

  describe('reuniones.conciliacion', () => {
    it('REQ-CUN06-18 · una pendiente cuyo rango ya pasó queda vencida', async () => {
      const pendiente = (await reuniones('lider')).find((r) => r.estado === 'pendiente')!;
      await prisma.reunion.update({ where: { id: pendiente.id }, data: { rangoHasta: new Date(Date.now() - 60_000) } });
      expect((await reuniones('lider')).find((r) => r.id === pendiente.id)!.estado).toBe('vencida');
      expect((await detalle('lider', pendiente.id)).propuestas).toEqual([]);
    });

    it('REQ-CUN06-17 · si se borra en Google, queda cancelada', async () => {
      const r = await enviar('lider', 'reunión con el equipo Diseño');
      const turno = de(r.turnos, 'reunion')!;
      const tarjeta = de((await decidir('lider', { decision: 'horario', reunionId: turno.propuestas.reunion.id, inicio: turno.propuestas.propuestas[0]!.inicio })).turnos, 'propuesta')!.operacion;
      await decidir('lider', { operacionId: tarjeta.id, decision: 'confirmar' });
      const id = calendario.avisos.at(-1)!.id;
      calendario.borrarEnGoogle(p.lider.perfilId, id);
      expect((await reuniones('lider')).some((x) => x.id === turno.propuestas.reunion.id)).toBe(false);
      expect((await prisma.reunion.findUniqueOrThrow({ where: { id: turno.propuestas.reunion.id } })).estado).toBe('cancelada');
    });
  });

  // T-137 · P-11, DP-01: sin asistente, pedir queda en espera; lo que ya existe se sigue usando
  describe('reuniones.sin-asistente', () => {
    it('REQ-CUN06-20 · lo pedido queda en espera sin crear reunión, y la pendiente se convoca desde el detalle', async () => {
      const pendiente = de((await enviar('lider', 'reunión con el proyecto Alfa')).turnos, 'reunion')!.propuestas.reunion;
      const antes = await prisma.reunion.count();

      simulado.caer();
      try {
        const r = await enviar('lider', 'reunión con el equipo Diseño');
        expect(de(r.turnos, 'en_espera')).toMatchObject({ motivo: 'asistente_no_disponible' });
        expect(de(r.turnos, 'reunion')).toBeUndefined();
        expect(await prisma.reunion.count()).toBe(antes);
        expect(await prisma.operacion.findFirst({ where: { estado: 'en_espera', perfilId: p.lider.perfilId } })).toMatchObject({ solicitudOriginal: 'reunión con el equipo Diseño' });

        // La lista y el detalle no dependen del asistente; elegir y confirmar desde el detalle es un control directo
        expect((await reuniones('lider')).some((x) => x.id === pendiente.id)).toBe(true);
        const d = await detalle('lider', pendiente.id);
        expect(d.propuestas.length).toBeGreaterThan(0);
        const tarjeta = await proponer('lider', 'reunion.convocar', { reunionId: pendiente.id, inicio: d.propuestas[0]!.inicio });
        expect(tarjeta.vistaConfirmacion.accion).toBe('Convocar esta reunión');
        expect((await confirmar('lider', tarjeta.id)).estado).toBe('ejecutada');
        expect((await reuniones('lider')).find((x) => x.id === pendiente.id)!.estado).toBe('agendada');
      } finally {
        simulado.recuperar();
      }

      // Al volver, lo encolado lo interpreta el asistente: propone horarios de Diseño, sin tarjeta todavía
      await app.get(ProcesadorEnEspera).repasar();
      expect(await prisma.operacion.count({ where: { estado: 'en_espera', perfilId: p.lider.perfilId } })).toBe(0);
      const nueva = await prisma.reunion.findFirstOrThrow({ where: { convocanteId: p.lider.perfilId }, orderBy: { creadaEn: 'desc' }, include: { equipo: true } });
      expect(nueva).toMatchObject({ estado: 'pendiente', equipo: { nombre: 'Diseño' } });
    });
  });

  // T-138 · REQ-CUN06-13 v2 · P-REU-08, P-REU-10: lo que encontró la prueba con Google real (D-REU-34). Google no
  // pone la invitación en la lista del invitado hasta que responde; la Agenda la tiene igual, leída por su id
  describe('reuniones.invitacion-sin-responder', () => {
    it('REQ-CUN06-13 · la invitada ve la reunión en su Agenda aunque Google no la liste, y su cancelación', async () => {
      calendario.ocultarInvitaciones = true;
      try {
        const turno = de((await enviar('lider', 'reunión con el equipo Diseño')).turnos, 'reunion')!;
        const elegida = turno.propuestas.propuestas[0]!;
        const tarjeta = de((await decidir('lider', { decision: 'horario', reunionId: turno.propuestas.reunion.id, inicio: elegida.inicio })).turnos, 'propuesta')!.operacion;
        await decidir('lider', { operacionId: tarjeta.id, decision: 'confirmar' });
        const reunion = await prisma.reunion.findUniqueOrThrow({ where: { id: turno.propuestas.reunion.id } });
        const quienAna = { perfilId: p.ana.perfilId, organizacionId };

        // En Google, la lista de Ana no la trae; por su id, sí
        const lista = await calendario.listar(quienAna, { tipo: 'completa', desde: reunion.rangoDesde, hasta: reunion.rangoHasta });
        expect(lista.cambios.some((c) => c.tipo === 'evento' && c.evento.id === reunion.googleEventoId)).toBe(false);

        // Su Agenda la muestra igual, a la hora de la reunión y como invitada
        const dia = { desde: new Date(reunion.inicio!.getTime() - 3_600_000).toISOString(), hasta: new Date(reunion.fin!.getTime() + 3_600_000).toISOString() };
        const eventos = (await http().get('/agenda/eventos').query(dia).set('Authorization', p.ana.autorizacion).expect(200)).body as { titulo: string; inicio: string; esOrganizador: boolean; estado: string }[];
        expect(eventos.find((e) => e.titulo === 'Reunión de Diseño' && Date.parse(e.inicio) === reunion.inicio!.getTime())).toMatchObject({ esOrganizador: false, estado: 'confirmado' });

        // Y cuenta como ocupada al buscar otra reunión con ella
        const otra = de((await enviar('lider', 'reunión con el equipo Diseño')).turnos, 'reunion')!;
        expect(otra.propuestas.propuestas.some((x) => Date.parse(x.inicio) === reunion.inicio!.getTime())).toBe(false);

        // Una sincronización completa no la da por borrada
        await prisma.sincronizacionCalendario.update({ where: { perfilId: p.ana.perfilId }, data: { syncToken: null } });
        await app.get(SincronizadorCalendario).sincronizar(quienAna);
        expect((await prisma.eventoAgenda.findFirstOrThrow({ where: { perfilId: p.ana.perfilId, googleEventoId: reunion.googleEventoId! } })).estado).toBe('confirmado');

        // Si Ana responde en Google, sale en su lista y no se duplica
        calendario.responder(p.ana.perfilId, reunion.googleEventoId!);
        await app.get(SincronizadorCalendario).sincronizar(quienAna);
        expect(await prisma.eventoAgenda.count({ where: { perfilId: p.ana.perfilId, googleEventoId: reunion.googleEventoId! } })).toBe(1);

        // Quien convocó la cancela: la copia de Ana queda cancelada
        const cancelar = await proponer('lider', 'reunion.cancelar', { reunionId: reunion.id });
        await confirmar('lider', cancelar.id);
        expect((await prisma.eventoAgenda.findFirstOrThrow({ where: { perfilId: p.ana.perfilId, googleEventoId: reunion.googleEventoId! } })).estado).toBe('cancelado');
      } finally {
        calendario.ocultarInvitaciones = false;
      }
    });
  });
});
