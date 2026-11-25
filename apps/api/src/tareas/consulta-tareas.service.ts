import { Injectable } from '@nestjs/common';
import { HECHAS_VISIBLES_DIAS, type ConsultaTareas, type RespuestaTareas, type TareaPersonal, type TareasDelDia } from '@nexoai/contratos';
import { nombreDeZona } from '../agenda/formato';
import type { ContextoSolicitud } from '../identidad/contexto';
import { diaEn, franjaDe, ordenar, ordenarPorFranja, vencida } from './dominio/franja';
import { aContrato, datosFranja, TareasRepositorio, type FilaTarea } from './tareas.repositorio';

// specs/09-tareas-personales/plan.md §2 y §5 · T-049 · REQ-CUN03-06, 07, 10, 13, 19. La interfaz pública de
// lectura de las tareas: la usan el controlador, el agente y, más adelante, la nota de continuidad. No
// depende del proveedor del modelo ni de Google (REQ-CUN03-18, 20). Lo de cada persona, solo para ella.

const DIA_MS = 24 * 3600_000;

export interface Periodo {
  // Sin `desde`: todo lo que vence hasta `hasta`. Con `desde`: lo de ese período y las vencidas (H-TP-18)
  desde?: string;
  hasta: string;
}

@Injectable()
export class ConsultaTareasService {
  constructor(private readonly tareas: TareasRepositorio) {}

  // Las pendientes, en el orden de H-TP-05, y las hechas de los últimos siete días (H-TP-06). Con un período,
  // solo «Con fecha» de ese período y las vencidas: lo sin fecha y lo esperado no caen en ninguno (H-TP-18)
  async listar(contexto: ContextoSolicitud, consulta: ConsultaTareas & { desde?: string } = {}, ahora = new Date()): Promise<RespuestaTareas> {
    const zona = await this.tareas.zonaDe(contexto);
    const enFranja = (f: FilaTarea) => !consulta.franja || franjaDe(datosFranja(f)) === consulta.franja;
    const periodo: Periodo | null = consulta.hasta ? { hasta: consulta.hasta, ...(consulta.desde ? { desde: consulta.desde } : {}) } : null;
    const enPeriodo = (f: FilaTarea) => !periodo || this.enPeriodo(f, periodo, ahora, zona);

    const pendientes = (await this.tareas.pendientes(contexto)).filter((f) => enFranja(f) && enPeriodo(f));
    const hechas = periodo ? [] : (await this.tareas.hechasDesde(contexto, new Date(ahora.getTime() - HECHAS_VISIBLES_DIAS * DIA_MS))).filter(enFranja);
    const ordenadas = ordenarPorFranja(
      pendientes.map((f) => ({ ...datosFranja(f), fila: f })),
      ahora,
      zona,
    );
    // T-125 · REQ-CUN03-24: cada tarea con su bitácora
    const avances = await this.tareas.avancesDe(contexto, [...pendientes, ...hechas].map((f) => f.id));
    return {
      zona: nombreDeZona(zona, ahora),
      pendientes: ordenadas.map((t) => aContrato(t.fila, ahora, zona, avances.get(t.fila.id))),
      hechasRecientes: hechas.map((f) => aContrato(f, ahora, zona, avances.get(f.id))),
      // REQ-CUN03-17: lo convertido desde la espera llega con T-056
      porConfirmar: [],
    };
  }

  // REQ-CUN03-13 · H-TP-09: las pendientes con fecha de ese día, por hora límite; si el día es hoy, después las
  // vencidas de días anteriores. Lo que se espera de alguien no es un plazo propio (H-TP-04) y no entra.
  async delDia(contexto: ContextoSolicitud, fecha: string, ahora = new Date()): Promise<TareasDelDia> {
    const zona = await this.tareas.zonaDe(contexto);
    const esHoy = fecha === diaEn(ahora, zona);
    const conFecha = (await this.tareas.pendientes(contexto)).map((f) => ({ ...datosFranja(f), fila: f })).filter((t) => franjaDe(t) === 'con_fecha');
    const delDia = ordenar(
      'con_fecha',
      conFecha.filter((t) => t.fecha === fecha),
      ahora,
      zona,
    );
    const anteriores = esHoy ? ordenar('con_fecha', conFecha.filter((t) => t.fecha! < fecha && vencida(t, ahora, zona)), ahora, zona) : [];
    const todas = [...delDia, ...anteriores];
    const avances = await this.tareas.avancesDe(contexto, todas.map((t) => t.fila.id));
    return {
      fecha,
      zona: nombreDeZona(zona, ahora),
      esHoy,
      tareas: todas.map((t) => aContrato(t.fila, ahora, zona, avances.get(t.fila.id))),
    };
  }

  async porId(contexto: ContextoSolicitud, id: string, ahora = new Date()): Promise<TareaPersonal> {
    const fila = await this.tareas.existente(contexto, id);
    return this.tareas.contrato(contexto, fila, ahora);
  }

  // T-126 · H-TP-26: los avances de varias tareas, para armar su ficha o su bitácora
  avancesDe(contexto: ContextoSolicitud, tareaIds: string[]) {
    return this.tareas.avancesDe(contexto, tareaIds);
  }

  // Lo que el agente busca por texto (T-051): las pendientes de una franja, o las hechas recientes para reabrir
  async filas(contexto: ContextoSolicitud, cuales: 'pendientes' | 'hechas', ahora = new Date()): Promise<FilaTarea[]> {
    if (cuales === 'pendientes') return this.tareas.pendientes(contexto);
    return this.tareas.hechasDesde(contexto, new Date(ahora.getTime() - HECHAS_VISIBLES_DIAS * DIA_MS));
  }

  zona(contexto: ContextoSolicitud): Promise<string> {
    return this.tareas.zonaDe(contexto);
  }

  private enPeriodo(f: FilaTarea, periodo: Periodo, ahora: Date, zona: string): boolean {
    const datos = datosFranja(f);
    if (franjaDe(datos) !== 'con_fecha') return false;
    if (vencida(datos, ahora, zona)) return true;
    return datos.fecha! <= periodo.hasta && (!periodo.desde || datos.fecha! >= periodo.desde);
  }
}
