'use server';

import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ClaveAlcanceGoogle,
  ConversacionAsistente,
  DecisionAsistente,
  EnlaceGoogleRespuesta,
  IngresoRespuesta,
  IngresoSolicitud,
  MensajeAsistente,
  OperacionRespuesta,
  PrimerIngresoSolicitud,
  RespuestaAsistente,
  ZonaHoraria,
} from '@nexoai/contratos';
import {
  borrarTokens,
  COOKIE_ACCESO,
  COOKIE_RENOVACION,
  destinoTrasIngreso,
  guardarTokens,
  llamarApi,
  mensajeDeError,
} from '../lib/sesion';

export type EstadoFormulario = { error?: string };

const SIN_CONEXION = 'No pudimos conectar con NexoAI. Revisa tu conexión e inténtalo de nuevo.';

// REQ-ACC-02, REQ-ACC-03 · T-011
export async function ingresar(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const solicitud = IngresoSolicitud.safeParse({ correo: datos.get('correo'), contrasena: datos.get('contrasena') });
  if (!solicitud.success) return { error: 'Escribe tu correo y tu contraseña.' };

  let destino: string;
  try {
    const respuesta = await llamarApi('/auth/ingreso', { metodo: 'POST', cuerpo: solicitud.data });
    if (respuesta.estado !== 200) return { error: mensajeDeError(respuesta.cuerpo) };
    const sesion = IngresoRespuesta.parse(respuesta.cuerpo);
    await guardarTokens(sesion);
    destino = destinoTrasIngreso(sesion);
  } catch {
    return { error: SIN_CONEXION };
  }
  redirect(destino);
}

// REQ-ACC-04, REQ-ACC-05 · T-011. La zona llega solo si la persona la eligió: el selector empieza vacío.
export async function completarPrimerIngreso(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const zonaHoraria = String(datos.get('zonaHoraria') ?? '');
  if (!zonaHoraria) return { error: 'Elige tu zona horaria para continuar.' };

  const solicitud = PrimerIngresoSolicitud.safeParse({ contrasenaNueva: datos.get('contrasenaNueva'), zonaHoraria });
  if (!solicitud.success) {
    const contrasenaCorta = solicitud.error.issues.some((i) => i.path[0] === 'contrasenaNueva');
    return { error: contrasenaCorta ? 'La contraseña nueva necesita al menos 12 caracteres.' : 'Esa zona horaria no es válida.' };
  }

  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) redirect('/entrar');

  let destino: string;
  try {
    const respuesta = await llamarApi('/auth/primer-ingreso', { metodo: 'POST', cuerpo: solicitud.data, token: acceso });
    if (respuesta.estado !== 200) return { error: mensajeDeError(respuesta.cuerpo) };
    const sesion = IngresoRespuesta.parse(respuesta.cuerpo);
    await guardarTokens(sesion);
    destino = destinoTrasIngreso(sesion);
  } catch {
    return { error: SIN_CONEXION };
  }
  redirect(destino);
}

// REQ-ACC-06 · T-022. Pide a la API un enlace firmado para ese permiso y lleva el navegador a Google.
export async function conectarGoogle(datos: FormData): Promise<void> {
  const alcance = ClaveAlcanceGoogle.safeParse(datos.get('alcance'));
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!alcance.success || !acceso) redirect('/');

  let url = '/?google=error';
  try {
    const respuesta = await llamarApi('/integraciones/google/enlace', {
      metodo: 'POST',
      cuerpo: { alcance: alcance.data, cliente: 'web' },
      token: acceso,
    });
    if (respuesta.estado === 200) url = EnlaceGoogleRespuesta.parse(respuesta.cuerpo).url;
  } catch {
    // Sin respuesta de la API: se vuelve con el aviso de error.
  }
  redirect(url);
}

// REQ-ACC-10, REQ-ACC-11 · T-027. El cambio de zona es la Operación de T-009, como control directo: la
// web pide la propuesta, pinta su tarjeta tal como llega y la confirma o la descarta.
export type ResultadoPropuesta = { propuesta?: OperacionRespuesta; error?: string };

async function tokenDeAcceso(): Promise<string> {
  const acceso = (await cookies()).get(COOKIE_ACCESO)?.value;
  if (!acceso) redirect('/entrar');
  return acceso;
}

export async function proponerCambioZona(zonaHoraria: string): Promise<ResultadoPropuesta> {
  const zona = ZonaHoraria.safeParse(zonaHoraria);
  if (!zona.success) return { error: 'Elige una zona horaria de la lista.' };
  const token = await tokenDeAcceso();
  try {
    const respuesta = await llamarApi('/operaciones', {
      metodo: 'POST',
      cuerpo: { tipo: 'perfil.cambiar_zona_horaria', carga: { zonaHoraria: zona.data }, origen: 'control_directo' },
      token,
    });
    if (respuesta.estado !== 201) return { error: mensajeDeError(respuesta.cuerpo) };
    return { propuesta: OperacionRespuesta.parse(respuesta.cuerpo) };
  } catch {
    return { error: SIN_CONEXION };
  }
}

export async function confirmarCambioZona(id: string): Promise<{ error?: string }> {
  const token = await tokenDeAcceso();
  try {
    const respuesta = await llamarApi(`/operaciones/${encodeURIComponent(id)}/confirmar`, { metodo: 'POST', token });
    if (respuesta.estado !== 200 || OperacionRespuesta.parse(respuesta.cuerpo).estado !== 'ejecutada') {
      return { error: mensajeDeError(respuesta.cuerpo, 'No se pudo cambiar la zona horaria. Inténtalo de nuevo.') };
    }
  } catch {
    return { error: SIN_CONEXION };
  }
  // La página se vuelve a pedir: el perfil y la agenda llegan ya en la zona nueva
  refresh();
  return {};
}

export async function descartarOperacion(id: string): Promise<void> {
  const token = await tokenDeAcceso();
  try {
    await llamarApi(`/operaciones/${encodeURIComponent(id)}/descartar`, { metodo: 'POST', token });
  } catch {
    // Si la API no responde, la propuesta queda sin confirmar, que tampoco cambia nada
  }
}

// T-034 · specs/07-agente/plan.md §9. La conversación con el asistente. La web solo envía lo escrito y la
// decisión sobre una tarjeta; lo que se muestra lo arma la API, y la confirmación es la de Operaciones (AD-09).
export type ResultadoAsistente = { respuesta?: RespuestaAsistente; error?: string };

async function hablarConAsistente(ruta: string, cuerpo: unknown): Promise<ResultadoAsistente> {
  const token = await tokenDeAcceso();
  try {
    const respuesta = await llamarApi(ruta, { metodo: 'POST', cuerpo, token });
    const leida = RespuestaAsistente.safeParse(respuesta.cuerpo);
    if (respuesta.estado !== 200 || !leida.success) return { error: mensajeDeError(respuesta.cuerpo, 'El asistente no pudo responder. Inténtalo de nuevo.') };
    // Si algo quedó hecho, la agenda de la página se vuelve a pedir; si algo quedó en espera, la franja
    // del lienzo también (T-045, REQ-CAP-25)
    if (leida.data.turnos.some((turno) => turno.tipo === 'resultado' || turno.tipo === 'en_espera')) refresh();
    return { respuesta: leida.data };
  } catch {
    return { error: SIN_CONEXION };
  }
}

export async function enviarAlAsistente(texto: string): Promise<ResultadoAsistente> {
  const mensaje = MensajeAsistente.safeParse({ texto });
  if (!mensaje.success) return { error: 'Escribe qué necesitas, en menos de 2000 caracteres.' };
  return hablarConAsistente('/asistente/mensajes', mensaje.data);
}

export async function decidirEnAsistente(decision: DecisionAsistente): Promise<ResultadoAsistente> {
  const valida = DecisionAsistente.safeParse(decision);
  if (!valida.success) return { error: 'No se pudo enviar tu decisión.' };
  return hablarConAsistente('/asistente/decisiones', valida.data);
}

// T-039 · REQ-AGT-03: «Ver anteriores» trae la página anterior de la conversación
export async function verAnteriores(cursor: string): Promise<{ conversacion?: ConversacionAsistente; error?: string }> {
  const token = await tokenDeAcceso();
  try {
    const respuesta = await llamarApi(`/asistente/conversacion?antes=${encodeURIComponent(cursor)}&limite=3`, { token });
    const leida = ConversacionAsistente.safeParse(respuesta.cuerpo);
    if (respuesta.estado !== 200 || !leida.success) return { error: mensajeDeError(respuesta.cuerpo, 'No se pudo traer lo anterior.') };
    return { conversacion: leida.data };
  } catch {
    return { error: SIN_CONEXION };
  }
}

// REQ-ACC-12: lo único que el usuario hace con su cuenta.
export async function salir(): Promise<void> {
  const renovacion = (await cookies()).get(COOKIE_RENOVACION)?.value;
  if (renovacion) {
    try {
      await llamarApi('/auth/salida', { metodo: 'POST', cuerpo: { tokenRenovacion: renovacion } });
    } catch {
      // Aunque la API no responda, la sesión se cierra en este navegador.
    }
  }
  await borrarTokens();
  redirect('/entrar');
}
