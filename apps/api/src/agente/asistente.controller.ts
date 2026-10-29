import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  DecisionAsistente,
  MensajeAsistente,
  type ConversacionAsistente,
  type RespuestaAsistente,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { Contexto, SobreLoPropio } from '../identidad/decoradores';
import { ValidarCon } from '../plataforma/errores';
import { AsistenteService } from './asistente.service';

// specs/07-agente/plan.md §9 · T-032. La conversación con el asistente. Cada uno conversa sobre lo suyo; el
// colaborador también (REQ-ACC-13). Ninguna herramienta de esta fase asigna trabajo a otros.
@SobreLoPropio()
@Controller('asistente')
export class AsistenteController {
  constructor(private readonly asistente: AsistenteService) {}

  @Get('conversacion')
  conversacion(@Contexto() contexto: ContextoSolicitud): Promise<ConversacionAsistente> {
    return this.asistente.conversacion(contexto);
  }

  @Post('mensajes')
  @HttpCode(200)
  enviar(@Contexto() contexto: ContextoSolicitud, @Body(new ValidarCon(MensajeAsistente)) cuerpo: MensajeAsistente): Promise<RespuestaAsistente> {
    return this.asistente.enviar(contexto, cuerpo.texto);
  }

  @Post('decisiones')
  @HttpCode(200)
  decidir(@Contexto() contexto: ContextoSolicitud, @Body(new ValidarCon(DecisionAsistente)) cuerpo: DecisionAsistente): Promise<RespuestaAsistente> {
    return this.asistente.decidir(contexto, cuerpo);
  }
}
