import { ArgsCancelarEvento, ArgsConsultarAgenda, ArgsGuardarTarea, ArgsModificarEvento, ArgsRegistrarEvento } from '@nexoai/contratos';
import { z } from 'zod';
import { crearProveedorModelo } from '../agente/agente.module';
import { instrucciones } from '../agente/grafo/instrucciones';
import { LlamadorModelo } from '../agente/modelo/llamador-modelo';
import type { DefinicionHerramienta } from '../agente/modelo/proveedor-modelo';
import { diaDeLaSemana, enZona, sumarDias, type FechaLocal } from '../agenda/dominio/tiempo';
import { cargarEntorno } from '../plataforma/entorno';

// T-036 · prueba agente.evaluacion · PROPUESTA-TECNICA.md §7.5. El conjunto fijo de frases con el resultado
// esperado, contra el proveedor configurado en .env. **Se ejecuta a mano y gasta cuota del proveedor**: nunca
// en la integración continua. No toca ninguna base de datos ni calendario: solo mira qué herramienta elige el
// modelo y con qué argumentos.
//
//   npx pnpm@12.10.1 --filter @nexoai/api evaluar-asistente

cargarEntorno();

const ZONA = 'America/Lima';
const ahora = new Date();
const hoy = enZona(ahora, ZONA);
const iso = (f: FechaLocal) => `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;
const proximo = (dia: number) => sumarDias(hoy, (dia - diaDeLaSemana(hoy) + 7) % 7 || 7);

const herramienta = (nombre: string, descripcion: string, esquema: z.ZodType): DefinicionHerramienta => ({
  nombre,
  descripcion,
  esquema: z.toJSONSchema(esquema, { io: 'input' }) as Record<string, unknown>,
});

// Las mismas descripciones que registra el agente (herramientas-agenda.ts)
const HERRAMIENTAS = [
  herramienta('agenda_consultar', 'Lee los compromisos de la persona en un rango de días, opcionalmente entre dos horas. Úsala antes de modificar o cancelar, para saber el id.', ArgsConsultarAgenda),
  herramienta('agenda_registrar_evento', 'Propone registrar un compromiso nuevo. Pasa solo lo que la persona dijo; no inventes la fecha, la hora ni el fin.', ArgsRegistrarEvento),
  herramienta('agenda_modificar_evento', 'Propone cambiar el título o el horario de un compromiso propio. Pasa solo lo que cambia.', ArgsModificarEvento),
  herramienta('agenda_cancelar_evento', 'Propone cancelar un compromiso propio.', ArgsCancelarEvento),
  herramienta('captura_guardar_tarea', 'Guarda una tarea, un pendiente o algo que se espera de alguien; las tareas llegan en una próxima versión.', ArgsGuardarTarea),
];

type Caso = { frase: string; espera: string; comprobar: (nombre: string | null, args: Record<string, unknown>, texto: string | null) => boolean };

const CASOS: Caso[] = [
  {
    frase: 'Agéndame una reunión con Vasco el viernes a las 10',
    espera: `registrar el ${iso(proximo(5))} a las 10:00, sin hora de fin`,
    comprobar: (n, a) => n === 'agenda_registrar_evento' && a.fecha === iso(proximo(5)) && a.horaInicio === '10:00' && !a.horaFin,
  },
  {
    frase: 'Mañana a las 4 de la tarde tengo dentista',
    espera: `registrar el ${iso(sumarDias(hoy, 1))} a las 16:00`,
    comprobar: (n, a) => n === 'agenda_registrar_evento' && a.fecha === iso(sumarDias(hoy, 1)) && a.horaInicio === '16:00' && !a.horaFin,
  },
  {
    frase: 'Pasado mañana taller de 9 a 11',
    espera: `registrar el ${iso(sumarDias(hoy, 2))} de 09:00 a 11:00`,
    comprobar: (n, a) => n === 'agenda_registrar_evento' && a.fecha === iso(sumarDias(hoy, 2)) && a.horaInicio === '09:00' && a.horaFin === '11:00',
  },
  {
    frase: 'Agéndame algo con Vasco',
    espera: 'registrar sin fecha ni hora (no las inventa)',
    comprobar: (n, a) => n === 'agenda_registrar_evento' && !a.fecha && !a.horaInicio,
  },
  {
    frase: '¿Qué tengo mañana por la tarde?',
    espera: `consultar el ${iso(sumarDias(hoy, 1))}`,
    comprobar: (n, a) => n === 'agenda_consultar' && a.desde === iso(sumarDias(hoy, 1)) && a.hasta === iso(sumarDias(hoy, 1)),
  },
  {
    frase: 'Mueve el comité de arquitectura al jueves',
    espera: 'consultar antes de mover, para saber el id',
    comprobar: (n) => n === 'agenda_consultar',
  },
  {
    frase: 'Recuérdame pagar el recibo antes del sábado',
    espera: 'guardar como tarea',
    comprobar: (n) => n === 'captura_guardar_tarea',
  },
  {
    frase: 'Mándale un correo a Juan',
    espera: 'decir que no lo sabe hacer, sin herramientas',
    comprobar: (n, _a, t) => n === null && !!t,
  },
];

// El nivel gratuito de Groq admite pocos tokens por minuto (H-AGT-13): una pausa entre casos
const PAUSA_MS = Number(process.env.EVALUACION_PAUSA_MS ?? 8_000);
const dormir = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const proveedor = crearProveedorModelo();
  const llamador = new LlamadorModelo(proveedor);
  console.log(`Proveedor: ${proveedor.nombre} · ${process.env.MODELO_NOMBRE ?? ''} · ${CASOS.length} casos\n`);
  let aciertos = 0;
  let tokens = 0;
  for (const [i, caso] of CASOS.entries()) {
    if (i > 0) await dormir(PAUSA_MS);
    const r = await llamador.llamar({
      sistema: instrucciones({ instante: ahora, zonaHoraria: ZONA }),
      mensajes: [{ rol: 'persona', texto: caso.frase }],
      herramientas: HERRAMIENTAS,
      maxTokens: 1024,
      referencia: { instante: ahora, zonaHoraria: ZONA },
    });
    if (!r.ok) {
      console.log(`✗ «${caso.frase}»\n    ${r.error.message}\n`);
      continue;
    }
    tokens += r.respuesta.uso.tokensEntrada + r.respuesta.uso.tokensSalida;
    const llamada = r.respuesta.llamadas[0];
    const args = (llamada?.argumentos ?? {}) as Record<string, unknown>;
    const bien = caso.comprobar(llamada?.nombre ?? null, args, r.respuesta.texto);
    if (bien) aciertos += 1;
    console.log(`${bien ? '✓' : '✗'} «${caso.frase}»\n    espera: ${caso.espera}\n    hizo:   ${llamada ? `${llamada.nombre} ${JSON.stringify(args)}` : `texto: ${r.respuesta.texto}`}\n`);
  }
  console.log(`${aciertos} de ${CASOS.length} aciertos · ${tokens} tokens`);
  process.exitCode = aciertos === CASOS.length ? 0 : 1;
}

void main();
