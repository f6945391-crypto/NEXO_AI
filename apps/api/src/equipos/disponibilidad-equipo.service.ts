
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../plataforma/prisma.service';
import { SincronizadorCalendario } from '../agenda/sincronizador-calendario';
import { ClienteGoogle } from '../integraciones/cliente-google';
import type { ContextoSolicitud } from '../identidad/contexto';
import { EquiposService } from './equipos.service';
import { enZona, instanteLocal, sumarDias } from '../agenda/dominio/tiempo';

// Representa un intervalo de tiempo.
export type IntervaloHorario = {
  inicio: Date;
  fin: Date;
};

@Injectable()
export class DisponibilidadEquipoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sincronizador: SincronizadorCalendario,
    private readonly google: ClienteGoogle,
    private readonly equipos: EquiposService,
  ) {}

  // =====================================================
  // 1. VERIFICAR CALENDARIO Y SINCRONIZACION
  // =====================================================

  async verificarCalendario(
    organizacionId: string,
    perfilId: string,
    desde: Date,
    hasta: Date,
  ): Promise<boolean> {
    const quien = { organizacionId, perfilId };

    const tienePermiso = await this.google.tienePermiso(
      quien,
      'calendario',
    );

    if (!tienePermiso) {
      return false;
    }

    const db = this.prisma.deOrganizacion(organizacionId);

    const estadoAnterior =
      await db.sincronizacionCalendario.findUnique({
        where: { perfilId },
      });

    const margenMs = 2 * 60_000;

    const requiereActualizar =
      !estadoAnterior ||
      Date.now() -
        estadoAnterior.ultimaSincronizacion.getTime() >
        margenMs;

    if (requiereActualizar) {
      try {
        const resultado = await this.sincronizador.sincronizar(
          quien,
        );

        if (resultado.tipo === 'sin_permiso') {
          return false;
        }
      } catch {
        // No se interpreta un fallo de sincronizacion
        // como disponibilidad libre.
        return false;
      }
    }

    const estado =
      await db.sincronizacionCalendario.findUnique({
        where: { perfilId },
      });

    if (!estado) {
      return false;
    }

    // La replica debe cubrir el rango solicitado.
    if (
      estado.ventanaDesde > desde ||
      estado.ventanaHasta < hasta
    ) {
      return false;
    }

    return true;
  }

  // =====================================================
  // 2. OBTENER HORARIOS OCUPADOS
  // =====================================================

  // Metodo interno. No exponer directamente mediante API.
  // Solo recupera inicio y fin de eventos confirmados.
  async obtenerOcupados(
    organizacionId: string,
    perfilId: string,
    desde: Date,
    hasta: Date,
  ): Promise<IntervaloHorario[]> {
    const db = this.prisma.deOrganizacion(organizacionId);

    const eventos = await db.eventoAgenda.findMany({
      where: {
        perfilId,
        estado: 'confirmado',
        inicio: {
          lt: hasta,
        },
        fin: {
          gt: desde,
        },
      },
      select: {
        inicio: true,
        fin: true,
      },
      orderBy: {
        inicio: 'asc',
      },
    });

    return eventos.map((evento) => ({
      inicio: evento.inicio,
      fin: evento.fin,
    }));
  }

  // =====================================================
  // 3. UNIR INTERVALOS OCUPADOS
  // =====================================================

  unirOcupados(
    intervalos: IntervaloHorario[],
  ): IntervaloHorario[] {
    const ordenados = [...intervalos].sort(
      (a, b) =>
        a.inicio.getTime() - b.inicio.getTime(),
    );

    const resultado: IntervaloHorario[] = [];

    for (const actual of ordenados) {
      if (actual.fin <= actual.inicio) {
        continue;
      }

      const ultimo = resultado[resultado.length - 1];

      if (!ultimo || actual.inicio > ultimo.fin) {
        resultado.push({
          inicio: new Date(actual.inicio),
          fin: new Date(actual.fin),
        });
      } else if (actual.fin > ultimo.fin) {
        ultimo.fin = new Date(actual.fin);
      }
    }

    return resultado;
  }

  // =====================================================
  // 4. CALCULAR INTERVALOS LIBRES
  // =====================================================

  calcularLibres(
    desde: Date,
    hasta: Date,
    ocupados: IntervaloHorario[],
  ): IntervaloHorario[] {
    if (desde >= hasta) {
      return [];
    }

    const combinados = this.unirOcupados(ocupados);

    const libres: IntervaloHorario[] = [];

    let cursor = desde.getTime();

    for (const ocupado of combinados) {
      const inicio = Math.max(
        ocupado.inicio.getTime(),
        desde.getTime(),
      );

      const fin = Math.min(
        ocupado.fin.getTime(),
        hasta.getTime(),
      );

      if (fin <= inicio) {
        continue;
      }

      if (inicio > cursor) {
        libres.push({
          inicio: new Date(cursor),
          fin: new Date(inicio),
        });
      }

      cursor = Math.max(cursor, fin);
    }

    if (cursor < hasta.getTime()) {
      libres.push({
        inicio: new Date(cursor),
        fin: new Date(hasta),
      });
    }

    return libres;
  }

  // =====================================================
  // 5. CALCULAR DISPONIBILIDAD COMUN
  // =====================================================

  calcularDisponibilidadComun(
    desde: Date,
    hasta: Date,
    ocupadosPorParticipante: IntervaloHorario[][],
    duracionMinutos?: number,
  ): IntervaloHorario[] {
    if (
      ocupadosPorParticipante.length === 0 ||
      desde >= hasta ||
      (duracionMinutos !== undefined &&
        (!Number.isFinite(duracionMinutos) ||
          duracionMinutos <= 0))
    ) {
      return [];
    }

    const todosLosOcupados =
      ocupadosPorParticipante.flat();

    const libres = this.calcularLibres(
      desde,
      hasta,
      todosLosOcupados,
    );

    if (duracionMinutos === undefined) {
      return libres;
    }

    return libres.filter(
      (intervalo) =>
        intervalo.fin.getTime() -
          intervalo.inicio.getTime() >=
        duracionMinutos * 60_000,
    );
  }

  // =====================================================
  // 6. CONSULTAR DISPONIBILIDAD DE UN EQUIPO
  // =====================================================

  // RN-CAL-01: aplicar las bandas horarias de la plataforma.
  aplicarBandaHoraria(
    intervalos: IntervaloHorario[],
    zonaHoraria: string,
    banda: 'normal' | 'extendida' | 'fueraDeBanda',
  ): IntervaloHorario[] {
    if (banda === 'fueraDeBanda') {
      return intervalos;
    }

    const limiteFin = banda === 'extendida' ? 22 : 20;
    const resultado: IntervaloHorario[] = [];

    for (const intervalo of intervalos) {
      if (intervalo.fin <= intervalo.inicio) {
        continue;
      }

      const inicioLocal = enZona(intervalo.inicio, zonaHoraria);
      const finLocal = enZona(intervalo.fin, zonaHoraria);

      let dia = {
        anio: inicioLocal.anio,
        mes: inicioLocal.mes,
        dia: inicioLocal.dia,
      };

      const ultimoDia = {
        anio: finLocal.anio,
        mes: finLocal.mes,
        dia: finLocal.dia,
      };

      while (
        Date.UTC(dia.anio, dia.mes - 1, dia.dia) <=
        Date.UTC(ultimoDia.anio, ultimoDia.mes - 1, ultimoDia.dia)
      ) {
        const inicioBanda = instanteLocal(dia, 8 * 60, zonaHoraria);
        const finBanda = instanteLocal(dia, limiteFin * 60, zonaHoraria);
        const inicio = new Date(Math.max(
          intervalo.inicio.getTime(),
          inicioBanda.getTime(),
        ));

        const fin = new Date(Math.min(
          intervalo.fin.getTime(),
          finBanda.getTime(),
        ));

        if (inicio < fin) {
          resultado.push({ inicio, fin });
        }

        dia = sumarDias(dia, 1);
      }
    }

    return resultado.sort(
      (a, b) =>
        a.inicio.getTime() - b.inicio.getTime() ||
        (b.fin.getTime() - b.inicio.getTime()) -
        (a.fin.getTime() - a.inicio.getTime()),
    );
  }

  async obtenerZonaHorariaSolicitante(
    contexto: ContextoSolicitud,
    equipoId: string,
  ): Promise<string> {
    // Verificar que el solicitante pertenece al equipo.
    await this.equipos.verificarMembresia(contexto, equipoId);

    const db = this.prisma.deOrganizacion(contexto.organizacionId);

    const perfil = await db.perfilUsuario.findFirst({
      where: { id: contexto.perfilId },
      select: { zonaHoraria: true },
    });

    return perfil?.zonaHoraria ?? 'UTC';
  }
  async consultarEquipo(
    contexto: ContextoSolicitud,
    equipoId: string,
    desde: Date,
    hasta: Date,
    duracionMinutos?: number,
  bandaHoraria: 'normal' | 'extendida' | 'fueraDeBanda' = 'normal',
  ) {
    // Validar fechas y duracion.
    if (
      !Number.isFinite(desde.getTime()) ||
      !Number.isFinite(hasta.getTime()) ||
      desde >= hasta ||
      (duracionMinutos !== undefined &&
        (!Number.isFinite(duracionMinutos) ||
          duracionMinutos <= 0))
    ) {
      throw new BadRequestException(
        'El rango de fechas o la duracion no son validos.',
      );
    }

    // Verificar membresia del solicitante.
    await this.equipos.verificarMembresia(
      contexto,
      equipoId,
    );

    // Obtener integrantes del equipo.
    const integrantes = await this.equipos.integrantes(
      contexto,
      equipoId,
    );

    const ocupadosPorParticipante: IntervaloHorario[][] = [];
    const sinDatos: string[] = [];

    for (const integrante of integrantes) {
      // No consultar calendarios sin consentimiento.
      if (
        integrante.estadoConsentimiento !== 'concedida'
      ) {
        sinDatos.push(integrante.perfilId);
        continue;
      }

      // Verificar permisos y sincronizacion.
      const calendarioDisponible =
        await this.verificarCalendario(
          contexto.organizacionId,
          integrante.perfilId,
          desde,
          hasta,
        );

      if (!calendarioDisponible) {
        sinDatos.push(integrante.perfilId);
        continue;
      }

      // Consultar exclusivamente intervalos ocupados.
      const ocupados = await this.obtenerOcupados(
        contexto.organizacionId,
        integrante.perfilId,
        desde,
        hasta,
      );

      ocupadosPorParticipante.push(ocupados);
    }

    // Si falta algun participante, no confirmar
    // disponibilidad de todo el equipo.
    // Volver a comprobar los consentimientos antes de responder.
    const integrantesActualizados =
      await this.equipos.integrantes(contexto, equipoId);

    const consentimientosActuales = new Map(
      integrantesActualizados.map((integrante) => [
        integrante.perfilId,
        integrante.estadoConsentimiento,
      ]),
    );

    for (const integrante of integrantes) {
      if (
        consentimientosActuales.get(integrante.perfilId) !== 'concedida' &&
        !sinDatos.includes(integrante.perfilId)
      ) {
        sinDatos.push(integrante.perfilId);
      }
    }

    const consentimientosVigentes =
      integrantesActualizados.length === integrantes.length &&
      integrantesActualizados.every((integrante) =>
        integrante.estadoConsentimiento === 'concedida',
      );

    const disponibilidadCompleta =
      sinDatos.length === 0 &&
      integrantes.length > 0 &&
      consentimientosVigentes;

    // RN-CAL-01: consultar la zona horaria del solicitante.
    const db = this.prisma.deOrganizacion(contexto.organizacionId);

    const perfil = await db.perfilUsuario.findFirst({
      where: { id: contexto.perfilId },
      select: { zonaHoraria: true },
    });

    const zonaHoraria = perfil?.zonaHoraria ?? 'UTC';

    // Primero calcular disponibilidad; despues aplicar banda y duracion.
    const intervalosComunes = disponibilidadCompleta
      ? this.calcularDisponibilidadComun(
          desde,
          hasta,
          ocupadosPorParticipante,
        )
      : [];

    const intervalosEnBanda = this.aplicarBandaHoraria(
      intervalosComunes,
      zonaHoraria,
      bandaHoraria,
    );

    const intervalos = intervalosEnBanda.filter(
      (intervalo) =>
        duracionMinutos === undefined ||
        (intervalo.fin.getTime() - intervalo.inicio.getTime()) /
          60_000 >= duracionMinutos,
    );

    return {
      equipoId,
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      disponibilidadCompleta,
      participantesConsultados:
        ocupadosPorParticipante.length,
      participantesSinDatos: sinDatos,
      intervalos: intervalos.map((intervalo) => ({
        inicio: intervalo.inicio.toISOString(),
        fin: intervalo.fin.toISOString(),
        duracionMinutos:
          (intervalo.fin.getTime() -
            intervalo.inicio.getTime()) /
          60_000,
      })),
      advertencia: [
        ...(!disponibilidadCompleta
          ? ['No se puede confirmar la disponibilidad de todos los integrantes.']
          : []),
        ...(bandaHoraria === 'fueraDeBanda'
          ? ['Atención: estás consultando horarios fuera de la banda habitual de 08:00 a 22:00.']
          : []),
      ].join(' ') || null,
    };
  }
}
