import { Injectable, Logger } from '@nestjs/common';
import { instanteLocal } from '../../agenda/dominio/tiempo';
import { errorApi } from '../../plataforma/errores';
import { ClienteGoogle } from '../cliente-google';
import {
  SincronizacionCaducada,
  type CambioCalendario,
  type DatosEvento,
  type EventoCalendario,
  type Lectura,
  type ProveedorCalendario,
  type Quien,
  type ResultadoLectura,
} from './proveedor-calendario';

// T-013. Google Calendar v3 sobre ClienteGoogle, que comprueba el permiso y renueva el acceso. Sin SDK:
// cuatro llamadas HTTP. Solo el calendario principal (H-AG-06).

const EVENTOS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const noDisponible = () =>
  errorApi(502, 'GOOGLE_NO_DISPONIBLE', 'Google Calendar no responde ahora mismo. Inténtalo de nuevo en un momento.');

type Json = Record<string, unknown>;

const objeto = (valor: unknown): Json => (valor && typeof valor === 'object' ? (valor as Json) : {});
const texto = (valor: unknown): string | undefined => (typeof valor === 'string' && valor ? valor : undefined);

// «2026-10-23» a medianoche de la zona del calendario.
function medianoche(fecha: string, zona: string): Date {
  const [anio = 0, mes = 1, dia = 1] = fecha.split('-').map(Number);
  return instanteLocal({ anio, mes, dia }, 0, zona);
}

function convertir(item: Json, zonaCalendario: string): CambioCalendario {
  const id = String(item.id);
  if (item.status === 'cancelled') return { tipo: 'cancelado', id };
  const inicio = objeto(item.start);
  const fin = objeto(item.end);
  const zonaHoraria = texto(inicio.timeZone) ?? zonaCalendario;
  const todoElDia = !texto(inicio.dateTime) && !!texto(inicio.date);
  const evento: EventoCalendario = {
    id,
    etag: String(item.etag ?? ''),
    titulo: texto(item.summary) ?? '(Sin título)',
    inicio: todoElDia ? medianoche(String(inicio.date), zonaHoraria) : new Date(String(inicio.dateTime)),
    fin: todoElDia ? medianoche(String(fin.date), zonaHoraria) : new Date(String(fin.dateTime)),
    zonaHoraria,
    todoElDia,
    esOrganizador: objeto(item.organizer).self === true,
    serieId: texto(item.recurringEventId) ?? null,
  };
  return { tipo: 'evento', evento };
}

function cuerpoEvento(datos: Partial<DatosEvento>): Json {
  const cuerpo: Json = {};
  if (datos.titulo !== undefined) cuerpo.summary = datos.titulo;
  if (datos.inicio) cuerpo.start = { dateTime: datos.inicio.toISOString(), timeZone: datos.zonaHoraria };
  if (datos.fin) cuerpo.end = { dateTime: datos.fin.toISOString(), timeZone: datos.zonaHoraria };
  return cuerpo;
}

@Injectable()
export class ProveedorCalendarioGoogle implements ProveedorCalendario {
  private readonly registro = new Logger('GoogleCalendar');

  constructor(private readonly google: ClienteGoogle) {}

  async listar(quien: Quien, lectura: Lectura): Promise<ResultadoLectura> {
    const cambios: CambioCalendario[] = [];
    let pagina: string | undefined;
    for (;;) {
      const url = new URL(EVENTOS);
      // Cada repetición de una serie llega como evento propio (H-AG-04). Tiene que coincidir en la lectura
      // completa y en las incrementales.
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('maxResults', '2500');
      if (lectura.tipo === 'completa') {
        url.searchParams.set('timeMin', lectura.desde.toISOString());
        url.searchParams.set('timeMax', lectura.hasta.toISOString());
      } else {
        url.searchParams.set('syncToken', lectura.syncToken);
      }
      if (pagina) url.searchParams.set('pageToken', pagina);

      const respuesta = await this.peticion(quien, url, { method: 'GET' });
      if (respuesta.status === 410) throw new SincronizacionCaducada();
      const cuerpo = await this.leer(respuesta);
      const zonaCalendario = texto(cuerpo.timeZone) ?? 'UTC';
      for (const item of Array.isArray(cuerpo.items) ? cuerpo.items : []) cambios.push(convertir(objeto(item), zonaCalendario));

      pagina = texto(cuerpo.nextPageToken);
      if (pagina) continue;
      const syncToken = texto(cuerpo.nextSyncToken);
      if (!syncToken) throw noDisponible();
      return { cambios, syncToken };
    }
  }

  async crear(quien: Quien, datos: DatosEvento): Promise<EventoCalendario> {
    const url = new URL(EVENTOS);
    url.searchParams.set('sendUpdates', 'none');
    const respuesta = await this.peticion(quien, url, { method: 'POST', body: JSON.stringify(cuerpoEvento(datos)) });
    return this.eventoDe(respuesta, datos.zonaHoraria);
  }

  async actualizar(quien: Quien, id: string, cambios: Partial<DatosEvento>): Promise<EventoCalendario> {
    const url = new URL(`${EVENTOS}/${encodeURIComponent(id)}`);
    url.searchParams.set('sendUpdates', 'none');
    const respuesta = await this.peticion(quien, url, { method: 'PATCH', body: JSON.stringify(cuerpoEvento(cambios)) });
    return this.eventoDe(respuesta, cambios.zonaHoraria ?? 'UTC');
  }

  async cancelar(quien: Quien, id: string): Promise<void> {
    const url = new URL(`${EVENTOS}/${encodeURIComponent(id)}`);
    url.searchParams.set('sendUpdates', 'none');
    const respuesta = await this.peticion(quien, url, { method: 'DELETE' });
    // 410: ya estaba borrado. Cancelar dos veces no es un error (P-07).
    if (respuesta.ok || respuesta.status === 410) return;
    throw await this.fallo(respuesta);
  }

  private peticion(quien: Quien, url: URL, init: RequestInit): Promise<Response> {
    return this.google.llamar(quien, 'calendario', (token) =>
      fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }),
    );
  }

  private async leer(respuesta: Response): Promise<Json> {
    if (!respuesta.ok) throw await this.fallo(respuesta);
    return objeto(await respuesta.json());
  }

  // A la persona solo se le dice que Google no responde; el motivo real queda en el registro del servidor,
  // por ejemplo una API sin habilitar en el proyecto de Google Cloud (SERVICE_DISABLED).
  private async fallo(respuesta: Response) {
    const error = objeto(objeto(await respuesta.json().catch(() => ({}))).error);
    this.registro.warn(`Google Calendar respondió ${respuesta.status}: ${texto(error.status) ?? ''} ${texto(error.message) ?? ''}`.trim());
    return noDisponible();
  }

  // Un evento sin zona propia está en la del calendario, que esta respuesta no trae: se usa la que se indicó.
  private async eventoDe(respuesta: Response, zonaPorDefecto: string): Promise<EventoCalendario> {
    const cambio = convertir(await this.leer(respuesta), zonaPorDefecto);
    if (cambio.tipo !== 'evento') throw noDisponible();
    return cambio.evento;
  }
}
