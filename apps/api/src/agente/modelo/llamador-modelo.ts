import { Inject, Injectable, Optional } from '@nestjs/common';
import { costoUsd } from './precios-modelo';
import {
  FalloDelModelo,
  ModeloNoDisponible,
  PROVEEDOR_MODELO,
  type PeticionModelo,
  type ProveedorModelo,
  type RespuestaModelo,
  type UsoModelo,
} from './proveedor-modelo';

// T-029 · plan §3, H-AGT-03. Envuelve al proveedor: tiempo límite por intento y reintentos solo cuando no
// responde. Devuelve siempre el registro de la llamada, también si falló, para auditarla con su costo (P-07).

export const OPCIONES_LLAMADOR = Symbol('OPCIONES_LLAMADOR');

export interface OpcionesLlamador {
  limiteMs: number;
  // Espera antes de cada reintento: tantos reintentos como esperas
  esperasMs: number[];
}

export const OPCIONES_POR_DEFECTO: OpcionesLlamador = { limiteMs: 30_000, esperasMs: [1_000, 3_000] };

export type DesenlaceLlamada = 'ok' | 'no_disponible' | 'error';

export interface RegistroLlamada {
  proveedor: string;
  modelo: string | null;
  uso: UsoModelo | null;
  // Nulo si el modelo no tiene precio conocido o no respondió
  costoUsd: number | null;
  duracionMs: number;
  intentos: number;
  desenlace: DesenlaceLlamada;
  error: string | null;
}

export type ResultadoLlamada =
  | { ok: true; respuesta: RespuestaModelo; registro: RegistroLlamada }
  | { ok: false; error: ModeloNoDisponible | FalloDelModelo; registro: RegistroLlamada };

const dormir = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function comprobarForma(respuesta: RespuestaModelo): void {
  const bien =
    respuesta &&
    (respuesta.texto === null || typeof respuesta.texto === 'string') &&
    Array.isArray(respuesta.llamadas) &&
    respuesta.llamadas.every((l) => typeof l.id === 'string' && l.id && typeof l.nombre === 'string' && l.nombre) &&
    typeof respuesta.modelo === 'string' &&
    respuesta.modelo &&
    Number.isFinite(respuesta.uso?.tokensEntrada) &&
    Number.isFinite(respuesta.uso?.tokensSalida);
  if (!bien) throw new FalloDelModelo('la respuesta no tiene la forma esperada');
}

@Injectable()
export class LlamadorModelo {
  private readonly opciones: OpcionesLlamador;

  constructor(
    @Inject(PROVEEDOR_MODELO) private readonly proveedor: ProveedorModelo,
    @Optional() @Inject(OPCIONES_LLAMADOR) opciones?: OpcionesLlamador,
  ) {
    this.opciones = opciones ?? OPCIONES_POR_DEFECTO;
  }

  get nombreProveedor(): string {
    return this.proveedor.nombre;
  }

  async llamar(peticion: PeticionModelo): Promise<ResultadoLlamada> {
    const comienzo = Date.now();
    let intentos = 0;
    let ultimo: ModeloNoDisponible | FalloDelModelo = new ModeloNoDisponible('sin intentos');

    for (let i = 0; i <= this.opciones.esperasMs.length; i++) {
      if (i > 0) await dormir(this.opciones.esperasMs[i - 1]!);
      intentos += 1;
      try {
        const respuesta = await this.intento(peticion);
        comprobarForma(respuesta);
        return {
          ok: true,
          respuesta,
          registro: this.registro(comienzo, intentos, 'ok', null, respuesta),
        };
      } catch (error) {
        ultimo = error instanceof ModeloNoDisponible || error instanceof FalloDelModelo ? error : new FalloDelModelo(error instanceof Error ? error.message : String(error));
        // Solo se reintenta lo que no respondió; un fallo se repetiría igual
        if (ultimo instanceof FalloDelModelo) break;
      }
    }
    const desenlace: DesenlaceLlamada = ultimo instanceof ModeloNoDisponible ? 'no_disponible' : 'error';
    return { ok: false, error: ultimo, registro: this.registro(comienzo, intentos, desenlace, ultimo.message, null) };
  }

  // Un intento con su tiempo límite. Si el proveedor no atiende la señal, el límite se impone igual.
  private async intento(peticion: PeticionModelo): Promise<RespuestaModelo> {
    const control = new AbortController();
    let temporizador: NodeJS.Timeout | undefined;
    const limite = new Promise<never>((_, reject) => {
      temporizador = setTimeout(() => {
        control.abort();
        reject(new ModeloNoDisponible(`sin respuesta en ${this.opciones.limiteMs} ms`));
      }, this.opciones.limiteMs);
    });
    try {
      return await Promise.race([this.proveedor.responder(peticion, control.signal), limite]);
    } finally {
      clearTimeout(temporizador);
    }
  }

  private registro(
    comienzo: number,
    intentos: number,
    desenlace: DesenlaceLlamada,
    error: string | null,
    respuesta: RespuestaModelo | null,
  ): RegistroLlamada {
    return {
      proveedor: this.proveedor.nombre,
      modelo: respuesta?.modelo ?? null,
      uso: respuesta?.uso ?? null,
      costoUsd: respuesta ? costoUsd(respuesta.modelo, respuesta.uso) : null,
      duracionMs: Date.now() - comienzo,
      intentos,
      desenlace,
      error,
    };
  }
}
