import {
  DisponibilidadEquipoRespuesta,
} from '@nexoai/contratos';

export function respuestaSinIntervalos(
  equipoId: string,
  desde: Date,
  hasta: Date,
  participantes: string[],
) {
  const intervalo = {
    inicio: desde.toISOString(),
    fin: hasta.toISOString(),
    duracionMinutos:
      (hasta.getTime() - desde.getTime()) / 60_000,
  };

  return DisponibilidadEquipoRespuesta.parse({
    equipoId,
    desde: intervalo.inicio,
    hasta: intervalo.fin,
    zonaHoraria: 'America/Lima',
    disponibilidadCompleta: true,
    estadoDisponibilidad: 'sin_intervalos_comunes',
    participantesConsultados: participantes.length,
    participantesSinDatos: [],
    detalleParticipantesSinDatos: [],
    disponibilidadIndividual: participantes.map(
      (perfilId) => ({
        perfilId,
        estado: 'consultado',
        intervalosOcupados: [intervalo],
        intervalosLibres: [],
      }),
    ),
    intervalosComunes: [],
    intervalos: [],
    advertencia: null,
  });
}
