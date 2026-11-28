import type { Periodo } from '@nexoai/contratos';
import { diaDeLaSemana, enZona, sumarDias, type FechaLocal } from '../../agenda/dominio/tiempo';

// specs/07-agente/plan.md §16.2 · T-157 · decisión 39. Los días de un período dicho con palabras, calculados por el
// código en la zona de la persona y nunca por el modelo. Las semanas van de lunes a domingo (decisión 20 de
// 02-agenda); el mes, del día 1 al último.

export const aIso = (f: FechaLocal) => `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;

const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

export function diasDelPeriodo(periodo: Periodo, referencia: { instante: Date; zonaHoraria: string }): { desde: string; hasta: string } {
  const hoy = enZona(referencia.instante, referencia.zonaHoraria);
  const dia: FechaLocal = { anio: hoy.anio, mes: hoy.mes, dia: hoy.dia };
  // Lunes de esta semana: el domingo es el último día, no el primero
  const lunes = sumarDias(dia, -((diaDeLaSemana(dia) + 6) % 7));
  switch (periodo) {
    case 'hoy':
      return { desde: aIso(dia), hasta: aIso(dia) };
    case 'manana':
      return { desde: aIso(sumarDias(dia, 1)), hasta: aIso(sumarDias(dia, 1)) };
    case 'esta_semana':
      return { desde: aIso(lunes), hasta: aIso(sumarDias(lunes, 6)) };
    case 'semana_siguiente':
      return { desde: aIso(sumarDias(lunes, 7)), hasta: aIso(sumarDias(lunes, 13)) };
    case 'este_mes':
      return { desde: aIso({ ...dia, dia: 1 }), hasta: aIso({ ...dia, dia: diasDelMes(dia.anio, dia.mes) }) };
    case 'mes_siguiente': {
      const anio = dia.mes === 12 ? dia.anio + 1 : dia.anio;
      const mes = dia.mes === 12 ? 1 : dia.mes + 1;
      return { desde: aIso({ anio, mes, dia: 1 }), hasta: aIso({ anio, mes, dia: diasDelMes(anio, mes) }) };
    }
  }
}
