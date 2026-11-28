import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ArgsDesglosar, type ClaseParte, type Desglose, type Periodo, type TurnoDeHerramienta } from '@nexoai/contratos';
import { diaLargo, mayuscula } from '../../tareas/dominio/formato';
import { EjecutorHerramientas } from './ejecutor-herramientas';
import type { EntornoHerramienta, ResultadoHerramienta } from './herramienta';
import { diasDelPeriodo } from './periodo';

// specs/07-agente/plan.md §16.1 · T-157 · REQ-AGT-09 · decisión 38. Una frase con varias cosas: el modelo solo la
// separa en partes; **el texto de cada línea lo arma el código**, con los días del período calculados por él y lo
// que falta marcado. No propone nada: después, cada consulta se responde y cada acción tiene su tarjeta.

const CUANTAS = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];
// Las partes que terminan en una tarjeta: el grafo sigue con la siguiente al decidir una (plan §16.1)
export const CLASES_CON_TARJETA: ReadonlySet<ClaseParte> = new Set(['compromiso', 'tarea', 'reunion']);

const NOMBRE_PERIODO: Readonly<Record<Periodo, string>> = {
  hoy: 'de hoy',
  manana: 'de mañana',
  esta_semana: 'de esta semana',
  semana_siguiente: 'de la semana siguiente',
  este_mes: 'de este mes',
  mes_siguiente: 'del mes siguiente',
};

type Parte = ArgsDesglosar['partes'][number];

function cuando(parte: Parte, referencia: EntornoHerramienta['referencia']): string | null {
  if (parte.periodo) {
    const { desde, hasta } = diasDelPeriodo(parte.periodo, referencia);
    return desde === hasta ? `${NOMBRE_PERIODO[parte.periodo]} (${diaLargo(desde)})` : `${NOMBRE_PERIODO[parte.periodo]}, del ${diaLargo(desde)} al ${diaLargo(hasta)}`;
  }
  return parte.fecha ? `del ${diaLargo(parte.fecha)}` : null;
}

const horario = (parte: Parte) => (parte.horaInicio ? (parte.horaFin ? ` de ${parte.horaInicio} a ${parte.horaFin}` : ` a las ${parte.horaInicio}`) : '');

export function armarDesglose(partes: Parte[], referencia: EntornoHerramienta['referencia']): Desglose {
  const lineas = partes.map((parte) => {
    const periodo = cuando(parte, referencia);
    switch (parte.clase) {
      case 'consulta_agenda':
        return { clase: parte.clase, texto: periodo ? `Tus compromisos ${periodo}` : `Tus compromisos: ${parte.que}`, falta: null };
      case 'consulta_tareas':
        return { clase: parte.clase, texto: periodo ? `Tus tareas pendientes ${periodo}` : `Tus tareas pendientes: ${parte.que}`, falta: null };
      case 'compromiso': {
        const dia = parte.fecha ? `, el ${diaLargo(parte.fecha)}` : '';
        const falta = !parte.fecha && !parte.horaInicio ? 'Falta el día y la hora' : !parte.fecha ? 'Falta el día' : !parte.horaInicio ? 'Falta la hora' : null;
        return { clase: parte.clase, texto: `Un compromiso «${parte.que}»${dia}${horario(parte)}`, falta };
      }
      case 'tarea':
        return { clase: parte.clase, texto: `Una tarea: «${parte.que}»${parte.fecha ? `, para el ${diaLargo(parte.fecha)}` : ''}`, falta: null };
      case 'reunion':
        return { clase: parte.clase, texto: `Una reunión: ${parte.que}`, falta: null };
      default:
        return { clase: parte.clase, texto: mayuscula(parte.que), falta: null };
    }
  });
  return { titulo: `Entendí ${CUANTAS[partes.length] ?? partes.length} cosas:`, partes: lineas };
}

@Injectable()
export class HerramientasAsistente implements OnModuleInit {
  constructor(private readonly ejecutor: EjecutorHerramientas) {}

  onModuleInit(): void {
    this.ejecutor.registrar({
      nombre: 'asistente.desglosar',
      descripcion:
        'Si la frase pide dos cosas o más, llámala primero, con cada parte en el orden de la frase. Muestra a la persona lo que entendiste; no hace ni propone nada. Después atiende cada parte con su herramienta.',
      esquema: ArgsDesglosar,
      ejecutar: (_contexto, args, entorno) => this.desglosar(args, entorno),
    });
  }

  private async desglosar(args: ArgsDesglosar, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    const desglose = armarDesglose(args.partes, entorno.referencia);
    const turno: TurnoDeHerramienta = { tipo: 'desglose', desglose };
    return {
      paraModelo: {
        acciones: args.partes.filter((p) => CLASES_CON_TARJETA.has(p.clase)).length,
        nota: 'La persona ya ve esta lista. Sigue en el mismo orden: las consultas ahora, y las acciones de una en una con su herramienta. No repitas la lista.',
      },
      turno,
    };
  }
}
