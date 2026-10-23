import { Injectable } from '@nestjs/common';
import {
  OperacionRespuesta,
  VistaConfirmacion,
  type EstadoOperacion,
  type OperacionSolicitud,
} from '@nexoai/contratos';
import type { Operacion } from '../generado/prisma/client';
import type { ContextoSolicitud } from '../identidad/contexto';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { RegistroOperaciones } from './registro';

// AD-09 · specs/02-agenda/plan.md §3 · T-012.
//
// Garantías, cada una con su prueba:
// - Ningún efecto antes de `confirmar` (REQ-CUN01-03): el efecto vive solo en `ejecutor.ejecutar`.
// - Confirmar dos veces ejecuta una (P-07): la primera confirmación «reclama» la operación con una
//   actualización condicional atómica (`confirmadaEn` de nulo a ahora). Ajuste del plan: en lugar de
//   `SELECT … FOR UPDATE`, que exigiría SQL escrito a mano, prohibido por AGENTS.md.
// - Una operación solo la ve y la confirma quien la creó, dentro de su organización (P-04).

const aRespuesta = (op: Operacion): OperacionRespuesta =>
  OperacionRespuesta.parse({
    id: op.id,
    tipo: op.tipo,
    origen: op.origen,
    estado: op.estado,
    vistaConfirmacion: op.vistaConfirmacion,
    resultado: op.resultado ?? null,
    error: op.error,
    creadaEn: op.creadaEn.toISOString(),
  });

const noEncontrada = () => errorApi(404, 'OPERACION_NO_ENCONTRADA', 'No existe esa operación.');

@Injectable()
export class OperacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registro: RegistroOperaciones,
  ) {}

  async proponer(contexto: ContextoSolicitud, solicitud: OperacionSolicitud): Promise<OperacionRespuesta> {
    const ejecutor = this.registro.obtener(solicitud.tipo);
    if (!ejecutor) throw errorApi(400, 'OPERACION_DESCONOCIDA', 'Esa acción no existe.');

    const carga = ejecutor.esquema.safeParse(solicitud.carga);
    if (!carga.success) throw errorApi(400, 'SOLICITUD_INVALIDA', 'Faltan datos o no tienen el formato esperado.');

    const vista = VistaConfirmacion.parse(await ejecutor.proponer(contexto, carga.data));
    const op = await this.datos(contexto).operacion.create({
      data: {
        organizacionId: contexto.organizacionId,
        perfilId: contexto.perfilId,
        tipo: solicitud.tipo,
        origen: solicitud.origen,
        solicitudOriginal: solicitud.solicitudOriginal ?? null,
        carga: carga.data as object,
        vistaConfirmacion: vista,
        estado: 'propuesta',
      },
    });
    return aRespuesta(op);
  }

  async confirmar(contexto: ContextoSolicitud, id: string): Promise<OperacionRespuesta> {
    const op = await this.buscar(contexto, id);
    if (op.estado === 'ejecutada') return aRespuesta(op); // Idempotente: mismo resultado, sin repetir el efecto.
    if (op.estado !== 'propuesta') {
      throw errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Esta acción ya no se puede confirmar.');
    }
    if (!VistaConfirmacion.parse(op.vistaConfirmacion).confirmable) {
      throw errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Hay que resolver lo que impide esta acción antes de confirmarla.');
    }

    const reclamada = await this.datos(contexto).operacion.updateMany({
      where: { id, perfilId: contexto.perfilId, estado: 'propuesta', confirmadaEn: null },
      data: { confirmadaEn: new Date() },
    });
    if (reclamada.count !== 1) return this.resolverConcurrencia(contexto, id);

    const ejecutor = this.registro.obtener(op.tipo);
    if (!ejecutor) throw errorApi(400, 'OPERACION_DESCONOCIDA', 'Esa acción no existe.');

    let actualizada: Operacion;
    try {
      const resultado = await ejecutor.ejecutar(contexto, ejecutor.esquema.parse(op.carga));
      actualizada = await this.datos(contexto).operacion.update({
        where: { id },
        data:
          resultado.tipo === 'ejecutada'
            ? { estado: 'ejecutada', resultado: resultado.resultado as object, ejecutadaEn: new Date() }
            : { estado: 'propuesta', vistaConfirmacion: VistaConfirmacion.parse(resultado.vistaConfirmacion), confirmadaEn: null },
      });
    } catch (error) {
      actualizada = await this.datos(contexto).operacion.update({
        where: { id },
        data: { estado: 'fallida', error: error instanceof Error ? error.message : 'Error al ejecutar la acción.' },
      });
    }
    return aRespuesta(actualizada);
  }

  async descartar(contexto: ContextoSolicitud, id: string): Promise<OperacionRespuesta> {
    await this.buscar(contexto, id);
    const descartada = await this.datos(contexto).operacion.updateMany({
      where: { id, perfilId: contexto.perfilId, estado: { in: ['propuesta', 'en_espera'] }, confirmadaEn: null },
      data: { estado: 'descartada' },
    });
    if (descartada.count !== 1) throw errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Esta acción ya no se puede descartar.');
    return aRespuesta(await this.buscar(contexto, id));
  }

  async listar(contexto: ContextoSolicitud, estados?: EstadoOperacion[]): Promise<OperacionRespuesta[]> {
    const ops = await this.datos(contexto).operacion.findMany({
      where: { perfilId: contexto.perfilId, ...(estados ? { estado: { in: estados } } : {}) },
      orderBy: { creadaEn: 'desc' },
      take: 100,
    });
    return ops.map(aRespuesta);
  }

  // Otra confirmación ganó la carrera: si ya terminó, mismo resultado; si sigue en curso, se dice.
  private async resolverConcurrencia(contexto: ContextoSolicitud, id: string): Promise<OperacionRespuesta> {
    const actual = await this.buscar(contexto, id);
    if (actual.estado === 'ejecutada') return aRespuesta(actual);
    if (actual.estado === 'propuesta') {
      throw errorApi(409, 'OPERACION_EN_CURSO', 'Esta acción ya se está ejecutando.');
    }
    throw errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Esta acción ya no se puede confirmar.');
  }

  private async buscar(contexto: ContextoSolicitud, id: string): Promise<Operacion> {
    const op = await this.datos(contexto).operacion.findFirst({ where: { id, perfilId: contexto.perfilId } });
    if (!op) throw noEncontrada();
    return op;
  }

  private datos(contexto: ContextoSolicitud) {
    return this.prisma.deOrganizacion(contexto.organizacionId);
  }
}
