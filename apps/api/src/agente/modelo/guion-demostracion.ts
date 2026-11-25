import type { ReglaGuion } from './modelo-simulado';

// H-AGT-02 · T-029. Guion del simulado para demostrar el asistente sin clave (`MODELO_PROVEEDOR=simulado`).
// Cubre los ejemplos de la web y algunas variantes; lo demás recibe «No sé hacer eso todavía». Las
// herramientas a las que llama llegan con T-031. El paso vacío del final deja que el código arme la respuesta.

const DIA = '(hoy|mañana|pasado mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)';
const HORA = '(\\d{1,2}(?::\\d{2})?)';

const consulta = (franja: string, desde: string, hasta: string): ReglaGuion => ({
  si: `^¿?qu[eé] tengo (?:el |este )?${DIA} por la ${franja}\\??$`,
  pasos: [{ llamadas: [{ nombre: 'agenda_consultar', argumentos: { desde: '{$1}', hasta: '{$1}', horaDesde: desde, horaHasta: hasta } }] }, { texto: '' }],
});

export const GUION_DEMOSTRACION: ReglaGuion[] = [
  {
    si: `^ag[eé]ndame (.+?) (?:el |este |para el )?${DIA} a las ${HORA}$`,
    pasos: [
      { llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: '{titulo:$1}', fecha: '{$2}', horaInicio: '{hora:$3}' } }] },
      { texto: '' },
    ],
  },
  // Sin día ni hora: la herramienta responde que faltan datos y el asistente pregunta el primero (REQ-CUN01-07)
  {
    si: '^ag[eé]ndame (.+)$',
    pasos: [{ llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: '{titulo:$1}' } }] }, { texto: '' }],
  },
  consulta('mañana', '06:00', '12:00'),
  consulta('tarde', '12:00', '20:00'),
  consulta('noche', '20:00', '23:59'),
  {
    si: `^¿?qu[eé] tengo (?:el |este )?${DIA}\\??$`,
    pasos: [{ llamadas: [{ nombre: 'agenda_consultar', argumentos: { desde: '{$1}', hasta: '{$1}' } }] }, { texto: '' }],
  },
  // T-051 · REQ-CUN03-04: lo pendiente, con la lista armada por el código
  {
    si: '^¿?qu[eé] tengo pendiente\\??$',
    pasos: [{ llamadas: [{ nombre: 'tareas_consultar', argumentos: {} }] }, { texto: '' }],
  },
  // T-051 · REQ-CUN03-01: una tarea se propone con tarjeta; la fecha, solo si la persona dijo el día.
  // Un día de la semana solo cuenta precedido de «el», «este» o «para el» («el lunes», «el lunes que
  // viene»): así «antes del sábado» no se parte en título y fecha, y queda sin fecha, sin inventarla.
  // «Hoy», «mañana» y «pasado mañana» van solos. El grupo 2 o el 3 trae el día; el otro llega vacío.
  {
    si: '^recu[eé]rdame (.+?) (?:(?:el|este|para el) (lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?: que viene| próximo| proximo)?|(hoy|mañana|pasado mañana))$',
    pasos: [{ llamadas: [{ nombre: 'captura_guardar_tarea', argumentos: { texto: '{titulo:$1}', clase: 'tarea', fecha: '{$2$3}' } }] }, { texto: '' }],
  },
  {
    si: '^(?:recu[eé]rdame|tengo que) (.+)$',
    pasos: [{ llamadas: [{ nombre: 'captura_guardar_tarea', argumentos: { texto: '{titulo:$1}', clase: 'tarea' } }] }, { texto: '' }],
  },
  // T-051 · REQ-CUN03-07: solo de quién y qué se espera
  {
    si: '^estoy esperando que (\\S+) me (?:mande|envíe|envie|pase) (?:el |la |los |las )?(.+)$',
    pasos: [
      { llamadas: [{ nombre: 'captura_guardar_tarea', argumentos: { texto: '{titulo:$2} de $1', clase: 'esperando_de_alguien', esperaDe: '$1', esperaQue: '$2' } }] },
      { texto: '' },
    ],
  },
];
