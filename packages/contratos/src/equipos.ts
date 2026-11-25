import { z } from 'zod';
import { ZonaHoraria } from './acceso';

// CUN-05 - T-105. Contratos compartidos de disponibilidad.

const InstanteEquipo = z.iso.datetime({ offset: true })
  .refine(
    (valor) => /T\d{2}:\d{2}:\d{2}/.test(valor),
    'La fecha debe incluir segundos',
  );

export const BandaHorariaEquipo = z.enum([
  'normal',
  'extendida',
  'fueraDeBanda',
]);
export type BandaHorariaEquipo =
  z.infer<typeof BandaHorariaEquipo>;

export const RolEnEquipo = z.enum([
  'responsable',
  'integrante',
]);
export type RolEnEquipo = z.infer<typeof RolEnEquipo>;

export const EstadoConsentimientoEquipo = z.enum([
  'pendiente',
  'concedida',
  'rechazada',
  'revocada',
]);
export type EstadoConsentimientoEquipo =
  z.infer<typeof EstadoConsentimientoEquipo>;

export const CambioConsentimientoEquipo = z.strictObject({
  estado: z.enum([
    'concedida',
    'rechazada',
    'revocada',
  ]),
});
export type CambioConsentimientoEquipo =
  z.infer<typeof CambioConsentimientoEquipo>;

export const MotivoSinDatosEquipo = z.enum([
  'sin_consentimiento',
  'calendario_no_disponible',
  'autorizacion_no_vigente',
]);
export type MotivoSinDatosEquipo =
  z.infer<typeof MotivoSinDatosEquipo>;

export const SeleccionParticipantesEquipo = z
  .array(z.string().refine(
    (id) => id.trim().length > 0,
    'Identificador vacio',
  ))
  .min(1)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    'No se permiten participantes duplicados',
  );

export type SeleccionParticipantesEquipo =
  z.infer<typeof SeleccionParticipantesEquipo>;

// GET /equipos/:equipoId/disponibilidad
export const ConsultaDisponibilidadEquipo = z
  .strictObject({
    desde: InstanteEquipo.optional(),
    hasta: InstanteEquipo.optional(),

    duracionMinutos: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(
        z.number()
          .int()
          .positive()
          .max(Number.MAX_SAFE_INTEGER),
      )
      .optional(),

    bandaHoraria: BandaHorariaEquipo.default('normal'),

    participantes: z
      .string()
      .transform((valor) => valor.split(','))
      .pipe(SeleccionParticipantesEquipo)
      .optional(),
  })
  .refine(
    ({ desde, hasta }) =>
      (desde === undefined) === (hasta === undefined),
    'Indicar ambas fechas o ninguna',
  )
  .refine(
    ({ desde, hasta }) =>
      desde === undefined ||
      hasta === undefined ||
      Date.parse(desde) < Date.parse(hasta),
    'El rango de fechas no es valido',
  );

export type ConsultaDisponibilidadEquipo =
  z.infer<typeof ConsultaDisponibilidadEquipo>;

export type ConsultaDisponibilidadEquipoEntrada =
  z.input<typeof ConsultaDisponibilidadEquipo>;

export const IntervaloDisponibilidadEquipo = z
  .strictObject({
    inicio: InstanteEquipo,
    fin: InstanteEquipo,
    duracionMinutos: z.number().positive(),
  })
  .refine(
    ({ inicio, fin }) =>
      Date.parse(inicio) < Date.parse(fin),
    'El fin debe ser posterior al inicio',
  );

export type IntervaloDisponibilidadEquipo =
  z.infer<typeof IntervaloDisponibilidadEquipo>;

export const ParticipanteSinDatosEquipo = z.strictObject({
  perfilId: z.uuid(),
  motivo: MotivoSinDatosEquipo,
});

export type ParticipanteSinDatosEquipo =
  z.infer<typeof ParticipanteSinDatosEquipo>;

// CUN-05 - Disponibilidad individual para la rejilla.
export const DisponibilidadIndividualEquipo =
  z.discriminatedUnion('estado', [
    z.strictObject({
      perfilId: z.uuid(),
      estado: z.literal('consultado'),
      intervalosOcupados: z.array(
        IntervaloDisponibilidadEquipo,
      ),
      intervalosLibres: z.array(
        IntervaloDisponibilidadEquipo,
      ),
    }),
    z.strictObject({
      perfilId: z.uuid(),
      estado: z.literal('sin_datos'),
      motivo: MotivoSinDatosEquipo,
      intervalosOcupados: z.tuple([]),
      intervalosLibres: z.tuple([]),
    }),
  ]);

export type DisponibilidadIndividualEquipo =
  z.infer<typeof DisponibilidadIndividualEquipo>;

// Comprobar que los intervalos cubren exactamente el rango.
function cubreRangoIndividual(
  participante: DisponibilidadIndividualEquipo,
  desde: string,
  hasta: string,
): boolean {
  if (participante.estado === 'sin_datos') {
    return true;
  }

  const inicioRango = Date.parse(desde);
  const finRango = Date.parse(hasta);

  const intervalos = [
    ...participante.intervalosOcupados,
    ...participante.intervalosLibres,
  ].map((intervalo) => ({
    inicio: Date.parse(intervalo.inicio),
    fin: Date.parse(intervalo.fin),
    duracionMinutos: intervalo.duracionMinutos,
  })).sort((a, b) => a.inicio - b.inicio);

  let cursor = inicioRango;

  for (const intervalo of intervalos) {
    if (
      intervalo.inicio !== cursor ||
      intervalo.fin <= intervalo.inicio ||
      intervalo.fin > finRango ||
      intervalo.duracionMinutos !==
        (intervalo.fin - intervalo.inicio) / 60_000
    ) {
      return false;
    }

    cursor = intervalo.fin;
  }

  return cursor === finRango;
}

export const EstadoDisponibilidadEquipo = z.enum([
  'disponible',
  'sin_intervalos_comunes',
  'duracion_insuficiente',
  'sin_datos',
]);

export type EstadoDisponibilidadEquipo =
  z.infer<typeof EstadoDisponibilidadEquipo>;

export const DisponibilidadEquipoRespuesta = z
  .strictObject({
    equipoId: z.uuid(),
    desde: InstanteEquipo,
    hasta: InstanteEquipo,
    disponibilidadCompleta: z.boolean(),
    estadoDisponibilidad: EstadoDisponibilidadEquipo,
    participantesConsultados: z.number().int().nonnegative(),
    zonaHoraria: ZonaHoraria,
    participantesSinDatos: z.array(z.uuid()),
    detalleParticipantesSinDatos:
      z.array(ParticipanteSinDatosEquipo),
    disponibilidadIndividual:
      z.array(DisponibilidadIndividualEquipo),
    intervalosComunes: z.array(IntervaloDisponibilidadEquipo),
    intervalos: z.array(IntervaloDisponibilidadEquipo),
    advertencia: z.string().nullable(),
  })
  .refine(
    ({ desde, hasta }) =>
      Date.parse(desde) < Date.parse(hasta),
    'El rango de respuesta no es valido',
  )
  .refine(
    (respuesta) => {
      const {
        estadoDisponibilidad,
        participantesConsultados,
        disponibilidadCompleta,
        intervalosComunes,
        intervalos,
      } = respuesta;

      switch (estadoDisponibilidad) {
        case 'sin_datos':
          return (
            participantesConsultados === 0 &&
            !disponibilidadCompleta &&
            intervalosComunes.length === 0 &&
            intervalos.length === 0
          );

        case 'sin_intervalos_comunes':
          return (
            participantesConsultados > 0 &&
            intervalosComunes.length === 0 &&
            intervalos.length === 0
          );

        case 'duracion_insuficiente':
          return (
            participantesConsultados > 0 &&
            intervalosComunes.length > 0 &&
            intervalos.length === 0
          );

        case 'disponible':
          return (
            participantesConsultados > 0 &&
            intervalosComunes.length > 0 &&
            intervalos.length > 0
          );
      }
    },
    {
      message: 'Estado de disponibilidad incoherente',
      path: ['estadoDisponibilidad'],
    },
  )
  .refine(
    ({ intervalos, intervalosComunes }) =>
      intervalos.every((intervalo) =>
        intervalosComunes.some(
          (comun) =>
            Date.parse(comun.inicio) ===
              Date.parse(intervalo.inicio) &&
            Date.parse(comun.fin) ===
              Date.parse(intervalo.fin) &&
            comun.duracionMinutos ===
              intervalo.duracionMinutos,
        ),
      ),
    {
      message: 'Los intervalos validos deben ser comunes',
      path: ['intervalos'],
    },
  )
  .refine(
    (respuesta) => {
      const individuales =
        respuesta.disponibilidadIndividual;

      const ids = individuales.map(
        (participante) => participante.perfilId,
      );

      if (new Set(ids).size !== ids.length) {
        return false;
      }

      const consultados = individuales.filter(
        (participante) =>
          participante.estado === 'consultado',
      );

      const sinDatos = individuales.filter(
        (participante) =>
          participante.estado === 'sin_datos',
      );

      if (
        consultados.length !==
          respuesta.participantesConsultados ||
        sinDatos.length !==
          respuesta.participantesSinDatos.length ||
        sinDatos.length !==
          respuesta.detalleParticipantesSinDatos.length
      ) {
        return false;
      }

      const idsSinDatos = new Set(
        respuesta.participantesSinDatos,
      );

      const motivos = new Map(
        respuesta.detalleParticipantesSinDatos.map(
          (participante) => [
            participante.perfilId,
            participante.motivo,
          ],
        ),
      );

      if (
        idsSinDatos.size !== sinDatos.length ||
        motivos.size !== sinDatos.length
      ) {
        return false;
      }

      if (
        respuesta.disponibilidadCompleta !==
          (individuales.length > 0 &&
            sinDatos.length === 0)
      ) {
        return false;
      }

      return sinDatos.every(
        (participante) =>
          idsSinDatos.has(participante.perfilId) &&
          motivos.get(participante.perfilId) ===
            participante.motivo,
      );
    },
    {
      message: 'Participantes individuales incoherentes',
      path: ['disponibilidadIndividual'],
    },
  )
  .refine(
    (respuesta) =>
      respuesta.disponibilidadIndividual.every(
        (participante) =>
          cubreRangoIndividual(
            participante,
            respuesta.desde,
            respuesta.hasta,
          ),
      ),
    {
      message: 'Intervalos individuales incoherentes',
      path: ['disponibilidadIndividual'],
    },
  );

export type DisponibilidadEquipoRespuesta =
  z.infer<typeof DisponibilidadEquipoRespuesta>;


// GET /equipos
export const EquipoResumen = z.strictObject({
  id: z.uuid(),
  nombre: z.string(),
  creadoEn: InstanteEquipo,
});

export type EquipoResumen =
  z.infer<typeof EquipoResumen>;

export const MembresiaEquipoRespuesta = z.strictObject({
  equipoId: z.uuid(),
  rolEnEquipo: RolEnEquipo,
  equipo: EquipoResumen,
});

export type MembresiaEquipoRespuesta =
  z.infer<typeof MembresiaEquipoRespuesta>;

export const MisEquiposRespuesta =
  z.array(MembresiaEquipoRespuesta);

export type MisEquiposRespuesta =
  z.infer<typeof MisEquiposRespuesta>;

// GET /equipos/:equipoId/integrantes
export const PerfilIntegranteEquipo = z.strictObject({
  id: z.uuid(),
  correo: z.email(),
  zonaHoraria: ZonaHoraria.nullable(),
});

export type PerfilIntegranteEquipo =
  z.infer<typeof PerfilIntegranteEquipo>;

export const IntegranteEquipo = z.strictObject({
  perfilId: z.uuid(),
  rolEnEquipo: RolEnEquipo,
  estadoConsentimiento: EstadoConsentimientoEquipo,
  perfil: PerfilIntegranteEquipo,
});

export type IntegranteEquipo =
  z.infer<typeof IntegranteEquipo>;

export const IntegrantesEquipoRespuesta =
  z.array(IntegranteEquipo);

export type IntegrantesEquipoRespuesta =
  z.infer<typeof IntegrantesEquipoRespuesta>;

// Resultado de la Operacion equipo.cambiar_consentimiento
export const CambioConsentimientoEquipoRespuesta =
  z.strictObject({
    equipoId: z.uuid(),
    perfilId: z.uuid(),
    estadoConsentimiento: EstadoConsentimientoEquipo,
    consentimientoCambiadoEn: InstanteEquipo,
  });

export type CambioConsentimientoEquipoRespuesta =
  z.infer<typeof CambioConsentimientoEquipoRespuesta>;

// T-103 y T-112: consentimiento individual mediante Operaciones.
// La identidad del integrante procede del contexto autenticado.
export const CambiarConsentimientoEquipoCarga = z.strictObject({
  equipoId: z.uuid(),
  estado: z.enum(['concedida', 'rechazada', 'revocada']),
});

export type CambiarConsentimientoEquipoCarga = z.infer<
  typeof CambiarConsentimientoEquipoCarga
>;

// Datos internos completados por el servidor al proponer.
export const CambiarConsentimientoEquipoInterna =
  CambiarConsentimientoEquipoCarga.extend({
    referencia: z.strictObject({
      membresiaId: z.uuid(),
      estadoAnterior: EstadoConsentimientoEquipo,
      cambiadoEn: InstanteEquipo.nullable(),
    }).optional(),
  });

export type CambiarConsentimientoEquipoInterna = z.infer<
  typeof CambiarConsentimientoEquipoInterna
>;


// CUN-05: herramientas de consulta del agente.
export const ArgsListarEquipos = z.strictObject({});

export const ArgsConsultarDisponibilidadEquipo = z.strictObject({
  equipoId: z.uuid(),
  fecha: z.iso.date().optional(),
  duracionMinutos: z.number().int().positive()
    .max(Number.MAX_SAFE_INTEGER).optional(),
  bandaHoraria: BandaHorariaEquipo.default('normal'),
  participantes: z.array(z.uuid()).min(1)
    .refine(ids => new Set(ids).size === ids.length)
    .optional(),
});

export type ArgsConsultarDisponibilidadEquipo =
  z.infer<typeof ArgsConsultarDisponibilidadEquipo>;
