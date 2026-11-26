import { Injectable, Logger } from '@nestjs/common';
import { RESUMEN_BITACORA_MAXIMO } from '@nexoai/contratos';
import { AVISO_CONTENIDO_EXTERNO } from '../agente/herramientas/contenido-externo';
import { LlamadasAuditadas } from '../agente/llamadas-auditadas';
import type { PeticionModelo } from '../agente/modelo/proveedor-modelo';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PrismaService } from '../plataforma/prisma.service';
import { textoAvance } from './dominio/formato';

// T-129 · specs/09-tareas-personales/plan.md §13.8 · REQ-CUN03-28 · H-TP-33 a 35. El resumen breve de la
// bitácora, redactado por el asistente en el proceso trabajador. Cada hora se repasan las tareas, pero cada una
// se resume como mucho una vez al día y solo si hubo avances después de su último resumen: cada resumen cuesta
// una llamada al modelo. Leer una tarea nunca genera uno. Recibe `ahora`, para que las pruebas no esperen un día.

export const INTERVALO_RESUMEN_MS = 24 * 3_600_000;
// Tope por pasada: lo que no entra, entra en la siguiente, una hora después
export const RESUMENES_POR_PASADA = 50;

// El simulado reconoce la petición por esta primera línea (guion de demostración)
export const MARCA_PETICION_RESUMEN = 'Resumen de la bitácora de una tarea.';

// H-TP-34: breves y fijas. Ve solo esta tarea, y sus textos llegan marcados como datos (H-AGT-15)
export const INSTRUCCIONES_RESUMEN = [
  'Eres el asistente de NexoAI. Resume en una o dos frases, en español, cómo va una tarea personal y qué falta, usando solo lo que está anotado en su bitácora.',
  'No inventes nada que no esté anotado, no prometas nada, no propongas acciones ni saludes.',
  `Responde solo con el resumen, en texto plano, sin comillas ni viñetas, en menos de ${RESUMEN_BITACORA_MAXIMO} caracteres.`,
].join('\n');

export type ResultadoResumenes = { resumidas: number; fallidas: number };

const enUnaLinea = (texto: string) => texto.replace(/\s+/g, ' ').trim();

@Injectable()
export class ResumenesBitacora {
  private readonly registro = new Logger('ResumenesBitacora');

  constructor(
    private readonly prisma: PrismaService,
    private readonly llamadas: LlamadasAuditadas,
  ) {}

  // sinAislar (justificado como el ciclo de vida de specs/07-agente/plan.md §14.8): es un trabajo de
  // mantenimiento sobre todas las organizaciones, que solo elige identificadores. Lo que lee y escribe de cada
  // tarea, y la llamada auditada, se hace después aislado por su organización.
  async repasar(ahora = new Date()): Promise<ResultadoResumenes> {
    const corte = new Date(ahora.getTime() - INTERVALO_RESUMEN_MS);
    const candidatas = await this.prisma.sinAislar.tareaPersonal.findMany({
      where: { estado: 'pendiente', avances: { some: {} }, OR: [{ resumenEn: null }, { resumenEn: { lt: corte } }] },
      select: {
        id: true,
        organizacionId: true,
        resumenEn: true,
        perfil: { select: { id: true, rol: true, plan: true } },
        avances: { select: { anotadoEn: true }, orderBy: { anotadoEn: 'desc' }, take: 1 },
      },
      orderBy: [{ resumenEn: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
      take: RESUMENES_POR_PASADA,
    });

    let resumidas = 0;
    let fallidas = 0;
    for (const c of candidatas) {
      // H-TP-33: solo con avances anotados después del último resumen
      const ultimo = c.avances[0]?.anotadoEn;
      if (!ultimo || (c.resumenEn && ultimo <= c.resumenEn)) continue;
      const contexto: ContextoSolicitud = { perfilId: c.perfil.id, organizacionId: c.organizacionId, rol: c.perfil.rol, plan: c.perfil.plan, primerIngresoPendiente: false };
      if (await this.resumir(contexto, c.id, c.resumenEn, ahora)) resumidas += 1;
      else fallidas += 1;
    }

    const resultado = { resumidas, fallidas };
    if (resumidas + fallidas > 0) this.registro.log(JSON.stringify(resultado));
    return resultado;
  }

  // Una tarea: una llamada sin herramientas, auditada con su costo (P-07). Respuesta vacía, de más de 280
  // caracteres, con llamadas a herramientas o fallo: no se guarda nada y queda el resumen anterior.
  private async resumir(contexto: ContextoSolicitud, tareaId: string, resumenEnAnterior: Date | null, ahora: Date): Promise<boolean> {
    const datos = this.prisma.deOrganizacion(contexto.organizacionId);
    const tarea = await datos.tareaPersonal.findFirst({ where: { id: tareaId, perfilId: contexto.perfilId, estado: 'pendiente' } });
    if (!tarea) return false;
    const avances = await datos.avanceTarea.findMany({
      where: { tareaId, perfilId: contexto.perfilId },
      orderBy: [{ anotadoEn: 'desc' }, { id: 'desc' }],
    });
    const perfil = await datos.perfilUsuario.findFirst({ where: { id: contexto.perfilId }, select: { zonaHoraria: true } });
    const zona = perfil?.zonaHoraria ?? 'UTC';

    const entrada = [
      MARCA_PETICION_RESUMEN,
      AVISO_CONTENIDO_EXTERNO,
      `Tarea: ${enUnaLinea(tarea.texto)}`,
      ...(tarea.contexto ? [`Contexto: ${enUnaLinea(tarea.contexto)}`] : []),
      'Avances, del más reciente al más antiguo:',
      ...avances.map((a) => `- [${textoAvance(a.anotadoEn, zona)}] ${enUnaLinea(a.texto)}`),
    ].join('\n');
    const peticion: PeticionModelo = {
      sistema: INSTRUCCIONES_RESUMEN,
      mensajes: [{ rol: 'persona', texto: entrada }],
      herramientas: [],
      // El modelo de Groq razona antes de responder y ese razonamiento cuenta: con 200 cortaba el resumen
      maxTokens: 1024,
      referencia: { instante: ahora, zonaHoraria: zona },
    };

    const llamada = await this.llamadas.llamar(contexto, null, peticion);
    if (!llamada.ok) return false;
    const texto = enUnaLinea(llamada.respuesta.texto ?? '');
    if (llamada.respuesta.llamadas.length > 0 || !texto || texto.length > RESUMEN_BITACORA_MAXIMO) return false;

    // Solo si nadie la cerró ni la resumió mientras tanto
    const guardado = await datos.tareaPersonal.updateMany({
      where: { id: tareaId, perfilId: contexto.perfilId, estado: 'pendiente', resumenEn: resumenEnAnterior },
      data: { resumen: texto, resumenEn: ahora },
    });
    return guardado.count === 1;
  }
}
