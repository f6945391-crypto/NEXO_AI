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
