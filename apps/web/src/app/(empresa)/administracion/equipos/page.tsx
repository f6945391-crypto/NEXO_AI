import { EquipoOrganizacion, PersonaOrganizacion } from '@nexoai/contratos';
import { exigirSesionEmpresa } from '../_comun/exigir';
import { leerDeLaZona } from '../_comun/sesion';
import { Equipos } from './equipos';

// T-062, T-067 · REQ-ADM-28 a 32 · plan §7.2, «Equipos». Una tarjeta por equipo, con su responsable y sus
// miembros; «Sin responsable» destacado. El administrador los crea y los compone; el responsable que no
// administra ve los suyos en lectura y no pide la lista de personas, que no es suya (REQ-ADM-06).
export default async function PaginaEquipos() {
  const sesion = await exigirSesionEmpresa('/administracion/equipos');
  const [equipos, personas] = await Promise.all([
    leerDeLaZona('/administracion/equipos', EquipoOrganizacion.array()),
    sesion.administrador ? leerDeLaZona('/administracion/personas', PersonaOrganizacion.array()) : Promise.resolve(null),
  ]);
  return <Equipos organizacion={sesion.organizacion.nombre} administrador={sesion.administrador} equipos={equipos} personas={personas} />;
}
