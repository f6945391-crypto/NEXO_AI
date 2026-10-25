import { diaDeLaSemana, enZona, sumarDias, type FechaLocal } from '../../agenda/dominio/tiempo';
import {
  FalloDelModelo,
  ModeloNoDisponible,
  type LlamadaHerramienta,
  type PeticionModelo,
  type ProveedorModelo,
  type RespuestaModelo,
} from './proveedor-modelo';

// H-AGT-02 · T-029 · plan §3. Un modelo simulado que responde según un guion: si el último mensaje de la
// persona encaja con el patrón de una regla, da los pasos de esa regla, uno por vuelta. **No entiende
// lenguaje natural**: lo que no está en el guion recibe «No sé hacer eso todavía», nunca una invención.
//
// En los argumentos, `$1`, `$2`… son los grupos del patrón, y entre llaves se resuelve, respecto de la
// referencia de la petición y en su zona:
//   {hoy} {mañana} {pasado mañana} {lunes} … {domingo}  → AAAA-MM-DD (el día de la semana, el próximo)
//   {hora:10} {hora:9:30}                              → HH:mm
//   {titulo:una reunión con Vasco}                     → «Reunión con Vasco»

export type PasoGuion = { texto: string } | { llamadas: { nombre: string; argumentos: Record<string, unknown> }[] };

export interface ReglaGuion {
  // Expresión regular, sin distinguir mayúsculas
  si: string;
  pasos: PasoGuion[];
}

export const SIN_REGLA = 'No sé hacer eso todavía.';

const DIAS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');

const iso = (f: FechaLocal) => `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;

function resolver(marca: string, referencia: PeticionModelo['referencia']): string | undefined {
  const hoy = enZona(referencia.instante, referencia.zonaHoraria);
  const [clave, valor = ''] = marca.split(/:(.*)/s);
  const nombre = sinAcentos(clave!.trim().toLowerCase());
  if (nombre === 'hoy') return iso(hoy);
  if (nombre === 'manana') return iso(sumarDias(hoy, 1));
  if (nombre === 'pasado manana') return iso(sumarDias(hoy, 2));
  if (nombre in DIAS) {
    const faltan = (DIAS[nombre]! - diaDeLaSemana(hoy) + 7) % 7 || 7;
    return iso(sumarDias(hoy, faltan));
  }
  if (nombre === 'hora') {
    const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(valor.trim());
    return m ? `${m[1]!.padStart(2, '0')}:${m[2] ?? '00'}` : undefined;
  }
  if (nombre === 'titulo') {
    const limpio = valor.trim().replace(/^(un|una|el|la|los|las)\s+/i, '');
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
  }
  return undefined;
}

function sustituir(valor: unknown, grupos: string[], referencia: PeticionModelo['referencia']): unknown {
  if (typeof valor === 'string') {
    const conGrupos = valor.replace(/\$(\d)/g, (_, n: string) => grupos[Number(n)] ?? '');
    return conGrupos.replace(/\{([^{}]+)\}/g, (todo, marca: string) => resolver(marca, referencia) ?? todo);
  }
  if (Array.isArray(valor)) return valor.map((v) => sustituir(v, grupos, referencia));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, sustituir(v, grupos, referencia)]));
  }
  return valor;
}

// Aproximación de tokens: cuatro caracteres por token. Solo para que la auditoría tenga cifras.
const tokens = (texto: string) => Math.ceil(texto.length / 4);

export class ModeloSimulado implements ProveedorModelo {
  readonly nombre = 'simulado';
  readonly peticiones: PeticionModelo[] = [];
  private caido = false;
  private fallosPendientes = 0;
  private demoraMs = 0;
  private contador = 0;

  constructor(private guion: ReglaGuion[] = []) {}

  usarGuion(guion: ReglaGuion[]): void {
    this.guion = guion;
  }

  // Para probar el modo degradado (P-11)
  caer(): void {
    this.caido = true;
  }

  recuperar(): void {
    this.caido = false;
    this.fallosPendientes = 0;
  }

  // Las próximas `veces` llamadas no responden; después vuelve a funcionar
  fallarProximas(veces: number): void {
    this.fallosPendientes = veces;
  }

  demorar(ms: number): void {
    this.demoraMs = ms;
  }

  async responder(peticion: PeticionModelo, senal: AbortSignal): Promise<RespuestaModelo> {
    this.peticiones.push(peticion);
    await this.esperar(senal);
    if (this.caido) throw new ModeloNoDisponible('el simulado está caído');
    if (this.fallosPendientes > 0) {
      this.fallosPendientes -= 1;
      throw new ModeloNoDisponible('el simulado no respondió');
    }

    const ultima = peticion.mensajes.findLastIndex((m) => m.rol === 'persona');
    const persona = peticion.mensajes[ultima];
    if (!persona || persona.rol !== 'persona') throw new FalloDelModelo('no hay ningún mensaje de la persona');
    // Cuántas veces respondió ya el asistente a este mensaje: es el paso que toca
    const vuelta = peticion.mensajes.slice(ultima + 1).filter((m) => m.rol === 'asistente').length;

    let texto: string | null = null;
    let llamadas: LlamadaHerramienta[] = [];
    const encaje = this.encajar(persona.texto);
    if (!encaje) {
      texto = vuelta === 0 ? SIN_REGLA : '';
    } else {
      const paso = encaje.regla.pasos[vuelta] ?? { texto: '' };
      if ('texto' in paso) texto = String(sustituir(paso.texto, encaje.grupos, peticion.referencia));
      else
        llamadas = paso.llamadas.map((l) => ({
          id: `simulado-${++this.contador}`,
          nombre: l.nombre,
          argumentos: sustituir(l.argumentos, encaje.grupos, peticion.referencia),
        }));
    }

    const entrada = peticion.sistema + JSON.stringify(peticion.mensajes) + JSON.stringify(peticion.herramientas);
    return {
      texto,
      llamadas,
      uso: { tokensEntrada: tokens(entrada), tokensSalida: tokens((texto ?? '') + JSON.stringify(llamadas)) },
      modelo: 'simulado',
    };
  }

  private encajar(texto: string): { regla: ReglaGuion; grupos: string[] } | undefined {
    for (const regla of this.guion) {
      const m = new RegExp(regla.si, 'iu').exec(texto.trim());
      if (m) return { regla, grupos: [...m] };
    }
    return undefined;
  }

  private esperar(senal: AbortSignal): Promise<void> {
    if (senal.aborted) return Promise.reject(new ModeloNoDisponible('la petición se canceló'));
    if (this.demoraMs <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const temporizador = setTimeout(resolve, this.demoraMs);
      senal.addEventListener(
        'abort',
        () => {
          clearTimeout(temporizador);
          reject(new ModeloNoDisponible('la petición se canceló'));
        },
        { once: true },
      );
    });
  }
}
