import { Injectable, type OnModuleInit } from '@nestjs/common';
import { CierreTarea, type VistaConfirmacion } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { RegistroOperaciones, type EjecutorOperacion, type Propuesta, type ResultadoEjecucion } from '../operaciones/registro';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { aContrato, noEncontrada } from './consulta-tareas.service';
import { hoyEnZona } from './dominio/franjas';
import { resumen } from './dominio/formato';
import { TareasRepositorio } from './tareas.repositorio';

// REQ-CUN03-05 · T-048. Operación `tareas.completar`: pasa la tarea a completada con la fecha y la hora del
// cierre, o la reabre. Desde la lista es de un toque, sin tarjeta (decisión 2); pedido al asistente, lleva
// tarjeta como todo lo que él propone. Completar una «esperando de alguien» solo la completa (decisión 8).

@Injectable()
export class CompletarTarea implements EjecutorOperacion<CierreTarea>, OnModuleInit {
  readonly tipo = 'tareas.completar';
  readonly esquema = CierreTarea;
  readonly origenes = ['agente', 'control_directo'] as const;
  readonly nombresDeCampos = { tareaId: 'qué tarea' };

  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly prisma: PrismaService,
    private readonly repositorio: TareasRepositorio,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(contexto: ContextoSolicitud, carga: CierreTarea): Promise<Propuesta<CierreTarea>> {
    const fila = await this.repositorio.porId(contexto, carga.tareaId);
    if (!fila) throw noEncontrada();
    const reabrir = carga.reabrir === true;
    if (reabrir ? fila.estado !== 'completada' : fila.estado !== 'pendiente') {
      throw errorApi(409, 'TAREA_NO_MODIFICABLE', reabrir ? 'Solo se puede reabrir una tarea completada.' : `Esta tarea ya está ${fila.estado === 'completada' ? 'completada' : 'cancelada'}.`);
    }
    const vista: VistaConfirmacion = {
      accion: reabrir ? 'Reabrir esta tarea' : 'Marcar esta tarea como hecha',
      datos: [{ etiqueta: 'Tarea', valor: resumen({ titulo: fila.titulo, fecha: fila.fecha ? fila.fecha.toISOString().slice(0, 10) : null, hora: fila.hora, esperaDe: fila.esperaDe, esperaQue: fila.esperaQue }) }],
      // Se puede reabrir: no hay nada irreversible
      irreversible: null,
      confirmable: true,
      motivoNoConfirmable: null,
    };
    return vista;
  }

  async ejecutar(contexto: ContextoSolicitud, carga: CierreTarea): Promise<ResultadoEjecucion> {
    const fila = await this.repositorio.porId(contexto, carga.tareaId);
    if (!fila) throw noEncontrada();
    const reabrir = carga.reabrir === true;
    const desde = reabrir ? 'completada' : 'pendiente';
    // Ya está como se pide: el resultado es el mismo y no se vuelve a escribir (P-07)
    if (fila.estado !== desde) {
      if (fila.estado === (reabrir ? 'pendiente' : 'completada')) return { tipo: 'ejecutada', resultado: await this.contrato(contexto, fila) };
      throw errorApi(409, 'TAREA_NO_MODIFICABLE', 'Esta tarea ya no se puede cambiar así.');
    }
    await this.prisma.deOrganizacion(contexto.organizacionId).tarea.updateMany({
      where: { id: fila.id, perfilId: contexto.perfilId, estado: desde },
      data: reabrir ? { estado: 'pendiente', completadaEn: null } : { estado: 'completada', completadaEn: new Date() },
    });
    const nueva = await this.repositorio.porId(contexto, fila.id);
    if (!nueva) throw noEncontrada();
    return { tipo: 'ejecutada', resultado: await this.contrato(contexto, nueva) };
  }

  private async contrato(contexto: ContextoSolicitud, fila: NonNullable<Awaited<ReturnType<TareasRepositorio['porId']>>>) {
    return aContrato(fila, hoyEnZona(new Date(), await this.repositorio.zonaDelPerfil(contexto)));
  }
}
