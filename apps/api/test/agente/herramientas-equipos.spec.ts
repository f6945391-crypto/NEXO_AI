import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import {
  ArgsConsultarDisponibilidadEquipo,
  ArgsListarEquipos,
} from '@nexoai/contratos';
import { HerramientasEquipos } from '../../src/agente/herramientas/herramientas-equipos';
import type { EjecutorHerramientas } from '../../src/agente/herramientas/ejecutor-herramientas';
import type { Herramienta, EntornoHerramienta } from '../../src/agente/herramientas/herramienta';
import type { EquiposService } from '../../src/equipos/equipos.service';
import type { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';
import type { ContextoSolicitud } from '../../src/identidad/contexto';

const equipoId = '00000000-0000-4000-8000-000000000001';
const perfilId = '00000000-0000-4000-8000-000000000002';

const contexto: ContextoSolicitud = {
  perfilId,
  organizacionId: '00000000-0000-4000-8000-000000000003',
  rol: 'gerente',
  plan: 'personal',
  primerIngresoPendiente: false,
};

const entorno: EntornoHerramienta = {
  conversacionId: 'prueba',
  solicitudOriginal: 'Consultar disponibilidad',
  referencia: {
    instante: new Date('2026-11-25T15:00:00Z'),
    zonaHoraria: 'America/Lima',
  },
};

function preparar() {
  const herramientas = new Map<string, Herramienta>();

  const ejecutor = {
    registrar: (h: Herramienta) => {
      herramientas.set(h.nombre, h);
    },
  };

  const equipos = {
    misEquipos: vi.fn().mockResolvedValue([
      {
        equipo: { id: equipoId, nombre: 'Equipo de prueba' },
      },
    ]),
  };

  const disponibilidad = {
    obtenerZonaHorariaSolicitante:
      vi.fn().mockResolvedValue('America/Lima'),

    consultarEquipo: vi.fn().mockResolvedValue({
      zonaHoraria: 'America/Lima',
      disponibilidadCompleta: false,
      estadoDisponibilidad: 'disponible',
      participantesConsultados: 1,
      participantesSinDatos: [perfilId],
      disponibilidadIndividual: [],
      intervalos: [{
        inicio: '2026-11-26T13:00:00Z',
        fin: '2026-11-26T15:00:00Z',
        duracionMinutos: 120,
      }],
      advertencia: 'Disponibilidad parcial',
    }),
  };

  const servicio = new HerramientasEquipos(
    ejecutor as unknown as EjecutorHerramientas,
    equipos as unknown as EquiposService,
    disponibilidad as unknown as DisponibilidadEquipoService,
  );

  servicio.onModuleInit();

  return { herramientas, equipos, disponibilidad };
}

describe('CUN-05 - Herramientas del agente', () => {
  it('registra las dos herramientas', () => {
    const { herramientas } = preparar();

    expect([...herramientas.keys()]).toEqual([
      'equipo.listar',
      'equipo.consultar_disponibilidad',
    ]);
  });

  it('lista equipos usando el contexto autenticado', async () => {
    const { herramientas, equipos } = preparar();

    const resultado = await herramientas.get('equipo.listar')!
      .ejecutar(contexto, {}, entorno);

    expect(equipos.misEquipos).toHaveBeenCalledWith(contexto);
    expect(resultado.paraModelo).toMatchObject({
      equipos: [{ id: equipoId, nombre: 'Equipo de prueba' }],
    });
  });

  it('consulta el dia siguiente por defecto en la zona local', async () => {
    const { herramientas, disponibilidad } = preparar();

    await herramientas.get('equipo.consultar_disponibilidad')!
      .ejecutar(
        contexto,
        ArgsConsultarDisponibilidadEquipo.parse({
          equipoId,
          duracionMinutos: 30,
        }),
        entorno,
      );

    expect(disponibilidad.consultarEquipo).toHaveBeenCalledWith(
      contexto,
      equipoId,
      new Date('2026-11-26T13:00:00Z'),
      new Date('2026-11-27T01:00:00Z'),
      30,
      'normal',
      undefined,
    );
  });

  it('comunica disponibilidad parcial sin exponer datos individuales', async () => {
    const { herramientas } = preparar();

    const resultado = await herramientas
      .get('equipo.consultar_disponibilidad')!
      .ejecutar(
        contexto,
        ArgsConsultarDisponibilidadEquipo.parse({ equipoId }),
        entorno,
      );

    expect(resultado.paraModelo).toMatchObject({
      disponibilidadCompleta: false,
      participantesConsultados: 1,
      participantesSinDatos: 1,
      advertencia: 'Disponibilidad parcial',
    });

    expect(resultado.paraModelo)
      .not.toHaveProperty('disponibilidadIndividual');

    expect(resultado.operacionId).toBeUndefined();
  });

  it('propaga la denegacion de acceso del servicio', async () => {
    const { herramientas, disponibilidad } = preparar();

    disponibilidad.obtenerZonaHorariaSolicitante
      .mockRejectedValueOnce(new Error('Acceso denegado'));

    await expect(
      herramientas.get('equipo.consultar_disponibilidad')!
        .ejecutar(
          contexto,
          ArgsConsultarDisponibilidadEquipo.parse({ equipoId }),
          entorno,
        ),
    ).rejects.toThrow('Acceso denegado');

    expect(disponibilidad.consultarEquipo).not.toHaveBeenCalled();
  });

  it('rechaza argumentos invalidos e identidades inyectadas', () => {
    for (const args of [
      { equipoId: 'invalido' },
      { equipoId, duracionMinutos: -30 },
      { equipoId, fecha: '2026-02-30' },
      { equipoId, participantes: [] },
      { equipoId, participantes: [perfilId, perfilId] },
      { equipoId, organizacionId: perfilId },
    ]) {
      expect(
        ArgsConsultarDisponibilidadEquipo.safeParse(args).success,
      ).toBe(false);
    }

    expect(
      ArgsListarEquipos.safeParse({ perfilId }).success,
    ).toBe(false);
  });
});
