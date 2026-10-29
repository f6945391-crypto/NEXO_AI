import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ArgsGuardarTarea, type TurnoDeHerramienta } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../../identidad/contexto';
import { OperacionesService } from '../../operaciones/operaciones.service';
import { EjecutorHerramientas } from './ejecutor-herramientas';
import type { EntornoHerramienta, ResultadoHerramienta } from './herramienta';

// T-033 · REQ-AGT-02 · plan §5 y §7. Decisión del equipo del 24 de octubre de 2026: una tarea se reconoce y
// se dice, pero no se registra: queda en espera, con el motivo «función por llegar», hasta que existan las
// tareas personales (CUN-03). No crea ninguna tarea ni ningún compromiso.

const CLASES = { tarea: 'tarea', pendiente_sin_fecha: 'pendiente sin fecha', esperando_de_alguien: 'algo que esperas de otra persona' } as const;

@Injectable()
export class HerramientasCaptura implements OnModuleInit {
  constructor(
    private readonly ejecutor: EjecutorHerramientas,
    private readonly operaciones: OperacionesService,
  ) {}

  onModuleInit(): void {
    this.ejecutor.registrar({
      nombre: 'captura.guardar_tarea',
      descripcion: 'Guarda una tarea, un pendiente sin fecha o algo que se espera de otra persona. No crea nada todavía: las tareas llegan en una próxima versión.',
      esquema: ArgsGuardarTarea,
      ejecutar: (contexto, args, entorno) => this.guardar(contexto, args, entorno),
    });
  }

  private async guardar(contexto: ContextoSolicitud, args: ArgsGuardarTarea, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    const op = await this.operaciones.encolar(contexto, {
      tipo: 'tareas.registrar',
      carga: { texto: args.texto, clase: args.clase },
      motivo: 'funcion_por_llegar',
      solicitudOriginal: entorno.solicitudOriginal,
      capturadaEn: entorno.referencia.instante,
      conversacionId: entorno.conversacionId,
      ...(entorno.enEspera ? { desdeEnEspera: entorno.enEspera } : {}),
    });
    const texto = `Lo guardé como ${CLASES[args.clase]}: «${args.texto}». Las tareas llegan en una próxima versión, así que por ahora no se ha creado nada.`;
    const turno: TurnoDeHerramienta = { tipo: 'en_espera', texto, motivo: 'funcion_por_llegar', operacionId: op.id };
    return { paraModelo: { guardada: true, nota: 'La persona ya ve el aviso. No lo repitas.' }, turno };
  }
}
