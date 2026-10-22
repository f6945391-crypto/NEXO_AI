import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { verificarContrasena } from '../../src/identidad/contrasenas';
import { crearCuenta, crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, vaciarTablas } from '../utilidades/base-prueba';
import { listarRutas } from '../utilidades/rutas';

// REQ-ACC-01 · T-002: las cuentas se crean en el sistema con su rol; no hay registro abierto.
describe('acceso.sin-registro-abierto', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

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

  beforeEach(vaciarTablas);

  it('ninguna ruta de escritura de la API trata de cuentas, registro o usuarios', () => {
    const sospechosas = listarRutas(app).filter(
      (r) => r.metodo !== 'GET' && /registr|cuenta|usuario|signup|alta/i.test(r.ruta),
    );
    expect(sospechosas).toEqual([]);
  });

  it('pedir un registro por las rutas habituales no crea ningún perfil', async () => {
    const cuerpo = { correo: 'intruso@nexoai.test', contrasena: 'una-contrasena-larga', rol: 'gerente' };
    for (const ruta of ['/registro', '/auth/registro', '/cuentas', '/usuarios', '/perfil']) {
      await request(app.getHttpServer()).post(ruta).send(cuerpo).expect(404);
    }
    expect(await prisma.perfilUsuario.count()).toBe(0);
  });

  it('el alta por script crea la cuenta con su rol, contraseña temporal cifrada y primer ingreso pendiente', async () => {
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const cuenta = await crearCuenta(prisma, {
      organizacionId,
      correo: 'Maria.Quispe@NexoAI.test',
      rol: 'gerente',
      plan: 'empresarial',
    });

    const perfil = await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: cuenta.perfilId } });
    expect(perfil.correo).toBe('maria.quispe@nexoai.test');
    expect(perfil.rol).toBe('gerente');
    expect(perfil.plan).toBe('empresarial');
    expect(perfil.debeCambiarContrasena).toBe(true);
    expect(perfil.zonaHoraria).toBeNull();
    expect(perfil.hashContrasena).toMatch(/^\$argon2id\$/);
    expect(perfil.hashContrasena).not.toContain(cuenta.contrasenaTemporal);
    expect(await verificarContrasena(perfil.hashContrasena, cuenta.contrasenaTemporal)).toBe(true);

    const auditoria = await prisma.eventoAuditoria.findMany({ where: { perfilId: perfil.id } });
    expect(auditoria.map((e) => e.accion)).toEqual(['cuenta.creada']);
  });

  it('el alta rechaza un rol que no existe', async () => {
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    await expect(
      crearCuenta(prisma, { organizacionId, correo: 'x@nexoai.test', rol: 'administrador' as never, plan: 'personal' }),
    ).rejects.toThrow();
    expect(await prisma.perfilUsuario.count()).toBe(0);
  });
});
