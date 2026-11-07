import { PersonaOrganizacion } from '@nexoai/contratos';
import { exigirSesionEmpresa } from './_comun/exigir';
import { leerDeLaZona } from './_comun/sesion';
import { Personas } from './personas';

// T-069 · REQ-ADM-08 a 16 (interfaz) · plan §7.2, «Personas». Solo para quien administra.
export default async function PaginaPersonas() {
  const sesion = await exigirSesionEmpresa('/administracion', { administrador: true });
  const personas = await leerDeLaZona('/administracion/personas', PersonaOrganizacion.array());
  return <Personas organizacion={sesion.organizacion.nombre} personas={personas} />;
}
