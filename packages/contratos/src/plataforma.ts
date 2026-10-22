import { z } from 'zod';

// GET /salud — T-001
export const SaludRespuesta = z.strictObject({
  estado: z.literal('ok'),
});

export type SaludRespuesta = z.infer<typeof SaludRespuesta>;

// Todo error de la API tiene esta forma. `codigo` es estable y lo usan los clientes; `mensaje` es para personas.
export const CodigoError = z.enum([
  'SOLICITUD_INVALIDA',
  'NO_AUTENTICADO',
  'CREDENCIALES_INVALIDAS',
  'SESION_INVALIDA',
  'ROL_NO_PERMITIDO',
  'DEMASIADOS_INTENTOS',
  'PRIMER_INGRESO_PENDIENTE',
  'PRIMER_INGRESO_YA_COMPLETADO',
  'CONTRASENA_NO_VALIDA',
]);
export type CodigoError = z.infer<typeof CodigoError>;

export const ErrorApi = z.strictObject({
  codigo: CodigoError,
  mensaje: z.string(),
});
export type ErrorApi = z.infer<typeof ErrorApi>;
