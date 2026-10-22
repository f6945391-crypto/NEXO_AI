import { redirect } from 'next/navigation';
import { salir } from '../acciones';
import { obtenerSesion } from '../../lib/sesion';
import { TarjetaAcceso } from '../tarjeta-acceso';

// REQ-ACC-13 · H-ACC-06: el colaborador trabaja desde el móvil; la web se lo dice y no le muestra nada más.
export default async function SoloMovil() {
  const sesion = await obtenerSesion();
  if (sesion.estado === 'ninguna') redirect('/entrar');
  if (sesion.estado === 'caducada') redirect('/sesion/renovar?volver=/solo-movil');
  if (sesion.estado === 'pendiente') redirect('/primer-ingreso');
  if (sesion.sesion.rol !== 'colaborador') redirect('/');

  return (
    <TarjetaAcceso
      titulo="Tu cuenta se usa desde el móvil"
      explicacion="Las tareas que te asignan, y tus respuestas, están en la aplicación móvil de NexoAI. Entra allí con este mismo correo."
    >
      <form action={salir}>
        <button type="submit" className="boton">
          Cerrar sesión
        </button>
      </form>
    </TarjetaAcceso>
  );
}
