import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, OperacionRespuesta, PersonaOrganizacion, type Plan } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { MODELOS_CON_ORGANIZACION } from '../../src/plataforma/aislamiento';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-068 · REQ-ADM-02, 03, 08 a 16 · specs/08-administracion/plan.md §4.3, §5.1, §6 y §9

const CONTRASENA = 'una-contrasena-de-prueba';
const AFILIADA = 'Esa cuenta es de la persona: se sumó con su cuenta. Lo que sí puedes hacer es quitarla de la organización.';
const ULTIMO = 'La organización se quedaría sin nadie que la administre. Antes, nombra a otra persona administradora.';

describe('T-068 · cuentas de la organización', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let acme: string;
  let ana: string;
  let correoAna: string;
  let zona: string;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const token = (cuerpo: unknown) => `Bearer ${IngresoRespuesta.parse(cuerpo).tokenAcceso}`;
  const entrar = (correo: string, contrasena = CONTRASENA) => http().post('/auth/ingreso').send({ correo, contrasena });

  async function proponer(tipo: string, carga: object, sesion = zona) {
    return OperacionRespuesta.parse((await http().post('/administracion/operaciones').set('Authorization', sesion).send({ tipo, carga }).expect(201)).body);
  }
  async function confirmar(id: string, estado = 200, sesion = zona) {
    return (await http().post(`/administracion/operaciones/${id}/confirmar`).set('Authorization', sesion).expect(estado)).body as unknown;
  }
  async function hacer(tipo: string, carga: object) {
    const p = await proponer(tipo, carga);
    expect(p.vistaConfirmacion.motivoNoConfirmable).toBeNull();
    return OperacionRespuesta.parse(await confirmar(p.id));
  }
  async function propia(opciones: { plan?: Plan; administrador?: boolean } = {}) {
    const correo = `cu${++n}@acme.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId: acme, correo, rol: 'colaborador', plan: opciones.plan ?? 'empresarial', administrador: opciones.administrador }, CONTRASENA);
    return { correo, perfilId };
  }
  async function afiliada() {
    const correo = `af${++n}@correo.test`;
    const organizacionId = await crearOrganizacion(prisma, `Personal ${n}`, 'personal');
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA);
    const miembro = await prisma.miembroOrganizacion.create({ data: { organizacionId: acme, perfilId, origen: 'afiliacion', estado: 'vigente' } });
    return { correo, perfilId, organizacionId, miembroId: miembro.id };
  }
  const personas = async () => PersonaOrganizacion.array().parse((await http().get('/administracion/personas').set('Authorization', zona).expect(200)).body);

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
    // Un correo por prueba: el ingreso admite cinco intentos por minuto y correo
    correoAna = `admin-${++n}@acme.test`;
    ana = (await crearCuentaLista(prisma, { organizacionId: acme, correo: correoAna, rol: 'gerente', plan: 'empresarial', administrador: true }, CONTRASENA)).perfilId;
    zona = token((await http().post('/administracion/entrar').send({ correo: correoAna, contrasena: CONTRASENA }).expect(200)).body);
  });

  describe('administracion.lista-de-personas', () => {
    it('muestra propias, afiliadas e invitaciones con su estado, plan, equipos y si administran, y nada más', async () => {
      const lista = await propia();
      const pendiente = await propia({ plan: 'personal' });
      await prisma.perfilUsuario.update({ where: { id: pendiente.perfilId }, data: { debeCambiarContrasena: true } });
      const suspendida = await propia();
      await prisma.perfilUsuario.update({ where: { id: suspendida.perfilId }, data: { estado: 'suspendida' } });
      const vasco = await afiliada();
      const invitado = await afiliada();
      await prisma.miembroOrganizacion.update({ where: { id: invitado.miembroId }, data: { estado: 'invitada' } });
      const ventas = await prisma.equipo.create({ data: { organizacionId: acme, nombre: 'Ventas' } });
      await prisma.miembroEquipo.create({ data: { organizacionId: acme, equipoId: ventas.id, perfilId: lista.perfilId, responsable: true } });
      await prisma.miembroEquipo.create({ data: { organizacionId: acme, equipoId: ventas.id, perfilId: vasco.perfilId } });

      const r = await http().get('/administracion/personas').set('Authorization', zona).expect(200);
      const filas = PersonaOrganizacion.array().parse(r.body);
      expect(filas.map((p) => [p.correo, p.clase, p.estado, p.plan, p.equipos.map((e) => `${e.nombre}${e.responsable ? ' (responsable)' : ''}`), p.administrador])).toEqual([
        [invitado.correo, 'invitacion', 'invitacion_pendiente', 'empresarial', [], false],
        [correoAna, 'propia', 'activa', 'empresarial', [], true],
        [vasco.correo, 'afiliada', 'activa', 'empresarial', ['Ventas'], false],
        [lista.correo, 'propia', 'activa', 'empresarial', ['Ventas (responsable)'], false],
        [pendiente.correo, 'propia', 'primer_ingreso_pendiente', 'personal', [], false],
        [suspendida.correo, 'propia', 'suspendida', 'empresarial', [], false],
      ]);
      // Ni la zona horaria ni el plan propio de la afiliada (REQ-ADM-08)
      expect(JSON.stringify(r.body)).not.toContain('America/Lima');
    });

    it('a quien no administra no se le muestra, y queda registrado', async () => {
      const responsable = await propia();
      const ventas = await prisma.equipo.create({ data: { organizacionId: acme, nombre: 'Ventas' } });
      await prisma.miembroEquipo.create({ data: { organizacionId: acme, equipoId: ventas.id, perfilId: responsable.perfilId, responsable: true } });
      const suya = token((await http().post('/administracion/entrar').send({ correo: responsable.correo, contrasena: CONTRASENA }).expect(200)).body);
      const r = await http().get('/administracion/personas').set('Authorization', suya).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('ADMINISTRACION_NO_PERMITIDA');
      expect(await prisma.eventoAuditoria.count({ where: { perfilId: responsable.perfilId, accion: 'administracion.rechazada' } })).toBe(1);
    });
  });

  describe('administracion.administrar-no-es-ver', () => {
    it('con la sesión de administración no se llega a la agenda, la conversación ni el perfil de nadie', async () => {
      for (const ruta of ['/agenda/eventos', '/asistente/conversacion', '/perfil', '/operaciones']) {
        const r = await http().get(ruta).set('Authorization', zona);
        expect([r.status, ErrorApi.parse(r.body).codigo]).toEqual([403, 'AMBITO_INCORRECTO']);
      }
    });
  });

  describe('administracion.nunca-sin-administrador', () => {
    it('la única administradora no puede dejar de serlo, suspenderse ni darse de baja', async () => {
      for (const tipo of ['administracion.quitar_administrador', 'administracion.suspender_cuenta', 'administracion.cerrar_cuenta']) {
        const p = await proponer(tipo, { perfilId: ana });
        expect([p.vistaConfirmacion.confirmable, p.vistaConfirmacion.motivoNoConfirmable]).toEqual([false, ULTIMO]);
        await confirmar(p.id, 409);
      }
      expect((await prisma.miembroOrganizacion.findFirstOrThrow({ where: { perfilId: ana } })).administrador).toBe(true);
    });

    it('con dos administradores se nombra a un tercero, y entonces uno puede dejarlo', async () => {
      const beto = await propia({ administrador: true });
      const carla = await propia();
      await hacer('administracion.nombrar_administrador', { perfilId: carla.perfilId });
      expect((await personas()).filter((p) => p.administrador)).toHaveLength(3);
      await hacer('administracion.quitar_administrador', { perfilId: beto.perfilId });
      expect((await personas()).filter((p) => p.administrador).map((p) => p.correo).sort()).toEqual([correoAna, carla.correo].sort());
    });

    it('una administradora suspendida no cuenta para no quedarse sin nadie', async () => {
      const beto = await propia({ administrador: true });
      await prisma.perfilUsuario.update({ where: { id: beto.perfilId }, data: { estado: 'suspendida' } });
      const p = await proponer('administracion.quitar_administrador', { perfilId: ana });
      expect(p.vistaConfirmacion.motivoNoConfirmable).toBe(ULTIMO);
    });

    // RT-02: dos administradoras se quitan la una a la otra a la vez; la comprobación y el cambio no se cruzan
    it('dos confirmaciones a la vez no dejan a la organización sin administrador', async () => {
      const beto = await propia({ administrador: true });
      const suya = token((await http().post('/administracion/entrar').send({ correo: beto.correo, contrasena: CONTRASENA }).expect(200)).body);
      for (let vuelta = 0; vuelta < 3; vuelta++) {
        await prisma.miembroOrganizacion.updateMany({ where: { organizacionId: acme, perfilId: { in: [ana, beto.perfilId] } }, data: { administrador: true } });
        const quitarABeto = await proponer('administracion.quitar_administrador', { perfilId: beto.perfilId });
        const quitarAAna = await proponer('administracion.quitar_administrador', { perfilId: ana }, suya);
        expect([quitarABeto.vistaConfirmacion.confirmable, quitarAAna.vistaConfirmacion.confirmable]).toEqual([true, true]);

        const resultados = (await Promise.all([confirmar(quitarABeto.id), confirmar(quitarAAna.id, 200, suya)])).map((r) => OperacionRespuesta.parse(r));
        expect(resultados.map((r) => r.estado).sort()).toEqual(['ejecutada', 'propuesta']);
        expect(resultados.find((r) => r.estado === 'propuesta')!.vistaConfirmacion.motivoNoConfirmable).toBe(ULTIMO);
        expect(await prisma.miembroOrganizacion.count({ where: { organizacionId: acme, estado: 'vigente', administrador: true } })).toBe(1);
      }
    });
  });

  describe('administracion.alta-con-contrasena-una-vez', () => {
    it('crea una cuenta propia con el primer ingreso pendiente, y la contraseña temporal se ve una sola vez', async () => {
      const p = await proponer('administracion.alta_cuenta', { correo: 'Lucia@Acme.test', plan: 'empresarial' });
      expect(p.vistaConfirmacion.datos).toContainEqual({ etiqueta: 'Correo', valor: 'lucia@acme.test' });
      expect(await prisma.perfilUsuario.count({ where: { correo: 'lucia@acme.test' } })).toBe(0);

      const hecha = OperacionRespuesta.parse(await confirmar(p.id));
      const temporal = hecha.efimero!.contrasenaTemporal;
      expect(temporal).toHaveLength(16);
      expect(OperacionRespuesta.parse(await confirmar(p.id)).efimero).toBeUndefined();
      expect(JSON.stringify((await prisma.operacion.findUniqueOrThrow({ where: { id: p.id } })).resultado)).not.toContain(temporal);

      expect((await personas()).find((x) => x.correo === 'lucia@acme.test')).toMatchObject({ clase: 'propia', estado: 'primer_ingreso_pendiente', plan: 'empresarial', administrador: false });
      const ingreso = IngresoRespuesta.parse((await entrar('lucia@acme.test', temporal).expect(200)).body);
      expect(ingreso.primerIngresoPendiente).toBe(true);
    });

    it('si el correo ya tiene cuenta, no crea nada y ofrece invitarla, sin decir de dónde es', async () => {
      const vasco = await afiliada();
      await prisma.miembroOrganizacion.deleteMany({ where: { perfilId: vasco.perfilId } });
      const p = await proponer('administracion.alta_cuenta', { correo: vasco.correo, plan: 'empresarial' });
      expect(p.vistaConfirmacion.confirmable).toBe(false);
      expect(p.vistaConfirmacion.motivoNoConfirmable).toMatch(/ya tiene una cuenta.*invitar/);
      expect(JSON.stringify(p)).not.toMatch(/Personal \d|personal/);
      await confirmar(p.id, 409);
      expect(await prisma.perfilUsuario.count()).toBe(2);
    });
  });

  describe('administracion.cambio-de-plan', () => {
    it('el plan cambia solo al confirmar, y la cuenta lo ve desde su siguiente acceso', async () => {
      const beto = await propia({ plan: 'personal' });
      const p = await proponer('administracion.cambiar_plan', { perfilId: beto.perfilId, plan: 'empresarial' });
      expect(p.vistaConfirmacion.datos).toEqual(expect.arrayContaining([{ etiqueta: 'Plan actual', valor: 'Personal' }, { etiqueta: 'Plan nuevo', valor: 'Empresarial' }]));
      await http().post(`/administracion/operaciones/${p.id}/descartar`).set('Authorization', zona).expect(200);
      expect((await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: beto.perfilId } })).plan).toBe('personal');

      await hacer('administracion.cambiar_plan', { perfilId: beto.perfilId, plan: 'empresarial' });
      expect(IngresoRespuesta.parse((await entrar(beto.correo).expect(200)).body).plan).toBe('empresarial');
      const igual = await proponer('administracion.cambiar_plan', { perfilId: beto.perfilId, plan: 'empresarial' });
      expect(igual.vistaConfirmacion.confirmable).toBe(false);
    });
  });

  describe('administracion.suspension-cierra-sesiones', () => {
    it('suspender cierra sus sesiones y no la deja entrar; reactivar la deja entrar como antes', async () => {
      const beto = await propia();
      const sesion = IngresoRespuesta.parse((await entrar(beto.correo).expect(200)).body);
      await hacer('administracion.suspender_cuenta', { perfilId: beto.perfilId });

      await http().get('/perfil').set('Authorization', `Bearer ${sesion.tokenAcceso}`).expect(401);
      await http().post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion }).expect(401);
      expect(await prisma.sesionRenovacion.count({ where: { perfilId: beto.perfilId, revocadaEn: null } })).toBe(0);
      expect(ErrorApi.parse((await entrar(beto.correo).expect(403)).body).codigo).toBe('CUENTA_SUSPENDIDA');

      await hacer('administracion.reactivar_cuenta', { perfilId: beto.perfilId });
      await entrar(beto.correo).expect(200);
    });
  });

  describe('administracion.baja-definitiva', () => {
    it('dar de baja dice que no se deshace, cierra la cuenta para siempre, la saca de sus equipos y no borra nada', async () => {
      const beto = await propia();
      const ventas = await prisma.equipo.create({ data: { organizacionId: acme, nombre: 'Ventas' } });
      await prisma.miembroEquipo.create({ data: { organizacionId: acme, equipoId: ventas.id, perfilId: beto.perfilId, responsable: true } });

      const p = await proponer('administracion.cerrar_cuenta', { perfilId: beto.perfilId });
      expect(p.vistaConfirmacion.irreversible).toMatch(/No se puede deshacer/);
      OperacionRespuesta.parse(await confirmar(p.id));

      expect(ErrorApi.parse((await entrar(beto.correo).expect(403)).body).codigo).toBe('CUENTA_CERRADA');
      const reactivar = await proponer('administracion.reactivar_cuenta', { perfilId: beto.perfilId });
      expect(reactivar.vistaConfirmacion.confirmable).toBe(false);
      expect(await prisma.miembroEquipo.count({ where: { perfilId: beto.perfilId } })).toBe(0);
      expect(await prisma.perfilUsuario.count({ where: { id: beto.perfilId } })).toBe(1);
      expect((await personas()).find((x) => x.perfilId === beto.perfilId)?.estado).toBe('cerrada');
    });
  });

  describe('administracion.restablecer-contrasena', () => {
    it('da una temporal una sola vez, la anterior deja de valer, se cierran sus sesiones y conserva su zona', async () => {
      const beto = await propia();
      const sesion = IngresoRespuesta.parse((await entrar(beto.correo).expect(200)).body);
      const hecha = await hacer('administracion.restablecer_contrasena', { perfilId: beto.perfilId });
      const temporal = hecha.efimero!.contrasenaTemporal;

      await http().post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion }).expect(401);
      await entrar(beto.correo).expect(401);
      const nueva = IngresoRespuesta.parse((await entrar(beto.correo, temporal).expect(200)).body);
      expect(nueva.primerIngresoPendiente).toBe(true);
      expect((await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: beto.perfilId } })).zonaHoraria).toBe('America/Lima');
    });
  });

  describe('administracion.cuenta-afiliada-no-se-administra', () => {
    it('plan, suspensión, baja y contraseña de una afiliada se rechazan sin hacer nada, y se ofrece quitarla de la organización', async () => {
      const vasco = await afiliada();
      for (const [tipo, carga] of [
        ['administracion.cambiar_plan', { perfilId: vasco.perfilId, plan: 'gratuito' }],
        ['administracion.suspender_cuenta', { perfilId: vasco.perfilId }],
        ['administracion.cerrar_cuenta', { perfilId: vasco.perfilId }],
        ['administracion.restablecer_contrasena', { perfilId: vasco.perfilId }],
      ] as const) {
        const p = await proponer(tipo, carga);
        expect([tipo, p.vistaConfirmacion.motivoNoConfirmable]).toEqual([tipo, AFILIADA]);
        await confirmar(p.id, 409);
      }
      const perfil = await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: vasco.perfilId } });
      expect([perfil.plan, perfil.estado]).toEqual(['personal', 'activa']);
      await entrar(vasco.correo).expect(200);
    });
  });

  describe('administracion.toda-accion-confirmada-y-registrada', () => {
    it('cada acción confirmada deja registro en la empresa con quién, sobre quién y qué cambió; nunca la contraseña', async () => {
      const beto = await propia({ plan: 'personal' });
      const alta = await hacer('administracion.alta_cuenta', { correo: 'lucia@acme.test', plan: 'empresarial' });
      await hacer('administracion.cambiar_plan', { perfilId: beto.perfilId, plan: 'empresarial' });
      await hacer('administracion.suspender_cuenta', { perfilId: beto.perfilId });
      await hacer('administracion.reactivar_cuenta', { perfilId: beto.perfilId });
      const restablecida = await hacer('administracion.restablecer_contrasena', { perfilId: beto.perfilId });
      await hacer('administracion.nombrar_administrador', { perfilId: beto.perfilId });
      await hacer('administracion.quitar_administrador', { perfilId: beto.perfilId });
      await hacer('administracion.cerrar_cuenta', { perfilId: beto.perfilId });

      const eventos = await prisma.eventoAuditoria.findMany({ where: { organizacionId: acme, accion: { startsWith: 'administracion.' } }, orderBy: { ocurridoEn: 'asc' } });
      expect(eventos.map((e) => e.accion)).toEqual([
        'administracion.cuenta-creada',
        'administracion.plan-cambiado',
        'administracion.cuenta-suspendida',
        'administracion.cuenta-reactivada',
        'administracion.contrasena-restablecida',
        'administracion.administrador-nombrado',
        'administracion.administrador-retirado',
        'administracion.cuenta-cerrada',
      ]);
      expect(eventos.every((e) => e.perfilId === ana)).toBe(true);
      expect(eventos.slice(1).every((e) => (e.detalle as { perfilAfectado?: string }).perfilAfectado === beto.perfilId)).toBe(true);
      expect(eventos[1]!.detalle).toMatchObject({ antes: { plan: 'personal' }, despues: { plan: 'empresarial' } });
      const todo = JSON.stringify(eventos);
      expect(todo).not.toContain(alta.efimero!.contrasenaTemporal);
      expect(todo).not.toContain(restablecida.efimero!.contrasenaTemporal);
    });
  });

  describe('administracion.no-escribe-en-lo-personal', () => {
    it('ninguna acción del área sobre una cuenta afiliada toca una sola fila de su organización personal', async () => {
      const vasco = await afiliada();
      // Algo suyo en su organización: una Operación, un permiso de Google y una conversación
      await prisma.operacion.create({ data: { organizacionId: vasco.organizacionId, perfilId: vasco.perfilId, tipo: 'agenda.registrar', origen: 'agente', carga: {}, vistaConfirmacion: {}, estado: 'ejecutada' } });
      await prisma.consentimientoIntegracion.create({ data: { organizacionId: vasco.organizacionId, perfilId: vasco.perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
      await prisma.conversacionAgente.create({ data: { organizacionId: vasco.organizacionId, perfilId: vasco.perfilId, estado: 'abierta' } });

      const foto = async () => {
        const filas: Record<string, unknown> = {};
        for (const modelo of ['Organizacion', ...MODELOS_CON_ORGANIZACION]) {
          const delegado = (prisma as unknown as Record<string, { findMany(a: object): Promise<unknown[]> }>)[modelo[0]!.toLowerCase() + modelo.slice(1)]!;
          filas[modelo] = await delegado.findMany({ where: modelo === 'Organizacion' ? { id: vasco.organizacionId } : { organizacionId: vasco.organizacionId } });
        }
        return JSON.stringify(filas);
      };
      const antes = await foto();

      for (const [tipo, carga] of [
        ['administracion.cambiar_plan', { perfilId: vasco.perfilId, plan: 'gratuito' }],
        ['administracion.suspender_cuenta', { perfilId: vasco.perfilId }],
        ['administracion.reactivar_cuenta', { perfilId: vasco.perfilId }],
        ['administracion.cerrar_cuenta', { perfilId: vasco.perfilId }],
        ['administracion.restablecer_contrasena', { perfilId: vasco.perfilId }],
        ['administracion.nombrar_administrador', { perfilId: vasco.perfilId }],
        ['administracion.quitar_administrador', { perfilId: vasco.perfilId }],
        ['administracion.alta_cuenta', { correo: vasco.correo, plan: 'empresarial' }],
      ] as const) {
        const p = await proponer(tipo, carga);
        await http().post(`/administracion/operaciones/${p.id}/confirmar`).set('Authorization', zona);
      }
      await personas();

      expect(await foto()).toBe(antes);
      // Lo que sí cambió vive en la empresa: su pertenencia, administradora y después no
      expect((await prisma.miembroOrganizacion.findFirstOrThrow({ where: { perfilId: vasco.perfilId } })).administrador).toBe(false);
      expect(await prisma.eventoAuditoria.count({ where: { organizacionId: acme, accion: 'administracion.administrador-nombrado' } })).toBe(1);
    });
  });
});
