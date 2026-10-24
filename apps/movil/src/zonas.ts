// Zonas horarias para elegir en el primer ingreso (T-028, REQ-ACC-05). Las que conoce el dispositivo; si el
// motor de JavaScript del teléfono no da la lista, una corta de respaldo, con la del propio teléfono.

const RESPALDO = [
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Caracas',
  'America/Guayaquil',
  'America/La_Paz',
  'America/Lima',
  'America/Mexico_City',
  'America/Montevideo',
  'America/New_York',
  'America/Santiago',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Madrid',
  'UTC',
];

export type Zona = { valor: string; etiqueta: string };

// «America/Lima · GMT-5»: toda hora debe dejar saber en qué huso está (design/CONTEXTO.md).
export function etiquetarZona(zona: string): string {
  try {
    const partes = new Intl.DateTimeFormat('es', { timeZone: zona, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const desfase = partes.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return `${zona.replaceAll('_', ' ')} · ${desfase}`;
  } catch {
    return zona;
  }
}

export function zonaDelTelefono(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export function zonasDisponibles(): Zona[] {
  const intl = Intl as unknown as { supportedValuesOf?: (clave: string) => string[] };
  let nombres: string[];
  try {
    nombres = intl.supportedValuesOf?.('timeZone') ?? RESPALDO;
  } catch {
    nombres = RESPALDO;
  }
  const todas = new Set(nombres);
  const propia = zonaDelTelefono();
  if (propia) todas.add(propia);
  return [...todas].sort().map((valor) => ({ valor, etiqueta: etiquetarZona(valor) }));
}
