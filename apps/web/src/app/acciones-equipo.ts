'use server';

import { cookies } from 'next/headers';
import {
  CambiarConsentimientoEquipoCarga,
  CambioConsentimientoEquipoRespuesta,
  OperacionRespuesta,
  ConsultaDisponibilidadEquipo,
  DisponibilidadEquipoRespuesta,
  IntegrantesEquipoRespuesta,
  MisEquiposRespuesta,
  SeleccionParticipantesEquipo,
  type BandaHorariaEquipo,
} from '@nexoai/contratos';
import {
  COOKIE_ACCESO,
  llamarApi,
  mensajeDeError,
} from '../lib/sesion';

export type ResultadoEquipo<T> =
  | { datos: T; error?: never }
  | { datos?: never; error: string };

async function consultarEquipo<T>(
  ruta: string,
  esquema: {
    safeParse(valor: unknown):
      | { success: true; data: T }
      | { success: false };
  },
): Promise<ResultadoEquipo<T>> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;

  if (!acceso) {
    return { error: 'Tu sesión terminó. Vuelve a iniciar sesión.' };
  }

  try {
    const respuesta = await llamarApi(ruta, { token: acceso });

    if (respuesta.estado !== 200) {
      return {
        error: mensajeDeError(
          respuesta.cuerpo,
          'No pudimos consultar la información del equipo.',
        ),
      };
    }

    const validada = esquema.safeParse(respuesta.cuerpo);

    if (!validada.success) {
      return {
        error: 'NexoAI no devolvió la información esperada del equipo.',
      };
    }

    return { datos: validada.data };
  } catch {
    return {
      error: 'No pudimos conectar con NexoAI. Inténtalo nuevamente.',
    };
  }
}

export async function obtenerEquipos():
  Promise<ResultadoEquipo<MisEquiposRespuesta>> {
  return consultarEquipo('/equipos', MisEquiposRespuesta);
}

export async function obtenerIntegrantes(
  equipoId: string,
): Promise<ResultadoEquipo<IntegrantesEquipoRespuesta>> {
  if (!equipoId) return { error: 'Selecciona un equipo.' };

  return consultarEquipo(
    `/equipos/${encodeURIComponent(equipoId)}/integrantes`,
    IntegrantesEquipoRespuesta,
  );
}

export async function obtenerDisponibilidadEquipo(
  equipoId: string,
  desde: string,
  hasta: string,
  duracionMinutos?: number,
  participantesSeleccionados?: string[],
  bandaHoraria: BandaHorariaEquipo = 'normal',
): Promise<ResultadoEquipo<DisponibilidadEquipoRespuesta>> {
  if (!equipoId || !desde || !hasta) {
    return { error: 'Selecciona un equipo y un rango de fechas.' };
  }

  if (
    !Number.isFinite(Date.parse(desde)) ||
    !Number.isFinite(Date.parse(hasta)) ||
    Date.parse(desde) >= Date.parse(hasta)
  ) {
    return { error: 'El rango de fechas no es válido.' };
  }

  if (
    duracionMinutos !== undefined &&
    (!Number.isInteger(duracionMinutos) || duracionMinutos <= 0)
  ) {
    return { error: 'La duración debe ser un número positivo de minutos.' };
  }

  if (!['normal', 'extendida', 'fueraDeBanda'].includes(bandaHoraria)) {
    return { error: 'Selecciona una banda horaria valida.' };
  }

  const parametros = new URLSearchParams({
    desde,
    hasta,
    bandaHoraria,
  });

  if (duracionMinutos !== undefined) {
    parametros.set('duracionMinutos', String(duracionMinutos));
  }

  if (participantesSeleccionados !== undefined) {
    const seleccion =
      SeleccionParticipantesEquipo.safeParse(
        participantesSeleccionados,
      );

    if (!seleccion.success) {
      return {
        error: 'Selecciona participantes válidos, sin duplicados.',
      };
    }

    parametros.set(
      'participantes',
      participantesSeleccionados.join(','),
    );
  }

  const consulta = ConsultaDisponibilidadEquipo.safeParse(
    Object.fromEntries(parametros.entries()),
  );

  if (!consulta.success) {
    return {
      error: 'Los parámetros de disponibilidad no son válidos.',
    };
  }

  return consultarEquipo(
    `/equipos/${encodeURIComponent(equipoId)}/disponibilidad?${parametros.toString()}`,
    DisponibilidadEquipoRespuesta,
  );
}


// REQ-CUN05-14, REQ-CUN05-15, REQ-CUN05-16.
// T-112: consentimiento individual mediante Operaciones.

async function solicitarOperacionConsentimiento(
  ruta: string,
  estadoEsperado: number,
  cuerpo?: unknown,
): Promise<ResultadoEquipo<OperacionRespuesta>> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;

  if (!acceso) {
    return {
      error: 'Tu sesión terminó. Vuelve a iniciar sesión.',
    };
  }

  try {
    const respuesta = await llamarApi(ruta, {
      metodo: 'POST',
      token: acceso,
      ...(cuerpo !== undefined ? { cuerpo } : {}),
    });

    if (respuesta.estado !== estadoEsperado) {
      return {
        error: mensajeDeError(
          respuesta.cuerpo,
          'No pudimos gestionar tu autorización.',
        ),
      };
    }

    const validada = OperacionRespuesta.safeParse(
      respuesta.cuerpo,
    );

    if (!validada.success) {
      return {
        error: 'No recibimos una operación válida.',
      };
    }

    if (
      validada.data.tipo !== 'equipo.cambiar_consentimiento' ||
      validada.data.origen !== 'control_directo'
    ) {
      return {
        error: 'La operación no corresponde a tu autorización.',
      };
    }

    return { datos: validada.data };
  } catch {
    return {
      error: 'No pudimos conectar con NexoAI. Inténtalo nuevamente.',
    };
  }
}

export async function proponerCambioConsentimiento(
  equipoId: string,
  estado: CambiarConsentimientoEquipoCarga['estado'],
): Promise<ResultadoEquipo<OperacionRespuesta>> {
  const carga = CambiarConsentimientoEquipoCarga.safeParse({
    equipoId,
    estado,
  });

  if (!carga.success) {
    return {
      error: 'El cambio de autorización solicitado no es válido.',
    };
  }

  const respuesta = await solicitarOperacionConsentimiento(
    '/operaciones',
    201,
    {
      tipo: 'equipo.cambiar_consentimiento',
      origen: 'control_directo',
      carga: carga.data,
    },
  );

  if (respuesta.error) return respuesta;

  if (
    !respuesta.datos ||
    respuesta.datos.estado !== 'propuesta'
  ) {
    return {
      error: 'No pudimos preparar el cambio de autorización.',
    };
  }

  return respuesta;
}

export async function confirmarCambioConsentimiento(
  id: string,
): Promise<ResultadoEquipo<CambioConsentimientoEquipoRespuesta>> {
  const respuesta = await solicitarOperacionConsentimiento(
    `/operaciones/${encodeURIComponent(id)}/confirmar`,
    200,
  );

  if (respuesta.error) {
    return { error: respuesta.error };
  }

  const operacion = respuesta.datos;

  if (!operacion || operacion.estado !== 'ejecutada') {
    return {
      error: operacion?.error ??
        'No se pudo confirmar el cambio. Solicita una nueva propuesta.',
    };
  }

  const resultado = CambioConsentimientoEquipoRespuesta.safeParse(
    operacion.resultado,
  );

  if (!resultado.success) {
    return {
      error: 'No pudimos verificar el resultado. Actualiza la información del equipo.',
    };
  }

  return { datos: resultado.data };
}

export async function descartarCambioConsentimiento(
  id: string,
): Promise<ResultadoEquipo<OperacionRespuesta>> {
  const respuesta = await solicitarOperacionConsentimiento(
    `/operaciones/${encodeURIComponent(id)}/descartar`,
    200,
  );

  if (respuesta.error) return respuesta;

  if (respuesta.datos?.estado !== 'descartada') {
    return {
      error: 'No pudimos confirmar que la propuesta fue cancelada.',
    };
  }

  return respuesta;
}
