// Fechas para las pruebas de agenda, relativas al día en que corren (T-018): un viernes al menos diez días
// adelante, dentro de la ventana de la réplica y nunca en el pasado. Las horas son de Lima, que no cambia
// de hora.

const DIA_MS = 24 * 3600_000;

function viernesProximo(): string {
  const d = new Date(Date.now() + 10 * DIA_MS);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export const VIERNES = viernesProximo();
export const enLima = (hora: string, dia = VIERNES) => `${dia}T${hora}:00-05:00`;
export const instante = (hora: string, dia = VIERNES) => new Date(enLima(hora, dia));
export const diaSiguiente = (dia = VIERNES) => new Date(Date.parse(`${dia}T12:00:00Z`) + DIA_MS).toISOString().slice(0, 10);
export const fechaEnLima = (hora: string, dia = VIERNES) =>
  new Intl.DateTimeFormat('es', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(instante(hora, dia));
