import { describe, expect, it } from 'vitest';
import { textoCierre, textoCuando, textoEspera } from '../../src/tareas/dominio/formato';
import { franjaDe, instanteLimite, ordenar, ordenarPorFranja, vencida, type DatosFranja } from '../../src/tareas/dominio/franja';

// T-047 · REQ-CUN03-03, 06, 07 · H-TP-01, 03, 04, 05. Funciones puras: sin base de datos. Las fechas son las
// de los criterios de aceptación: «hoy» es el lunes 9 de noviembre de 2026 en Lima (GMT-5, sin cambio de hora).

const LIMA = 'America/Lima';
const MADRID = 'Europe/Madrid';
// Lunes 9 de noviembre de 2026, 10:00 en Lima
const LUNES_9 = new Date('2026-11-09T10:00:00-05:00');

let n = 0;
const tarea = (datos: Partial<DatosFranja> & { texto: string }): DatosFranja & { texto: string } => ({
  fecha: null,
  horaLimite: null,
  zonaHoraria: LIMA,
  deQuien: null,
  esperadaDesde: null,
  // Cada una creada un minuto después de la anterior
  creadaEn: new Date(Date.parse('2026-11-01T09:00:00-05:00') + ++n * 60_000),
  ...datos,
});
const textos = (lista: { texto: string }[]) => lista.map((t) => t.texto);

describe('tareas.franja-y-orden', () => {
  describe('franja (H-TP-04)', () => {
    it.each([
      ['sin fecha ni persona', {}, 'sin_fecha'],
      ['con fecha', { fecha: '2026-11-14' }, 'con_fecha'],
      ['con fecha y hora límite', { fecha: '2026-11-14', horaLimite: '18:00' }, 'con_fecha'],
      ['de alguien, sin fecha', { deQuien: 'Juan' }, 'esperando'],
      ['de alguien y con fecha: solo esperando', { deQuien: 'Juan', fecha: '2026-11-16' }, 'esperando'],
    ] as const)('%s', (_, datos, franja) => {
      expect(franjaDe(tarea({ texto: 'x', ...datos }))).toBe(franja);
    });
  });

  describe('vencida (REQ-CUN03-07)', () => {
    it('sin hora límite, vence al día siguiente de su fecha en la zona del perfil', () => {
      const dni = tarea({ texto: 'Renovar el DNI', fecha: '2026-11-06' });
      expect(vencida(dni, new Date('2026-11-06T23:59:00-05:00'), LIMA)).toBe(false);
      expect(vencida(dni, new Date('2026-11-07T00:00:00-05:00'), LIMA)).toBe(true);
      expect(vencida(dni, LUNES_9, LIMA)).toBe(true);
    });

    it('con hora límite, vence en ese minuto de su zona', () => {
      const recibo = tarea({ texto: 'Pagar el recibo', fecha: '2026-11-14', horaLimite: '18:00' });
      expect(instanteLimite(recibo)?.toISOString()).toBe('2026-11-14T23:00:00.000Z');
      expect(vencida(recibo, new Date('2026-11-14T17:59:00-05:00'), LIMA)).toBe(false);
      expect(vencida(recibo, new Date('2026-11-14T18:00:00-05:00'), LIMA)).toBe(true);
    });

    it('sin fecha nunca vence', () => {
      expect(vencida(tarea({ texto: 'Llamar al dentista' }), LUNES_9, LIMA)).toBe(false);
      expect(instanteLimite(tarea({ texto: 'x' }))).toBeNull();
    });

    it('tras un cambio de zona del perfil, la tarea conserva su día (H-TP-03)', () => {
      // Registrada en Lima para el viernes 6. El perfil pasa a Madrid (GMT+1).
      const dni = tarea({ texto: 'Renovar el DNI', fecha: '2026-11-06', zonaHoraria: LIMA });
      // Sábado 7 a las 00:30 en Madrid es aún viernes 6 a las 18:30 en Lima: para la persona ya es otro día
      const madrugada = new Date('2026-11-07T00:30:00+01:00');
      expect(vencida(dni, madrugada, MADRID)).toBe(true);
      expect(vencida(dni, madrugada, LIMA)).toBe(false);
      // Con hora límite, manda el instante en la zona en que se dijo
      const conHora = tarea({ texto: 'Enviar', fecha: '2026-11-06', horaLimite: '20:00', zonaHoraria: LIMA });
      expect(vencida(conHora, madrugada, MADRID)).toBe(false);
      expect(textoCuando(conHora, new Date('2026-11-05T12:00:00+01:00'), MADRID)).toBe('Viernes 6 de noviembre · Antes de las 20:00, hora de Lima');
    });

    it('vencer no cambia ningún dato de la tarea', () => {
      const dni = tarea({ texto: 'Renovar el DNI', fecha: '2026-11-06' });
      const copia = { ...dni };
      vencida(dni, LUNES_9, LIMA);
      ordenarPorFranja([dni], LUNES_9, LIMA);
      expect(dni).toEqual(copia);
    });
  });

  describe('orden (H-TP-05)', () => {
    it('con fecha: vencidas primero, después por fecha y hora', () => {
      const lista = [
        tarea({ texto: 'Pagar el recibo', fecha: '2026-11-14' }),
        tarea({ texto: 'Comprar regalo', fecha: '2026-11-14', horaLimite: '12:00' }),
        tarea({ texto: 'Renovar el DNI', fecha: '2026-11-06' }),
        tarea({ texto: 'Enviar la tesis', fecha: '2026-11-10' }),
        tarea({ texto: 'Devolver el libro', fecha: '2026-11-02' }),
      ];
      expect(textos(ordenar('con_fecha', lista, LUNES_9, LIMA))).toEqual([
        'Devolver el libro',
        'Renovar el DNI',
        'Enviar la tesis',
        'Comprar regalo',
        'Pagar el recibo',
      ]);
    });

    it('sin fecha: de la más reciente a la más antigua', () => {
      const lista = [tarea({ texto: 'Primera' }), tarea({ texto: 'Segunda' }), tarea({ texto: 'Tercera' })];
      expect(textos(ordenar('sin_fecha', lista, LUNES_9, LIMA))).toEqual(['Tercera', 'Segunda', 'Primera']);
    });

    it('esperando: primero las pasadas de fecha, después la que más lleva esperando', () => {
      const lista = [
        tarea({ texto: 'Fotos', deQuien: 'Ana', esperadaDesde: '2026-11-08' }),
        tarea({ texto: 'Presupuesto', deQuien: 'Juan', esperadaDesde: '2026-11-03' }),
        tarea({ texto: 'Informe', deQuien: 'María Fernanda', esperadaDesde: '2026-11-07', fecha: '2026-11-08' }),
        tarea({ texto: 'Contrato', deQuien: 'Luis', esperadaDesde: '2026-11-05', fecha: '2026-11-20' }),
      ];
      expect(textos(ordenar('esperando', lista, LUNES_9, LIMA))).toEqual(['Informe', 'Presupuesto', 'Contrato', 'Fotos']);
    });

    it('las tres franjas, en su orden y cada tarea en una sola (criterio de REQ-CUN03-06)', () => {
      const lista = [
        tarea({ texto: 'Pagar el recibo', fecha: '2026-11-14' }),
        tarea({ texto: 'Presupuesto', deQuien: 'Juan', esperadaDesde: '2026-11-03', fecha: '2026-11-16' }),
        tarea({ texto: 'Llamar al dentista' }),
        tarea({ texto: 'Renovar el DNI', fecha: '2026-11-06' }),
      ];
      expect(textos(ordenarPorFranja(lista, LUNES_9, LIMA))).toEqual(['Renovar el DNI', 'Pagar el recibo', 'Llamar al dentista', 'Presupuesto']);
    });
  });

  describe('textos en la zona del perfil (REQ-CUN03-04 a 07)', () => {
    it('con fecha, vencida y con hora límite', () => {
      expect(textoCuando(tarea({ texto: 'x', fecha: '2026-11-14' }), LUNES_9, LIMA)).toBe('Sábado 14 de noviembre');
      expect(textoCuando(tarea({ texto: 'x', fecha: '2026-11-14', horaLimite: '18:00' }), LUNES_9, LIMA)).toBe('Sábado 14 de noviembre · Antes de las 18:00');
      expect(textoCuando(tarea({ texto: 'x', fecha: '2026-11-06' }), LUNES_9, LIMA)).toBe('Vencía el viernes 6 de noviembre');
      expect(textoCuando(tarea({ texto: 'x' }), LUNES_9, LIMA)).toBeNull();
    });

    it('lo que se espera: de quién, desde cuándo y cuándo debía llegar', () => {
      const presupuesto = tarea({ texto: 'Presupuesto', deQuien: 'Juan', esperadaDesde: '2026-11-03', fecha: '2026-11-16' });
      expect(textoEspera(presupuesto, LUNES_9, LIMA)).toBe('De Juan · Desde el martes 3 de noviembre, hace 6 días');
      expect(textoCuando(presupuesto, LUNES_9, LIMA)).toBe('Para el lunes 16 de noviembre');
      expect(textoCuando(presupuesto, new Date('2026-11-17T09:00:00-05:00'), LIMA)).toBe('Debía llegar el lunes 16 de noviembre');
      expect(textoEspera(tarea({ texto: 'x', deQuien: 'Ana', esperadaDesde: '2026-11-09' }), LUNES_9, LIMA)).toBe('De Ana · Desde hoy');
      expect(textoEspera(tarea({ texto: 'x' }), LUNES_9, LIMA)).toBeNull();
    });

    it('hecha y recibido, con el día en que se marcó', () => {
      const domingo = new Date('2026-11-08T21:00:00-05:00');
      expect(textoCierre({ deQuien: null, hechaEn: domingo }, LIMA)).toBe('Hecha el domingo 8 de noviembre');
      expect(textoCierre({ deQuien: 'Juan', hechaEn: new Date('2026-11-16T10:00:00-05:00') }, LIMA)).toBe('Recibido el lunes 16 de noviembre');
      // El día es el de la zona del perfil: las 21:00 del domingo en Lima ya son lunes en Madrid
      expect(textoCierre({ deQuien: null, hechaEn: domingo }, MADRID)).toBe('Hecha el lunes 9 de noviembre');
      expect(textoCierre({ deQuien: null, hechaEn: null }, LIMA)).toBeNull();
    });
  });
});
