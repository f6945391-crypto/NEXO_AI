import { Module } from '@nestjs/common';
import { AgendaModule } from '../agenda/agenda.module';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { TareasModule } from '../tareas/tareas.module';
import { AsistenteController } from './asistente.controller';
import { AsistenteService } from './asistente.service';
import { TranscripcionService } from './transcripcion';
import { ProcesadorEnEspera } from './en-espera';
import { EjecutorHerramientas } from './herramientas/ejecutor-herramientas';
import { HerramientasAgenda } from './herramientas/herramientas-agenda';
import { HerramientasCaptura } from './herramientas/herramientas-captura';
import { HerramientasTareas } from './herramientas/herramientas-tareas';
import { LlamadasAuditadas } from './llamadas-auditadas';
import { GUION_DEMOSTRACION } from './modelo/guion-demostracion';
import { LlamadorModelo, OPCIONES_LLAMADOR, OPCIONES_POR_DEFECTO } from './modelo/llamador-modelo';
import { ModeloCompatibleOpenAI } from './modelo/modelo-compatible-openai';
import { ModeloNoConfigurado } from './modelo/modelo-no-configurado';
import { ModeloSimulado } from './modelo/modelo-simulado';
import { registrarPrecio } from './modelo/precios-modelo';
import { PROVEEDOR_MODELO, type ProveedorModelo } from './modelo/proveedor-modelo';

// specs/07-agente/plan.md §2 · T-029. La capa de agentes. Es el único módulo donde puede vivir el SDK de un
// proveedor de modelo (P-06), y solo dentro de `modelo/`.

// MODELO_PROVEEDOR: `no-configurado` (por defecto, H-AGT-01), `simulado` con el guion de demostración
// (H-AGT-02), nunca en producción, o `compatible-openai` (T-036, plan §3.1): Groq para probar.
export function crearProveedorModelo(entorno: NodeJS.ProcessEnv = process.env): ProveedorModelo {
  const elegido = entorno.MODELO_PROVEEDOR?.trim() || 'no-configurado';
  if (elegido === 'no-configurado') return new ModeloNoConfigurado();
  if (elegido === 'simulado') {
    if (entorno.NODE_ENV === 'production') throw new Error('MODELO_PROVEEDOR=simulado no se admite en producción');
    return new ModeloSimulado(GUION_DEMOSTRACION);
  }
  if (elegido === 'compatible-openai') {
    const url = entorno.MODELO_URL?.trim();
    const modelo = entorno.MODELO_NOMBRE?.trim();
    if (!url || !modelo) throw new Error('MODELO_PROVEEDOR=compatible-openai necesita MODELO_URL y MODELO_NOMBRE. Ver .env.example');
    const precios = entorno.MODELO_PRECIOS?.split(',').map((p) => Number(p.trim()));
    if (precios) registrarPrecio(modelo, precios[0]!, precios[1]!);
    // Ollama en el propio equipo no pide clave; los demás, sí
    return new ModeloCompatibleOpenAI({ url, modelo, clave: entorno.MODELO_CLAVE?.trim() || null });
  }
  throw new Error(`MODELO_PROVEEDOR desconocido: ${elegido}. Ver .env.example`);
}

@Module({
  imports: [AgendaModule, TareasModule, IntegracionesModule],
  controllers: [AsistenteController],
  providers: [
    { provide: PROVEEDOR_MODELO, useFactory: () => crearProveedorModelo() },
    { provide: OPCIONES_LLAMADOR, useValue: OPCIONES_POR_DEFECTO },
    LlamadorModelo,
    LlamadasAuditadas,
    EjecutorHerramientas,
    HerramientasAgenda,
    HerramientasCaptura,
    HerramientasTareas,
    AsistenteService,
    TranscripcionService,
    ProcesadorEnEspera,
  ],
  exports: [PROVEEDOR_MODELO, LlamadorModelo, LlamadasAuditadas, EjecutorHerramientas, AsistenteService, ProcesadorEnEspera],
})
export class AgenteModule {}
