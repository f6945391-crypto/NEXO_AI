import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Navegacion } from './_comun/navegacion';
import { obtenerSesionEmpresa } from './_comun/sesion';
import './empresa.css';

export const metadata: Metadata = { title: 'Administración · NexoAI' };

// T-062 · specs/08-administracion/plan.md §7.2 y §7.3. La zona de empresa, aparte de la aplicación: su propia
// navegación a la izquierda y un lienzo. No importa nada de app/aplicacion. Sin sesión de la zona (la entrada),
// solo el contenido.
export default async function DisposicionEmpresa({ children }: { children: ReactNode }) {
  const estado = await obtenerSesionEmpresa();
  if (estado.estado !== 'activa') return children;
  return (
    <div className="empresa">
      <Navegacion sesion={estado.sesion} />
      <main className="empresa__lienzo">{children}</main>
    </div>
  );
}
