import { Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AUDIO_DICTADO_MAXIMO_BYTES, type RespuestaDictado } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, SobreLoPropio } from '../identidad/decoradores';
import { DictadoService } from './dictado.service';

// T-154 · REQ-CAP-27 · plan de 07-agente §15.1. POST /asistente/dictado, multipart con el campo `audio`.
// El límite de multer va un poco por encima del de la API, para que el 413 lo dé el servicio con su código.
type ArchivoSubido = { buffer: Buffer; mimetype: string; originalname: string; size: number };

@SobreLoPropio()
@Controller('asistente')
export class DictadoController {
  constructor(private readonly dictado: DictadoService) {}

  @Post('dictado')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: AUDIO_DICTADO_MAXIMO_BYTES + 1, files: 1 } }))
  dictar(@Contexto() contexto: ContextoSolicitud, @UploadedFile() archivo: ArchivoSubido | undefined): Promise<RespuestaDictado> {
    return this.dictado.dictar(contexto, archivo ? { datos: archivo.buffer, tipo: archivo.mimetype, nombre: archivo.originalname || 'dictado' } : null);
  }
}
