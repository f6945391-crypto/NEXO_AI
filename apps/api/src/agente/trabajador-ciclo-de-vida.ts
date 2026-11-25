import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { conexionRedis } from '../agenda/trabajador-calendario';
import { CicloDeVidaAsistente } from './ciclo-de-vida';

// T-041 · specs/07-agente/plan.md §14.8. En el proceso trabajador, como la cola en espera: cada minuto, un
// trabajo `repasar` cierra los episodios inactivos, caduca las propuestas y borra lo vencido.

export const COLA_CICLO_DE_VIDA = 'asistente-ciclo-de-vida';
export const CADA_MS = 60_000;

const prefijo = () => process.env.COLA_PREFIJO ?? 'nexoai';

@Injectable()
export class TrabajadorCicloDeVida implements OnModuleInit, OnModuleDestroy {
  private readonly registro = new Logger('TrabajadorCicloDeVida');
  private cola?: Queue;
  private trabajador?: Worker;

  constructor(private readonly ciclo: CicloDeVidaAsistente) {}

  async onModuleInit(): Promise<void> {
    const connection = conexionRedis();
    this.cola = new Queue(COLA_CICLO_DE_VIDA, { connection, prefix: prefijo() });
    this.trabajador = new Worker(COLA_CICLO_DE_VIDA, () => this.ciclo.repasar(), { connection, prefix: prefijo(), concurrency: 1 });
    this.trabajador.on('failed', (job, error) => this.registro.warn(`Falló ${job?.name ?? 'un trabajo'}: ${error.message}`));
    await this.cola.upsertJobScheduler('repasar', { every: CADA_MS }, { name: 'repasar', opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.trabajador?.close();
    await this.cola?.close();
  }
}
