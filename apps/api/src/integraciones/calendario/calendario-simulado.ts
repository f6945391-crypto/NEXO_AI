import { errorApi } from '../../plataforma/errores';
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

// T-013. Calendario en memoria para pruebas y demostración. Cuenta las llamadas, para comprobar que algo
// NO llamó al proveedor (REQ-CUN01-03, REQ-CUN01-08), y deja simular lo que hace alguien directamente en
// Google: crear, cambiar o borrar eventos, o que un token de sincronización caduque.

interface Entrada {
  evento: EventoCalendario;
  cancelado: boolean;
  // Número de cambio en que se tocó por última vez
  version: number;
}

interface Calendario {
  eventos: Map<string, Entrada>;
  version: number;
  // Al caducar los tokens sube la época y los anteriores dejan de valer (el 410 de Google)
  epoca: number;
}

export class ProveedorCalendarioSimulado implements ProveedorCalendario {
  readonly llamadas = { lecturas: 0, escrituras: 0 };
  // Mientras sea verdadero, toda llamada falla como si Google no respondiera
  caido = false;
  private readonly calendarios = new Map<string, Calendario>();
  private siguienteId = 1;

  reiniciar(): void {
    this.calendarios.clear();
    this.llamadas.lecturas = 0;
    this.llamadas.escrituras = 0;
    this.caido = false;
  }

  async listar(quien: Quien, lectura: Lectura): Promise<ResultadoLectura> {
    this.llamada('lecturas');
    const cal = this.calendario(quien.perfilId);
    let cambios: CambioCalendario[];
    if (lectura.tipo === 'completa') {
      cambios = [...cal.eventos.values()]
        .filter((e) => !e.cancelado && e.evento.inicio < lectura.hasta && e.evento.fin > lectura.desde)
        .map((e) => ({ tipo: 'evento', evento: { ...e.evento } }));
    } else {
      const [perfil, epoca, version] = lectura.syncToken.split(':');
      if (perfil !== quien.perfilId || Number(epoca) !== cal.epoca) throw new SincronizacionCaducada();
      cambios = [...cal.eventos.values()]
        .filter((e) => e.version > Number(version))
        .map((e) => (e.cancelado ? { tipo: 'cancelado', id: e.evento.id } : { tipo: 'evento', evento: { ...e.evento } }));
    }
    return { cambios, syncToken: `${quien.perfilId}:${cal.epoca}:${cal.version}` };
  }

  async crear(quien: Quien, datos: DatosEvento): Promise<EventoCalendario> {
    this.llamada('escrituras');
    return this.sembrar(quien.perfilId, datos);
  }

  async actualizar(quien: Quien, id: string, cambios: Partial<DatosEvento>): Promise<EventoCalendario> {
    this.llamada('escrituras');
    return this.cambiarEnGoogle(quien.perfilId, id, cambios);
  }

  async cancelar(quien: Quien, id: string): Promise<void> {
    this.llamada('escrituras');
    if (this.calendario(quien.perfilId).eventos.has(id)) this.borrarEnGoogle(quien.perfilId, id);
  }

  // —— Lo que alguien hace directamente en Google. No cuenta como llamada. ——

  sembrar(perfilId: string, datos: DatosEvento & Partial<Pick<EventoCalendario, 'todoElDia' | 'esOrganizador' | 'serieId'>>): EventoCalendario {
    const cal = this.calendario(perfilId);
    const evento: EventoCalendario = {
      id: `simulado-${this.siguienteId++}`,
      etag: '"1"',
      titulo: datos.titulo,
      inicio: datos.inicio,
      fin: datos.fin,
      zonaHoraria: datos.zonaHoraria,
      todoElDia: datos.todoElDia ?? false,
      esOrganizador: datos.esOrganizador ?? true,
      serieId: datos.serieId ?? null,
    };
    cal.eventos.set(evento.id, { evento, cancelado: false, version: ++cal.version });
    return { ...evento };
  }

  cambiarEnGoogle(perfilId: string, id: string, cambios: Partial<DatosEvento>): EventoCalendario {
    const cal = this.calendario(perfilId);
    const entrada = cal.eventos.get(id);
    if (!entrada || entrada.cancelado) throw errorApi(502, 'GOOGLE_NO_DISPONIBLE', `El evento ${id} no existe en el calendario simulado.`);
    const definidos = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    entrada.evento = { ...entrada.evento, ...definidos, etag: `"${Number(entrada.evento.etag.replaceAll('"', '')) + 1}"` };
    entrada.version = ++cal.version;
    return { ...entrada.evento };
  }

  borrarEnGoogle(perfilId: string, id: string): void {
    const cal = this.calendario(perfilId);
    const entrada = cal.eventos.get(id);
    if (!entrada || entrada.cancelado) return;
    entrada.cancelado = true;
    entrada.version = ++cal.version;
  }

  caducarTokens(perfilId: string): void {
    this.calendario(perfilId).epoca += 1;
  }

  private llamada(clase: 'lecturas' | 'escrituras'): void {
    this.llamadas[clase] += 1;
    if (this.caido) throw errorApi(502, 'GOOGLE_NO_DISPONIBLE', 'Google Calendar no responde ahora mismo. Inténtalo de nuevo en un momento.');
  }

  private calendario(perfilId: string): Calendario {
    let cal = this.calendarios.get(perfilId);
    if (!cal) {
      cal = { eventos: new Map(), version: 0, epoca: 0 };
      this.calendarios.set(perfilId, cal);
    }
    return cal;
  }
}

// La instancia que usa la API con CALENDARIO_SIMULADO=1 (T-025). Quien la arranca en el mismo proceso,
// como las pruebas de extremo a extremo de la web, la siembra con `sembrar`.
export const calendarioDeDemostracion = new ProveedorCalendarioSimulado();
