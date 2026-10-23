import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PropuestaEvento, type VistaConfirmacion } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PROVEEDOR_CALENDARIO, type ProveedorCalendario } from '../integraciones/calendario/proveedor-calendario';
import { permisoFaltante } from '../integraciones/cliente-google';
import { RegistroOperaciones, type EjecutorOperacion, type Propuesta, type ResultadoEjecucion } from '../operaciones/registro';
import { PrismaService } from '../plataforma/prisma.service';
import { aContrato } from './consulta-agenda.service';
import { detectarConflictos, generarAlternativas } from './dominio/conflictos';
import { isoConDesfase } from './dominio/tiempo';
import { fechaLarga, horario, nombreDeZona } from './formato';
import { ReplicaEventosRepositorio } from './replica-eventos.repositorio';
import { SincronizadorCalendario } from './sincronizador-calendario';

// REQ-CUN01-02, 03, 04, 05, 07 · T-017, T-018 · specs/02-agenda/plan.md §3 y §6. Operación
// `agenda.registrar`: la propuesta consulta los solapes tras sincronizar y no escribe nada; si choca,
// dice con qué y ofrece alternativas (DP-02). Solo `ejecutar`, al confirmar, vuelve a comprobar
// (H-AG-07), crea el evento en Google y guarda en la réplica lo que Google devolvió.

// H-AG-01, decidido por el equipo el 22 de octubre de 2026: sin hora de fin, una hora.
export const DURACION_POR_DEFECTO_MIN = 60;

@Injectable()
export class RegistrarCompromiso implements EjecutorOperacion<PropuestaEvento>, OnModuleInit {
  readonly tipo = 'agenda.registrar';
  readonly esquema = PropuestaEvento;
  // Crear algo nuevo pasa siempre por el agente: no es un control directo (R-42, DP-01)
  readonly origenes = ['agente'] as const;
  readonly nombresDeCampos = { titulo: 'el título', inicio: 'la fecha y la hora de inicio' };

  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly prisma: PrismaService,
    private readonly sincronizador: SincronizadorCalendario,
    private readonly replica: ReplicaEventosRepositorio,
    @Inject(PROVEEDOR_CALENDARIO) private readonly proveedor: ProveedorCalendario,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(contexto: ContextoSolicitud, carga: PropuestaEvento): Promise<Propuesta<PropuestaEvento>> {
    // REQ-CUN01-08: sin permiso de calendario no hay nada que proponer. Con permiso, la réplica se pone
    // al día antes de mirar los solapes (REQ-CUN01-02).
    const sincronizacion = await this.sincronizador.sincronizar(contexto);
    if (sincronizacion.tipo === 'sin_permiso') throw permisoFaltante('calendario');

    const zonaHoraria = carga.zonaHoraria ?? (await this.zonaDelPerfil(contexto));
    const inicio = new Date(carga.inicio);
    const finPorDefecto = !carga.fin;
    const fin = carga.fin ? new Date(carga.fin) : new Date(inicio.getTime() + DURACION_POR_DEFECTO_MIN * 60_000);
    // Lo que se guarda es lo que se muestra y lo que se registrará al confirmar (REQ-CUN01-04)
    const completa: PropuestaEvento = {
      titulo: carga.titulo,
      inicio: isoConDesfase(inicio, zonaHoraria),
      fin: isoConDesfase(fin, zonaHoraria),
      zonaHoraria,
    };

    return { vista: await this.revisar(contexto, completa, finPorDefecto), carga: completa };
  }

  async ejecutar(contexto: ContextoSolicitud, carga: PropuestaEvento): Promise<ResultadoEjecucion> {
    // H-AG-07: la agenda pudo cambiar desde que se propuso. Si ahora choca, no se escribe nada y se
    // propone de nuevo, con el conflicto y alternativas nuevas.
    await this.sincronizador.sincronizar(contexto);
    const vista = await this.revisar(contexto, carga, false);
    if (!vista.confirmable) return { tipo: 'reproponer', vistaConfirmacion: vista };

    const evento = await this.proveedor.crear(contexto, {
      titulo: carga.titulo,
      inicio: new Date(carga.inicio),
      fin: new Date(carga.fin ?? carga.inicio),
      zonaHoraria: carga.zonaHoraria ?? 'UTC',
    });
    // La tarjeta de resultado se construye con lo que devolvió Google, no con lo propuesto
    return { tipo: 'ejecutada', resultado: aContrato(await this.sincronizador.incorporar(contexto, evento)) };
  }

  // La tarjeta de confirmación de una carga completa, con los solapes ya consultados en la réplica.
  private async revisar(contexto: ContextoSolicitud, carga: PropuestaEvento, finPorDefecto: boolean): Promise<VistaConfirmacion> {
    const zonaHoraria = carga.zonaHoraria ?? 'UTC';
    const inicio = new Date(carga.inicio);
    const fin = new Date(carga.fin ?? carga.inicio);
    const DIA = 24 * 3600_000;
    // Lo que hay alrededor: los solapes y, si los hay, los días donde buscar alternativas (DP-02)
    const cercanos = await this.replica.enRango(contexto, new Date(inicio.getTime() - DIA), new Date(inicio.getTime() + 9 * DIA));
    const choques = detectarConflictos(cercanos, { inicio, fin });
    const alternativas = choques.length ? generarAlternativas(cercanos, { inicio, fin }, { zonaHoraria }) : [];
    const causas = choques.map((c) => cercanos.find((e) => e.id === c.id)!);
    const iso = (d: Date) => isoConDesfase(d, zonaHoraria);

    return {
      accion: 'Registrar este compromiso en tu calendario de Google',
      datos: [
        { etiqueta: 'Título', valor: carga.titulo },
        { etiqueta: 'Fecha', valor: fechaLarga(inicio, zonaHoraria) },
        { etiqueta: 'Hora', valor: horario(inicio, fin, zonaHoraria) },
        { etiqueta: 'Zona horaria', valor: nombreDeZona(zonaHoraria, inicio) },
        ...(finPorDefecto ? [{ etiqueta: 'Duración', valor: '1 hora, porque no indicaste la hora de fin' }] : []),
        ...(alternativas.length
          ? [{ etiqueta: 'Alternativas', valor: alternativas.map((a) => `${fechaLarga(a.inicio, zonaHoraria)}, ${horario(a.inicio, a.fin, zonaHoraria)}`).join(' · ') }]
          : []),
      ],
      // Se puede cancelar después y no se avisa a nadie: no hay nada irreversible
      irreversible: null,
      // REQ-CUN01-05: un solape impide confirmar hasta que se elija otro horario
      confirmable: causas.length === 0,
      motivoNoConfirmable: causas.length
        ? `Se superpone con ${causas.map((e) => `«${e.titulo}», de ${horario(e.inicio, e.fin, zonaHoraria)}`).join(' y con ')}. ${
            alternativas.length ? 'Elige una de las alternativas u otro horario.' : 'Elige otro horario.'
          }`
        : null,
      conflicto: causas.length
        ? {
            eventos: causas.map((e) => ({ id: e.id, titulo: e.titulo, inicio: iso(e.inicio), fin: iso(e.fin) })),
            alternativas: alternativas.map((a) => ({ inicio: iso(a.inicio), fin: iso(a.fin) })),
          }
        : null,
    };
  }

  private async zonaDelPerfil(contexto: ContextoSolicitud): Promise<string> {
    const perfil = await this.prisma.deOrganizacion(contexto.organizacionId).perfilUsuario.findUniqueOrThrow({ where: { id: contexto.perfilId } });
    return perfil.zonaHoraria ?? 'UTC';
  }
}
