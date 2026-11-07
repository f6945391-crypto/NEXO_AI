import type { Plan, Rol } from '@nexoai/contratos';

// T-066 · specs/08-administracion/plan.md §7.1: la sesión de la aplicación (`propio`) y la de la zona de
// empresa (`empresa`) son distintas, con su cookie y su renovación. Una nunca vale donde va la otra.
export type AmbitoSesion = 'propio' | 'empresa';

// T-066 · plan §4.1: la empresa a la que pertenece la cuenta. Para una cuenta propia, su organización es la de
// la empresa; para una afiliada, son distintas (opción B, H-ADM-16).
export interface PertenenciaEmpresa {
  organizacionId: string;
  miembroId: string;
  origen: 'alta' | 'afiliacion';
}

// Quién hace la petición. Sale del JWT de acceso (T-004) y es lo único que decide qué datos se ven:
// nunca lo que diga el cliente ni el modelo de lenguaje (P-04).
export interface ContextoSolicitud {
  perfilId: string;
  // La organización de la cuenta: lo suyo vive aquí
  organizacionId: string;
  // En desuso desde specs/08-administracion/plan.md §3.4; lo sigue leyendo T-026 hasta T-073
  rol: Rol;
  // Plan efectivo: el Empresarial mientras dure una afiliación (H-ADM-06)
  plan: Plan;
  // REQ-ACC-04: mientras sea verdadero, solo se puede completar el primer ingreso o salir (T-005).
  primerIngresoPendiente: boolean;
  // T-066. Opcionales para los contextos que se arman fuera de una petición (el trabajador): sin ellos,
  // la cuenta no pertenece a ninguna empresa y la sesión es la de la aplicación.
  empresa?: PertenenciaEmpresa | null;
  ambito?: AmbitoSesion;
}

// Si la cuenta es administradora o responsable NO va en el token: se lee de la base en cada petición que lo
// necesita, para que quitar la autoridad surta efecto en la petición siguiente (plan §4.1, H-ADM-17).
