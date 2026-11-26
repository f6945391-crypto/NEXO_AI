import { Injectable } from '@nestjs/common';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PrismaService } from '../plataforma/prisma.service';
import { LlamadorModelo, type ResultadoLlamada } from './modelo/llamador-modelo';
import type { PeticionModelo } from './modelo/proveedor-modelo';

// P-07 · T-030 · specs/07-agente/plan.md §8. Toda llamada al modelo queda registrada, también la que no
// respondió o falló, con sus tokens y su costo. El costo nulo significa desconocido, nunca gratis.
@Injectable()
export class LlamadasAuditadas {
  constructor(
    private readonly llamador: LlamadorModelo,
    private readonly prisma: PrismaService,
  ) {}

  async llamar(
    contexto: ContextoSolicitud,
    conversacionId: string | null,
    peticion: PeticionModelo,
  ): Promise<ResultadoLlamada & { llamadaModeloId: string }> {
    const resultado = await this.llamador.llamar(peticion);
    const { registro } = resultado;
    const fila = await this.prisma.deOrganizacion(contexto.organizacionId).llamadaModelo.create({
      data: {
        organizacionId: contexto.organizacionId,
        perfilId: contexto.perfilId,
        conversacionId,
        proveedor: registro.proveedor,
        modelo: registro.modelo,
        tokensEntrada: registro.uso?.tokensEntrada ?? null,
        tokensSalida: registro.uso?.tokensSalida ?? null,
        costoUsd: registro.costoUsd,
        duracionMs: registro.duracionMs,
        intentos: registro.intentos,
        desenlace: registro.desenlace,
        error: registro.error,
      },
    });
    return { ...resultado, llamadaModeloId: fila.id };
  }
}
