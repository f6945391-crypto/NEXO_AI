export type Seccion = 'agenda' | 'tareas' | 'actividad' | 'equipo';

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
    ejemplos: [
      '¿Cuánto tiempo dediqué hoy a la tesis?',
      'Resume mi semana',
      '¿Qué hizo el asistente por mí ayer?',
    ],
  },
  equipo: {
    nombre: 'Equipo',
    pregunta: 'Encuentra un horario para reunirse',
    cortes: ['Disponibilidad'],
    ejemplos: [
      '¿Cuándo está disponible mi equipo mañana?',
      'Busca un horario de 30 minutos para reunirnos',
      '¿Tenemos algún horario libre esta semana?',
    ],
  },
};
