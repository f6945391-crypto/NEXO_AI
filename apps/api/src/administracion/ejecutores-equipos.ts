import { Injectable } from '@nestjs/common';
import { CrearEquipoCarga, MiembroEquipoCarga } from '@nexoai/contratos';
import type { Equipo, MiembroDeEquipo } from '../generado/prisma/client';
import type { ContextoSolicitud } from '../identidad/contexto';
import type { ResultadoEjecucion } from '../operaciones/registro';
import { EjecutorDeAdministracion, TEXTOS, vistaDe, type Evaluacion } from './ejecutores-cuentas';

// T-066, primera parte (H-ADM-34) · REQ-ADM-28 a 31 · specs/08-administracion/plan.md §5.1 y §5.4. Crear equipos,
// componerlos con cuentas propias y activas de la organización y nombrar a su responsable, sobre el modelo de
// CUN-05 (`equipo`, `miembro_de_equipo` con `rol_en_equipo`, D-F1). Las cuentas afiliadas quedan fuera hasta
// resolver INC-37: `miembro_de_equipo` exige que el perfil viva en la organización del equipo.
// Como las de cuentas: zona de empresa, solo el administrador y solo como control directo (REQ-ADM-07). La base
// impone el nombre único por organización y un responsable por equipo (migración 20261125000000); si otra
// confirmación se adelanta, la clave repetida no se trata como un fallo: se vuelve a evaluar y se propone de
// nuevo, con lo que ya hay (H-AG-07).

const TEXTOS_EQUIPO = {
  sinEquipo: 'Ese equipo no existe en la organización.',
  // INC-37 · H-ADM-34
  afiliada: 'Por ahora solo se pueden añadir a un equipo las cuentas de la organización. Sumar a quien se sumó con su cuenta llegará más adelante.',
  invitacion: 'Esa persona todavía no aceptó la invitación a la organización.',
  noActiva: 'Solo se puede añadir a un equipo una cuenta activa.',
};

type EvaluacionEquipo = Evaluacion & {
  equipo?: Equipo;
  miembro?: MiembroDeEquipo;
  responsable?: MiembroDeEquipo | null;
};

const esClaveRepetida = (error: unknown) => (error as { code?: string } | null)?.code === 'P2002';

@Injectable()
abstract class EjecutorDeEquipos<C> extends EjecutorDeAdministracion<C, EvaluacionEquipo> {
  // Si otra confirmación ganó la carrera por la misma clave única, se evalúa otra vez con lo ya escrito
  protected async siNoSeRepite(contexto: ContextoSolicitud, carga: C, accion: () => Promise<ResultadoEjecucion>): Promise<ResultadoEjecucion> {
    try {
      return await accion();
    } catch (error) {
      if (!esClaveRepetida(error)) throw error;
      const vista = (await this.evaluar(contexto, carga)).vista;
      return { tipo: 'reproponer', vistaConfirmacion: vista };
    }
  }

  protected async equipoDe(contexto: ContextoSolicitud, equipoId: string): Promise<Equipo | null> {
    return this.prisma.deOrganizacion(this.empresa(contexto)).equipo.findUnique({ where: { id: equipoId } });
  }

  protected async miembroDe(contexto: ContextoSolicitud, equipoId: string, perfilId: string): Promise<MiembroDeEquipo | null> {
    return this.prisma.deOrganizacion(this.empresa(contexto)).miembroDeEquipo.findUnique({ where: { equipoId_perfilId: { equipoId, perfilId } } });
  }

  // Correo de una cuenta de la empresa, para la tarjeta; el perfilId si ya no está
  protected async correoDe(contexto: ContextoSolicitud, perfilId: string): Promise<string> {
    return (await this.lecturas.cuentasDe(this.empresa(contexto), [perfilId])).get(perfilId)?.correo ?? perfilId;
  }
}

@Injectable()
export class CrearEquipo extends EjecutorDeEquipos<CrearEquipoCarga> {
  readonly tipo = 'administracion.crear_equipo';
  readonly esquema = CrearEquipoCarga;

  // REQ-ADM-28. El nombre repetido se compara sin distinguir mayúsculas: «ventas» y «Ventas» se confunden en
  // pantalla aunque la base los admita (hallazgo del informe de T-066)
  protected async evaluar(contexto: ContextoSolicitud, carga: CrearEquipoCarga): Promise<EvaluacionEquipo> {
    const existente = await this.prisma
      .deOrganizacion(this.empresa(contexto))
      .equipo.findFirst({ where: { nombre: { equals: carga.nombre, mode: 'insensitive' } }, select: { nombre: true } });
    return {
      vista: vistaDe(
        'Crear un equipo',
        [
          { etiqueta: 'Nombre', valor: carga.nombre },
          { etiqueta: 'Qué pasa', valor: 'El equipo empieza vacío y sin responsable. Después puedes añadir personas y nombrar a quien lo lleva.' },
        ],
        null,
        existente ? `Ya hay un equipo «${existente.nombre}» en la organización. Elige otro nombre.` : null,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: CrearEquipoCarga): Promise<ResultadoEjecucion> {
    const organizacionId = this.empresa(contexto);
    return this.siNoSeRepite(contexto, carga, async () => {
      const equipo = await this.prisma.deOrganizacion(organizacionId).equipo.create({ data: { organizacionId, nombre: carga.nombre } });
      await this.auditar(contexto, 'administracion.equipo-creado', { equipoId: equipo.id, despues: { nombre: equipo.nombre } });
      return { tipo: 'ejecutada', resultado: { equipoId: equipo.id, nombre: equipo.nombre } };
    });
  }
}

@Injectable()
export class AnadirAEquipo extends EjecutorDeEquipos<MiembroEquipoCarga> {
  readonly tipo = 'administracion.anadir_a_equipo';
  readonly esquema = MiembroEquipoCarga;

  // REQ-ADM-29: solo cuentas de la organización, propias y activas (las afiliadas, con INC-37), y una cuenta
  // puede estar en varios equipos
  protected async evaluar(contexto: ContextoSolicitud, carga: MiembroEquipoCarga): Promise<EvaluacionEquipo> {
    const empresaId = this.empresa(contexto);
    const equipo = await this.equipoDe(contexto, carga.equipoId);
    const cuenta = await this.lecturas.cuentaDeLaEmpresa(empresaId, carga.perfilId);
    let motivo: string | null = null;
    if (!equipo) motivo = TEXTOS_EQUIPO.sinEquipo;
    else if (!cuenta) {
      const invitada = await this.prisma.deOrganizacion(empresaId).miembroOrganizacion.findFirst({ where: { perfilId: carga.perfilId, estado: 'invitada' } });
      motivo = invitada ? TEXTOS_EQUIPO.invitacion : TEXTOS.noPertenece;
    } else if (!cuenta.propia) motivo = TEXTOS_EQUIPO.afiliada;
    else if (cuenta.estado !== 'activa') motivo = TEXTOS_EQUIPO.noActiva;
    else if (await this.miembroDe(contexto, equipo.id, carga.perfilId)) motivo = `Esa cuenta ya está en «${equipo.nombre}».`;
    return {
      equipo: equipo ?? undefined,
      cuenta: cuenta ?? undefined,
      vista: vistaDe(
        'Añadir a alguien a un equipo',
        [
          { etiqueta: 'Equipo', valor: equipo?.nombre ?? carga.equipoId },
          ...this.datosDe(cuenta, carga.perfilId),
          { etiqueta: 'Qué pasa', valor: 'Entra como miembro. Que el equipo vea si está libre u ocupado lo autoriza la propia persona.' },
        ],
        null,
        motivo,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: MiembroEquipoCarga, { equipo }: EvaluacionEquipo): Promise<ResultadoEjecucion> {
    const organizacionId = this.empresa(contexto);
    return this.siNoSeRepite(contexto, carga, async () => {
      await this.prisma
        .deOrganizacion(organizacionId)
        .miembroDeEquipo.create({ data: { organizacionId, equipoId: equipo!.id, perfilId: carga.perfilId, rolEnEquipo: 'integrante' } });
      await this.auditar(contexto, 'administracion.miembro-anadido', { equipoId: equipo!.id, perfilAfectado: carga.perfilId, despues: { rol: 'integrante' } });
      return { tipo: 'ejecutada', resultado: { equipoId: equipo!.id, perfilId: carga.perfilId, rol: 'integrante' } };
    });
  }
}

@Injectable()
export class QuitarDeEquipo extends EjecutorDeEquipos<MiembroEquipoCarga> {
  readonly tipo = 'administracion.quitar_de_equipo';
  readonly esquema = MiembroEquipoCarga;

  // REQ-ADM-31: si era el responsable, el equipo queda sin responsable y nadie hereda la autoridad
  protected async evaluar(contexto: ContextoSolicitud, carga: MiembroEquipoCarga): Promise<EvaluacionEquipo> {
    const equipo = await this.equipoDe(contexto, carga.equipoId);
    const miembro = equipo ? await this.miembroDe(contexto, equipo.id, carga.perfilId) : null;
    const motivo = !equipo ? TEXTOS_EQUIPO.sinEquipo : !miembro ? `Esa cuenta no está en «${equipo.nombre}».` : null;
    const era = miembro?.rolEnEquipo === 'responsable';
    return {
      equipo: equipo ?? undefined,
      miembro: miembro ?? undefined,
      vista: vistaDe(
        'Quitar a alguien de un equipo',
        [
          { etiqueta: 'Equipo', valor: equipo?.nombre ?? carga.equipoId },
          { etiqueta: 'Cuenta', valor: await this.correoDe(contexto, carga.perfilId) },
          ...(miembro ? [{ etiqueta: 'En el equipo', valor: era ? 'Responsable' : 'Miembro' }] : []),
          {
            etiqueta: 'Qué pasa',
            valor: era
              ? 'Deja de ver el trabajo del equipo, y el equipo queda sin responsable: nadie hereda su autoridad. Lo que ya hizo en el equipo se conserva.'
              : 'Deja de ver el trabajo del equipo. Lo que ya hizo en el equipo se conserva.',
          },
        ],
        'Si vuelve a sumarse, tendrá que autorizar otra vez que el equipo vea si está libre u ocupado.',
        motivo,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: MiembroEquipoCarga, { equipo, miembro }: EvaluacionEquipo): Promise<ResultadoEjecucion> {
    const borradas = await this.prisma.deOrganizacion(this.empresa(contexto)).miembroDeEquipo.deleteMany({ where: { id: miembro!.id } });
    // Otra confirmación lo quitó antes: se propone de nuevo, ya sin nada que quitar
    if (borradas.count === 0) return { tipo: 'reproponer', vistaConfirmacion: (await this.evaluar(contexto, carga)).vista };
    // Plan §5.4: la salida de equipo queda en la auditoría. El evento `SalidaDeEquipo` para las tareas del equipo
    // (REQ-ADM-31, H-ADM-08) llega con sus oyentes, en la fase 4: hoy no hay tareas de equipo que soltar.
    await this.auditar(contexto, 'administracion.miembro-quitado', {
      equipoId: equipo!.id,
      perfilAfectado: carga.perfilId,
      antes: { rol: miembro!.rolEnEquipo },
      equipoSinResponsable: miembro!.rolEnEquipo === 'responsable',
    });
    return { tipo: 'ejecutada', resultado: { equipoId: equipo!.id, perfilId: carga.perfilId } };
  }
}

@Injectable()
export class NombrarResponsable extends EjecutorDeEquipos<MiembroEquipoCarga> {
  readonly tipo = 'administracion.nombrar_responsable';
  readonly esquema = MiembroEquipoCarga;

  // REQ-ADM-30, H-ADM-09: uno de sus miembros, y como mucho uno; el anterior pasa a ser miembro
  protected async evaluar(contexto: ContextoSolicitud, carga: MiembroEquipoCarga): Promise<EvaluacionEquipo> {
    const empresaId = this.empresa(contexto);
    const equipo = await this.equipoDe(contexto, carga.equipoId);
    const miembro = equipo ? await this.miembroDe(contexto, equipo.id, carga.perfilId) : null;
    const responsable = equipo ? await this.prisma.deOrganizacion(empresaId).miembroDeEquipo.findFirst({ where: { equipoId: equipo.id, rolEnEquipo: 'responsable' } }) : null;
    const cuenta = (await this.lecturas.cuentasDe(empresaId, [carga.perfilId])).get(carga.perfilId);
    const motivo = !equipo
      ? TEXTOS_EQUIPO.sinEquipo
      : !miembro
        ? `Esa cuenta no está en «${equipo.nombre}». Primero añádela al equipo.`
        : miembro.rolEnEquipo === 'responsable'
          ? `Esa cuenta ya es la responsable de «${equipo.nombre}».`
          : cuenta?.estado !== 'activa'
            ? 'Solo una cuenta activa puede ser responsable de un equipo.'
            : null;
    const anterior = responsable && responsable.perfilId !== carga.perfilId ? await this.correoDe(contexto, responsable.perfilId) : null;
    return {
      equipo: equipo ?? undefined,
      miembro: miembro ?? undefined,
      responsable,
      vista: vistaDe(
        'Nombrar responsable de un equipo',
        [
          { etiqueta: 'Equipo', valor: equipo?.nombre ?? carga.equipoId },
          { etiqueta: 'Responsable nuevo', valor: cuenta?.correo ?? carga.perfilId },
          ...(equipo && !motivo ? [{ etiqueta: 'Responsable ahora', valor: anterior ?? 'Nadie' }] : []),
          {
            etiqueta: 'Qué pasa',
            valor: anterior
              ? `Tendrá la autoridad de responsable en este equipo y solo en este. ${anterior} pasa a ser miembro, y lo que ya asignó sigue como estaba.`
              : 'Tendrá la autoridad de responsable en este equipo y solo en este.',
          },
        ],
        null,
        motivo,
      ),
    };
  }

  protected async aplicar(contexto: ContextoSolicitud, carga: MiembroEquipoCarga, { equipo, miembro, responsable }: EvaluacionEquipo): Promise<ResultadoEjecucion> {
    const datos = this.prisma.deOrganizacion(this.empresa(contexto));
    return this.siNoSeRepite(contexto, carga, async () => {
      // En una transacción: el índice único parcial no admite dos responsables ni un instante
      await datos.$transaction(async (tx) => {
        await tx.miembroDeEquipo.updateMany({ where: { equipoId: equipo!.id, rolEnEquipo: 'responsable' }, data: { rolEnEquipo: 'integrante' } });
        await tx.miembroDeEquipo.update({ where: { id: miembro!.id }, data: { rolEnEquipo: 'responsable' } });
      });
      await this.auditar(contexto, 'administracion.responsable-nombrado', {
        equipoId: equipo!.id,
        perfilAfectado: carga.perfilId,
        antes: { responsable: responsable?.perfilId ?? null },
        despues: { responsable: carga.perfilId },
      });
      return { tipo: 'ejecutada', resultado: { equipoId: equipo!.id, responsable: carga.perfilId } };
    });
  }
}

export const EJECUTORES_DE_EQUIPOS = [CrearEquipo, AnadirAEquipo, QuitarDeEquipo, NombrarResponsable];
