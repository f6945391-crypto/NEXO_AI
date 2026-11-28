import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EquipoOrganizacion, ErrorApi, IngresoRespuesta, OperacionRespuesta, PersonaOrganizacion } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-066, primera parte (H-ADM-34) · REQ-ADM-28 a 31 · specs/08-administracion/plan.md §5.1 y §5.4. Equipos de la
// organización con cuentas propias y activas; las afiliadas, con INC-37.

const CONTRASENA = 'una-contrasena-de-prueba';

describe('T-066 · equipos de la organización', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let acme: string;
  let ana: string;
  let zona: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const token = (cuerpo: unknown) => `Bearer ${IngresoRespuesta.parse(cuerpo).tokenAcceso}`;

  async function proponer(tipo: string, carga: object, sesion = zona) {
    return OperacionRespuesta.parse((await http().post('/administracion/operaciones').set('Authorization', sesion).send({ tipo, carga }).expect(201)).body);
  }
  async function confirmar(id: string, estado = 200, sesion = zona) {
    return (await http().post(`/administracion/operaciones/${id}/confirmar`).set('Authorization', sesion).expect(estado)).body as unknown;
  }
  async function hacer(tipo: string, carga: object) {
    const p = await proponer(tipo, carga);
    expect(p.vistaConfirmacion.motivoNoConfirmable).toBeNull();
    const r = OperacionRespuesta.parse(await confirmar(p.id));
    expect(r.estado).toBe('ejecutada');
    return r;
  }
  // Lo que se propone y no se puede: tarjeta con el motivo, confirmar responde 409 y no se escribe nada
  async function rechazada(tipo: string, carga: object, motivo: string) {
    const p = await proponer(tipo, carga);
    expect([p.vistaConfirmacion.confirmable, p.vistaConfirmacion.motivoNoConfirmable]).toEqual([false, motivo]);
    await confirmar(p.id, 409);
    return p;
  }
  async function propia() {
    const correo = `eq${++n}@acme.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId: acme, correo, rol: 'colaborador', plan: 'empresarial' }, CONTRASENA);
    return { correo, perfilId };
  }
  async function crearEquipo(nombre: string) {
    const r = await hacer('administracion.crear_equipo', { nombre });
    return (r.resultado as { equipoId: string }).equipoId;
  }
  const equipos = async (sesion = zona) => EquipoOrganizacion.array().parse((await http().get('/administracion/equipos').set('Authorization', sesion).expect(200)).body);
  const equipo = async (nombre: string) => (await equipos()).find((e) => e.nombre === nombre)!;
  const responsables = (equipoId: string) => prisma.miembroDeEquipo.count({ where: { equipoId, rolEnEquipo: 'responsable' } });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
    acme = await crearOrganizacion(prisma, 'Acme', 'empresa');
    // Un correo por prueba: la entrada admite cinco intentos por minuto y correo
    const correo = `admin-eq-${++n}@acme.test`;
    ana = (await crearCuentaLista(prisma, { organizacionId: acme, correo, rol: 'gerente', plan: 'empresarial', administrador: true }, CONTRASENA)).perfilId;
    zona = token((await http().post('/administracion/entrar').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
  });

  describe('equipos.crear-y-componer', () => {
    it('crea un equipo vacío y sin responsable, en la empresa y con su auditoría; el nombre repetido se rechaza', async () => {
      const p = await proponer('administracion.crear_equipo', { nombre: '  Ventas  ' });
      expect(p.vistaConfirmacion.accion).toBe('Crear un equipo');
      expect(p.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Nombre', valor: 'Ventas' });
      expect(p.vistaConfirmacion.irreversible).toBeNull();
      const r = OperacionRespuesta.parse(await confirmar(p.id));
      const { equipoId } = r.resultado as { equipoId: string };

      expect(await equipos()).toEqual([{ id: equipoId, nombre: 'Ventas', responsable: null, miembros: [] }]);
      expect((await prisma.operacion.findUniqueOrThrow({ where: { id: p.id } })).organizacionId).toBe(acme);
      expect(await prisma.eventoAuditoria.count({ where: { organizacionId: acme, perfilId: ana, accion: 'administracion.equipo-creado' } })).toBe(1);

      // REQ-ADM-28: tampoco con otras mayúsculas
      for (const nombre of ['Ventas', 'ventas']) await rechazada('administracion.crear_equipo', { nombre }, 'Ya hay un equipo «Ventas» en la organización. Elige otro nombre.');
      expect(await prisma.equipo.count()).toBe(1);
    });

    it('si dos confirmaciones crean el mismo nombre a la vez, queda un solo equipo', async () => {
      const [a, b] = await Promise.all([proponer('administracion.crear_equipo', { nombre: 'Soporte' }), proponer('administracion.crear_equipo', { nombre: 'Soporte' })]);
      const respuestas = (await Promise.all([confirmar(a.id), confirmar(b.id)])).map((c) => OperacionRespuesta.parse(c).estado).sort();
      expect(respuestas).toEqual(['ejecutada', 'propuesta']);
      expect(await prisma.equipo.count({ where: { nombre: 'Soporte' } })).toBe(1);
    });

    it('suma cuentas propias y activas, una misma cuenta en varios equipos, y lo muestra en Personas', async () => {
      const ventas = await crearEquipo('Ventas');
      const soporte = await crearEquipo('Soporte');
      const lucia = await propia();
      const beto = await propia();

      const p = await proponer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: lucia.perfilId });
      expect(p.vistaConfirmacion.datos.slice(0, 2)).toEqual([
        { etiqueta: 'Equipo', valor: 'Ventas' },
        { etiqueta: 'Cuenta', valor: lucia.correo },
      ]);
      await confirmar(p.id);
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: beto.perfilId });
      await hacer('administracion.anadir_a_equipo', { equipoId: soporte, perfilId: lucia.perfilId });

      expect((await equipo('Ventas')).miembros.map((m) => m.correo)).toEqual([lucia.correo, beto.correo]);
      expect((await equipo('Soporte')).miembros.map((m) => m.correo)).toEqual([lucia.correo]);
      // Entra como integrante, con su consentimiento pendiente: lo da la propia persona (REQ-CUN05-14)
      const fila = await prisma.miembroDeEquipo.findFirstOrThrow({ where: { equipoId: ventas, perfilId: lucia.perfilId } });
      expect([fila.rolEnEquipo, fila.estadoConsentimiento]).toEqual(['integrante', 'pendiente']);
      expect(await prisma.eventoAuditoria.count({ where: { organizacionId: acme, accion: 'administracion.miembro-anadido' } })).toBe(3);

      const personas = PersonaOrganizacion.array().parse((await http().get('/administracion/personas').set('Authorization', zona).expect(200)).body);
      expect(personas.find((x) => x.perfilId === lucia.perfilId)!.equipos.map((e) => [e.nombre, e.responsable])).toEqual([
        ['Soporte', false],
        ['Ventas', false],
      ]);

      await rechazada('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: lucia.perfilId }, 'Esa cuenta ya está en «Ventas».');
    });

    it('no suma una invitación pendiente, una cuenta afiliada, una suspendida ni una de otra organización', async () => {
      const ventas = await crearEquipo('Ventas');
      const suspendida = await propia();
      await prisma.perfilUsuario.update({ where: { id: suspendida.perfilId }, data: { estado: 'suspendida' } });
      const personal = await crearOrganizacion(prisma, 'Personal de Vasco', 'personal');
      const vasco = (await crearCuentaLista(prisma, { organizacionId: personal, correo: `vasco${++n}@correo.test`, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA)).perfilId;
      const otraPersonal = await crearOrganizacion(prisma, 'Personal del invitado', 'personal');
      const invitado = (await crearCuentaLista(prisma, { organizacionId: otraPersonal, correo: `inv${++n}@correo.test`, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA)).perfilId;
      await prisma.miembroOrganizacion.create({ data: { organizacionId: acme, perfilId: vasco, origen: 'afiliacion', estado: 'vigente' } });
      await prisma.miembroOrganizacion.create({ data: { organizacionId: acme, perfilId: invitado, origen: 'afiliacion', estado: 'invitada' } });
      const otra = await crearOrganizacion(prisma, 'Otra', 'empresa');
      const ajena = (await crearCuentaLista(prisma, { organizacionId: otra, correo: `ajena${++n}@otra.test`, rol: 'colaborador', plan: 'empresarial' }, CONTRASENA)).perfilId;

      await rechazada('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: invitado }, 'Esa persona todavía no aceptó la invitación a la organización.');
      // INC-37 · H-ADM-34
      await rechazada(
        'administracion.anadir_a_equipo',
        { equipoId: ventas, perfilId: vasco },
        'Por ahora solo se pueden añadir a un equipo las cuentas de la organización. Sumar a quien se sumó con su cuenta llegará más adelante.',
      );
      await rechazada('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: suspendida.perfilId }, 'Solo se puede añadir a un equipo una cuenta activa.');
      await rechazada('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: ajena }, 'Esa cuenta no pertenece a la organización.');
      // Un equipo de otra organización tampoco existe para esta
      const deOtra = await prisma.equipo.create({ data: { organizacionId: otra, nombre: 'Ajeno' } });
      const nueva = await propia();
      await rechazada('administracion.anadir_a_equipo', { equipoId: deOtra.id, perfilId: nueva.perfilId }, 'Ese equipo no existe en la organización.');

      expect(await prisma.miembroDeEquipo.count()).toBe(0);
    });

    it('quita a un miembro con su tarjeta, que dice lo que no se recupera', async () => {
      const ventas = await crearEquipo('Ventas');
      const lucia = await propia();
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: lucia.perfilId });

      const p = await proponer('administracion.quitar_de_equipo', { equipoId: ventas, perfilId: lucia.perfilId });
      expect(p.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'En el equipo', valor: 'Miembro' });
      expect(p.vistaConfirmacion.irreversible).toBe('Si vuelve a sumarse, tendrá que autorizar otra vez que el equipo vea si está libre u ocupado.');
      await confirmar(p.id);
      expect((await equipo('Ventas')).miembros).toEqual([]);
      expect(await prisma.eventoAuditoria.count({ where: { organizacionId: acme, accion: 'administracion.miembro-quitado' } })).toBe(1);

      await rechazada('administracion.quitar_de_equipo', { equipoId: ventas, perfilId: lucia.perfilId }, 'Esa cuenta no está en «Ventas».');
    });

    it('solo el administrador compone equipos, y el asistente no puede', async () => {
      const ventas = await crearEquipo('Ventas');
      const rosa = await propia();
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: rosa.perfilId });
      await hacer('administracion.nombrar_responsable', { equipoId: ventas, perfilId: rosa.perfilId });
      const suya = token((await http().post('/administracion/entrar').send({ correo: rosa.correo, contrasena: CONTRASENA }).expect(200)).body);

      for (const [tipo, carga] of [
        ['administracion.crear_equipo', { nombre: 'Propio' }],
        ['administracion.anadir_a_equipo', { equipoId: ventas, perfilId: ana }],
      ] as const) {
        const r = await http().post('/administracion/operaciones').set('Authorization', suya).send({ tipo, carga }).expect(403);
        expect(ErrorApi.parse(r.body).codigo).toBe('ADMINISTRACION_NO_PERMITIDA');
      }
      // La responsable ve su equipo en lectura (plan §7.2)
      expect((await equipos(suya)).map((e) => e.nombre)).toEqual(['Ventas']);

      // Con la sesión de la aplicación, ni siquiera la administradora (REQ-ADM-07, plan §5.2)
      const aplicacion = token((await http().post('/auth/ingreso').send({ correo: rosa.correo, contrasena: CONTRASENA }).expect(200)).body);
      const r = await http().post('/operaciones').set('Authorization', aplicacion).send({ tipo: 'administracion.crear_equipo', carga: { nombre: 'Otro' }, origen: 'agente' });
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(await prisma.equipo.count()).toBe(1);
    });
  });

  describe('equipos.un-responsable', () => {
    it('nombra responsable a un miembro solo en ese equipo; nombrar a otro le quita la autoridad al anterior', async () => {
      const ventas = await crearEquipo('Ventas');
      const soporte = await crearEquipo('Soporte');
      const lucia = await propia();
      const vasco = await propia();
      for (const [equipoId, perfilId] of [
        [ventas, lucia.perfilId],
        [soporte, lucia.perfilId],
        [ventas, vasco.perfilId],
      ]) {
        await hacer('administracion.anadir_a_equipo', { equipoId, perfilId });
      }

      const primera = await proponer('administracion.nombrar_responsable', { equipoId: ventas, perfilId: lucia.perfilId });
      expect(primera.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Responsable ahora', valor: 'Nadie' });
      await confirmar(primera.id);
      expect((await equipo('Ventas')).responsable).toEqual({ perfilId: lucia.perfilId, correo: lucia.correo });
      expect((await equipo('Ventas')).miembros.map((m) => m.correo)).toEqual([vasco.correo]);
      // En «Soporte» sigue siendo un miembro más (REQ-ADM-30)
      expect((await equipo('Soporte')).responsable).toBeNull();
      expect((await equipo('Soporte')).miembros.map((m) => m.correo)).toEqual([lucia.correo]);

      const segunda = await proponer('administracion.nombrar_responsable', { equipoId: ventas, perfilId: vasco.perfilId });
      expect(segunda.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Responsable ahora', valor: lucia.correo });
      expect(segunda.vistaConfirmacion.datos.find((d) => d.etiqueta === 'Qué pasa')!.valor).toContain(`${lucia.correo} pasa a ser miembro`);
      await confirmar(segunda.id);
      expect((await equipo('Ventas')).responsable?.perfilId).toBe(vasco.perfilId);
      expect((await equipo('Ventas')).miembros.map((m) => m.correo)).toEqual([lucia.correo]);
      expect(await responsables(ventas)).toBe(1);
      expect(await prisma.eventoAuditoria.count({ where: { organizacionId: acme, accion: 'administracion.responsable-nombrado' } })).toBe(2);

      // Nombrada responsable, puede entrar en la zona y ve solo su equipo
      const suya = token((await http().post('/administracion/entrar').send({ correo: vasco.correo, contrasena: CONTRASENA }).expect(200)).body);
      expect((await equipos(suya)).map((e) => e.nombre)).toEqual(['Ventas']);
    });

    it('no nombra a quien no es miembro, a quien ya lo es, ni a una cuenta suspendida', async () => {
      const ventas = await crearEquipo('Ventas');
      const lucia = await propia();
      const fuera = await propia();
      const suspendida = await propia();
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: lucia.perfilId });
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: suspendida.perfilId });
      await hacer('administracion.nombrar_responsable', { equipoId: ventas, perfilId: lucia.perfilId });
      await prisma.perfilUsuario.update({ where: { id: suspendida.perfilId }, data: { estado: 'suspendida' } });

      await rechazada('administracion.nombrar_responsable', { equipoId: ventas, perfilId: fuera.perfilId }, 'Esa cuenta no está en «Ventas». Primero añádela al equipo.');
      await rechazada('administracion.nombrar_responsable', { equipoId: ventas, perfilId: lucia.perfilId }, 'Esa cuenta ya es la responsable de «Ventas».');
      await rechazada('administracion.nombrar_responsable', { equipoId: ventas, perfilId: suspendida.perfilId }, 'Solo una cuenta activa puede ser responsable de un equipo.');
      expect((await equipo('Ventas')).responsable?.perfilId).toBe(lucia.perfilId);
    });

    it('quitar al responsable deja el equipo sin responsable, y nadie hereda la autoridad', async () => {
      const ventas = await crearEquipo('Ventas');
      const lucia = await propia();
      const vasco = await propia();
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: lucia.perfilId });
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: vasco.perfilId });
      await hacer('administracion.nombrar_responsable', { equipoId: ventas, perfilId: lucia.perfilId });

      const p = await proponer('administracion.quitar_de_equipo', { equipoId: ventas, perfilId: lucia.perfilId });
      expect(p.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'En el equipo', valor: 'Responsable' });
      expect(p.vistaConfirmacion.datos.find((d) => d.etiqueta === 'Qué pasa')!.valor).toContain('el equipo queda sin responsable');
      await confirmar(p.id);

      expect(await equipo('Ventas')).toEqual({ id: ventas, nombre: 'Ventas', responsable: null, miembros: [{ perfilId: vasco.perfilId, correo: vasco.correo }] });
      expect(await responsables(ventas)).toBe(0);
      const evento = await prisma.eventoAuditoria.findFirstOrThrow({ where: { organizacionId: acme, accion: 'administracion.miembro-quitado' } });
      expect(evento.detalle).toMatchObject({ equipoId: ventas, perfilAfectado: lucia.perfilId, antes: { rol: 'responsable' }, equipoSinResponsable: true });
      // Ya no es responsable de nada: la zona no la deja entrar
      await http().post('/administracion/entrar').send({ correo: lucia.correo, contrasena: CONTRASENA }).expect(401);
    });

    it('dos nombramientos confirmados a la vez dejan un solo responsable', async () => {
      const ventas = await crearEquipo('Ventas');
      const lucia = await propia();
      const vasco = await propia();
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: lucia.perfilId });
      await hacer('administracion.anadir_a_equipo', { equipoId: ventas, perfilId: vasco.perfilId });
      const [a, b] = await Promise.all([
        proponer('administracion.nombrar_responsable', { equipoId: ventas, perfilId: lucia.perfilId }),
        proponer('administracion.nombrar_responsable', { equipoId: ventas, perfilId: vasco.perfilId }),
      ]);
      await Promise.all([confirmar(a.id), confirmar(b.id)]);
      expect(await responsables(ventas)).toBe(1);
      expect(await prisma.miembroDeEquipo.count({ where: { equipoId: ventas } })).toBe(2);
    });
  });
});
