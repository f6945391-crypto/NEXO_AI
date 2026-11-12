import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ArgsGuardarTarea } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../../identidad/contexto';
import { OperacionesService } from '../../operaciones/operaciones.service';
import { EjecutorHerramientas } from './ejecutor-herramientas';
import type { EntornoHerramienta, ResultadoHerramienta } from './herramienta';
import { comoPropuesta, conError } from './resultados';

// T-051 · REQ-CUN03-01, 07 · specs/08-tareas-personales/plan.md §7. Antes (T-033, REQ-AGT-02) una tarea se
// reconocía y quedaba en espera, sin crear nada. Ahora **propone de verdad**: crea una Operación
// `tareas.registrar` con origen `agente`, y la tarea existe solo cuando la persona confirma (P-03). La fecha
// solo la pone la persona, nunca el sistema; «esperando de alguien» guarda de quién y qué, y nada más.

@Injectable()
export class HerramientasCaptura implements OnModuleInit {
  constructor(
    private readonly ejecutor: EjecutorHerramientas,
    private readonly operaciones: OperacionesService,
  ) {}

  onModuleInit(): void {
    this.ejecutor.registrar({
      nombre: 'captura.guardar_tarea',
      descripcion:
        'Propone anotar una tarea, un pendiente sin fecha o algo que se espera de otra persona. Pasa la fecha y la hora solo si la persona las dijo; no las inventes. Para «esperando de alguien», pasa también de quién y qué se espera.',
      esquema: ArgsGuardarTarea,
      ejecutar: (contexto, args, entorno) => this.guardar(contexto, args, entorno),
    });
  }

  private async guardar(contexto: ContextoSolicitud, args: ArgsGuardarTarea, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    // REQ-CUN03-07: quién y qué se espera van juntos; lo que falte se pregunta, no se inventa
    const espera = args.clase === 'esperando_de_alguien' || args.esperaDe !== undefined || args.esperaQue !== undefined;
    if (espera) {
      const faltan = (['esperaDe', 'esperaQue'] as const).filter((campo) => !args[campo]);
      if (faltan.length > 0) return conError('DATOS_FALTANTES', 'Falta saber de quién y qué se espera.', [...faltan]);
    }
    if (args.hora && !args.fecha) return conError('DATOS_FALTANTES', 'La hora necesita una fecha.', ['fecha']);

    const carga = {
      titulo: args.texto,
      ...(args.fecha ? { fecha: args.fecha } : {}),
      ...(args.hora ? { hora: args.hora } : {}),
      ...(espera ? { esperaDe: args.esperaDe!, esperaQue: args.esperaQue! } : {}),
    };
    const op = await this.operaciones.proponer(
      contexto,
      { tipo: 'tareas.registrar', carga, origen: 'agente', solicitudOriginal: entorno.solicitudOriginal.slice(0, 2000) },
      { conversacionId: entorno.conversacionId, ...(entorno.enEspera ? { desdeEnEspera: entorno.enEspera } : {}) },
    );
    return comoPropuesta(op);
  }
}
