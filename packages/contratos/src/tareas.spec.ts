import { describe, expect, it } from 'vitest';
import { ArgsRegistrarEvento, TurnoDeHerramienta } from './agente';
import { DecisionAsistente, DesenlaceEpisodio } from './asistente';
import {
  ArgsTareaExistente,
  CargaCambiarTarea,
  CargaRegistrarTarea,
  CargaTareaExistente,
  ConsultaTareas,
  TareaPersonal,
} from './tareas';

// T-046 · specs/09-tareas-personales/tasks.md
const ID = '0b6e7d1c-3a52-4c1f-9a7e-2f0c5d9e8b11';

describe('contratos.tareas', () => {
  it('registrar: solo el texto es obligatorio', () => {
    expect(CargaRegistrarTarea.parse({ texto: 'Llamar al dentista' })).toEqual({ texto: 'Llamar al dentista' });
    expect(CargaRegistrarTarea.safeParse({}).success).toBe(false);
    expect(CargaRegistrarTarea.safeParse({ texto: '   ' }).success).toBe(false);
  });

  it('registrar: la hora límite sin fecha y el «desde» sin persona no validan', () => {
    expect(CargaRegistrarTarea.safeParse({ texto: 'Pagar', horaLimite: '18:00' }).success).toBe(false);
    expect(CargaRegistrarTarea.safeParse({ texto: 'Pagar', fecha: '2026-11-14', horaLimite: '18:00' }).success).toBe(true);
    expect(CargaRegistrarTarea.safeParse({ texto: 'Presupuesto', esperadaDesde: '2026-11-03' }).success).toBe(false);
    expect(CargaRegistrarTarea.safeParse({ texto: 'Presupuesto', deQuien: 'Juan', esperadaDesde: '2026-11-03' }).success).toBe(true);
  });

  it('registrar: no admite campos de contacto (R-12)', () => {
    expect(CargaRegistrarTarea.safeParse({ texto: 'Presupuesto', deQuien: 'Juan', correo: 'juan@x.pe' }).success).toBe(false);
  });

  it('cambiar: sin ningún campo no valida; null en fecha sí, y significa quitarla', () => {
    expect(CargaCambiarTarea.safeParse({ tareaId: ID }).success).toBe(false);
    expect(CargaCambiarTarea.parse({ tareaId: ID, fecha: null })).toEqual({ tareaId: ID, fecha: null });
    expect(CargaCambiarTarea.safeParse({ tareaId: ID, texto: 'Pagar la luz' }).success).toBe(true);
  });

  it('tarea existente: por id, y el agente también por texto', () => {
    expect(CargaTareaExistente.safeParse({ tareaId: ID }).success).toBe(true);
    expect(CargaTareaExistente.safeParse({ tareaId: 'no' }).success).toBe(false);
    expect(ArgsTareaExistente.safeParse({ texto: 'el recibo' }).success).toBe(true);
    expect(ArgsTareaExistente.safeParse({}).success).toBe(false);
  });

  it('consulta: franja conocida y fecha AAAA-MM-DD', () => {
    expect(ConsultaTareas.parse({ franja: 'esperando', hasta: '2026-11-15' })).toEqual({ franja: 'esperando', hasta: '2026-11-15' });
    expect(ConsultaTareas.safeParse({ franja: 'encargadas' }).success).toBe(false);
    expect(ConsultaTareas.safeParse({ hasta: '15/11/2026' }).success).toBe(false);
  });

  it('la tarea que sale de la API lleva franja, vencida y sus textos', () => {
    const tarea = {
      id: ID,
      texto: 'Renovar el DNI',
      estado: 'pendiente',
      franja: 'con_fecha',
      fecha: '2026-11-06',
      horaLimite: null,
      zonaHoraria: 'America/Lima',
      deQuien: null,
      esperadaDesde: null,
      vencida: true,
      hechaEn: null,
      creadaEn: '2026-11-01T10:00:00-05:00',
      cuando: 'Vencía el viernes 6 de noviembre',
      espera: null,
      cierre: null,
    };
    expect(TareaPersonal.parse(tarea)).toEqual(tarea);
    expect(TareaPersonal.safeParse({ ...tarea, franja: 'vencida' }).success).toBe(false);
  });

  it('los contratos existentes siguen validando lo mismo', () => {
    expect(ArgsRegistrarEvento.safeParse({ titulo: 'Dentista', fecha: '2026-11-14', horaInicio: '10:00' }).success).toBe(true);
    expect(ArgsRegistrarEvento.safeParse({ fecha: '14-11-2026' }).success).toBe(false);
    expect(DecisionAsistente.safeParse({ operacionId: ID, decision: 'confirmar' }).success).toBe(true);
    expect(DesenlaceEpisodio.safeParse('guardado').success).toBe(true);
    expect(DesenlaceEpisodio.safeParse('hecho').success).toBe(true);
    expect(TurnoDeHerramienta.safeParse({ tipo: 'tareas', lista: { alcance: 'Pendientes', zona: 'Hora de Lima (GMT-5)', grupos: [] } }).success).toBe(true);
  });
});
