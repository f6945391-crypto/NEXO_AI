import { Module } from '@nestjs/common';
import { DictadoController } from './dictado.controller';
import { DictadoService } from './dictado.service';
import { TranscriptorOpenRouter } from './transcriptor-openrouter';
import { TRANSCRIPTOR_VOZ, TranscriptorNoConfigurado, TranscriptorSimulado, type TranscriptorVoz } from './transcriptor';

// T-154 · plan de 07-agente §15.1. DICTADO_PROVEEDOR: `no-configurado` (por defecto), `simulado` (pruebas y
// desarrollo, nunca en producción) u `openrouter`, con DICTADO_CLAVE (puede ser la misma de MODELO_CLAVE),
// DICTADO_URL, DICTADO_MODELO y DICTADO_TERMINOS.
export const DICTADO_URL_POR_DEFECTO = 'https://openrouter.ai/api/v1';
export const DICTADO_MODELO_POR_DEFECTO = 'assemblyai/universal-3-6-pro';

export function crearTranscriptor(entorno: NodeJS.ProcessEnv = process.env): TranscriptorVoz {
  const elegido = entorno.DICTADO_PROVEEDOR?.trim() || 'no-configurado';
  if (elegido === 'no-configurado') return new TranscriptorNoConfigurado();
  if (elegido === 'simulado') {
    if (entorno.NODE_ENV === 'production') throw new Error('DICTADO_PROVEEDOR=simulado no se admite en producción');
    return new TranscriptorSimulado();
  }
  if (elegido === 'openrouter') {
    const clave = entorno.DICTADO_CLAVE?.trim();
    if (!clave) throw new Error('DICTADO_PROVEEDOR=openrouter necesita DICTADO_CLAVE. Ver .env.example');
    return new TranscriptorOpenRouter({
      url: entorno.DICTADO_URL?.trim() || DICTADO_URL_POR_DEFECTO,
      modelo: entorno.DICTADO_MODELO?.trim() || DICTADO_MODELO_POR_DEFECTO,
      clave,
      terminos: (entorno.DICTADO_TERMINOS ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    });
  }
  throw new Error(`DICTADO_PROVEEDOR desconocido: ${elegido}. Ver .env.example`);
}

@Module({
  controllers: [DictadoController],
  providers: [DictadoService, { provide: TRANSCRIPTOR_VOZ, useFactory: () => crearTranscriptor() }],
})
export class DictadoModule {}
