import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { altaDeArranque, crearCuenta, crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, ejecutarSql, vaciarTablas } from '../utilidades/base-prueba';

// T-058 · REQ-ADM-01, REQ-ADM-03, REQ-ADM-04 · specs/08-administracion/plan.md §3

const MIGRACION = resolve(__dirname, '../../prisma/migrations/20261107T0300_administracion/migration.sql');
// La parte de la migración que reparte los datos existentes (plan §3.3), para ejecutarla sobre datos de antes
const migracionDeDatos = () => readFileSync(MIGRACION, 'utf8').split('-- Migración de los datos existentes')[1]!.split('\n').slice(1).join('\n');

describe('T-058 · clases de organización, pertenencia y equipos', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(vaciarTablas);

  describe('administracion.clases-de-organizacion', () => {
    it('una organización personal tiene una sola cuenta, sin pertenencia ni administradores', async () => {
      const organizacionId = await crearOrganizacion(prisma, 'Vasco', 'personal');
      const { perfilId } = await crearCuenta(prisma, { organizacionId, correo: 'vasco@correo.test', rol: 'usuario_personal', plan: 'personal' });

      expect((await prisma.organizacion.findUniqueOrThrow({ where: { id: organizacionId } })).tipo).toBe('personal');
      expect((await prisma.perfilUsuario.findUniqueOrThrow({ where: { id: perfilId } })).estado).toBe('activa');
      expect(await prisma.miembroOrganizacion.count()).toBe(0);
      await expect(crearCuenta(prisma, { organizacionId, correo: 'otra@correo.test', rol: 'usuario_personal', plan: 'personal' })).rejects.toThrow(/una sola cuenta/);
      expect(await prisma.perfilUsuario.count()).toBe(1);
    });

    it('en una organización de empresa cada cuenta nace con su pertenencia propia y vigente', async () => {
      const organizacionId = await crearOrganizacion(prisma, 'Acme', 'empresa');
      for (const correo of ['ana@acme.test', 'beto@acme.test', 'carla@acme.test']) {
        await crearCuenta(prisma, { organizacionId, correo, rol: 'colaborador', plan: 'empresarial', administrador: correo === 'ana@acme.test' });
      }
      const pertenencias = await prisma.miembroOrganizacion.findMany({ include: { perfil: true }, orderBy: { perfil: { correo: 'asc' } } });
      expect(pertenencias.map((m) => [m.perfil.correo, m.organizacionId, m.origen, m.estado, m.administrador])).toEqual([
        ['ana@acme.test', organizacionId, 'alta', 'vigente', true],
        ['beto@acme.test', organizacionId, 'alta', 'vigente', false],
        ['carla@acme.test', organizacionId, 'alta', 'vigente', false],
      ]);
    });

    it('un perfil no puede tener dos pertenencias vigentes, ni un equipo dos responsables', async () => {
      const acme = await crearOrganizacion(prisma, 'Acme', 'empresa');
      const otra = await crearOrganizacion(prisma, 'Otra', 'empresa');
      const { perfilId } = await crearCuenta(prisma, { organizacionId: acme, correo: 'ana@acme.test', rol: 'gerente', plan: 'empresarial' });
      await expect(
        prisma.miembroOrganizacion.create({ data: { organizacionId: otra, perfilId, origen: 'afiliacion', estado: 'vigente' } }),
      ).rejects.toThrow();
      // Una invitación pendiente en otra empresa sí puede existir (REQ-ADM-24)
      await prisma.miembroOrganizacion.create({ data: { organizacionId: otra, perfilId, origen: 'afiliacion', estado: 'invitada' } });

      const beto = (await crearCuenta(prisma, { organizacionId: acme, correo: 'beto@acme.test', rol: 'gerente', plan: 'empresarial' })).perfilId;
      const ventas = await prisma.equipo.create({ data: { organizacionId: acme, nombre: 'Ventas' } });
      await prisma.miembroEquipo.create({ data: { organizacionId: acme, equipoId: ventas.id, perfilId, responsable: true } });
      await expect(prisma.miembroEquipo.create({ data: { organizacionId: acme, equipoId: ventas.id, perfilId: beto, responsable: true } })).rejects.toThrow();
      await expect(prisma.equipo.create({ data: { organizacionId: acme, nombre: 'Ventas' } })).rejects.toThrow();
    });

    it('la migración reparte los datos de antes: empresa con varias cuentas o con el Plan Empresarial, y siempre con administrador', async () => {
      // Datos como los dejaba la versión anterior: organizaciones sin tipo y cuentas sin pertenencia
      const dev = await crearOrganizacion(prisma, 'Desarrollo');
      const sola = await crearOrganizacion(prisma, 'Sola');
      const solaEmpresarial = await crearOrganizacion(prisma, 'Sola empresarial');
      const sinGerente = await crearOrganizacion(prisma, 'Sin gerente');
      const alta = async (organizacionId: string, correo: string, rol: 'usuario_personal' | 'gerente' | 'colaborador', plan: 'personal' | 'empresarial') => {
        const { perfilId } = await crearCuenta(prisma, { organizacionId, correo, rol, plan });
        await new Promise((r) => setTimeout(r, 5));
        return perfilId;
      };
      await alta(dev, 'personal@dev.test', 'usuario_personal', 'personal');
      const gerente = await alta(dev, 'gerente@dev.test', 'gerente', 'empresarial');
      await alta(dev, 'gerente2@dev.test', 'gerente', 'empresarial');
      await alta(sola, 'sola@dev.test', 'usuario_personal', 'personal');
      const unica = await alta(solaEmpresarial, 'unica@dev.test', 'colaborador', 'empresarial');
      const masAntigua = await alta(sinGerente, 'a@dev.test', 'colaborador', 'personal');
      await alta(sinGerente, 'b@dev.test', 'colaborador', 'personal');
      await ejecutarSql(`TRUNCATE miembro_organizacion; UPDATE organizacion SET tipo = 'empresa';`);

      await ejecutarSql(migracionDeDatos());

      const tipos = Object.fromEntries((await prisma.organizacion.findMany()).map((o) => [o.nombre, o.tipo]));
      expect(tipos).toEqual({ Desarrollo: 'empresa', Sola: 'personal', 'Sola empresarial': 'empresa', 'Sin gerente': 'empresa' });
      const pertenencias = await prisma.miembroOrganizacion.findMany({ include: { perfil: true } });
      expect(pertenencias).toHaveLength(6);
      expect(pertenencias.every((m) => m.origen === 'alta' && m.estado === 'vigente' && m.organizacionId === m.perfil.organizacionId)).toBe(true);
      expect(pertenencias.filter((m) => m.administrador).map((m) => m.perfilId).sort()).toEqual([gerente, unica, masAntigua].sort());
      expect(await prisma.perfilUsuario.count({ where: { estado: { not: 'activa' } } })).toBe(0);
    });
  });

  describe('administracion.primer-administrador-en-el-arranque', () => {
    it('una empresa nueva nace con su primera cuenta como administradora', async () => {
      const { organizacionId, cuenta } = await altaDeArranque(prisma, { nuevaOrganizacion: 'Acme', correo: 'ana@acme.test', rol: 'gerente', plan: 'empresarial' });
      expect((await prisma.organizacion.findUniqueOrThrow({ where: { id: organizacionId } })).tipo).toBe('empresa');
      const pertenencia = await prisma.miembroOrganizacion.findFirstOrThrow({ where: { perfilId: cuenta.perfilId } });
      expect([pertenencia.organizacionId, pertenencia.estado, pertenencia.administrador]).toEqual([organizacionId, 'vigente', true]);

      // La siguiente cuenta de esa empresa no lo es salvo que se indique
      const segunda = await altaDeArranque(prisma, { organizacionId, correo: 'beto@acme.test', rol: 'colaborador', plan: 'empresarial' });
      expect((await prisma.miembroOrganizacion.findFirstOrThrow({ where: { perfilId: segunda.cuenta.perfilId } })).administrador).toBe(false);
    });

    it('una cuenta Personal nueva vive sola en su organización personal', async () => {
      const { organizacionId, cuenta } = await altaDeArranque(prisma, { nuevaOrganizacion: 'Vasco', correo: 'vasco@correo.test', rol: 'usuario_personal', plan: 'personal' });
      expect((await prisma.organizacion.findUniqueOrThrow({ where: { id: organizacionId } })).tipo).toBe('personal');
      expect(await prisma.miembroOrganizacion.count({ where: { perfilId: cuenta.perfilId } })).toBe(0);
    });

    it('administrador en una organización personal se rechaza antes de crear nada', async () => {
      await expect(
        altaDeArranque(prisma, { nuevaOrganizacion: 'Vasco', administrador: true, correo: 'vasco@correo.test', rol: 'usuario_personal', plan: 'personal' }),
      ).rejects.toThrow(/organización de empresa/);
      await expect(
        altaDeArranque(prisma, { nuevaOrganizacion: 'Mal', tipo: 'empresa', correo: 'no-es-correo', rol: 'gerente', plan: 'empresarial' }),
      ).rejects.toThrow();
      expect(await prisma.organizacion.count()).toBe(0);
      expect(await prisma.perfilUsuario.count()).toBe(0);
    });
  });
});
