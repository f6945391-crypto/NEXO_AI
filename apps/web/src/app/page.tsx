import { redirect } from 'next/navigation';
import { obtenerPerfil, obtenerSesion } from '../lib/sesion';
import { Aplicacion } from './aplicacion/aplicacion';

// La aplicación: navegación, conversación y lienzo (T-023). El colaborador trabaja desde el móvil.
export default async function Inicio() {
  const sesion = await obtenerSesion();
  if (sesion.estado === 'ninguna') redirect('/entrar');
  if (sesion.estado === 'caducada') redirect('/sesion/renovar?volver=/');
  if (sesion.estado === 'pendiente') redirect('/primer-ingreso');
  if (sesion.sesion.rol === 'colaborador') redirect('/solo-movil');

  return <Aplicacion rol={sesion.sesion.rol} plan={sesion.sesion.plan} perfil={await obtenerPerfil()} />;
}
