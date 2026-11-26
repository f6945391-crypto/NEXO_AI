import { diaDeLaSemana, enZona, instanteLocal, sumarDias, type FechaLocal } from '../../agenda/dominio/tiempo';

// specs/10-reuniones/plan.md §3 · T-131 · REQ-CUN06-03, 04, 05, 08 · RN-CAL-01, P-02, P-05.
// Funciones puras: qué días entran, quién está libre en cada media hora y qué horarios se proponen.
// Solo se usa el inicio y el fin de lo ocupado, nunca el título ni el detalle (P-10).

export const FRANJA_MINUTOS = 30;
// Banda habitual de RN-CAL-01, de 08:00 a 20:00, en la zona de cada persona
export const BANDA = { desde: 8 * 60, hasta: 20 * 60 } as const;
// D-REU-21: «por la mañana» y «por la tarde», en la zona de quien convoca
export const FRANJAS = { manana: { desde: 8 * 60, hasta: 13 * 60 }, tarde: { desde: 13 * 60, hasta: 20 * 60 } } as const;
export type Franja = keyof typeof FRANJAS;
// D-REU-02
export const MAXIMO_PROPUESTAS = 3;

export interface Intervalo {
  inicio: Date;
  fin: Date;
}

export interface PersonaCalculo {
  perfilId: string;
  zonaHoraria: string;
  opcional: boolean;
  // null: sin datos (no autorizó o su calendario no se puede leer). No cuenta (D-REU-03)
  ocupados: Intervalo[] | null;
}

export interface DiaMapa {
  fecha: string; // AAAA-MM-DD en la zona de quien convoca
  franjas: { inicio: Date; libres: string[] }[];
}

export interface PropuestaCalculada {
  inicio: Date;
  fin: Date;
  libres: number;
  de: number;
  opcionalesLibres: number;
}

const fechaTexto = (f: FechaLocal) => `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;

export function fechaDeTexto(texto: string): FechaLocal {
  const [anio = 0, mes = 1, dia = 1] = texto.split('-').map(Number);
  return { anio, mes, dia };
}

// Los días hábiles (lunes a viernes) entre dos fechas, incluidas
export function diasHabiles(desde: FechaLocal, hasta: FechaLocal): FechaLocal[] {
  const dias: FechaLocal[] = [];
  for (let d = desde; Date.UTC(d.anio, d.mes - 1, d.dia) <= Date.UTC(hasta.anio, hasta.mes - 1, hasta.dia); d = sumarDias(d, 1)) {
    const semana = diaDeLaSemana(d);
    if (semana !== 0 && semana !== 6) dias.push(d);
    if (dias.length > 31) break;
  }
  return dias;
}

// REQ-CUN06-03: sin días dichos, los próximos cinco días hábiles a partir de mañana
export function rangoPorDefecto(ahora: Date, zona: string): { desde: FechaLocal; hasta: FechaLocal } {
  const hoy = enZona(ahora, zona);
  const dias: FechaLocal[] = [];
  for (let d = sumarDias(hoy, 1); dias.length < 5; d = sumarDias(d, 1)) {
    const semana = diaDeLaSemana(d);
    if (semana !== 0 && semana !== 6) dias.push(d);
  }
  return { desde: dias[0]!, hasta: dias[dias.length - 1]! };
}

// La persona está libre en [inicio, fin) si cae dentro de su banda, en su zona, y no se cruza con nada suyo
export function libreEn(persona: PersonaCalculo, inicio: Date, fin: Date): boolean {
  if (!persona.ocupados) return false;
  const a = enZona(inicio, persona.zonaHoraria);
  const b = enZona(new Date(fin.getTime() - 1), persona.zonaHoraria);
  if (a.anio !== b.anio || a.mes !== b.mes || a.dia !== b.dia) return false;
  if (a.minutos < BANDA.desde || b.minutos + 1 > BANDA.hasta) return false;
  return !persona.ocupados.some((o) => o.inicio < fin && o.fin > inicio);
}

// Las filas del mapa: la banda del día en la zona de quien convoca, o la franja pedida
function limites(franja: Franja | null) {
  return franja ? FRANJAS[franja] : BANDA;
}

// REQ-CUN06-08: por día hábil y por media hora, quién de los que tienen datos está libre en toda la franja
export function calcularMapa(dias: FechaLocal[], zona: string, franja: Franja | null, personas: PersonaCalculo[]): DiaMapa[] {
  const { desde, hasta } = limites(franja);
  const conDatos = personas.filter((p) => p.ocupados);
  return dias.map((dia) => {
    const franjas: DiaMapa['franjas'] = [];
    for (let m = desde; m + FRANJA_MINUTOS <= hasta; m += FRANJA_MINUTOS) {
      const inicio = instanteLocal(dia, m, zona);
      const fin = instanteLocal(dia, m + FRANJA_MINUTOS, zona);
      franjas.push({ inicio, libres: conDatos.filter((p) => libreEn(p, inicio, fin)).map((p) => p.perfilId) });
    }
    return { fecha: fechaTexto(dia), franjas };
  });
}

// REQ-CUN06-04 · D-REU-02, D-REU-19: hasta tres horarios con todos los obligatorios con datos libres,
// la duración completa, dentro de la banda, en el futuro y cada 30 minutos. Primero los de más opcionales
// libres y después los más cercanos; uno por día mientras alcancen, y sin solaparse entre sí.
export function calcularPropuestas(
  dias: FechaLocal[],
  zona: string,
  franja: Franja | null,
  duracionMinutos: number,
  personas: PersonaCalculo[],
  ahora: Date,
  maximo = MAXIMO_PROPUESTAS,
): PropuestaCalculada[] {
  const { desde, hasta } = limites(franja);
  const conDatos = personas.filter((p) => p.ocupados);
  const obligatorios = conDatos.filter((p) => !p.opcional);
  const opcionales = conDatos.filter((p) => p.opcional);
  const candidatas: (PropuestaCalculada & { dia: string })[] = [];
  for (const dia of dias) {
    for (let m = desde; m + duracionMinutos <= hasta; m += FRANJA_MINUTOS) {
      const inicio = instanteLocal(dia, m, zona);
      if (inicio <= ahora) continue;
      const fin = new Date(inicio.getTime() + duracionMinutos * 60_000);
      if (!obligatorios.every((p) => libreEn(p, inicio, fin))) continue;
      const opcionalesLibres = opcionales.filter((p) => libreEn(p, inicio, fin)).length;
      candidatas.push({ inicio, fin, libres: obligatorios.length + opcionalesLibres, de: conDatos.length, opcionalesLibres, dia: fechaTexto(dia) });
    }
  }
  candidatas.sort((a, b) => b.opcionalesLibres - a.opcionalesLibres || a.inicio.getTime() - b.inicio.getTime());

  const elegidas: typeof candidatas = [];
  const dias_ = new Set<string>();
  for (const c of candidatas) {
    if (elegidas.length >= maximo) break;
    if (dias_.has(c.dia)) continue;
    elegidas.push(c);
    dias_.add(c.dia);
  }
  for (const c of candidatas) {
    if (elegidas.length >= maximo) break;
    if (elegidas.some((e) => e.inicio < c.fin && e.fin > c.inicio)) continue;
    elegidas.push(c);
  }
  return elegidas.map(({ dia: _dia, ...p }) => p);
}
