import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  AltaCuentaEmpresaCarga,
  CambioPlanCarga,
  CuentaCarga,
  type Plan,
  type VistaConfirmacion,
} from '@nexoai/contratos';
import type { z } from 'zod';
import { crearCuenta } from '../identidad/alta-cuentas';
import { revocarSesionesDelPerfil } from '../identidad/autenticacion.service';
import { calcularHash, generarContrasenaTemporal } from '../identidad/contrasenas';
import type { ContextoSolicitud } from '../identidad/contexto';
import { RegistroOperaciones, type EjecutorOperacion, type ResultadoEjecucion } from '../operaciones/registro';
import { PrismaService } from '../plataforma/prisma.service';
import { LecturasAdministracion, type CuentaDeLaEmpresa } from './lecturas';

// T-061 · REQ-ADM-03, REQ-ADM-09 a 16 · specs/08-administracion/plan.md §5.1 y §9. Las acciones sobre las cuentas
// de la organización. Todas: zona de empresa, solo el administrador, solo como control directo (REQ-ADM-07).
// Cada propuesta comprueba lo que dice la especificación; lo que no se cumple sale como no confirmable, con el
// motivo, y no crea nada. Al confirmar se vuelve a comprobar: si algo cambió, se propone de nuevo (H-AG-07).

export const NOMBRE_PLAN: Readonly<Record<Plan, string>> = { gratuito: 'Gratuito', personal: 'Personal', empresarial: 'Empresarial' };

export const TEXTOS = {
  noPertenece: 'Esa cuenta no pertenece a la organización.',
  afiliada: 'Esa cuenta es de la persona: se sumó con su cuenta. Lo que sí puedes hacer es quitarla de la organización.',
  cerrada: 'Esa cuenta está cerrada y no se puede cambiar.',
  ultimoAdministrador: 'La organización se quedaría sin nadie que la administre. Antes, nombra a otra persona administradora.',
  correoConCuenta: 'Ese correo ya tiene una cuenta en NexoAI. En lugar de darla de alta, puedes invitar a esa persona a sumarse a la organización.',
};

export type Evaluacion = { vista: VistaConfirmacion; cuenta?: CuentaDeLaEmpresa };

export const vistaDe = (accion: string, datos: VistaConfirmacion['datos'], irreversible: string | null, motivo: string | null): VistaConfirmacion => ({
  accion,
  datos,
  irreversible,
  confirmable: motivo === null,
  motivoNoConfirmable: motivo,
});

// Decorada para que NestJS lea los tipos de su constructor desde las clases hijas
@Injectable()
export abstract class EjecutorDeAdministracion<C, E extends Evaluacion = Evaluacion> implements EjecutorOperacion<C>, OnModuleInit {
  abstract readonly tipo: string;
  abstract readonly esquema: z.ZodType<C>;
  readonly ambito = 'empresa' as const;
  readonly soloAdministrador = true;
  readonly origenes = ['control_directo'] as const;
  readonly textoOrigenNoPermitido = 'Esto se hace en Administración, no con el asistente.';
  readonly nombresDeCampos: Readonly<Record<string, string>> = { correo: 'el correo', plan: 'el plan', perfilId: 'la cuenta', nombre: 'el nombre', equipoId: 'el equipo' };

  constructor(
    protected readonly registro: RegistroOperaciones,
    protected readonly prisma: PrismaService,
    protected readonly lecturas: LecturasAdministracion,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  protected abstract evaluar(contexto: ContextoSolicitud, carga: C): Promise<E>;
  protected abstract aplicar(contexto: ContextoSolicitud, carga: C, evaluacion: E): Promise<ResultadoEjecucion>;

  async proponer(contexto: ContextoSolicitud, carga: C): Promise<VistaConfirmacion> {
    return (await this.evaluar(contexto, carga)).vista;
  }

  // Los tipos que pueden dejar a una cuenta sin la administración (REQ-ADM-03)
  protected puedeQuitarAdministrador(): boolean {
    return false;
  }

  async ejecutar(contexto: ContextoSolicitud, carga: C): Promise<ResultadoEjecucion> {
    if (!this.puedeQuitarAdministrador()) return this.evaluarYAplicar(contexto, carga);
    // RT-02 · REQ-ADM-03: comprobar que queda otro administrador y aplicar el cambio no se cruza con otra
    // confirmación de la misma empresa. La transacción toma el bloqueo de la fila de la organización con una
    // escritura que no cambia nada (sin SQL a mano) y lo mantiene hasta que la acción termina; la siguiente espera
    // y evalúa con lo ya escrito. Las escrituras de la acción no van dentro de esta transacción (RT-08, aparte).
    const empresaId = this.empresa(contexto);
    return this.prisma.deOrganizacion(empresaId).$transaction(
      async (tx) => {
        await tx.organizacion.update({ where: { id: empresaId }, data: { tipo: 'empresa' } });
        return this.evaluarYAplicar(contexto, carga);
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
  }

  private async evaluarYAplicar(contexto: ContextoSolicitud, carga: C): Promise<ResultadoEjecucion> {
    const evaluacion = await this.evaluar(contexto, carga);
    if (!evaluacion.vista.confirmable) return { tipo: 'reproponer', vistaConfirmacion: evaluacion.vista };
    return this.aplicar(contexto, carga, evaluacion);
  }

  protected empresa(contexto: ContextoSolicitud): string {
    return this.lecturas.empresaDe(contexto);
  }

  // Plan §9: en el registro de la empresa, con quién actuó y sobre quién. Nunca una contraseña.
  protected async auditar(contexto: ContextoSolicitud, accion: string, detalle: Record<string, unknown>): Promise<void> {
    const organizacionId = this.empresa(contexto);
    await this.prisma.deOrganizacion(organizacionId).eventoAuditoria.create({
      data: { organizacionId, perfilId: contexto.perfilId, accion, detalle: detalle as object },
    });
  }

  // La cuenta sobre la que se actúa, con lo que impide la acción si algo lo impide
  protected async cuentaPropia(contexto: ContextoSolicitud, perfilId: string): Promise<{ cuenta: CuentaDeLaEmpresa | null; motivo: string | null }> {
    const cuenta = await this.lecturas.cuentaDeLaEmpresa(this.empresa(contexto), perfilId);
    if (!cuenta) return { cuenta: null, motivo: TEXTOS.noPertenece };
    if (!cuenta.propia) return { cuenta, motivo: TEXTOS.afiliada };
    if (cuenta.estado === 'cerrada') return { cuenta, motivo: TEXTOS.cerrada };
    return { cuenta, motivo: null };
  }

  // REQ-ADM-03: si la acción le quita la administración a esta cuenta, que quede otra con la cuenta activa
  protected async dejariaSinAdministrador(contexto: ContextoSolicitud, cuenta: CuentaDeLaEmpresa): Promise<boolean> {
    return cuenta.miembro.administrador && (await this.lecturas.otrosAdministradoresActivos(this.empresa(contexto), cuenta.perfilId)) === 0;
  }

  protected datosDe(cuenta: CuentaDeLaEmpresa | null, perfilId: string): VistaConfirmacion['datos'] {
    return [{ etiqueta: 'Cuenta', valor: cuenta?.correo ?? perfilId }];
  }
}

@Injectable()
export class AltaCuentaEmpresa extends EjecutorDeAdministracion<AltaCuentaEmpresaCarga> {
  readonly tipo = 'administracion.alta_cuenta';
  readonly esquema = AltaCuentaEmpresaCarga;

  protected async evaluar(_: ContextoSolicitud, carga: AltaCuentaEmpresaCarga): Promise<Evaluacion> {
    // REQ-ADM-10, H-ADM-14: se dice que el correo tiene cuenta, y nada más
    const motivo = (await this.lecturas.correoTieneCuenta(carga.correo)) ? TEXTOS.correoConCuenta : null;
    return {
      vista: vistaDe(
        'Dar de alta una cuenta de la organización',
        [
          { etiqueta: 'Correo', valor: carga.correo },
          { etiqueta: 'Plan', valor: NOMBRE_PLAN[carga.plan] },
          { etiqueta: 'Administra la organización', valor: carga.administrador ? 'Sí' : 'No' },
          { etiqueta: 'Al entrar', valor: 'Tendrá que elegir una contraseña nueva y su zona horaria' },
        ],
        'La contraseña temporal se muestra una sola vez, al confirmar.',
        motivo,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: AltaCuentaEmpresaCarga): Promise<ResultadoEjecucion> {
    const empresaId = this.empresa(contexto);
    // `rol` en desuso (plan §3.4): el de menos autoridad que corresponde al plan, hasta que lo reemplace la
    // autoridad por equipo (T-066). Hallazgo anotado en spec.md §7.
    const rol = carga.plan === 'empresarial' ? 'colaborador' : 'usuario_personal';
    const cuenta = await crearCuenta(this.prisma.deOrganizacion(empresaId), {
      organizacionId: empresaId,
      correo: carga.correo,
      rol,
      plan: carga.plan,
      administrador: carga.administrador,
    });
    await this.auditar(contexto, 'administracion.cuenta-creada', {
      perfilAfectado: cuenta.perfilId,
      despues: { plan: carga.plan, administrador: carga.administrador },
    });
    return {
      tipo: 'ejecutada',
      resultado: { perfilId: cuenta.perfilId, correo: cuenta.correo },
      efimero: { contrasenaTemporal: cuenta.contrasenaTemporal },
    };
  }
}

@Injectable()
export class CambiarPlan extends EjecutorDeAdministracion<CambioPlanCarga> {
  readonly tipo = 'administracion.cambiar_plan';
  readonly esquema = CambioPlanCarga;

  protected async evaluar(contexto: ContextoSolicitud, carga: CambioPlanCarga): Promise<Evaluacion> {
    const { cuenta, motivo } = await this.cuentaPropia(contexto, carga.perfilId);
    const igual = !motivo && cuenta!.plan === carga.plan ? `Esa cuenta ya tiene el Plan ${NOMBRE_PLAN[carga.plan]}.` : null;
    return {
      cuenta: cuenta ?? undefined,
      vista: vistaDe(
        'Cambiar el plan de una cuenta',
        [
          ...this.datosDe(cuenta, carga.perfilId),
          ...(cuenta && !motivo ? [{ etiqueta: 'Plan actual', valor: NOMBRE_PLAN[cuenta.plan] }] : []),
          { etiqueta: 'Plan nuevo', valor: NOMBRE_PLAN[carga.plan] },
          { etiqueta: 'Cuándo lo verá', valor: 'Desde su siguiente acceso' },
        ],
        null,
        motivo ?? igual,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: CambioPlanCarga, { cuenta }: Evaluacion): Promise<ResultadoEjecucion> {
    await this.prisma.deOrganizacion(this.empresa(contexto)).perfilUsuario.update({ where: { id: carga.perfilId }, data: { plan: carga.plan } });
    await this.auditar(contexto, 'administracion.plan-cambiado', { perfilAfectado: carga.perfilId, antes: { plan: cuenta!.plan }, despues: { plan: carga.plan } });
    return { tipo: 'ejecutada', resultado: { perfilId: carga.perfilId, plan: carga.plan } };
  }
}

@Injectable()
abstract class CambioDeEstado extends EjecutorDeAdministracion<CuentaCarga> {
  readonly esquema = CuentaCarga;
  protected abstract readonly accion: string;
  protected abstract readonly desde: readonly ('activa' | 'suspendida')[];
  protected abstract readonly hacia: 'activa' | 'suspendida' | 'cerrada';
  protected abstract readonly evento: string;
  protected abstract readonly textoDesde: string;
  protected readonly irreversible: string | null = null;
  protected readonly consecuencia: string | null = null;
  // Suspender y dar de baja quitan a la cuenta de los administradores activos; reactivar no
  protected override puedeQuitarAdministrador(): boolean {
    return this.hacia !== 'activa';
  }

  protected async evaluar(contexto: ContextoSolicitud, carga: CuentaCarga): Promise<Evaluacion> {
    const { cuenta, motivo } = await this.cuentaPropia(contexto, carga.perfilId);
    let impedimento = motivo;
    if (!impedimento && !this.desde.includes(cuenta!.estado as 'activa' | 'suspendida')) impedimento = this.textoDesde;
    if (!impedimento && this.hacia !== 'activa' && (await this.dejariaSinAdministrador(contexto, cuenta!))) impedimento = TEXTOS.ultimoAdministrador;
    return {
      cuenta: cuenta ?? undefined,
      vista: vistaDe(
        this.accion,
        [...this.datosDe(cuenta, carga.perfilId), ...(this.consecuencia ? [{ etiqueta: 'Qué pasa', valor: this.consecuencia }] : [])],
        this.irreversible,
        impedimento,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: CuentaCarga, { cuenta }: Evaluacion): Promise<ResultadoEjecucion> {
    const empresaId = this.empresa(contexto);
    const datos = this.prisma.deOrganizacion(empresaId);
    await datos.perfilUsuario.update({ where: { id: carga.perfilId }, data: { estado: this.hacia, estadoCambiadoEn: new Date() } });
    // REQ-ADM-12, 13: la sesión deja de valer; la guarda, además, lo comprueba en cada petición
    if (this.hacia !== 'activa') await revocarSesionesDelPerfil(this.prisma, carga.perfilId);
    const extra = await this.despues(contexto, carga);
    await this.auditar(contexto, this.evento, { perfilAfectado: carga.perfilId, antes: { estado: cuenta!.estado }, despues: { estado: this.hacia }, ...extra });
    return { tipo: 'ejecutada', resultado: { perfilId: carga.perfilId, estado: this.hacia } };
  }

  protected async despues(_: ContextoSolicitud, __: CuentaCarga): Promise<Record<string, unknown>> {
    return {};
  }
}

@Injectable()
export class SuspenderCuenta extends CambioDeEstado {
  readonly tipo = 'administracion.suspender_cuenta';
  protected readonly accion = 'Suspender una cuenta';
  protected readonly desde = ['activa'] as const;
  protected readonly hacia = 'suspendida' as const;
  protected readonly evento = 'administracion.cuenta-suspendida';
  protected readonly textoDesde = 'Esa cuenta ya está suspendida.';
  protected override readonly consecuencia = 'Se cierran sus sesiones abiertas y no podrá entrar hasta que la reactives. Todo lo suyo se conserva.';
}

@Injectable()
export class ReactivarCuenta extends CambioDeEstado {
  readonly tipo = 'administracion.reactivar_cuenta';
  protected readonly accion = 'Reactivar una cuenta';
  protected readonly desde = ['suspendida'] as const;
  protected readonly hacia = 'activa' as const;
  protected readonly evento = 'administracion.cuenta-reactivada';
  protected readonly textoDesde = 'Esa cuenta no está suspendida.';
  protected override readonly consecuencia = 'Vuelve a entrar con su contraseña de siempre y encuentra todo como estaba.';
}

@Injectable()
export class CerrarCuenta extends CambioDeEstado {
  readonly tipo = 'administracion.cerrar_cuenta';
  protected readonly accion = 'Dar de baja una cuenta';
  protected readonly desde = ['activa', 'suspendida'] as const;
  protected readonly hacia = 'cerrada' as const;
  protected readonly evento = 'administracion.cuenta-cerrada';
  protected readonly textoDesde = TEXTOS.cerrada;
  protected override readonly consecuencia = 'Se cierran sus sesiones y sale de sus equipos. Lo que tenía se conserva.';
  protected override readonly irreversible = 'No se puede deshacer: la cuenta no podrá volver a entrar ni reactivarse.';

  // REQ-ADM-13: sale de sus equipos y deja de administrar. Lo que pasa con sus tareas del equipo lo hará el
  // oyente de la salida de equipo cuando existan las tareas del equipo (plan §5.4, fase 4).
  protected override async despues(contexto: ContextoSolicitud, carga: CuentaCarga): Promise<Record<string, unknown>> {
    const datos = this.prisma.deOrganizacion(this.empresa(contexto));
    // Desde el 25 de noviembre de 2026, sobre `miembro_de_equipo` de CUN-05 (D-F1)
    const equipos = await datos.miembroDeEquipo.findMany({ where: { perfilId: carga.perfilId }, select: { equipoId: true } });
    await datos.miembroDeEquipo.deleteMany({ where: { perfilId: carga.perfilId } });
    await datos.miembroOrganizacion.updateMany({ where: { perfilId: carga.perfilId, estado: 'vigente' }, data: { administrador: false } });
    return { equipos: equipos.map((e) => e.equipoId) };
  }
}

@Injectable()
export class RestablecerContrasena extends EjecutorDeAdministracion<CuentaCarga> {
  readonly tipo = 'administracion.restablecer_contrasena';
  readonly esquema = CuentaCarga;

  protected async evaluar(contexto: ContextoSolicitud, carga: CuentaCarga): Promise<Evaluacion> {
    const { cuenta, motivo } = await this.cuentaPropia(contexto, carga.perfilId);
    return {
      cuenta: cuenta ?? undefined,
      vista: vistaDe(
        'Restablecer la contraseña de una cuenta',
        [
          ...this.datosDe(cuenta, carga.perfilId),
          { etiqueta: 'Qué pasa', valor: 'Se cierran sus sesiones abiertas. Al entrar con la temporal tendrá que elegir una contraseña nueva; conserva su zona horaria.' },
        ],
        'La contraseña anterior deja de valer. La temporal se muestra una sola vez, al confirmar.',
        motivo,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: CuentaCarga): Promise<ResultadoEjecucion> {
    const contrasenaTemporal = generarContrasenaTemporal();
    // H-ADM-13: no se toca la zona horaria; el primer ingreso pendiente solo pide la contraseña nueva
    await this.prisma.deOrganizacion(this.empresa(contexto)).perfilUsuario.update({
      where: { id: carga.perfilId },
      data: { hashContrasena: await calcularHash(contrasenaTemporal), debeCambiarContrasena: true },
    });
    await revocarSesionesDelPerfil(this.prisma, carga.perfilId);
    await this.auditar(contexto, 'administracion.contrasena-restablecida', { perfilAfectado: carga.perfilId });
    return { tipo: 'ejecutada', resultado: { perfilId: carga.perfilId }, efimero: { contrasenaTemporal } };
  }
}

@Injectable()
export class NombrarAdministrador extends EjecutorDeAdministracion<CuentaCarga> {
  readonly tipo = 'administracion.nombrar_administrador';
  readonly esquema = CuentaCarga;

  // REQ-ADM-03: puede haber varios. Vale también para una cuenta afiliada: es una condición de su pertenencia,
  // no una acción sobre su cuenta (H-ADM-01, H-ADM-05)
  protected async evaluar(contexto: ContextoSolicitud, carga: CuentaCarga): Promise<Evaluacion> {
    const cuenta = await this.lecturas.cuentaDeLaEmpresa(this.empresa(contexto), carga.perfilId);
    const motivo = !cuenta
      ? TEXTOS.noPertenece
      : cuenta.estado !== 'activa'
        ? 'Solo una cuenta activa puede administrar la organización.'
        : cuenta.miembro.administrador
          ? 'Esa cuenta ya administra la organización.'
          : null;
    return {
      cuenta: cuenta ?? undefined,
      vista: vistaDe(
        'Nombrar a alguien administrador de la organización',
        [...this.datosDe(cuenta, carga.perfilId), { etiqueta: 'Qué podrá hacer', valor: 'Gestionar las cuentas y los equipos de la organización, sin ver el trabajo de nadie' }],
        null,
        motivo,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: CuentaCarga, { cuenta }: Evaluacion): Promise<ResultadoEjecucion> {
    await this.prisma.deOrganizacion(this.empresa(contexto)).miembroOrganizacion.update({ where: { id: cuenta!.miembro.id }, data: { administrador: true } });
    await this.auditar(contexto, 'administracion.administrador-nombrado', { perfilAfectado: carga.perfilId });
    return { tipo: 'ejecutada', resultado: { perfilId: carga.perfilId, administrador: true } };
  }
}

@Injectable()
export class QuitarAdministrador extends EjecutorDeAdministracion<CuentaCarga> {
  readonly tipo = 'administracion.quitar_administrador';
  readonly esquema = CuentaCarga;
  protected override puedeQuitarAdministrador(): boolean {
    return true;
  }

  protected async evaluar(contexto: ContextoSolicitud, carga: CuentaCarga): Promise<Evaluacion> {
    const cuenta = await this.lecturas.cuentaDeLaEmpresa(this.empresa(contexto), carga.perfilId);
    const motivo = !cuenta
      ? TEXTOS.noPertenece
      : !cuenta.miembro.administrador
        ? 'Esa cuenta no administra la organización.'
        : (await this.dejariaSinAdministrador(contexto, cuenta))
          ? TEXTOS.ultimoAdministrador
          : null;
    return {
      cuenta: cuenta ?? undefined,
      vista: vistaDe('Dejar de ser administrador de la organización', this.datosDe(cuenta, carga.perfilId), null, motivo),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: CuentaCarga, { cuenta }: Evaluacion): Promise<ResultadoEjecucion> {
    await this.prisma.deOrganizacion(this.empresa(contexto)).miembroOrganizacion.update({ where: { id: cuenta!.miembro.id }, data: { administrador: false } });
    await this.auditar(contexto, 'administracion.administrador-retirado', { perfilAfectado: carga.perfilId });
    return { tipo: 'ejecutada', resultado: { perfilId: carga.perfilId, administrador: false } };
  }
}

export const EJECUTORES_DE_CUENTAS = [
  AltaCuentaEmpresa,
  CambiarPlan,
  SuspenderCuenta,
  ReactivarCuenta,
  CerrarCuenta,
  RestablecerContrasena,
  NombrarAdministrador,
  QuitarAdministrador,
];
