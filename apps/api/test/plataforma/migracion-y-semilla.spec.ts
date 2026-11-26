import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { CUENTAS_DESARROLLO, ORGANIZACION_DESARROLLO, sembrar } from '../../src/plataforma/semilla';
import { clientePrueba, vaciarTablas } from '../utilidades/base-prueba';

// T-002. La migración sobre base vacía la ejecuta test/preparar-base.ts antes de cualquier prueba:
// si fallara, ninguna prueba llegaría a correr.
describe('plataforma.migracion-y-semilla', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(vaciarTablas);

  it('las migraciones dejan las tablas de la fase 1 consultables', async () => {
    expect(await prisma.organizacion.count()).toBe(0);
    expect(await prisma.perfilUsuario.count()).toBe(0);
    expect(await prisma.eventoAuditoria.count()).toBe(0);
    expect(await prisma.sesionRenovacion.count()).toBe(0);
  });

  it('la semilla deja una organización y sus cuentas de desarrollo', async () => {
    expect(await sembrar(prisma)).toEqual({ creadas: CUENTAS_DESARROLLO.length });

    const organizaciones = await prisma.organizacion.findMany();
    const perfiles = await prisma.perfilUsuario.findMany({ orderBy: { correo: 'asc' } });
    expect(organizaciones.map((o) => o.nombre)).toEqual([ORGANIZACION_DESARROLLO]);
    expect(perfiles.map((p) => [p.correo, p.rol])).toEqual(
      CUENTAS_DESARROLLO.map((c) => [c.correo, c.rol]).sort(),
    );
    expect(perfiles.every((p) => p.organizacionId === organizaciones[0]!.id)).toBe(true);
    // T-058 · REQ-ADM-03: es una empresa y gerente@nexoai.test la administra
    expect(organizaciones[0]!.tipo).toBe('empresa');
    const administradores = await prisma.miembroOrganizacion.findMany({ where: { administrador: true }, include: { perfil: true } });
    expect(administradores.map((m) => m.perfil.correo)).toEqual(['gerente@nexoai.test']);
  });

  it('la semilla es idempotente', async () => {
    await sembrar(prisma);
    expect(await sembrar(prisma)).toEqual({ creadas: 0 });
    expect(await prisma.perfilUsuario.count()).toBe(CUENTAS_DESARROLLO.length);
  });
});
