import type { Plan, Rol } from '@nexoai/contratos';

// Quién hace la petición. Sale del JWT de acceso (T-004) y es lo único que decide qué datos se ven:
// nunca lo que diga el cliente ni el modelo de lenguaje (P-04).
export interface ContextoSolicitud {
  perfilId: string;
  organizacionId: string;
  rol: Rol;
  plan: Plan;
  // REQ-ACC-04: mientras sea verdadero, solo se puede completar el primer ingreso o salir (T-005).
  primerIngresoPendiente: boolean;
}
