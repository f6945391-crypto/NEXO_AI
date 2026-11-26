import { z } from 'zod';

// Permisos de Google (REQ-ACC-06, REQ-ACC-07, REQ-ACC-14) · T-007.
// Exactamente dos, y nunca lectura del buzón (P-08, R-31). Una prueba recorre todo el código buscando
// alcances de lectura de Gmail.

export const ClaveAlcanceGoogle = z.enum(['calendario', 'correo']);
export type ClaveAlcanceGoogle = z.infer<typeof ClaveAlcanceGoogle>;

export const ALCANCES_GOOGLE: Record<ClaveAlcanceGoogle, { alcance: string; nombre: string; paraQue: string }> = {
  calendario: {
    alcance: 'https://www.googleapis.com/auth/calendar.events',
    nombre: 'Tu calendario',
    paraQue:
      'Ver y editar los eventos de tu calendario de Google, para mostrarte tu agenda y registrar los compromisos que confirmes.',
  },
  correo: {
    alcance: 'https://www.googleapis.com/auth/gmail.send',
    nombre: 'Enviar correo',
    paraQue: 'Enviar en tu nombre los correos que prepares con el asistente, siempre después de que los confirmes. Nunca leemos tu buzón.',
  },
};

export const EstadoPermisoGoogle = z.enum(['no_concedido', 'concedido', 'revocado', 'caducado']);
export type EstadoPermisoGoogle = z.infer<typeof EstadoPermisoGoogle>;

// GET /integraciones/google/permisos
export const PermisoGoogle = z.strictObject({
  clave: ClaveAlcanceGoogle,
  nombre: z.string(),
  paraQue: z.string(),
  estado: EstadoPermisoGoogle,
});
export type PermisoGoogle = z.infer<typeof PermisoGoogle>;

// POST /integraciones/google/enlace: un enlace firmado y de corta vida hacia el consentimiento de Google.
export const EnlaceGoogleSolicitud = z.strictObject({
  alcance: ClaveAlcanceGoogle,
  cliente: z.enum(['web', 'movil']).default('web'),
});
export type EnlaceGoogleSolicitud = z.infer<typeof EnlaceGoogleSolicitud>;

export const EnlaceGoogleRespuesta = z.strictObject({ url: z.url() });
export type EnlaceGoogleRespuesta = z.infer<typeof EnlaceGoogleRespuesta>;
