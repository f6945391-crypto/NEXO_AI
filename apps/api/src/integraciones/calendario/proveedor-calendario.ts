import type { ContextoSolicitud } from '../../identidad/contexto';

// AD-10 · T-013 · specs/02-agenda/plan.md §2. Única vía hacia el calendario de la persona. Tiene una
// implementación real sobre Google Calendar y una simulada en memoria, para pruebas y demostración.
// Solo el calendario principal (H-AG-06).

export const PROVEEDOR_CALENDARIO = Symbol('PROVEEDOR_CALENDARIO');

export type Quien = Pick<ContextoSolicitud, 'perfilId' | 'organizacionId'>;

// Un evento tal como lo da el proveedor. Los de todo el día empiezan y terminan a medianoche de su zona.
export interface EventoCalendario {
  id: string;
  etag: string;
  titulo: string;
  inicio: Date;
  fin: Date;
  // IANA del evento; si el evento no trae la suya, la del calendario
  zonaHoraria: string;
  todoElDia: boolean;
  esOrganizador: boolean;
  // Evento recurrente del que esta es una instancia (H-AG-04)
  serieId: string | null;
}

// Lo borrado en el proveedor llega como `cancelado`, nunca desaparece sin más (R-25).
export type CambioCalendario = { tipo: 'evento'; evento: EventoCalendario } | { tipo: 'cancelado'; id: string };

// Completa: todo lo que hay en una ventana, cada repetición como evento propio. Incremental: lo que cambió
// desde el token de la lectura anterior.
export type Lectura = { tipo: 'completa'; desde: Date; hasta: Date } | { tipo: 'incremental'; syncToken: string };

export interface ResultadoLectura {
  cambios: CambioCalendario[];
  syncToken: string;
}

export interface DatosEvento {
  titulo: string;
  inicio: Date;
  fin: Date;
  zonaHoraria: string;
  // T-132 · REQ-CUN06-11: los invitados de una reunión. `perfilId` solo lo usa el simulado, para copiar el
  // evento en el calendario del invitado como haría Google (P-REU-04)
  invitados?: { correo: string; opcional: boolean; perfilId?: string }[];
}

// T-132 · D-REU-16: avisar a los invitados, por Google. Sin indicarlo, no se avisa a nadie (H-AG-11)
export interface OpcionesEscritura {
  avisar?: boolean;
}

export interface ProveedorCalendario {
  // Lanza SincronizacionCaducada si el token ya no vale: hay que volver a leer completo.
  listar(quien: Quien, lectura: Lectura): Promise<ResultadoLectura>;
  crear(quien: Quien, datos: DatosEvento, opciones?: OpcionesEscritura): Promise<EventoCalendario>;
  // Solo la instancia indicada, nunca la serie entera (H-AG-04). Conviene pasar siempre `zonaHoraria`:
  // si el evento no tiene zona propia, es la que se le da al evento devuelto.
  actualizar(quien: Quien, id: string, cambios: Partial<DatosEvento>, opciones?: OpcionesEscritura): Promise<EventoCalendario>;
  // Idempotente: cancelar lo ya cancelado no falla (P-07).
  cancelar(quien: Quien, id: string, opciones?: OpcionesEscritura): Promise<void>;
  // T-132 · D-REU-11: la dirección de la cuenta conectada (el id del calendario principal), o nada
  direccion(quien: Quien): Promise<string | null>;
  // T-138 · P-REU-10: un evento por su id, aunque no salga en la lista. Una invitación sin responder de alguien
  // que no es contacto no sale en la lista del invitado, pero se lee por su id. Borrado o inexistente: `cancelado`
  obtener(quien: Quien, id: string, zonaPorDefecto: string): Promise<CambioCalendario>;
}

export class SincronizacionCaducada extends Error {
  constructor() {
    super('El token de sincronización ya no vale; hay que sincronizar desde cero');
    this.name = 'SincronizacionCaducada';
  }
}
