import { describe, expect, it, vi } from 'vitest';
import { DisponibilidadEquipoRespuesta } from '@nexoai/contratos';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';

describe('CUN-05 - Disponibilidad individual', () => {
  const contexto = {
    perfilId: '44444444-4444-4444-8444-444444444444',
    organizacionId: '55555555-5555-4555-8555-555555555555',
    rol: 'gerente' as const,
    plan: 'empresarial' as const,
    primerIngresoPendiente: false,
  };

  const equipoId = '11111111-1111-4111-8111-111111111111';

  const perfilA = '22222222-2222-4222-8222-222222222222';
  const perfilB = '33333333-3333-4333-8333-333333333333';

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

  const a = integrante(perfilA);
  const b = integrante(perfilB);

  const ocupado = (inicio: string, fin: string) => ({
    inicio: fecha(inicio),
    fin: fecha(fin),
  });

  const intervalo = (inicio: string, fin: string) => ({
    inicio: fecha(inicio).toISOString(),
    fin: fecha(fin).toISOString(),
    duracionMinutos:
      (fecha(fin).getTime() - fecha(inicio).getTime()) / 60000,
  });

  function preparar(
    iniciales = [a],
    finales = iniciales,
    calendarios: boolean[] = [true],
    ocupados: { inicio: Date; fin: Date }[][] = [[]],
    zonaHoraria = 'America/Lima',
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

    const consultar = async (
      duracion?: number,
      seleccion?: string[],
      banda: 'normal' | 'extendida' | 'fueraDeBanda' = 'normal',
    ) => {
      const resultado = await servicio.consultarEquipo(
        contexto,
        equipoId,
        desde,
        hasta,
        duracion,
        banda,
        seleccion,
      );

      // Todas las respuestas deben satisfacer el contrato.
      expect(
        DisponibilidadEquipoRespuesta.parse(resultado),
      ).toEqual(resultado);

      return resultado;
    };

    return { consultar, verificar, obtener };
  }

  it('representa un calendario vacio como libre', async () => {
    const { consultar } = preparar();
    const resultado = await consultar();

    expect(resultado.disponibilidadIndividual).toEqual([{
      perfilId: perfilA,
      estado: 'consultado',
      intervalosOcupados: [],
      intervalosLibres: [intervalo('08:00', '12:00')],
    }]);
  });

  it('representa un calendario completamente ocupado', async () => {
    const { consultar } = preparar(
      [a], [a], [true],
      [[ocupado('08:00', '12:00')]],
    );

    const resultado = await consultar();

    expect(resultado.disponibilidadIndividual).toEqual([{
      perfilId: perfilA,
      estado: 'consultado',
      intervalosOcupados: [intervalo('08:00', '12:00')],
      intervalosLibres: [],
    }]);
  });

  it('unifica eventos superpuestos', async () => {
    const { consultar } = preparar(
      [a], [a], [true],
      [[
        ocupado('09:00', '10:30'),
        ocupado('10:00', '11:00'),
      ]],
    );

    const resultado = await consultar();

    expect(resultado.disponibilidadIndividual).toEqual([{
      perfilId: perfilA,
      estado: 'consultado',
      intervalosOcupados: [intervalo('09:00', '11:00')],
      intervalosLibres: [
        intervalo('08:00', '09:00'),
        intervalo('11:00', '12:00'),
      ],
    }]);
  });

  it('unifica eventos consecutivos', async () => {
    const { consultar } = preparar(
      [a], [a], [true],
      [[
        ocupado('09:00', '10:00'),
        ocupado('10:00', '11:00'),
      ]],
    );

    const resultado = await consultar();

    expect(resultado.disponibilidadIndividual[0]?.intervalosOcupados).toEqual([
        intervalo('09:00', '11:00'),
      ]);
  });

  it('recorta y descarta eventos fuera del rango', async () => {
    const { consultar } = preparar(
      [a], [a], [true],
      [[
        ocupado('05:00', '06:00'),
        ocupado('07:00', '09:00'),
        ocupado('11:00', '13:00'),
        ocupado('14:00', '15:00'),
      ]],
    );

    const resultado = await consultar();

    expect(resultado.disponibilidadIndividual).toEqual([{
      perfilId: perfilA,
      estado: 'consultado',
      intervalosOcupados: [
        intervalo('08:00', '09:00'),
        intervalo('11:00', '12:00'),
      ],
      intervalosLibres: [
        intervalo('09:00', '11:00'),
      ],
    }]);
  });

  it.each(['pendiente', 'rechazada', 'revocada'])(
    'no consulta calendarios con consentimiento %s',
    async (estado) => {
      const participante = integrante(perfilA, estado);

      const { consultar, verificar, obtener } =
        preparar([participante]);

      const resultado = await consultar();

      expect(resultado.disponibilidadIndividual).toEqual([{
        perfilId: perfilA,
        estado: 'sin_datos',
        motivo: 'sin_consentimiento',
        intervalosOcupados: [],
        intervalosLibres: [],
      }]);

      expect(verificar).not.toHaveBeenCalled();
      expect(obtener).not.toHaveBeenCalled();
    },
  );

  it('elimina los datos si se revoca durante la consulta', async () => {
    const { consultar, obtener } = preparar(
      [a, b],
      [a, integrante(perfilB, 'revocada')],
      [true, true],
      [[], [ocupado('09:00', '11:00')]],
    );

    const resultado = await consultar();

    expect(obtener).toHaveBeenCalledTimes(2);

    expect(resultado.disponibilidadIndividual[1]).toEqual({
      perfilId: perfilB,
      estado: 'sin_datos',
      motivo: 'autorizacion_no_vigente',
      intervalosOcupados: [],
      intervalosLibres: [],
    });

    expect(resultado.intervalosComunes).toEqual([
      intervalo('08:00', '12:00'),
    ]);
  });

  it('excluye datos de quien deja de pertenecer al equipo', async () => {
    const { consultar } = preparar(
      [a, b], [a], [true, true],
      [[], [ocupado('09:00', '11:00')]],
    );

    const resultado = await consultar();

    expect(resultado.disponibilidadIndividual[1]).toEqual({
      perfilId: perfilB,
      estado: 'sin_datos',
      motivo: 'autorizacion_no_vigente',
      intervalosOcupados: [],
      intervalosLibres: [],
    });
  });

  it('no representa un calendario desconectado como libre', async () => {
    const { consultar, obtener } = preparar(
      [a], [a], [false],
    );

    const resultado = await consultar();

    expect(resultado.disponibilidadIndividual).toEqual([{
      perfilId: perfilA,
      estado: 'sin_datos',
      motivo: 'calendario_no_disponible',
      intervalosOcupados: [],
      intervalosLibres: [],
    }]);

    expect(obtener).not.toHaveBeenCalled();
  });

  it('devuelve solo los participantes seleccionados', async () => {
    const { consultar, obtener } = preparar(
      [a, b], [a, b],
    );

    const resultado = await consultar(undefined, [perfilB]);

    expect(resultado.disponibilidadIndividual).toHaveLength(1);
    expect(resultado.disponibilidadIndividual[0]?.perfilId)
      .toBe(perfilB);

    expect(obtener).toHaveBeenCalledTimes(1);
  });

  it('conserva los intervalos individuales al filtrar duracion', async () => {
    const eventos = [[ocupado('09:00', '10:00')]];

    const sinFiltro = await preparar(
      [a], [a], [true], eventos,
    ).consultar();

    const conFiltro = await preparar(
      [a], [a], [true], eventos,
    ).consultar(90);

    expect(conFiltro.disponibilidadIndividual)
      .toEqual(sinFiltro.disponibilidadIndividual);

    expect(conFiltro.intervalos).toEqual([
      intervalo('10:00', '12:00'),
    ]);
  });

  it('conserva la ocupacion individual fuera de la banda', async () => {
    const eventos = [[ocupado('09:00', '10:00')]];

    const normal = await preparar(
      [a], [a], [true], eventos, 'Pacific/Honolulu',
    ).consultar();

    const completa = await preparar(
      [a], [a], [true], eventos, 'Pacific/Honolulu',
    ).consultar(undefined, undefined, 'fueraDeBanda');

    expect(normal.intervalos).toEqual([]);

    expect(normal.disponibilidadIndividual)
      .toEqual(completa.disponibilidadIndividual);

    expect(completa.intervalos.length).toBeGreaterThan(0);
  });

  it('no serializa titulos ni detalles privados de eventos', async () => {
    const evento = {
      ...ocupado('09:00', '10:00'),
      titulo: 'Evento privado ficticio',
      descripcion: 'Descripcion confidencial ficticia',
      ubicacion: 'Ubicacion ficticia',
    };

    const { consultar } = preparar(
      [a], [a], [true], [[evento]],
    );

    const resultado = await consultar();

    expect(resultado.disponibilidadIndividual[0]?.intervalosOcupados).toEqual([
        intervalo('09:00', '10:00'),
      ]);

    const json = JSON.stringify(resultado);

    expect(json).not.toContain(evento.titulo);
    expect(json).not.toContain(evento.descripcion);
    expect(json).not.toContain(evento.ubicacion);
  });
});
