import { redirect } from 'next/navigation';
import { obtenerAgendaDelDia } from '../lib/agenda';
import { obtenerConversacion } from '../lib/asistente';
import { obtenerPerfil, obtenerPermisosGoogle, obtenerSesion } from '../lib/sesion';
import { Aplicacion } from './aplicacion/aplicacion';

// La aplicación: navegación, conversación y lienzo (T-023). También para el colaborador (T-026, REQ-ACC-13).
export default async function Inicio({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const sesion = await obtenerSesion();
  if (sesion.estado === 'ninguna') redirect('/entrar');
  if (sesion.estado === 'caducada') redirect('/sesion/renovar?volver=/');
  if (sesion.estado === 'pendiente') redirect('/primer-ingreso');

  // T-034: la conversación abierta, con lo que espera tu confirmación o quedó en espera
  const [perfil, permisosGoogle, conversacion, { google }] = await Promise.all([obtenerPerfil(), obtenerPermisosGoogle(), obtenerConversacion(), searchParams]);
  // T-025: la agenda de hoy, en la zona de la persona
  const agenda = perfil?.zonaHoraria
    ? await obtenerAgendaDelDia(perfil.zonaHoraria)
    : ({ estado: 'error', mensaje: 'No pudimos leer tu zona horaria.' } as const);
  return (
    <Aplicacion
      rol={sesion.sesion.rol}
      plan={sesion.sesion.plan}
      perfil={perfil}
      permisosGoogle={permisosGoogle}
      agenda={agenda}
      conversacion={conversacion}
      resultadoGoogle={google ?? null}
    />
  );
}
