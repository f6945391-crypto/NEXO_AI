import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { Annotation, END, interrupt, START, StateGraph } from '@langchain/langgraph';
import { EventoAgenda, ReunionResumen, TareaPersonal, TurnoDeHerramienta, type OperacionRespuesta, type TurnoAsistente } from '@nexoai/contratos';
import { fechaLarga, horario, nombreDeZona } from '../../agenda/formato';
import { diaLargo } from '../../tareas/dominio/formato';
import type { ContextoSolicitud } from '../../identidad/contexto';
import type { OperacionesService, PropuestaAbierta } from '../../operaciones/operaciones.service';
import type { EjecutorHerramientas } from '../herramientas/ejecutor-herramientas';
import type { Oferta } from '../herramientas/herramienta';
import { escribirPropuestaAbierta } from '../nota-de-continuidad';
import { aTextoLlano, esDegenerada, RESPUESTA_DEGENERADA, type NombresInternos } from '../texto-llano';
import type { LlamadasAuditadas } from '../llamadas-auditadas';
import { ModeloNoDisponible, type LlamadaHerramienta, type MensajeModelo } from '../modelo/proveedor-modelo';
import { instrucciones } from './instrucciones';
import type { PuntoControlConversacion } from './punto-control-prisma';

const registro = new Logger('Asistente');

// specs/07-agente/plan.md §4 · T-032. El grafo del asistente: interpreta con el modelo, ejecuta las
// herramientas y, cuando una propone una Operación, **se interrumpe** hasta que la persona decide (P-03).
// La confirmación sigue siendo una sola, la de Operaciones (AD-09): el grafo no ejecuta nada por su cuenta.
// T-038 · plan §14.2: lo que ve la persona **no vive en el estado**. Cada nodo entrega sus turnos a `anotar`,
// un recolector de esta invocación que el servicio guarda en la transcripción; así el punto de control solo
// lleva lo que necesita el modelo. Ningún nodo anota antes de `interrupt()`, que al reanudar vuelve a ejecutarse.
// Preguntar lo que falta, comunicar el resultado y elegir una alternativa no pasan por el modelo (P-02).

// H-AGT-10: como mucho cuatro llamadas al modelo por mensaje
export const TOPE_VUELTAS = 4;
// H-AGT-05: contexto de como mucho 20 mensajes
export const MENSAJES_DE_CONTEXTO = 20;

// REQ-CUN01-07, REQ-CAP-04, R-20: una frase fija por dato que falta, y solo el primero
export const PREGUNTAS: Readonly<Record<string, string>> = {
  fecha: '¿Qué día?',
  horaInicio: '¿A qué hora empieza?',
  titulo: '¿Cómo lo llamo?',
  cambio: '¿Qué quieres cambiar: el día, la hora o el título?',
  // REQ-CUN03-02: de una tarea solo se pregunta qué hay que hacer, nunca para cuándo (H-TP-02)
  texto: '¿Qué hay que hacer?',
  cambio_tarea: '¿Qué quieres cambiar de la tarea: el texto, la fecha o de quién la esperas?',
};

// P-11, REQ-CUN01-11, REQ-CAP-24 · T-033: el aviso de lo que queda en espera lo escribe el código
export const EN_ESPERA = 'El asistente no responde en este momento. Lo que pediste quedó en espera: no se ha creado ni enviado nada. Lo retomo en cuanto vuelva.';
const FALLO = 'No pude resolverlo esta vez. No se ha creado ni enviado nada.';
const SIN_CALENDARIO = 'Para eso necesito permiso para ver y editar tu calendario de Google. Puedes conectarlo en Ajustes. Lo que pediste quedó guardado y lo retomo cuando lo conectes.';

// Lo que la persona decide sobre una propuesta, o un mensaje nuevo mientras había una
export type Reanudacion =
  | { tipo: 'confirmada' | 'descartada' | 'alternativa'; operacion: OperacionRespuesta; caducada?: boolean }
  | { tipo: 'nuevo_mensaje'; texto: string; referencia: Referencia };

type Referencia = { instante: string; zonaHoraria: string };
type Siguiente = 'interpretar' | 'herramientas' | 'preguntar' | 'esperar' | 'fin';

const reemplazar = <T>(valor: T) => Annotation<T>({ reducer: (_actual: T, nuevo: T) => nuevo, default: () => valor });
const acumular = <T>() => Annotation<T[]>({ reducer: (actual: T[], nuevos: T[]) => actual.concat(nuevos), default: () => [] });

export const EstadoAsistente = Annotation.Root({
  mensajes: acumular<MensajeModelo>(),
  referencia: reemplazar<Referencia | null>(null),
  pendiente: reemplazar<string | null>(null),
  // T-143: `frase`, la que se guarda con lo que se proponga si no es la última de la persona (al aceptar una oferta)
  llamadas: reemplazar<{ lista: LlamadaHerramienta[]; llamadaModeloId: string | null; frase?: string } | null>(null),
  faltante: reemplazar<string | null>(null),
  decision: reemplazar<Reanudacion | null>(null),
  vueltas: reemplazar<number>(0),
  siguiente: reemplazar<Siguiente>('fin'),
  // T-033: el modelo no respondió; lo pedido queda en espera
  noDisponible: reemplazar<boolean>(false),
  // T-033: la Operación en espera que se está atendiendo al volver el asistente
  enEspera: reemplazar<string | null>(null),
  // REQ-AGT-01: la acción se cerró y el episodio termina; la transcripción sigue (REQ-AGT-03)
  cerrada: reemplazar<boolean>(false),
  // T-051 · REQ-CUN03-15: las tareas candidatas que se ofrecieron y qué se haría con la elegida. Escribir otra
  // cosa las descarta (plan §14.9)
  candidatas: reemplazar<{ accion: string; ids: string[]; avance?: string } | null>(null),
  // T-133 · REQ-CUN06-10: la reunión cuyas propuestas se ofrecieron. Elegir una la propone el código
  reunion: reemplazar<{ id: string; inicios: string[] } | null>(null),
  // T-143 · REQ-AGT-07: la propuesta sin decidir mientras se interpreta lo que la persona escribió después (si la
  // invocación termina sin volver a esperarla, el servicio la descarta), y lo que el código ofreció en su lugar:
  // «sí» lo propone y «no» deja la tarjeta como estaba. Un solo canal, para que el punto de control no crezca, y
  // sin reiniciarlo en cada mensaje: lo que quede de antes no vale, porque la propuesta se lee de nuevo y tiene que
  // seguir sin decidir, y la oferta solo cuenta si su tarjeta es la que se espera
  abierta: reemplazar<{ id: string; oferta: Oferta | null } | null>(null),
  // T-157 · REQ-AGT-09: la lista de una frase con varias cosas; cuántas terminan en una tarjeta y cuántas se
  // decidieron. Mientras queden, decidir una tarjeta no cierra el episodio (plan §16.1)
  desglose: reemplazar<{ acciones: number; decididas: number } | null>(null),
});
export type EstadoAsistente = typeof EstadoAsistente.State;

const ahora = () => new Date().toISOString();
export const turnoPersona = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'persona', texto });
const turnoTexto = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'texto', texto });
const turnoFallo = (texto: string): TurnoAsistente => ({ id: randomUUID(), en: ahora(), tipo: 'fallo', texto });
const deAsistente = (texto: string): MensajeModelo => ({ rol: 'asistente', texto, llamadas: [] });

// «Hora de Lima (GMT-5)» dentro de una frase: solo la primera letra en minúscula
export const zonaEnFrase = (zona: string, instante: Date) => {
  const nombre = nombreDeZona(zona, instante);
  return nombre.charAt(0).toLowerCase() + nombre.slice(1);
};

const ultimaFrase = (mensajes: MensajeModelo[]) => {
  const persona = mensajes.findLast((m) => m.rol === 'persona');
  return persona?.rol === 'persona' ? persona.texto : '';
};

// El contexto empieza siempre en un mensaje de la persona, para no cortar una herramienta por la mitad
function recortar(mensajes: MensajeModelo[]): MensajeModelo[] {
  const ultimos = mensajes.slice(-MENSAJES_DE_CONTEXTO);
  const inicio = ultimos.findIndex((m) => m.rol === 'persona');
  return inicio > 0 ? ultimos.slice(inicio) : ultimos;
}

// REQ-CUN01-04: el resultado sale de lo que devolvió la Operación, no de lo propuesto
function textoDelResultado(op: OperacionRespuesta, zona: string): string {
  // T-133 · 10-reuniones: lo que quedó, con lo que devolvió la Operación
  const reunion = op.tipo.startsWith('reunion.') ? ReunionResumen.safeParse(op.resultado) : null;
  if (reunion?.success) return textoDeReunion(op.tipo, reunion.data);
  const tarea = op.tipo.startsWith('tareas.') ? TareaPersonal.safeParse(op.resultado) : null;
  if (tarea?.success) return textoDeTarea(op.tipo, tarea.data);
  const evento = EventoAgenda.safeParse(op.resultado);
  if (!evento.success) return 'Listo.';
  const { titulo, inicio, fin, todoElDia } = evento.data;
  const cuando = `el ${fechaLarga(new Date(inicio), zona)}${todoElDia ? '' : `, de ${horario(new Date(inicio), new Date(fin), zona)}`} (${zonaEnFrase(zona, new Date(inicio))})`;
  if (op.tipo === 'agenda.cancelar') return `Listo: cancelé «${titulo}», que era ${cuando}.`;
  if (op.tipo === 'agenda.modificar') return `Listo: «${titulo}» quedó ${cuando}.`;
  return `Listo: «${titulo}» quedó en tu calendario ${cuando}.`;
}

// T-050 · 09-tareas-personales: lo que quedó, dicho por el código y sin prometer avisos (H-TP-10).
// T-144 · H-TP-37: sin nombrar la franja de la sección Tareas; como en un compromiso, solo cuándo, o de quién
export function cuandoQueda(tarea: Pick<TareaPersonal, 'fecha' | 'horaLimite' | 'deQuien'>): string {
  const fecha = tarea.fecha ? `para el ${diaLargo(tarea.fecha)}${tarea.horaLimite ? `, antes de las ${tarea.horaLimite}` : ''}` : null;
  if (tarea.deQuien) return fecha ? `esperando a ${tarea.deQuien}, ${fecha}` : `esperando a ${tarea.deQuien}`;
  return fecha ?? 'sin fecha';
}
function textoDeTarea(tipo: string, tarea: TareaPersonal): string {
  const t = `«${tarea.texto}»`;
  if (tipo === 'tareas.registrar') return `Listo: ${t} quedó en tus tareas ${cuandoQueda(tarea)}.`;
  if (tipo === 'tareas.cambiar') return `Listo: cambié ${t}. Ahora queda ${cuandoQueda(tarea)}.`;
  if (tipo === 'tareas.completar') return `Listo: ${t} quedó hecha.`;
  if (tipo === 'tareas.recibido') return `Listo: marqué ${t} como recibido.`;
  if (tipo === 'tareas.reabrir') return `Listo: ${t} vuelve a estar pendiente, ${cuandoQueda(tarea)}.`;
  return `Listo: descarté ${t}. Ya no aparece en tus tareas.`;
}

function textoDeReunion(tipo: string, r: ReunionResumen): string {
  const t = `«${r.titulo}»`;
  if (tipo === 'reunion.cancelar') return r.inicio ? `Listo: cancelé ${t}. Google avisa a los invitados.` : `Listo: cancelé ${t}. No se avisó a nadie, porque aún no tenía horario.`;
  const cuando = r.inicio && r.fin ? `el ${fechaLarga(new Date(r.inicio), r.zonaHoraria)}, de ${horario(new Date(r.inicio), new Date(r.fin), r.zonaHoraria)} (${zonaEnFrase(r.zonaHoraria, new Date(r.inicio))})` : '';
  if (tipo === 'reunion.mover') return `Listo: ${t} quedó ${cuando}. Google avisa del cambio a los invitados.`;
  return `Listo: ${t} quedó agendada ${cuando}. Google envía la invitación a ${r.invitados === 1 ? '1 persona' : `${r.invitados} personas`}.`;
}

// T-143 · REQ-AGT-07: la respuesta a una oferta, en código. Solo un sí o un no claros; lo demás se interpreta
const normal = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[.!¡¿?,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const ACEPTA = /^(?:si|sip|claro|dale|vale|ok|okey|de acuerdo|perfecto|bueno|adelante|hazlo|por favor|si por favor|si claro|si dale|si hazlo|registralo|registrala|si registralo|si registrala|como compromiso|si como compromiso)$/;
const NIEGA = /^(?:no|nop|no gracias|mejor no|asi esta bien|dejalo asi|dejala asi|no dejala asi|no dejalo asi|solo la tarea|no solo la tarea)$/;
// Lo que lee el modelo cuando la persona escribe con una propuesta abierta
const SIGUE_ABIERTA = '(La propuesta sigue abierta, sin decidir.)';
// T-157 · REQ-AGT-09: lo que lee el modelo tras decidirse una tarjeta, si la frase pedía más acciones
export const SIGUE_LA_LISTA = '(Sigo con lo siguiente de la lista que pediste.)';

// Errores cuyo mensaje ya es la respuesta: lo dice el código, sin otra vuelta del modelo
const SE_DICEN_TAL_CUAL = new Set(['TAREA_SIN_HORARIO', 'TAREA_NO_ENCONTRADA', 'REUNION_ACLARAR', 'SOLO_CONVOCANTE', 'REUNION_NO_ENCONTRADA', 'REUNION_NO_PENDIENTE', 'REUNION_NO_AGENDADA', 'ES_REUNION']);

export interface DependenciasGrafo {
  llamadas: LlamadasAuditadas;
  ejecutor: EjecutorHerramientas;
  operaciones: OperacionesService;
}

// Se compila en cada petición: los nodos cierran sobre la identidad de quien pide, que nunca pasa por el
// estado ni por el modelo (P-04).
// T-040 · plan §14.2: `nota` da la nota de continuidad ya escrita por el servicio, para que el grafo no lea
// Operaciones. Se pide solo si `interpretar` llama al modelo, y no entra en el estado: no pesa en el punto de
// control y en cada invocación llega al día.
export function construirGrafo(
  deps: DependenciasGrafo,
  contexto: ContextoSolicitud,
  conversacionId: string,
  punto: PuntoControlConversacion,
  anotar: (turnos: TurnoAsistente[]) => void,
  nota: () => Promise<string | null> = async () => null,
) {
  const con = (turnos: TurnoAsistente[], cambio: Partial<EstadoAsistente>): Partial<EstadoAsistente> => {
    anotar(turnos);
    return cambio;
  };
  // T-142 · REQ-AGT-06: los nombres internos salen del registro de herramientas, una vez por petición
  let nombres: NombresInternos | null = null;
  const llano = (texto: string) => aTextoLlano(texto, (nombres ??= deps.ejecutor.nombresInternos()));
  // T-143: la propuesta abierta del episodio, leída una vez por petición
  let propuesta: Promise<PropuestaAbierta | null> | null = null;
  const propuestaAbierta = (id: string | null) => (id ? (propuesta ??= deps.operaciones.propuestaDelEpisodio(contexto, id, conversacionId)) : Promise.resolve(null));
  const referenciaDe = (estado: EstadoAsistente) => {
    const r = estado.referencia ?? { instante: ahora(), zonaHoraria: 'UTC' };
    return { instante: new Date(r.instante), zonaHoraria: r.zonaHoraria };
  };

  // P-11 · T-033: lo pedido se guarda en espera con su motivo y el momento de la captura, sin crear nada
  async function enEspera(
    estado: EstadoAsistente,
    motivo: 'asistente_no_disponible' | 'permiso_faltante',
    texto: string,
    frase = ultimaFrase(estado.mensajes),
  ): Promise<TurnoAsistente> {
    const op = await deps.operaciones.encolar(contexto, {
      tipo: 'asistente.solicitud',
      carga: { texto: frase },
      motivo,
      solicitudOriginal: frase,
      capturadaEn: referenciaDe(estado).instante,
      conversacionId,
    });
    return { id: randomUUID(), en: ahora(), tipo: 'en_espera', texto, motivo, operacionId: op.id };
  }

  async function interpretar(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    if (estado.vueltas >= TOPE_VUELTAS) return con([turnoFallo(FALLO)], { siguiente: 'fin' });
    const referencia = referenciaDe(estado);
    // T-143 · REQ-AGT-07: la propuesta abierta va con la nota, como datos y con su id
    const abierta = await propuestaAbierta(estado.abierta?.id ?? null);
    const datos = [await nota(), abierta ? escribirPropuestaAbierta(abierta) : null].filter(Boolean).join('\n\n') || null;
    const r = await deps.llamadas.llamar(contexto, conversacionId, {
      sistema: instrucciones(referencia),
      // REQ-AGT-01 v2: lo último que hizo la persona, como datos y aparte de las instrucciones (H-AGT-15)
      ...(datos ? { nota: datos } : {}),
      mensajes: recortar(estado.mensajes),
      herramientas: deps.ejecutor.definiciones(),
      maxTokens: 1024,
      referencia,
    });
    if (!r.ok) {
      if (!(r.error instanceof ModeloNoDisponible)) return con([turnoFallo(FALLO)], { siguiente: 'fin' });
      // Lo que ya estaba en espera sigue igual; lo nuevo se encola (REQ-CUN01-11, REQ-CAP-24)
      if (estado.enEspera) return { noDisponible: true, siguiente: 'fin' };
      return con([await enEspera(estado, 'asistente_no_disponible', EN_ESPERA)], { noDisponible: true, siguiente: 'fin' });
    }
    const { texto, llamadas } = r.respuesta;
    const mensaje: MensajeModelo = { rol: 'asistente', texto, llamadas };
    if (llamadas.length > 0) {
      return { mensajes: [mensaje], vueltas: estado.vueltas + 1, llamadas: { lista: llamadas, llamadaModeloId: r.llamadaModeloId }, siguiente: 'herramientas' };
    }
    // T-142 · REQ-AGT-06: texto llano, sin marcas ni nombres internos; también en lo que vuelve a leer el modelo
    let dicho = texto ? llano(texto) : '';
    // T-149 · REQ-AGT-08: una respuesta degenerada no se muestra ni se guarda como dicha
    if (dicho && esDegenerada(dicho)) {
      registro.warn(`Respuesta degenerada descartada (${dicho.length} caracteres, ${dicho.split('\n').length} líneas)`);
      dicho = RESPUESTA_DEGENERADA;
    }
    return con(dicho ? [turnoTexto(dicho)] : [], { mensajes: [{ ...mensaje, texto: dicho || texto }], vueltas: estado.vueltas + 1, siguiente: 'fin' });
  }

  async function herramientas(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    const { lista, llamadaModeloId } = estado.llamadas ?? { lista: [], llamadaModeloId: null };
    const abierta = await propuestaAbierta(estado.abierta?.id ?? null);
    const frase = estado.llamadas?.frase ?? ultimaFrase(estado.mensajes);
    const entorno = {
      conversacionId,
      solicitudOriginal: frase,
      referencia: referenciaDe(estado),
      ...(estado.enEspera ? { enEspera: estado.enEspera } : {}),
      ...(abierta ? { propuestaAbierta: abierta } : {}),
    };
    const mensajes: MensajeModelo[] = [];
    const turnos: TurnoAsistente[] = [];
    let pendiente: string | null = null;
    let faltante: string | null = null;
    let sinCalendario = false;
    let guardada = false;
    let candidatas: EstadoAsistente['candidatas'] = null;
    let reunion: EstadoAsistente['reunion'] = null;
    let sinTarea: string | null = null;
    let oferta: Oferta | null = null;
    let desglose: EstadoAsistente['desglose'] | undefined;

    for (const llamada of lista) {
      // Una acción a la vez: la persona decide sobre una tarjeta antes de ver otra
      if (pendiente) {
        const contenido = { error: { codigo: 'UNA_ACCION_A_LA_VEZ', mensaje: 'Ya hay una acción esperando la confirmación de la persona.' } };
        mensajes.push({ rol: 'herramienta', llamadaId: llamada.id, contenido: JSON.stringify(contenido) });
        continue;
      }
      const r = await deps.ejecutor.ejecutar(contexto, entorno, llamada, llamadaModeloId);
      mensajes.push({ rol: 'herramienta', llamadaId: llamada.id, contenido: JSON.stringify(r.paraModelo) });
      const turno = TurnoDeHerramienta.safeParse(r.turno);
      if (turno.success) {
        const base = { id: randomUUID(), en: ahora() };
        if (turno.data.tipo === 'agenda') turnos.push({ ...base, tipo: 'agenda', lista: turno.data.lista });
        // T-157 · REQ-AGT-09: lo que entendió, armado por el código; las acciones se cuentan para seguir con ellas
        else if (turno.data.tipo === 'desglose') {
          turnos.push({ ...base, tipo: 'desglose', desglose: turno.data.desglose });
          const acciones = (r.paraModelo as { acciones?: number } | null)?.acciones ?? 0;
          desglose = acciones > 1 ? { acciones, decididas: 0 } : null;
        }
        else if (turno.data.tipo === 'tareas') turnos.push({ ...base, tipo: 'tareas', lista: turno.data.lista });
        // T-126 · REQ-CUN03-23: la bitácora es una lista, como la de tareas; no cierra el episodio
        else if (turno.data.tipo === 'bitacora') turnos.push({ ...base, tipo: 'bitacora', bitacora: turno.data.bitacora });
        else if (turno.data.tipo === 'propuesta') turnos.push({ ...base, tipo: 'propuesta', operacion: turno.data.operacion });
        // T-133 · REQ-CUN06-01: las propuestas de una reunión; la persona elige sin pasar por el modelo
        else if (turno.data.tipo === 'reunion') {
          turnos.push({ ...base, tipo: 'reunion', propuestas: turno.data.propuestas });
          reunion = { id: turno.data.propuestas.reunion.id, inicios: turno.data.propuestas.propuestas.map((p) => p.inicio) };
        }
        else if (turno.data.tipo === 'alternativas_de_referente') {
          turnos.push({ ...base, tipo: 'alternativas_de_referente', lista: turno.data.lista });
          candidatas = {
            accion: turno.data.lista.accion,
            ids: turno.data.lista.candidatas.map((c) => c.id),
            ...(turno.data.lista.avance ? { avance: turno.data.lista.avance } : {}),
          };
        } else {
          turnos.push({ ...base, ...turno.data });
          guardada = true;
        }
      }
      if (r.operacionId) pendiente = r.operacionId;
      const error = (r.paraModelo as { error?: { codigo?: string; campos?: string[] } } | null)?.error;
      if (error?.codigo === 'DATOS_FALTANTES' && !faltante) faltante = error.campos?.[0] ?? 'cambio';
      if (error?.codigo === 'PERMISO_GOOGLE_FALTANTE') sinCalendario = true;
      if (error?.codigo && SE_DICEN_TAL_CUAL.has(error.codigo) && !sinTarea) {
        sinTarea = (error as { mensaje?: string }).mensaje ?? null;
        oferta = (error as { oferta?: Oferta }).oferta ?? null;
      }
    }

    // REQ-CUN01-08, REQ-ACC-08: el permiso que falta lo dice el código, y lo pedido queda guardado
    if (sinCalendario && !pendiente) {
      const aviso = estado.enEspera ? turnoTexto(SIN_CALENDARIO) : await enEspera(estado, 'permiso_faltante', SIN_CALENDARIO, frase);
      return con([...turnos, aviso], { mensajes: [...mensajes, deAsistente(SIN_CALENDARIO)], siguiente: 'fin' });
    }
    // REQ-AGT-02: una tarea guardada en espera no necesita otra vuelta del modelo, y cierra el episodio (decisión 27)
    if (guardada && !pendiente) return con(turnos, { mensajes, cerrada: true, siguiente: 'fin' });
    // T-051 · REQ-CUN03-15: con varias candidatas no se propone nada; la persona elige sin pasar por el modelo
    const conDesglose = desglose !== undefined ? { desglose } : {};
    if (candidatas && !pendiente) return con(turnos, { mensajes, candidatas, siguiente: 'fin', ...conDesglose });
    // T-133 · REQ-CUN06-01: con las propuestas a la vista, el turno termina; el texto lo escribió el código
    if (reunion && !pendiente) return con(turnos, { mensajes, reunion, siguiente: 'fin', ...conDesglose });
    // T-143 · REQ-AGT-07: un horario para una tarea propuesta; se explica y se ofrece el compromiso, y la tarjeta de
    // la tarea sigue esperando su decisión
    if (sinTarea && oferta && estado.abierta && !pendiente) {
      return con([...turnos, turnoTexto(sinTarea)], {
        mensajes: [...mensajes, deAsistente(sinTarea)],
        abierta: { id: estado.abierta.id, oferta },
        pendiente: estado.abierta.id,
        siguiente: 'esperar',
      });
    }
    // Ninguna tarea encaja: se dice con las palabras del código, sin otra vuelta del modelo
    if (sinTarea && !pendiente) return con([...turnos, turnoTexto(sinTarea)], { mensajes: [...mensajes, deAsistente(sinTarea)], siguiente: 'fin' });
    const siguiente: Siguiente = pendiente ? 'esperar' : faltante ? 'preguntar' : 'interpretar';
    return con(turnos, { mensajes, pendiente, faltante, siguiente, ...(desglose !== undefined ? { desglose } : {}) });
  }

  async function preguntar(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    const campo = estado.faltante ?? 'cambio';
    const texto = PREGUNTAS[campo] ?? PREGUNTAS.cambio!;
    return con([{ id: randomUUID(), en: ahora(), tipo: 'pregunta', texto, campo }], {
      mensajes: [deAsistente(texto)],
      faltante: null,
      siguiente: 'fin',
    });
  }

  // Al reanudar, este nodo se vuelve a ejecutar desde el principio: no hace nada antes de interrumpirse
  function esperarDecision(estado: EstadoAsistente): Partial<EstadoAsistente> {
    const decision = interrupt<{ operacionId: string | null }, Reanudacion>({ operacionId: estado.pendiente });
    return { decision };
  }

  async function comunicar(estado: EstadoAsistente): Promise<Partial<EstadoAsistente>> {
    const decision = estado.decision;
    const zona = referenciaDe(estado).zonaHoraria;
    if (!decision) return { siguiente: 'fin' };

    if (decision.tipo === 'nuevo_mensaje') {
      // REQ-AGT-01 · T-143 · REQ-AGT-07: el mensaje nuevo se interpreta con lo hablado y **contra la propuesta
      // abierta**, que sigue sin decidir mientras tanto. Si lo que resulta no vuelve a esperarla, el servicio la
      // descarta (con una propuesta nueva o con cualquier otra cosa, como antes)
      const abierta = estado.pendiente;
      const persona: MensajeModelo = { rol: 'persona', texto: decision.texto };
      const previo = estado.mensajes.at(-1)?.rol === 'asistente' ? [] : [deAsistente(SIGUE_ABIERTA)];
      const base = { referencia: decision.referencia, decision: null, vueltas: 0 };
      const oferta = abierta && estado.abierta?.id === abierta ? estado.abierta.oferta : null;
      if (oferta && abierta && ACEPTA.test(normal(decision.texto))) {
        // Lo ofrecido lo propone el código, sin pasar por el modelo; la tarjeta anterior se descarta después
        const llamada: LlamadaHerramienta = { id: `oferta-${randomUUID()}`, nombre: oferta.llamada.nombre, argumentos: oferta.llamada.argumentos };
        return con([turnoPersona(decision.texto)], {
          ...base,
          mensajes: [...previo, persona, { rol: 'asistente', texto: null, llamadas: [llamada] }],
          pendiente: null,
          abierta: { id: abierta, oferta: null },
          llamadas: { lista: [llamada], llamadaModeloId: null, frase: oferta.frase },
          siguiente: 'herramientas',
        });
      }
      if (oferta && abierta && NIEGA.test(normal(decision.texto))) {
        return con([turnoPersona(decision.texto), turnoTexto(oferta.alNegar)], {
          ...base,
          mensajes: [...previo, persona, deAsistente(oferta.alNegar)],
          abierta: null,
          pendiente: abierta,
          siguiente: 'esperar',
        });
      }
      return con([turnoPersona(decision.texto)], {
        ...base,
        mensajes: [...previo, persona],
        pendiente: null,
        abierta: abierta ? { id: abierta, oferta: null } : null,
        siguiente: 'interpretar',
      });
    }

    const op = decision.operacion;
    const base = { id: randomUUID(), en: ahora() };
    // Elegir una alternativa ya la propuso el código; se muestra la tarjeta nueva y se vuelve a esperar
    if (decision.tipo === 'alternativa' || op.estado === 'propuesta') {
      return con([{ ...base, tipo: 'propuesta', operacion: op }], {
        mensajes: [deAsistente('(Se propuso de nuevo con otro horario.)')],
        pendiente: op.id,
        decision: null,
        siguiente: 'esperar',
      });
    }
    // T-157 · REQ-AGT-09: si la frase pedía más acciones, el episodio sigue y el modelo propone la siguiente
    const lista = estado.desglose;
    const sigue = !decision.caducada && !!lista && lista.decididas + 1 < lista.acciones;
    const cierre = (turno: TurnoAsistente, texto: string): Partial<EstadoAsistente> =>
      sigue && lista
        ? con([turno], { mensajes: [deAsistente(`${texto} ${SIGUE_LA_LISTA}`)], pendiente: null, decision: null, vueltas: 0, desglose: { ...lista, decididas: lista.decididas + 1 }, siguiente: 'interpretar' })
        : con([turno], { mensajes: [deAsistente(texto)], pendiente: null, decision: null, desglose: null, cerrada: true, siguiente: 'fin' });
    if (decision.tipo === 'descartada') {
      // T-041 · H-AG-08: la que descartó el trabajador a las 24 horas lo dice así
      const texto = decision.caducada ? 'Esta propuesta caducó; no se hizo nada.' : 'De acuerdo, no hice nada.';
      return cierre(turnoTexto(texto), texto);
    }
    if (op.estado === 'ejecutada') {
      const texto = textoDelResultado(op, zona);
      return cierre({ ...base, tipo: 'resultado', texto, operacion: op }, texto);
    }
    const texto = `No se pudo hacer: ${op.error ?? 'el calendario rechazó la acción'}. No cambió nada.`;
    return cierre(turnoFallo(texto), texto);
  }

  const ir = (estado: EstadoAsistente) => (estado.siguiente === 'esperar' ? 'esperar_decision' : estado.siguiente === 'fin' ? END : estado.siguiente);

  return new StateGraph(EstadoAsistente)
    .addNode('interpretar', interpretar)
    .addNode('herramientas', herramientas)
    .addNode('preguntar', preguntar)
    .addNode('esperar_decision', esperarDecision)
    .addNode('comunicar', comunicar)
    .addEdge(START, 'interpretar')
    .addConditionalEdges('interpretar', ir, ['herramientas', END])
    .addConditionalEdges('herramientas', ir, ['interpretar', 'preguntar', 'esperar_decision', END])
    .addEdge('preguntar', END)
    .addEdge('esperar_decision', 'comunicar')
    .addConditionalEdges('comunicar', ir, ['interpretar', 'herramientas', 'esperar_decision', END])
    .compile({ checkpointer: punto });
}
