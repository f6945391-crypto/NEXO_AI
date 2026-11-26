import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { CancelarReunion, ConvocarReunion, MoverReunion, type VistaConfirmacion } from '@nexoai/contratos';
import { fechaLarga, horario, nombreDeZona } from '../agenda/formato';
import { SincronizadorCalendario } from '../agenda/sincronizador-calendario';
import type { ContextoSolicitud } from '../identidad/contexto';
import { ClienteGoogle, permisoFaltante } from '../integraciones/cliente-google';
import { PROVEEDOR_CALENDARIO, type ProveedorCalendario } from '../integraciones/calendario/proveedor-calendario';
import { RegistroOperaciones, type EjecutorOperacion, type Propuesta, type ResultadoEjecucion } from '../operaciones/registro';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { nombreVisible } from './dominio/grupo';
import { lista, ReunionesService, type PersonaDeReunion } from './reuniones.service';

// specs/10-reuniones/plan.md §6 · T-132 · REQ-CUN06-10 a 16 · AD-09, P-03, D-REU-15, D-REU-16. Convocar,
// mover y cancelar una reunión. Las tres avisan a los invitados por Google; solo quien convocó las propone.

const duracionTexto = (minutos: number) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} minutos`;
  return `${h} ${h === 1 ? 'hora' : 'horas'}${m ? ` y ${m} minutos` : ''}`;
};
const personas = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`;
const horaEn = (instante: Date, zona: string) => new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instante);
const ciudad = (zona: string) => (zona.split('/').pop() ?? zona).replaceAll('_', ' ');

// REQ-CUN06-10, 12: quiénes reciben la invitación y a qué dirección; quién no se comprobó; otras zonas
function datosInvitados(invitados: (PersonaDeReunion & { direccion: string; conGoogle: boolean })[], inicio: Date, zona: string) {
  const etiqueta = (i: (typeof invitados)[number]) => `${nombreVisible(i.correo)} (${i.direccion}${i.conGoogle ? '' : ', sin Google conectado'})`;
  const obligatorios = invitados.filter((i) => !i.opcional);
  const opcionales = invitados.filter((i) => i.opcional);
  const sinComprobar = invitados.filter((i) => i.datos !== 'con_datos');
  const otrasZonas = invitados.filter((i) => horaEn(inicio, i.zonaHoraria) !== horaEn(inicio, zona));
  return [
    ...(obligatorios.length ? [{ etiqueta: `Invitados (${obligatorios.length})`, valor: obligatorios.map(etiqueta).join('; ') }] : []),
    ...(opcionales.length ? [{ etiqueta: `Opcionales (${opcionales.length})`, valor: opcionales.map(etiqueta).join('; ') }] : []),
    ...(sinComprobar.length
      ? [{ etiqueta: 'Sin comprobar', valor: `${lista(sinComprobar.map((i) => nombreVisible(i.correo)))}: no se comprobó su disponibilidad, porque ${sinComprobar.length === 1 ? 'no autorizó compartirla o no tiene calendario' : 'no autorizaron compartirla o no tienen calendario'}` }]
      : []),
    ...(otrasZonas.length ? [{ etiqueta: 'En otras zonas', valor: otrasZonas.map((i) => `${nombreVisible(i.correo)}: ${horaEn(inicio, i.zonaHoraria)} en ${ciudad(i.zonaHoraria)}`).join('; ') }] : []),
  ];
}

// Lo que impide confirmar: un obligatorio ocupado o un horario que ya pasó (REQ-CUN06-11)
function motivo(ocupados: PersonaDeReunion[], convocanteId: string, inicio: Date, ahora = new Date()): string | null {
  if (inicio <= ahora) return 'Ese horario ya pasó. Elige otro.';
  if (ocupados.length === 0) return null;
  if (ocupados.length === 1 && ocupados[0]!.perfilId === convocanteId) return 'Tú no estás libre a esa hora.';
  const nombres = lista(ocupados.map((p) => (p.perfilId === convocanteId ? 'tú' : nombreVisible(p.correo))));
  return `${nombres} ${ocupados.length === 1 ? 'no está libre' : 'no están libres'} a esa hora.`;
}

abstract class BaseReunion {
  constructor(
    protected readonly registro: RegistroOperaciones,
    protected readonly reuniones: ReunionesService,
    protected readonly sincronizador: SincronizadorCalendario,
    protected readonly google: ClienteGoogle,
    protected readonly prisma: PrismaService,
    protected readonly proveedor: ProveedorCalendario,
  ) {}

  protected async conCalendario(contexto: ContextoSolicitud): Promise<void> {
    if (!(await this.google.tienePermiso(contexto, 'calendario'))) throw permisoFaltante('calendario');
  }

  // El horario, los invitados con su dirección y quién de los obligatorios está ocupado
  protected async revisar(contexto: ContextoSolicitud, reunionId: string, inicioIso: string, opcionales: string[] | undefined, forzar: boolean) {
    const fila = await this.reuniones.propia(contexto, reunionId);
    const inicio = new Date(inicioIso);
    const fin = new Date(inicio.getTime() + fila.duracionMinutos * 60_000);
    const { convocante, invitados } = await this.reuniones.personas(contexto, fila, inicio, fin, { ...(opcionales ? { opcionales } : {}), forzar });
    const conDireccion = [];
    for (const i of invitados) conDireccion.push({ ...i, ...(await this.reuniones.direccion(contexto, i.perfilId, i.correo)) });
    const ocupados = this.reuniones.ocupadosEn([convocante, ...invitados], inicio, fin);
    return { fila, inicio, fin, invitados: conDireccion, ocupados };
  }

  // Que la agenda de cada invitado muestre ya lo que Google les dejó (REQ-CUN06-13), sin esperar la pasada
  // del trabajador. Un fallo aquí no deshace nada: la próxima sincronización lo pone al día
  protected async alDia(contexto: ContextoSolicitud, perfilIds: string[]): Promise<void> {
    for (const perfilId of perfilIds) {
      const quien = { organizacionId: contexto.organizacionId, perfilId };
      if (await this.google.tienePermiso(quien, 'calendario')) await this.sincronizador.sincronizar(quien).catch(() => null);
    }
  }

  protected async auditar(contexto: ContextoSolicitud, accion: string, detalle: object) {
    await this.prisma.deOrganizacion(contexto.organizacionId).eventoAuditoria.create({ data: { organizacionId: contexto.organizacionId, perfilId: contexto.perfilId, accion, detalle } });
  }
}

@Injectable()
export class ConvocarReunionOperacion extends BaseReunion implements EjecutorOperacion<ConvocarReunion>, OnModuleInit {
  readonly tipo = 'reunion.convocar';
  readonly esquema = ConvocarReunion;
  // P-REU-03: elegir el horario de algo que ya existe es un control directo (DP-01, REQ-CUN06-20)
  readonly origenes = ['agente', 'control_directo'] as const;

  constructor(
    registro: RegistroOperaciones,
    reuniones: ReunionesService,
    sincronizador: SincronizadorCalendario,
    google: ClienteGoogle,
    prisma: PrismaService,
    @Inject(PROVEEDOR_CALENDARIO) proveedor: ProveedorCalendario,
  ) {
    super(registro, reuniones, sincronizador, google, prisma, proveedor);
  }

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  private async vista(contexto: ContextoSolicitud, carga: ConvocarReunion, forzar: boolean): Promise<VistaConfirmacion> {
    const r = await this.revisar(contexto, carga.reunionId, carga.inicio, carga.opcionales, forzar);
    if (r.fila.estado !== 'pendiente') throw errorApi(409, 'REUNION_NO_PENDIENTE', r.fila.estado === 'agendada' ? 'Esa reunión ya está agendada. Para cambiarle el horario, pide moverla.' : 'Esa reunión ya no está pendiente.');
    const zona = r.fila.zonaHoraria;
    const motivoNo = motivo(r.ocupados, r.fila.convocanteId, r.inicio);
    return {
      accion: 'Convocar esta reunión',
      datos: [
        { etiqueta: 'Reunión', valor: r.fila.titulo },
        { etiqueta: 'Equipo', valor: r.fila.equipo.nombre },
        { etiqueta: 'Cuándo', valor: `${fechaLarga(r.inicio, zona)}, ${horario(r.inicio, r.fin, zona)}` },
        { etiqueta: 'Zona horaria', valor: nombreDeZona(zona, r.inicio) },
        { etiqueta: 'Duración', valor: duracionTexto(r.fila.duracionMinutos) },
        ...datosInvitados(r.invitados, r.inicio, zona),
      ],
      irreversible: `Google enviará la invitación por correo a ${personas(r.invitados.length)}. Deshacerlo es cancelar la reunión, que también les avisa.`,
      confirmable: motivoNo === null,
      motivoNoConfirmable: motivoNo,
    };
  }

  async proponer(contexto: ContextoSolicitud, carga: ConvocarReunion): Promise<Propuesta<ConvocarReunion>> {
    await this.conCalendario(contexto);
    return this.vista(contexto, carga, false);
  }

  async ejecutar(contexto: ContextoSolicitud, carga: ConvocarReunion): Promise<ResultadoEjecucion> {
    await this.conCalendario(contexto);
    // H-AG-07: se vuelve a comprobar con los calendarios al día
    const vista = await this.vista(contexto, carga, true);
    if (!vista.confirmable) return { tipo: 'reproponer', vistaConfirmacion: vista };
    const r = await this.revisar(contexto, carga.reunionId, carga.inicio, carga.opcionales, false);
    const evento = await this.proveedor.crear(
      contexto,
      {
        titulo: r.fila.titulo,
        inicio: r.inicio,
        fin: r.fin,
        zonaHoraria: r.fila.zonaHoraria,
        invitados: r.invitados.map((i) => ({ correo: i.direccion, opcional: i.opcional, perfilId: i.perfilId })),
      },
      { avisar: true },
    );
    await this.sincronizador.incorporar(contexto, evento);
    const db = this.prisma.deOrganizacion(contexto.organizacionId);
    await db.reunion.update({ where: { id: r.fila.id }, data: { estado: 'agendada', inicio: evento.inicio, fin: evento.fin, googleEventoId: evento.id } });
    for (const i of r.invitados) {
      await db.invitadoReunion.updateMany({ where: { reunionId: r.fila.id, perfilId: i.perfilId }, data: { opcional: i.opcional, direccion: i.direccion } });
    }
    await this.alDia(contexto, r.invitados.map((i) => i.perfilId));
    await this.auditar(contexto, 'reunion.convocada', { reunionId: r.fila.id, googleEventoId: evento.id, invitados: r.invitados.length });
    return { tipo: 'ejecutada', resultado: await this.reuniones.resumenPorId(contexto, r.fila.id) };
  }
}

@Injectable()
export class MoverReunionOperacion extends BaseReunion implements EjecutorOperacion<MoverReunion>, OnModuleInit {
  readonly tipo = 'reunion.mover';
  readonly esquema = MoverReunion;
  readonly origenes = ['agente'] as const;

  constructor(
    registro: RegistroOperaciones,
    reuniones: ReunionesService,
    sincronizador: SincronizadorCalendario,
    google: ClienteGoogle,
    prisma: PrismaService,
    @Inject(PROVEEDOR_CALENDARIO) proveedor: ProveedorCalendario,
  ) {
    super(registro, reuniones, sincronizador, google, prisma, proveedor);
  }

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  private async vista(contexto: ContextoSolicitud, carga: MoverReunion, forzar: boolean): Promise<VistaConfirmacion> {
    const r = await this.revisar(contexto, carga.reunionId, carga.inicio, undefined, forzar);
    if (r.fila.estado !== 'agendada' || !r.fila.inicio || !r.fila.fin) throw errorApi(409, 'REUNION_NO_AGENDADA', 'Esa reunión no está agendada: primero hay que elegirle un horario.');
    const zona = r.fila.zonaHoraria;
    const motivoNo = motivo(r.ocupados, r.fila.convocanteId, r.inicio);
    return {
      accion: 'Mover esta reunión',
      datos: [
        { etiqueta: 'Reunión', valor: r.fila.titulo },
        { etiqueta: 'Antes', valor: `${fechaLarga(r.fila.inicio, zona)}, ${horario(r.fila.inicio, r.fila.fin, zona)}` },
        { etiqueta: 'Ahora', valor: `${fechaLarga(r.inicio, zona)}, ${horario(r.inicio, r.fin, zona)}` },
        { etiqueta: 'Zona horaria', valor: nombreDeZona(zona, r.inicio) },
        ...datosInvitados(r.invitados, r.inicio, zona),
      ],
      irreversible: `Google avisará del cambio por correo a ${personas(r.invitados.length)}.`,
      confirmable: motivoNo === null,
      motivoNoConfirmable: motivoNo,
    };
  }

  async proponer(contexto: ContextoSolicitud, carga: MoverReunion): Promise<Propuesta<MoverReunion>> {
    await this.conCalendario(contexto);
    return this.vista(contexto, carga, false);
  }

  async ejecutar(contexto: ContextoSolicitud, carga: MoverReunion): Promise<ResultadoEjecucion> {
    await this.conCalendario(contexto);
    const vista = await this.vista(contexto, carga, true);
    if (!vista.confirmable) return { tipo: 'reproponer', vistaConfirmacion: vista };
    const fila = await this.reuniones.propia(contexto, carga.reunionId);
    const inicio = new Date(carga.inicio);
    const fin = new Date(inicio.getTime() + fila.duracionMinutos * 60_000);
    const evento = await this.proveedor.actualizar(contexto, fila.googleEventoId!, { inicio, fin, zonaHoraria: fila.zonaHoraria }, { avisar: true });
    await this.sincronizador.incorporar(contexto, evento);
    await this.prisma.deOrganizacion(contexto.organizacionId).reunion.update({ where: { id: fila.id }, data: { inicio: evento.inicio, fin: evento.fin } });
    await this.alDia(contexto, fila.invitados.map((i) => i.perfilId));
    await this.auditar(contexto, 'reunion.movida', { reunionId: fila.id, inicio: evento.inicio });
    return { tipo: 'ejecutada', resultado: await this.reuniones.resumenPorId(contexto, fila.id) };
  }
}

@Injectable()
export class CancelarReunionOperacion extends BaseReunion implements EjecutorOperacion<CancelarReunion>, OnModuleInit {
  readonly tipo = 'reunion.cancelar';
  readonly esquema = CancelarReunion;
  // DP-01: cancelar algo que existe funciona sin el asistente (REQ-CUN06-15, 20)
  readonly origenes = ['agente', 'control_directo'] as const;

  constructor(
    registro: RegistroOperaciones,
    reuniones: ReunionesService,
    sincronizador: SincronizadorCalendario,
    google: ClienteGoogle,
    prisma: PrismaService,
    @Inject(PROVEEDOR_CALENDARIO) proveedor: ProveedorCalendario,
  ) {
    super(registro, reuniones, sincronizador, google, prisma, proveedor);
  }

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(contexto: ContextoSolicitud, carga: CancelarReunion): Promise<Propuesta<CancelarReunion>> {
    const fila = await this.reuniones.propia(contexto, carga.reunionId);
    if (fila.estado === 'cancelada') throw errorApi(409, 'REUNION_CANCELADA', 'Esa reunión ya está cancelada.');
    const zona = fila.zonaHoraria;
    if (fila.estado === 'agendada' && fila.inicio && fila.fin) {
      await this.conCalendario(contexto);
      return {
        accion: 'Cancelar esta reunión',
        datos: [
          { etiqueta: 'Reunión', valor: fila.titulo },
          { etiqueta: 'Cuándo', valor: `${fechaLarga(fila.inicio, zona)}, ${horario(fila.inicio, fila.fin, zona)}` },
          { etiqueta: 'Zona horaria', valor: nombreDeZona(zona, fila.inicio) },
          { etiqueta: 'Invitados', valor: lista(fila.invitados.map((i) => nombreVisible(i.perfil.correo))) },
        ],
        irreversible: `Se quita de tu calendario de Google y Google avisará a ${fila.invitados.length === 1 ? 'la persona invitada' : `los ${fila.invitados.length} invitados`} de que se canceló.`,
        confirmable: true,
        motivoNoConfirmable: null,
      };
    }
    return {
      accion: 'Cancelar esta reunión',
      datos: [
        { etiqueta: 'Reunión', valor: fila.titulo },
        { etiqueta: 'Estado', valor: fila.estado === 'vencida' ? 'Venció sin horario' : 'Todavía sin horario' },
        { etiqueta: 'Aviso', valor: 'No se avisa a nadie: los invitados aún no la recibieron' },
      ],
      irreversible: null,
      confirmable: true,
      motivoNoConfirmable: null,
    };
  }

  async ejecutar(contexto: ContextoSolicitud, carga: CancelarReunion): Promise<ResultadoEjecucion> {
    const fila = await this.reuniones.propia(contexto, carga.reunionId);
    if (fila.estado === 'agendada' && fila.googleEventoId) {
      await this.proveedor.cancelar(contexto, fila.googleEventoId, { avisar: true });
      await this.sincronizador.marcarCancelado(contexto, fila.googleEventoId);
    }
    await this.prisma.deOrganizacion(contexto.organizacionId).reunion.update({ where: { id: fila.id }, data: { estado: 'cancelada' } });
    if (fila.estado === 'agendada') await this.alDia(contexto, fila.invitados.map((i) => i.perfilId));
    await this.auditar(contexto, 'reunion.cancelada', { reunionId: fila.id, estabaAgendada: fila.estado === 'agendada' });
    return { tipo: 'ejecutada', resultado: await this.reuniones.resumenPorId(contexto, fila.id).catch(() => this.reuniones.resumen(contexto, { ...fila, estado: 'cancelada' })) };
  }
}
