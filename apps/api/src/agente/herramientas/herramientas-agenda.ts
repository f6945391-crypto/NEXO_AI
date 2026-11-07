import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  ArgsCancelarEvento,
  ArgsConsultarAgenda,
  ArgsModificarEvento,
  ArgsRegistrarEvento,
  type OperacionRespuesta,
  type TurnoDeHerramienta,
} from '@nexoai/contratos';
import { ConsultaAgendaService } from '../../agenda/consulta-agenda.service';
import { enZona, instanteLocal, isoConDesfase, sumarDias, type FechaLocal } from '../../agenda/dominio/tiempo';
import type { ContextoSolicitud } from '../../identidad/contexto';
import { ClienteGoogle, permisoFaltante } from '../../integraciones/cliente-google';
import { OperacionesService } from '../../operaciones/operaciones.service';
import { EjecutorHerramientas } from './ejecutor-herramientas';
import { AVISO_CONTENIDO_EXTERNO } from './contenido-externo';
import type { EntornoHerramienta, ResultadoHerramienta } from './herramienta';
import { armarLista, describirRango } from './lista-agenda';

// T-031 · specs/07-agente/plan.md §5 · REQ-CUN01-01, 06, 08, 13. Las herramientas de agenda del agente.
// **Ninguna escribe** (P-01, AD-09): consultan la réplica o proponen una Operación `agenda.*` con origen
// `agente`, y la ejecución es siempre la confirmación de la persona (P-03). El modelo da fechas y horas en
// la zona de la persona; el código las convierte (P-05). Si falta el fin, no se manda: lo pone la
// Operación con la duración por defecto (H-AG-01).

// Un rango más largo no hace falta para conversar, y le daría al proveedor más agenda de la necesaria (H-AGT-12)
export const DIAS_MAXIMOS_CONSULTA = 31;

const fecha = (texto: string): FechaLocal => {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return { anio: anio!, mes: mes!, dia: dia! };
};
const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
// T-043 · REQ-CUN01-01 (decisión 19 de 02-agenda): un fin igual o anterior al inicio es del día siguiente
// («de 11 pm a 12», «de 11 pm a 1 am»).
const instanteDeFin = (dia: FechaLocal, inicioMin: number, finMin: number, zona: string): Date =>
  instanteLocal(finMin <= inicioMin ? sumarDias(dia, 1) : dia, finMin, zona);
const aTexto = (f: FechaLocal) => `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;

const conError = (codigo: string, mensaje: string, campos?: string[]): ResultadoHerramienta => ({
  paraModelo: { error: { codigo, mensaje, ...(campos ? { campos } : {}) } },
});

// La tarjeta la muestra el código; al modelo le basta saber que la hay y si se puede confirmar.
function comoPropuesta(op: OperacionRespuesta): ResultadoHerramienta {
  const turno: TurnoDeHerramienta = { tipo: 'propuesta', operacion: op };
  return {
    paraModelo: {
      propuesta: {
        id: op.id,
        accion: op.vistaConfirmacion.accion,
        confirmable: op.vistaConfirmacion.confirmable,
        motivoNoConfirmable: op.vistaConfirmacion.motivoNoConfirmable,
      },
      nota: 'La persona ya ve la tarjeta de confirmación. No repitas sus datos.',
    },
    operacionId: op.id,
    turno,
  };
}

@Injectable()
export class HerramientasAgenda implements OnModuleInit {
  constructor(
    private readonly ejecutor: EjecutorHerramientas,
    private readonly consulta: ConsultaAgendaService,
    private readonly operaciones: OperacionesService,
    private readonly google: ClienteGoogle,
  ) {}

  onModuleInit(): void {
    this.ejecutor.registrar({
      nombre: 'agenda.consultar',
      descripcion: 'Lee los compromisos de la persona en un rango de días, opcionalmente entre dos horas. Úsala antes de modificar o cancelar, para saber el id.',
      esquema: ArgsConsultarAgenda,
      ejecutar: (contexto, args, entorno) => this.consultar(contexto, args, entorno),
    });
    this.ejecutor.registrar({
      nombre: 'agenda.registrar_evento',
      descripcion: 'Propone registrar un compromiso nuevo. Pasa solo lo que la persona dijo; no inventes la fecha, la hora ni el fin.',
      esquema: ArgsRegistrarEvento,
      ejecutar: (contexto, args, entorno) => this.registrar(contexto, args, entorno),
    });
    this.ejecutor.registrar({
      nombre: 'agenda.modificar_evento',
      descripcion: 'Propone cambiar el título o el horario de un compromiso propio. Pasa solo lo que cambia.',
      esquema: ArgsModificarEvento,
      ejecutar: (contexto, args, entorno) => this.modificar(contexto, args, entorno),
    });
    this.ejecutor.registrar({
      nombre: 'agenda.cancelar_evento',
      descripcion: 'Propone cancelar un compromiso propio.',
      esquema: ArgsCancelarEvento,
      ejecutar: (contexto, args, entorno) => this.cancelar(contexto, args, entorno),
    });
  }

  // REQ-CUN01-08, REQ-ACC-08: sin permiso de calendario, ninguna herramienta de agenda llama a nada
  private async exigirCalendario(contexto: ContextoSolicitud): Promise<void> {
    if (!(await this.google.tienePermiso(contexto, 'calendario'))) throw permisoFaltante('calendario');
  }

  private async consultar(contexto: ContextoSolicitud, args: ArgsConsultarAgenda, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    await this.exigirCalendario(contexto);
    const zona = entorno.referencia.zonaHoraria;
    const desde = fecha(args.desde);
    const hasta = fecha(args.hasta);
    const dias = Math.round((Date.UTC(hasta.anio, hasta.mes - 1, hasta.dia) - Date.UTC(desde.anio, desde.mes - 1, desde.dia)) / 86_400_000) + 1;
    if (dias < 1) return conError('ARGUMENTOS_INVALIDOS', 'El primer día del rango tiene que ser anterior o igual al último.', ['hasta']);
    if (dias > DIAS_MAXIMOS_CONSULTA) return conError('RANGO_DEMASIADO_LARGO', `Consulta como mucho ${DIAS_MAXIMOS_CONSULTA} días.`, ['hasta']);

    // REQ-CUN01-13: la consulta del asistente refleja Google en ese momento, sin el margen de las pantallas (T-043)
    const eventos = await this.consulta.enRango(contexto, instanteLocal(desde, 0, zona), instanteLocal(sumarDias(hasta, 1), 0, zona), { alDia: true });
    // Con horas, cada día tiene su ventana: «esta semana por la tarde»
    const desdeMin = args.horaDesde ? minutos(args.horaDesde) : 0;
    const hastaMin = args.horaHasta ? minutos(args.horaHasta) : 24 * 60;
    const ventanas = Array.from({ length: dias }, (_, i) => {
      const dia = sumarDias(desde, i);
      return [instanteLocal(dia, desdeMin, zona).getTime(), instanteLocal(dia, hastaMin, zona).getTime()] as const;
    });
    const enVentana = eventos.filter((e) => ventanas.some(([a, b]) => Date.parse(e.inicio) < b && Date.parse(e.fin) > a));

    const lista = armarLista(enVentana, zona, describirRango(desde, hasta, args.horaDesde, args.horaHasta), entorno.referencia.instante);
    const enLocal = (iso: string) => {
      const l = enZona(new Date(iso), zona);
      return `${aTexto(l)} ${hhmm(l.minutos)}`;
    };
    const turno: TurnoDeHerramienta = { tipo: 'agenda', lista };
    return {
      // H-AGT-12: al modelo, solo título, horas y estado
      paraModelo: {
        compromisos: enVentana.map((e) => ({
          id: e.id,
          titulo: e.titulo,
          inicio: enLocal(e.inicio),
          fin: enLocal(e.fin),
          todoElDia: e.todoElDia,
          cancelado: e.estado === 'cancelado',
          propio: e.esOrganizador,
          autor: e.esOrganizador ? 'la persona' : 'otra persona (invitación)',
        })),
        aviso: AVISO_CONTENIDO_EXTERNO,
        nota: 'La persona ya ve esta lista, armada con su agenda. No la repitas.',
      },
      turno,
    };
  }

  private async registrar(contexto: ContextoSolicitud, args: ArgsRegistrarEvento, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    await this.exigirCalendario(contexto);
    // REQ-CUN01-07, REQ-CAP-04: lo que falta se dice, en el orden en que se pregunta (R-20); nada se inventa
    const faltan = (['fecha', 'horaInicio', 'titulo'] as const).filter((campo) => !args[campo]);
    if (faltan.length > 0) return conError('DATOS_FALTANTES', 'Falta información para proponer el compromiso.', [...faltan]);

    const zona = entorno.referencia.zonaHoraria;
    const dia = fecha(args.fecha!);
    const inicioMin = minutos(args.horaInicio!);
    const inicio = instanteLocal(dia, inicioMin, zona);
    const carga = {
      titulo: args.titulo!,
      inicio: isoConDesfase(inicio, zona),
      // REQ-CUN01-01: sin fin dicho no se manda; lo pone la Operación con una hora (H-AG-01)
      ...(args.horaFin ? { fin: isoConDesfase(instanteDeFin(dia, inicioMin, minutos(args.horaFin), zona), zona) } : {}),
      zonaHoraria: zona,
    };
    return comoPropuesta(await this.proponer(contexto, entorno, 'agenda.registrar', carga));
  }

  private async modificar(contexto: ContextoSolicitud, args: ArgsModificarEvento, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    await this.exigirCalendario(contexto);
    if (!args.titulo && !args.fecha && !args.horaInicio && !args.horaFin) {
      return conError('DATOS_FALTANTES', 'No dice qué cambiar del compromiso.', ['cambio']);
    }
    const zona = entorno.referencia.zonaHoraria;
    // Lo que no se dice se conserva: el mismo día o la misma hora del compromiso, vistos en la zona de la persona
    const evento = await this.consulta.porId(contexto, args.eventoId, { alDia: true });
    const actual = enZona(new Date(evento.inicio), zona);
    const dia = args.fecha ? fecha(args.fecha) : actual;
    const inicioMin = args.horaInicio ? minutos(args.horaInicio) : actual.minutos;
    const carga = {
      eventoId: args.eventoId,
      ...(args.titulo ? { titulo: args.titulo } : {}),
      ...(args.fecha || args.horaInicio
        ? { inicio: isoConDesfase(instanteLocal(dia, inicioMin, zona), zona) }
        : {}),
      ...(args.horaFin ? { fin: isoConDesfase(instanteDeFin(dia, inicioMin, minutos(args.horaFin), zona), zona) } : {}),
    };
    return comoPropuesta(await this.proponer(contexto, entorno, 'agenda.modificar', carga));
  }

  private async cancelar(contexto: ContextoSolicitud, args: ArgsCancelarEvento, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    await this.exigirCalendario(contexto);
    return comoPropuesta(await this.proponer(contexto, entorno, 'agenda.cancelar', { eventoId: args.eventoId }));
  }

  private proponer(contexto: ContextoSolicitud, entorno: EntornoHerramienta, tipo: string, carga: unknown) {
    return this.operaciones.proponer(
      contexto,
      { tipo, carga, origen: 'agente', solicitudOriginal: entorno.solicitudOriginal.slice(0, 2000) },
      { conversacionId: entorno.conversacionId, ...(entorno.enEspera ? { desdeEnEspera: entorno.enEspera } : {}) },
    );
  }
}
