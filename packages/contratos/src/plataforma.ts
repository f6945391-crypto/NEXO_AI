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
  'OPERACION_DESCONOCIDA',
  'OPERACION_NO_ENCONTRADA',
  'OPERACION_NO_CONFIRMABLE',
  'OPERACION_EN_CURSO',
  'PERMISO_GOOGLE_FALTANTE',
  'PERMISO_GOOGLE_RETIRADO',
  'GOOGLE_NO_DISPONIBLE',
  'EVENTO_NO_ENCONTRADO',
  'EVENTO_NO_MODIFICABLE',
  'DATOS_FALTANTES',
  'ORIGEN_NO_PERMITIDO',
]);
export type CodigoError = z.infer<typeof CodigoError>;

export const ErrorApi = z.strictObject({
  codigo: CodigoError,
  mensaje: z.string(),
  // Solo con DATOS_FALTANTES: qué campos de la carga faltan (REQ-CUN01-07)
  campos: z.array(z.string()).optional(),
});
export type ErrorApi = z.infer<typeof ErrorApi>;
