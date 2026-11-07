import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  CargaCambiarTarea,
  CargaRegistrarTarea,
  CargaTareaExistente,
  type FranjaTarea,
  type OrigenOperacion,
  type VistaConfirmacion,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { RegistroOperaciones, type EjecutorOperacion, type Propuesta, type ResultadoEjecucion } from '../operaciones/registro';
import { errorApi } from '../plataforma/errores';
import { diaLargo } from './dominio/formato';
import { diaEn, franjaDe } from './dominio/franja';
import { aColumnaFecha, aContrato, datosFranja, noModificable, TareasRepositorio, type FilaTarea } from './tareas.repositorio';

// specs/09-tareas-personales/plan.md §4 · T-048 · AD-09. Las Operaciones de las tareas personales. Ninguna
// llama a Google ni revisa la agenda (H-TP-09, REQ-CUN03-20) y ninguna es solo del responsable (REQ-ACC-13).
// Crear y cambiar, solo el asistente (R-42, H-TP-08); dar por hecha, recibido, reabrir y descartar son
// también controles directos (DP-01). La tarjeta la arma el código, sin prometer avisos (H-TP-10).
//
// Ajuste del plan (encargo de la cuarta tanda): son seis tipos, no cinco. `tareas.modificar` se llama
// `tareas.cambiar`, y «Recibido» tiene su propio tipo, `tareas.recibido`, en vez de ser `tareas.completar`
// con otro texto (H-TP-15): así la auditoría distingue una tarea hecha de algo recibido.

const NOMBRE_FRANJA: Readonly<Record<FranjaTarea, string>> = {
  con_fecha: 'Con fecha',
  sin_fecha: 'Sin fecha',
  esperando: 'Esperando de alguien',
};

export const TIPOS_TAREAS = ['tareas.registrar', 'tareas.cambiar', 'tareas.completar', 'tareas.recibido', 'tareas.reabrir', 'tareas.descartar'] as const;

// «Para el sábado 14 de noviembre, antes de las 18:00»
const paraCuando = (fecha: string | null | undefined, hora: string | null | undefined) =>
  fecha ? `Para el ${diaLargo(fecha)}${hora ? `, antes de las ${hora}` : ''}` : 'Sin fecha';

const dondeAparece = (franja: FranjaTarea) => ({ etiqueta: 'Dónde aparece', valor: `En Tareas, en «${NOMBRE_FRANJA[franja]}»` });

// La tarea de la que se habla, como la ve la persona en la tarjeta
function datosDe(fila: FilaTarea, zona: string): VistaConfirmacion['datos'] {
  const tarea = aContrato(fila, new Date(), zona);
  return [
    { etiqueta: 'Tarea', valor: tarea.texto },
    ...(tarea.espera ? [{ etiqueta: 'De quién', valor: tarea.espera }] : []),
    ...(tarea.cuando ? [{ etiqueta: 'Cuándo', valor: tarea.cuando }] : []),
  ];
}

const vista = (accion: string, datos: VistaConfirmacion['datos'], irreversible: string | null = null): VistaConfirmacion => ({
  accion,
  datos,
  irreversible,
  confirmable: true,
  motivoNoConfirmable: null,
});

const ejecutada = (fila: FilaTarea, zona: string): ResultadoEjecucion => ({ tipo: 'ejecutada', resultado: aContrato(fila, new Date(), zona) });

@Injectable()
export class EjecutoresTareas implements OnModuleInit {
  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly tareas: TareasRepositorio,
  ) {}

  onModuleInit(): void {
    for (const ejecutor of [this.registrar(), this.cambiar(), this.completar(), this.recibido(), this.reabrir(), this.descartar()]) {
      this.registro.registrar(ejecutor as EjecutorOperacion<unknown>);
    }
  }

  // REQ-CUN03-01, 02, 04. Sin confirmar no existe la tarea. Confirmar dos veces crea una: la tarea guarda la
  // Operación que la creó, con clave única.
  private registrar(): EjecutorOperacion<CargaRegistrarTarea> {
    return {
      tipo: 'tareas.registrar',
      esquema: CargaRegistrarTarea,
      origenes: ['agente'] satisfies OrigenOperacion[],
      nombresDeCampos: { texto: 'qué hay que hacer' },
      proponer: async (contexto, carga): Promise<Propuesta<CargaRegistrarTarea>> => {
        const zona = carga.zonaHoraria ?? (await this.tareas.zonaDe(contexto));
        const completa: CargaRegistrarTarea = {
          ...carga,
          zonaHoraria: zona,
          ...(carga.deQuien && !carga.esperadaDesde ? { esperadaDesde: diaEn(new Date(), zona) } : {}),
        };
        const franja = franjaDe({ fecha: completa.fecha ?? null, deQuien: completa.deQuien ?? null });
        const datos: VistaConfirmacion['datos'] = [
          { etiqueta: 'Tarea', valor: completa.texto },
          ...(completa.deQuien ? [{ etiqueta: 'De quién', valor: completa.deQuien }] : []),
          { etiqueta: 'Cuándo', valor: paraCuando(completa.fecha, completa.horaLimite) },
          dondeAparece(franja),
          // R-12, H-TP-14: esperar algo de alguien no le escribe
          ...(completa.deQuien ? [{ etiqueta: 'Aviso', valor: `NexoAI no le escribe a ${completa.deQuien}` }] : []),
        ];
        return { vista: vista('Nueva tarea', datos), carga: completa };
      },
      ejecutar: async (contexto, carga, operacion): Promise<ResultadoEjecucion> => {
        const zona = await this.tareas.zonaDe(contexto);
        const previa = await this.tareas.porOrigen(contexto, operacion.id);
        if (previa) return ejecutada(previa, zona);
        const fila = await this.tareas.crear(contexto, {
          texto: carga.texto,
          fecha: aColumnaFecha(carga.fecha) ?? null,
          horaLimite: carga.horaLimite ?? null,
          zonaHoraria: carga.zonaHoraria ?? zona,
          deQuien: carga.deQuien ?? null,
          esperadaDesde: aColumnaFecha(carga.esperadaDesde) ?? null,
          operacionOrigenId: operacion.id,
        });
        return ejecutada(fila, zona);
      },
    };
  }

  // REQ-CUN03-12, 03. Solo lo que cambia, con el antes y el ahora. Cambiar la fecha o de quién mueve la tarea
  // de franja sin cambiar su estado.
  private cambiar(): EjecutorOperacion<CargaCambiarTarea> {
    return {
      tipo: 'tareas.cambiar',
      esquema: CargaCambiarTarea,
      origenes: ['agente'] satisfies OrigenOperacion[],
      nombresDeCampos: { tareaId: 'qué tarea quieres cambiar' },
      proponer: async (contexto, carga): Promise<Propuesta<CargaCambiarTarea>> => {
        const fila = await this.tareas.existente(contexto, carga.tareaId);
        if (fila.estado !== 'pendiente') throw noModificable();
        const zona = await this.tareas.zonaDe(contexto);
        const antes = datosFranja(fila);
        const completa: CargaCambiarTarea = { ...carga };
        // Sin fecha no hay hora límite; sin persona no hay «desde» (los CHECK de la tabla)
        if (carga.fecha === null && antes.horaLimite) completa.horaLimite = null;
        if (carga.deQuien === null && antes.esperadaDesde) completa.esperadaDesde = null;
        if (carga.deQuien && !antes.deQuien && carga.esperadaDesde === undefined) completa.esperadaDesde = diaEn(new Date(), zona);
        if (carga.fecha !== undefined || carga.horaLimite !== undefined) completa.zonaHoraria = zona;
        const despues = {
          ...antes,
          ...(completa.fecha !== undefined ? { fecha: completa.fecha } : {}),
          ...(completa.horaLimite !== undefined ? { horaLimite: completa.horaLimite } : {}),
          ...(completa.deQuien !== undefined ? { deQuien: completa.deQuien } : {}),
        };
        if (despues.horaLimite && !despues.fecha) throw errorApi(400, 'DATOS_FALTANTES', 'Falta para qué día es esa hora.', { campos: ['fecha'] });

        // Antes y ahora, solo de lo que cambia
        const partes: [string, string][] = [];
        if (completa.texto !== undefined && completa.texto !== fila.texto) partes.push([`«${fila.texto}»`, `«${completa.texto}»`]);
        if (completa.fecha !== undefined || completa.horaLimite !== undefined) {
          partes.push([paraCuando(antes.fecha, antes.horaLimite), paraCuando(despues.fecha, despues.horaLimite)]);
        }
        if (completa.deQuien !== undefined) {
          partes.push([antes.deQuien ? `De ${antes.deQuien}` : 'No se espera de nadie', despues.deQuien ? `De ${despues.deQuien}` : 'No se espera de nadie']);
        }
        const franjaAntes = franjaDe(antes);
        const franjaDespues = franjaDe(despues);
        const datos: VistaConfirmacion['datos'] = [
          { etiqueta: 'Tarea', valor: fila.texto },
          { etiqueta: 'Antes', valor: partes.map(([a]) => a).join(' · ') || 'Igual' },
          { etiqueta: 'Ahora', valor: partes.map(([, b]) => b).join(' · ') || 'Igual' },
          ...(franjaAntes !== franjaDespues ? [dondeAparece(franjaDespues)] : []),
        ];
        return { vista: vista('Cambiar la tarea', datos), carga: completa };
      },
      ejecutar: async (contexto, carga): Promise<ResultadoEjecucion> => {
        const zona = await this.tareas.zonaDe(contexto);
        await this.tareas.existente(contexto, carga.tareaId);
        const cambiada = await this.tareas.cambiar(contexto, carga.tareaId, ['pendiente'], {
          ...(carga.texto !== undefined ? { texto: carga.texto } : {}),
          ...(carga.fecha !== undefined ? { fecha: aColumnaFecha(carga.fecha) } : {}),
          ...(carga.horaLimite !== undefined ? { horaLimite: carga.horaLimite } : {}),
          ...(carga.deQuien !== undefined ? { deQuien: carga.deQuien } : {}),
          ...(carga.esperadaDesde !== undefined ? { esperadaDesde: aColumnaFecha(carga.esperadaDesde) } : {}),
          ...(carga.zonaHoraria ? { zonaHoraria: carga.zonaHoraria } : {}),
        });
        if (!cambiada) throw noModificable();
        return ejecutada(cambiada, zona);
      },
    };
  }

  // REQ-CUN03-09, 15. Dar por hecha lo que es de uno; lo que se espera de alguien se marca como recibido
  private completar(): EjecutorOperacion<CargaTareaExistente> {
    return this.darPorHecha('tareas.completar', 'Dar por hecha', false);
  }

  // REQ-CUN03-05 · H-TP-15: recibido es dar por hecho con su nombre; no crea ninguna tarea nueva
  private recibido(): EjecutorOperacion<CargaTareaExistente> {
    return this.darPorHecha('tareas.recibido', 'Marcar como recibido', true);
  }

  private darPorHecha(tipo: string, accion: string, esperada: boolean): EjecutorOperacion<CargaTareaExistente> {
    const comprobar = (fila: FilaTarea) => {
      if (!!fila.deQuien !== esperada) {
        throw errorApi(409, 'TAREA_NO_MODIFICABLE', esperada ? 'Esa tarea no se espera de nadie: se da por hecha.' : 'Eso se espera de otra persona: se marca como recibido.');
      }
    };
    return {
      tipo,
      esquema: CargaTareaExistente,
      origenes: ['agente', 'control_directo'] satisfies OrigenOperacion[],
      nombresDeCampos: { tareaId: 'qué tarea' },
      proponer: async (contexto, carga) => {
        const fila = await this.tareas.existente(contexto, carga.tareaId);
        comprobar(fila);
        if (fila.estado === 'descartada') throw noModificable();
        return vista(accion, datosDe(fila, await this.tareas.zonaDe(contexto)));
      },
      ejecutar: async (contexto, carga) => {
        const zona = await this.tareas.zonaDe(contexto);
        const fila = await this.tareas.existente(contexto, carga.tareaId);
        comprobar(fila);
        // Ya hecha: mismo resultado, sin repetir el efecto
        if (fila.estado === 'hecha') return ejecutada(fila, zona);
        const hecha = await this.tareas.cambiar(contexto, carga.tareaId, ['pendiente'], { estado: 'hecha', hechaEn: new Date() });
        if (!hecha) return ejecutada(await this.siguePudiendo(contexto, carga.tareaId, 'hecha'), zona);
        return ejecutada(hecha, zona);
      },
    };
  }

  // REQ-CUN03-10. Solo desde hecha; vuelve a su franja con todos sus datos. Es también el «Deshacer» de «Hecho»
  private reabrir(): EjecutorOperacion<CargaTareaExistente> {
    return {
      tipo: 'tareas.reabrir',
      esquema: CargaTareaExistente,
      origenes: ['agente', 'control_directo'] satisfies OrigenOperacion[],
      nombresDeCampos: { tareaId: 'qué tarea' },
      proponer: async (contexto, carga) => {
        const fila = await this.tareas.existente(contexto, carga.tareaId);
        if (fila.estado === 'descartada') throw noModificable();
        return vista('Reabrir la tarea', datosDe(fila, await this.tareas.zonaDe(contexto)));
      },
      ejecutar: async (contexto, carga) => {
        const zona = await this.tareas.zonaDe(contexto);
        const fila = await this.tareas.existente(contexto, carga.tareaId);
        if (fila.estado === 'pendiente') return ejecutada(fila, zona);
        const abierta = await this.tareas.cambiar(contexto, carga.tareaId, ['hecha'], { estado: 'pendiente', hechaEn: null });
        if (!abierta) return ejecutada(await this.siguePudiendo(contexto, carga.tareaId, 'pendiente'), zona);
        return ejecutada(abierta, zona);
      },
    };
  }

  // REQ-CUN03-11 · H-TP-07: siempre con tarjeta. No se borra la fila (R-25): deja de verse en Tareas y en Hoy
  private descartar(): EjecutorOperacion<CargaTareaExistente> {
    return {
      tipo: 'tareas.descartar',
      esquema: CargaTareaExistente,
      origenes: ['agente', 'control_directo'] satisfies OrigenOperacion[],
      nombresDeCampos: { tareaId: 'qué tarea quieres descartar' },
      proponer: async (contexto, carga) => {
        const fila = await this.tareas.existente(contexto, carga.tareaId);
        if (fila.estado === 'descartada') throw noModificable();
        return vista('Descartar la tarea', datosDe(fila, await this.tareas.zonaDe(contexto)), 'Ya no aparecerá en tus tareas, tampoco entre las hechas.');
      },
      ejecutar: async (contexto, carga) => {
        const zona = await this.tareas.zonaDe(contexto);
        const fila = await this.tareas.existente(contexto, carga.tareaId);
        if (fila.estado === 'descartada') return ejecutada(fila, zona);
        const descartada = await this.tareas.cambiar(contexto, carga.tareaId, ['pendiente', 'hecha'], { estado: 'descartada', descartadaEn: new Date() });
        if (!descartada) return ejecutada(await this.siguePudiendo(contexto, carga.tareaId, 'descartada'), zona);
        return ejecutada(descartada, zona);
      },
    };
  }

  // Otro control ganó la carrera: si dejó la tarea como se pedía, mismo resultado; si no, no se puede
  private async siguePudiendo(contexto: ContextoSolicitud, id: string, esperado: FilaTarea['estado']): Promise<FilaTarea> {
    const fila = await this.tareas.existente(contexto, id);
    if (fila.estado !== esperado) throw noModificable();
    return fila;
  }
}
