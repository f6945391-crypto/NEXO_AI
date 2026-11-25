import { diaEn, diasEntre, franjaDe, vencida, type DatosFranja } from './franja';

// specs/09-tareas-personales/plan.md §2 · T-047 · REQ-CUN03-04 a 07. Los textos de una tarea en la zona del
// perfil, armados por el servidor: la web, el móvil y el asistente dicen lo mismo (R-41, REQ-CUN03-14).
// Sin vocabulario interno (R-40): «Vencía el…», «Debía llegar el…», «Hecha el…», «Recibido el…».

const ciudad = (zona: string) => (zona.split('/').pop() ?? zona).replaceAll('_', ' ');
export const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

// «sábado 14 de noviembre», de un día del calendario: se formatea al mediodía en UTC para que no se corra. Sin
// la coma que pone Intl tras el día de la semana, como lo escriben los criterios de aceptación
const FORMATO_DIA = new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
export const diaLargo = (fecha: string) => FORMATO_DIA.format(new Date(`${fecha}T12:00:00Z`)).replace(',', '');

// «Antes de las 18:00», y la zona si no es la del perfil (H-TP-03)
function horaLimite(tarea: Pick<DatosFranja, 'horaLimite' | 'zonaHoraria'>, zonaPerfil: string): string | null {
  if (!tarea.horaLimite) return null;
  return tarea.zonaHoraria === zonaPerfil ? `Antes de las ${tarea.horaLimite}` : `Antes de las ${tarea.horaLimite}, hora de ${ciudad(tarea.zonaHoraria)}`;
}

// La fecha según la franja: el plazo propio, o cuándo debía llegar lo que se espera (H-TP-04)
export function textoCuando(tarea: DatosFranja, ahora: Date, zonaPerfil: string): string | null {
  if (!tarea.fecha) return null;
  const dia = diaLargo(tarea.fecha);
  const pasada = vencida(tarea, ahora, zonaPerfil);
  const hora = horaLimite(tarea, zonaPerfil);
  if (franjaDe(tarea) === 'esperando') return pasada ? `Debía llegar el ${dia}` : `Para el ${dia}`;
  if (pasada) return `Vencía el ${dia}${tarea.horaLimite ? ` a las ${tarea.horaLimite}` : ''}`;
  return hora ? `${mayuscula(dia)} · ${hora}` : mayuscula(dia);
}

// «De Juan · Desde el martes 3 de noviembre, hace 6 días»
export function textoEspera(tarea: DatosFranja, ahora: Date, zonaPerfil: string): string | null {
  if (!tarea.deQuien) return null;
  const desde = tarea.esperadaDesde ?? diaEn(tarea.creadaEn, zonaPerfil);
  const dias = diasEntre(desde, diaEn(ahora, zonaPerfil));
  const cuanto = dias <= 0 ? 'Desde hoy' : dias === 1 ? `Desde ayer, ${diaLargo(desde)}` : `Desde el ${diaLargo(desde)}, hace ${dias} días`;
  return `De ${tarea.deQuien} · ${cuanto}`;
}

// H-TP-15: lo que se esperaba se da por recibido, con su propio texto
// REQ-CUN03-22, 24 · T-125: «Martes 24 de noviembre, 18:40», en la zona del perfil
export function textoAvance(anotadoEn: Date, zonaPerfil: string): string {
  const hora = new Intl.DateTimeFormat('es', { timeZone: zonaPerfil, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(anotadoEn);
  return `${mayuscula(diaLargo(diaEn(anotadoEn, zonaPerfil)))}, ${hora}`;
}

// REQ-CUN03-28 · H-TP-35: «Resumen al miércoles 25 de noviembre», el día del resumen en la zona del perfil
export function textoResumen(resumenEn: Date, zonaPerfil: string): string {
  return `Resumen al ${diaLargo(diaEn(resumenEn, zonaPerfil))}`;
}

export function textoCierre(tarea: Pick<DatosFranja, 'deQuien'> & { hechaEn: Date | null }, zonaPerfil: string): string | null {
  if (!tarea.hechaEn) return null;
  const dia = diaLargo(diaEn(tarea.hechaEn, zonaPerfil));
  return tarea.deQuien ? `Recibido el ${dia}` : `Hecha el ${dia}`;
}
