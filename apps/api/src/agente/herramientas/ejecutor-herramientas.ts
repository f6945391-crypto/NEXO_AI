import { HttpException, Injectable } from '@nestjs/common';
import { ErrorApi } from '@nexoai/contratos';
import { z } from 'zod';
import type { ContextoSolicitud } from '../../identidad/contexto';
import { PrismaService } from '../../plataforma/prisma.service';
import type { DefinicionHerramienta, LlamadaHerramienta } from '../modelo/proveedor-modelo';
import { esNombreInterno, type NombresInternos } from '../texto-llano';
import { nombreParaModelo, type EntornoHerramienta, type Herramienta, type ResultadoHerramienta } from './herramienta';

// P-01, P-07 · T-030 · specs/07-agente/plan.md §5 y §8. La única forma de que el modelo actúe: valida los
// argumentos antes de hacer nada, audita cada invocación con argumentos y resultado, y si una llamada se
// repite (el grafo reanuda un paso) devuelve el resultado guardado sin volver a ejecutarla.

export interface ResultadoInvocacion extends ResultadoHerramienta {
  // Verdadero si la llamada ya se había ejecutado y se devolvió lo guardado
  repetida: boolean;
}

// Lo que se le dice al modelo cuando algo falla, para que pueda corregirlo o preguntar.
const conError = (codigo: string, mensaje: string, campos?: string[]): ResultadoHerramienta => ({
  paraModelo: { error: { codigo, mensaje, ...(campos ? { campos } : {}) } },
});

function errorParaModelo(error: unknown): ResultadoHerramienta {
  if (error instanceof HttpException) {
    const cuerpo = ErrorApi.safeParse(error.getResponse());
    if (cuerpo.success) return conError(cuerpo.data.codigo, cuerpo.data.mensaje, cuerpo.data.campos);
  }
  // El detalle queda en el registro del servidor; al modelo solo le llega que no se pudo
  console.error('Herramienta del agente:', error);
  return conError('ERROR_INTERNO', 'No se pudo completar esta acción.');
}

// Prisma guarda JSON: se descarta lo que no lo es (fechas a texto, undefined fuera)
const comoJson = <T>(valor: T): T => JSON.parse(JSON.stringify(valor ?? null)) as T;

const esClaveRepetida = (error: unknown) => (error as { code?: string } | null)?.code === 'P2002';

@Injectable()
export class EjecutorHerramientas {
  private readonly herramientas = new Map<string, Herramienta>();

  constructor(private readonly prisma: PrismaService) {}

  registrar<A>(herramienta: Herramienta<A>): void {
    const clave = nombreParaModelo(herramienta.nombre);
    if (this.herramientas.has(clave)) throw new Error(`Herramienta repetida: ${herramienta.nombre}`);
    this.herramientas.set(clave, herramienta as Herramienta);
  }

  // Lo que ve el modelo de cada herramienta: nombre, descripción y esquema JSON del contrato (AD-08)
  definiciones(): DefinicionHerramienta[] {
    return [...this.herramientas.entries()].map(([nombre, h]) => ({
      nombre,
      descripcion: h.descripcion,
      esquema: z.toJSONSchema(h.esquema, { io: 'input' }) as Record<string, unknown>,
    }));
  }

  // T-142 · REQ-AGT-06: lo que la persona no debe leer en una respuesta, sacado de este registro: el nombre de
  // cada herramienta, con punto y como lo ve el modelo, y los campos de sus argumentos
  nombresInternos(): NombresInternos {
    const herramientas: string[] = [];
    // T-143: el id de la propuesta abierta lo nombra la nota (escribirPropuestaAbierta), no un esquema
    const campos = new Set<string>(['propuestaId']);
    for (const [nombre, h] of this.herramientas.entries()) {
      herramientas.push(nombre, h.nombre);
      const esquema = z.toJSONSchema(h.esquema, { io: 'input' }) as { properties?: Record<string, unknown> };
      for (const campo of Object.keys(esquema.properties ?? {})) if (esNombreInterno(campo)) campos.add(campo);
    }
    return { herramientas, campos: [...campos] };
  }

  async ejecutar(
    contexto: ContextoSolicitud,
    entorno: EntornoHerramienta,
    llamada: LlamadaHerramienta,
    llamadaModeloId: string | null,
  ): Promise<ResultadoInvocacion> {
    const datos = this.prisma.deOrganizacion(contexto.organizacionId);
    const herramienta = this.herramientas.get(llamada.nombre);
    const comienzo = Date.now();

    // Se reserva la llamada antes de ejecutarla: si dos pasos la repiten a la vez, solo uno la ejecuta
    let invocacionId: string;
    try {
      const reservada = await datos.invocacionHerramienta.create({
        data: {
          organizacionId: contexto.organizacionId,
          perfilId: contexto.perfilId,
          conversacionId: entorno.conversacionId,
          llamadaModeloId,
          idLlamada: llamada.id,
          herramienta: herramienta?.nombre ?? llamada.nombre,
          argumentos: comoJson(llamada.argumentos ?? {}) as object,
          duracionMs: 0,
        },
      });
      invocacionId = reservada.id;
    } catch (error) {
      if (!esClaveRepetida(error)) throw error;
      const previa = await datos.invocacionHerramienta.findFirst({
        where: { conversacionId: entorno.conversacionId, idLlamada: llamada.id, perfilId: contexto.perfilId },
      });
      if (previa?.resultado) return { ...(previa.resultado as unknown as ResultadoHerramienta), repetida: true };
      return { ...conError('LLAMADA_EN_CURSO', 'Esta acción ya se está haciendo.'), repetida: true };
    }

    let resultado: ResultadoHerramienta;
    let codigoError: string | null = null;
    if (!herramienta) {
      resultado = conError('HERRAMIENTA_DESCONOCIDA', `No existe la herramienta ${llamada.nombre}.`);
    } else {
      const argumentos = herramienta.esquema.safeParse(llamada.argumentos);
      if (!argumentos.success) {
        // Si el modelo inventa o equivoca un argumento, falla la validación y no se hace nada (PROPUESTA §7.2)
        const campos = [...new Set(argumentos.error.issues.map((i) => String(i.path[0] ?? '')).filter(Boolean))];
        resultado = conError('ARGUMENTOS_INVALIDOS', 'Los datos de la herramienta no tienen el formato esperado.', campos);
      } else {
        try {
          resultado = await herramienta.ejecutar(contexto, argumentos.data, entorno);
        } catch (error) {
          resultado = errorParaModelo(error);
        }
      }
    }
    const error = (resultado.paraModelo as { error?: { codigo?: string } } | null)?.error;
    if (error?.codigo) codigoError = error.codigo;

    const guardado = comoJson(resultado);
    await datos.invocacionHerramienta.update({
      where: { id: invocacionId },
      data: {
        resultado: guardado as object,
        error: codigoError,
        operacionId: resultado.operacionId ?? null,
        duracionMs: Date.now() - comienzo,
      },
    });
    return { ...guardado, repetida: false };
  }
}
