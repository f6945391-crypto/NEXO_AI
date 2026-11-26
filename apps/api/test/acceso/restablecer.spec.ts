import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { DURACION_ENLACE_MS } from '../../src/identidad/restablecimiento.service';
import { CorreoSimulado } from '../../src/plataforma/correo/correo-simulado';
import { ENVIADOR_CORREO } from '../../src/plataforma/correo/enviador-correo';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// REQ-ACC-19 · T-123 · specs/06-acceso/plan.md §5.8 · H-ACC-11, 12 y 13. Un caso por perfil: Personal,
// Empresarial (colaborador) y administrador, cuya sesión de la zona de empresa también se cierra.
const ACTUAL = 'la-contrasena-de-siempre';
const NUEVA = 'una-contrasena-nueva-y-larga';
const correo = new CorreoSimulado();

describe('acceso.restablecer', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const pedir = (direccion: string) => http().post('/auth/restablecer').send({ correo: direccion });
  const confirmar = (token: string, nueva = NUEVA) => http().post('/auth/restablecer/confirmar').send({ token, nueva });
  const ingresar = (direccion: string, contrasena: string) => http().post('/auth/ingreso').send({ correo: direccion, contrasena });
  // El correo sale sin esperarlo: se espera a que llegue al simulado
  async function enlaceDe(direccion: string): Promise<string> {
    for (let i = 0; i < 50; i++) {
      const ultimo = [...correo.enviados].reverse().find((c) => c.para === direccion);
      const token = ultimo?.texto.match(/restablecer\?token=([A-Za-z0-9_-]+)/)?.[1];
      if (token) return token;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`No llegó el correo a ${direccion}`);
  }
  const esperarEnvios = () => new Promise((r) => setTimeout(r, 100));

  async function cuenta(tipo: 'personal' | 'empresa', extra: { rol?: 'usuario_personal' | 'gerente' | 'colaborador'; plan?: 'personal' | 'empresarial'; administrador?: boolean } = {}) {
    const organizacionId = await crearOrganizacion(prisma, `Organización ${++n}`, tipo);
    const direccion = `restablecer${n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(
      prisma,
      { organizacionId, correo: direccion, rol: extra.rol ?? 'usuario_personal', plan: extra.plan ?? 'personal', ...(extra.administrador ? { administrador: true } : {}) },
      ACTUAL,
    );
    return { direccion, perfilId, organizacionId };
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ENVIADOR_CORREO).useValue(correo).compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    correo.reiniciar();
  });

  it('un correo sin cuenta recibe la misma respuesta y no sale nada', async () => {
    await pedir('nadie@nexoai.test').expect(204);
    await esperarEnvios();
    expect(correo.enviados).toHaveLength(0);
    expect(await prisma.restablecimientoContrasena.count()).toBe(0);
  });

  it('Plan Personal · el enlace cambia la contraseña, cierra las sesiones y queda en la auditoría', async () => {
    const { direccion, perfilId } = await cuenta('personal');
    const sesion = IngresoRespuesta.parse((await ingresar(direccion, ACTUAL).expect(200)).body);

    await pedir(direccion).expect(204);
    const token = await enlaceDe(direccion);
    const enviado = correo.enviados.at(-1)!;
    // H-ACC-13: asunto, enlace con la web, texto y HTML
    expect(enviado.asunto).toBe('Restablece tu contraseña de NexoAI');
    expect(enviado.texto).toContain('/restablecer?token=');
    expect(enviado.texto).toContain('30 minutos');
    expect(enviado.html).toContain(`token=${token}`);
    // Solo se guarda el hash
    const fila = await prisma.restablecimientoContrasena.findFirstOrThrow({ where: { perfilId } });
    expect(fila.hashToken).not.toContain(token);

    await confirmar(token).expect(204);
    await ingresar(direccion, ACTUAL).expect(401);
    await ingresar(direccion, NUEVA).expect(200);
    // La sesión anterior ya no se renueva
    await http().post('/auth/renovar').send({ tokenRenovacion: sesion.tokenRenovacion }).expect(401);
    const acciones = (await prisma.eventoAuditoria.findMany({ where: { perfilId } })).map((e) => e.accion);
    expect(acciones).toEqual(expect.arrayContaining(['contrasena.restablecimiento-pedido', 'contrasena.restablecida']));
  });

  it('un enlace sirve una vez; uno vencido o inventado falla con el mismo mensaje', async () => {
    const { direccion, perfilId } = await cuenta('personal');
    await pedir(direccion).expect(204);
    const token = await enlaceDe(direccion);
    await confirmar(token).expect(204);

    const usado = ErrorApi.parse((await confirmar(token, 'otra-contrasena-larga-1').expect(400)).body);
    expect(usado.codigo).toBe('ENLACE_NO_VALIDO');
    const inventado = ErrorApi.parse((await confirmar('x'.repeat(43)).expect(400)).body);
    expect(inventado).toEqual(usado);

    await pedir(direccion).expect(204);
    const otro = await enlaceDe(direccion);
    await prisma.restablecimientoContrasena.updateMany({ where: { perfilId, usadoEn: null }, data: { venceEn: new Date(Date.now() - 1) } });
    expect(ErrorApi.parse((await confirmar(otro).expect(400)).body)).toEqual(usado);
    expect(DURACION_ENLACE_MS).toBe(30 * 60 * 1000);
  });

  it('pedir otro deja sin efecto el anterior', async () => {
    const { direccion } = await cuenta('personal');
    await pedir(direccion).expect(204);
    const primero = await enlaceDe(direccion);
    await pedir(direccion).expect(204);
    let segundo = await enlaceDe(direccion);
    for (let i = 0; segundo === primero && i < 50; i++) {
      await new Promise((r) => setTimeout(r, 20));
      segundo = await enlaceDe(direccion);
    }
    expect(segundo).not.toBe(primero);
    await confirmar(primero).expect(400);
    await confirmar(segundo).expect(204);
  });

  it('Plan Empresarial · un colaborador lo restablece igual', async () => {
    const { direccion } = await cuenta('empresa', { rol: 'colaborador', plan: 'empresarial' });
    await pedir(direccion).expect(204);
    await confirmar(await enlaceDe(direccion)).expect(204);
    await ingresar(direccion, NUEVA).expect(200);
  });

  it('administrador · se cierra también su sesión de la zona de empresa', async () => {
    const { direccion } = await cuenta('empresa', { rol: 'gerente', plan: 'empresarial', administrador: true });
    const zona = IngresoRespuesta.parse((await http().post('/administracion/entrar').send({ correo: direccion, contrasena: ACTUAL }).expect(200)).body);
    await pedir(direccion).expect(204);
    await confirmar(await enlaceDe(direccion)).expect(204);
    await http().post('/auth/renovar').send({ tokenRenovacion: zona.tokenRenovacion }).expect(401);
    await http().post('/administracion/entrar').send({ correo: direccion, contrasena: NUEVA }).expect(200);
  });

  it('H-ACC-11 · una cuenta suspendida no recibe nada y su enlace anterior ya no sirve', async () => {
    const { direccion, perfilId } = await cuenta('empresa', { rol: 'colaborador', plan: 'empresarial' });
    await pedir(direccion).expect(204);
    const token = await enlaceDe(direccion);
    await prisma.perfilUsuario.update({ where: { id: perfilId }, data: { estado: 'suspendida' } });
    correo.reiniciar();
    await pedir(direccion).expect(204);
    await esperarEnvios();
    expect(correo.enviados).toHaveLength(0);
    expect(ErrorApi.parse((await confirmar(token).expect(400)).body).codigo).toBe('ENLACE_NO_VALIDO');
  });

  it('H-ACC-12 · si el primer ingreso estaba pendiente, sigue pendiente', async () => {
    const { direccion, perfilId } = await cuenta('personal');
    await prisma.perfilUsuario.update({ where: { id: perfilId }, data: { debeCambiarContrasena: true } });
    await pedir(direccion).expect(204);
    await confirmar(await enlaceDe(direccion)).expect(204);
    expect((await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: perfilId } })).debeCambiarContrasena).toBe(true);
  });

  it('la contraseña nueva necesita 12 caracteres, y pedir tiene el límite del ingreso', async () => {
    const { direccion } = await cuenta('personal');
    await pedir(direccion).expect(204);
    await confirmar(await enlaceDe(direccion), 'corta').expect(400);
    let ultimo = 0;
    for (let i = 0; i < 6; i++) ultimo = (await pedir('limite@nexoai.test')).status;
    expect(ultimo).toBe(429);
  });
});
