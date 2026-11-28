import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIO_DICTADO_MAXIMO_BYTES, type RespuestaDictado } from '@nexoai/contratos';
import { normalizarEspacios } from '../agente/texto-llano';
import type { ContextoSolicitud } from '../identidad/contexto';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { DictadoNoDisponible, TRANSCRIPTOR_VOZ, type AudioDictado, type TranscriptorVoz } from './transcriptor';

// T-154 · REQ-CAP-27, 13 · plan de 07-agente §15.1. Recibe el audio en memoria, lo pasa al proveedor y devuelve
// el texto. No guarda el audio ni el texto (H-CAP-08); la auditoría anota solo cuántos segundos y cuánto costó.

// El del proveedor de OpenRouter
const TIEMPO_LIMITE_MS = 60_000;
// Un archivo de audio, también lo que da el navegador o el teléfono (webm de Chrome, mp4 de Safari, m4a de iOS)
const ES_AUDIO = /^(audio\/|video\/webm|video\/mp4|application\/octet-stream)/;

export const MENSAJE_VOZ_NO_DISPONIBLE = 'El dictado no está disponible ahora. Puedes escribirlo.';

@Injectable()
export class DictadoService {
  private readonly registro = new Logger('Dictado');

  constructor(
    @Inject(TRANSCRIPTOR_VOZ) private readonly transcriptor: TranscriptorVoz,
    private readonly prisma: PrismaService,
  ) {}

  async dictar(contexto: ContextoSolicitud, audio: AudioDictado | null): Promise<RespuestaDictado> {
    if (!audio || audio.datos.length === 0 || !ES_AUDIO.test(audio.tipo)) throw errorApi(400, 'AUDIO_NO_VALIDO', 'No llegó un audio que se pueda transcribir.');
    if (audio.datos.length > AUDIO_DICTADO_MAXIMO_BYTES) throw errorApi(413, 'AUDIO_DEMASIADO_GRANDE', 'El audio es demasiado largo. Graba como mucho cinco minutos.');
    let resultado;
    try {
      resultado = await this.transcriptor.transcribir(audio, AbortSignal.timeout(TIEMPO_LIMITE_MS));
    } catch (error) {
      if (error instanceof DictadoNoDisponible) {
        this.registro.warn(`Dictado no disponible (${this.transcriptor.nombre}): ${error.message}`);
        throw errorApi(503, 'VOZ_NO_DISPONIBLE', MENSAJE_VOZ_NO_DISPONIBLE);
      }
      throw error;
    }
    await this.prisma.deOrganizacion(contexto.organizacionId).eventoAuditoria.create({
      data: {
        organizacionId: contexto.organizacionId,
        perfilId: contexto.perfilId,
        accion: 'dictado',
        detalle: { proveedor: this.transcriptor.nombre, bytes: audio.datos.length, segundos: resultado.segundos, costoUsd: resultado.costoUsd },
      },
    });
    return { texto: normalizarEspacios(resultado.texto).replace(/\s+/g, ' ').trim() };
  }
}
