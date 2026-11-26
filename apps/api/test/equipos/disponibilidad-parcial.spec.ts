import { describe, expect, it, vi } from 'vitest';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

describe('CUN-05 - Disponibilidad parcial', () => {
  const contexto = {
    perfilId: 'usuario-1',
    organizacionId: 'organizacion-1',
    rol: 'gerente' as const,
    plan: 'empresarial' as const,
    primerIngresoPendiente: false,
  };

  const equipoId = '11111111-1111-4111-8111-111111111111';

  const fecha = (hora: string) =>
    new Date(`2026-11-12T${hora}:00-05:00`);

  const desde = fecha('08:00');
  const hasta = fecha('12:00');

  const integrante = (
    perfilId: string,
    estadoConsentimiento = 'concedida',
  ) => ({
    perfilId,
    estadoConsentimiento,
  });

  const a = integrante('integrante-a');
  const b = integrante('integrante-b');
  const pendiente = integrante('integrante-b', 'pendiente');
  const revocado = integrante('integrante-b', 'revocada');

  function preparar(
    iniciales = [a, b],
    finales = iniciales,
    calendarios: boolean[] = [true, true],
    ocupados: { inicio: Date; fin: Date }[][] = [
      [{ inicio: fecha('09:00'), fin: fecha('10:00') }],
      [{ inicio: fecha('10:00'), fin: fecha('11:00') }],
    ],
    zonaHoraria: string | null = 'America/Lima',
  ) {
    const equipos = {
      verificarMembresia: vi.fn().mockResolvedValue(undefined),
      integrantes: vi.fn()
        .mockResolvedValueOnce(iniciales)
        .mockResolvedValueOnce(finales),
    };

    const prisma = {
      deOrganizacion: vi.fn().mockReturnValue({
        perfilUsuario: {
          findFirst: vi.fn().mockResolvedValue({
            zonaHoraria,
          }),
        },
      }),
    };

    const servicio = new DisponibilidadEquipoService(
      prisma as never,
      {} as never,
      {} as never,
      equipos as never,
    );

    const verificar = vi.spyOn(
      servicio,
      'verificarCalendario',
    ).mockResolvedValue(false);

    for (const disponible of calendarios) {
      verificar.mockResolvedValueOnce(disponible);
    }

    const obtener = vi.spyOn(
      servicio,
      'obtenerOcupados',
    ).mockResolvedValue([]);

    for (const intervalos of ocupados) {
      obtener.mockResolvedValueOnce(intervalos);
    }

    const consultar = (
      duracion?: number,
      seleccion?: string[],
    ) => servicio.consultarEquipo(
      contexto,
      equipoId,
      desde,
      hasta,
      duracion,
      'normal',
      seleccion,
    );

    return { consultar, verificar, obtener };
  }

  const intervalo = (inicio: string, fin: string) => ({
    inicio: fecha(inicio).toISOString(),
    fin: fecha(fin).toISOString(),
    duracionMinutos:
      (fecha(fin).getTime() - fecha(inicio).getTime()) / 60000,
  });

  const libresDeA = [
    intervalo('08:00', '09:00'),
    intervalo('10:00', '12:00'),
  ];

  describe('Estados diferenciados de disponibilidad', () => {
    it('devuelve disponible con datos completos y aplica la duracion', async () => {
      const { consultar } = preparar();
      const resultado = await consultar(60);

      expect(resultado.estadoDisponibilidad).toBe('disponible');
      expect(resultado.disponibilidadCompleta).toBe(true);
      expect(resultado.participantesConsultados).toBe(2);
      expect(resultado.intervalosComunes).toEqual([
        intervalo('08:00', '09:00'),
        intervalo('11:00', '12:00'),
      ]);
      expect(resultado.intervalos).toEqual(
        resultado.intervalosComunes,
      );
    });

    it('devuelve disponible parcial y conserva los intervalos anteriores al filtro', async () => {
      const { consultar } = preparar([a, pendiente]);
      const resultado = await consultar(90);

      expect(resultado.estadoDisponibilidad).toBe('disponible');
      expect(resultado.disponibilidadCompleta).toBe(false);
      expect(resultado.participantesConsultados).toBe(1);
      expect(resultado.intervalosComunes).toEqual(libresDeA);
      expect(resultado.intervalos).toEqual([
        intervalo('10:00', '12:00'),
      ]);
      expect(resultado.advertencia).toContain(
        'Disponibilidad parcial',
      );
    });

    it('distingue calendarios ocupados de calendarios sin datos', async () => {
      const { consultar } = preparar(
        [a, b],
        [a, b],
        [true, true],
        [
          [{ inicio: desde, fin: hasta }],
          [],
        ],
      );

      const resultado = await consultar();

      expect(resultado.estadoDisponibilidad).toBe(
        'sin_intervalos_comunes',
      );
      expect(resultado.disponibilidadCompleta).toBe(true);
      expect(resultado.participantesConsultados).toBe(2);
      expect(resultado.intervalosComunes).toEqual([]);
      expect(resultado.intervalos).toEqual([]);
    });

    it('clasifica los horarios fuera de banda como ausencia de intervalos comunes', async () => {
      const { consultar } = preparar(
        [a, b],
        [a, b],
        [true, true],
        [[], []],
        'Pacific/Honolulu',
      );

      const resultado = await consultar();

      // Lima 08:00-12:00 equivale a Honolulu 03:00-07:00.
      expect(resultado.participantesConsultados).toBe(2);
      expect(resultado.disponibilidadCompleta).toBe(true);
      expect(resultado.estadoDisponibilidad).toBe(
        'sin_intervalos_comunes',
      );
      expect(resultado.intervalosComunes).toEqual([]);
      expect(resultado.intervalos).toEqual([]);
    });

    it('devuelve duracion insuficiente cuando ningun intervalo alcanza el minimo', async () => {
      const { consultar } = preparar();
      const resultado = await consultar(90);

      expect(resultado.estadoDisponibilidad).toBe(
        'duracion_insuficiente',
      );
      expect(resultado.disponibilidadCompleta).toBe(true);
      expect(resultado.intervalosComunes).toEqual([
        intervalo('08:00', '09:00'),
        intervalo('11:00', '12:00'),
      ]);
      expect(resultado.intervalos).toEqual([]);
    });

    it('distingue duracion insuficiente con disponibilidad parcial', async () => {
      const { consultar } = preparar([a, pendiente]);
      const resultado = await consultar(180);

      expect(resultado.estadoDisponibilidad).toBe(
        'duracion_insuficiente',
      );
      expect(resultado.disponibilidadCompleta).toBe(false);
      expect(resultado.participantesConsultados).toBe(1);
      expect(resultado.intervalosComunes).toEqual(libresDeA);
      expect(resultado.intervalos).toEqual([]);
    });

    it('devuelve sin datos cuando ningun calendario es consultable', async () => {
      const { consultar } = preparar(
        [a, b],
        [a, b],
        [false, false],
      );

      const resultado = await consultar();

      expect(resultado.estadoDisponibilidad).toBe('sin_datos');
      expect(resultado.disponibilidadCompleta).toBe(false);
      expect(resultado.participantesConsultados).toBe(0);
      expect(resultado.intervalosComunes).toEqual([]);
      expect(resultado.intervalos).toEqual([]);
    });

    it('elimina todos los intervalos si se revocan todos los consentimientos', async () => {
      const { consultar } = preparar(
        [a, b],
        [
          integrante(a.perfilId, 'revocada'),
          integrante(b.perfilId, 'revocada'),
        ],
      );

      const resultado = await consultar();

      expect(resultado.estadoDisponibilidad).toBe('sin_datos');
      expect(resultado.disponibilidadCompleta).toBe(false);
      expect(resultado.participantesConsultados).toBe(0);
      expect(resultado.intervalosComunes).toEqual([]);
      expect(resultado.intervalos).toEqual([]);
      expect(resultado.participantesSinDatos).toHaveLength(2);
    });
  });

  it('calcula disponibilidad completa con todos los datos', async () => {
    const { consultar } = preparar();
    const resultado = await consultar();

    expect(resultado.disponibilidadCompleta).toBe(true);
    expect(resultado.participantesConsultados).toBe(2);
    expect(resultado.participantesSinDatos).toEqual([]);
    expect(resultado.intervalos).toEqual([
      intervalo('08:00', '09:00'),
      intervalo('11:00', '12:00'),
    ]);

    expect(resultado.detalleParticipantesSinDatos).toEqual([]);
  });

  it('calcula resultados parciales si falta consentimiento', async () => {
    const { consultar, verificar, obtener } =
      preparar([a, pendiente]);

    const resultado = await consultar();

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.participantesConsultados).toBe(1);
    expect(resultado.participantesSinDatos).toEqual([b.perfilId]);
    expect(resultado.intervalos).toEqual(libresDeA);
    expect(resultado.advertencia).toContain('Disponibilidad parcial');
    expect(verificar).toHaveBeenCalledTimes(1);
    expect(obtener).toHaveBeenCalledTimes(1);

    expect(resultado.detalleParticipantesSinDatos).toEqual([
      { perfilId: b.perfilId, motivo: 'sin_consentimiento' },
    ]);
  });

  it('calcula resultados parciales si falta un calendario', async () => {
    const { consultar, obtener } =
      preparar([a, b], [a, b], [true, false]);

    const resultado = await consultar();

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.participantesConsultados).toBe(1);
    expect(resultado.participantesSinDatos).toEqual([b.perfilId]);
    expect(resultado.intervalos).toEqual(libresDeA);
    expect(obtener).toHaveBeenCalledTimes(1);

    expect(resultado.detalleParticipantesSinDatos).toEqual([
      { perfilId: b.perfilId, motivo: 'calendario_no_disponible' },
    ]);
  });

  it('no devuelve intervalos cuando nadie tiene datos', async () => {
    const { consultar, obtener } =
      preparar([a, b], [a, b], [false, false]);

    const resultado = await consultar();

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.participantesConsultados).toBe(0);
    expect(resultado.participantesSinDatos).toEqual([
      a.perfilId,
      b.perfilId,
    ]);
    expect(resultado.intervalos).toEqual([]);
    expect(obtener).not.toHaveBeenCalled();

    expect(resultado.detalleParticipantesSinDatos).toEqual([
      { perfilId: a.perfilId, motivo: 'calendario_no_disponible' },
      { perfilId: b.perfilId, motivo: 'calendario_no_disponible' },
    ]);
  });

  it('excluye intervalos de quien revoca durante la consulta', async () => {
    const { consultar } = preparar([a, b], [a, revocado]);
    const resultado = await consultar();

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.participantesConsultados).toBe(1);
    expect(resultado.participantesSinDatos).toEqual([b.perfilId]);
    expect(resultado.intervalos).toEqual(libresDeA);

    expect(resultado.detalleParticipantesSinDatos).toEqual([
      { perfilId: b.perfilId, motivo: 'autorizacion_no_vigente' },
    ]);
  });

  it('no devuelve intervalos si se revoca el unico consentimiento', async () => {
    const { consultar } = preparar([b], [revocado]);
    const resultado = await consultar();

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.participantesConsultados).toBe(0);
    expect(resultado.participantesSinDatos).toEqual([b.perfilId]);
    expect(resultado.intervalos).toEqual([]);

    expect(resultado.detalleParticipantesSinDatos).toEqual([
      { perfilId: b.perfilId, motivo: 'autorizacion_no_vigente' },
    ]);
  });

  it('distingue un calendario vacio de un calendario sin datos', async () => {
    const { consultar } =
      preparar([a, pendiente], [a, pendiente], [true], [[]]);

    const resultado = await consultar();

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.participantesConsultados).toBe(1);
    expect(resultado.participantesSinDatos).toEqual([b.perfilId]);
    expect(resultado.intervalos).toEqual([
      intervalo('08:00', '12:00'),
    ]);

    expect(resultado.detalleParticipantesSinDatos).toEqual([
      { perfilId: b.perfilId, motivo: 'sin_consentimiento' },
    ]);
  });

  it('respeta la duracion minima en resultados parciales', async () => {
    const { consultar } = preparar([a, pendiente]);
    const resultado = await consultar(90);

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.intervalos).toEqual([
      intervalo('10:00', '12:00'),
    ]);

    expect(resultado.detalleParticipantesSinDatos).toEqual([
      { perfilId: b.perfilId, motivo: 'sin_consentimiento' },
    ]);
  });

  it('calcula solo con los participantes seleccionados', async () => {
    const { consultar, obtener } = preparar([
      a,
      pendiente,
      integrante('integrante-c'),
    ]);

    const resultado = await consultar(undefined, [
      a.perfilId,
      b.perfilId,
    ]);

    expect(resultado.disponibilidadCompleta).toBe(false);
    expect(resultado.participantesConsultados).toBe(1);
    expect(resultado.participantesSinDatos).toEqual([b.perfilId]);
    expect(resultado.intervalos).toEqual(libresDeA);
    expect(obtener).toHaveBeenCalledTimes(1);

    expect(resultado.detalleParticipantesSinDatos).toEqual([
      { perfilId: b.perfilId, motivo: 'sin_consentimiento' },
    ]);
  });

  it('devuelve la zona horaria de Lima', async () => {
    const { consultar } = preparar();
    const resultado = await consultar();

    expect(resultado.zonaHoraria).toBe('America/Lima');
  });

  it('aplica y devuelve la zona horaria de Madrid', async () => {
    const { consultar } = preparar(
      [a, b],
      [a, b],
      [true, true],
      [[], []],
      'Europe/Madrid',
    );

    const resultado = await consultar();

    expect(resultado.zonaHoraria).toBe('Europe/Madrid');
    expect(resultado.intervalos).toEqual([
      intervalo('08:00', '12:00'),
    ]);
  });

  it('aplica y devuelve la zona horaria de Nueva York', async () => {
    const { consultar } = preparar(
      [a, b],
      [a, b],
      [true, true],
      [[], []],
      'America/New_York',
    );

    const resultado = await consultar();

    expect(resultado.zonaHoraria).toBe('America/New_York');
    expect(resultado.intervalos).toEqual([
      intervalo('08:00', '12:00'),
    ]);
  });

  it('utiliza UTC cuando no existe una zona configurada', async () => {
    const { consultar } = preparar(
      [a, b],
      [a, b],
      [true, true],
      [[], []],
      null,
    );

    const resultado = await consultar();

    expect(resultado.zonaHoraria).toBe('UTC');
    expect(resultado.intervalos).toEqual([
      intervalo('08:00', '12:00'),
    ]);
  });

  it('recorta los intervalos segun la zona de Los Angeles', async () => {
    const { consultar } = preparar(
      [a, b],
      [a, b],
      [true, true],
      [[], []],
      'America/Los_Angeles',
    );

    const resultado = await consultar();

    expect(resultado.zonaHoraria).toBe('America/Los_Angeles');
    expect(resultado.intervalos).toEqual([
      intervalo('11:00', '12:00'),
    ]);
  });

});
