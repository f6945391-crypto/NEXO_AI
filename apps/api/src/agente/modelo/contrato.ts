import { FalloDelModelo, ModeloNoDisponible, type PeticionModelo, type ProveedorModelo } from './proveedor-modelo';

// T-029 · prueba agente.contrato-del-proveedor. Lo que toda implementación de ProveedorModelo tiene que
// cumplir. Lo ejecutan las pruebas contra el simulado y el no configurado, y lo ejecutará el proveedor real
// (T-036), para que todos se comprueben con los mismos pasos. Un proveedor que no responde también cumple,
// siempre que lo diga con ModeloNoDisponible: así entra el modo degradado (P-11).

export interface PasoContrato {
  nombre: string;
  ejecutar(): Promise<void>;
}

function afirmar(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(`Contrato del proveedor de modelo: ${mensaje}`);
}

const HERRAMIENTA = {
  nombre: 'agenda_consultar',
  descripcion: 'Lee los compromisos de la persona entre dos fechas.',
  esquema: {
    type: 'object',
    properties: { desde: { type: 'string', description: 'AAAA-MM-DD' }, hasta: { type: 'string', description: 'AAAA-MM-DD' } },
    required: ['desde', 'hasta'],
  },
};

export function peticionDeContrato(texto: string): PeticionModelo {
  return {
    sistema: 'Eres el asistente de agenda de NexoAI. Responde en español y en una sola frase.',
    mensajes: [{ rol: 'persona', texto }],
    herramientas: [HERRAMIENTA],
    maxTokens: 200,
    referencia: { instante: new Date('2026-10-23T15:00:00Z'), zonaHoraria: 'America/Lima' },
  };
}

// Responde o lanza uno de los dos errores del puerto; nunca otro.
async function responderOError(proveedor: ProveedorModelo, peticion: PeticionModelo, senal = new AbortController().signal) {
  try {
    return await proveedor.responder(peticion, senal);
  } catch (error) {
    afirmar(error instanceof ModeloNoDisponible || error instanceof FalloDelModelo, `lanzó un error ajeno al puerto: ${String(error)}`);
    return error;
  }
}

export function contratoDelProveedor(proveedor: ProveedorModelo, frases = { texto: 'Hola', herramienta: '¿Qué tengo mañana?' }): PasoContrato[] {
  return [
    {
      nombre: 'tiene nombre',
      async ejecutar() {
        afirmar(typeof proveedor.nombre === 'string' && proveedor.nombre.length > 0, 'sin nombre');
      },
    },
    {
      nombre: 'responde con texto o llamadas, su uso y su modelo, o dice que no está disponible',
      async ejecutar() {
        const r = await responderOError(proveedor, peticionDeContrato(frases.texto));
        if (r instanceof Error) return;
        afirmar(r.texto === null || typeof r.texto === 'string', 'texto que no es texto ni nulo');
        afirmar(Array.isArray(r.llamadas), 'llamadas que no son una lista');
        afirmar(r.texto !== null || r.llamadas.length > 0, 'ni texto ni llamadas');
        afirmar(Number.isInteger(r.uso.tokensEntrada) && r.uso.tokensEntrada >= 0, 'tokens de entrada no válidos');
        afirmar(Number.isInteger(r.uso.tokensSalida) && r.uso.tokensSalida >= 0, 'tokens de salida no válidos');
        afirmar(typeof r.modelo === 'string' && r.modelo.length > 0, 'sin modelo');
      },
    },
    {
      nombre: 'solo llama a herramientas declaradas, cada llamada con su id',
      async ejecutar() {
        const r = await responderOError(proveedor, peticionDeContrato(frases.herramienta));
        if (r instanceof Error) return;
        const ids = new Set<string>();
        for (const llamada of r.llamadas) {
          afirmar(llamada.nombre === HERRAMIENTA.nombre, `llamó a una herramienta que no existe: ${llamada.nombre}`);
          afirmar(typeof llamada.id === 'string' && llamada.id && !ids.has(llamada.id), 'llamada sin id o con id repetido');
          ids.add(llamada.id);
          afirmar(llamada.argumentos && typeof llamada.argumentos === 'object', 'argumentos que no son un objeto');
        }
      },
    },
    {
      nombre: 'con la señal abortada termina enseguida y dice que no está disponible',
      async ejecutar() {
        const control = new AbortController();
        control.abort();
        const comienzo = Date.now();
        const r = await responderOError(proveedor, peticionDeContrato(frases.texto), control.signal);
        afirmar(r instanceof ModeloNoDisponible, 'no lanzó ModeloNoDisponible con la señal abortada');
        afirmar(Date.now() - comienzo < 1_000, 'tardó más de un segundo en rendirse');
      },
    },
  ];
}
