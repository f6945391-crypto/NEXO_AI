import { z } from 'zod';
import { ZonaHoraria } from './acceso';

// Agenda (specs/02-agenda/plan.md §5) · T-015. Toda hora va en ISO 8601 con el desfase de la zona del
// evento, y la zona IANA aparte, para que el cliente pueda mostrar en qué zona está (P-05, REQ-CUN01-10).

const DIA_MS = 24 * 3600_000;
// La réplica cubre de 30 días atrás a 365 adelante: una consulta no necesita más que eso.
export const RANGO_MAXIMO_DIAS = 366;

const Instante = z.iso.datetime({ offset: true });

// GET /agenda/eventos?desde=&hasta=
export const ConsultaAgenda = z
  .strictObject({ desde: Instante, hasta: Instante })
  .refine(({ desde, hasta }) => Date.parse(desde) < Date.parse(hasta), 'desde tiene que ser anterior a hasta')
  .refine(({ desde, hasta }) => Date.parse(hasta) - Date.parse(desde) <= RANGO_MAXIMO_DIAS * DIA_MS, `como mucho ${RANGO_MAXIMO_DIAS} días`);
export type ConsultaAgenda = z.infer<typeof ConsultaAgenda>;

export const EstadoEvento = z.enum(['confirmado', 'cancelado']);
export type EstadoEvento = z.infer<typeof EstadoEvento>;

// EN-02 Evento de Agenda
export const EventoAgenda = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  inicio: Instante,
  fin: Instante,
  zonaHoraria: z.string().min(1),
  // H-AG-03: se muestran, pero no cuentan como conflicto
  todoElDia: z.boolean(),
  // H-AG-05: si es falso, la persona fue invitada y no puede cambiarlo ni cancelarlo desde aquí
  esOrganizador: z.boolean(),
  serieId: z.string().nullable(),
  // Lo cancelado en Google queda a la vista como tal (R-25)
  estado: EstadoEvento,
});
export type EventoAgenda = z.infer<typeof EventoAgenda>;

// Carga de la Operación `agenda.registrar` (REQ-CUN01-01, 07) · T-017. En la fase 2 la rellena el agente
// con lo que extrae de la solicitud. Sin `fin`, el código lo calcula con la duración por defecto
// (H-AG-01); sin `zonaHoraria`, se usa la del perfil. La propuesta guarda la carga ya completada, que
// es exactamente lo que se registra al confirmar (REQ-CUN01-04).
export const PropuestaEvento = z
  .strictObject({
    titulo: z.string().trim().min(1).max(200),
    inicio: Instante,
    fin: Instante.optional(),
    zonaHoraria: ZonaHoraria.optional(),
  })
  .refine(({ inicio, fin }) => !fin || Date.parse(inicio) < Date.parse(fin), { message: 'el fin tiene que ser posterior al inicio', path: ['fin'] });
export type PropuestaEvento = z.infer<typeof PropuestaEvento>;

// Carga de la Operación `agenda.modificar` (REQ-CUN01-06) · T-019. Solo lo que cambia; sin `fin`, un
// inicio nuevo conserva la duración. La propuesta guarda la carga completada, con la zona del evento.
export const ModificacionEvento = z
  .strictObject({
    eventoId: z.uuid(),
    titulo: z.string().trim().min(1).max(200).optional(),
    inicio: Instante.optional(),
    fin: Instante.optional(),
    zonaHoraria: ZonaHoraria.optional(),
  })
  .refine(({ titulo, inicio, fin }) => titulo !== undefined || inicio !== undefined || fin !== undefined, 'no dice qué cambiar');
export type ModificacionEvento = z.infer<typeof ModificacionEvento>;

// Carga de la Operación `agenda.cancelar` (REQ-CUN01-06, DP-01) · T-019. Es también un control directo.
export const CancelacionEvento = z.strictObject({ eventoId: z.uuid() });
export type CancelacionEvento = z.infer<typeof CancelacionEvento>;
