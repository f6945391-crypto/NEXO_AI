import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import type { Quien } from '../integraciones/calendario/proveedor-calendario';
import { requerirVariable } from '../plataforma/entorno';
import { PrismaService } from '../plataforma/prisma.service';
import { SincronizadorCalendario } from './sincronizador-calendario';

// T-014 · specs/02-agenda/plan.md §4. Sincronización periódica en el proceso trabajador (AD-01), con
// BullMQ sobre Redis. Cada 5 minutos un trabajo `repasar` encola un `sincronizar` por perfil con el
// calendario conectado. La API no usa la cola: sincroniza bajo demanda al consultar (T-015).

export const COLA_SINCRONIZACION = 'sincronizacion-calendario';
export const CADA_MS = 5 * 60_000;

export type TrabajoSincronizacion = { nombre: 'repasar' } | { nombre: 'sincronizar'; datos: Quien };

export function conexionRedis(): ConnectionOptions {
  return { url: requerirVariable('REDIS_URL') };
}

// Las pruebas usan otro prefijo para no mezclarse con un trabajador de desarrollo en marcha.
const prefijo = () => process.env.COLA_PREFIJO ?? 'nexoai';

@Injectable()
export class TrabajadorCalendario implements OnModuleInit, OnModuleDestroy {
  private readonly registro = new Logger('TrabajadorCalendario');
  private cola?: Queue;
  private trabajador?: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sincronizador: SincronizadorCalendario,
  ) {}

  async onModuleInit(): Promise<void> {
    const connection = conexionRedis();
    this.cola = new Queue(COLA_SINCRONIZACION, { connection, prefix: prefijo() });
    this.trabajador = new Worker(
      COLA_SINCRONIZACION,
      (job) => this.procesar(job.name === 'repasar' ? { nombre: 'repasar' } : { nombre: 'sincronizar', datos: job.data as Quien }),
      { connection, prefix: prefijo() },
    );
    this.trabajador.on('failed', (job, error) => this.registro.warn(`Falló ${job?.name ?? 'un trabajo'}: ${error.message}`));
    await this.cola.upsertJobScheduler('repasar', { every: CADA_MS }, { name: 'repasar' });
  }

  async onModuleDestroy(): Promise<void> {
    await this.trabajador?.close();
    await this.cola?.close();
  }

  async procesar(trabajo: TrabajoSincronizacion): Promise<unknown> {
    if (trabajo.nombre === 'sincronizar') return this.sincronizador.sincronizar(trabajo.datos);

    // sinAislar (justificado en specs/02-agenda/plan.md §4): el trabajador no atiende a nadie en concreto
    // y necesita saber qué perfiles de todas las organizaciones tienen el calendario conectado. Solo lee
    // perfil y organización; cada sincronización se hace después aislada por su organización.
    const conectados = await this.prisma.sinAislar.consentimientoIntegracion.findMany({
      where: { proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
      select: { perfilId: true, organizacionId: true },
    });
    // Un solo intento: si Google falla, la siguiente pasada lo vuelve a intentar, sin bucles (REQ-ACC-09).
    await this.cola?.addBulk(
      conectados.map((quien) => ({
        name: 'sincronizar',
        data: quien,
        opts: { deduplication: { id: `sincronizar:${quien.perfilId}` }, attempts: 1, removeOnComplete: true, removeOnFail: 100 },
      })),
    );
    return { encolados: conectados.length };
  }
}
