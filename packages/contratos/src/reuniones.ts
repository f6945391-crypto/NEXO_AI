import { z } from 'zod';
import { Fecha, Instante } from './comunes';

// Reuniones (specs/10-reuniones/plan.md §5) · T-132 · CUN-06. Una reunión es de un solo equipo (D-REU-22)
// y pasa por cuatro estados (REQ-CUN06-07). Los horarios llegan con el desfase de la zona de quien convoca.

export const EstadoReunion = z.enum(['pendiente', 'agendada', 'vencida', 'cancelada']);
export type EstadoReunion = z.infer<typeof EstadoReunion>;

// D-REU-21: «por la mañana» de 08:00 a 13:00 y «por la tarde» de 13:00 a 20:00
export const FranjaReunion = z.enum(['manana', 'tarde']);
export type FranjaReunion = z.infer<typeof FranjaReunion>;

export const DURACION_REUNION_MAXIMA = 480;
const Duracion = z.number().int().min(15).max(DURACION_REUNION_MAXIMA);

// D-REU-03: quien no autorizó o no tiene calendario no cuenta en «libres de n»
export const DatosInvitado = z.enum(['con_datos', 'sin_consentimiento', 'sin_calendario']);
export type DatosInvitado = z.infer<typeof DatosInvitado>;

export const InvitadoReunion = z.strictObject({
  perfilId: z.uuid(),
  correo: z.string(),
  // D-REU-18: el perfil no tiene nombre visible; es lo de antes de la arroba
  nombre: z.string(),
  opcional: z.boolean(),
  datos: DatosInvitado,
  // D-REU-11: la dirección a la que llega o llegó la invitación
  direccion: z.string(),
  conGoogle: z.boolean(),
});
export type InvitadoReunion = z.infer<typeof InvitadoReunion>;

export const ReunionResumen = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  equipo: z.strictObject({ id: z.uuid(), nombre: z.string() }),
  estado: EstadoReunion,
  inicio: Instante.nullable(),
  fin: Instante.nullable(),
  duracionMinutos: z.number().int(),
  zonaHoraria: z.string(),
  // Primer y último día en que se busca horario
  rangoDesde: Fecha,
  rangoHasta: Fecha,
  franja: FranjaReunion.nullable(),
  convocante: z.strictObject({ perfilId: z.uuid(), correo: z.string(), nombre: z.string() }),
  soyConvocante: z.boolean(),
  invitados: z.number().int(),
});
export type ReunionResumen = z.infer<typeof ReunionResumen>;

export const ListaReuniones = z.array(ReunionResumen);
export type ListaReuniones = z.infer<typeof ListaReuniones>;

// REQ-CUN06-04: un horario propuesto, calculado en código
export const PropuestaHorario = z.strictObject({
  inicio: Instante,
  fin: Instante,
  libres: z.number().int(),
  de: z.number().int(),
  opcionalesLibres: z.number().int(),
});
export type PropuestaHorario = z.infer<typeof PropuestaHorario>;

// REQ-CUN06-08: quién está libre en cada media hora; nunca títulos ni detalles (P-10)
export const MapaReunion = z.strictObject({
  franjaMinutos: z.number().int(),
  // Los que cuentan en «libres de n»: quien convoca y los invitados con datos
  personasConDatos: z.array(z.uuid()),
  dias: z.array(z.strictObject({ fecha: Fecha, franjas: z.array(z.strictObject({ inicio: Instante, libres: z.array(z.uuid()) })) })),
});
export type MapaReunion = z.infer<typeof MapaReunion>;

export const DetalleReunion = z.strictObject({
  reunion: ReunionResumen,
  // Quien convoca va aparte, en `reunion.convocante`; aquí, su estado de datos
  convocanteDatos: DatosInvitado,
  invitados: z.array(InvitadoReunion),
  // Solo mientras está pendiente
  mapa: MapaReunion.nullable(),
  propuestas: z.array(PropuestaHorario),
  // Con qué se calcularon el mapa y las propuestas (REQ-CUN06-09)
  duracionMinutos: z.number().int(),
  opcionales: z.array(z.uuid()),
});
export type DetalleReunion = z.infer<typeof DetalleReunion>;

// GET /reuniones/:id?duracionMinutos=&opcionales=a,b · REQ-CUN06-09: recalcular sin guardar nada
export const ConsultaDetalleReunion = z.strictObject({
  duracionMinutos: z.coerce.number().int().min(15).max(DURACION_REUNION_MAXIMA).optional(),
  opcionales: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      const ids = v.split(',').map((x) => x.trim()).filter(Boolean);
      if (ids.some((id) => !z.uuid().safeParse(id).success)) {
        ctx.addIssue({ code: 'custom', message: 'Los opcionales no son identificadores válidos.' });
        return z.NEVER;
      }
      return ids;
    }),
});
export type ConsultaDetalleReunion = z.infer<typeof ConsultaDetalleReunion>;

// Cargas de las Operaciones (plan §6)
export const ConvocarReunion = z.strictObject({
  reunionId: z.uuid(),
  inicio: Instante,
  // Los invitados que van como opcionales; sin indicar, los que ya tiene la reunión (REQ-CUN06-06, 09)
  opcionales: z.array(z.uuid()).optional(),
  // T-152 · REQ-CUN06-22: la duración elegida en el detalle o con un rango del mapa; sin indicar, la de la reunión
  duracionMinutos: Duracion.optional(),
});
export type ConvocarReunion = z.infer<typeof ConvocarReunion>;

export const MoverReunion = z.strictObject({ reunionId: z.uuid(), inicio: Instante });
export type MoverReunion = z.infer<typeof MoverReunion>;

export const CancelarReunion = z.strictObject({ reunionId: z.uuid() });
export type CancelarReunion = z.infer<typeof CancelarReunion>;

// Herramientas del asistente (plan §9) · D-REU-23: solo «con quién» es necesario
export const ArgsProponerReunion = z.strictObject({
  equipo: z.string().max(120).optional().describe('Nombre del equipo o proyecto tal como lo dijo la persona'),
  personas: z.array(z.string().max(120)).max(30).optional().describe('Nombres o correos de las personas, tal como los dijo la persona'),
  sin: z.array(z.string().max(120)).max(30).optional().describe('Personas que la persona pidió dejar fuera'),
  opcionales: z.array(z.string().max(120)).max(30).optional().describe('Personas que van solo si pueden'),
  desde: Fecha.optional().describe('Primer día en que buscar, AAAA-MM-DD'),
  hasta: Fecha.optional().describe('Último día en que buscar, AAAA-MM-DD'),
  duracionMinutos: Duracion.optional(),
  franja: FranjaReunion.optional().describe('Solo si la persona dijo por la mañana o por la tarde'),
  tema: z.string().max(120).optional().describe('Tema o título de la reunión, si lo dijo'),
  reunionId: z.uuid().optional().describe('Para buscar de nuevo o mover una reunión que ya existe, de reuniones_listar'),
  reunion: z.string().max(120).optional().describe('Título de una reunión que ya existe, si la persona la nombra para moverla o buscar otro horario'),
});
export type ArgsProponerReunion = z.infer<typeof ArgsProponerReunion>;

export const ArgsListarReuniones = z.strictObject({});
export type ArgsListarReuniones = z.infer<typeof ArgsListarReuniones>;

export const ArgsCancelarReunion = z.strictObject({
  reunionId: z.uuid().optional(),
  reunion: z.string().max(120).optional().describe('Título de la reunión tal como la nombró la persona'),
});
export type ArgsCancelarReunion = z.infer<typeof ArgsCancelarReunion>;

// El turno `reunion`: las propuestas armadas por el código. Elegir una no pasa por el modelo (REQ-CUN06-10)
export const PropuestasDeReunion = z.strictObject({
  reunion: ReunionResumen,
  texto: z.string(),
  propuestas: z.array(PropuestaHorario),
  // Verdadero cuando la reunión ya está agendada y elegir la mueve (REQ-CUN06-14)
  mover: z.boolean(),
});
export type PropuestasDeReunion = z.infer<typeof PropuestasDeReunion>;
