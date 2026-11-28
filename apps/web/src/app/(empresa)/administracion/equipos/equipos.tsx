'use client';

import { useState } from 'react';
import type { EquipoOrganizacion, PersonaOrganizacion } from '@nexoai/contratos';
import { TarjetaConfirmacion, useConfirmacion } from '../_comun/confirmacion';

// T-067 · REQ-ADM-28 a 32 (interfaz) · plan §7.2. Crear un equipo, añadir y quitar personas y nombrar a su
// responsable, cada cosa con su tarjeta de confirmación, como en Personas. La lista de quién se puede añadir es
// solo una ayuda: lo que vale lo decide la API al proponer (cuentas propias y activas, H-ADM-34, INC-37).

type Pedir = (tipo: string, carga: object) => void;

const ELEGIBLES = new Set<PersonaOrganizacion['estado']>(['activa', 'primer_ingreso_pendiente']);

export function Equipos({
  organizacion,
  administrador,
  equipos,
  personas,
}: {
  organizacion: string;
  administrador: boolean;
  equipos: EquipoOrganizacion[] | null;
  personas: PersonaOrganizacion[] | null;
}) {
  const [creando, setCreando] = useState(false);
  const { propuesta, error, ocupado, proponer, confirmar, cancelar } = useConfirmacion(() => setCreando(false));
  const bloqueado = ocupado || propuesta !== null;

  return (
    <>
      <header className="empresa__cabecera">
        <div>
          <h1>Equipos</h1>
          <p className="empresa__subtitulo">{administrador ? `Los equipos de ${organizacion}, con su responsable y sus miembros.` : 'Los equipos de los que eres responsable.'}</p>
        </div>
        {administrador && (
          <button type="button" className="boton" onClick={() => setCreando(true)} disabled={bloqueado || creando}>
            Crear equipo
          </button>
        )}
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {administrador && creando && !propuesta && (
        <FormularioEquipo ocupado={ocupado} alCancelar={() => setCreando(false)} alRevisar={(nombre) => proponer('administracion.crear_equipo', { nombre })} />
      )}

      {propuesta && <TarjetaConfirmacion propuesta={propuesta} ocupado={ocupado} alConfirmar={confirmar} alCancelar={cancelar} />}

      {equipos === null ? (
        <p className="error" role="alert">
          No pudimos leer los equipos. Vuelve a cargar la página.
        </p>
      ) : equipos.length === 0 ? (
        <div className="empresa__vacio">
          <h2>Todavía no hay equipos</h2>
          {administrador && <p className="empresa__suave">Crea uno y añade a las personas de la organización que lo integran.</p>}
        </div>
      ) : (
        <ul className="empresa__equipos" aria-label="Equipos">
          {equipos.map((equipo) => (
            <TarjetaEquipo key={equipo.id} equipo={equipo} administrador={administrador} personas={personas} ocupado={bloqueado} alPedir={proponer} />
          ))}
        </ul>
      )}
    </>
  );
}

function TarjetaEquipo({
  equipo,
  administrador,
  personas,
  ocupado,
  alPedir,
}: {
  equipo: EquipoOrganizacion;
  administrador: boolean;
  personas: PersonaOrganizacion[] | null;
  ocupado: boolean;
  alPedir: Pedir;
}) {
  const carga = (perfilId: string) => ({ equipoId: equipo.id, perfilId });
  return (
    <li className={`empresa__equipo${equipo.responsable ? '' : ' empresa__equipo--sin-responsable'}`}>
      <article aria-labelledby={`equipo-${equipo.id}`}>
        <h2 id={`equipo-${equipo.id}`}>{equipo.nombre}</h2>
        <dl>
          <div>
            <dt>Responsable</dt>
            <dd>
              {equipo.responsable ? (
                <span className="empresa__miembro">
                  <span>{equipo.responsable.correo}</span>
                  {administrador && (
                    <span className="empresa__miembro-acciones">
                      <button
                        type="button"
                        className="boton-texto"
                        aria-label={`Quitar a ${equipo.responsable.correo} de ${equipo.nombre}`}
                        disabled={ocupado}
                        onClick={() => alPedir('administracion.quitar_de_equipo', carga(equipo.responsable!.perfilId))}
                      >
                        Quitar
                      </button>
                    </span>
                  )}
                </span>
              ) : (
                <span className="empresa__sin-responsable">Sin responsable</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Miembros</dt>
            <dd>
              {equipo.miembros.length === 0 ? (
                <span className="empresa__suave">Nadie más</span>
              ) : (
                <ul className="empresa__miembros">
                  {equipo.miembros.map((m) => (
                    <li key={m.perfilId} className="empresa__miembro">
                      <span>{m.correo}</span>
                      {administrador && (
                        <span className="empresa__miembro-acciones">
                          <button
                            type="button"
                            className="boton-texto"
                            aria-label={`Nombrar a ${m.correo} responsable de ${equipo.nombre}`}
                            disabled={ocupado}
                            onClick={() => alPedir('administracion.nombrar_responsable', carga(m.perfilId))}
                          >
                            Nombrar responsable
                          </button>
                          <button
                            type="button"
                            className="boton-texto"
                            aria-label={`Quitar a ${m.correo} de ${equipo.nombre}`}
                            disabled={ocupado}
                            onClick={() => alPedir('administracion.quitar_de_equipo', carga(m.perfilId))}
                          >
                            Quitar
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
        {administrador && <Anadir equipo={equipo} personas={personas} ocupado={ocupado} alPedir={alPedir} />}
      </article>
    </li>
  );
}

function Anadir({ equipo, personas, ocupado, alPedir }: { equipo: EquipoOrganizacion; personas: PersonaOrganizacion[] | null; ocupado: boolean; alPedir: Pedir }) {
  const [elegida, setElegida] = useState('');
  if (personas === null) return <p className="empresa__suave">No pudimos leer las cuentas de la organización para añadir a alguien.</p>;
  const dentro = new Set([...(equipo.responsable ? [equipo.responsable.perfilId] : []), ...equipo.miembros.map((m) => m.perfilId)]);
  const elegibles = personas.filter((p) => p.clase === 'propia' && ELEGIBLES.has(p.estado) && !dentro.has(p.perfilId));
  if (elegibles.length === 0) return <p className="empresa__suave">No queda nadie de la organización para añadir.</p>;
  const id = `anadir-${equipo.id}`;
  const valor = elegibles.some((p) => p.perfilId === elegida) ? elegida : '';
  return (
    <form
      className="empresa__anadir"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valor) return;
        alPedir('administracion.anadir_a_equipo', { equipoId: equipo.id, perfilId: valor });
        setElegida('');
      }}
    >
      <label className="solo-lector" htmlFor={id}>
        Persona para añadir a {equipo.nombre}
      </label>
      <select id={id} value={valor} onChange={(e) => setElegida(e.target.value)} disabled={ocupado}>
        <option value="">Elige a alguien…</option>
        {elegibles.map((p) => (
          <option key={p.perfilId} value={p.perfilId}>
            {p.correo}
          </option>
        ))}
      </select>
      <button type="submit" className="boton boton--secundario" aria-label={`Añadir a ${equipo.nombre}`} disabled={ocupado || !valor}>
        Añadir
      </button>
    </form>
  );
}

function FormularioEquipo({ ocupado, alCancelar, alRevisar }: { ocupado: boolean; alCancelar: () => void; alRevisar: (nombre: string) => void }) {
  const [nombre, setNombre] = useState('');
  return (
    <section className="empresa__panel" aria-labelledby="titulo-crear-equipo">
      <h2 id="titulo-crear-equipo">Crear un equipo</h2>
      <p className="empresa__suave">Empieza vacío y sin responsable. Después añades a las personas y nombras a quien lo lleva.</p>
      <form
        className="empresa__formulario"
        onSubmit={(e) => {
          e.preventDefault();
          alRevisar(nombre.trim());
        }}
      >
        <div className="campo">
          <label htmlFor="equipo-nombre">Nombre del equipo</label>
          <input id="equipo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} required autoComplete="off" />
        </div>
        <div className="tarjeta__acciones">
          <button type="submit" className="boton" disabled={ocupado || !nombre.trim()}>
            Revisar
          </button>
          <button type="button" className="boton boton--secundario" onClick={alCancelar} disabled={ocupado}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
