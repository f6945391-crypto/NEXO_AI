import { redirect } from 'next/navigation';
import type { SesionEmpresa } from '@nexoai/contratos';
import { obtenerSesionEmpresa } from './sesion';

// Cada apartado exige la sesión de la zona; sin ella, a la entrada. Lo que muestra lo decide además la API en
// cada petición (P-04): esto solo evita pintar una página que no se puede leer.
export async function exigirSesionEmpresa(volver: string, opciones: { administrador?: boolean } = {}): Promise<SesionEmpresa> {
  const estado = await obtenerSesionEmpresa();
  if (estado.estado === 'ninguna') redirect('/administracion/entrar');
  if (estado.estado === 'caducada') redirect(`/administracion/sesion/renovar?volver=${encodeURIComponent(volver)}`);
  // Un responsable que no administra no ve Personas ni Registro (plan §7.2)
  if (opciones.administrador && !estado.sesion.administrador) redirect('/administracion/equipos');
  return estado.sesion;
}
