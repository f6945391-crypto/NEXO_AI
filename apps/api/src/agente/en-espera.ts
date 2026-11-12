import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../plataforma/prisma.service';
import { AsistenteService } from './asistente.service';

// P-11 · T-033 · specs/07-agente/plan.md §7. Repasa lo que quedó en espera y lo atiende cuando su motivo
// ya no aplica: el asistente vuelve a responder o la persona conectó su calendario. Lo hace por orden de
// captura, y en cuanto el asistente no responde, para: el resto seguiría igual. T-052 · REQ-CUN03-09: las tareas que
// esperaban una función por llegar (REQ-AGT-02) se atienden también: ya existen las tareas personales.

// Por pasada, para no gastar de golpe la cuota del proveedor (H-AGT-13)
export const POR_PASADA = 20;

export type ResultadoPasada = { atendidas: number; propuestas: number; detenida: boolean };

@Injectable()
export class ProcesadorEnEspera {
  private readonly registro = new Logger('EnEspera');

  constructor(
    private readonly prisma: PrismaService,
    private readonly asistente: AsistenteService,
  ) {}

  async repasar(): Promise<ResultadoPasada> {
    // sinAislar (justificado en specs/07-agente/plan.md §7): como el trabajador del calendario, no atiende
    // a nadie en concreto y necesita ver lo encolado de todas las organizaciones. Solo lee identificadores y
    // la identidad de cada perfil; cada solicitud se atiende después aislada por su organización.
    const encoladas = await this.prisma.sinAislar.operacion.findMany({
      where: { estado: 'en_espera', motivoEspera: { in: ['asistente_no_disponible', 'permiso_faltante', 'funcion_por_llegar'] } },
      orderBy: { capturadaEn: 'asc' },
      take: POR_PASADA,
      select: {
        id: true,
        motivoEspera: true,
        organizacionId: true,
        perfil: { select: { id: true, rol: true, plan: true, consentimientos: { where: { proveedor: 'google', alcance: 'calendario', estado: 'concedido' }, select: { id: true } } } },
      },
    });

    const resultado: ResultadoPasada = { atendidas: 0, propuestas: 0, detenida: false };
    for (const op of encoladas) {
      // Lo que espera al calendario, solo cuando ya está conectado
      if (op.motivoEspera === 'permiso_faltante' && op.perfil.consentimientos.length === 0) continue;
      const contexto = { perfilId: op.perfil.id, organizacionId: op.organizacionId, rol: op.perfil.rol, plan: op.perfil.plan, primerIngresoPendiente: false };
      const desenlace = await this.asistente.atenderEnEspera(contexto, op.id);
      if (desenlace === 'no_disponible') {
        resultado.detenida = true;
        break;
      }
      if (desenlace === 'propuesta') resultado.propuestas += 1;
      if (desenlace === 'propuesta' || desenlace === 'atendida') resultado.atendidas += 1;
    }
    if (resultado.atendidas > 0) this.registro.log(`Atendidas ${resultado.atendidas} solicitudes en espera`);
    return resultado;
  }
}
