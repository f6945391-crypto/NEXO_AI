import { EquipoOrganizacion } from '@nexoai/contratos';
import { exigirSesionEmpresa } from '../_comun/exigir';
import { leerDeLaZona } from '../_comun/sesion';

// T-069 · REQ-ADM-28 a 32 (lectura) · plan §7.2, «Equipos». Una tarjeta por equipo, con su responsable y sus
// miembros; «Sin responsable» destacado. Crear y componer equipos llega con T-073 y T-074.
export default async function PaginaEquipos() {
  const sesion = await exigirSesionEmpresa('/administracion/equipos');
  const equipos = await leerDeLaZona('/administracion/equipos', EquipoOrganizacion.array());
  return (
    <>
      <header className="empresa__cabecera">
        <div>
          <h1>Equipos</h1>
          <p className="empresa__subtitulo">
            {sesion.administrador ? `Los equipos de ${sesion.organizacion.nombre}, con su responsable y sus miembros.` : 'Los equipos de los que eres responsable.'}
          </p>
        </div>
      </header>
      {equipos === null ? (
        <p className="error" role="alert">
          No pudimos leer los equipos. Vuelve a cargar la página.
        </p>
      ) : equipos.length === 0 ? (
        <div className="empresa__vacio">
          <h2>Todavía no hay equipos</h2>
        </div>
      ) : (
        <ul className="empresa__equipos" aria-label="Equipos">
          {equipos.map((equipo) => (
            <li key={equipo.id} className="empresa__equipo">
              <article aria-labelledby={`equipo-${equipo.id}`}>
                <h2 id={`equipo-${equipo.id}`}>{equipo.nombre}</h2>
                <dl>
                  <div>
                    <dt>Responsable</dt>
                    <dd>{equipo.responsable ? equipo.responsable.correo : <span className="empresa__sin-responsable">Sin responsable</span>}</dd>
                  </div>
                  <div>
                    <dt>Miembros</dt>
                    <dd>
                      {equipo.miembros.length === 0 ? (
                        <span className="empresa__suave">Nadie más</span>
                      ) : (
                        <ul className="empresa__miembros">
                          {equipo.miembros.map((m) => (
                            <li key={m.perfilId}>{m.correo}</li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
