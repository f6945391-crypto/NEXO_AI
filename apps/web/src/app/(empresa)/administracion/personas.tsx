'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { OperacionRespuesta, PersonaOrganizacion, Plan } from '@nexoai/contratos';
import { confirmarEnEmpresa, descartarEnEmpresa, proponerEnEmpresa } from './acciones';
import { NOMBRE_CLASE, NOMBRE_ESTADO, NOMBRE_PLAN } from './_comun/textos';

// T-062 · REQ-ADM-08 a 16 (interfaz). La tabla de personas y las acciones de cada fila. Cada acción pide a la
// API su tarjeta de confirmación y la pinta tal como llega (vistaConfirmacion): la web no decide si se puede.
// En una fila afiliada no hay acciones sobre la cuenta (REQ-ADM-15); quitarla de la organización llega con
// la afiliación (T-063, T-064).

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

const equiposDe = (p: PersonaOrganizacion) => (p.equipos.length === 0 ? '—' : p.equipos.map((e) => (e.responsable ? `${e.nombre} (responsable)` : e.nombre)).join(', '));

export function Personas({ organizacion, personas }: { organizacion: string; personas: PersonaOrganizacion[] | null }) {
  const [propuesta, setPropuesta] = useState<OperacionRespuesta | null>(null);
  const [temporal, setTemporal] = useState<{ correo: string; contrasena: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darDeAlta, setDarDeAlta] = useState(false);
  const [ocupado, empezar] = useTransition();

  const proponer = (tipo: string, carga: object) =>
    empezar(async () => {
      setError(null);
      const r = await proponerEnEmpresa(tipo, carga);
      if (r.error) setError(r.error);
      else setPropuesta(r.propuesta ?? null);
    });

  const confirmar = () =>
    empezar(async () => {
      if (!propuesta) return;
      const r = await confirmarEnEmpresa(propuesta.id);
      if (r.error || !r.operacion) {
        setError(r.error ?? 'No se pudo completar. Inténtalo de nuevo.');
        setPropuesta(null);
        return;
      }
      if (r.operacion.estado === 'propuesta') {
        // Algo cambió desde que se preparó: llega la tarjeta nueva, con el motivo
        setPropuesta(r.operacion);
        return;
      }
      if (r.operacion.estado !== 'ejecutada') setError(r.operacion.error ?? 'No se pudo completar.');
      if (r.operacion.efimero) {
        const correo = r.operacion.vistaConfirmacion.datos.find((d) => d.etiqueta === 'Correo' || d.etiqueta === 'Cuenta')?.valor ?? '';
        setTemporal({ correo, contrasena: r.operacion.efimero.contrasenaTemporal });
      }
      setPropuesta(null);
      setDarDeAlta(false);
    });

  const cancelar = () =>
    empezar(async () => {
      if (propuesta) await descartarEnEmpresa(propuesta.id);
      setPropuesta(null);
    });

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

      {personas === null ? (
        <p className="error" role="alert">
          No pudimos leer las cuentas. Vuelve a cargar la página.
        </p>
      ) : (
        <table className="empresa__tabla">
          <thead>
            <tr>
              <th scope="col">Correo</th>
              <th scope="col">Cuenta</th>
              <th scope="col">Estado</th>
              <th scope="col">Plan</th>
              <th scope="col">Equipos</th>
              <th scope="col">Administra</th>
              <th scope="col">
                <span className="solo-lector">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <Fila key={p.miembroId} persona={p} ocupado={ocupado || propuesta !== null} alPedir={proponer} />
            ))}
          </tbody>
        </table>
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
      <td>{equiposDe(p)}</td>
      <td>{p.administrador ? 'Sí' : ''}</td>
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

// La tarjeta de confirmación, tal como la arma la API (P-03, REQ-ADM-16)
function TarjetaConfirmacion({ propuesta, ocupado, alConfirmar, alCancelar }: { propuesta: OperacionRespuesta; ocupado: boolean; alConfirmar: () => void; alCancelar: () => void }) {
  const vista = propuesta.vistaConfirmacion;
  return (
    <div className="empresa__capa">
      <article className="tarjeta-confirmacion empresa__confirmacion" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacion">
        <h4 id="titulo-confirmacion">{vista.accion}</h4>
        <dl>
          {vista.datos.map((d) => (
            <div key={d.etiqueta} className="tarjeta-confirmacion__dato">
              <dt>{d.etiqueta}</dt>
              <dd>{d.valor}</dd>
            </div>
          ))}
        </dl>
        {vista.irreversible && <p className="tarjeta__irreversible">{vista.irreversible}</p>}
        {!vista.confirmable && vista.motivoNoConfirmable && (
          <p className="tarjeta__motivo" role="status">
            {vista.motivoNoConfirmable}
          </p>
        )}
        <div className="tarjeta__acciones">
          {vista.confirmable && (
            <button type="button" className="boton" onClick={alConfirmar} disabled={ocupado} autoFocus>
              Confirmar
            </button>
          )}
          <button type="button" className="boton boton--secundario" onClick={alCancelar} disabled={ocupado}>
            {vista.confirmable ? 'Cancelar' : 'Entendido'}
          </button>
        </div>
      </article>
    </div>
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
