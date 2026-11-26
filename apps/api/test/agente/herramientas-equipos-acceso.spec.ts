import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { ArgsConsultarDisponibilidadEquipo } from '@nexoai/contratos';
import { HerramientasEquipos } from '../../src/agente/herramientas/herramientas-equipos';
import type { EjecutorHerramientas } from '../../src/agente/herramientas/ejecutor-herramientas';
import type { Herramienta, EntornoHerramienta } from '../../src/agente/herramientas/herramienta';
import type { EquiposService } from '../../src/equipos/equipos.service';
import type { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';
import type { ContextoSolicitud } from '../../src/identidad/contexto';
import { errorApi } from '../../src/plataforma/errores';

// T-120 · REQ-CUN05-18 · H-EQ-02. El asistente aplica la misma regla que la API y recibe un texto fijo.
const contexto: ContextoSolicitud = {
  perfilId: '00000000-0000-4000-8000-000000000002',
  organizacionId: '00000000-0000-4000-8000-000000000003',
  rol: 'gerente',
  plan: 'personal',
  primerIngresoPendiente: false,
};

const entorno: EntornoHerramienta = {
  conversacionId: 'prueba',
  solicitudOriginal: 'Consulta la disponibilidad de mi equipo',
  referencia: { instante: new Date('2026-11-25T15:00:00Z'), zonaHoraria: 'America/Lima' },
};

function preparar(codigo: 'SIN_PLAN_EMPRESARIAL' | 'SIN_EQUIPO' | 'SOLICITUD_INVALIDA') {
  const herramientas = new Map<string, Herramienta>();
  const rechazo = () => Promise.reject(errorApi(403, codigo, 'rechazado'));
  const equipos = { misEquipos: vi.fn(rechazo) };
  const disponibilidad = { obtenerZonaHorariaSolicitante: vi.fn(rechazo), consultarEquipo: vi.fn() };
  new HerramientasEquipos(
    { registrar: (h: Herramienta) => herramientas.set(h.nombre, h) } as unknown as EjecutorHerramientas,
    equipos as unknown as EquiposService,
    disponibilidad as unknown as DisponibilidadEquipoService,
  ).onModuleInit();
  return { herramientas, disponibilidad };
}

const SIN_ACCESO = 'La disponibilidad de equipo es del Plan Empresarial y requiere pertenecer a un equipo.';

describe('equipos.asistente-sin-acceso', () => {
  it.each(['SIN_PLAN_EMPRESARIAL', 'SIN_EQUIPO'] as const)('con %s, listar los equipos devuelve el texto fijo', async (codigo) => {
    const { herramientas } = preparar(codigo);
    const resultado = await herramientas.get('equipo.listar')!.ejecutar(contexto, {}, entorno);
    expect(resultado).toEqual({ paraModelo: { sinAcceso: SIN_ACCESO } });
  });

  it('consultar la disponibilidad también, y no llega a consultar nada', async () => {
    const { herramientas, disponibilidad } = preparar('SIN_PLAN_EMPRESARIAL');
    const args = ArgsConsultarDisponibilidadEquipo.parse({ equipoId: '00000000-0000-4000-8000-000000000001' });
    const resultado = await herramientas.get('equipo.consultar_disponibilidad')!.ejecutar(contexto, args, entorno);
    expect(resultado).toEqual({ paraModelo: { sinAcceso: SIN_ACCESO } });
    expect(disponibilidad.consultarEquipo).not.toHaveBeenCalled();
  });

  it('otro rechazo, como un equipo ajeno, sigue siendo un error', async () => {
    const { herramientas } = preparar('SOLICITUD_INVALIDA');
    await expect(herramientas.get('equipo.listar')!.ejecutar(contexto, {}, entorno)).rejects.toThrow();
  });
});
