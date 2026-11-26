import type { ClaseCuenta, EstadoPersona, Plan } from '@nexoai/contratos';

// Textos de pantalla de la zona (R-40: sin vocabulario interno)
export const NOMBRE_PLAN: Readonly<Record<Plan, string>> = { gratuito: 'Gratuito', personal: 'Personal', empresarial: 'Empresarial' };

export const NOMBRE_CLASE: Readonly<Record<ClaseCuenta, string>> = {
  propia: 'De la organización',
  afiliada: 'Se sumó con su cuenta',
  invitacion: 'Invitación',
};

export const NOMBRE_ESTADO: Readonly<Record<EstadoPersona, string>> = {
  activa: 'Activa',
  primer_ingreso_pendiente: 'Aún no entró',
  suspendida: 'Suspendida',
  cerrada: 'Dada de baja',
  invitacion_pendiente: 'Invitación pendiente',
};

export const SIN_CONEXION = 'No pudimos conectar con NexoAI. Revisa tu conexión e inténtalo de nuevo.';
