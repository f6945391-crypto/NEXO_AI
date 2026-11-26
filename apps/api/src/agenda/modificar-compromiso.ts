import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ModificacionEvento, type VistaConfirmacion } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PROVEEDOR_CALENDARIO, type ProveedorCalendario } from '../integraciones/calendario/proveedor-calendario';
import { permisoFaltante } from '../integraciones/cliente-google';
import { RegistroOperaciones, type EjecutorOperacion, type Propuesta, type ResultadoEjecucion } from '../operaciones/registro';
import { errorApi } from '../plataforma/errores';
import { aContrato } from './consulta-agenda.service';
import { isoConDesfase } from './dominio/tiempo';
import { eventoQueSePuedeCambiar, SIN_AVISOS, SOLO_ESTA_VEZ } from './evento-propio';
import { fechaLarga, horario, nombreDeZona } from './formato';
import { ReplicaEventosRepositorio } from './replica-eventos.repositorio';
import { RevisionHorario } from './revision-horario';
import { SincronizadorCalendario } from './sincronizador-calendario';

// REQ-CUN01-02, 04, 05, 06 · T-019 · specs/02-agenda/plan.md §6. Operación `agenda.modificar`: cambia
// el título o la hora de un compromiso propio, solo esa instancia (H-AG-04). Un horario nuevo pasa por
// la misma revisión que registrar, al proponer y otra vez al confirmar (H-AG-07).

type Fila = NonNullable<Awaited<ReturnType<ReplicaEventosRepositorio['porId']>>>;

@Injectable()
export class ModificarCompromiso implements EjecutorOperacion<ModificacionEvento>, OnModuleInit {
  readonly tipo = 'agenda.modificar';
  readonly esquema = ModificacionEvento;
  // Cambiar algo pide datos nuevos: lo propone el agente, no es un control directo (DP-01)
  readonly origenes = ['agente'] as const;
  readonly nombresDeCampos = { eventoId: 'qué compromiso quieres cambiar' };

  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly sincronizador: SincronizadorCalendario,
    private readonly replica: ReplicaEventosRepositorio,
    private readonly revisionHorario: RevisionHorario,
    @Inject(PROVEEDOR_CALENDARIO) private readonly proveedor: ProveedorCalendario,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(contexto: ContextoSolicitud, carga: ModificacionEvento): Promise<Propuesta<ModificacionEvento>> {
    if ((await this.sincronizador.sincronizar(contexto)).tipo === 'sin_permiso') throw permisoFaltante('calendario');
    const evento = await eventoQueSePuedeCambiar(this.replica, contexto, carga.eventoId);
    const completa = this.completar(evento, carga);
    return { vista: await this.vista(contexto, evento, completa), carga: completa };
  }

  async ejecutar(contexto: ContextoSolicitud, carga: ModificacionEvento): Promise<ResultadoEjecucion> {
    await this.sincronizador.sincronizar(contexto);
    const evento = await eventoQueSePuedeCambiar(this.replica, contexto, carga.eventoId);
    const vista = await this.vista(contexto, evento, carga);
    if (!vista.confirmable) return { tipo: 'reproponer', vistaConfirmacion: vista };

    const actualizado = await this.proveedor.actualizar(contexto, evento.googleEventoId, {
      titulo: carga.titulo,
      inicio: new Date(carga.inicio!),
      fin: new Date(carga.fin!),
      zonaHoraria: carga.zonaHoraria,
    });
    return { tipo: 'ejecutada', resultado: aContrato(await this.sincronizador.incorporar(contexto, actualizado)) };
  }

  // La carga con todo lo que quedará: lo que no cambia se toma del evento. Un inicio nuevo sin fin
  // conserva la duración.
  private completar(evento: Fila, carga: ModificacionEvento): ModificacionEvento {
    const cambiaHora = carga.inicio !== undefined || carga.fin !== undefined;
    if (cambiaHora && evento.todoElDia) {
      throw errorApi(409, 'EVENTO_NO_MODIFICABLE', 'Los compromisos de todo el día no se cambian de hora desde aquí; sí se les puede cambiar el título.');
    }
    const zonaHoraria = evento.zonaHoraria;
    const inicio = carga.inicio ? new Date(carga.inicio) : evento.inicio;
    const fin = carga.fin ? new Date(carga.fin) : new Date(inicio.getTime() + (evento.fin.getTime() - evento.inicio.getTime()));
    if (fin <= inicio) throw errorApi(400, 'SOLICITUD_INVALIDA', 'El fin tiene que ser posterior al inicio.');
    return {
      eventoId: evento.id,
      titulo: carga.titulo ?? evento.titulo,
      inicio: isoConDesfase(inicio, zonaHoraria),
      fin: isoConDesfase(fin, zonaHoraria),
      zonaHoraria,
    };
  }

  private async vista(contexto: ContextoSolicitud, evento: Fila, completa: ModificacionEvento): Promise<VistaConfirmacion> {
    const zona = completa.zonaHoraria ?? evento.zonaHoraria;
    const inicio = new Date(completa.inicio!);
    const fin = new Date(completa.fin!);
    const cambiaHora = inicio.getTime() !== evento.inicio.getTime() || fin.getTime() !== evento.fin.getTime();
    // Solo un horario nuevo se revisa: renombrar no tiene por qué resolver un solape que ya existía
    const revision = cambiaHora
      ? await this.revisionHorario.revisar(contexto, { inicio, fin }, zona, evento.id)
      : { confirmable: true, motivoNoConfirmable: null, conflicto: null };
    const cuando = (a: Date, b: Date) => `${fechaLarga(a, zona)}, ${horario(a, b, zona)}`;
    return {
      accion: 'Cambiar este compromiso en tu calendario de Google',
      datos: [
        { etiqueta: 'Compromiso', valor: evento.titulo },
        ...(completa.titulo !== evento.titulo ? [{ etiqueta: 'Título nuevo', valor: completa.titulo! }] : []),
        ...(cambiaHora
          ? [
              { etiqueta: 'Antes', valor: cuando(evento.inicio, evento.fin) },
              { etiqueta: 'Ahora', valor: cuando(inicio, fin) },
            ]
          : [{ etiqueta: 'Cuándo', valor: evento.todoElDia ? `${fechaLarga(evento.inicio, zona)}, todo el día` : cuando(inicio, fin) }]),
        { etiqueta: 'Zona horaria', valor: nombreDeZona(zona, inicio) },
        ...(evento.serieId ? [SOLO_ESTA_VEZ] : []),
        SIN_AVISOS,
      ],
      irreversible: null,
      ...revision,
    };
  }
}
