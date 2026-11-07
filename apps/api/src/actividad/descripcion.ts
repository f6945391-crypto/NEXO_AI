// T-081 · REQ-CUN02-27 · H-JOR-06. Qué hizo el asistente, en pasado y en palabras llanas (R-40). Un tipo sin
// frase propia, como los de las tareas cuando lleguen, usa el título de la tarjeta que se confirmó.

const FRASES: Readonly<Record<string, string>> = {
  'agenda.registrar': 'Registró un compromiso',
  'agenda.modificar': 'Cambió un compromiso',
  'agenda.cancelar': 'Canceló un compromiso',
  'perfil.cambiar_zona_horaria': 'Cambió tu zona horaria',
};

export function describirAccion(tipo: string, tituloDeLaTarjeta: string | null): string {
  return FRASES[tipo] ?? tituloDeLaTarjeta ?? 'Hizo una acción que confirmaste';
}
