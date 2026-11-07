'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { NivelActividad } from '@nexoai/contratos';
import { leerActividad, type ElementoAccion, type ElementoCompromiso, type Grupo, type VistaActividad } from './actividad-servidor';
import estilos from './actividad.module.css';
import { IconoAnterior, IconoSiguiente } from './iconos';

// T-070 · REQ-CUN02-25 a 31, 33 · specs/02-jornada/plan.md §5. La sección Actividad en el lienzo: lo que pasó.
// El selector Día · Semana · Mes lo pinta aplicacion.tsx, como en Agenda; aquí llega su índice. Abre en hoy y,
// al cambiar de nivel, vuelve a hoy (REQ-CUN02-25). Solo muestra: ningún botón cambia nada (REQ-CUN02-31).

const NIVELES: NivelActividad[] = ['dia', 'semana', 'mes'];
const NOMBRE_PASO: Record<NivelActividad, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' };
const VOLVER: Record<NivelActividad, string> = { dia: 'Volver a hoy', semana: 'Esta semana', mes: 'Este mes' };

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export function Actividad({ corte, alConectarCalendario }: { corte: number; alConectarCalendario: () => void }) {
  const nivel = NIVELES[corte] ?? 'dia';
  // La fecha elegida vale para su nivel; con otro nivel, se vuelve a hoy
  const [foco, setFoco] = useState<{ nivel: NivelActividad; fecha: string | null }>({ nivel, fecha: null });
  const fecha = foco.nivel === nivel ? foco.fecha : null;
  const [vista, setVista] = useState<VistaActividad | null>(null);
  const [cargando, enTransicion] = useTransition();
  // Solo cuenta la última lectura: una respuesta vieja no pisa a la nueva
  const ultima = useRef(0);

  useEffect(() => {
    const esta = ++ultima.current;
    enTransicion(async () => {
      const leida = await leerActividad(nivel, fecha);
      if (esta === ultima.current) setVista(leida);
    });
  }, [nivel, fecha]);

  const ir = (nueva: string | null) => setFoco({ nivel, fecha: nueva });

  if (!vista) return <p className="semana__vacio">Leyendo tu actividad…</p>;
  if (vista.estado === 'error') {
    return (
      <div className={estilos.vacioPeriodo}>
        <div className="vacio" role="alert">
          <h2>No pudimos leer tu actividad</h2>
          <p>{vista.mensaje}</p>
        </div>
      </div>
    );
  }

  const paso = NOMBRE_PASO[vista.nivel];
  const todoVacio = vista.compromisos.total === 0 && vista.registro.total === 0;
  return (
    <section className={estilos.actividad} aria-labelledby="titulo-actividad" aria-busy={cargando || undefined}>
      <header className="periodo">
        <div>
          <h2 id="titulo-actividad">{vista.titulo}</h2>
          <p className="agenda-dia__zona">{vista.zona}</p>
          {/* REQ-CUN02-28: hoy es la costura con Agenda */}
          {vista.hastaAhora && (
            <p className={estilos.hastaAhora}>{vista.nivel === 'dia' ? 'Lo ocurrido hasta ahora. Lo que queda de hoy está en Agenda.' : 'Lo ocurrido hasta ahora.'}</p>
          )}
        </div>
        <div className="periodo__pasos">
          {!vista.esActual && (
            <button type="button" className="boton boton--secundario" onClick={() => ir(null)}>
              {VOLVER[vista.nivel]}
            </button>
          )}
          <button type="button" className="periodo__paso" aria-label={`${paso} anterior`} title={`${paso} anterior`} onClick={() => ir(vista.anterior)}>
            <IconoAnterior />
          </button>
          {/* H-JOR-08: lo que va a pasar está en Agenda */}
          <button
            type="button"
            className="periodo__paso"
            aria-label={`${paso} siguiente`}
            title={vista.siguiente ? `${paso} siguiente` : 'Lo que viene está en Agenda'}
            disabled={!vista.siguiente}
            onClick={() => vista.siguiente && ir(vista.siguiente)}
          >
            <IconoSiguiente />
          </button>
        </div>
      </header>

      {todoVacio ? (
        // REQ-CUN02-30: un vacío que nombra el período, sin ofrecer crear nada
        <div className={estilos.vacioPeriodo}>
          <div className="vacio">
            <h2>{vista.esActual ? `${mayuscula(vista.periodo)} todavía no ha pasado nada` : `${mayuscula(vista.periodo)} no pasó nada`}</h2>
            <p>Aquí verás los compromisos que vayan terminando y lo que el asistente haga por ti.</p>
            {vista.calendario !== 'conectado' && <SinCalendario estado={vista.calendario} alConectar={alConectarCalendario} />}
          </div>
        </div>
      ) : (
        <>
          <Bloque id="actividad-compromisos" titulo="Compromisos" total={vista.compromisos.total}>
            {vista.calendario !== 'conectado' ? (
              <SinCalendario estado={vista.calendario} alConectar={alConectarCalendario} />
            ) : vista.compromisos.total === 0 ? (
              <p className={estilos.vacioBloque}>Ningún compromiso terminó {vista.periodo}.</p>
            ) : (
              <Grupos nivel={vista.nivel} grupos={vista.compromisos.grupos} nombre="Compromisos" pintar={(c) => <Compromiso key={c.id} compromiso={c} />} />
            )}
          </Bloque>
          <Bloque id="actividad-asistente" titulo="Lo que hizo el asistente" total={vista.registro.total}>
            {vista.registro.total === 0 ? (
              <p className={estilos.vacioBloque}>El asistente no hizo nada por ti {vista.periodo}.</p>
            ) : (
              <Grupos nivel={vista.nivel} grupos={vista.registro.grupos} nombre="Lo que hizo el asistente" pintar={(a) => <Accion key={a.id} accion={a} />} />
            )}
          </Bloque>
        </>
      )}
    </section>
  );
}

function Bloque({ id, titulo, total, children }: { id: string; titulo: string; total: number; children: React.ReactNode }) {
  return (
    <section className={estilos.bloque} aria-labelledby={id}>
      <h3 id={id}>
        {titulo}
        <span className="etiqueta" aria-label={total === 1 ? '1 elemento' : `${total} elementos`}>
          {total}
        </span>
      </h3>
      {children}
    </section>
  );
}

// REQ-CUN02-33: en Día, la lista; en Semana y Mes, un recuadro por día con algo
function Grupos<T>({ nivel, grupos, nombre, pintar }: { nivel: NivelActividad; grupos: Grupo<T>[]; nombre: string; pintar: (e: T) => React.ReactNode }) {
  if (nivel === 'dia') {
    return (
      <ol className={estilos.lista} aria-label={nombre}>
        {grupos.flatMap((g) => g.elementos.map(pintar))}
      </ol>
    );
  }
  return (
    <div className={estilos.bloque}>
      {grupos.map((g) => (
        <section key={g.fecha} className={estilos.dia} aria-label={`${nombre}, ${g.nombre.toLowerCase()}`}>
          <h4>{g.nombre}</h4>
          <ol className={estilos.lista}>{g.elementos.map(pintar)}</ol>
        </section>
      ))}
    </div>
  );
}

function Compromiso({ compromiso: c }: { compromiso: ElementoCompromiso }) {
  return (
    <li className="compromiso">
      <p className="compromiso__horario">{c.horario}</p>
      <div>
        <p className="compromiso__titulo">{c.titulo}</p>
        {c.duracion && <p className={estilos.duracion}>{c.duracion}</p>}
        {c.enSuZona && <p className="compromiso__zona">{c.enSuZona}</p>}
      </div>
    </li>
  );
}

function Accion({ accion: a }: { accion: ElementoAccion }) {
  return (
    <li className="compromiso">
      <p className={estilos.horaAgente}>{a.hora}</p>
      <div>
        <p className="compromiso__titulo">{a.descripcion}</p>
        {a.datos.length > 0 && (
          <dl className={estilos.datos}>
            {a.datos.map((d) => (
              <div key={d.etiqueta} className={estilos.par}>
                <dt>{d.etiqueta}</dt>
                <dd>{d.valor}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className={estilos.desde}>{a.desde}</p>
      </div>
    </li>
  );
}

// REQ-CUN02-29 · H-JOR-10: en el lugar de los compromisos, sin presentarlo como error
function SinCalendario({ estado, alConectar }: { estado: 'sin_conectar' | 'no_disponible'; alConectar: () => void }) {
  if (estado === 'no_disponible') {
    return (
      <div className={estilos.sinCalendario}>
        <p>Ahora mismo no pudimos leer tu calendario. Inténtalo de nuevo en un momento.</p>
      </div>
    );
  }
  return (
    <div className={estilos.sinCalendario}>
      <p>Tus compromisos aparecen aquí cuando conectes tu calendario.</p>
      <button type="button" className="boton boton--secundario" onClick={alConectar}>
        Conectar mi calendario
      </button>
    </div>
  );
}
