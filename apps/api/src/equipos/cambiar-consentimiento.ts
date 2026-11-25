import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  CambiarConsentimientoEquipoCarga,
  CambiarConsentimientoEquipoInterna,
  type EstadoConsentimientoEquipo,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import {
  RegistroOperaciones,
  type EjecutorOperacion,
  type Propuesta,
  type ResultadoEjecucion,
} from '../operaciones/registro';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';

const ESTADOS: Record<EstadoConsentimientoEquipo, string> = {
  pendiente: 'Pendiente de autorizacion',
  concedida: 'Autorizado',
  rechazada: 'No autorizado',
  revocada: 'Autorizacion retirada',
};

// REQ-CUN05-14 a 16. T-103 y T-112.
@Injectable()
export class CambiarConsentimientoEquipo
  implements
    EjecutorOperacion<CambiarConsentimientoEquipoInterna>,
    OnModuleInit
{
  readonly tipo = 'equipo.cambiar_consentimiento';
  readonly esquema = CambiarConsentimientoEquipoInterna;
  readonly origenes = ['control_directo'] as const;

  readonly nombresDeCampos = {
    equipoId: 'el equipo',
    estado: 'el nuevo consentimiento',
  };

  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(
    contexto: ContextoSolicitud,
    carga: CambiarConsentimientoEquipoInterna,
  ): Promise<Propuesta<CambiarConsentimientoEquipoInterna>> {
    const publica = CambiarConsentimientoEquipoCarga.safeParse(carga);

    if (!publica.success) {
      throw errorApi(
        400,
        'SOLICITUD_INVALIDA',
        'La solicitud de consentimiento no es valida.',
      );
    }

    const db = this.prisma.deOrganizacion(contexto.organizacionId);

    const membresia = await db.miembroDeEquipo.findFirst({
      where: {
        equipoId: publica.data.equipoId,
        perfilId: contexto.perfilId,
      },
      select: {
        id: true,
        estadoConsentimiento: true,
        consentimientoCambiadoEn: true,
        equipo: { select: { nombre: true } },
      },
    });

    if (!membresia) {
      throw errorApi(
        403,
        'SOLICITUD_INVALIDA',
        'No perteneces a este equipo.',
      );
    }

    return {
      vista: {
        accion: 'Cambiar tu autorizacion de disponibilidad',
        datos: [
          { etiqueta: 'Equipo', valor: membresia.equipo.nombre },
          {
            etiqueta: 'Ahora',
            valor: ESTADOS[membresia.estadoConsentimiento],
          },
          {
            etiqueta: 'Nuevo estado',
            valor: ESTADOS[publica.data.estado],
          },
          {
            etiqueta: 'Alcance',
            valor: 'Solo disponibilidad libre u ocupada, sin detalles de eventos.',
          },
        ],
        irreversible: null,
        confirmable: true,
        motivoNoConfirmable: null,
      },
      carga: {
        ...publica.data,
        referencia: {
          membresiaId: membresia.id,
          estadoAnterior: membresia.estadoConsentimiento,
          cambiadoEn:
            membresia.consentimientoCambiadoEn?.toISOString() ?? null,
        },
      },
    };
  }

  async ejecutar(
    contexto: ContextoSolicitud,
    carga: CambiarConsentimientoEquipoInterna,
  ): Promise<ResultadoEjecucion> {
    const referencia = carga.referencia;

    if (!referencia) {
      throw errorApi(
        409,
        'OPERACION_NO_CONFIRMABLE',
        'La propuesta no contiene una referencia valida.',
      );
    }

    const db = this.prisma.deOrganizacion(contexto.organizacionId);

    const anterior = referencia.cambiadoEn
      ? new Date(referencia.cambiadoEn)
      : null;

    // Mantener una version creciente incluso dentro del mismo milisegundo.
    const ahora = new Date(
      Math.max(Date.now(), (anterior?.getTime() ?? 0) + 1),
    );

    return db.$transaction(async (tx): Promise<ResultadoEjecucion> => {
      const actualizada = await tx.miembroDeEquipo.updateMany({
        where: {
          id: referencia.membresiaId,
          organizacionId: contexto.organizacionId,
          equipoId: carga.equipoId,
          perfilId: contexto.perfilId,
          estadoConsentimiento: referencia.estadoAnterior,
          consentimientoCambiadoEn: anterior,
        },
        data: {
          estadoConsentimiento: carga.estado,
          consentimientoCambiadoEn: ahora,
        },
      });

      if (actualizada.count !== 1) {
        throw errorApi(
          409,
          'OPERACION_NO_CONFIRMABLE',
          'Tu autorizacion o membresia cambio. Solicita la accion nuevamente.',
        );
      }

      await tx.eventoAuditoria.create({
        data: {
          organizacionId: contexto.organizacionId,
          perfilId: contexto.perfilId,
          accion: 'equipo.consentimiento-cambiado',
          detalle: {
            equipoId: carga.equipoId,
            membresiaId: referencia.membresiaId,
            antes: referencia.estadoAnterior,
            despues: carga.estado,
          },
        },
      });

      return {
        tipo: 'ejecutada',
        resultado: {
          equipoId: carga.equipoId,
          perfilId: contexto.perfilId,
          estadoConsentimiento: carga.estado,
          consentimientoCambiadoEn: ahora.toISOString(),
        },
      };
    });
  }
}
