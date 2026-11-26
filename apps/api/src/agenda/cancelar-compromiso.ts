import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { CancelacionEvento } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PROVEEDOR_CALENDARIO, type ProveedorCalendario } from '../integraciones/calendario/proveedor-calendario';
import { permisoFaltante } from '../integraciones/cliente-google';
import { RegistroOperaciones, type EjecutorOperacion, type Propuesta, type ResultadoEjecucion } from '../operaciones/registro';
import { errorApi } from '../plataforma/errores';
import { aContrato } from './consulta-agenda.service';
import { eventoQueSePuedeCambiar, SIN_AVISOS, SOLO_ESTA_VEZ } from './evento-propio';
import { fechaLarga, horario, nombreDeZona } from './formato';
import { ReplicaEventosRepositorio } from './replica-eventos.repositorio';
import { SincronizadorCalendario } from './sincronizador-calendario';

// REQ-CUN01-06, REQ-CUN01-11 · T-019 · DP-01, H-AG-04, H-AG-05. Operación `agenda.cancelar`: quita de
// Google un compromiso propio, solo esa instancia, siempre con confirmación previa. Es también un control
// directo: funciona sin el asistente (DP-01). En la réplica queda como cancelado, no se borra (R-25).

@Injectable()
export class CancelarCompromiso implements EjecutorOperacion<CancelacionEvento>, OnModuleInit {
  readonly tipo = 'agenda.cancelar';
  readonly esquema = CancelacionEvento;
  readonly origenes = ['agente', 'control_directo'] as const;
  readonly nombresDeCampos = { eventoId: 'qué compromiso quieres cancelar' };

  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly sincronizador: SincronizadorCalendario,
    private readonly replica: ReplicaEventosRepositorio,
    @Inject(PROVEEDOR_CALENDARIO) private readonly proveedor: ProveedorCalendario,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(contexto: ContextoSolicitud, carga: CancelacionEvento): Promise<Propuesta<CancelacionEvento>> {
    if ((await this.sincronizador.sincronizar(contexto)).tipo === 'sin_permiso') throw permisoFaltante('calendario');
    const evento = await eventoQueSePuedeCambiar(this.replica, contexto, carga.eventoId);
    const zona = evento.zonaHoraria;
    return {
      accion: 'Cancelar este compromiso',
      datos: [
        { etiqueta: 'Compromiso', valor: evento.titulo },
        { etiqueta: 'Cuándo', valor: `${fechaLarga(evento.inicio, zona)}, ${evento.todoElDia ? 'todo el día' : horario(evento.inicio, evento.fin, zona)}` },
        { etiqueta: 'Zona horaria', valor: nombreDeZona(zona, evento.inicio) },
        ...(evento.serieId ? [SOLO_ESTA_VEZ] : []),
        SIN_AVISOS,
      ],
      irreversible: 'Se quita de tu calendario de Google, y NexoAI no puede volver a crearlo tal como estaba.',
      confirmable: true,
      motivoNoConfirmable: null,
    };
  }

  async ejecutar(contexto: ContextoSolicitud, carga: CancelacionEvento): Promise<ResultadoEjecucion> {
    const evento = await this.replica.porId(contexto, carga.eventoId);
    if (!evento) throw errorApi(404, 'EVENTO_NO_ENCONTRADO', 'No existe ese compromiso en tu agenda.');
    // Ya cancelado en Google desde que se propuso: el resultado es el mismo y no se vuelve a llamar
    if (evento.estado !== 'cancelado') await this.proveedor.cancelar(contexto, evento.googleEventoId);
    const cancelado = await this.sincronizador.marcarCancelado(contexto, evento.googleEventoId);
    return { tipo: 'ejecutada', resultado: aContrato(cancelado ?? evento) };
  }
}
