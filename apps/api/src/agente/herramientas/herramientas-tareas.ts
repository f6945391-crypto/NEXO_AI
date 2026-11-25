import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  AVANCES_EN_FICHA,
  ArgsAnotarAvance,
  ArgsCambiarTarea,
  ArgsConsultarTareas,
  ArgsRegistrarTarea,
  ArgsTareaExistente,
  type BitacoraTarea,
  type CandidatasDeReferente,
  type FranjaTarea,
  type ListaTareas,
  type OperacionRespuesta,
  type TareaPersonal,
  type TurnoDeHerramienta,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../../identidad/contexto';
import { OperacionesService } from '../../operaciones/operaciones.service';
import { diaLargo } from '../../tareas/dominio/formato';
import { ConsultaTareasService } from '../../tareas/consulta-tareas.service';
import { aContrato, type FilaAvance, type FilaTarea } from '../../tareas/tareas.repositorio';
import { AVISO_CONTENIDO_EXTERNO } from './contenido-externo';
import { EjecutorHerramientas } from './ejecutor-herramientas';
import type { EntornoHerramienta, ResultadoHerramienta } from './herramienta';

// T-050, T-051 · specs/09-tareas-personales/plan.md §7.1 · REQ-CUN03-01, 02, 12, 14, 15, 16. Las herramientas
// de tareas del agente. **Ninguna escribe** (P-01, AD-09): consultan o proponen una Operación `tareas.*` con
// origen `agente`, y la ejecuta la confirmación de la persona (P-03). La lista, la franja, «vencida» y las
// candidatas las arma el código (P-02). Sustituyen a `captura.guardar_tarea`: una tarea ya no queda en
// espera, se propone (REQ-AGT-02 v2, 09-tareas-personales §10).

export const NOMBRE_FRANJA: Readonly<Record<FranjaTarea, string>> = {
  con_fecha: 'Con fecha',
  sin_fecha: 'Sin fecha',
  esperando: 'Esperando de alguien',
};

const ORDEN: readonly FranjaTarea[] = ['con_fecha', 'sin_fecha', 'esperando'];

// Lo que se hace con una tarea existente, y con qué acción se dice en las candidatas
type Accion = 'completar' | 'reabrir' | 'descartar' | 'anotar' | 'bitacora';
const ACCIONES: Readonly<Record<Accion, string>> = {
  completar: 'Dar por hecha',
  reabrir: 'Reabrir',
  descartar: 'Descartar',
  // T-126 · REQ-CUN03-21, 23
  anotar: 'Anotar avance',
  bitacora: 'Ver cómo va',
};

const conError = (codigo: string, mensaje: string, campos?: string[]): ResultadoHerramienta => ({
  paraModelo: { error: { codigo, mensaje, ...(campos ? { campos } : {}) } },
});

function comoPropuesta(op: OperacionRespuesta): ResultadoHerramienta {
  const turno: TurnoDeHerramienta = { tipo: 'propuesta', operacion: op };
  return {
    paraModelo: {
      propuesta: { id: op.id, accion: op.vistaConfirmacion.accion, confirmable: op.vistaConfirmacion.confirmable },
      nota: 'La persona ya ve la tarjeta de confirmación. No repitas sus datos ni prometas avisos.',
    },
    operacionId: op.id,
    turno,
  };
}

// La lista que ve la persona, por franja y en el orden de H-TP-05: solo los grupos que tienen algo
export function armarListaTareas(tareas: TareaPersonal[], zona: string, alcance: string): ListaTareas {
  return {
    alcance,
    zona,
    grupos: ORDEN.map((franja) => ({
      franja,
      nombre: NOMBRE_FRANJA[franja],
      tareas: tareas
        .filter((t) => t.franja === franja)
        .map((t) => ({ id: t.id, texto: t.texto, franja: t.franja, cuando: t.cuando, espera: t.espera, vencida: t.vencida })),
    })).filter((g) => g.tareas.length > 0),
  };
}

// REQ-CUN03-15 · REQ-AGT-04: qué tareas encajan con lo que dijo la persona, en código. Se comparan las
// palabras con sentido por su comienzo («pagué» y «pagar» no se parecen; «recibo» sí): ganan las que más
// palabras comparten con lo dicho.
const VACIAS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'a', 'que', 'ya', 'me', 'lo', 'mi', 'mis', 'y', 'en', 'por', 'para', 'con']);
const palabras = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((p) => p.length > 1 && !VACIAS.has(p));
const raiz = (palabra: string) => palabra.slice(0, Math.min(5, palabra.length));

// T-126 · H-TP-26: `ficha` suma a cada tarea el texto de sus avances; el contexto ya va en la fila
export function encajan(filas: FilaTarea[], dicho: string, ficha?: Map<string, FilaAvance[]>): FilaTarea[] {
  const buscadas = [...new Set(palabras(dicho).map(raiz))];
  if (buscadas.length === 0) return [];
  const puntos = filas.map((f) => {
    const avances = (ficha?.get(f.id) ?? []).map((a) => a.texto).join(' ');
    const propias = palabras(`${f.texto} ${f.deQuien ?? ''} ${f.contexto ?? ''} ${avances}`).map(raiz);
    return { f, n: buscadas.filter((b) => propias.some((p) => p.startsWith(b) || b.startsWith(p))).length };
  });
  const mejor = Math.max(0, ...puntos.map((p) => p.n));
  return mejor === 0 ? [] : puntos.filter((p) => p.n === mejor).map((p) => p.f);
}

@Injectable()
export class HerramientasTareas implements OnModuleInit {
  constructor(
    private readonly ejecutor: EjecutorHerramientas,
    private readonly consulta: ConsultaTareasService,
    private readonly operaciones: OperacionesService,
  ) {}

  onModuleInit(): void {
    this.ejecutor.registrar({
      nombre: 'tareas.consultar',
      descripcion: 'Lee las tareas pendientes de la persona: lo que tiene que hacer y lo que espera de otras personas. Con un período («esta semana»), solo las que tienen fecha en él y las vencidas.',
      esquema: ArgsConsultarTareas,
      ejecutar: (contexto, args, entorno) => this.consultar(contexto, args, entorno),
    });
    this.ejecutor.registrar({
      nombre: 'tareas.registrar',
      descripcion: 'Propone una tarea personal: algo que la persona tiene que hacer, o algo que espera de otra persona (deQuien). Sin fecha dicha, sin fecha: no la preguntes. No avisa ni escribe a nadie.',
      esquema: ArgsRegistrarTarea,
      ejecutar: (contexto, args, entorno) => this.registrar(contexto, args, entorno),
    });
    this.ejecutor.registrar({
      nombre: 'tareas.cambiar',
      descripcion: 'Propone cambiar el texto, la fecha, la hora límite o de quién se espera una tarea pendiente. Pasa solo lo que cambia; null quita la fecha o la persona.',
      esquema: ArgsCambiarTarea,
      ejecutar: (contexto, args, entorno) => this.cambiar(contexto, args, entorno),
    });
    const existente = (accion: Accion, descripcion: string) =>
      this.ejecutor.registrar({
        nombre: `tareas.${accion}`,
        descripcion,
        esquema: ArgsTareaExistente,
        ejecutar: (contexto, args, entorno) => this.sobreExistente(contexto, accion, args, entorno),
      });
    existente('completar', 'Propone dar por hecha una tarea pendiente, o marcar como recibido lo que se esperaba de alguien. Con su id o con lo que dijo la persona para nombrarla.');
    existente('reabrir', 'Propone volver a dejar pendiente una tarea hecha en los últimos siete días.');
    existente('descartar', 'Propone descartar una tarea: deja de aparecer en sus tareas.');
    // T-126 · REQ-CUN03-21 a 23, 26
    this.ejecutor.registrar({
      nombre: 'tareas.anotar_avance',
      descripcion:
        'Propone anotar en la bitácora de una tarea pendiente cómo va, con las palabras de la persona y sin resumir (lo que falta hacer va en el mismo texto). Elige la tarea por su ficha de tareas_consultar (texto, contexto y avances) y pasa su id; si no la sabes, pasa lo que dijo para nombrarla.',
      esquema: ArgsAnotarAvance,
      ejecutar: (contexto, args, entorno) => this.anotar(contexto, args, entorno),
    });
    this.ejecutor.registrar({
      nombre: 'tareas.bitacora',
      descripcion: 'Muestra cómo va una tarea: los avances anotados en su bitácora, tal como están. No propone nada.',
      esquema: ArgsTareaExistente,
      ejecutar: (contexto, args, entorno) => this.bitacora(contexto, args, entorno),
    });
  }

  private async consultar(contexto: ContextoSolicitud, args: ArgsConsultarTareas, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    const desde = args.desde;
    const hasta = args.hasta ?? args.desde;
    if (desde && hasta && hasta < desde) return conError('ARGUMENTOS_INVALIDOS', 'El primer día del período tiene que ser anterior o igual al último.', ['hasta']);
    const respuesta = await this.consulta.listar(
      contexto,
      { ...(args.franja ? { franja: args.franja } : {}), ...(hasta ? { hasta } : {}), ...(desde ? { desde } : {}) },
      entorno.referencia.instante,
    );
    const alcance = hasta
      ? desde && desde !== hasta
        ? `Pendientes del ${diaLargo(desde)} al ${diaLargo(hasta)}, y las vencidas`
        : `Pendientes hasta el ${diaLargo(hasta)}, y las vencidas`
      : args.franja
        ? `Pendientes en «${NOMBRE_FRANJA[args.franja]}»`
        : 'Pendientes';
    const lista = armarListaTareas(respuesta.pendientes, respuesta.zona, alcance);
    const turno: TurnoDeHerramienta = { tipo: 'tareas', lista };
    return {
      // H-AGT-12: al modelo, solo lo consultado y lo mínimo. T-126 · H-TP-26: la ficha de cada tarea, con su
      // contexto y sus últimos avances, para saber de cuál se habla
      paraModelo: {
        tareas: respuesta.pendientes.map((t) => ({
          id: t.id,
          texto: t.texto,
          franja: t.franja,
          fecha: t.fecha,
          horaLimite: t.horaLimite,
          deQuien: t.deQuien,
          vencida: t.vencida,
          contexto: t.contexto,
          ultimosAvances: t.bitacora.slice(0, AVANCES_EN_FICHA).map((a) => `${a.cuando}: ${a.texto}`),
        })),
        aviso: AVISO_CONTENIDO_EXTERNO,
        nota: 'La persona ya ve esta lista, armada con sus tareas. No la repitas.',
      },
      turno,
    };
  }

  private async registrar(contexto: ContextoSolicitud, args: ArgsRegistrarTarea, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    // REQ-CUN03-02: solo se pregunta qué hay que hacer; sin fecha es una franja (H-TP-02)
    if (!args.texto) return conError('DATOS_FALTANTES', 'Falta qué hay que hacer.', ['texto']);
    // Una hora sin día sí falta: no se inventa el día
    if (args.horaLimite && !args.fecha) return conError('DATOS_FALTANTES', 'Falta para qué día es esa hora.', ['fecha']);
    const carga = {
      texto: args.texto,
      ...(args.fecha ? { fecha: args.fecha } : {}),
      ...(args.horaLimite ? { horaLimite: args.horaLimite } : {}),
      ...(args.deQuien ? { deQuien: args.deQuien } : {}),
      ...(args.contexto ? { contexto: args.contexto } : {}),
      zonaHoraria: entorno.referencia.zonaHoraria,
    };
    return comoPropuesta(await this.proponer(contexto, entorno, 'tareas.registrar', carga));
  }

  private async cambiar(contexto: ContextoSolicitud, args: ArgsCambiarTarea, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    const { tareaId, ...cambios } = args;
    if (Object.values(cambios).every((v) => v === undefined)) return conError('DATOS_FALTANTES', 'No dice qué cambiar de la tarea.', ['cambio_tarea']);
    return comoPropuesta(await this.proponer(contexto, entorno, 'tareas.cambiar', { tareaId, ...cambios }));
  }

  private async sobreExistente(contexto: ContextoSolicitud, accion: Accion, args: ArgsTareaExistente, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    const zona = await this.consulta.zona(contexto);
    const filas = await this.consulta.filas(contexto, accion === 'reabrir' ? 'hechas' : 'pendientes', entorno.referencia.instante);
    const elegidas = args.tareaId ? filas.filter((f) => f.id === args.tareaId) : encajan(filas, args.texto ?? '');
    if (elegidas.length === 0) {
      const donde = accion === 'reabrir' ? 'entre las hechas de los últimos siete días' : 'entre tus tareas pendientes';
      return conError('TAREA_NO_ENCONTRADA', args.texto ? `No encontré ninguna tarea que encaje con «${args.texto}» ${donde}.` : `No encontré esa tarea ${donde}.`);
    }
    if (elegidas.length > 1) {
      // Varias encajan: la persona elige, y hasta entonces no se propone nada (REQ-CUN03-15)
      const lista: CandidatasDeReferente = {
        texto: '¿Cuál de estas?',
        accion: ACCIONES[accion],
        candidatas: elegidas.map((f) => {
          const t = aContrato(f, entorno.referencia.instante, zona);
          return { id: t.id, titulo: t.texto, detalle: t.cuando ?? t.espera ?? t.cierre };
        }),
      };
      const turno: TurnoDeHerramienta = { tipo: 'alternativas_de_referente', lista };
      return {
        paraModelo: { candidatas: lista.candidatas.map((c) => ({ id: c.id, texto: c.titulo })), nota: 'La persona ya ve las candidatas y elige una. No propongas nada.' },
        turno,
      };
    }
    const fila = elegidas[0]!;
    return comoPropuesta(await this.proponer(contexto, entorno, tipoDe(accion, fila), { tareaId: fila.id }));
  }

  // T-126 · H-TP-26: la tarea de la que se habla, por su id o por la ficha (texto, contexto y avances).
  // Con varias, las candidatas; con ninguna pendiente pero sí una hecha reciente, se ofrece reabrirla.
  private async buscar(
    contexto: ContextoSolicitud,
    accion: 'anotar' | 'bitacora',
    tareaId: string | undefined,
    dicho: string | undefined,
    entorno: EntornoHerramienta,
  ): Promise<{ fila: FilaTarea; avances: FilaAvance[] } | { resultado: ResultadoHerramienta }> {
    const pendientes = await this.consulta.filas(contexto, 'pendientes', entorno.referencia.instante);
    const ficha = await this.consulta.avancesDe(contexto, pendientes.map((f) => f.id));
    let elegidas = tareaId ? pendientes.filter((f) => f.id === tareaId) : encajan(pendientes, dicho ?? '', ficha);
    if (elegidas.length === 0) {
      const hechas = await this.consulta.filas(contexto, 'hechas', entorno.referencia.instante);
      const hecha = tareaId ? hechas.filter((f) => f.id === tareaId) : encajan(hechas, dicho ?? '');
      if (hecha.length === 1 && accion === 'anotar') {
        return { resultado: conError('TAREA_NO_ENCONTRADA', `«${hecha[0]!.texto}» ya está hecha. Si quieres seguir anotando en ella, pídeme que la reabra.`) };
      }
      if (hecha.length === 1 && accion === 'bitacora') elegidas = hecha;
    }
    if (elegidas.length === 0) {
      return {
        resultado: conError(
          'TAREA_NO_ENCONTRADA',
          dicho ? `No encontré ninguna tarea pendiente que encaje con «${dicho}». ¿A qué tarea corresponde?` : 'No encontré esa tarea entre tus tareas pendientes. ¿A qué tarea corresponde?',
        ),
      };
    }
    if (elegidas.length > 1) {
      const zona = await this.consulta.zona(contexto);
      const lista: CandidatasDeReferente = {
        texto: '¿Cuál de estas?',
        accion: ACCIONES[accion],
        candidatas: elegidas.map((f) => {
          const t = aContrato(f, entorno.referencia.instante, zona);
          return { id: t.id, titulo: t.texto, detalle: t.contexto ?? t.cuando ?? t.espera };
        }),
      };
      const turno: TurnoDeHerramienta = { tipo: 'alternativas_de_referente', lista };
      return {
        resultado: {
          paraModelo: { candidatas: lista.candidatas.map((c) => ({ id: c.id, texto: c.titulo })), nota: 'La persona ya ve las candidatas y elige una. No propongas nada.' },
          turno,
        },
      };
    }
    const fila = elegidas[0]!;
    return { fila, avances: (await this.consulta.avancesDe(contexto, [fila.id])).get(fila.id) ?? [] };
  }

  // T-126 · REQ-CUN03-21, 25: propone el avance; nunca lo anota sin la tarjeta (P-03)
  private async anotar(contexto: ContextoSolicitud, args: ArgsAnotarAvance, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    if (!args.avance) return conError('DATOS_FALTANTES', 'Falta qué avance anotar.', ['avance']);
    const hallada = await this.buscar(contexto, 'anotar', args.tareaId, args.tarea, entorno);
    if ('resultado' in hallada) {
      const turno = hallada.resultado.turno as TurnoDeHerramienta | undefined;
      if (turno?.tipo === 'alternativas_de_referente') turno.lista.avance = args.avance;
      return hallada.resultado;
    }
    return comoPropuesta(await this.proponer(contexto, entorno, 'tareas.anotar_avance', { tareaId: hallada.fila.id, texto: args.avance }));
  }

  // T-126 · REQ-CUN03-23 · H-TP-29: la bitácora la arma el código, tal como está
  private async bitacora(contexto: ContextoSolicitud, args: ArgsTareaExistente, entorno: EntornoHerramienta): Promise<ResultadoHerramienta> {
    const hallada = await this.buscar(contexto, 'bitacora', args.tareaId, args.texto, entorno);
    if ('resultado' in hallada) return hallada.resultado;
    const zona = await this.consulta.zona(contexto);
    const bitacora = armarBitacora(aContrato(hallada.fila, entorno.referencia.instante, zona, hallada.avances));
    const turno: TurnoDeHerramienta = { tipo: 'bitacora', bitacora };
    return {
      paraModelo: {
        tarea: bitacora.tarea,
        avances: bitacora.avances.map((a) => `${a.cuando}: ${a.texto}`),
        aviso: AVISO_CONTENIDO_EXTERNO,
        nota: 'La persona ya ve la bitácora, armada con lo anotado. No la repitas ni la resumas.',
      },
      turno,
    };
  }

  private proponer(contexto: ContextoSolicitud, entorno: EntornoHerramienta, tipo: string, carga: unknown) {
    return this.operaciones.proponer(
      contexto,
      { tipo, carga, origen: 'agente', solicitudOriginal: entorno.solicitudOriginal.slice(0, 2000) },
      { conversacionId: entorno.conversacionId, ...(entorno.enEspera ? { desdeEnEspera: entorno.enEspera } : {}) },
    );
  }
}

// Las candidatas dicen la acción con su etiqueta; al elegir, se vuelve a la acción (T-051)
export function accionDeEtiqueta(etiqueta: string): Accion {
  const accion = (Object.keys(ACCIONES) as Accion[]).find((a) => ACCIONES[a] === etiqueta);
  if (!accion) throw new Error(`Acción de candidatas desconocida: ${etiqueta}`);
  return accion;
}

// Lo que se espera de alguien se marca como recibido (H-TP-15)
export function tipoDe(accion: Accion, fila: Pick<FilaTarea, 'deQuien'>): string {
  if (accion === 'completar') return fila.deQuien ? 'tareas.recibido' : 'tareas.completar';
  if (accion === 'anotar') return 'tareas.anotar_avance';
  return `tareas.${accion}`;
}

// T-126 · REQ-CUN03-23 · H-TP-29: «¿cómo va X?», con los avances tal como están
export function armarBitacora(tarea: TareaPersonal): BitacoraTarea {
  return {
    tareaId: tarea.id,
    tarea: tarea.texto,
    contexto: tarea.contexto,
    avances: tarea.bitacora,
    vacia: tarea.bitacora.length === 0 ? 'Esta tarea no tiene avances anotados.' : null,
  };
}
