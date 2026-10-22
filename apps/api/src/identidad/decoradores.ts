import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Rol } from '@nexoai/contratos';
import type { ContextoSolicitud } from './contexto';

export const CLAVE_PUBLICO = 'nexoai:publico';
export const CLAVE_PERMITIDO_PARA = 'nexoai:permitido-para';
export const CLAVE_DURANTE_PRIMER_INGRESO = 'nexoai:durante-primer-ingreso';

// Ruta sin sesión: salud, ingreso, renovación y salida. Todo lo demás exige token de acceso.
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

// Roles restringidos que pueden usar esta ruta. Hoy solo lo necesita `colaborador`, al que se le
// deniega por defecto toda ruta no marcada (REQ-ACC-13, specs/06-acceso/plan.md §5.5).
export const PermitidoPara = (...roles: Rol[]) => SetMetadata(CLAVE_PERMITIDO_PARA, roles);

// La única ruta autenticada a la que se llega con el primer ingreso pendiente (REQ-ACC-04).
export const PermitidoDurantePrimerIngreso = () => SetMetadata(CLAVE_DURANTE_PRIMER_INGRESO, true);

export type SolicitudConContexto = { contexto?: ContextoSolicitud };

// El contexto lo pone AutenticacionGuard a partir del token; nunca del cuerpo de la petición (P-04).
export const Contexto = createParamDecorator((_: unknown, ctx: ExecutionContext): ContextoSolicitud => {
  const contexto = ctx.switchToHttp().getRequest<SolicitudConContexto>().contexto;
  if (!contexto) throw new Error('Ruta sin contexto: ¿le falta la guarda de autenticación o es @Publico()?');
  return contexto;
});
