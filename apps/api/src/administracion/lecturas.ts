import { Injectable } from '@nestjs/common';
import {
  EntradaRegistroEmpresa,
  EquipoOrganizacion,
  PersonaOrganizacion,
  SesionEmpresa,
  VistaConfirmacion,
  type EstadoPersona,
  type Plan,
} from '@nexoai/contratos';
import type { MiembroOrganizacion } from '../generado/prisma/client';
import type { ContextoSolicitud } from '../identidad/contexto';
import { SOLO_EL_ADMINISTRADOR } from '../identidad/guardas';
import { PertenenciasRepositorio } from '../identidad/pertenencias';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';

export type EstadoCuenta = 'activa' | 'suspendida' | 'cerrada';

export interface CuentaVisible {
  correo: string;
  estado: EstadoCuenta;
  primerIngresoPendiente: boolean;
  plan: Plan;
  // De la organización (la dio de alta ella) o afiliada (es de la persona, H-ADM-05)
  propia: boolean;
}

// Una cuenta con su pertenencia vigente en la empresa, para validar cada acción del área
export interface CuentaDeLaEmpresa extends CuentaVisible {
  perfilId: string;
  miembro: MiembroOrganizacion;
}

// specs/08-administracion/plan.md §4.3 y §6 · T-067, T-068. Lecturas del área. Todo se lee aislado por la
// organización de la empresa salvo el correo y el estado de las cuentas afiliadas, que viven en su organización
// personal (opción B): esa es la única lectura con `sinAislar`, justificada en el plan §4.3.
@Injectable()
export class LecturasAdministracion {
  private readonly pertenencias: PertenenciasRepositorio;

  constructor(private readonly prisma: PrismaService) {
    this.pertenencias = new PertenenciasRepositorio(prisma);
  }

  empresaDe(contexto: ContextoSolicitud): string {
    // Las rutas del área son @EnEmpresa(): la guarda ya comprobó que la pertenencia sigue vigente
    return contexto.empresa!.organizacionId;
  }

  // Correo y estado de cuentas que tienen o tuvieron una pertenencia en la empresa, y nada más (REQ-ADM-08)
  async cuentasDe(empresaId: string, perfilIds: string[]): Promise<Map<string, CuentaVisible>> {
    const unicos = [...new Set(perfilIds)];
    const propias = await this.prisma.deOrganizacion(empresaId).perfilUsuario.findMany({
      where: { id: { in: unicos } },
      select: { id: true, correo: true, estado: true, plan: true, debeCambiarContrasena: true, zonaHoraria: true },
    });
    const resto = unicos.filter((id) => !propias.some((p) => p.id === id));
    // `sinAislar` (plan §4.3, «El administrador ve sus cuentas afiliadas»): solo perfiles con una pertenencia en
    // esta empresa, y solo su correo y su estado. Nunca zona horaria, consentimientos ni nada más.
    const ajenas = resto.length
      ? await this.prisma.sinAislar.perfilUsuario.findMany({
          where: { id: { in: resto }, pertenencias: { some: { organizacionId: empresaId } } },
          select: { id: true, correo: true, estado: true },
        })
      : [];
    const mapa = new Map<string, CuentaVisible>();
    for (const p of propias) {
      mapa.set(p.id, { correo: p.correo, estado: p.estado, plan: p.plan, primerIngresoPendiente: p.debeCambiarContrasena || p.zonaHoraria === null, propia: true });
    }
    // Mientras dure la afiliación tiene el Plan Empresarial (H-ADM-06); su plan propio no se le muestra a la empresa
    for (const p of ajenas) mapa.set(p.id, { correo: p.correo, estado: p.estado, plan: 'empresarial', primerIngresoPendiente: false, propia: false });
    return mapa;
  }

  async registro(contexto: ContextoSolicitud): Promise<EntradaRegistroEmpresa[]> {
    const empresaId = this.empresaDe(contexto);
    const ops = await this.prisma.deOrganizacion(empresaId).operacion.findMany({
      where: { ambito: 'empresa', estado: { in: ['ejecutada', 'fallida'] } },
      orderBy: { creadaEn: 'desc' },
      take: 200,
    });
    const cuentas = await this.cuentasDe(empresaId, ops.map((o) => o.perfilId));
    return ops.map((op) => {
      const vista = VistaConfirmacion.parse(op.vistaConfirmacion);
      return EntradaRegistroEmpresa.parse({
        id: op.id,
        tipo: op.tipo,
        estado: op.estado,
        accion: vista.accion,
        datos: vista.datos,
        por: cuentas.get(op.perfilId)?.correo ?? 'Una cuenta que ya no pertenece a la organización',
        creadaEn: op.creadaEn.toISOString(),
        ejecutadaEn: op.ejecutadaEn?.toISOString() ?? null,
      });
    });
  }

  // `sinAislar` (plan §4.3, «Invitar», y H-ADM-14): si un correo ya tiene cuenta, sea de la organización que sea.
  // Solo se devuelve sí o no: nunca de qué organización es ni qué plan tiene (REQ-ADM-10).
  async correoTieneCuenta(correo: string): Promise<boolean> {
    return (await this.prisma.sinAislar.perfilUsuario.count({ where: { correo } })) > 0;
  }

  // La cuenta y su pertenencia vigente en la empresa, o nulo si no pertenece a ella
  async cuentaDeLaEmpresa(empresaId: string, perfilId: string): Promise<CuentaDeLaEmpresa | null> {
    const miembro = await this.prisma.deOrganizacion(empresaId).miembroOrganizacion.findFirst({ where: { perfilId, estado: 'vigente' } });
    if (!miembro) return null;
    const cuenta = (await this.cuentasDe(empresaId, [perfilId])).get(perfilId);
    if (!cuenta) return null;
    // Propia es la que dio de alta la organización; la fila de pertenencia lo dice aunque el perfil viva en ella
    return { ...cuenta, propia: miembro.origen === 'alta' && cuenta.propia, perfilId, miembro };
  }

  // REQ-ADM-03: administradores con la cuenta activa, sin contar a `excepto`
  async otrosAdministradoresActivos(empresaId: string, excepto: string): Promise<number> {
    const admins = await this.prisma.deOrganizacion(empresaId).miembroOrganizacion.findMany({
      where: { estado: 'vigente', administrador: true, perfilId: { not: excepto } },
      select: { perfilId: true },
    });
    const cuentas = await this.cuentasDe(empresaId, admins.map((a) => a.perfilId));
    return admins.filter((a) => cuentas.get(a.perfilId)?.estado === 'activa').length;
  }

  // GET /administracion/personas · REQ-ADM-08
  async personas(contexto: ContextoSolicitud): Promise<PersonaOrganizacion[]> {
    const empresaId = this.empresaDe(contexto);
    const datos = this.prisma.deOrganizacion(empresaId);
    const [miembros, enEquipos] = await Promise.all([
      datos.miembroOrganizacion.findMany({ where: { estado: { in: ['vigente', 'invitada'] } } }),
      datos.miembroEquipo.findMany({ include: { equipo: { select: { id: true, nombre: true } } }, orderBy: { equipo: { nombre: 'asc' } } }),
    ]);
    const cuentas = await this.cuentasDe(empresaId, miembros.map((m) => m.perfilId));
    const lista = miembros.flatMap((m) => {
      const cuenta = cuentas.get(m.perfilId);
      if (!cuenta) return [];
      const invitacion = m.estado === 'invitada';
      const estado: EstadoPersona = invitacion
        ? 'invitacion_pendiente'
        : cuenta.estado !== 'activa'
          ? cuenta.estado
          : cuenta.primerIngresoPendiente
            ? 'primer_ingreso_pendiente'
            : 'activa';
      return [
        PersonaOrganizacion.parse({
          perfilId: m.perfilId,
          miembroId: m.id,
          correo: cuenta.correo,
          clase: invitacion ? 'invitacion' : m.origen === 'alta' ? 'propia' : 'afiliada',
          estado,
          plan: invitacion ? 'empresarial' : cuenta.plan,
          equipos: invitacion
            ? []
            : enEquipos.filter((e) => e.perfilId === m.perfilId).map((e) => ({ id: e.equipo.id, nombre: e.equipo.nombre, responsable: e.responsable })),
          administrador: !invitacion && m.administrador,
        }),
      ];
    });
    return lista.sort((a, b) => Number(b.clase === 'invitacion') - Number(a.clase === 'invitacion') || a.correo.localeCompare(b.correo));
  }

  // GET /administracion/equipos · REQ-ADM-28 a 32 (lectura). El administrador ve todos; el responsable, solo los
  // suyos (plan §7.2).
  async equipos(contexto: ContextoSolicitud): Promise<EquipoOrganizacion[]> {
    const empresaId = this.empresaDe(contexto);
    const datos = this.prisma.deOrganizacion(empresaId);
    const administrador = await this.pertenencias.esAdministrador(contexto);
    const suyos = administrador
      ? null
      : (await datos.miembroEquipo.findMany({ where: { perfilId: contexto.perfilId, responsable: true }, select: { equipoId: true } })).map((e) => e.equipoId);
    if (suyos && suyos.length === 0) throw errorApi(403, 'ADMINISTRACION_NO_PERMITIDA', SOLO_EL_ADMINISTRADOR);

    const equipos = await datos.equipo.findMany({
      where: suyos ? { id: { in: suyos } } : {},
      include: { miembros: { orderBy: { desde: 'asc' } } },
      orderBy: { nombre: 'asc' },
    });
    const cuentas = await this.cuentasDe(empresaId, equipos.flatMap((e) => e.miembros.map((m) => m.perfilId)));
    const correo = (perfilId: string) => cuentas.get(perfilId)?.correo ?? '';
    return equipos.map((e) => {
      const responsable = e.miembros.find((m) => m.responsable);
      return EquipoOrganizacion.parse({
        id: e.id,
        nombre: e.nombre,
        responsable: responsable ? { perfilId: responsable.perfilId, correo: correo(responsable.perfilId) } : null,
        miembros: e.miembros.filter((m) => !m.responsable).map((m) => ({ perfilId: m.perfilId, correo: correo(m.perfilId) })),
      });
    });
  }

  // GET /administracion/sesion
  async sesion(contexto: ContextoSolicitud): Promise<SesionEmpresa> {
    const empresaId = this.empresaDe(contexto);
    const [perfil, organizacion, administrador, responsable] = await Promise.all([
      this.prisma.deOrganizacion(contexto.organizacionId).perfilUsuario.findUniqueOrThrow({ where: { id: contexto.perfilId }, select: { correo: true, zonaHoraria: true } }),
      this.prisma.deOrganizacion(empresaId).organizacion.findUniqueOrThrow({ where: { id: empresaId }, select: { nombre: true } }),
      this.pertenencias.esAdministrador(contexto),
      this.pertenencias.esResponsable(contexto),
    ]);
    return SesionEmpresa.parse({ correo: perfil.correo, zonaHoraria: perfil.zonaHoraria, organizacion, administrador, responsable });
  }
}
