'use client';

import type { AgendaLista, CompromisoDelDia, VistaAgenda } from '../../lib/agenda';
import { IconoAnterior, IconoSiguiente } from './iconos';

// T-044 · REQ-CUN01-14, REQ-CUN01-15 · design/ARQUITECTURA-VISUAL-MOVIL.md §3 ter. Agenda contesta «qué»:
// la semana enseña los bloques de cada día y el mes, la forma del mes con un punto por cada dos compromisos.

const INICIALES = [
  ['L', 'lunes'],
  ['M', 'martes'],
  ['X', 'miércoles'],
  ['J', 'jueves'],
  ['V', 'viernes'],
  ['S', 'sábado'],
  ['D', 'domingo'],
] as const;

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export function ListaCompromisos({ compromisos, nombre }: { compromisos: CompromisoDelDia[]; nombre: string }) {
  return (
    <ol className="agenda-dia__lista" aria-label={nombre}>
      {compromisos.map((c) => (
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
  );
}

function Periodo({
  titulo,
  zona,
  nombre,
  esActual,
  alAnterior,
  alSiguiente,
  alActual,
}: {
  titulo: string;
  zona: string;
  nombre: 'Semana' | 'Mes';
  esActual: boolean;
  alAnterior: () => void;
  alSiguiente: () => void;
  alActual: () => void;
}) {
  const actual = nombre === 'Semana' ? 'Esta semana' : 'Este mes';
  return (
    <header className="periodo">
      <div>
        <h2 id="titulo-periodo">{titulo}</h2>
        <p className="agenda-dia__zona">{zona}</p>
      </div>
      <div className="periodo__pasos">
        {!esActual && (
          <button type="button" className="boton boton--secundario" onClick={alActual}>
            {actual}
          </button>
        )}
        <button type="button" className="periodo__paso" aria-label={`${nombre} anterior`} title={`${nombre} anterior`} onClick={alAnterior}>
          <IconoAnterior />
        </button>
        <button type="button" className="periodo__paso" aria-label={`${nombre} siguiente`} title={`${nombre} siguiente`} onClick={alSiguiente}>
          <IconoSiguiente />
        </button>
      </div>
    </header>
  );
}

export function AgendaSemana({ agenda, irA }: { agenda: Extract<AgendaLista, { nivel: 'semana' }>; irA: (vista: VistaAgenda) => void }) {
  return (
    <section className="semana" aria-labelledby="titulo-periodo">
      <Periodo
        titulo={agenda.titulo}
        zona={agenda.zona}
        nombre="Semana"
        esActual={agenda.esActual}
        alAnterior={() => irA({ nivel: 'semana', fecha: agenda.anterior })}
        alSiguiente={() => irA({ nivel: 'semana', fecha: agenda.siguiente })}
        alActual={() => irA({ nivel: 'semana', fecha: null })}
      />
      <ol className="semana__dias">
        {agenda.dias.map((dia) => (
          <li key={dia.fecha} className={`semana__dia${dia.esHoy ? ' semana__dia--hoy' : ''}`} aria-current={dia.esHoy ? 'date' : undefined}>
            <h3 className="semana__nombre">
              {mayuscula(dia.nombre)}
              {dia.esHoy && <span className="etiqueta">Hoy</span>}
            </h3>
            {dia.compromisos.length === 0 ? (
              <p className="semana__vacio">Sin compromisos</p>
            ) : (
              <ListaCompromisos compromisos={dia.compromisos} nombre={`Compromisos del ${dia.nombre}`} />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AgendaMes({ agenda, irA }: { agenda: Extract<AgendaLista, { nivel: 'mes' }>; irA: (vista: VistaAgenda) => void }) {
  return (
    <section className="mes" aria-labelledby="titulo-periodo">
      <Periodo
        titulo={agenda.titulo}
        zona={agenda.zona}
        nombre="Mes"
        esActual={agenda.esActual}
        alAnterior={() => irA({ nivel: 'mes', fecha: agenda.anterior })}
        alSiguiente={() => irA({ nivel: 'mes', fecha: agenda.siguiente })}
        alActual={() => irA({ nivel: 'mes', fecha: null })}
      />
      <table className="mes__rejilla" aria-label={agenda.titulo}>
        <thead>
          <tr>
            {INICIALES.map(([inicial, nombre]) => (
              <th key={nombre} scope="col">
                <abbr title={nombre}>{inicial}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agenda.semanas.map((semana) => (
            <tr key={semana[0]!.fecha}>
              {semana.map((dia) => (
                <td key={dia.fecha}>
                  <button
                    type="button"
                    className={`mes__dia${dia.delMes ? '' : ' mes__dia--fuera'}${dia.esHoy ? ' mes__dia--hoy' : ''}`}
                    aria-label={mayuscula(dia.etiqueta)}
                    aria-current={dia.esHoy ? 'date' : undefined}
                    onClick={() => irA({ nivel: 'dia', fecha: dia.fecha })}
                  >
                    <span className="mes__numero">{dia.numero}</span>
                    <span className="mes__puntos" aria-hidden="true">
                      {Array.from({ length: dia.puntos }, (_, i) => (
                        <span key={i} className="mes__punto" />
                      ))}
                    </span>
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
