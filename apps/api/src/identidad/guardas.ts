import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SesionActual } from '@nexoai/contratos';
import { errorApi } from '../plataforma/errores';
import {
  CLAVE_ALCANCE,
  CLAVE_DURANTE_PRIMER_INGRESO,
  CLAVE_PUBLICO,
  type AlcanceRuta,
  type SolicitudConContexto,
} from './decoradores';

function esPublica(reflector: Reflector, ctx: ExecutionContext): boolean {
  return reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [ctx.getHandler(), ctx.getClass()]) === true;
}

// Global. Sin token de acceso válido no se entra a ninguna ruta que no sea @Publico().
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (esPublica(this.reflector, ctx)) return true;
    const solicitud = ctx.switchToHttp().getRequest<SolicitudConContexto & { headers: Record<string, string | undefined> }>();
    const [tipo, token] = (solicitud.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw errorApi(401, 'NO_AUTENTICADO', 'Hace falta iniciar sesión.');

    try {
      const carga = await this.jwt.verifyAsync<Record<string, unknown>>(token);
      solicitud.contexto = SesionActual.parse({
        perfilId: carga.sub,
        organizacionId: carga.org,
        rol: carga.rol,
        plan: carga.plan,
        primerIngresoPendiente: carga.pi,
      });
    } catch {
      throw errorApi(401, 'NO_AUTENTICADO', 'La sesión no es válida o ha caducado.');
    }
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

// Global, después de PrimerIngresoGuard (T-026, REQ-ACC-13, REQ-ACC-15). El colaborador usa todo lo
// suyo, como el Plan Empresarial, pero no lo que da autoridad sobre otros. Una ruta sin alcance
// declarado se le cierra también: un olvido no deja nada abierto.
@Injectable()
export class RolGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (esPublica(this.reflector, ctx)) return true;
    if (ctx.switchToHttp().getRequest<SolicitudConContexto>().contexto?.rol !== 'colaborador') return true;
    const alcance = this.reflector.getAllAndOverride<AlcanceRuta | undefined>(CLAVE_ALCANCE, [ctx.getHandler(), ctx.getClass()]);
    if (alcance === 'propio') return true;
    throw errorApi(403, 'ROL_NO_PERMITIDO', alcance === 'responsable' ? SOLO_EL_RESPONSABLE : 'Esta función no está disponible para tu cuenta.');
  }
}

// 5 intentos por minuto por correo e IP (specs/06-acceso/plan.md §5.1). Solo en POST /auth/ingreso.
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
