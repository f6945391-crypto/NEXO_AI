import { z } from 'zod';

// specs/06-acceso/plan.md §3. Rol y plan los fija la organización (R-45, REQ-ACC-12).
// `colaborador` desde D-17: solo sus tareas asignadas, en el móvil (REQ-ACC-13).
export const Rol = z.enum(['usuario_personal', 'gerente', 'colaborador']);
export type Rol = z.infer<typeof Rol>;

export const Plan = z.enum(['gratuito', 'personal', 'empresarial']);
export type Plan = z.infer<typeof Plan>;

// T-058 · REQ-ADM-01 · specs/08-administracion/plan.md §3.2
export const TipoOrganizacion = z.enum(['personal', 'empresa']);
export type TipoOrganizacion = z.infer<typeof TipoOrganizacion>;

// Alta de cuentas por script, no por una ruta pública (REQ-ACC-01, H-ACC-01). T-002
export const AltaCuenta = z.strictObject({
  organizacionId: z.uuid(),
  correo: z.email().transform((correo) => correo.toLowerCase()),
  rol: Rol,
  plan: Plan,
  // T-058 · REQ-ADM-04: solo en una organización de empresa (H-ADM-01)
  administrador: z.boolean().optional(),
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

// GET /auth/sesion — quién soy, según el token de acceso. `plan` es el plan efectivo: el Empresarial
// mientras dure una afiliación (H-ADM-06). T-059: `administrador` y `organizacion` (la empresa a la que
// pertenece, o nulo) se leen de la base en cada petición; solo sirven para pintar, decide la guarda (P-04).
export const SesionActual = z.strictObject({
  perfilId: z.uuid(),
  organizacionId: z.uuid(),
  rol: Rol,
  plan: Plan,
  primerIngresoPendiente: z.boolean(),
  administrador: z.boolean(),
  organizacion: z.strictObject({ nombre: z.string(), tipo: TipoOrganizacion }).nullable(),
});
export type SesionActual = z.infer<typeof SesionActual>;

// GET /perfil — REQ-ACC-10 (lectura), REQ-ACC-12 · T-006. Estricto: no hay ruta que lo modifique,
// y la zona horaria se cambia con una Operación (T-009).
export const Perfil = z.strictObject({
  perfilId: z.uuid(),
  correo: z.string(),
  rol: Rol,
  plan: Plan,
  zonaHoraria: z.string().nullable(),
  organizacion: z.strictObject({ nombre: z.string() }),
});
export type Perfil = z.infer<typeof Perfil>;

// Zona horaria IANA con nombre (P-05).
// - La forma descarta los desfases fijos («+05:00», «GMT-5») y el prefijo Etc/ («Etc/GMT+5»), que
//   Intl.DateTimeFormat sí admite.
// - Que exista lo decide Intl.DateTimeFormat. No se usa Intl.supportedValuesOf porque devuelve los nombres
//   antiguos de ICU y deja fuera los vigentes, como America/Argentina/Buenos_Aires o Asia/Kolkata.
function zonaReconocida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat('es', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

export const ZonaHoraria = z
  .string()
  .regex(/^(UTC|(?!Etc\/)[A-Z][A-Za-z_]+(\/[A-Z][A-Za-z0-9_-]+)+)$/, 'Zona horaria con nombre, por ejemplo America/Lima')
  .refine(zonaReconocida, 'Zona horaria desconocida');
export type ZonaHoraria = z.infer<typeof ZonaHoraria>;

// Carga de la Operación `perfil.cambiar_zona_horaria` — REQ-ACC-10, REQ-ACC-11 · T-009
export const CambioZonaHorariaCarga = z.strictObject({ zonaHoraria: ZonaHoraria });
export type CambioZonaHorariaCarga = z.infer<typeof CambioZonaHorariaCarga>;

// POST /auth/primer-ingreso — REQ-ACC-04, REQ-ACC-05 · H-ACC-02 · T-005
export const PrimerIngresoSolicitud = z.strictObject({
  contrasenaNueva: z.string().min(12, 'Al menos 12 caracteres').max(200),
  zonaHoraria: ZonaHoraria,
});
export type PrimerIngresoSolicitud = z.infer<typeof PrimerIngresoSolicitud>;
