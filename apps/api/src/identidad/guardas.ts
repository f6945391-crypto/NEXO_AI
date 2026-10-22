import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SesionActual, type Rol } from '@nexoai/contratos';
import { errorApi } from '../plataforma/errores';
import {
  CLAVE_DURANTE_PRIMER_INGRESO,
  CLAVE_PERMITIDO_PARA,
  CLAVE_PUBLICO,
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

// Global, después de PrimerIngresoGuard. Deniega por defecto al colaborador (REQ-ACC-13).
@Injectable()
export class RolGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (esPublica(this.reflector, ctx)) return true;
    const rol = ctx.switchToHttp().getRequest<SolicitudConContexto>().contexto?.rol;
    if (rol !== 'colaborador') return true;
    const permitidos =
      this.reflector.getAllAndOverride<Rol[]>(CLAVE_PERMITIDO_PARA, [ctx.getHandler(), ctx.getClass()]) ?? [];
    if (permitidos.includes('colaborador')) return true;
    throw errorApi(403, 'ROL_NO_PERMITIDO', 'Esta función no está disponible para tu cuenta.');
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
