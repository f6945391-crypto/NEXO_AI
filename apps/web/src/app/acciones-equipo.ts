'use server';

import { cookies } from 'next/headers';
import {
  COOKIE_ACCESO,
  llamarApi,
  mensajeDeError,
} from '../lib/sesion';

export type ResultadoEquipo = {
  datos?: unknown;
  error?: string;
};

async function consultarEquipo(ruta: string): Promise<ResultadoEquipo> {
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

    return { datos: respuesta.cuerpo };
  } catch {
    return {
      error: 'No pudimos conectar con NexoAI. Inténtalo nuevamente.',
    };
  }
}

export async function obtenerEquipos(): Promise<ResultadoEquipo> {
  return consultarEquipo('/equipos');
}

export async function obtenerIntegrantes(
  equipoId: string,
): Promise<ResultadoEquipo> {
  if (!equipoId) return { error: 'Selecciona un equipo.' };

  return consultarEquipo(
    `/equipos/${encodeURIComponent(equipoId)}/integrantes`,
  );
}

export async function obtenerDisponibilidadEquipo(
  equipoId: string,
  desde: string,
  hasta: string,
  duracionMinutos?: number,
): Promise<ResultadoEquipo> {
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

  const parametros = new URLSearchParams({ desde, hasta });

  if (duracionMinutos !== undefined) {
    parametros.set('duracionMinutos', String(duracionMinutos));
  }

  return consultarEquipo(
    `/equipos/${encodeURIComponent(equipoId)}/disponibilidad?${parametros.toString()}`,
  );
}
