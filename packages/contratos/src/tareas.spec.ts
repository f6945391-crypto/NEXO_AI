import { describe, expect, it } from 'vitest';
import { ActualizacionTarea, CierreTarea, ConsultaTareas, ConsultaTareasEnFechas, FechaDia, PropuestaTarea } from './tareas';

// T-046 · specs/08-tareas-personales/plan.md §3 y §4. Los esquemas aceptan y rechazan un ejemplo de cada
// Operación de tareas, y de las consultas.

const ID = '6f1c2b8e-3a1d-4c7e-9b2a-1f0e5d4c3b2a';

describe('contratos.tareas', () => {
  it('una fecha es un día del calendario que existe', () => {
    expect(FechaDia.parse('2026-11-14')).toBe('2026-11-14');
    expect(() => FechaDia.parse('2026-02-31')).toThrow();
    expect(() => FechaDia.parse('2026-11-14T10:00:00Z')).toThrow();
  });

  it('tareas.registrar: título obligatorio; la hora solo con fecha; de quién y qué se espera, juntos', () => {
    expect(PropuestaTarea.parse({ titulo: 'Pagar el recibo', fecha: '2026-11-20', hora: '10:30' })).toEqual({ titulo: 'Pagar el recibo', fecha: '2026-11-20', hora: '10:30' });
    expect(PropuestaTarea.parse({ titulo: 'Contrato', esperaDe: 'Marta', esperaQue: 'el contrato' }).esperaDe).toBe('Marta');
    expect(() => PropuestaTarea.parse({ fecha: '2026-11-20' })).toThrow();
    expect(() => PropuestaTarea.parse({ titulo: 'Sin fecha', hora: '10:30' })).toThrow();
    expect(() => PropuestaTarea.parse({ titulo: 'Contrato', esperaDe: 'Marta' })).toThrow();
    expect(() => PropuestaTarea.parse({ titulo: 'Con un campo de más', urgente: true })).toThrow();
  });

  it('tareas.actualizar: dice qué cambia; quitar la fecha es null; cancelar va solo', () => {
    expect(ActualizacionTarea.parse({ tareaId: ID, fecha: null })).toEqual({ tareaId: ID, fecha: null });
    expect(ActualizacionTarea.parse({ tareaId: ID, cancelar: true })).toEqual({ tareaId: ID, cancelar: true });
    expect(() => ActualizacionTarea.parse({ tareaId: ID })).toThrow();
    expect(() => ActualizacionTarea.parse({ tareaId: ID, cancelar: true, titulo: 'Otro' })).toThrow();
    expect(() => ActualizacionTarea.parse({ tareaId: 'no-es-un-uuid', titulo: 'Otro' })).toThrow();
  });

  it('tareas.completar: el id de la tarea, y reabrir es opcional', () => {
    expect(CierreTarea.parse({ tareaId: ID })).toEqual({ tareaId: ID });
    expect(CierreTarea.parse({ tareaId: ID, reabrir: true }).reabrir).toBe(true);
    expect(() => CierreTarea.parse({})).toThrow();
  });

  it('las consultas: estados válidos separados por coma, y un rango de días en orden', () => {
    expect(ConsultaTareas.parse({ estado: 'completada,cancelada' }).estado).toEqual(['completada', 'cancelada']);
    expect(ConsultaTareas.parse({}).estado).toBeUndefined();
    expect(() => ConsultaTareas.parse({ estado: 'borrada' })).toThrow();
    expect(ConsultaTareasEnFechas.parse({ desde: '2026-11-10', hasta: '2026-11-16' })).toEqual({ desde: '2026-11-10', hasta: '2026-11-16' });
    expect(() => ConsultaTareasEnFechas.parse({ desde: '2026-11-16', hasta: '2026-11-10' })).toThrow();
    expect(() => ConsultaTareasEnFechas.parse({ desde: '2026-01-01', hasta: '2027-06-01' })).toThrow();
  });
});
