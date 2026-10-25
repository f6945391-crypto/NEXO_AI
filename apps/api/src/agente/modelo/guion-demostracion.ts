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
  // REQ-AGT-02: una tarea queda en espera
  {
    si: '^recu[eé]rdame (.+)$',
    pasos: [{ llamadas: [{ nombre: 'captura_guardar_tarea', argumentos: { texto: '$1', clase: 'tarea' } }] }, { texto: '' }],
  },
];
