import { z } from 'zod';

// specs/06-acceso/plan.md §3. Rol y plan los fija la organización (R-45, REQ-ACC-12).
export const Rol = z.enum(['usuario_personal', 'gerente']);
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
