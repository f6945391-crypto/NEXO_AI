import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AgendaModule } from '../../src/agenda/agenda.module';
import { ReplicaEventosRepositorio } from '../../src/agenda/replica-eventos.repositorio';
import { SincronizadorCalendario } from '../../src/agenda/sincronizador-calendario';
import { COLA_SINCRONIZACION, conexionRedis, TrabajadorCalendario } from '../../src/agenda/trabajador-calendario';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO, type Quien } from '../../src/integraciones/calendario/proveedor-calendario';
import { PlataformaModule } from '../../src/plataforma/plataforma.module';
import { PrismaService } from '../../src/plataforma/prisma.service';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-014 · REQ-CUN01-09, REQ-CUN01-10 · H-AG-03, H-AG-04, H-AG-06 · R-25

const AHORA = new Date('2026-10-22T15:00:00Z');
const DIA = 24 * 3600_000;
const calendario = new ProveedorCalendarioSimulado();

describe('T-014 · réplica y sincronización del calendario', () => {
  let modulo: TestingModule;
  let prisma: PrismaClient;
  let sincronizador: SincronizadorCalendario;
  let replica: ReplicaEventosRepositorio;
  let organizacionId: string;
  let n = 0;

  async function persona(conCalendario = true): Promise<Quien> {
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo: `ag${++n}@nexoai.test`, rol: 'usuario_personal', plan: 'personal' }, 'una-contrasena-de-prueba');
    if (conCalendario) {
      await prisma.consentimientoIntegracion.create({
        data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
      });
    }
    return { perfilId, organizacionId };
  }

  const todos = (quien: Quien) => replica.enRango(quien, new Date(0), new Date('2100-01-01'));

  beforeAll(async () => {
    modulo = await Test.createTestingModule({ imports: [PlataformaModule, AgendaModule] })
      .overrideProvider(PROVEEDOR_CALENDARIO)
      .useValue(calendario)
      .compile();
    sincronizador = modulo.get(SincronizadorCalendario);
    replica = modulo.get(ReplicaEventosRepositorio);
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await modulo.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    calendario.reiniciar();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
  });

  it('la réplica refleja altas, cambios y borrados hechos en Google', async () => {
    const quien = await persona();
    const a = calendario.sembrar(quien.perfilId, { titulo: 'Dentista', inicio: new Date('2026-10-23T14:00:00Z'), fin: new Date('2026-10-23T15:00:00Z'), zonaHoraria: 'America/Lima' });
    const b = calendario.sembrar(quien.perfilId, { titulo: 'Clase', inicio: new Date('2026-10-24T14:00:00Z'), fin: new Date('2026-10-24T16:00:00Z'), zonaHoraria: 'America/Lima' });
    expect(await sincronizador.sincronizar(quien, AHORA)).toEqual({ tipo: 'completa', cambios: 2 });

    calendario.cambiarEnGoogle(quien.perfilId, a.id, { titulo: 'Dentista (cambiado)' });
    calendario.borrarEnGoogle(quien.perfilId, b.id);
    const c = calendario.sembrar(quien.perfilId, { titulo: 'Nuevo', inicio: new Date('2026-10-25T14:00:00Z'), fin: new Date('2026-10-25T15:00:00Z'), zonaHoraria: 'America/Lima' });
    expect(await sincronizador.sincronizar(quien, new Date(AHORA.getTime() + 300_000))).toEqual({ tipo: 'incremental', cambios: 3 });

    const filas = await todos(quien);
    const por = (id: string) => filas.find((f) => f.googleEventoId === id);
    expect(filas).toHaveLength(3);
    expect(por(a.id)).toMatchObject({ titulo: 'Dentista (cambiado)', estado: 'confirmado' });
    // R-25: lo borrado en Google queda cancelado, no desaparece
    expect(por(b.id)).toMatchObject({ titulo: 'Clase', estado: 'cancelado' });
    expect(por(c.id)).toMatchObject({ titulo: 'Nuevo', estado: 'confirmado', googleCalendarioId: 'primary' });
  });

  it('la lectura completa abarca de 30 días atrás a 365 adelante', async () => {
    const quien = await persona();
    calendario.sembrar(quien.perfilId, { titulo: 'Hace 31 días', inicio: new Date(AHORA.getTime() - 31 * DIA), fin: new Date(AHORA.getTime() - 31 * DIA + 3600_000), zonaHoraria: 'UTC' });
    calendario.sembrar(quien.perfilId, { titulo: 'Hace 29 días', inicio: new Date(AHORA.getTime() - 29 * DIA), fin: new Date(AHORA.getTime() - 29 * DIA + 3600_000), zonaHoraria: 'UTC' });
    calendario.sembrar(quien.perfilId, { titulo: 'En 364 días', inicio: new Date(AHORA.getTime() + 364 * DIA), fin: new Date(AHORA.getTime() + 364 * DIA + 3600_000), zonaHoraria: 'UTC' });
    calendario.sembrar(quien.perfilId, { titulo: 'En 366 días', inicio: new Date(AHORA.getTime() + 366 * DIA), fin: new Date(AHORA.getTime() + 366 * DIA + 3600_000), zonaHoraria: 'UTC' });
    await sincronizador.sincronizar(quien, AHORA);
    expect((await todos(quien)).map((f) => f.titulo).sort()).toEqual(['En 364 días', 'Hace 29 días']);
  });

  it('un token caducado (410) obliga a leer completo, y lo que ya no está queda cancelado', async () => {
    const quien = await persona();
    const a = calendario.sembrar(quien.perfilId, { titulo: 'Se borrará', inicio: new Date('2026-10-23T14:00:00Z'), fin: new Date('2026-10-23T15:00:00Z'), zonaHoraria: 'UTC' });
    await sincronizador.sincronizar(quien, AHORA);
    calendario.borrarEnGoogle(quien.perfilId, a.id);
    calendario.caducarTokens(quien.perfilId);
    expect(await sincronizador.sincronizar(quien, AHORA)).toEqual({ tipo: 'completa', cambios: 0 });
    expect(await todos(quien)).toMatchObject([{ googleEventoId: a.id, estado: 'cancelado' }]);
  });

  it('H-AG-09: cuando la ventana avanza 30 días se vuelve a leer completo', async () => {
    const quien = await persona();
    await sincronizador.sincronizar(quien, AHORA);
    expect((await sincronizador.sincronizar(quien, new Date(AHORA.getTime() + 29 * DIA))).tipo).toBe('incremental');
    expect((await sincronizador.sincronizar(quien, new Date(AHORA.getTime() + 31 * DIA))).tipo).toBe('completa');
  });

  it('sin permiso de calendario no se llama al proveedor', async () => {
    const quien = await persona(false);
    expect(await sincronizador.sincronizar(quien, AHORA)).toEqual({ tipo: 'sin_permiso' });
    expect(calendario.llamadas.lecturas).toBe(0);
  });

  it('dos sincronizaciones simultáneas de la misma persona hacen una sola lectura', async () => {
    const quien = await persona();
    calendario.sembrar(quien.perfilId, { titulo: 'A', inicio: new Date('2026-10-23T14:00:00Z'), fin: new Date('2026-10-23T15:00:00Z'), zonaHoraria: 'UTC' });
    await Promise.all([sincronizador.sincronizar(quien, AHORA), sincronizador.sincronizar(quien, AHORA)]);
    expect(calendario.llamadas.lecturas).toBe(1);
    expect(await todos(quien)).toHaveLength(1);
  });

  it('las instancias de una serie se guardan cada una con su serie (H-AG-04), y las de otro le pertenecen a él', async () => {
    const quien = await persona();
    calendario.sembrar(quien.perfilId, { titulo: 'Diaria', inicio: new Date('2026-10-23T14:00:00Z'), fin: new Date('2026-10-23T14:15:00Z'), zonaHoraria: 'UTC', serieId: 'serie-1' });
    calendario.sembrar(quien.perfilId, { titulo: 'Diaria', inicio: new Date('2026-10-24T14:00:00Z'), fin: new Date('2026-10-24T14:15:00Z'), zonaHoraria: 'UTC', serieId: 'serie-1' });
    calendario.sembrar(quien.perfilId, { titulo: 'Me invitaron', inicio: new Date('2026-10-25T14:00:00Z'), fin: new Date('2026-10-25T15:00:00Z'), zonaHoraria: 'UTC', esOrganizador: false });
    await sincronizador.sincronizar(quien, AHORA);
    const filas = await todos(quien);
    expect(filas.filter((f) => f.serieId === 'serie-1')).toHaveLength(2);
    expect(filas.find((f) => f.titulo === 'Me invitaron')?.esOrganizador).toBe(false);
  });

  describe('agenda.solo-eventos-propios', () => {
    it('cada persona replica y consulta solo su calendario, aunque sean de la misma organización', async () => {
      const ana = await persona();
      const beto = await persona();
      calendario.sembrar(ana.perfilId, { titulo: 'De Ana', inicio: new Date('2026-10-23T14:00:00Z'), fin: new Date('2026-10-23T15:00:00Z'), zonaHoraria: 'UTC' });
      calendario.sembrar(beto.perfilId, { titulo: 'De Beto', inicio: new Date('2026-10-23T14:00:00Z'), fin: new Date('2026-10-23T15:00:00Z'), zonaHoraria: 'UTC' });
      await sincronizador.sincronizar(ana, AHORA);
      await sincronizador.sincronizar(beto, AHORA);

      const deAna = await todos(ana);
      expect(deAna.map((f) => f.titulo)).toEqual(['De Ana']);
      const deBeto = await todos(beto);
      expect(await replica.porId(ana, deBeto[0]!.id)).toBeNull();
    });
  });

  describe('agenda.horas-con-zona-horaria', () => {
    it('cada evento conserva su instante exacto y su zona IANA', async () => {
      const quien = await persona();
      calendario.sembrar(quien.perfilId, { titulo: 'En Madrid', inicio: new Date('2026-10-26T09:00:00Z'), fin: new Date('2026-10-26T10:00:00Z'), zonaHoraria: 'Europe/Madrid' });
      calendario.sembrar(quien.perfilId, { titulo: 'En Lima', inicio: new Date('2026-10-23T15:00:00Z'), fin: new Date('2026-10-23T16:00:00Z'), zonaHoraria: 'America/Lima' });
      await sincronizador.sincronizar(quien, AHORA);
      const filas = await todos(quien);
      expect(filas.map((f) => [f.titulo, f.inicio.toISOString(), f.zonaHoraria])).toEqual([
        ['En Lima', '2026-10-23T15:00:00.000Z', 'America/Lima'],
        ['En Madrid', '2026-10-26T09:00:00.000Z', 'Europe/Madrid'],
      ]);
    });
  });

  describe('agenda.sincronizacion-periodica', () => {
    it('el trabajador repasa los perfiles conectados y sincroniza cada uno por la cola', async () => {
      const conectado = await persona();
      await persona(false);
      calendario.sembrar(conectado.perfilId, { titulo: 'Desde la cola', inicio: new Date(Date.now() + DIA), fin: new Date(Date.now() + DIA + 3600_000), zonaHoraria: 'UTC' });

      const limpia = new Queue(COLA_SINCRONIZACION, { connection: conexionRedis(), prefix: process.env.COLA_PREFIJO });
      await limpia.obliterate({ force: true });
      await limpia.close();

      const trabajador = new TrabajadorCalendario(modulo.get(PrismaService), sincronizador);
      await trabajador.onModuleInit();
      try {
        for (let i = 0; i < 100 && (await todos(conectado)).length === 0; i++) await new Promise((r) => setTimeout(r, 100));
      } finally {
        await trabajador.onModuleDestroy();
      }
      expect((await todos(conectado)).map((f) => f.titulo)).toEqual(['Desde la cola']);
      expect(calendario.llamadas.lecturas).toBe(1);
    });
  });
});
