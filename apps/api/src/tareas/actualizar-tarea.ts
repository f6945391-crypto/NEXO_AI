import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ActualizacionTarea, type VistaConfirmacion } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { RegistroOperaciones, type EjecutorOperacion, type Propuesta, type ResultadoEjecucion } from '../operaciones/registro';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { aContrato, noEncontrada } from './consulta-tareas.service';
import { aplicarCambio, type DatosTarea } from './dominio/cambios';
import { hoyEnZona } from './dominio/franjas';
import { resumen } from './dominio/formato';
import { TareasRepositorio } from './tareas.repositorio';

// REQ-CUN03-06 · T-048. Operación `tareas.actualizar`: cambia el texto o la fecha, pospone, o cancela.
// La tarjeta muestra cómo está y cómo quedaría. Cancelar deja la tarea cancelada, sin borrarla (R-25).
// Solo se cambia una tarea pendiente.

const datosDe = (fila: { titulo: string; fecha: Date | null; hora: string | null; esperaDe: string | null; esperaQue: string | null }): DatosTarea => ({
  titulo: fila.titulo,
  fecha: fila.fecha ? fila.fecha.toISOString().slice(0, 10) : null,
  hora: fila.hora,
  esperaDe: fila.esperaDe,
  esperaQue: fila.esperaQue,
});

export const noPendiente = (estado: string) =>
  errorApi(409, 'TAREA_NO_MODIFICABLE', `Esta tarea ya está ${estado === 'completada' ? 'completada' : 'cancelada'}: no se puede cambiar.`);

@Injectable()
export class ActualizarTarea implements EjecutorOperacion<ActualizacionTarea>, OnModuleInit {
  readonly tipo = 'tareas.actualizar';
  readonly esquema = ActualizacionTarea;
  // Cambiar algo que ya existe funciona también sin el asistente (DP-01)
  readonly origenes = ['agente', 'control_directo'] as const;
  readonly nombresDeCampos = { tareaId: 'qué tarea quieres cambiar' };

  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly prisma: PrismaService,
    private readonly repositorio: TareasRepositorio,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(contexto: ContextoSolicitud, carga: ActualizacionTarea): Promise<Propuesta<ActualizacionTarea>> {
    const fila = await this.repositorio.porId(contexto, carga.tareaId);
    if (!fila) throw noEncontrada();
    if (fila.estado !== 'pendiente') throw noPendiente(fila.estado);
    const antes = datosDe(fila);

    if (carga.cancelar) {
      const vista: VistaConfirmacion = {
        accion: 'Cancelar esta tarea',
        datos: [{ etiqueta: 'Tarea', valor: resumen(antes) }],
        irreversible: 'Deja de aparecer en tu lista de pendientes. No se borra: puedes consultarla después como cancelada.',
        confirmable: true,
        motivoNoConfirmable: null,
      };
      return vista;
    }

    const { tareaId: _tarea, cancelar: _cancelar, ...cambio } = carga;
    const resultado = aplicarCambio(antes, cambio);
    if (resultado.tipo === 'invalido') throw errorApi(400, 'SOLICITUD_INVALIDA', `No se puede aplicar el cambio: ${resultado.motivo}.`);
    return {
      accion: 'Cambiar esta tarea',
      datos: [
        { etiqueta: 'Ahora', valor: resumen(antes) },
        { etiqueta: 'Quedaría', valor: resumen(resultado.despues) },
      ],
      irreversible: null,
      confirmable: true,
      motivoNoConfirmable: null,
    };
  }

  async ejecutar(contexto: ContextoSolicitud, carga: ActualizacionTarea): Promise<ResultadoEjecucion> {
    const fila = await this.repositorio.porId(contexto, carga.tareaId);
    if (!fila) throw noEncontrada();
    if (fila.estado !== 'pendiente') throw noPendiente(fila.estado);

    let data: Record<string, unknown>;
    if (carga.cancelar) {
      data = { estado: 'cancelada', canceladaEn: new Date() };
    } else {
      const { tareaId: _tarea, cancelar: _cancelar, ...cambio } = carga;
      // La tarea pudo cambiar desde la propuesta (otro cambio confirmado antes): se aplica sobre lo de ahora
      const resultado = aplicarCambio(datosDe(fila), cambio);
      if (resultado.tipo === 'invalido') throw errorApi(400, 'SOLICITUD_INVALIDA', `No se puede aplicar el cambio: ${resultado.motivo}.`);
      const d = resultado.despues;
      data = {
        titulo: d.titulo,
        fecha: d.fecha ? new Date(`${d.fecha}T00:00:00Z`) : null,
        hora: d.hora,
        esperaDe: d.esperaDe,
        esperaQue: d.esperaQue,
      };
    }
    // Condicional: solo cambia si sigue pendiente (una confirmación y un control directo a la vez)
    const cambiada = await this.prisma.deOrganizacion(contexto.organizacionId).tarea.updateMany({
      where: { id: fila.id, perfilId: contexto.perfilId, estado: 'pendiente' },
      data,
    });
    // Otra confirmación o un control directo la cerró entre medias: se dice cómo quedó de verdad
    if (cambiada.count !== 1) throw noPendiente((await this.repositorio.porId(contexto, fila.id))?.estado ?? 'cancelada');
    const nueva = await this.repositorio.porId(contexto, fila.id);
    if (!nueva) throw noEncontrada();
    return { tipo: 'ejecutada', resultado: aContrato(nueva, hoyEnZona(new Date(), await this.repositorio.zonaDelPerfil(contexto))) };
  }
}
