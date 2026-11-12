import { Injectable } from '@nestjs/common';
import { Tarea, type EstadoTarea, type FechaDia, type TareasPorFranja } from '@nexoai/contratos';
import type { Quien } from '../integraciones/calendario/proveedor-calendario';
import { errorApi } from '../plataforma/errores';
import { clasificarFranja, estaAtrasada, hoyEnZona, ordenarFranja } from './dominio/franjas';
import { TareasRepositorio } from './tareas.repositorio';

// REQ-CUN03-03, 04, 08, 10 · T-049. La consulta lee `tarea`. Franja y atrasada las decide el código.

type Fila = Awaited<ReturnType<TareasRepositorio['porEstado']>>[number];

const aDia = (fecha: Date | null): FechaDia | null => (fecha ? fecha.toISOString().slice(0, 10) : null);

// Una fila tal como sale de la API; también es el resultado de las Operaciones de tareas.
export function aContrato(fila: Fila, hoy: FechaDia): Tarea {
  const fecha = aDia(fila.fecha);
  return Tarea.parse({
    id: fila.id,
    titulo: fila.titulo,
    estado: fila.estado,
    fecha,
    hora: fila.hora,
    esperaDe: fila.esperaDe,
    esperaQue: fila.esperaQue,
    franja: clasificarFranja({ fecha, esperaDe: fila.esperaDe }),
    atrasada: estaAtrasada({ estado: fila.estado, fecha }, hoy),
    completadaEn: fila.completadaEn?.toISOString() ?? null,
    canceladaEn: fila.canceladaEn?.toISOString() ?? null,
  });
}

export const noEncontrada = () => errorApi(404, 'TAREA_NO_ENCONTRADA', 'No existe esa tarea entre las tuyas.');

@Injectable()
export class ConsultaTareasService {
  constructor(private readonly repositorio: TareasRepositorio) {}

  // Las pendientes en las tres franjas, ya ordenadas (decisión 3)
  async franjas(quien: Quien, ahora: Date = new Date()): Promise<TareasPorFranja> {
    const hoy = hoyEnZona(ahora, await this.repositorio.zonaDelPerfil(quien));
    const pendientes = (await this.repositorio.porEstado(quien, ['pendiente'])).map((fila) => {
      const tarea = aContrato(fila, hoy);
      return { tarea, fecha: tarea.fecha, hora: tarea.hora, creadaEn: fila.creadaEn };
    });
    const de = (franja: Tarea['franja']) => ordenarFranja(franja, pendientes.filter((p) => p.tarea.franja === franja)).map((p) => p.tarea);
    return { conFecha: de('con_fecha'), sinFecha: de('sin_fecha'), esperando: de('esperando') };
  }

  // Lo que ya no está en las franjas, para consultarlo después (R-25)
  async porEstado(quien: Quien, estados: readonly EstadoTarea[], ahora: Date = new Date()): Promise<Tarea[]> {
    const hoy = hoyEnZona(ahora, await this.repositorio.zonaDelPerfil(quien));
    return (await this.repositorio.porEstado(quien, estados)).map((fila) => aContrato(fila, hoy));
  }

  async porId(quien: Quien, id: string, ahora: Date = new Date()): Promise<Tarea> {
    const fila = await this.repositorio.porId(quien, id);
    if (!fila) throw noEncontrada();
    return aContrato(fila, hoyEnZona(ahora, await this.repositorio.zonaDelPerfil(quien)));
  }

  async enFechas(quien: Quien, desde: FechaDia, hasta: FechaDia, ahora: Date = new Date()): Promise<Tarea[]> {
    const hoy = hoyEnZona(ahora, await this.repositorio.zonaDelPerfil(quien));
    return (await this.repositorio.pendientesEnFechas(quien, desde, hasta)).map((fila) => aContrato(fila, hoy));
  }
}
