import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { conexionRedis } from '../agenda/trabajador-calendario';
import { ProcesadorEnEspera } from './en-espera';

// P-11 · T-033 · specs/07-agente/plan.md §7. En el proceso trabajador (AD-01, AD-07): cada minuto, un
// trabajo `repasar` atiende lo que quedó en espera. Un solo trabajo a la vez, sin reintentos: si falla, lo
// vuelve a intentar la pasada siguiente.

export const COLA_EN_ESPERA = 'asistente-en-espera';
export const CADA_MS = 60_000;

const prefijo = () => process.env.COLA_PREFIJO ?? 'nexoai';

@Injectable()
export class TrabajadorEnEspera implements OnModuleInit, OnModuleDestroy {
  private readonly registro = new Logger('TrabajadorEnEspera');
  private cola?: Queue;
  private trabajador?: Worker;

  constructor(private readonly procesador: ProcesadorEnEspera) {}

  async onModuleInit(): Promise<void> {
    const connection = conexionRedis();
    this.cola = new Queue(COLA_EN_ESPERA, { connection, prefix: prefijo() });
    this.trabajador = new Worker(COLA_EN_ESPERA, () => this.procesador.repasar(), { connection, prefix: prefijo(), concurrency: 1 });
    this.trabajador.on('failed', (job, error) => this.registro.warn(`Falló ${job?.name ?? 'un trabajo'}: ${error.message}`));
    await this.cola.upsertJobScheduler('repasar', { every: CADA_MS }, { name: 'repasar', opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.trabajador?.close();
    await this.cola?.close();
  }
}
