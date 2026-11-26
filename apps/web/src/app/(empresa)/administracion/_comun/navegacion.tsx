'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SesionEmpresa } from '@nexoai/contratos';
import { salirDeEmpresa } from '../acciones';

// Los apartados según lo que la cuenta tiene en la empresa (plan §7.2). «Mi equipo» llega en la fase 4.
export function Navegacion({ sesion }: { sesion: SesionEmpresa }) {
  const ruta = usePathname();
  const apartados = [
    ...(sesion.administrador ? [{ href: '/administracion', nombre: 'Personas' }] : []),
    { href: '/administracion/equipos', nombre: 'Equipos' },
    ...(sesion.administrador ? [{ href: '/administracion/registro', nombre: 'Registro' }] : []),
  ];
  return (
    <nav className="empresa__navegacion" aria-label="Administración">
      <div className="empresa__marca">
        <p className="marca">NexoAI</p>
        <p className="empresa__organizacion">{sesion.organizacion.nombre}</p>
      </div>
      <ul className="empresa__apartados">
        {apartados.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="empresa__apartado" aria-current={ruta === a.href ? 'page' : undefined}>
              {a.nombre}
            </Link>
          </li>
        ))}
      </ul>
      <div className="empresa__pie">
        <p className="empresa__cuenta">{sesion.correo}</p>
        <form action={salirDeEmpresa}>
          <button type="submit" className="boton-texto">
            Salir de Administración
          </button>
        </form>
      </div>
    </nav>
  );
}
