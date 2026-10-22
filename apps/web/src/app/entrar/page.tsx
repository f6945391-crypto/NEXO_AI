import { redirect } from 'next/navigation';
import { obtenerSesion } from '../../lib/sesion';
import { TarjetaAcceso } from '../tarjeta-acceso';
import { FormularioEntrada } from './formulario-entrada';

// WEB-v2 / Acceso / 01 Entrada · REQ-ACC-01, 02, 03. Sin registro: las cuentas las da la organización.
export default async function Entrar() {
  const sesion = await obtenerSesion();
  if (sesion.estado === 'activa') redirect(sesion.sesion.rol === 'colaborador' ? '/solo-movil' : '/');
  if (sesion.estado === 'pendiente') redirect('/primer-ingreso');

  return (
    <TarjetaAcceso titulo="Entra en NexoAI" explicacion="Con la cuenta que te dio tu organización.">
      <FormularioEntrada />
    </TarjetaAcceso>
  );
}
