// Textos de la tarjeta de confirmación de agenda (RN-ER-03): la acción exacta y sus datos, con la hora
// en la zona del evento y la zona dicha (REQ-CUN01-10). Los genera el servidor, no el modelo.

const ciudad = (zona: string) => (zona.split('/').pop() ?? zona).replaceAll('_', ' ');

export function fechaLarga(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(instante);
}

export function horario(inicio: Date, fin: Date, zona: string): string {
  const hora = new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dia = new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' });
  // T-043 · REQ-CUN01-01: si el fin cae en otro día, la tarjeta lo dice («23:00 – 00:00 (sábado, 8 de noviembre)»)
  const otroDia = dia.format(inicio) !== dia.format(fin) ? ` (${dia.format(fin)})` : '';
  return `${hora.format(inicio)} – ${hora.format(fin)}${otroDia}`;
}

export function nombreDeZona(zona: string, instante: Date): string {
  const desfase = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'shortOffset' })
    .formatToParts(instante)
    .find((parte) => parte.type === 'timeZoneName')?.value;
  return `Hora de ${ciudad(zona)} (${desfase ?? zona})`;
}
