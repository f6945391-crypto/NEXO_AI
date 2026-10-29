import { MemorySaver } from '@langchain/langgraph';
import type { PrismaDeOrganizacion } from '../../plataforma/aislamiento';

// specs/07-agente/plan.md §4.3 · T-032. El punto de control del grafo de una conversación, guardado con
// Prisma. Hereda la lógica oficial del punto de control en memoria de LangGraph y solo añade cargar y
// guardar lo suyo en una fila de `punto_control_agente`, dentro de la organización (P-04). El paquete
// de LangGraph para Postgres se descartó porque crea sus tablas fuera de Prisma Migrate y del filtro por
// organización. Así, una propuesta que espera la decisión de la persona sobrevive a un reinicio (P-03).

// Puntos que se conservan por conversación: el grafo solo necesita el último y su padre
export const PUNTOS_CONSERVADOS = 10;

type Puntos = MemorySaver['storage'][string];
type Escrituras = MemorySaver['writes'];

// Lo guardado en `datos`: los mismos objetos de MemorySaver, con los bytes en base64
type Guardado = {
  puntos: Record<string, Record<string, [string, string, string | null]>>;
  escrituras: Record<string, Record<string, [string, string, string, string]>>;
};

const aBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const deBase64 = (texto: string) => new Uint8Array(Buffer.from(texto, 'base64'));

export class PuntoControlConversacion extends MemorySaver {
  private constructor(
    private readonly datos: PrismaDeOrganizacion,
    private readonly organizacionId: string,
    private readonly conversacionId: string,
  ) {
    super();
  }

  static async cargar(datos: PrismaDeOrganizacion, organizacionId: string, conversacionId: string): Promise<PuntoControlConversacion> {
    const punto = new PuntoControlConversacion(datos, organizacionId, conversacionId);
    const fila = await datos.puntoControlAgente.findFirst({ where: { conversacionId } });
    const guardado = fila?.datos as Guardado | undefined;
    if (guardado?.puntos) {
      const puntos: Puntos = Object.create(null);
      for (const [espacio, porId] of Object.entries(guardado.puntos)) {
        puntos[espacio] = Object.create(null);
        for (const [id, [punto_, metadatos, padre]] of Object.entries(porId)) {
          puntos[espacio]![id] = [deBase64(punto_), deBase64(metadatos), padre ?? undefined];
        }
      }
      punto.storage[conversacionId] = puntos;
      for (const [clave, internas] of Object.entries(guardado.escrituras ?? {})) {
        punto.writes[clave] = Object.create(null);
        for (const [interna, [tarea, canal, valor, ruta]] of Object.entries(internas)) {
          punto.writes[clave]![interna] = [tarea, canal, deBase64(valor), ruta];
        }
      }
    }
    return punto;
  }

  override async put(...argumentos: Parameters<MemorySaver['put']>) {
    this.exigirConversacion(argumentos[0].configurable?.thread_id);
    const resultado = await super.put(...argumentos);
    await this.guardar();
    return resultado;
  }

  override async putWrites(...argumentos: Parameters<MemorySaver['putWrites']>) {
    this.exigirConversacion(argumentos[0].configurable?.thread_id);
    await super.putWrites(...argumentos);
    await this.guardar();
  }

  override async getTuple(...argumentos: Parameters<MemorySaver['getTuple']>) {
    this.exigirConversacion(argumentos[0].configurable?.thread_id);
    return super.getTuple(...argumentos);
  }

  // Un punto de control por conversación: nunca lee ni escribe el de otra
  private exigirConversacion(hilo: unknown): void {
    if (hilo !== this.conversacionId) throw new Error('El punto de control pertenece a otra conversación');
  }

  // LangGraph guarda puntos y escrituras a la vez: se guardan de uno en uno, cada vez con lo último
  private cola: Promise<void> = Promise.resolve();

  private guardar(): Promise<void> {
    const siguiente = this.cola.then(() => this.persistir());
    this.cola = siguiente.catch(() => undefined);
    return siguiente;
  }

  private async persistir(): Promise<void> {
    const guardado: Guardado = { puntos: {}, escrituras: {} };
    const conservados = new Set<string>();
    for (const [espacio, porId] of Object.entries(this.storage[this.conversacionId] ?? {})) {
      // Los identificadores de LangGraph se ordenan en el tiempo, como los ordena MemorySaver
      const ids = Object.keys(porId).sort().reverse().slice(0, PUNTOS_CONSERVADOS);
      guardado.puntos[espacio] = {};
      for (const id of ids) {
        const [punto, metadatos, padre] = porId[id]!;
        guardado.puntos[espacio]![id] = [aBase64(punto), aBase64(metadatos), padre ?? null];
        conservados.add(JSON.stringify([this.conversacionId, espacio, id]));
      }
    }
    const escrituras: Escrituras = this.writes;
    for (const [clave, internas] of Object.entries(escrituras)) {
      if (!conservados.has(clave)) continue;
      guardado.escrituras[clave] = {};
      for (const [interna, [tarea, canal, valor, ruta]] of Object.entries(internas)) {
        guardado.escrituras[clave]![interna] = [tarea, canal, aBase64(valor), ruta ?? ''];
      }
    }
    await this.datos.puntoControlAgente.upsert({
      where: { conversacionId: this.conversacionId },
      create: { organizacionId: this.organizacionId, conversacionId: this.conversacionId, datos: guardado },
      update: { datos: guardado },
    });
  }
}
