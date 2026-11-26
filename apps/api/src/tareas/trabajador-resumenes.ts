import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { conexionRedis } from '../agenda/trabajador-calendario';
import { ResumenesBitacora } from './resumenes-bitacora';

// T-129 · specs/09-tareas-personales/plan.md §13.8 · H-TP-33. En el proceso trabajador: cada hora, un trabajo
// `repasar` resume las tareas con avances nuevos cuyo último resumen tiene más de 24 horas.

export const COLA_RESUMENES = 'tareas-resumen-diario';
export const CADA_MS = 3_600_000;

const prefijo = () => process.env.COLA_PREFIJO ?? 'nexoai';

@Injectable()
export class TrabajadorResumenes implements OnModuleInit, OnModuleDestroy {
  private readonly registro = new Logger('TrabajadorResumenes');
  private cola?: Queue;
  private trabajador?: Worker;

  constructor(private readonly resumenes: ResumenesBitacora) {}

  async onModuleInit(): Promise<void> {
    const connection = conexionRedis();
    this.cola = new Queue(COLA_RESUMENES, { connection, prefix: prefijo() });
    this.trabajador = new Worker(COLA_RESUMENES, () => this.resumenes.repasar(), { connection, prefix: prefijo(), concurrency: 1 });
    this.trabajador.on('failed', (job, error) => this.registro.warn(`Falló ${job?.name ?? 'un trabajo'}: ${error.message}`));
    await this.cola.upsertJobScheduler('repasar', { every: CADA_MS }, { name: 'repasar', opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.trabajador?.close();
    await this.cola?.close();
  }
}
