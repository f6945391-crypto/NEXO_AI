import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { ContextoSolicitud } from './contexto';

export const CLAVE_PUBLICO = 'nexoai:publico';
export const CLAVE_ALCANCE = 'nexoai:alcance';
export const CLAVE_DURANTE_PRIMER_INGRESO = 'nexoai:durante-primer-ingreso';

// Ruta sin sesión: salud, ingreso, renovación y salida. Todo lo demás exige token de acceso.
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

// T-026 · REQ-ACC-13, REQ-ACC-15 · specs/06-acceso/plan.md §5.5. Toda ruta autenticada declara su
// alcance, en la ruta o en su controlador. El colaborador usa las de lo propio, nunca las del
// responsable, y tampoco una que no declare nada. Una prueba exige que todas lo declaren.
export type AlcanceRuta = 'propio' | 'responsable';
// Trabaja sobre lo de la propia persona: su agenda, sus tareas, sus Operaciones, su perfil
export const SobreLoPropio = () => SetMetadata(CLAVE_ALCANCE, 'propio' satisfies AlcanceRuta);
// Asigna o delega trabajo a otros, o administra el equipo: solo el responsable (ACC-15)
export const SoloResponsable = () => SetMetadata(CLAVE_ALCANCE, 'responsable' satisfies AlcanceRuta);

// La única ruta autenticada a la que se llega con el primer ingreso pendiente (REQ-ACC-04).
export const PermitidoDurantePrimerIngreso = () => SetMetadata(CLAVE_DURANTE_PRIMER_INGRESO, true);

export type SolicitudConContexto = { contexto?: ContextoSolicitud };

// El contexto lo pone AutenticacionGuard a partir del token; nunca del cuerpo de la petición (P-04).
export const Contexto = createParamDecorator((_: unknown, ctx: ExecutionContext): ContextoSolicitud => {
  const contexto = ctx.switchToHttp().getRequest<SolicitudConContexto>().contexto;
  if (!contexto) throw new Error('Ruta sin contexto: ¿le falta la guarda de autenticación o es @Publico()?');
  return contexto;
});
