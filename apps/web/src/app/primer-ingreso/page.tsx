import { redirect } from 'next/navigation';
import { obtenerSesion } from '../../lib/sesion';
import { TarjetaAcceso } from '../tarjeta-acceso';
import { FormularioPrimerIngreso } from './formulario-primer-ingreso';

// WEB-v2 / Acceso / 02 Primer ingreso · REQ-ACC-04, 05. Sin franja horaria (R-44).
export default async function PrimerIngreso() {
  const sesion = await obtenerSesion();
  if (sesion.estado === 'ninguna') redirect('/entrar');
  if (sesion.estado === 'caducada') redirect('/sesion/renovar?volver=/primer-ingreso');
  if (sesion.estado === 'activa') redirect(sesion.sesion.rol === 'colaborador' ? '/solo-movil' : '/');

  return (
    <TarjetaAcceso
      titulo="Antes de empezar"
      explicacion="Cambia la contraseña temporal y elige tu zona horaria. Con ella te mostramos cada compromiso a su hora."
    >
      <FormularioPrimerIngreso />
    </TarjetaAcceso>
  );
}
