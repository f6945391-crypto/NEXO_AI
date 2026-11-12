import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PropuestaTarea, type VistaConfirmacion } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { RegistroOperaciones, type EjecutorOperacion, type Propuesta, type ResultadoEjecucion } from '../operaciones/registro';
import { PrismaService } from '../plataforma/prisma.service';
import { aContrato } from './consulta-tareas.service';
import { hoyEnZona } from './dominio/franjas';
import { cuando } from './dominio/formato';
import { TareasRepositorio } from './tareas.repositorio';

// REQ-CUN03-01, 07 · T-048 · specs/08-tareas-personales/plan.md §4. Operación `tareas.registrar`: la
// propuesta no escribe nada. La fecha solo la pone la persona; sin ella, la tarea queda sin fecha y el
// sistema no inventa ninguna. Registrar pasa siempre por el asistente: no es un control directo (R-42).

@Injectable()
export class RegistrarTarea implements EjecutorOperacion<PropuestaTarea>, OnModuleInit {
  readonly tipo = 'tareas.registrar';
  readonly esquema = PropuestaTarea;
  readonly origenes = ['agente'] as const;
  readonly nombresDeCampos = { titulo: 'el título de la tarea', esperaQue: 'qué esperas', esperaDe: 'de quién lo esperas' };

  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly prisma: PrismaService,
    private readonly repositorio: TareasRepositorio,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(_contexto: ContextoSolicitud, carga: PropuestaTarea): Promise<Propuesta<PropuestaTarea>> {
    const datos: VistaConfirmacion['datos'] = [
      { etiqueta: 'Tarea', valor: carga.titulo },
      { etiqueta: 'Fecha', valor: cuando({ fecha: carga.fecha ?? null, hora: carga.hora ?? null }) },
      ...(carga.esperaDe && carga.esperaQue
        ? [
            { etiqueta: 'Esperas', valor: carga.esperaQue },
            { etiqueta: 'De quién', valor: carga.esperaDe },
            { etiqueta: 'Aviso', valor: `No se le escribe ni se le avisa a ${carga.esperaDe}: solo queda anotado para ti` },
          ]
        : []),
      // REQ-CUN03-08: tener fecha no crea nada fuera de NexoAI
      ...(carga.fecha ? [{ etiqueta: 'Calendario', valor: 'No se crea ningún evento en tu calendario de Google' }] : []),
    ];
    return {
      accion: 'Anotar esta tarea',
      datos,
      // Se puede completar o cancelar después: no hay nada irreversible
      irreversible: null,
      confirmable: true,
      motivoNoConfirmable: null,
    };
  }

  async ejecutar(contexto: ContextoSolicitud, carga: PropuestaTarea, operacion?: { id: string }): Promise<ResultadoEjecucion> {
    const fila = await this.prisma.deOrganizacion(contexto.organizacionId).tarea.create({
      data: {
        organizacionId: contexto.organizacionId,
        perfilId: contexto.perfilId,
        // Plan §3: la Operación que la creó
        operacionId: operacion?.id ?? null,
        titulo: carga.titulo,
        fecha: carga.fecha ? new Date(`${carga.fecha}T00:00:00Z`) : null,
        hora: carga.hora ?? null,
        esperaDe: carga.esperaDe ?? null,
        esperaQue: carga.esperaQue ?? null,
      },
    });
    const hoy = hoyEnZona(new Date(), await this.repositorio.zonaDelPerfil(contexto));
    return { tipo: 'ejecutada', resultado: aContrato(fila, hoy) };
  }
}
