import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ArgsProponerReunion, DatosInvitado, DetalleReunion, InvitadoReunion, PropuestaHorario, ReunionResumen } from '@nexoai/contratos';
import { enZona, instanteLocal, isoConDesfase, sumarDias, type FechaLocal } from '../agenda/dominio/tiempo';
import { EventosPorId } from '../agenda/eventos-por-id';
import { SincronizadorCalendario } from '../agenda/sincronizador-calendario';
import { DisponibilidadEquipoService } from '../equipos/disponibilidad-equipo.service';
import { EquiposService } from '../equipos/equipos.service';
import type { ContextoSolicitud } from '../identidad/contexto';
import { ClienteGoogle } from '../integraciones/cliente-google';
import { PROVEEDOR_CALENDARIO, type ProveedorCalendario, type Quien } from '../integraciones/calendario/proveedor-calendario';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { equiposQueEncajan, nombreVisible, personaEncaja } from './dominio/grupo';
import {
  calcularMapa,
  calcularPropuestas,
  diasHabiles,
  fechaDeTexto,
  libreEn,
  rangoPorDefecto,
  FRANJA_MINUTOS,
  type Franja,
  type Intervalo,
  type PersonaCalculo,
} from './dominio/mapa';

// specs/10-reuniones/plan.md §3, §4 y §8 · T-132 · CUN-06. Resolver el grupo, crear la reunión pendiente,
// calcular el mapa y las propuestas, y conciliar con Google al leer (P-REU-01). La disponibilidad es la de
// CUN-05: solo de quien autorizó en ese equipo, y solo inicio y fin (RN-CAL-01, P-10).

const INCLUIR = {
  equipo: { select: { id: true, nombre: true } },
  convocante: { select: { id: true, correo: true } },
  // Ordenados por correo: el orden de la base no es fijo, y la tarjeta y el detalle los nombran en este orden
  invitados: { select: { perfilId: true, opcional: true, direccion: true, perfil: { select: { correo: true, zonaHoraria: true } } }, orderBy: { perfil: { correo: 'asc' } } },
} as const;

type FilaReunion = {
  id: string;
  equipoId: string;
  convocanteId: string;
  titulo: string;
  duracionMinutos: number;
  franja: Franja | null;
  zonaHoraria: string;
  rangoDesde: Date;
  rangoHasta: Date;
  estado: 'pendiente' | 'agendada' | 'vencida' | 'cancelada';
  inicio: Date | null;
  fin: Date | null;
  googleEventoId: string | null;
  equipo: { id: string; nombre: string };
  convocante: { id: string; correo: string };
  invitados: { perfilId: string; opcional: boolean; direccion: string | null; perfil: { correo: string; zonaHoraria: string | null } }[];
};

export type Aclaracion = { aclarar: string };
export type Grupo = { equipo: { id: string; nombre: string }; invitados: { perfilId: string; correo: string; opcional: boolean }[] };

export interface PersonaDeReunion {
  perfilId: string;
  correo: string;
  zonaHoraria: string;
  opcional: boolean;
  datos: DatosInvitado;
  ocupados: Intervalo[] | null;
}

const fechaTexto = (f: FechaLocal) => `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;

export const lista = (nombres: string[]) =>
  nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;

@Injectable()
export class ReunionesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equipos: EquiposService,
    private readonly disponibilidad: DisponibilidadEquipoService,
    private readonly sincronizador: SincronizadorCalendario,
    private readonly google: ClienteGoogle,
    @Inject(PROVEEDOR_CALENDARIO) private readonly proveedor: ProveedorCalendario,
    private readonly porId: EventosPorId,
  ) {}

  // T-138 · REQ-CUN06-13 v2 · P-REU-10: la sincronización del invitado lee por su id el evento de cada reunión
  // agendada, aunque Google no lo ponga en su lista. Las canceladas que todavía no pasaron, para dejar su copia
  // cancelada; las agendadas de los últimos 30 días, como la ventana de la copia
  onModuleInit(): void {
    this.porId.registrar(async (quien) => {
      const ahora = Date.now();
      const filas = await this.datos(quien).reunion.findMany({
        where: {
          googleEventoId: { not: null },
          invitados: { some: { perfilId: quien.perfilId } },
          OR: [
            { estado: 'agendada', fin: { gt: new Date(ahora - 30 * 86_400_000) } },
            { estado: 'cancelada', fin: { gt: new Date(ahora) } },
          ],
        },
        select: { googleEventoId: true, zonaHoraria: true },
      });
      return filas.map((f) => ({ id: f.googleEventoId!, zonaHoraria: f.zonaHoraria }));
    });
  }

  private datos(contexto: Quien) {
    return this.prisma.deOrganizacion(contexto.organizacionId);
  }

  async zonaDe(contexto: Quien): Promise<string> {
    const perfil = await this.datos(contexto).perfilUsuario.findUniqueOrThrow({ where: { id: contexto.perfilId } });
    return perfil.zonaHoraria ?? 'UTC';
  }

  // REQ-CUN06-02 · plan §4 · D-REU-17, 18, 22. Lo que no se puede resolver vuelve como aclaración, con el texto del código
  async resolverGrupo(contexto: ContextoSolicitud, args: Pick<ArgsProponerReunion, 'equipo' | 'personas' | 'sin' | 'opcionales'>): Promise<Grupo | Aclaracion> {
    const membresias = await this.datos(contexto).miembroDeEquipo.findMany({
      where: { perfilId: contexto.perfilId },
      select: { equipo: { select: { id: true, nombre: true, miembros: { select: { perfilId: true, perfil: { select: { correo: true } } } } } } },
    });
    const equipos = membresias.map((m) => m.equipo);
    const personas = (args.personas ?? []).map((p) => p.trim()).filter(Boolean);
    if (!args.equipo?.trim() && personas.length === 0) return { aclarar: '¿Con quién es la reunión? Puedes decirme un equipo o los nombres de las personas.' };

    let candidatos = equipos;
    if (args.equipo?.trim()) {
      candidatos = equiposQueEncajan(args.equipo, equipos);
      if (candidatos.length === 0) return { aclarar: `No encuentro el equipo «${args.equipo.trim()}» entre los tuyos: ${lista(equipos.map((e) => `«${e.nombre}»`))}.` };
      if (candidatos.length > 1 && personas.length === 0) {
        return { aclarar: `Hay ${candidatos.length} equipos que encajan: ${lista(candidatos.map((e) => `«${e.nombre}»`))}. ¿Con cuál es la reunión?` };
      }
    }

    // Cada persona nombrada, entre los integrantes de los equipos candidatos (sin contarse a uno mismo)
    const otros = (e: (typeof equipos)[number]) => e.miembros.filter((m) => m.perfilId !== contexto.perfilId);
    const elegidas = new Map<string, string>();
    for (const nombre of personas) {
      const encajan = new Map<string, string>();
      for (const e of candidatos) for (const m of otros(e)) if (personaEncaja(nombre, m.perfil.correo)) encajan.set(m.perfilId, m.perfil.correo);
      if (encajan.size === 0) return { aclarar: `No encuentro a ${nombre} en tus equipos.` };
      if (encajan.size > 1) return { aclarar: `Hay ${encajan.size} personas que encajan con «${nombre}»: ${lista([...encajan.values()])}. ¿Con quién de ellas?` };
      const [id, correo] = [...encajan.entries()][0]!;
      elegidas.set(id, correo);
    }

    // D-REU-22: un solo equipo, con todas las personas nombradas
    const conTodas = candidatos.filter((e) => [...elegidas.keys()].every((id) => e.miembros.some((m) => m.perfilId === id)));
    if (conTodas.length === 0) return { aclarar: `${lista([...elegidas.values()].map(nombreVisible))} no están en un mismo equipo contigo. Una reunión es de un solo equipo.` };
    if (conTodas.length > 1) {
      const quien = elegidas.size === 1 ? `${nombreVisible([...elegidas.values()][0]!)} está` : 'Esas personas están';
      return { aclarar: `${quien} en ${conTodas.length} de tus equipos: ${lista(conTodas.map((e) => `«${e.nombre}»`))}. ¿Con cuál es la reunión?` };
    }
    const equipo = conTodas[0]!;
    let invitados = elegidas.size > 0 ? [...elegidas.entries()].map(([perfilId, correo]) => ({ perfilId, correo })) : otros(equipo).map((m) => ({ perfilId: m.perfilId, correo: m.perfil.correo }));

    const quitar = (args.sin ?? []).filter((s) => s.trim());
    for (const nombre of quitar) {
      if (!invitados.some((i) => personaEncaja(nombre, i.correo))) return { aclarar: `No encuentro a ${nombre} entre los invitados.` };
      invitados = invitados.filter((i) => !personaEncaja(nombre, i.correo));
    }
    const opcionales = (args.opcionales ?? []).filter((s) => s.trim());
    for (const nombre of opcionales) {
      if (!invitados.some((i) => personaEncaja(nombre, i.correo))) return { aclarar: `No encuentro a ${nombre} entre los invitados.` };
    }
    if (invitados.length === 0) return { aclarar: `En «${equipo.nombre}» no queda nadie más a quien invitar.` };
    return {
      equipo: { id: equipo.id, nombre: equipo.nombre },
      invitados: invitados.map((i) => ({ ...i, opcional: opcionales.some((o) => personaEncaja(o, i.correo)) })),
    };
  }

  // REQ-CUN06-03: días, duración y tema por defecto. Devuelve el rango en instantes de la zona de quien convoca
  rango(zona: string, ahora: Date, desde?: string, hasta?: string): { desde: FechaLocal; hasta: FechaLocal; rangoDesde: Date; rangoHasta: Date } {
    let d: FechaLocal;
    let h: FechaLocal;
    if (desde || hasta) {
      d = fechaDeTexto(desde ?? hasta!);
      h = fechaDeTexto(hasta ?? desde!);
      if (Date.UTC(h.anio, h.mes - 1, h.dia) < Date.UTC(d.anio, d.mes - 1, d.dia)) [d, h] = [h, d];
      const hoy = enZona(ahora, zona);
      if (Date.UTC(d.anio, d.mes - 1, d.dia) < Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia)) d = { anio: hoy.anio, mes: hoy.mes, dia: hoy.dia };
      if (Date.UTC(h.anio, h.mes - 1, h.dia) < Date.UTC(d.anio, d.mes - 1, d.dia)) h = d;
    } else {
      ({ desde: d, hasta: h } = rangoPorDefecto(ahora, zona));
    }
    return { desde: d, hasta: h, rangoDesde: instanteLocal(d, 0, zona), rangoHasta: instanteLocal(sumarDias(h, 1), 0, zona) };
  }

  // D-REU-10: la reunión pendiente se crea sin tarjeta y queda auditada (P-07)
  async crearPendiente(
    contexto: ContextoSolicitud,
    datos: { grupo: Grupo; titulo: string; duracionMinutos: number; franja: Franja | null; zona: string; rangoDesde: Date; rangoHasta: Date },
  ): Promise<string> {
    const db = this.datos(contexto);
    const reunion = await db.reunion.create({
      data: {
        organizacionId: contexto.organizacionId,
        equipoId: datos.grupo.equipo.id,
        convocanteId: contexto.perfilId,
        titulo: datos.titulo,
        duracionMinutos: datos.duracionMinutos,
        franja: datos.franja,
        zonaHoraria: datos.zona,
        rangoDesde: datos.rangoDesde,
        rangoHasta: datos.rangoHasta,
      },
    });
    await db.invitadoReunion.createMany({
      data: datos.grupo.invitados.map((i) => ({ organizacionId: contexto.organizacionId, reunionId: reunion.id, perfilId: i.perfilId, opcional: i.opcional })),
    });
    await db.eventoAuditoria.create({
      data: { organizacionId: contexto.organizacionId, perfilId: contexto.perfilId, accion: 'reunion.creada', detalle: { reunionId: reunion.id, equipoId: datos.grupo.equipo.id, invitados: datos.grupo.invitados.length } },
    });
    return reunion.id;
  }

  // Buscar de nuevo con otros días, duración o franja, sin tocar el grupo (REQ-CUN06-05, 14)
  async cambiarBusqueda(contexto: ContextoSolicitud, id: string, cambios: { duracionMinutos?: number; franja?: Franja | null; rangoDesde?: Date; rangoHasta?: Date; titulo?: string }) {
    const db = this.datos(contexto);
    await db.reunion.update({ where: { id }, data: cambios });
    const fila = await db.reunion.findUniqueOrThrow({ where: { id } });
    if (fila.estado === 'vencida' && fila.rangoHasta > new Date()) await db.reunion.update({ where: { id }, data: { estado: 'pendiente' } });
  }

  // La reunión, solo si quien pide la convocó o es su invitado (y entonces solo agendada)
  async fila(contexto: ContextoSolicitud, id: string): Promise<FilaReunion> {
    const fila = (await this.datos(contexto).reunion.findFirst({ where: { id }, include: INCLUIR })) as FilaReunion | null;
    const visible = fila && (fila.convocanteId === contexto.perfilId || (fila.estado === 'agendada' && fila.invitados.some((i) => i.perfilId === contexto.perfilId)));
    if (!fila || !visible) throw errorApi(404, 'REUNION_NO_ENCONTRADA', 'No existe esa reunión.');
    return fila;
  }

  // REQ-CUN06-16 · D-REU-15
  async propia(contexto: ContextoSolicitud, id: string): Promise<FilaReunion> {
    const fila = await this.fila(contexto, id);
    if (fila.convocanteId !== contexto.perfilId) {
      throw errorApi(403, 'SOLO_CONVOCANTE', `Solo puede cambiarla o cancelarla quien la convocó: ${fila.convocante.correo}. Tú puedes responder a la invitación en Google.`);
    }
    return fila;
  }

  resumen(contexto: Quien, fila: FilaReunion): ReunionResumen {
    const zona = fila.zonaHoraria;
    const ultimo = new Date(fila.rangoHasta.getTime() - 1);
    return {
      id: fila.id,
      titulo: fila.titulo,
      equipo: fila.equipo,
      estado: fila.estado,
      inicio: fila.inicio ? isoConDesfase(fila.inicio, zona) : null,
      fin: fila.fin ? isoConDesfase(fila.fin, zona) : null,
      duracionMinutos: fila.duracionMinutos,
      zonaHoraria: zona,
      rangoDesde: fechaTexto(enZona(fila.rangoDesde, zona)),
      rangoHasta: fechaTexto(enZona(ultimo, zona)),
      franja: fila.franja,
      convocante: { perfilId: fila.convocante.id, correo: fila.convocante.correo, nombre: nombreVisible(fila.convocante.correo) },
      soyConvocante: fila.convocanteId === contexto.perfilId,
      invitados: fila.invitados.length,
    };
  }

  async resumenPorId(contexto: ContextoSolicitud, id: string): Promise<ReunionResumen> {
    return this.resumen(contexto, await this.fila(contexto, id));
  }

  // REQ-CUN06-07 · REQ-CUN06-17, 18: la lista concilia con Google y vence lo que pasó antes de mostrarse
  async lista(contexto: ContextoSolicitud): Promise<ReunionResumen[]> {
    await this.equipos.comprobarAcceso(contexto);
    const db = this.datos(contexto);
    const where = {
      OR: [
        { convocanteId: contexto.perfilId, estado: { not: 'cancelada' as const } },
        { estado: 'agendada' as const, invitados: { some: { perfilId: contexto.perfilId } } },
      ],
    };
    await this.conciliar(contexto, (await db.reunion.findMany({ where, include: INCLUIR })) as FilaReunion[]);
    const filas = (await db.reunion.findMany({ where, include: INCLUIR, orderBy: { creadaEn: 'desc' } })) as FilaReunion[];
    const orden = { pendiente: 0, agendada: 1, vencida: 2, cancelada: 3 };
    filas.sort((a, b) => orden[a.estado] - orden[b.estado] || (a.inicio?.getTime() ?? 0) - (b.inicio?.getTime() ?? 0));
    return filas.map((f) => this.resumen(contexto, f));
  }

  // plan §8 · P-REU-01. Manda Google (AD-10): borrado → cancelada; movido → su horario. Pasado el rango → vencida
  async conciliar(contexto: ContextoSolicitud, filas: FilaReunion[], ahora = new Date()): Promise<void> {
    const db = this.datos(contexto);
    if (filas.some((f) => f.convocanteId === contexto.perfilId && f.estado === 'agendada') && (await this.google.tienePermiso(contexto, 'calendario'))) {
      await this.sincronizador.sincronizar(contexto).catch(() => null);
    }
    for (const f of filas) {
      let cambio: { estado?: 'cancelada' | 'vencida'; inicio?: Date; fin?: Date } | null = null;
      if (f.estado === 'pendiente' && f.rangoHasta <= ahora) cambio = { estado: 'vencida' };
      if (f.estado === 'agendada' && f.googleEventoId) {
        const evento = await db.eventoAgenda.findFirst({ where: { perfilId: f.convocanteId, googleEventoId: f.googleEventoId } });
        if (evento?.estado === 'cancelado') cambio = { estado: 'cancelada' };
        else if (evento && (evento.inicio.getTime() !== f.inicio?.getTime() || evento.fin.getTime() !== f.fin?.getTime())) cambio = { inicio: evento.inicio, fin: evento.fin };
      }
      if (!cambio) continue;
      await db.reunion.update({ where: { id: f.id }, data: cambio });
      Object.assign(f, cambio);
      await db.eventoAuditoria.create({ data: { organizacionId: contexto.organizacionId, perfilId: contexto.perfilId, accion: 'reunion.conciliada', detalle: { reunionId: f.id, ...cambio } } });
    }
  }

  // plan §3: quién entra en el cálculo, con sus eventos ocupados. Quien convoca, con su propio permiso de
  // Google; cada invitado, solo si autorizó en ese equipo (REQ-CUN05-14). `forzar` sincroniza antes, para
  // comprobar de nuevo al confirmar (H-AG-07). El evento de la propia reunión no cuenta como ocupado.
  async personas(contexto: ContextoSolicitud, fila: FilaReunion, desde: Date, hasta: Date, opciones: { opcionales?: string[]; forzar?: boolean } = {}): Promise<{ convocante: PersonaDeReunion; invitados: PersonaDeReunion[] }> {
    const db = this.datos(contexto);
    const miembros = await db.miembroDeEquipo.findMany({ where: { equipoId: fila.equipoId }, select: { perfilId: true, estadoConsentimiento: true } });
    const autorizo = (perfilId: string) => miembros.find((m) => m.perfilId === perfilId)?.estadoConsentimiento === 'concedida';
    const convocante = await db.perfilUsuario.findUniqueOrThrow({ where: { id: fila.convocanteId }, select: { id: true, correo: true, zonaHoraria: true } });

    const leer = async (perfilId: string, requiereAutorizacion: boolean): Promise<{ datos: DatosInvitado; ocupados: Intervalo[] | null }> => {
      if (requiereAutorizacion && !autorizo(perfilId)) return { datos: 'sin_consentimiento', ocupados: null };
      const quien = { organizacionId: contexto.organizacionId, perfilId };
      if (opciones.forzar && (await this.google.tienePermiso(quien, 'calendario'))) await this.sincronizador.sincronizar(quien).catch(() => null);
      if (!(await this.disponibilidad.verificarCalendario(contexto.organizacionId, perfilId, desde, hasta))) return { datos: 'sin_calendario', ocupados: null };
      const eventos = await db.eventoAgenda.findMany({
        where: {
          perfilId,
          estado: 'confirmado',
          inicio: { lt: hasta },
          fin: { gt: desde },
          ...(fila.googleEventoId ? { NOT: { googleEventoId: fila.googleEventoId } } : {}),
        },
        select: { inicio: true, fin: true },
      });
      return { datos: 'con_datos', ocupados: eventos };
    };

    const propia = await leer(convocante.id, false);
    const invitados: PersonaDeReunion[] = [];
    for (const i of fila.invitados) {
      const r = await leer(i.perfilId, true);
      invitados.push({
        perfilId: i.perfilId,
        correo: i.perfil.correo,
        zonaHoraria: i.perfil.zonaHoraria ?? fila.zonaHoraria,
        opcional: opciones.opcionales ? opciones.opcionales.includes(i.perfilId) : i.opcional,
        ...r,
      });
    }
    return {
      convocante: { perfilId: convocante.id, correo: convocante.correo, zonaHoraria: convocante.zonaHoraria ?? fila.zonaHoraria, opcional: false, ...propia },
      invitados,
    };
  }

  // REQ-CUN06-04: las propuestas de una reunión con su búsqueda actual
  async propuestas(contexto: ContextoSolicitud, fila: FilaReunion, opciones: { opcionales?: string[]; duracionMinutos?: number; ahora?: Date } = {}) {
    const ahora = opciones.ahora ?? new Date();
    const duracion = opciones.duracionMinutos ?? fila.duracionMinutos;
    const zona = fila.zonaHoraria;
    const dias = diasHabiles(enZona(fila.rangoDesde, zona), enZona(new Date(fila.rangoHasta.getTime() - 1), zona));
    const { convocante, invitados } = await this.personas(contexto, fila, fila.rangoDesde, fila.rangoHasta, opciones);
    const calculo: PersonaCalculo[] = [convocante, ...invitados].map((p) => ({ perfilId: p.perfilId, zonaHoraria: p.zonaHoraria, opcional: p.opcional, ocupados: p.ocupados }));
    const propuestas = calcularPropuestas(dias, zona, fila.franja, duracion, calculo, ahora).map(
      (p): PropuestaHorario => ({ ...p, inicio: isoConDesfase(p.inicio, zona), fin: isoConDesfase(p.fin, zona) }),
    );
    return { dias, calculo, convocante, invitados, propuestas, duracion };
  }

  // D-REU-11: a la dirección del Google conectado; la primera vez se lee y se guarda. Sin Google, el correo de NexoAI
  async direccion(contexto: ContextoSolicitud, perfilId: string, correo: string): Promise<{ direccion: string; conGoogle: boolean }> {
    const db = this.datos(contexto);
    const permiso = await db.consentimientoIntegracion.findFirst({ where: { perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
    if (!permiso) return { direccion: correo, conGoogle: false };
    if (permiso.correoCuenta) return { direccion: permiso.correoCuenta, conGoogle: true };
    const leida = await this.proveedor.direccion({ organizacionId: contexto.organizacionId, perfilId }).catch(() => null);
    if (leida) await db.consentimientoIntegracion.update({ where: { id: permiso.id }, data: { correoCuenta: leida } });
    // P-REU-07: si no se pudo leer, va al correo de NexoAI; la tarjeta muestra a qué dirección sale
    return { direccion: leida ?? correo, conGoogle: true };
  }

  async invitadosConDireccion(contexto: ContextoSolicitud, fila: FilaReunion, personas: PersonaDeReunion[]): Promise<InvitadoReunion[]> {
    const salida: InvitadoReunion[] = [];
    for (const p of personas) {
      const guardada = fila.invitados.find((i) => i.perfilId === p.perfilId)?.direccion;
      const { direccion, conGoogle } = fila.estado === 'agendada' && guardada ? { direccion: guardada, conGoogle: true } : await this.direccion(contexto, p.perfilId, p.correo);
      salida.push({ perfilId: p.perfilId, correo: p.correo, nombre: nombreVisible(p.correo), opcional: p.opcional, datos: p.datos, direccion, conGoogle });
    }
    return salida;
  }

  // REQ-CUN06-08, 09: el detalle, con el mapa mientras está pendiente
  async detalle(contexto: ContextoSolicitud, id: string, consulta: { duracionMinutos?: number; opcionales?: string[] } = {}): Promise<DetalleReunion> {
    await this.equipos.comprobarAcceso(contexto);
    const fila = await this.fila(contexto, id);
    await this.conciliar(contexto, [fila]);
    const invitadosIds = new Set(fila.invitados.map((i) => i.perfilId));
    const opcionales = consulta.opcionales?.filter((o) => invitadosIds.has(o));
    const pendiente = fila.estado === 'pendiente' && fila.convocanteId === contexto.perfilId;
    const calculo = await this.propuestas(contexto, fila, { ...(opcionales ? { opcionales } : {}), ...(consulta.duracionMinutos ? { duracionMinutos: consulta.duracionMinutos } : {}) });
    const mapa = pendiente
      ? calcularMapa(calculo.dias, fila.zonaHoraria, fila.franja, calculo.calculo).map((d) => ({
          fecha: d.fecha,
          franjas: d.franjas.map((f) => ({ inicio: isoConDesfase(f.inicio, fila.zonaHoraria), libres: f.libres })),
        }))
      : null;
    return {
      reunion: this.resumen(contexto, fila),
      convocanteDatos: calculo.convocante.datos,
      invitados: await this.invitadosConDireccion(contexto, fila, calculo.invitados),
      mapa: mapa ? { franjaMinutos: FRANJA_MINUTOS, personasConDatos: calculo.calculo.filter((p) => p.ocupados).map((p) => p.perfilId), dias: mapa } : null,
      propuestas: pendiente ? calculo.propuestas : [],
      duracionMinutos: calculo.duracion,
      opcionales: calculo.invitados.filter((i) => i.opcional).map((i) => i.perfilId),
    };
  }

  // REQ-CUN06-11: quiénes de los obligatorios con datos no están libres en [inicio, fin)
  ocupadosEn(personas: PersonaDeReunion[], inicio: Date, fin: Date): PersonaDeReunion[] {
    return personas.filter((p) => !p.opcional && p.ocupados && !libreEn(p, inicio, fin));
  }
}
