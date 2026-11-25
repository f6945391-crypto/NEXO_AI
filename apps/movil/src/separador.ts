import type { CierreEpisodio, EpisodioAsistente, TurnoAsistente } from '@nexoai/contratos';

// T-039 · REQ-AGT-03 · design/ARQUITECTURA-VISUAL-MOVIL.md, revisión del 5 de noviembre de 2026 (copia de apps/web/src/lib/separador.ts: mismos textos en las dos plataformas). Lo que
// separa un episodio del siguiente. El desenlace lo decidió el servidor; aquí solo se escribe, sin
// vocabulario interno (R-40): nunca «episodio», «turno» ni «transcripción». La frase empieza por el verbo
// para que concuerde con cualquier título: «Se registró «Revisión»».

const QUE_PASO: Record<CierreEpisodio['desenlace'], (titulo: string | null) => string | null> = {
  registrado: (t) => (t ? `Se registró «${t}»` : 'Compromiso registrado'),
  movido: (t) => (t ? `Se movió «${t}»` : 'Compromiso movido'),
  cancelado: (t) => (t ? `Se canceló «${t}»` : 'Compromiso cancelado'),
  descartado: (t) => (t ? `Se descartó «${t}»` : 'Propuesta descartada'),
  guardado: () => 'Tarea guardada',
  // T-046 · 09-tareas-personales plan §8: lo que se hizo con una tarea por conversación
  hecho: (t) => (t ? `Se marcó hecha «${t}»` : 'Tarea hecha'),
  reabierto: (t) => (t ? `Se reabrió «${t}»` : 'Tarea reabierta'),
  cambiado: (t) => (t ? `Se cambió «${t}»` : 'Tarea cambiada'),
  quitado: (t) => (t ? `Se descartó la tarea «${t}»` : 'Tarea descartada'),
  anotado: (t) => (t ? `Se anotó un avance en «${t}»` : 'Avance anotado'),
  sin_accion: () => null,
};

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

// «Viernes 6, 20:42 · Se registró «Reunión»»
export function textoDelSeparador(cierre: CierreEpisodio, zona: string): string {
  const fecha = new Date(cierre.en);
  const dia = new Intl.DateTimeFormat('es-PE', { weekday: 'long', timeZone: zona }).format(fecha);
  const numero = new Intl.DateTimeFormat('es-PE', { day: 'numeric', timeZone: zona }).format(fecha);
  const hora = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zona }).format(fecha);
  const que = QUE_PASO[cierre.desenlace](cierre.titulo);
  return `${mayuscula(dia)} ${numero}, ${hora}${que ? ` · ${que}` : ''}`;
}

// Lo que se pinta en la lista: los turnos de cada episodio y, tras uno cerrado, su separador
export type Elemento = { clase: 'turno'; turno: TurnoAsistente } | { clase: 'separador'; id: string; cierre: CierreEpisodio };

export function elementosDe(episodios: EpisodioAsistente[]): Elemento[] {
  return episodios.flatMap((episodio): Elemento[] => [
    ...episodio.turnos.map((turno): Elemento => ({ clase: 'turno', turno })),
    ...(episodio.cierre ? [{ clase: 'separador' as const, id: `separador-${episodio.id}`, cierre: episodio.cierre }] : []),
  ]);
}
