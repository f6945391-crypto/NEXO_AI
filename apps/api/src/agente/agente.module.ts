import { Module } from '@nestjs/common';
import { GUION_DEMOSTRACION } from './modelo/guion-demostracion';
import { LlamadorModelo } from './modelo/llamador-modelo';
import { ModeloNoConfigurado } from './modelo/modelo-no-configurado';
import { ModeloSimulado } from './modelo/modelo-simulado';
import { PROVEEDOR_MODELO, type ProveedorModelo } from './modelo/proveedor-modelo';

// specs/07-agente/plan.md §2 · T-029. La capa de agentes. Es el único módulo donde puede vivir el SDK de un
// proveedor de modelo (P-06), y solo dentro de `modelo/`.

// MODELO_PROVEEDOR: `no-configurado` (por defecto, H-AGT-01) o `simulado` con el guion de demostración
// (H-AGT-02), nunca en producción. El proveedor real llega con T-036.
export function crearProveedorModelo(entorno: NodeJS.ProcessEnv = process.env): ProveedorModelo {
  const elegido = entorno.MODELO_PROVEEDOR?.trim() || 'no-configurado';
  if (elegido === 'no-configurado') return new ModeloNoConfigurado();
  if (elegido === 'simulado') {
    if (entorno.NODE_ENV === 'production') throw new Error('MODELO_PROVEEDOR=simulado no se admite en producción');
    return new ModeloSimulado(GUION_DEMOSTRACION);
  }
  throw new Error(`MODELO_PROVEEDOR desconocido: ${elegido}. Ver .env.example`);
}

@Module({
  providers: [{ provide: PROVEEDOR_MODELO, useFactory: () => crearProveedorModelo() }, LlamadorModelo],
  exports: [PROVEEDOR_MODELO, LlamadorModelo],
})
export class AgenteModule {}
