import {
  enZona,
  instanteLocal,
  sumarDias,
} from '../agenda/dominio/tiempo';

export function rangoDisponibilidadPorDefecto(
  zonaHoraria: string,
  ahora: Date = new Date(),
): { desde: Date; hasta: Date } {
  const fechaActual = enZona(ahora, zonaHoraria);

  const manana = sumarDias(fechaActual, 1);
  const finBusqueda = sumarDias(manana, 7);

  return {
    desde: instanteLocal(manana, 0, zonaHoraria),
    hasta: instanteLocal(finBusqueda, 0, zonaHoraria),
  };
}
