import { z } from 'zod';
import { Fecha, Hora, Instante } from './comunes';
import { ZonaHoraria } from './acceso';
import { OperacionRespuesta } from './operaciones';

// Tareas personales (specs/09-tareas-personales/plan.md §6) · T-046 · CUN-03. La fecha de una tarea es un
// día del calendario de la persona, con una hora límite opcional y la zona en que se dijo (H-TP-03, P-05).
// La franja y «vencida» no se guardan: las calcula el servidor (P-02, H-TP-01).

// Plan §11: límites de longitud, revisables con la evaluación del modelo
export const TEXTO_TAREA_MAXIMO = 200;
export const DE_QUIEN_MAXIMO = 80;
// H-TP-06: las hechas se ven siete días al pie de su franja
export const HECHAS_VISIBLES_DIAS = 7;
// 09-tareas-personales plan §13 · T-125: el contexto de la tarea y el texto de un avance
export const CONTEXTO_TAREA_MAXIMO = 200;
export const AVANCE_MAXIMO = 500;
// H-TP-26: cuántos avances lleva la ficha que ve el modelo
export const AVANCES_EN_FICHA = 3;

const TextoTarea = z.string().trim().min(1).max(TEXTO_TAREA_MAXIMO);
// R-12, REQ-CUN03-04: solo el nombre tal como lo dijo la persona; ningún dato de contacto
const DeQuien = z.string().trim().min(1).max(DE_QUIEN_MAXIMO);
const ContextoTarea = z.string().trim().min(1).max(CONTEXTO_TAREA_MAXIMO);
const TextoAvance = z.string().trim().min(1).max(AVANCE_MAXIMO);

// REQ-CUN03-22 · T-125: un avance de la bitácora, con su momento y su texto en la zona del perfil
export const AvanceTarea = z.strictObject({
  id: z.uuid(),
  texto: z.string(),
  anotadoEn: Instante,
  // «Martes 24 de noviembre, 18:40»
  cuando: z.string(),
});
export type AvanceTarea = z.infer<typeof AvanceTarea>;

export const EstadoTarea = z.enum(['pendiente', 'hecha', 'descartada']);
export type EstadoTarea = z.infer<typeof EstadoTarea>;

// R-38: Tareas no tiene niveles de período, tiene franjas
export const FranjaTarea = z.enum(['con_fecha', 'sin_fecha', 'esperando']);
export type FranjaTarea = z.infer<typeof FranjaTarea>;

// Una tarea tal como sale de la API. Los textos los arma el servidor en la zona del perfil, para que la web
// y el móvil digan lo mismo (REQ-CUN03-06, R-41).
export const TareaPersonal = z.strictObject({
  id: z.uuid(),
  texto: z.string(),
  estado: EstadoTarea,
  franja: FranjaTarea,
  fecha: Fecha.nullable(),
  horaLimite: Hora.nullable(),
  zonaHoraria: z.string().min(1),
  deQuien: z.string().nullable(),
  esperadaDesde: Fecha.nullable(),
  vencida: z.boolean(),
  hechaEn: Instante.nullable(),
  creadaEn: Instante,
  // «Sábado 14 de noviembre · Antes de las 18:00», «Vencía el viernes 6 de noviembre», «Debía llegar el…»
  cuando: z.string().nullable(),
  // «De Juan · Desde el martes 3 de noviembre, hace 6 días»
  espera: z.string().nullable(),
  // «Hecha el domingo 8 de noviembre» o «Recibido el lunes 16 de noviembre» (H-TP-15)
  cierre: z.string().nullable(),
  // REQ-CUN03-26 · T-125: con quién o para qué es
  contexto: z.string().nullable(),
  // REQ-CUN03-22, 24: la bitácora, del avance más reciente al más antiguo
  bitacora: z.array(AvanceTarea),
  // REQ-CUN03-27 · H-TP-31: vencida y sin «Mantener abierta» para su fecha
  avisoVencida: z.boolean(),
});
export type TareaPersonal = z.infer<typeof TareaPersonal>;

// GET /tareas?franja=&hasta=. Con `hasta`, solo «Con fecha» hasta ese día y las vencidas (H-TP-18)
export const ConsultaTareas = z.strictObject({
  franja: FranjaTarea.optional(),
  hasta: Fecha.optional(),
});
export type ConsultaTareas = z.infer<typeof ConsultaTareas>;

export const RespuestaTareas = z.strictObject({
  // «Hora de Lima (GMT-5)»
  zona: z.string(),
  // En el orden de H-TP-05: por franja, y dentro de cada una como dice REQ-CUN03-06
  pendientes: z.array(TareaPersonal),
  // H-TP-06: las de los últimos siete días, de la más reciente a la más antigua
  hechasRecientes: z.array(TareaPersonal),
  // REQ-CUN03-17: lo que estaba en espera y se convirtió en propuesta (T-056); vacío hasta entonces
  porConfirmar: z.array(OperacionRespuesta),
});
export type RespuestaTareas = z.infer<typeof RespuestaTareas>;

// GET /tareas/dia?fecha=
export const ConsultaTareasDelDia = z.strictObject({ fecha: Fecha });
export type ConsultaTareasDelDia = z.infer<typeof ConsultaTareasDelDia>;

export const TareasDelDia = z.strictObject({
  fecha: Fecha,
  zona: z.string(),
  // REQ-CUN03-13: solo el día de hoy suma las vencidas
  esHoy: z.boolean(),
  tareas: z.array(TareaPersonal),
});
export type TareasDelDia = z.infer<typeof TareasDelDia>;

// POST /tareas/:id/hecha y /reabrir (H-TP-07): la tarea como quedó y la Operación que lo hizo (AD-09)
export const ControlTarea = z.strictObject({ tarea: TareaPersonal, operacionId: z.uuid() });
export type ControlTarea = z.infer<typeof ControlTarea>;

const horaConFecha = (c: { fecha?: string | null; horaLimite?: string | null }) => !c.horaLimite || !!c.fecha;
const desdeConQuien = (c: { deQuien?: string | null; esperadaDesde?: string | null }) => !c.esperadaDesde || !!c.deQuien;

// Carga de `tareas.registrar` (REQ-CUN03-01, 02, 04). Solo el texto es obligatorio: sin fecha es una franja,
// no un dato que falta (H-TP-02). La propuesta completa `esperadaDesde` (hoy, si hay `deQuien`) y la zona del
// perfil, y guarda la carga completada: lo registrado es lo mostrado (como en agenda, T-017).
export const CargaRegistrarTarea = z
  .strictObject({
    texto: TextoTarea,
    fecha: Fecha.optional(),
    horaLimite: Hora.optional(),
    deQuien: DeQuien.optional(),
    esperadaDesde: Fecha.optional(),
    zonaHoraria: ZonaHoraria.optional(),
    contexto: ContextoTarea.optional(),
  })
  .refine(horaConFecha, { message: 'la hora límite necesita una fecha', path: ['horaLimite'] })
  .refine(desdeConQuien, { message: 'desde cuándo se espera necesita de quién', path: ['esperadaDesde'] });
export type CargaRegistrarTarea = z.infer<typeof CargaRegistrarTarea>;

// Carga de `tareas.cambiar` (REQ-CUN03-12). Solo lo que cambia; `null` quita la fecha, la hora o la persona.
export const CargaCambiarTarea = z
  .strictObject({
    tareaId: z.uuid(),
    texto: TextoTarea.optional(),
    fecha: Fecha.nullable().optional(),
    horaLimite: Hora.nullable().optional(),
    deQuien: DeQuien.nullable().optional(),
    esperadaDesde: Fecha.nullable().optional(),
    // La completa la propuesta cuando cambia la fecha: la zona en que se dijo la nueva (P-05)
    zonaHoraria: ZonaHoraria.optional(),
    contexto: ContextoTarea.nullable().optional(),
  })
  .refine(({ tareaId: _, zonaHoraria: __, ...cambios }) => Object.values(cambios).some((v) => v !== undefined), 'no dice qué cambiar');
export type CargaCambiarTarea = z.infer<typeof CargaCambiarTarea>;

// Carga de `tareas.completar`, `tareas.recibido`, `tareas.reabrir`, `tareas.descartar` y `tareas.mantener_abierta`
export const CargaTareaExistente = z.strictObject({ tareaId: z.uuid() });
export type CargaTareaExistente = z.infer<typeof CargaTareaExistente>;

// Carga de `tareas.anotar_avance` (REQ-CUN03-21): el texto tal como lo dijo la persona
export const CargaAnotarAvance = z.strictObject({ tareaId: z.uuid(), texto: TextoAvance });
export type CargaAnotarAvance = z.infer<typeof CargaAnotarAvance>;

// ---- Agente (plan §7.1). Fechas y horas en la zona de la persona, sin desfase, como las de agenda ----

export const ArgsConsultarTareas = z
  .strictObject({
    franja: FranjaTarea.optional().describe('Solo esa franja: con_fecha, sin_fecha o esperando'),
    desde: Fecha.optional().describe('Con un período («esta semana»): primer día, AAAA-MM-DD'),
    hasta: Fecha.optional().describe('Con un período: último día, incluido, AAAA-MM-DD'),
  })
  .describe('Lee las tareas pendientes de la persona');
export type ArgsConsultarTareas = z.infer<typeof ArgsConsultarTareas>;

// Todo opcional: si falta el texto, la herramienta lo dice y se pregunta solo eso (REQ-CUN03-02)
export const ArgsRegistrarTarea = z.strictObject({
  texto: TextoTarea.optional().describe('Lo que hay que hacer o lo que se espera, breve, con las palabras de la persona'),
  fecha: Fecha.optional().describe('Solo si la persona dijo para cuándo; si no, omítela'),
  horaLimite: Hora.optional().describe('Solo si dijo «antes de las…»'),
  deQuien: DeQuien.optional().describe('Si es algo que otra persona tiene que darle o hacer: su nombre, tal como lo dijo'),
  contexto: ContextoTarea.optional().describe('Solo si dijo con quién o para qué es («lo veo con Juan y Rosa»), con sus palabras'),
});
export type ArgsRegistrarTarea = z.infer<typeof ArgsRegistrarTarea>;

export const ArgsCambiarTarea = z.strictObject({
  tareaId: z.uuid().describe('Id de la tarea, tal como lo dio tareas_consultar'),
  texto: TextoTarea.optional(),
  fecha: Fecha.nullable().optional().describe('Fecha nueva; null para quitarla'),
  horaLimite: Hora.nullable().optional().describe('Hora límite nueva; null para quitarla'),
  deQuien: DeQuien.nullable().optional().describe('De quién se espera; null para quitarlo'),
  contexto: ContextoTarea.nullable().optional().describe('Con quién o para qué es; null para quitarlo'),
});
export type ArgsCambiarTarea = z.infer<typeof ArgsCambiarTarea>;

// T-126 · REQ-CUN03-21 · H-TP-26: la tarea por su id (mirando la ficha que dio tareas_consultar) o por lo que dijo
export const ArgsAnotarAvance = z
  .strictObject({
    tareaId: z.uuid().optional().describe('Id de la tarea, si por su ficha en tareas_consultar sabes cuál es'),
    tarea: z.string().trim().min(1).max(TEXTO_TAREA_MAXIMO).optional().describe('Si no sabes el id: lo que dijo la persona para nombrar la tarea'),
    avance: TextoAvance.optional().describe('Cómo va, con las palabras de la persona, sin resumirlo; lo que falta hacer va aquí'),
  })
  .refine(({ tareaId, tarea }) => !!tareaId || !!tarea, 'falta qué tarea');
export type ArgsAnotarAvance = z.infer<typeof ArgsAnotarAvance>;

// T-051: la tarea por su id o por lo que dijo la persona; si varias encajan, el código muestra las candidatas
export const ArgsTareaExistente = z
  .strictObject({
    tareaId: z.uuid().optional().describe('Id de la tarea, si lo sabes por tareas_consultar'),
    texto: z.string().trim().min(1).max(TEXTO_TAREA_MAXIMO).optional().describe('Si no sabes el id: lo que dijo la persona para nombrarla'),
  })
  .refine(({ tareaId, texto }) => !!tareaId || !!texto, 'falta qué tarea');
export type ArgsTareaExistente = z.infer<typeof ArgsTareaExistente>;

// REQ-CUN03-14: la respuesta a «¿qué tengo pendiente?» la arma el código, tal como está registrada
export const TareaListada = z.strictObject({
  id: z.uuid(),
  texto: z.string(),
  franja: FranjaTarea,
  cuando: z.string().nullable(),
  espera: z.string().nullable(),
  vencida: z.boolean(),
});
export type TareaListada = z.infer<typeof TareaListada>;

export const ListaTareas = z.strictObject({
  // «Pendientes» o «Pendientes del lunes 9 al domingo 15 de noviembre»
  alcance: z.string(),
  zona: z.string(),
  grupos: z.array(z.strictObject({ franja: FranjaTarea, nombre: z.string(), tareas: z.array(TareaListada) })),
});
export type ListaTareas = z.infer<typeof ListaTareas>;

// T-051 · specs/07-agente/plan.md §14.9: las candidatas cuando varias tareas encajan con lo dicho
export const CandidatasDeReferente = z.strictObject({
  // «¿Cuál de estas?»
  texto: z.string(),
  // Lo que se propondrá con la elegida: «Dar por hecha», «Anotar avance» o «Ver cómo va»
  accion: z.string(),
  candidatas: z.array(z.strictObject({ id: z.uuid(), titulo: z.string(), detalle: z.string().nullable() })),
  // T-126: con «Anotar avance», el texto que se anotará en la elegida
  avance: z.string().optional(),
});
export type CandidatasDeReferente = z.infer<typeof CandidatasDeReferente>;

// T-126 · REQ-CUN03-23 · H-TP-29: «¿cómo va X?», armado por el código con los avances tal como están
export const BitacoraTarea = z.strictObject({
  tareaId: z.uuid(),
  tarea: z.string(),
  contexto: z.string().nullable(),
  // Del más reciente al más antiguo
  avances: z.array(AvanceTarea),
  // «Esta tarea no tiene avances anotados.» cuando no hay ninguno
  vacia: z.string().nullable(),
});
export type BitacoraTarea = z.infer<typeof BitacoraTarea>;
