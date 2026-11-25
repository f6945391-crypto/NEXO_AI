import { Injectable } from '@nestjs/common';
import { TareaPersonal, type ControlTarea } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { OperacionesService } from '../operaciones/operaciones.service';
import { noModificable, TareasRepositorio } from './tareas.repositorio';

// specs/09-tareas-personales/plan.md §5 · T-049 · REQ-CUN03-09, 10 · H-TP-07 · DP-01. «Hecho», «Recibido» y
// «Reabrir» desde la lista no llevan tarjeta: el servidor propone y confirma en el mismo paso, siempre por
// Operaciones (AD-09), así queda una Operación `ejecutada` con su auditoría y con origen `control_directo`:
// lo hizo la persona, no el asistente (R-18). Idempotente por estado: dos «Hecho» dejan una tarea hecha y
// dos Operaciones, la segunda sin efecto. No depende del asistente (REQ-CUN03-18).

@Injectable()
export class ControlesTareasService {
  constructor(
    private readonly operaciones: OperacionesService,
    private readonly tareas: TareasRepositorio,
  ) {}

  // Lo que se espera de alguien se marca como recibido (H-TP-15)
  async darPorHecha(contexto: ContextoSolicitud, id: string): Promise<ControlTarea> {
    const fila = await this.tareas.existente(contexto, id);
    return this.enUnPaso(contexto, fila.deQuien ? 'tareas.recibido' : 'tareas.completar', id);
  }

  // T-125 · REQ-CUN03-27 · H-TP-31: «Mantener abierta» desde el aviso al vencer
  mantenerAbierta(contexto: ContextoSolicitud, id: string): Promise<ControlTarea> {
    return this.enUnPaso(contexto, 'tareas.mantener_abierta', id);
  }

  // También es el «Deshacer» de «Hecho»
  reabrir(contexto: ContextoSolicitud, id: string): Promise<ControlTarea> {
    return this.enUnPaso(contexto, 'tareas.reabrir', id);
  }

  private async enUnPaso(contexto: ContextoSolicitud, tipo: string, tareaId: string): Promise<ControlTarea> {
    const propuesta = await this.operaciones.proponer(contexto, { tipo, carga: { tareaId }, origen: 'control_directo' });
    const hecha = await this.operaciones.confirmar(contexto, propuesta.id);
    if (hecha.estado !== 'ejecutada') throw noModificable();
    return { tarea: TareaPersonal.parse(hecha.resultado), operacionId: hecha.id };
  }
}
