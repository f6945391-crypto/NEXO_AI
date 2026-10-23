'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { Perfil, PermisoGoogle, Plan, Rol } from '@nexoai/contratos';
import type { AgendaDelDia } from '../../lib/agenda';
import { conectarGoogle, salir } from '../acciones';
import {
  IconoActividad,
  IconoAgenda,
  IconoAjustes,
  IconoCerrar,
  IconoContraer,
  IconoEnviar,
  IconoExpandir,
  IconoTareas,
} from './iconos';
import { SECCIONES, type Seccion } from './secciones';

// T-023 · design/ARQUITECTURA-VISUAL-WEB.md. Navegación 72 · conversación 528 · lienzo 840, y el
// lienzo expandido (72 · 0 · 1368). El asistente llega en la fase 2: hasta entonces, lo que se pide
// queda en espera y se dice con claridad que no se envió ni se creó nada (R-42, P-11).

type Mensaje = { id: number; texto: string; hora: string };

const ICONOS: Record<Seccion, () => React.JSX.Element> = {
  agenda: IconoAgenda,
  tareas: IconoTareas,
  actividad: IconoActividad,
};

function horaActual(): string {
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', timeZoneName: 'shortOffset' }).format(new Date());
}

const NOMBRE_PLAN: Record<Plan, string> = { gratuito: 'Gratuito', personal: 'Personal', empresarial: 'Empresarial' };

const ESTADO_PERMISO: Record<PermisoGoogle['estado'], string> = {
  no_concedido: 'Sin conectar',
  concedido: 'Conectado',
  revocado: 'Retirado',
  caducado: 'Caducado',
};

// Vuelta de Google (T-022): qué decirle a la persona, en sus palabras.
const AVISO_GOOGLE: Record<string, { texto: string; tono: 'exito' | 'advertencia' }> = {
  conectado: { texto: 'Listo: el permiso de Google quedó conectado.', tono: 'exito' },
  rechazado: { texto: 'No se conectó Google: cancelaste el permiso.', tono: 'advertencia' },
  'no-concedido': { texto: 'Google no dio el permiso. Al aceptar, deja marcada la casilla del permiso.', tono: 'advertencia' },
  error: { texto: 'No pudimos conectar con Google. Inténtalo de nuevo en un momento.', tono: 'advertencia' },
};

export function Aplicacion({
  rol,
  plan,
  perfil,
  permisosGoogle,
  agenda,
  resultadoGoogle,
}: {
  rol: Rol;
  plan: Plan;
  perfil: Perfil | null;
  permisosGoogle: PermisoGoogle[];
  agenda: AgendaDelDia;
  resultadoGoogle: string | null;
}) {
  const [seccion, setSeccion] = useState<Seccion>('agenda');
  const [corte, setCorte] = useState(0);
  const [expandido, setExpandido] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [aviso, setAviso] = useState(resultadoGoogle ? (AVISO_GOOGLE[resultadoGoogle] ?? null) : null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [borrador, setBorrador] = useState('');
  const entrada = useRef<HTMLTextAreaElement>(null);
  const actual = SECCIONES[seccion];

  function cambiarSeccion(nueva: Seccion) {
    setSeccion(nueva);
    setCorte(0);
  }

  function enviar(evento?: FormEvent) {
    evento?.preventDefault();
    const texto = borrador.trim();
    if (!texto) return;
    setMensajes((previos) => [...previos, { id: previos.length + 1, texto, hora: horaActual() }]);
    setBorrador('');
  }

  function usarEjemplo(ejemplo: string) {
    setBorrador(ejemplo);
    entrada.current?.focus();
  }

  // REQ-CUN01-12: el estado vacío lleva a pedírselo al asistente, nunca a un formulario (R-42). Si el
  // lienzo está ampliado, primero vuelve a mostrarse la conversación.
  function abrirCaptura() {
    setExpandido(false);
    requestAnimationFrame(() => entrada.current?.focus());
  }

  const conLista = seccion === 'agenda' && corte === 0 && agenda.estado === 'lista' && agenda.compromisos.length > 0;

  // «Encargadas» es lo que encargaste a otros: el colaborador no asigna tareas (REQ-ACC-15)
  const encarga = plan === 'empresarial' && rol !== 'colaborador';
  const cortes = seccion === 'tareas' && encarga ? [...actual.cortes, 'Encargadas'] : actual.cortes;

  return (
    <div className={`aplicacion${expandido ? ' aplicacion--expandida' : ''}`}>
      <nav className="navegacion" aria-label="Secciones">
        <div className="navegacion__secciones">
          {(Object.keys(SECCIONES) as Seccion[]).map((clave) => {
            const Icono = ICONOS[clave];
            return (
              <button
                key={clave}
                type="button"
                className="navegacion__boton"
                aria-current={clave === seccion ? 'page' : undefined}
                aria-label={SECCIONES[clave].nombre}
                title={SECCIONES[clave].nombre}
                onClick={() => cambiarSeccion(clave)}
              >
                <Icono />
              </button>
            );
          })}
        </div>
        <button type="button" className="navegacion__boton navegacion__ajustes" aria-label="Ajustes" title="Ajustes" onClick={() => setAjustes(true)}>
          <IconoAjustes />
        </button>
      </nav>

      {!expandido && (
        <section className="conversacion" aria-label="Asistente">
          <div className="conversacion__contenido">
            {mensajes.length === 0 ? (
              <div className="blanco-inicial">
                <h2>¿Qué hacemos?</h2>
                <p>Pídelo con tus palabras. Antes de hacer nada que no se pueda deshacer, te lo enseño para que lo confirmes.</p>
                <ul className="ejemplos">
                  {actual.ejemplos.map((ejemplo) => (
                    <li key={ejemplo}>
                      <button type="button" className="ejemplo" onClick={() => usarEjemplo(ejemplo)}>
                        {ejemplo}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <div className="aviso-espera" role="status">
                  <strong>El asistente todavía no está activo en esta versión.</strong> Lo que pides queda aquí, en espera.
                  No se ha enviado a nadie ni se ha creado nada.
                </div>
                <ol className="mensajes">
                  {mensajes.map((mensaje) => (
                    <li key={mensaje.id} className="mensaje">
                      <p className="mensaje__texto">{mensaje.texto}</p>
                      <p className="mensaje__estado">En espera · {mensaje.hora}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          <form className="barra-entrada" onSubmit={enviar}>
            <label htmlFor="pedido" className="solo-lector">
              Pídele algo al asistente
            </label>
            <textarea
              id="pedido"
              ref={entrada}
              rows={2}
              value={borrador}
              placeholder="Pídele algo al asistente"
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) enviar(e);
              }}
            />
            <button type="submit" className="barra-entrada__enviar" aria-label="Enviar" disabled={!borrador.trim()}>
              <IconoEnviar />
            </button>
          </form>
        </section>
      )}

      <main className="lienzo">
        {aviso && (
          <div className={`aviso aviso--${aviso.tono}`} role="status">
            <span>{aviso.texto}</span>
            <button type="button" className="aviso__cerrar" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>
              <IconoCerrar />
            </button>
          </div>
        )}
        <header className="lienzo__cabecera">
          <div>
            <h1>{actual.nombre}</h1>
            <p className="lienzo__pregunta">{actual.pregunta}</p>
          </div>
          <button
            type="button"
            className="lienzo__expandir"
            aria-label={expandido ? 'Volver a mostrar el asistente' : 'Ampliar'}
            title={expandido ? 'Volver a mostrar el asistente' : 'Ampliar'}
            onClick={() => setExpandido((valor) => !valor)}
          >
            {expandido ? <IconoContraer /> : <IconoExpandir />}
          </button>
        </header>

        <div className="selector" role="tablist" aria-label={seccion === 'tareas' ? 'Franjas' : 'Niveles'}>
          {cortes.map((nombre, indice) => (
            <button key={nombre} type="button" role="tab" aria-selected={indice === corte} onClick={() => setCorte(indice)}>
              {nombre}
            </button>
          ))}
        </div>

        <div className={`lienzo__cuerpo${conLista ? ' lienzo__cuerpo--lista' : ''}`}>
          {seccion === 'agenda' && agenda.estado === 'sin-calendario' && (
            <div className="vacio">
              <h2>Tu agenda llega con tu calendario</h2>
              <p>Para mostrarte tus compromisos, NexoAI necesita permiso para ver y editar tu calendario de Google.</p>
              <button type="button" className="boton" onClick={() => setAjustes(true)}>
                Conectar mi calendario
              </button>
            </div>
          )}
          {seccion === 'agenda' && agenda.estado === 'error' && (
            <div className="vacio" role="alert">
              <h2>No pudimos leer tu agenda</h2>
              <p>{agenda.mensaje}</p>
            </div>
          )}
          {seccion === 'agenda' && agenda.estado === 'lista' && corte > 0 && (
            <div className="vacio">
              <h2>Por ahora, solo el día de hoy</h2>
              <p>La vista de {cortes[corte]?.toLowerCase()} llega en una próxima versión.</p>
            </div>
          )}
          {seccion === 'agenda' && agenda.estado === 'lista' && corte === 0 && agenda.compromisos.length === 0 && (
            <div className="vacio">
              <h2>Hoy no tienes compromisos</h2>
              <p>Para crear el primero, pídeselo al asistente con tus palabras, por ejemplo «Agéndame una reunión mañana a las 10».</p>
              <button type="button" className="boton" onClick={abrirCaptura}>
                Pedírselo al asistente
              </button>
            </div>
          )}
          {conLista && agenda.estado === 'lista' && (
            <section className="agenda-dia" aria-labelledby="titulo-dia">
              <header className="agenda-dia__cabecera">
                <h2 id="titulo-dia">{agenda.fecha}</h2>
                {/* REQ-CUN01-10: en qué zona están las horas */}
                <p className="agenda-dia__zona">{agenda.zona}</p>
              </header>
              <ol className="agenda-dia__lista" aria-label="Compromisos de hoy">
                {agenda.compromisos.map((c) => (
                  <li key={c.id} className={`compromiso${c.cancelado ? ' compromiso--cancelado' : ''}`}>
                    <p className="compromiso__horario">{c.horario}</p>
                    <div>
                      <p className="compromiso__titulo">
                        {c.titulo}
                        {c.cancelado && <span className="etiqueta">Cancelado</span>}
                        {c.invitado && <span className="etiqueta">Invitado</span>}
                      </p>
                      {c.enSuZona && <p className="compromiso__zona">{c.enSuZona}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {seccion === 'tareas' && (
            <div className="vacio">
              <h2>Nada en «{cortes[corte]}»</h2>
              <p>Cuando le pidas algo al asistente, tus tareas aparecerán aquí, ordenadas por franja.</p>
            </div>
          )}
          {seccion === 'actividad' && (
            <div className="vacio">
              <h2>Todavía no hay actividad</h2>
              <p>Aquí verás cuánto tiempo dedicaste a cada cosa y todo lo que el asistente hizo por ti.</p>
            </div>
          )}
        </div>
      </main>

      {ajustes && (
        <div className="capa" role="dialog" aria-modal="true" aria-labelledby="titulo-ajustes">
          <div className="capa__panel">
            <header className="capa__cabecera">
              <h2 id="titulo-ajustes">Ajustes</h2>
              <button type="button" className="capa__cerrar" aria-label="Cerrar" onClick={() => setAjustes(false)}>
                <IconoCerrar />
              </button>
            </header>
            {perfil && (
              <dl className="perfil">
                <dt>Correo</dt>
                <dd>{perfil.correo}</dd>
                <dt>Organización</dt>
                <dd>{perfil.organizacion.nombre}</dd>
                <dt>Plan</dt>
                <dd>{NOMBRE_PLAN[perfil.plan]}</dd>
                <dt>Zona horaria</dt>
                <dd>{perfil.zonaHoraria?.replaceAll('_', ' ') ?? '—'}</dd>
              </dl>
            )}
            <p className="explicacion">Tu correo, tu plan y tu cuenta los gestiona tu organización.</p>
            {permisosGoogle.length > 0 && (
              <section className="permisos" aria-labelledby="titulo-google">
                <h3 id="titulo-google">Google</h3>
                <p className="explicacion">Cada permiso se concede por separado y lo puedes retirar cuando quieras desde tu cuenta de Google.</p>
                <ul>
                  {permisosGoogle.map((permiso) => (
                    <li key={permiso.clave} className="permiso">
                      <div>
                        <p className="permiso__nombre">
                          {permiso.nombre}{' '}
                          <span className={`etiqueta etiqueta--${permiso.estado}`}>{ESTADO_PERMISO[permiso.estado]}</span>
                        </p>
                        <p className="permiso__para">{permiso.paraQue}</p>
                      </div>
                      {permiso.estado !== 'concedido' && (
                        <form action={conectarGoogle}>
                          <input type="hidden" name="alcance" value={permiso.clave} />
                          <button type="submit" className="boton boton--secundario" aria-label={`Conectar: ${permiso.nombre}`}>
                            Conectar
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <form action={salir}>
              <button type="submit" className="boton">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
