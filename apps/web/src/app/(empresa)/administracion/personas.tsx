'use client';

import { useEffect, useRef, useState } from 'react';
import type { PersonaOrganizacion, Plan } from '@nexoai/contratos';
import { TarjetaConfirmacion, useConfirmacion } from './_comun/confirmacion';
import { NOMBRE_CLASE, NOMBRE_ESTADO, NOMBRE_PLAN } from './_comun/textos';

// T-062 · REQ-ADM-08 a 16 (interfaz). La tabla de personas y las acciones de cada fila. Cada acción pide a la
// API su tarjeta de confirmación y la pinta tal como llega (vistaConfirmacion): la web no decide si se puede.
// En una fila afiliada no hay acciones sobre la cuenta (REQ-ADM-15); quitarla de la organización llega con
// la afiliación (T-063, T-064).
// T-147 · H-ADM-35: la columna «Perfil» dice siempre «Administrador» o «Miembro», los administradores van primero
// y encima hay un resumen; en «Equipos», la etiqueta «Responsable» donde lo es.

const PLANES: Plan[] = ['empresarial', 'personal', 'gratuito'];

type Accion = { tipo: string; carga: object; nombre: string };

function accionesDe(p: PersonaOrganizacion): Accion[] {
  if (p.clase !== 'propia' || p.estado === 'cerrada') return [];
  const carga = { perfilId: p.perfilId };
  return [
    p.estado === 'suspendida'
      ? { tipo: 'administracion.reactivar_cuenta', carga, nombre: 'Reactivar' }
      : { tipo: 'administracion.suspender_cuenta', carga, nombre: 'Suspender' },
    { tipo: 'administracion.restablecer_contrasena', carga, nombre: 'Restablecer contraseña' },
    p.administrador
      ? { tipo: 'administracion.quitar_administrador', carga, nombre: 'Dejar de administrar' }
      : { tipo: 'administracion.nombrar_administrador', carga, nombre: 'Nombrar administrador' },
    { tipo: 'administracion.cerrar_cuenta', carga, nombre: 'Dar de baja' },
  ];
}

function EquiposDe({ persona: p }: { persona: PersonaOrganizacion }) {
  if (p.equipos.length === 0) return <>—</>;
  return (
    <ul className="empresa__equipos-de">
      {p.equipos.map((e) => (
        <li key={e.id}>
          {e.nombre}
          {e.responsable && (
            <>
              {' '}
              <span className="empresa__etiqueta empresa__etiqueta--responsable">Responsable</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

const enPlural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// «1 administrador · 2 miembros»: cuenta las cuentas que llevan etiqueta de perfil, no las invitaciones
function resumenDePerfiles(personas: PersonaOrganizacion[]): string {
  const cuentas = personas.filter((p) => p.clase !== 'invitacion');
  const administradores = cuentas.filter((p) => p.administrador).length;
  return `${enPlural(administradores, 'administrador', 'administradores')} · ${enPlural(cuentas.length - administradores, 'miembro', 'miembros')}`;
}

export function Personas({ organizacion, personas }: { organizacion: string; personas: PersonaOrganizacion[] | null }) {
  const [temporal, setTemporal] = useState<{ correo: string; contrasena: string } | null>(null);
  const [darDeAlta, setDarDeAlta] = useState(false);
  const { propuesta, error, ocupado, proponer, confirmar, cancelar } = useConfirmacion((operacion) => {
    if (operacion.efimero) {
      const correo = operacion.vistaConfirmacion.datos.find((d) => d.etiqueta === 'Correo' || d.etiqueta === 'Cuenta')?.valor ?? '';
      setTemporal({ correo, contrasena: operacion.efimero.contrasenaTemporal });
    }
    setDarDeAlta(false);
  });
  // Los administradores primero; dentro de cada grupo, el orden de la API (invitaciones, y luego por correo)
  const ordenadas = personas && [...personas].sort((a, b) => Number(b.administrador) - Number(a.administrador));

  return (
    <>
      <header className="empresa__cabecera">
        <div>
          <h1>Personas</h1>
          <p className="empresa__subtitulo">Las cuentas de {organizacion}. Administrar no da acceso al trabajo de nadie.</p>
        </div>
        <button type="button" className="boton" onClick={() => setDarDeAlta(true)} disabled={ocupado || darDeAlta}>
          Dar de alta
        </button>
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {darDeAlta && !propuesta && <FormularioAlta ocupado={ocupado} alCancelar={() => setDarDeAlta(false)} alRevisar={(carga) => proponer('administracion.alta_cuenta', carga)} />}

      {propuesta && <TarjetaConfirmacion propuesta={propuesta} ocupado={ocupado} alConfirmar={confirmar} alCancelar={cancelar} />}

      {temporal && <ContrasenaTemporal {...temporal} alCerrar={() => setTemporal(null)} />}

      {ordenadas === null ? (
        <p className="error" role="alert">
          No pudimos leer las cuentas. Vuelve a cargar la página.
        </p>
      ) : (
        <>
          <p className="empresa__resumen">{resumenDePerfiles(ordenadas)}</p>
          <table className="empresa__tabla">
            <thead>
              <tr>
                <th scope="col">Correo</th>
                <th scope="col">Cuenta</th>
                <th scope="col">Estado</th>
                <th scope="col">Plan</th>
                <th scope="col">Equipos</th>
                <th scope="col">Perfil</th>
                <th scope="col">
                  <span className="solo-lector">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((p) => (
                <Fila key={p.miembroId} persona={p} ocupado={ocupado || propuesta !== null} alPedir={proponer} />
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

function Fila({ persona: p, ocupado, alPedir }: { persona: PersonaOrganizacion; ocupado: boolean; alPedir: (tipo: string, carga: object) => void }) {
  const acciones = accionesDe(p);
  const [plan, setPlan] = useState<Plan | ''>('');
  return (
    <tr>
      <th scope="row">{p.correo}</th>
      <td>{NOMBRE_CLASE[p.clase]}</td>
      <td>
        <span className={`empresa__etiqueta${p.estado === 'activa' ? '' : ' empresa__etiqueta--aviso'}`}>{NOMBRE_ESTADO[p.estado]}</span>
      </td>
      <td>
        {acciones.length > 0 ? (
          <span className="empresa__plan">
            <label className="solo-lector" htmlFor={`plan-${p.miembroId}`}>
              Plan de {p.correo}
            </label>
            <select
              id={`plan-${p.miembroId}`}
              value={plan || p.plan}
              disabled={ocupado}
              onChange={(e) => {
                const nuevo = e.target.value as Plan;
                setPlan('');
                if (nuevo !== p.plan) alPedir('administracion.cambiar_plan', { perfilId: p.perfilId, plan: nuevo });
              }}
            >
              {PLANES.map((x) => (
                <option key={x} value={x}>
                  {NOMBRE_PLAN[x]}
                </option>
              ))}
            </select>
          </span>
        ) : (
          NOMBRE_PLAN[p.plan]
        )}
      </td>
      <td>
        <EquiposDe persona={p} />
      </td>
      <td>
        {p.clase === 'invitacion' ? (
          <span className="empresa__suave">—</span>
        ) : p.administrador ? (
          <span className="empresa__etiqueta empresa__etiqueta--administrador">Administrador</span>
        ) : (
          <span className="empresa__etiqueta">Miembro</span>
        )}
      </td>
      <td className="empresa__acciones">
        {acciones.length > 0 && <MenuAcciones correo={p.correo} acciones={acciones} ocupado={ocupado} alPedir={alPedir} />}
      </td>
    </tr>
  );
}

function MenuAcciones({ correo, acciones, ocupado, alPedir }: { correo: string; acciones: Accion[]; ocupado: boolean; alPedir: (tipo: string, carga: object) => void }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);
  return (
    <div className="empresa__menu" ref={raiz}>
      <button type="button" className="boton boton--secundario" aria-expanded={abierto} aria-label={`Acciones para ${correo}`} disabled={ocupado} onClick={() => setAbierto((a) => !a)}>
        Acciones
      </button>
      {abierto && (
        <ul className="empresa__menu-lista" role="menu" aria-label={`Acciones para ${correo}`}>
          {acciones.map((a) => (
            <li key={a.tipo} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  alPedir(a.tipo, a.carga);
                }}
              >
                {a.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormularioAlta({ ocupado, alCancelar, alRevisar }: { ocupado: boolean; alCancelar: () => void; alRevisar: (carga: object) => void }) {
  const [correo, setCorreo] = useState('');
  const [plan, setPlan] = useState<Plan>('empresarial');
  const [administrador, setAdministrador] = useState(false);
  return (
    <section className="empresa__panel" aria-labelledby="titulo-alta">
      <h2 id="titulo-alta">Dar de alta una cuenta</h2>
      <p className="empresa__suave">La cuenta será de la organización. Si el correo ya tiene una cuenta en NexoAI, te lo diremos antes de crear nada.</p>
      <form
        className="empresa__formulario"
        onSubmit={(e) => {
          e.preventDefault();
          alRevisar({ correo: correo.trim(), plan, administrador });
        }}
      >
        <div className="campo">
          <label htmlFor="alta-correo">Correo</label>
          <input id="alta-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="off" />
        </div>
        <div className="campo">
          <label htmlFor="alta-plan">Plan</label>
          <select id="alta-plan" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
            {PLANES.map((x) => (
              <option key={x} value={x}>
                {NOMBRE_PLAN[x]}
              </option>
            ))}
          </select>
        </div>
        <label className="empresa__casilla">
          <input type="checkbox" checked={administrador} onChange={(e) => setAdministrador(e.target.checked)} />
          También administra la organización
        </label>
        <div className="tarjeta__acciones">
          <button type="submit" className="boton" disabled={ocupado || !correo.trim()}>
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

// REQ-ADM-09, 14: la contraseña temporal se ve una sola vez; al cerrar esto, no vuelve a aparecer
function ContrasenaTemporal({ correo, contrasena, alCerrar }: { correo: string; contrasena: string; alCerrar: () => void }) {
  const [copiada, setCopiada] = useState(false);
  return (
    <div className="empresa__capa">
      <article className="tarjeta-confirmacion empresa__confirmacion" role="dialog" aria-modal="true" aria-labelledby="titulo-temporal">
        <h4 id="titulo-temporal">Contraseña temporal</h4>
        <p className="empresa__suave">Para {correo}. Se muestra solo esta vez: cópiala y dásela a la persona por un medio seguro. Al entrar tendrá que elegir una nueva.</p>
        <p className="empresa__temporal">
          <code aria-label="Contraseña temporal">{contrasena}</code>
        </p>
        <div className="tarjeta__acciones">
          <button
            type="button"
            className="boton"
            onClick={async () => {
              await navigator.clipboard?.writeText(contrasena).catch(() => undefined);
              setCopiada(true);
            }}
          >
            {copiada ? 'Copiada' : 'Copiar'}
          </button>
          <button type="button" className="boton boton--secundario" onClick={alCerrar}>
            Listo
          </button>
        </div>
      </article>
    </div>
  );
}
