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
  // T-050, T-051 · 09-tareas-personales: las tareas personales. Una tarea ya no queda en espera: se propone
  {
    si: '^¿?qu[eé] tengo pendiente esta semana\\??$',
    pasos: [{ llamadas: [{ nombre: 'tareas_consultar', argumentos: { desde: '{hoy}', hasta: '{domingo}' } }] }, { texto: '' }],
  },
  {
    si: '^¿?qu[eé] tengo pendiente\\??$',
    pasos: [{ llamadas: [{ nombre: 'tareas_consultar', argumentos: {} }] }, { texto: '' }],
  },
  // REQ-CUN03-02: no se entiende qué hay que hacer; la herramienta lo dice y se pregunta solo eso
  {
    si: `^recu[eé]rdame lo del ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { fecha: '{$1}' } }] }, { texto: '' }],
  },
  {
    si: `^recu[eé]rdame (.+?) (?:antes del|para el|el) ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$1}', fecha: '{$2}' } }] }, { texto: '' }],
  },
  {
    si: '^(?:recu[eé]rdame|tengo que) (.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$1}' } }] }, { texto: '' }],
  },
  // H-TP-14: «pídele a alguien» se registra como algo que se espera de esa persona, sin escribirle
  {
    si: `^p[ií]dele a (.+?) (?:el|la|los|las) (.+?) para el ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$2}', deQuien: '$1', fecha: '{$3}' } }] }, { texto: '' }],
  },
  {
    si: `^(.+?) tiene que (?:enviarme|mandarme|darme) (?:el|la|los|las) (.+?) (?:el|este) ${DIA}(?: que viene)?$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$2}', deQuien: '$1', fecha: '{$3}' } }] }, { texto: '' }],
  },
  {
    si: '^ya (.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_completar', argumentos: { texto: '$1' } }] }, { texto: '' }],
  },
  {
    si: '^reabre (?:la tarea )?(.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_reabrir', argumentos: { texto: '$1' } }] }, { texto: '' }],
  },
  {
    si: '^descarta (?:la tarea )?(.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_descartar', argumentos: { texto: '$1' } }] }, { texto: '' }],
  },
  // REQ-CUN03-16: lo que las tareas personales no hacen se dice, sin intentarlo
  {
    si: '^(?:ponle prioridad|div[ií]dela|hazla repetir|as[ií]gnale)',
    pasos: [{ texto: 'Las tareas personales no tienen prioridades, pasos ni repeticiones, y no se asignan a otras personas. No cambié nada.' }],
  },
];
