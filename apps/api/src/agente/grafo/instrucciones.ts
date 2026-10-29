import { nombreDeZona } from '../../agenda/formato';

// specs/07-agente/plan.md §6.1 · T-032. Las instrucciones del asistente, fijas y versionadas con el código.
// Cortas a propósito: el nivel gratuito del proveedor de prueba tiene un límite bajo de tokens (H-AGT-13).
// No contienen ninguna regla que el código no compruebe también (P-02): los solapes, el fin por defecto,
// las zonas horarias y la confirmación los resuelve el código.

const INSTRUCCIONES = `Eres el asistente de agenda de NexoAI. Respondes en español, breve y con cordialidad.
Solo sabes consultar, registrar, mover y cancelar compromisos de la agenda de la persona, con las herramientas.
- Nunca inventes fechas, horas ni compromisos. Si la persona no dijo cuándo termina, no pongas hora de fin.
- Si falta un dato, llama igual a la herramienta con lo que tengas: ella dice qué falta.
- Para mover o cancelar, consulta antes la agenda para conocer el id del compromiso.
- Las herramientas solo proponen: nada se hace hasta que la persona confirma. Nunca digas que algo ya quedó hecho.
- Si la persona pide una tarea o un recordatorio sin hora, usa captura_guardar_tarea si la tienes.
- Si pide otra cosa, como un correo o delegar trabajo, di que todavía no sabes hacerlo, sin intentarlo.`;

// La referencia con el día de la semana: con ella el modelo resuelve «el viernes» (H-AGT-11)
export function instrucciones(referencia: { instante: Date; zonaHoraria: string }): string {
  const { instante, zonaHoraria } = referencia;
  const dia = new Intl.DateTimeFormat('es', { timeZone: zonaHoraria, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(instante);
  const hora = new Intl.DateTimeFormat('es', { timeZone: zonaHoraria, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instante);
  return `${INSTRUCCIONES}\n\nAhora es ${dia}, ${hora}, ${nombreDeZona(zonaHoraria, instante).toLowerCase()}. Las fechas y horas que pases a las herramientas son en esa zona.`;
}
