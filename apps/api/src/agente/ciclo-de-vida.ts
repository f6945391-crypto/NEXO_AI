import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../plataforma/prisma.service';
import { AsistenteService } from './asistente.service';

// T-041 · specs/07-agente/plan.md §14.3 y §14.8 · REQ-AGT-01 v2, REQ-AGT-03 · decisiones 18, 20, 21 y 28
// (H-AG-08). El ciclo de vida de los episodios, en el proceso trabajador: cerrar los inactivos, caducar las
// propuestas sin decisión, y borrar lo que ya no hace falta guardar. Cada paso recibe `ahora`, para que las
// pruebas no tengan que esperar 30 minutos ni 90 días.

export const INACTIVIDAD_MS = 30 * 60_000;
export const CADUCIDAD_PROPUESTA_MS = 24 * 3_600_000;
export const RETENCION_PUNTO_CONTROL_MS = 7 * 24 * 3_600_000;
export const RETENCION_TRANSCRIPCION_MS = 90 * 24 * 3_600_000;

export type ResultadoCiclo = { cerrados: number; caducadas: number; puntosBorrados: number; turnosBorrados: number };

const antesDe = (ahora: Date, ms: number) => new Date(ahora.getTime() - ms);

@Injectable()
export class CicloDeVidaAsistente {
  private readonly registro = new Logger('CicloDeVida');

  constructor(
    private readonly prisma: PrismaService,
    private readonly asistente: AsistenteService,
  ) {}

  // sinAislar (justificado en specs/07-agente/plan.md §14.8, como el de la cola en espera): son trabajos de
  // mantenimiento sobre todas las organizaciones. Lo que toca a una persona, caducar su propuesta con su turno
  // visible, se hace después aislado por su organización.
  async repasar(ahora = new Date()): Promise<ResultadoCiclo> {
    const caducadas = await this.caducarPropuestas(ahora);
    const cerrados = await this.cerrarInactivos(ahora);
    const puntosBorrados = (
      await this.prisma.sinAislar.puntoControlAgente.deleteMany({
        where: { conversacion: { estado: 'cerrada', cerradaEn: { lt: antesDe(ahora, RETENCION_PUNTO_CONTROL_MS) } } },
      })
    ).count;
    // La conversación no se borra: de ella cuelgan la auditoría de herramientas y llamadas (P-07)
    const turnosBorrados = (await this.prisma.sinAislar.turnoTranscripcion.deleteMany({ where: { en: { lt: antesDe(ahora, RETENCION_TRANSCRIPCION_MS) } } })).count;

    const resultado = { cerrados, caducadas, puntosBorrados, turnosBorrados };
    if (Object.values(resultado).some((n) => n > 0)) this.registro.log(JSON.stringify(resultado));
    return resultado;
  }

  // Decisión 18: 30 minutos sin actividad y sin propuesta esperando; la propuesta tiene su propio plazo
  private async cerrarInactivos(ahora: Date): Promise<number> {
    const cerrados = await this.prisma.sinAislar.conversacionAgente.updateMany({
      where: {
        estado: 'abierta',
        ultimaActividadEn: { lt: antesDe(ahora, INACTIVIDAD_MS) },
        operaciones: { none: { estado: 'propuesta' } },
      },
      data: { estado: 'cerrada', cerradaEn: ahora },
    });
    return cerrados.count;
  }

  // H-AG-08 (decisión 28 de 07-agente): a las 24 horas, la propuesta queda descartada. Si estaba en una
  // conversación, la persona lo ve en la transcripción y el episodio se cierra; si no (un control directo,
  // la zona de empresa), solo cambia su estado.
  private async caducarPropuestas(ahora: Date): Promise<number> {
    const vencidas = await this.prisma.sinAislar.operacion.findMany({
      where: { estado: 'propuesta', creadaEn: { lt: antesDe(ahora, CADUCIDAD_PROPUESTA_MS) } },
      select: { id: true, organizacionId: true, ambito: true, conversacionId: true, perfil: { select: { id: true, rol: true, plan: true } } },
    });
    let caducadas = 0;
    for (const op of vencidas) {
      if (op.conversacionId && op.ambito === 'propio') {
        const contexto = { perfilId: op.perfil.id, organizacionId: op.organizacionId, rol: op.perfil.rol, plan: op.perfil.plan, primerIngresoPendiente: false };
        if (await this.asistente.caducarPropuesta(contexto, op.id, ahora)) caducadas += 1;
        continue;
      }
      const hecho = await this.prisma.sinAislar.operacion.updateMany({ where: { id: op.id, estado: 'propuesta' }, data: { estado: 'descartada' } });
      caducadas += hecho.count;
    }
    return caducadas;
  }
}
