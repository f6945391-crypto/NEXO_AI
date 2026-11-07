import { redirect } from 'next/navigation';
import { TarjetaAcceso } from '../../../tarjeta-acceso';
import { obtenerSesionEmpresa } from '../_comun/sesion';
import { FormularioEntradaEmpresa } from './formulario';

// T-062 · specs/08-administracion/plan.md §7.1. Misma cuenta y misma contraseña que en NexoAI; otra sesión.
export default async function EntrarEnEmpresa() {
  const estado = await obtenerSesionEmpresa();
  if (estado.estado === 'activa') redirect(estado.sesion.administrador ? '/administracion' : '/administracion/equipos');
  if (estado.estado === 'caducada') redirect('/administracion/sesion/renovar?volver=/administracion');

  return (
    <TarjetaAcceso titulo="Entra en Administración" explicacion="Con tu cuenta de NexoAI. Es para quien administra la organización o es responsable de un equipo.">
      <FormularioEntradaEmpresa />
    </TarjetaAcceso>
  );
}
