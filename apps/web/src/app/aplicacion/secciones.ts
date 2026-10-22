// Las tres secciones, iguales en web y móvil (R-32). Cada una con sus niveles o franjas y sus ejemplos
// de lo que se le puede pedir al asistente, que la conversación ofrece como punto de partida.

export type Seccion = 'agenda' | 'tareas' | 'actividad';

export const SECCIONES: Record<
  Seccion,
  { nombre: string; pregunta: string; cortes: string[]; ejemplos: string[] }
> = {
  agenda: {
    nombre: 'Agenda',
    pregunta: 'Lo que va a pasar',
    cortes: ['Hoy', 'Semana', 'Mes'],
    ejemplos: [
      'Agéndame una reunión con Vasco el viernes a las 10',
      '¿Qué tengo mañana por la tarde?',
      'Mueve el comité de arquitectura al jueves',
    ],
  },
  tareas: {
    nombre: 'Tareas',
    pregunta: 'Lo que hay que hacer',
    // R-38: Tareas no tiene niveles de período, tiene franjas.
    cortes: ['Con fecha', 'Sin fecha', 'Esperando de alguien'],
    ejemplos: [
      'Recuérdame llamar al dentista',
      'Pídele a María Fernanda el informe para el lunes',
      '¿Qué tengo pendiente esta semana?',
    ],
  },
  actividad: {
    nombre: 'Actividad',
    pregunta: 'Lo que pasó',
    cortes: ['Día', 'Semana', 'Mes'],
    ejemplos: ['¿Cuánto tiempo dediqué hoy a la tesis?', 'Resume mi semana', '¿Qué hizo el asistente por mí ayer?'],
  },
};
