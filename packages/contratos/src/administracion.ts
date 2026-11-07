import { z } from 'zod';
import { Plan } from './acceso';
import { EstadoOperacion, VistaConfirmacion } from './operaciones';

// Administración de la organización (specs/08-administracion/plan.md §6) · T-067 a T-069. Lo que lee y pide la
// zona de empresa. Nada de la agenda, las tareas ni la conversación de nadie (REQ-ADM-02, REQ-ADM-08).

// GET /administracion/operaciones — el registro de la empresa, de más reciente a más antigua (plan §7.2)
export const EntradaRegistroEmpresa = z.strictObject({
  id: z.uuid(),
  tipo: z.string(),
  estado: EstadoOperacion,
  accion: z.string(),
  datos: VistaConfirmacion.shape.datos,
  // Quién la hizo
  por: z.string(),
  creadaEn: z.iso.datetime(),
  ejecutadaEn: z.iso.datetime().nullable(),
});
export type EntradaRegistroEmpresa = z.infer<typeof EntradaRegistroEmpresa>;

// POST /administracion/operaciones: la misma solicitud que /operaciones, siempre como control directo
// (REQ-ADM-07: el asistente no administra)
export const OperacionEmpresaSolicitud = z.strictObject({
  tipo: z.string().min(1).max(100).startsWith('administracion.'),
  carga: z.unknown(),
});
export type OperacionEmpresaSolicitud = z.infer<typeof OperacionEmpresaSolicitud>;

// Lo que se puede asignar desde el área (REQ-ADM-09, 11)
export const PlanAsignable = Plan;

// GET /administracion/personas — REQ-ADM-08 · T-068. Invitaciones pendientes al principio.
export const ClaseCuenta = z.enum(['propia', 'afiliada', 'invitacion']);
export type ClaseCuenta = z.infer<typeof ClaseCuenta>;

export const EstadoPersona = z.enum(['activa', 'primer_ingreso_pendiente', 'suspendida', 'cerrada', 'invitacion_pendiente']);
export type EstadoPersona = z.infer<typeof EstadoPersona>;

export const PersonaOrganizacion = z.strictObject({
  perfilId: z.uuid(),
  miembroId: z.uuid(),
  correo: z.string(),
  clase: ClaseCuenta,
  estado: EstadoPersona,
  plan: Plan,
  equipos: z.array(z.strictObject({ id: z.uuid(), nombre: z.string(), responsable: z.boolean() })),
  administrador: z.boolean(),
});
export type PersonaOrganizacion = z.infer<typeof PersonaOrganizacion>;

// GET /administracion/equipos — REQ-ADM-28 a 32, solo lectura en esta entrega. `miembros` no repite al responsable.
export const EquipoOrganizacion = z.strictObject({
  id: z.uuid(),
  nombre: z.string(),
  responsable: z.strictObject({ perfilId: z.uuid(), correo: z.string() }).nullable(),
  miembros: z.array(z.strictObject({ perfilId: z.uuid(), correo: z.string() })),
});
export type EquipoOrganizacion = z.infer<typeof EquipoOrganizacion>;

// GET /administracion/sesion — quién está en la zona y qué apartados ve (plan §7.2). Solo para pintar.
export const SesionEmpresa = z.strictObject({
  correo: z.string(),
  // La de la propia persona, para mostrar las fechas del registro con su zona (P-05)
  zonaHoraria: z.string().nullable(),
  organizacion: z.strictObject({ nombre: z.string() }),
  administrador: z.boolean(),
  responsable: z.boolean(),
});
export type SesionEmpresa = z.infer<typeof SesionEmpresa>;

// Cargas de las Operaciones de cuentas (plan §5.1)
export const AltaCuentaEmpresaCarga = z.strictObject({
  correo: z.email().transform((correo) => correo.toLowerCase()),
  plan: Plan,
  administrador: z.boolean().default(false),
});
export type AltaCuentaEmpresaCarga = z.infer<typeof AltaCuentaEmpresaCarga>;

export const CambioPlanCarga = z.strictObject({ perfilId: z.uuid(), plan: Plan });
export type CambioPlanCarga = z.infer<typeof CambioPlanCarga>;

export const CuentaCarga = z.strictObject({ perfilId: z.uuid() });
export type CuentaCarga = z.infer<typeof CuentaCarga>;
