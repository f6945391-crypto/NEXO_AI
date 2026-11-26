import { ModeloNoDisponible, type PeticionModelo, type ProveedorModelo, type RespuestaModelo } from './proveedor-modelo';

// H-AGT-01 · T-029. Sin proveedor elegido, el asistente cuenta como no disponible: todo lo que se pide queda
// en espera (P-11) y nada se crea.
export class ModeloNoConfigurado implements ProveedorModelo {
  readonly nombre = 'no-configurado';

  async responder(_peticion: PeticionModelo, _senal: AbortSignal): Promise<RespuestaModelo> {
    throw new ModeloNoDisponible('no hay un proveedor de modelo configurado');
  }
}
