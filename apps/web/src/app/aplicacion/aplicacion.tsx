'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ConversacionAsistente, Perfil, PermisoGoogle, Plan, Rol, TareasDelDia } from '@nexoai/contratos';
import type { Agenda, NivelAgenda, VistaAgenda } from '../../lib/agenda';
import type { CosaEnEspera } from '../../lib/asistente';
import type { Tareas } from '../../lib/tareas';
import { conectarGoogle, salir } from '../acciones';
import { Actividad } from './actividad';
import { AgendaMes, AgendaSemana, ListaCompromisos } from './agenda';
import { CambioZona } from './cambio-zona';
import { FranjaEnEspera } from './en-espera';
import { Conversacion } from './conversacion';
import {
  IconoActividad,
  IconoAdministracion,
  IconoAgenda,
  IconoAjustes,
  IconoCerrar,
  IconoContraer,
  IconoExpandir,
  IconoTareas,
} from './iconos';
import { SECCIONES, type Seccion } from './secciones';
import { FRANJAS, franjaVacia, SeccionTareas, TareasParaEsteDia } from './tareas';

// T-023 · design/ARQUITECTURA-VISUAL-WEB.md. Navegación 72 · conversación 528 · lienzo 840, y el
// lienzo expandido (72 · 0 · 1368). T-034: la conversación habla con el asistente (conversacion.tsx).

const ICONOS: Record<Seccion, () => React.JSX.Element> = {
  agenda: IconoAgenda,
  tareas: IconoTareas,
  actividad: IconoActividad,
};

const NOMBRE_PLAN: Record<Plan, string> = { gratuito: 'Gratuito', personal: 'Personal', empresarial: 'Empresarial' };

const ESTADO_PERMISO: Record<PermisoGoogle['estado'], string> = {
  no_concedido: 'Sin conectar',
  concedido: 'Conectado',
  revocado: 'Retirado',
  caducado: 'Caducado',
};

// T-044: el orden de los niveles es el de `SECCIONES.agenda.cortes`
const NIVELES: NivelAgenda[] = ['dia', 'semana', 'mes'];

function direccion({ nivel, fecha }: VistaAgenda): string {
  const consulta = new URLSearchParams();
  if (nivel !== 'dia') consulta.set('nivel', nivel);
  if (fecha) consulta.set('fecha', fecha);
  const texto = consulta.toString();
  return texto ? `/?${texto}` : '/';
}

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
  administrador,
  perfil,
  permisosGoogle,
  agenda,
  vista,
  enEspera,
  conversacion,
  resultadoGoogle,
  tareas,
  tareasDelDia,
}: {
  rol: Rol;
  plan: Plan;
  // T-069 · REQ-ADM-05: según GET /auth/sesion; solo pinta, la zona decide al entrar (P-04)
  administrador: boolean;
  perfil: Perfil | null;
  permisosGoogle: PermisoGoogle[];
  agenda: Agenda;
  vista: VistaAgenda;
  enEspera: CosaEnEspera[];
  conversacion: ConversacionAsistente | null;
  resultadoGoogle: string | null;
  // T-052, T-053 · 09-tareas-personales
  tareas: Tareas;
  tareasDelDia: TareasDelDia | null;
}) {
  const [seccion, setSeccion] = useState<Seccion>('agenda');
  const [corte, setCorte] = useState(0);
  const [expandido, setExpandido] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [aviso, setAviso] = useState(resultadoGoogle ? (AVISO_GOOGLE[resultadoGoogle] ?? null) : null);
  const entrada = useRef<HTMLTextAreaElement>(null);
  const actual = SECCIONES[seccion];
  const router = useRouter();
  const [cambiando, enTransicion] = useTransition();
  // En Agenda el nivel lo dice la dirección; en las otras secciones, el estado de la página
  const corteVisible = seccion === 'agenda' ? NIVELES.indexOf(vista.nivel) : corte;

  function irA(nueva: VistaAgenda) {
    enTransicion(() => router.push(direccion(nueva), { scroll: false }));
  }

  function elegirCorte(indice: number) {
    if (seccion === 'agenda') irA({ nivel: NIVELES[indice] ?? 'dia', fecha: null });
    else setCorte(indice);
  }

  function cambiarSeccion(nueva: Seccion) {
    setSeccion(nueva);
    setCorte(0);
  }

  // REQ-CUN01-12: el estado vacío lleva a pedírselo al asistente, nunca a un formulario (R-42). Si el
  // lienzo está ampliado, primero vuelve a mostrarse la conversación.
  function abrirCaptura() {
    setExpandido(false);
    requestAnimationFrame(() => entrada.current?.focus());
  }

  const lista = seccion === 'agenda' && agenda.estado === 'lista' ? agenda : null;
  const dia = lista?.nivel === 'dia' ? lista : null;
  // T-053: con tareas del día, Hoy es una lista aunque no haya compromisos (el estado vacío va arriba)
  const conTareasDelDia = seccion === 'agenda' && vista.nivel === 'dia' && (tareasDelDia?.tareas.length ?? 0) > 0;
  // T-052: la franja de Tareas es una lista salvo que esté vacía del todo
  const franja = seccion === 'tareas' ? FRANJAS[corteVisible] : undefined;
  const conTareas = franja !== undefined && tareas.estado === 'lista' && !franjaVacia(tareas, franja);
  const conLista = (lista !== null && (lista.nivel !== 'dia' || lista.compromisos.length > 0)) || conTareasDelDia || conTareas || seccion === 'actividad';

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
        <div className="navegacion__pie">
          {/* specs/08-administracion/plan.md §7.1: la zona de empresa se abre aparte y con su propia entrada; no
              comparte la sesión de la aplicación */}
          {administrador && (
            <a className="navegacion__boton" href="/administracion/entrar" target="_blank" rel="noopener" aria-label="Administración" title="Administración">
              <IconoAdministracion />
            </a>
          )}
          <button type="button" className="navegacion__boton" aria-label="Ajustes" title="Ajustes" onClick={() => setAjustes(true)}>
            <IconoAjustes />
          </button>
        </div>
      </nav>

      {!expandido && <Conversacion inicial={conversacion} ejemplos={actual.ejemplos} zona={perfil?.zonaHoraria ?? undefined} entrada={entrada} />}

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
            <button key={nombre} type="button" role="tab" aria-selected={indice === corteVisible} onClick={() => elegirCorte(indice)}>
              {nombre}
            </button>
          ))}
        </div>

        {/* REQ-CAP-25: encima de la agenda de hoy, mientras haya algo en espera */}
        {seccion === 'agenda' && vista.nivel === 'dia' && <FranjaEnEspera cosas={enEspera} />}

        <div className={`lienzo__cuerpo${conLista ? ' lienzo__cuerpo--lista' : ''}`} aria-busy={cambiando || undefined}>
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
          {dia && dia.compromisos.length === 0 && (
            <div className="vacio">
              <h2>{dia.esHoy ? 'Hoy no tienes compromisos' : `El ${dia.fecha} no tienes compromisos`}</h2>
              <p>Para crear el primero, pídeselo al asistente con tus palabras, por ejemplo «Agéndame una reunión mañana a las 10».</p>
              <button type="button" className="boton" onClick={abrirCaptura}>
                Pedírselo al asistente
              </button>
              {!dia.esHoy && (
                <button type="button" className="boton boton--secundario vacio__volver" onClick={() => irA({ nivel: 'dia', fecha: null })}>
                  Volver a hoy
                </button>
              )}
            </div>
          )}
          {dia && dia.compromisos.length > 0 && (
            <section className="agenda-dia" aria-labelledby="titulo-dia">
              <header className="agenda-dia__cabecera">
                <div>
                  <h2 id="titulo-dia">{dia.fecha}</h2>
                  {/* REQ-CUN01-10: en qué zona están las horas */}
                  <p className="agenda-dia__zona">{dia.zona}</p>
                </div>
                {/* REQ-CUN01-15: un día elegido en el mes se ve como Hoy, con la vuelta a hoy */}
                {!dia.esHoy && (
                  <button type="button" className="boton boton--secundario" onClick={() => irA({ nivel: 'dia', fecha: null })}>
                    Volver a hoy
                  </button>
                )}
              </header>
              <ListaCompromisos compromisos={dia.compromisos} nombre={dia.esHoy ? 'Compromisos de hoy' : `Compromisos del ${dia.fecha}`} />
            </section>
          )}
          {lista?.nivel === 'semana' && <AgendaSemana agenda={lista} irA={irA} />}
          {lista?.nivel === 'mes' && <AgendaMes agenda={lista} irA={irA} />}
          {/* REQ-CUN03-13: debajo de los compromisos de Hoy, y nunca en Semana ni en Mes */}
          {seccion === 'agenda' && vista.nivel === 'dia' && <TareasParaEsteDia dia={tareasDelDia} />}
          {franja && <SeccionTareas key={franja} tareas={tareas} franja={franja} alPedir={abrirCaptura} />}
          {/* H-TP-13: «Encargadas» es de 03-tareas, no de las tareas personales */}
          {seccion === 'tareas' && !franja && (
            <div className="vacio">
              <h2>Nada en «{cortes[corteVisible]}»</h2>
              <p>Cuando le pidas algo al asistente, tus tareas aparecerán aquí, ordenadas por franja.</p>
            </div>
          )}
          {/* T-082 · REQ-CUN02-25: el selector de arriba elige el nivel */}
          {seccion === 'actividad' && <Actividad corte={corteVisible} alConectarCalendario={() => setAjustes(true)} />}
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
                <dd>
                  <CambioZona zonaActual={perfil.zonaHoraria} />
                </dd>
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
