import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Plan, Rol } from '@nexoai/contratos';
import { z } from 'zod';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import type { AmbitoSesion, ContextoSolicitud } from './contexto';
import {
  CLAVE_ALCANCE,
  CLAVE_AMBITO,
  CLAVE_DURANTE_PRIMER_INGRESO,
  CLAVE_PUBLICO,
  type AlcanceRuta,
  type SolicitudConContexto,
} from './decoradores';
import { PertenenciasRepositorio } from './pertenencias';

function esPublica(reflector: Reflector, ctx: ExecutionContext): boolean {
  return reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [ctx.getHandler(), ctx.getClass()]) === true;
}

// Lo que lleva el token de acceso (autenticacion.service.ts, `emitir`). `emp` y `amb` desde T-059; un token de
// antes no los trae y vale como sesión de la aplicación sin empresa.
const CargaAcceso = z.object({
  sub: z.uuid(),
  org: z.uuid(),
  rol: Rol,
  plan: Plan,
  pi: z.boolean(),
  emp: z.object({ o: z.uuid(), m: z.uuid(), g: z.enum(['alta', 'afiliacion']) }).nullable().optional(),
  amb: z.enum(['propio', 'empresa']).optional(),
});

export const TEXTO_AMBITO: Readonly<Record<AmbitoSesion, string>> = {
  propio: 'Esto se hace desde NexoAI, no desde Administración.',
  empresa: 'Esto se hace desde Administración, con su propio ingreso.',
};

// Global. Sin token de acceso válido no se entra a ninguna ruta que no sea @Publico().
// T-059 · REQ-ADM-12 · H-ADM-17: además, la cuenta tiene que seguir activa (una lectura por clave primaria), y
// la sesión tiene que ser del ámbito de la ruta (specs/08-administracion/plan.md §7.3).
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (esPublica(this.reflector, ctx)) return true;
    const solicitud = ctx.switchToHttp().getRequest<SolicitudConContexto & { headers: Record<string, string | undefined> }>();
    const [tipo, token] = (solicitud.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw errorApi(401, 'NO_AUTENTICADO', 'Hace falta iniciar sesión.');

    let contexto: ContextoSolicitud;
    try {
      const carga = CargaAcceso.parse(await this.jwt.verifyAsync<Record<string, unknown>>(token));
      contexto = {
        perfilId: carga.sub,
        organizacionId: carga.org,
        rol: carga.rol,
        plan: carga.plan,
        primerIngresoPendiente: carga.pi,
        empresa: carga.emp ? { organizacionId: carga.emp.o, miembroId: carga.emp.m, origen: carga.emp.g } : null,
        ambito: carga.amb ?? 'propio',
      };
    } catch {
      throw errorApi(401, 'NO_AUTENTICADO', 'La sesión no es válida o ha caducado.');
    }

    const perfil = await this.prisma
      .deOrganizacion(contexto.organizacionId)
      .perfilUsuario.findUnique({ where: { id: contexto.perfilId }, select: { estado: true } });
    if (perfil?.estado !== 'activa') throw errorApi(401, 'NO_AUTENTICADO', 'La sesión no es válida o ha caducado.');

    const ambito = this.reflector.getAllAndOverride<AmbitoSesion | undefined>(CLAVE_AMBITO, [ctx.getHandler(), ctx.getClass()]) ?? 'propio';
    if (contexto.ambito !== ambito) throw errorApi(403, 'AMBITO_INCORRECTO', TEXTO_AMBITO[ambito]);

    solicitud.contexto = contexto;
    return true;
  }
}

// Global, después de AutenticacionGuard. Con el primer ingreso pendiente solo se puede completarlo;
// salir es @Publico() y no pasa por aquí (REQ-ACC-04, T-005).
@Injectable()
export class PrimerIngresoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (esPublica(this.reflector, ctx)) return true;
    if (!ctx.switchToHttp().getRequest<SolicitudConContexto>().contexto?.primerIngresoPendiente) return true;
    const permitida = this.reflector.getAllAndOverride<boolean>(CLAVE_DURANTE_PRIMER_INGRESO, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (permitida) return true;
    throw errorApi(403, 'PRIMER_INGRESO_PENDIENTE', 'Antes de continuar, cambia tu contraseña y elige tu zona horaria.');
  }
}

export const SOLO_EL_RESPONSABLE = 'Solo el responsable del equipo asigna tareas y administra el equipo.';
export const SOLO_EL_ADMINISTRADOR = 'Esto lo hace quien administra la organización.';
export const SIN_ORGANIZACION = 'Tu cuenta no pertenece a ninguna organización.';

// Global, después de PrimerIngresoGuard. Antes `RolGuard` (T-026, REQ-ACC-13, REQ-ACC-15): el colaborador usa
// todo lo suyo, como el Plan Empresarial, pero no lo que da autoridad sobre otros. Una ruta sin alcance
// declarado se le cierra también: un olvido no deja nada abierto.
// T-059 · specs/08-administracion/plan.md §4.2: `administrador` y `empresa` se comprueban contra la base en
// cada petición, para que quitar la condición surta efecto en la siguiente (H-ADM-17).
@Injectable()
export class AlcanceGuard implements CanActivate {
  private readonly pertenencias: PertenenciasRepositorio;

  constructor(
    private readonly reflector: Reflector,
    prisma: PrismaService,
  ) {
    this.pertenencias = new PertenenciasRepositorio(prisma);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (esPublica(this.reflector, ctx)) return true;
    const contexto = ctx.switchToHttp().getRequest<SolicitudConContexto>().contexto;
    if (!contexto) return true;
    const alcance = this.reflector.getAllAndOverride<AlcanceRuta | undefined>(CLAVE_ALCANCE, [ctx.getHandler(), ctx.getClass()]);

    if (alcance === 'administrador') {
      if (await this.pertenencias.esAdministrador(contexto)) return true;
      await this.pertenencias.registrarRechazo(contexto, { ruta: `${ctx.getClass().name}.${ctx.getHandler().name}` });
      throw errorApi(403, 'ADMINISTRACION_NO_PERMITIDA', SOLO_EL_ADMINISTRADOR);
    }
    if (alcance === 'empresa') {
      if (await this.pertenencias.sigueVigente(contexto)) return true;
      throw errorApi(403, 'SIN_ORGANIZACION', SIN_ORGANIZACION);
    }

    if (contexto.rol !== 'colaborador') return true;
    if (alcance === 'propio') return true;
    throw errorApi(403, 'ROL_NO_PERMITIDO', alcance === 'responsable' ? SOLO_EL_RESPONSABLE : 'Esta función no está disponible para tu cuenta.');
  }
}

// T-121 · H-ACC-08: probar la contraseña actual tiene el mismo límite que el ingreso, contado por cuenta: la
// petición no lleva correo. La guarda global de autenticación ya dejó el contexto en la solicitud.
@Injectable()
export class LimiteContrasenaGuard extends ThrottlerGuard {
  protected override async getTracker(solicitud: Record<string, unknown>): Promise<string> {
    const contexto = (solicitud as { contexto?: ContextoSolicitud }).contexto;
    return `contrasena|${contexto?.perfilId ?? String(solicitud.ip)}`;
  }

  protected override async throwThrottlingException(): Promise<void> {
    throw errorApi(429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos. Espera un minuto y vuelve a probar.');
  }
}

// 5 intentos por minuto por correo e IP (specs/06-acceso/plan.md §5.1). En POST /auth/ingreso y en
// POST /administracion/entrar (T-059).
@Injectable()
export class LimiteIngresoGuard extends ThrottlerGuard {
  protected override async getTracker(solicitud: Record<string, unknown>): Promise<string> {
    const correo = String((solicitud.body as { correo?: unknown } | undefined)?.correo ?? '').trim().toLowerCase();
    return `${String(solicitud.ip)}|${correo}`;
  }

  protected override async throwThrottlingException(): Promise<void> {
    throw errorApi(429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos. Espera un minuto y vuelve a probar.');
  }
}

// T-123 · REQ-ACC-19 · plan §5.8: el mismo límite que el ingreso, con su propio contador para no gastar los
// intentos de entrar. Pedir cuenta por IP y correo; confirmar, por IP y enlace (los primeros caracteres del token).
@Injectable()
export class LimiteRestablecerGuard extends ThrottlerGuard {
  protected override async getTracker(solicitud: Record<string, unknown>): Promise<string> {
    const cuerpo = (solicitud.body ?? {}) as { correo?: unknown; token?: unknown };
    const clave = cuerpo.token !== undefined ? `enlace:${String(cuerpo.token).slice(0, 16)}` : `correo:${String(cuerpo.correo ?? '').trim().toLowerCase()}`;
    return `restablecer|${String(solicitud.ip)}|${clave}`;
  }

  protected override async throwThrottlingException(): Promise<void> {
    throw errorApi(429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos. Espera un minuto y vuelve a probar.');
  }
}
