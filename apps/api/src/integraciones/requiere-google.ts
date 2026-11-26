import { Injectable, SetMetadata, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ClaveAlcanceGoogle } from '@nexoai/contratos';
import type { SolicitudConContexto } from '../identidad/decoradores';
import { ClienteGoogle, permisoFaltante } from './cliente-google';

// REQ-ACC-08 · T-008. Una ruta marcada con @RequiereGoogle('calendario') no llega a ejecutarse sin ese
// permiso concedido: responde PERMISO_GOOGLE_FALTANTE sin llamar a Google.

const CLAVE_REQUIERE_GOOGLE = 'nexoai:requiere-google';

export const RequiereGoogle = (alcance: ClaveAlcanceGoogle) => SetMetadata(CLAVE_REQUIERE_GOOGLE, alcance);

@Injectable()
export class RequiereGoogleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly google: ClienteGoogle,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alcance = this.reflector.getAllAndOverride<ClaveAlcanceGoogle | undefined>(CLAVE_REQUIERE_GOOGLE, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!alcance) return true;
    const contexto = ctx.switchToHttp().getRequest<SolicitudConContexto>().contexto;
    if (!contexto || !(await this.google.tienePermiso(contexto, alcance))) throw permisoFaltante(alcance);
    return true;
  }
}
