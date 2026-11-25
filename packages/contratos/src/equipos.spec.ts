import { describe, expect, it } from 'vitest';
import {
  ConsultaDisponibilidadEquipo,
  SeleccionParticipantesEquipo,
  DisponibilidadEquipoRespuesta,
  DisponibilidadIndividualEquipo,
  IntervaloDisponibilidadEquipo,
  IntegrantesEquipoRespuesta,
  MisEquiposRespuesta,
  CambioConsentimientoEquipo,
  CambioConsentimientoEquipoRespuesta,
  CambiarConsentimientoEquipoCarga,
  CambiarConsentimientoEquipoInterna,
} from './equipos';

const equipoId = '11111111-1111-4111-8111-111111111111';
const perfilA = '22222222-2222-4222-8222-222222222222';
const perfilB = '33333333-3333-4333-8333-333333333333';

const desde = '2026-11-12T08:00:00-05:00';
const hasta = '2026-11-12T12:00:00-05:00';

const intervalo = {
  inicio: desde,
  fin: hasta,
  duracionMinutos: 240,
};

const consultado = (perfilId: string) => ({
  perfilId,
  estado: 'consultado' as const,
  intervalosOcupados: [],
  intervalosLibres: [intervalo],
});

const sinDatos = (
  perfilId: string,
  motivo = 'sin_consentimiento',
) => ({
  perfilId,
  estado: 'sin_datos' as const,
  motivo,
  intervalosOcupados: [],
  intervalosLibres: [],
});

const respuestaCompleta = {
  equipoId,
  desde,
  hasta,
  disponibilidadCompleta: true,
  estadoDisponibilidad: 'disponible',
  participantesConsultados: 2,
  zonaHoraria: 'America/Lima',
  participantesSinDatos: [],
  detalleParticipantesSinDatos: [],
  disponibilidadIndividual: [
    consultado(perfilA),
    consultado(perfilB),
  ],
  intervalosComunes: [intervalo],
  intervalos: [intervalo],
  advertencia: null,
};

const integrante = {
  perfilId: perfilA,
  rolEnEquipo: 'responsable',
  estadoConsentimiento: 'concedida',
  perfil: {
    id: perfilA,
    correo: 'gerente@nexoai.test',
    zonaHoraria: 'America/Lima',
  },
};

describe('CUN-05 - Contratos compartidos de equipos', () => {
  describe('Consulta de disponibilidad', () => {
    it('acepta una consulta valida y transforma sus parametros', () => {
      const consulta = ConsultaDisponibilidadEquipo.parse({
        desde,
        hasta,
        duracionMinutos: '30',
        participantes: `${perfilA},${perfilB}`,
        bandaHoraria: 'extendida',
      });

      expect(consulta.duracionMinutos).toBe(30);
      expect(consulta.participantes).toEqual([perfilA, perfilB]);
      expect(consulta.bandaHoraria).toBe('extendida');
    });

    it('permite omitir fechas y aplica la banda normal', () => {
      expect(ConsultaDisponibilidadEquipo.parse({})).toEqual({
        bandaHoraria: 'normal',
      });
    });

    it('rechaza una sola fecha', () => {
      expect(
        ConsultaDisponibilidadEquipo.safeParse({ desde }).success,
      ).toBe(false);
    });

    it('rechaza un rango invertido', () => {
      expect(
        ConsultaDisponibilidadEquipo.safeParse({
          desde: hasta,
          hasta: desde,
        }).success,
      ).toBe(false);
    });

    it('rechaza fechas iguales', () => {
      expect(
        ConsultaDisponibilidadEquipo.safeParse({
          desde,
          hasta: desde,
        }).success,
      ).toBe(false);
    });

    it('rechaza fechas sin zona horaria', () => {
      expect(
        ConsultaDisponibilidadEquipo.safeParse({
          desde: '2026-11-12T08:00:00',
          hasta,
        }).success,
      ).toBe(false);
    });

    it.each(['0', '-1', '1.5', 'abc', '9007199254740992'])(
      'rechaza la duracion invalida %s',
      (duracionMinutos) => {
        expect(
          ConsultaDisponibilidadEquipo.safeParse({
            duracionMinutos,
          }).success,
        ).toBe(false);
      },
    );

    it.each(['normal', 'extendida', 'fueraDeBanda'])(
      'acepta la banda %s',
      (bandaHoraria) => {
        expect(
          ConsultaDisponibilidadEquipo.safeParse({
            bandaHoraria,
          }).success,
        ).toBe(true);
      },
    );

    it('rechaza bandas desconocidas', () => {
      expect(
        ConsultaDisponibilidadEquipo.safeParse({
          bandaHoraria: 'desconocida',
        }).success,
      ).toBe(false);
    });

    it('rechaza parametros no contemplados', () => {
      expect(
        ConsultaDisponibilidadEquipo.safeParse({
          organizacionId: equipoId,
        }).success,
      ).toBe(false);
    });
  });

  describe('Seleccion de participantes', () => {
    it('acepta participantes distintos', () => {
      expect(
        SeleccionParticipantesEquipo.safeParse([
          perfilA,
          perfilB,
        ]).success,
      ).toBe(true);
    });

    it('rechaza una seleccion vacia', () => {
      expect(
        SeleccionParticipantesEquipo.safeParse([]).success,
      ).toBe(false);
    });

    it('rechaza participantes duplicados', () => {
      expect(
        SeleccionParticipantesEquipo.safeParse([
          perfilA,
          perfilA,
        ]).success,
      ).toBe(false);
    });

    it('rechaza identificadores en blanco', () => {
      expect(
        SeleccionParticipantesEquipo.safeParse([' ']).success,
      ).toBe(false);
    });
  });

  describe('Intervalos de disponibilidad', () => {
    it('acepta un intervalo valido', () => {
      expect(
        IntervaloDisponibilidadEquipo.safeParse(intervalo).success,
      ).toBe(true);
    });

    it('rechaza intervalos invertidos', () => {
      expect(
        IntervaloDisponibilidadEquipo.safeParse({
          ...intervalo,
          inicio: hasta,
          fin: desde,
        }).success,
      ).toBe(false);
    });

    it('rechaza duraciones iguales a cero', () => {
      expect(
        IntervaloDisponibilidadEquipo.safeParse({
          ...intervalo,
          duracionMinutos: 0,
        }).success,
      ).toBe(false);
    });
  });

  describe('Respuesta de disponibilidad', () => {
    it('acepta disponibilidad completa', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse(
          respuestaCompleta,
        ).success,
      ).toBe(true);
    });

    it('acepta disponibilidad parcial', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadCompleta: false,
          participantesConsultados: 1,
          disponibilidadIndividual: [
            consultado(perfilA),
            sinDatos(perfilB),
          ],
          participantesSinDatos: [perfilB],
          detalleParticipantesSinDatos: [{
            perfilId: perfilB,
            motivo: 'sin_consentimiento',
          }],
          advertencia: 'Disponibilidad parcial.',
        }).success,
      ).toBe(true);
    });

    it('acepta una respuesta sin calendarios consultados', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadCompleta: false,
          estadoDisponibilidad: 'sin_datos',
          participantesConsultados: 0,
          disponibilidadIndividual: [
            sinDatos(perfilA),
            sinDatos(perfilB, 'calendario_no_disponible'),
          ],
          participantesSinDatos: [perfilA, perfilB],
          detalleParticipantesSinDatos: [
            {
              perfilId: perfilA,
              motivo: 'sin_consentimiento',
            },
            {
              perfilId: perfilB,
              motivo: 'calendario_no_disponible',
            },
          ],
          intervalosComunes: [],
          intervalos: [],
          advertencia: 'No hay informacion suficiente.',
        }).success,
      ).toBe(true);
    });

    it('rechaza una zona horaria invalida', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          zonaHoraria: 'Zona/Inexistente',
        }).success,
      ).toBe(false);
    });

    it('rechaza cantidades negativas de participantes', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          participantesConsultados: -1,
        }).success,
      ).toBe(false);
    });

    it('rechaza motivos desconocidos de falta de datos', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          detalleParticipantesSinDatos: [{
            perfilId: perfilB,
            motivo: 'desconocido',
          }],
        }).success,
      ).toBe(false);
    });

    it('rechaza campos privados no contemplados', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          eventosPrivados: [],
        }).success,
      ).toBe(false);
    });
  });

  describe('Disponibilidad individual', () => {
    const primeraMitad = {
      inicio: desde,
      fin: '2026-11-12T10:00:00-05:00',
      duracionMinutos: 120,
    };

    const segundaMitad = {
      inicio: primeraMitad.fin,
      fin: hasta,
      duracionMinutos: 120,
    };

    it('acepta un calendario consultado', () => {
      expect(
        DisponibilidadIndividualEquipo.safeParse(
          consultado(perfilA),
        ).success,
      ).toBe(true);
    });

    it('acepta un participante sin informacion', () => {
      expect(
        DisponibilidadIndividualEquipo.safeParse(
          sinDatos(perfilA),
        ).success,
      ).toBe(true);
    });

    it('acepta intervalos libres y ocupados complementarios', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: [
            {
              ...consultado(perfilA),
              intervalosOcupados: [primeraMitad],
              intervalosLibres: [segundaMitad],
            },
            consultado(perfilB),
          ],
          intervalosComunes: [segundaMitad],
          intervalos: [segundaMitad],
        }).success,
      ).toBe(true);
    });

    it.each([
      'intervalosLibres',
      'intervalosOcupados',
    ])('rechaza %s sin autorizacion', (campo) => {
      expect(
        DisponibilidadIndividualEquipo.safeParse({
          ...sinDatos(perfilA),
          [campo]: [intervalo],
        }).success,
      ).toBe(false);
    });

    it('rechaza participantes duplicados', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: [
            consultado(perfilA),
            consultado(perfilA),
          ],
        }).success,
      ).toBe(false);
    });

    it('rechaza cantidades inconsistentes', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          participantesConsultados: 1,
        }).success,
      ).toBe(false);
    });

    it('rechaza disponibilidad completa incoherente', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadCompleta: false,
        }).success,
      ).toBe(false);
    });

    it('rechaza intervalos superpuestos', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: [
            {
              ...consultado(perfilA),
              intervalosOcupados: [primeraMitad],
              intervalosLibres: [intervalo],
            },
            consultado(perfilB),
          ],
        }).success,
      ).toBe(false);
    });

    it('rechaza huecos dentro del rango', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: [
            {
              ...consultado(perfilA),
              intervalosLibres: [primeraMitad],
            },
            consultado(perfilB),
          ],
        }).success,
      ).toBe(false);
    });

    it('rechaza intervalos fuera del rango', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: [
            {
              ...consultado(perfilA),
              intervalosLibres: [{
                ...intervalo,
                inicio: '2026-11-12T07:00:00-05:00',
                duracionMinutos: 300,
              }],
            },
            consultado(perfilB),
          ],
        }).success,
      ).toBe(false);
    });

    it('rechaza duraciones que no corresponden al intervalo', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: [
            {
              ...consultado(perfilA),
              intervalosLibres: [{
                ...intervalo,
                duracionMinutos: 30,
              }],
            },
            consultado(perfilB),
          ],
        }).success,
      ).toBe(false);
    });

    it('rechaza un calendario consultado sin cobertura', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: [
            {
              ...consultado(perfilA),
              intervalosLibres: [],
            },
            consultado(perfilB),
          ],
        }).success,
      ).toBe(false);
    });

    it.each([
      'titulo',
      'descripcion',
      'ubicacion',
    ])('rechaza el campo privado %s', (campo) => {
      expect(
        DisponibilidadIndividualEquipo.safeParse({
          ...consultado(perfilA),
          intervalosLibres: [],
          intervalosOcupados: [{
            ...intervalo,
            [campo]: 'Informacion privada ficticia',
          }],
        }).success,
      ).toBe(false);
    });

    it('rechaza estados individuales desconocidos', () => {
      expect(
        DisponibilidadIndividualEquipo.safeParse({
          ...consultado(perfilA),
          estado: 'desconocido',
        }).success,
      ).toBe(false);
    });

    it('rechaza una respuesta sin disponibilidad individual', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: undefined,
        }).success,
      ).toBe(false);
    });
  });

  describe('Estados de disponibilidad', () => {
    it('acepta ausencia de intervalos comunes', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadIndividual: [
            consultado(perfilA),
            {
              ...consultado(perfilB),
              intervalosOcupados: [intervalo],
              intervalosLibres: [],
            },
          ],
          estadoDisponibilidad: 'sin_intervalos_comunes',
          intervalosComunes: [],
          intervalos: [],
        }).success,
      ).toBe(true);
    });

    it('acepta duracion insuficiente', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          estadoDisponibilidad: 'duracion_insuficiente',
          intervalos: [],
        }).success,
      ).toBe(true);
    });

    it('acepta duracion insuficiente con datos parciales', () => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          disponibilidadCompleta: false,
          estadoDisponibilidad: 'duracion_insuficiente',
          participantesConsultados: 1,
          disponibilidadIndividual: [
            consultado(perfilA),
            sinDatos(perfilB),
          ],
          participantesSinDatos: [perfilB],
          detalleParticipantesSinDatos: [{
            perfilId: perfilB,
            motivo: 'sin_consentimiento',
          }],
          intervalos: [],
          advertencia: 'Disponibilidad parcial.',
        }).success,
      ).toBe(true);
    });

    it.each([
      {
        caso: 'estado desconocido',
        cambios: { estadoDisponibilidad: 'desconocido' },
      },
      {
        caso: 'estado disponible sin intervalos validos',
        cambios: { intervalos: [] },
      },
      {
        caso: 'estado disponible sin calendarios',
        cambios: { participantesConsultados: 0 },
      },
      {
        caso: 'estado disponible sin intervalos comunes',
        cambios: { intervalosComunes: [] },
      },
      {
        caso: 'ausencia de intervalos con horarios comunes',
        cambios: {
          estadoDisponibilidad: 'sin_intervalos_comunes',
          intervalos: [],
        },
      },
      {
        caso: 'ausencia de intervalos sin calendarios',
        cambios: {
          estadoDisponibilidad: 'sin_intervalos_comunes',
          participantesConsultados: 0,
          intervalosComunes: [],
          intervalos: [],
        },
      },
      {
        caso: 'duracion insuficiente sin horarios comunes',
        cambios: {
          estadoDisponibilidad: 'duracion_insuficiente',
          intervalosComunes: [],
          intervalos: [],
        },
      },
      {
        caso: 'duracion insuficiente con horarios validos',
        cambios: {
          estadoDisponibilidad: 'duracion_insuficiente',
        },
      },
      {
        caso: 'estado sin datos con calendarios consultados',
        cambios: {
          estadoDisponibilidad: 'sin_datos',
          disponibilidadCompleta: false,
          intervalosComunes: [],
          intervalos: [],
        },
      },
      {
        caso: 'estado sin datos con disponibilidad completa',
        cambios: {
          estadoDisponibilidad: 'sin_datos',
          participantesConsultados: 0,
          intervalosComunes: [],
          intervalos: [],
        },
      },
      {
        caso: 'intervalo valido ajeno a los comunes',
        cambios: {
          intervalos: [{
            inicio: desde,
            fin: '2026-11-12T09:00:00-05:00',
            duracionMinutos: 60,
          }],
        },
      },
    ])('rechaza $caso', ({ cambios }) => {
      expect(
        DisponibilidadEquipoRespuesta.safeParse({
          ...respuestaCompleta,
          ...cambios,
        }).success,
      ).toBe(false);
    });
  });

  describe('Equipos e integrantes', () => {
    it('acepta una membresia de equipo valida', () => {
      expect(
        MisEquiposRespuesta.safeParse([{
          equipoId,
          rolEnEquipo: 'responsable',
          equipo: {
            id: equipoId,
            nombre: 'Equipo de prueba',
            creadoEn: desde,
          },
        }]).success,
      ).toBe(true);
    });

    it('acepta una lista vacia de equipos', () => {
      expect(MisEquiposRespuesta.safeParse([]).success).toBe(true);
    });

    it('acepta integrantes con consentimiento concedido', () => {
      expect(
        IntegrantesEquipoRespuesta.safeParse([integrante]).success,
      ).toBe(true);
    });

    it('rechaza roles desconocidos', () => {
      expect(
        IntegrantesEquipoRespuesta.safeParse([{
          ...integrante,
          rolEnEquipo: 'administrador',
        }]).success,
      ).toBe(false);
    });

    it('rechaza campos privados en el perfil', () => {
      expect(
        IntegrantesEquipoRespuesta.safeParse([{
          ...integrante,
          perfil: {
            ...integrante.perfil,
            tokenGoogle: 'dato-ficticio',
          },
        }]).success,
      ).toBe(false);
    });
  });

  describe('Consentimiento', () => {
    it.each(['concedida', 'rechazada', 'revocada'])(
      'acepta el cambio a %s',
      (estado) => {
        expect(
          CambioConsentimientoEquipo.safeParse({ estado }).success,
        ).toBe(true);
      },
    );

    it('rechaza establecer pendiente mediante el cambio', () => {
      expect(
        CambioConsentimientoEquipo.safeParse({
          estado: 'pendiente',
        }).success,
      ).toBe(false);
    });

    it('rechaza indicar otro perfil en la solicitud', () => {
      expect(
        CambioConsentimientoEquipo.safeParse({
          estado: 'concedida',
          perfilId: perfilB,
        }).success,
      ).toBe(false);
    });

    it('acepta una respuesta de cambio de consentimiento', () => {
      expect(
        CambioConsentimientoEquipoRespuesta.safeParse({
          equipoId,
          perfilId: perfilA,
          estadoConsentimiento: 'revocada',
          consentimientoCambiadoEn: desde,
        }).success,
      ).toBe(true);
    });
  });

  describe('Consentimiento mediante Operaciones', () => {
    const carga = {
      equipoId,
      estado: 'concedida',
    };

    const referencia = {
      membresiaId: perfilA,
      estadoAnterior: 'pendiente',
      cambiadoEn: null,
    };

    it.each(['concedida', 'rechazada', 'revocada'])(
      'acepta solicitar el estado %s',
      (estado) => {
        expect(
          CambiarConsentimientoEquipoCarga.safeParse({
            equipoId,
            estado,
          }).success,
        ).toBe(true);
      },
    );

    it.each(['pendiente', 'desconocido'])(
      'rechaza solicitar el estado %s',
      (estado) => {
        expect(
          CambiarConsentimientoEquipoCarga.safeParse({
            equipoId,
            estado,
          }).success,
        ).toBe(false);
      },
    );

    it('rechaza un identificador de equipo invalido', () => {
      expect(
        CambiarConsentimientoEquipoCarga.safeParse({
          ...carga,
          equipoId: 'equipo-invalido',
        }).success,
      ).toBe(false);
    });

    it('rechaza omitir el equipo', () => {
      expect(
        CambiarConsentimientoEquipoCarga.safeParse({
          estado: 'concedida',
        }).success,
      ).toBe(false);
    });

    it('rechaza omitir el nuevo estado', () => {
      expect(
        CambiarConsentimientoEquipoCarga.safeParse({
          equipoId,
        }).success,
      ).toBe(false);
    });

    it('rechaza indicar otro perfil', () => {
      expect(
        CambiarConsentimientoEquipoCarga.safeParse({
          ...carga,
          perfilId: perfilB,
        }).success,
      ).toBe(false);
    });

    it('rechaza indicar otra organizacion', () => {
      expect(
        CambiarConsentimientoEquipoCarga.safeParse({
          ...carga,
          organizacionId: perfilB,
        }).success,
      ).toBe(false);
    });

    it('rechaza referencias internas en la carga publica', () => {
      expect(
        CambiarConsentimientoEquipoCarga.safeParse({
          ...carga,
          referencia,
        }).success,
      ).toBe(false);
    });

    it('acepta la carga interna antes de enriquecerla', () => {
      expect(
        CambiarConsentimientoEquipoInterna.safeParse(
          carga,
        ).success,
      ).toBe(true);
    });

    it('acepta la referencia generada por el servidor', () => {
      expect(
        CambiarConsentimientoEquipoInterna.safeParse({
          ...carga,
          referencia,
        }).success,
      ).toBe(true);
    });

    it('acepta una referencia con cambio anterior', () => {
      expect(
        CambiarConsentimientoEquipoInterna.safeParse({
          ...carga,
          referencia: {
            ...referencia,
            estadoAnterior: 'revocada',
            cambiadoEn: desde,
          },
        }).success,
      ).toBe(true);
    });

    it('rechaza referencias con fechas invalidas', () => {
      expect(
        CambiarConsentimientoEquipoInterna.safeParse({
          ...carga,
          referencia: {
            ...referencia,
            cambiadoEn: 'fecha-invalida',
          },
        }).success,
      ).toBe(false);
    });

    it('rechaza referencias con membresia invalida', () => {
      expect(
        CambiarConsentimientoEquipoInterna.safeParse({
          ...carga,
          referencia: {
            ...referencia,
            membresiaId: 'invalido',
          },
        }).success,
      ).toBe(false);
    });
  });
});
