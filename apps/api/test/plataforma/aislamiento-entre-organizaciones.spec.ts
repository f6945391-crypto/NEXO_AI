import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearCuenta, crearOrganizacion } from '../../src/identidad/alta-cuentas';
import {
  aislarPorOrganizacion,
  ErrorDeAislamiento,
  MODELOS_CON_ORGANIZACION,
  type PrismaDeOrganizacion,
} from '../../src/plataforma/aislamiento';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, vaciarTablas } from '../utilidades/base-prueba';

// P-04 · T-003: con el contexto de la organización A no se lee ni se escribe nada de la B, en ninguna tabla.

type Fila = { id: string; organizacionId?: string; [campo: string]: unknown };
type Delegado = {
  findMany(args?: object): Promise<Fila[]>;
  findFirst(args?: object): Promise<Fila | null>;
  findUnique(args: object): Promise<Fila | null>;
  count(args?: object): Promise<number>;
};

const delegadoDe = (cliente: object, modelo: string): Delegado =>
  (cliente as Record<string, Delegado>)[modelo[0]!.toLowerCase() + modelo.slice(1)]!;

const campoDe = (modelo: string) => (modelo === 'Organizacion' ? 'id' : 'organizacionId');
// Clave primaria: `id` en todas salvo la sincronización del calendario, que tiene una fila por perfil (T-014).
const claveDe = (modelo: string) => (modelo === 'SincronizacionCalendario' ? 'perfilId' : 'id');

const TODOS = ['Organizacion', ...MODELOS_CON_ORGANIZACION];

describe('plataforma.aislamiento-entre-organizaciones', () => {
  let base: PrismaClient;
  let deA: PrismaDeOrganizacion;
  let orgA: string;
  let orgB: string;
  let perfilA: string;
  let perfilB: string;

  beforeAll(() => {
    base = clientePrueba();
  });

  afterAll(async () => {
    await base.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    orgA = await crearOrganizacion(base, 'Organización A');
    orgB = await crearOrganizacion(base, 'Organización B');
    perfilA = (await crearCuenta(base, { organizacionId: orgA, correo: 'a@nexoai.test', rol: 'gerente', plan: 'empresarial' })).perfilId;
    perfilB = (await crearCuenta(base, { organizacionId: orgB, correo: 'b@nexoai.test', rol: 'gerente', plan: 'empresarial' })).perfilId;
    // Una operación por organización, para cubrir también esa tabla (T-012).
    for (const [organizacionId, perfilId] of [[orgA, perfilA], [orgB, perfilB]] as const) {
      await base.operacion.create({
        data: {
          organizacionId,
          perfilId,
          tipo: 'prueba',
          origen: 'agente',
          carga: {},
          vistaConfirmacion: {},
          estado: 'propuesta',
        },
      });
      // Y un permiso de Google por organización (T-007).
      await base.consentimientoIntegracion.create({
        data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
      });
      // Y un evento de la réplica de la agenda con su sincronización (T-014).
      const ahora = new Date();
      await base.eventoAgenda.create({
        data: {
          organizacionId,
          perfilId,
          googleCalendarioId: 'primary',
          googleEventoId: `evento-${perfilId}`,
          etag: '"1"',
          titulo: 'Reunión',
          inicio: ahora,
          fin: ahora,
          zonaHoraria: 'America/Lima',
          todoElDia: false,
          esOrganizador: true,
          estado: 'confirmado',
          sincronizadoEn: ahora,
        },
      });
      await base.sincronizacionCalendario.create({
        data: { organizacionId, perfilId, ventanaDesde: ahora, ventanaHasta: ahora, ultimaSincronizacion: ahora },
      });
      // Y una conversación con el asistente, con una llamada al modelo y una herramienta (T-030).
      const conversacion = await base.conversacionAgente.create({ data: { organizacionId, perfilId, estado: 'abierta' } });
      const llamada = await base.llamadaModelo.create({
        data: { organizacionId, perfilId, conversacionId: conversacion.id, proveedor: 'simulado', duracionMs: 1, intentos: 1, desenlace: 'ok' },
      });
      await base.invocacionHerramienta.create({
        data: {
          organizacionId,
          perfilId,
          conversacionId: conversacion.id,
          llamadaModeloId: llamada.id,
          idLlamada: 'llamada-1',
          herramienta: 'agenda.consultar',
          argumentos: {},
          duracionMs: 1,
        },
      });
      // Y el estado de su grafo (T-032)
      await base.puntoControlAgente.create({ data: { organizacionId, conversacionId: conversacion.id, datos: {} } });
      // Y su transcripción (T-038)
      await base.turnoTranscripcion.create({
        data: { id: randomUUID(), organizacionId, perfilId, conversacionId: conversacion.id, en: new Date(), tipo: 'texto', datos: {} },
      });
    }
    deA = aislarPorOrganizacion(base, orgA);
  });

  it('cubre toda tabla del esquema que tenga organizacionId', () => {
    const esquema = readFileSync(resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');
    const conOrganizacion = [...esquema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
      .filter(([, , cuerpo]) => /^\s+organizacionId\s/m.test(cuerpo!))
      .map(([, nombre]) => nombre);
    expect(conOrganizacion.sort()).toEqual([...MODELOS_CON_ORGANIZACION].sort());
  });

  it.each(TODOS)('%s: las lecturas solo devuelven filas propias', async (modelo) => {
    const campo = campoDe(modelo);
    const propias = await delegadoDe(base, modelo).count({ where: { [campo]: orgA } });
    const ajena = await delegadoDe(base, modelo).findFirst({ where: { [campo]: orgB } });
    expect(propias).toBeGreaterThan(0);
    expect(ajena).not.toBeNull();

    const delegado = delegadoDe(deA, modelo);
    const filas = await delegado.findMany();
    expect(filas).toHaveLength(propias);
    expect(filas.every((f) => (campo === 'id' ? f.id : f.organizacionId) === orgA)).toBe(true);
    expect(await delegado.count()).toBe(propias);
    const clave = claveDe(modelo);
    expect(await delegado.findUnique({ where: { [clave]: ajena![clave] } })).toBeNull();
    expect(await delegado.findFirst({ where: { [clave]: ajena![clave] } })).toBeNull();
  });

  it('una condición explícita sobre otra organización no se salta el filtro', async () => {
    expect(await deA.perfilUsuario.findMany({ where: { organizacionId: orgB } })).toEqual([]);
    expect(await deA.perfilUsuario.findMany({ where: { OR: [{ organizacionId: orgB }, { id: perfilB }] } })).toEqual([]);
  });

  it('las escrituras masivas solo alcanzan filas propias', async () => {
    const actualizadas = await deA.perfilUsuario.updateMany({ data: { debeCambiarContrasena: false } });
    expect(actualizadas.count).toBe(1);
    expect((await base.perfilUsuario.findUniqueOrThrow({ where: { id: perfilB } })).debeCambiarContrasena).toBe(true);

    const eventosDeB = await base.eventoAuditoria.count({ where: { organizacionId: orgB } });
    await deA.eventoAuditoria.deleteMany();
    expect(await base.eventoAuditoria.count({ where: { organizacionId: orgA } })).toBe(0);
    expect(await base.eventoAuditoria.count({ where: { organizacionId: orgB } })).toBe(eventosDeB);
  });

  it('una fila ajena no se puede actualizar ni borrar por su id', async () => {
    await expect(deA.perfilUsuario.update({ where: { id: perfilB }, data: { debeCambiarContrasena: false } })).rejects.toThrow();
    await expect(deA.perfilUsuario.delete({ where: { id: perfilB } })).rejects.toThrow();
    expect(await base.perfilUsuario.count({ where: { id: perfilB } })).toBe(1);
  });

  it('crear asigna la organización del contexto y rechaza cualquier otra', async () => {
    const creado = await deA.eventoAuditoria.create({ data: { accion: 'prueba' } as never });
    expect(creado.organizacionId).toBe(orgA);

    await expect(deA.eventoAuditoria.create({ data: { accion: 'prueba', organizacionId: orgB } })).rejects.toThrow(ErrorDeAislamiento);
    await expect(
      deA.eventoAuditoria.create({ data: { accion: 'prueba', organizacion: { connect: { id: orgB } } } as never }),
    ).rejects.toThrow(ErrorDeAislamiento);
    await expect(deA.organizacion.create({ data: { nombre: 'Otra' } })).rejects.toThrow(ErrorDeAislamiento);
  });

  it('una fila no puede cambiar de organización', async () => {
    await expect(deA.perfilUsuario.update({ where: { id: perfilA }, data: { organizacionId: orgB } })).rejects.toThrow(ErrorDeAislamiento);
    expect((await base.perfilUsuario.findUniqueOrThrow({ where: { id: perfilA } })).organizacionId).toBe(orgA);
  });

  it('el filtro también vale dentro de una transacción', async () => {
    const dentro = await deA.$transaction(async (tx) => tx.perfilUsuario.findMany());
    expect(dentro.map((p) => p.id)).toEqual([perfilA]);
  });
});
