import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ArgsActualizarTarea, ArgsCompletarTarea, ArgsConsultarTareas, type TurnoDeHerramienta } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../../identidad/contexto';
import { OperacionesService } from '../../operaciones/operaciones.service';
import { ConsultaTareasService } from '../../tareas/consulta-tareas.service';
import { AVISO_CONTENIDO_EXTERNO } from './contenido-externo';
import { EjecutorHerramientas } from './ejecutor-herramientas';
import type { EntornoHerramienta, ResultadoHerramienta } from './herramienta';
import { armarListaTareas } from './lista-tareas';
import { comoPropuesta, conError } from './resultados';

// T-051 · specs/08-tareas-personales/plan.md §7 · REQ-CUN03-04, 05, 06. Las herramientas de tareas del
// agente. **Ninguna escribe** (P-01, AD-09): consultan las tareas o proponen una Operación `tareas.*` con
// origen `agente`, y la ejecución es siempre la confirmación de la persona (P-03). Registrar una tarea nueva
// lo hace `captura.guardar_tarea`.

@Injectable()
export class HerramientasTareas implements OnModuleInit {
  constructor(
    private readonly ejecutor: EjecutorHerramientas,
    private readonly consulta: ConsultaTareasService,
    private readonly operaciones: OperacionesService,
  ) {}

  onModuleInit(): void {
    this.ejecutor.registrar({
      nombre: 'tareas.consultar',
      descripcion: 'Lee las tareas pendientes de la persona, por franja. Úsala para «¿qué tengo pendiente?» y antes de completar o cambiar una tarea, para saber su id.',
      esquema: ArgsConsultarTareas,
      ejecutar: (contexto, args, entorno) => this.consultar(contexto, args, entorno),
    });
    this.ejecutor.registrar({
      nombre: 'tareas.completar',
      descripcion: 'Propone marcar una tarea como hecha, o reabrir una completada.',
      esquema: ArgsCompletarTarea,
      ejecutar: (contexto, args, entorno) => this.completar(contexto, args, entorno),
    });
    this.ejecutor.registrar({
      nombre: 'tareas.actualizar',
      descripcion: 'Propone cambiar el título, la fecha o la hora de una tarea pendiente, quitarle la fecha, o cancelarla. Pasa solo lo que cambia.',
      esquema: ArgsActualizarTarea,
      ejecutar: (contexto, args, entorno) => this.actualizar(contexto, args, entorno),
    });
  }

  private async consultar(contexto: ContextoSolicitud, args: ArgsConsultarTareas, _entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    const franjas = await this.consulta.franjas(contexto);
    const texto = armarListaTareas(franjas, args.franja);
    const turno: TurnoDeHerramienta = { tipo: 'texto', texto };
    const todas = [...franjas.conFecha, ...franjas.sinFecha, ...franjas.esperando].filter((t) => !args.franja || t.franja === args.franja);
    return {
      // H-AGT-12: al modelo, solo lo necesario para seguir
      paraModelo: {
        tareas: todas.map((t) => ({
          id: t.id,
          titulo: t.titulo,
          franja: t.franja,
          fecha: t.fecha,
          hora: t.hora,
          atrasada: t.atrasada,
          ...(t.esperaDe ? { esperaDe: t.esperaDe, esperaQue: t.esperaQue } : {}),
        })),
        aviso: AVISO_CONTENIDO_EXTERNO,
        nota: 'La persona ya ve esta lista, armada con sus tareas. No la repitas.',
      },
      turno,
    };
  }

  private async completar(contexto: ContextoSolicitud, args: ArgsCompletarTarea, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    return comoPropuesta(await this.proponer(contexto, entorno, 'tareas.completar', { tareaId: args.tareaId, ...(args.reabrir ? { reabrir: true } : {}) }));
  }

  private async actualizar(contexto: ContextoSolicitud, args: ArgsActualizarTarea, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    const { tareaId, cancelar, ...cambios } = args;
    const hayCambio = Object.values(cambios).some((valor) => valor !== undefined);
    if (cancelar && hayCambio) return conError('ARGUMENTOS_INVALIDOS', 'Cancelar no se combina con otros cambios.', ['cancelar']);
    if (!cancelar && !hayCambio) return conError('DATOS_FALTANTES', 'No dice qué cambiar de la tarea.', ['cambio']);
    const carga = {
      tareaId,
      ...(cancelar ? { cancelar: true } : {}),
      ...Object.fromEntries(Object.entries(cambios).filter(([, valor]) => valor !== undefined)),
    };
    return comoPropuesta(await this.proponer(contexto, entorno, 'tareas.actualizar', carga));
  }

  private proponer(contexto: ContextoSolicitud, entorno: EntornoHerramienta, tipo: string, carga: unknown) {
    return this.operaciones.proponer(
      contexto,
      { tipo, carga, origen: 'agente', solicitudOriginal: entorno.solicitudOriginal.slice(0, 2000) },
      { conversacionId: entorno.conversacionId, ...(entorno.enEspera ? { desdeEnEspera: entorno.enEspera } : {}) },
    );
  }
}
