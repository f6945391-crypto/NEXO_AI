import { z } from 'zod';

// specs/06-acceso/plan.md §3. Rol y plan los fija la organización (R-45, REQ-ACC-12).
// `colaborador` desde D-17: solo sus tareas asignadas, en el móvil (REQ-ACC-13).
export const Rol = z.enum(['usuario_personal', 'gerente', 'colaborador']);
export type Rol = z.infer<typeof Rol>;

export const Plan = z.enum(['gratuito', 'personal', 'empresarial']);
export type Plan = z.infer<typeof Plan>;

// Alta de cuentas por script, no por una ruta pública (REQ-ACC-01, H-ACC-01). T-002
export const AltaCuenta = z.strictObject({
  organizacionId: z.uuid(),
  correo: z.email().transform((correo) => correo.toLowerCase()),
  rol: Rol,
  plan: Plan,
});
export type AltaCuenta = z.input<typeof AltaCuenta>;

// POST /auth/ingreso — REQ-ACC-02, REQ-ACC-03 · T-004
export const IngresoSolicitud = z.strictObject({
  correo: z.string().trim().toLowerCase().min(1).max(320),
  contrasena: z.string().min(1).max(200),
});
export type IngresoSolicitud = z.infer<typeof IngresoSolicitud>;

// También es la respuesta de POST /auth/renovar. El cliente decide la vista según el rol (H-ACC-05).
export const IngresoRespuesta = z.strictObject({
  tokenAcceso: z.string(),
  tokenRenovacion: z.string(),
  accesoExpiraEn: z.iso.datetime(),
  rol: Rol,
  plan: Plan,
  primerIngresoPendiente: z.boolean(),
});
export type IngresoRespuesta = z.infer<typeof IngresoRespuesta>;

// POST /auth/renovar y POST /auth/salida
export const TokenRenovacionSolicitud = z.strictObject({
  tokenRenovacion: z.string().min(1).max(200),
});
export type TokenRenovacionSolicitud = z.infer<typeof TokenRenovacionSolicitud>;

// GET /auth/sesion — quién soy, según el token de acceso
export const SesionActual = z.strictObject({
  perfilId: z.uuid(),
  organizacionId: z.uuid(),
  rol: Rol,
  plan: Plan,
});
export type SesionActual = z.infer<typeof SesionActual>;
