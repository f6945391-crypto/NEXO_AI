'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { FranjaTarea, OperacionRespuesta, TareaPersonal, TareasDelDia } from '@nexoai/contratos';
import type { Tareas } from '../../lib/tareas';
import { confirmarDescartarTarea, descartarOperacion, mantenerAbierta, marcarHecha, proponerDescartarTarea, reabrirTarea } from '../acciones';
import { ResumenDeBitacora } from './resumen-bitacora';

// T-052, T-053 · specs/09-tareas-personales/plan.md §8.1 · REQ-CUN03-06 a 11, 13 · R-38, R-40, R-42. La sección
// Tareas del lienzo y el grupo «Tareas para este día» de Hoy. Los textos de fecha y espera los arma la API.
// «Hecho» y «Recibido» no llevan tarjeta y se deshacen unos segundos (H-TP-07); descartar sí la lleva.
// Crear y cambiar no tienen formulario: se le piden al asistente (H-TP-08).

export const FRANJAS: FranjaTarea[] = ['con_fecha', 'sin_fecha', 'esperando'];

// Cuánto se ofrece «Deshacer» tras «Hecho»
const DESHACER_MS = 6_000;

// REQ-CUN03-08: qué va en cada franja y cómo pedírselo al asistente
const VACIO: Record<FranjaTarea, { titulo: string; texto: string }> = {
  con_fecha: {
    titulo: 'Nada con fecha',
    texto: 'Aquí aparece lo que tienes que hacer para un día. Pídeselo al asistente con tus palabras, por ejemplo «Recuérdame pagar el recibo antes del sábado».',
  },
  sin_fecha: {
    titulo: 'Nada sin fecha',
    texto: 'Aquí aparece lo que tienes que hacer sin un día fijo. Pídeselo al asistente, por ejemplo «Tengo que llamar al dentista».',
  },
  esperando: {
    titulo: 'No esperas nada de nadie',
    texto: 'Aquí aparece lo que esperas de otra persona, sin que nadie le escriba. Díselo al asistente, por ejemplo «Juan tiene que enviarme el presupuesto el lunes».',
  },
};

const nombreHecho = (t: TareaPersonal) => (t.deQuien ? 'Recibido' : 'Hecho');
const quedo = (t: TareaPersonal) => (t.deQuien ? `«${t.texto}» quedó como recibido.` : `«${t.texto}» quedó hecha.`);

// «Hecho» con «Deshacer» unos segundos, en la lista y en Hoy
function useHecho() {
  const [hecha, setHecha] = useState<TareaPersonal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, enTransicion] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (temporizador.current && clearTimeout(temporizador.current)), []);

  function hecho(tarea: TareaPersonal) {
    setError(null);
    enTransicion(async () => {
      const r = await marcarHecha(tarea.id);
      if (!r.tarea) return setError(r.error ?? 'No se pudo cambiar la tarea.');
      setHecha(tarea);
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setHecha(null), DESHACER_MS);
    });
  }

  function deshacer() {
    if (!hecha) return;
    const tarea = hecha;
    setHecha(null);
    enTransicion(async () => {
      const r = await reabrirTarea(tarea.id);
      if (!r.tarea) setError(r.error ?? 'No se pudo deshacer.');
    });
  }

  function reabrir(tarea: TareaPersonal) {
    setError(null);
    enTransicion(async () => {
      const r = await reabrirTarea(tarea.id);
      if (!r.tarea) setError(r.error ?? 'No se pudo reabrir la tarea.');
    });
  }

  const aviso = (
    <>
      {hecha && (
        <div className="aviso aviso--exito tareas__deshacer" role="status">
          <span>{quedo(hecha)}</span>
          <button type="button" className="boton-texto" onClick={deshacer}>
            Deshacer
          </button>
        </div>
      )}
      {error && (
        <p className="turno__fallo" role="alert">
          {error}
        </p>
      )}
    </>
  );
  return { hecho, reabrir, ocupado, aviso, conAviso: hecha !== null || error !== null };
}

function Detalle({ tarea }: { tarea: TareaPersonal }) {
  return (
    <>
      {tarea.espera && <p className="tarea__detalle">{tarea.espera}</p>}
      {tarea.cuando && (
        <p className={`tarea__detalle${tarea.vencida ? ' tarea__detalle--vencida' : ''}`}>
          {tarea.cuando}
          {tarea.vencida && <span className="etiqueta etiqueta--vencida">Vencida</span>}
        </p>
      )}
    </>
  );
}

// T-127 · REQ-CUN03-24, 26 · plan §13.6. Bajo el texto, con quién o para qué es; debajo, el último avance de
// la bitácora y «Ver bitácora (N)», que la despliega entera en la misma tarea, del más reciente al más antiguo.
// La fecha de cada avance la arma la API («Martes 24 de noviembre, 18:40»); en la línea del último basta el día.
// REQ-CUN03-24: «Martes 24», como el móvil (R-41): el día de la semana y el número, sin mes ni hora
const soloElDia = (cuando: string) => cuando.split(' de ')[0]!.replace(/, \d{1,2}:\d{2}$/, '');

function Bitacora({ tarea }: { tarea: TareaPersonal }) {
  const [abierta, setAbierta] = useState(false);
  const idLista = `bitacora-${tarea.id}`;
  const ultimo = tarea.bitacora[0];
  // Una tarea sin avances no muestra nada de bitácora (REQ-CUN03-24)
  if (!ultimo) return null;
  return (
    <div className="tarea__bitacora">
      {/* T-130 · REQ-CUN03-28: el resumen del asistente, sobre el último avance y «Ver bitácora» */}
      <ResumenDeBitacora tarea={tarea.texto} resumen={tarea.resumen} />
      {!abierta && (
        <p className="tarea__avance">
          <span className="tarea__avance-cuando">{soloElDia(ultimo.cuando)}</span> · {ultimo.texto}
        </p>
      )}
      {abierta && (
        <ol id={idLista} className="bitacora" aria-label={`Bitácora de ${tarea.texto}`}>
          {tarea.bitacora.map((a) => (
            <li key={a.id} className="bitacora__avance">
              <span className="bitacora__cuando">{a.cuando}</span>
              <span>{a.texto}</span>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        className="tarea__ver-bitacora"
        aria-expanded={abierta}
        aria-controls={abierta ? idLista : undefined}
        aria-label={abierta ? `Ocultar bitácora de ${tarea.texto}` : `Ver bitácora (${tarea.bitacora.length}) de ${tarea.texto}`}
        onClick={() => setAbierta((v) => !v)}
      >
        {abierta ? 'Ocultar bitácora' : `Ver bitácora (${tarea.bitacora.length})`}
      </button>
    </div>
  );
}

// T-127 · REQ-CUN03-27 · H-TP-30, 31: sobre una tarea vencida de «Con fecha», la persona decide. «Darla por
// hecha» es el «Hecho» de la lista, con «Deshacer»; «Mantener abierta» no lleva tarjeta y quita el aviso para
// esa fecha. El texto de la fecha lo arma la API («Vencía el sábado 22 de noviembre»)
const vencioEl = (tarea: TareaPersonal) => (tarea.cuando ? `${tarea.cuando.replace(/^Vencía/, 'Venció')}.` : 'Esta tarea venció.');

function AvisoVencida({ tarea, ocupado, alDarlaPorHecha }: { tarea: TareaPersonal; ocupado: boolean; alDarlaPorHecha: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [manteniendo, enTransicion] = useTransition();
  return (
    <section className="aviso aviso--advertencia tarea__aviso" aria-label={`Aviso: ${tarea.texto} venció`}>
      <p className="tarea__aviso-texto">
        {vencioEl(tarea)} ¿La das por hecha o la mantienes abierta?
      </p>
      <div className="tarea__aviso-acciones">
        <button type="button" className="boton boton--secundario" disabled={ocupado || manteniendo} onClick={alDarlaPorHecha} aria-label={`Darla por hecha: ${tarea.texto}`}>
          Darla por hecha
        </button>
        <button
          type="button"
          className="boton boton--secundario"
          disabled={ocupado || manteniendo}
          aria-label={`Mantener abierta: ${tarea.texto}`}
          onClick={() =>
            enTransicion(async () => {
              setError(null);
              const r = await mantenerAbierta(tarea.id);
              if (!r.tarea) setError(r.error ?? 'No se pudo mantener abierta la tarea.');
            })
          }
        >
          Mantener abierta
        </button>
      </div>
      {error && (
        <p className="turno__fallo" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

// REQ-CUN03-11 · H-TP-07: descartar siempre con su tarjeta, armada por la API
function TarjetaDescartar({ operacion, alCerrar }: { operacion: OperacionRespuesta; alCerrar: () => void }) {
  const [ocupado, enTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const vista = operacion.vistaConfirmacion;
  return (
    <div className="capa" role="dialog" aria-modal="true" aria-labelledby="titulo-descartar">
      <article className="capa__panel tarjeta" aria-label="Para confirmar">
        <h3 id="titulo-descartar" className="tarjeta__accion">
          {vista.accion}
        </h3>
        <dl className="tarjeta__datos">
          {vista.datos.map((dato) => (
            <div key={dato.etiqueta}>
              <dt>{dato.etiqueta}</dt>
              <dd>{dato.valor}</dd>
            </div>
          ))}
        </dl>
        {vista.irreversible && <p className="tarjeta__irreversible">{vista.irreversible}</p>}
        {error && (
          <p className="turno__fallo" role="alert">
            {error}
          </p>
        )}
        <div className="tarjeta__acciones">
          <button
            type="button"
            className="boton"
            disabled={ocupado}
            onClick={() =>
              enTransicion(async () => {
                const r = await confirmarDescartarTarea(operacion.id);
                if (r.error) return setError(r.error);
                alCerrar();
              })
            }
          >
            Confirmar
          </button>
          <button
            type="button"
            className="boton boton--secundario"
            disabled={ocupado}
            onClick={() =>
              enTransicion(async () => {
                await descartarOperacion(operacion.id);
                alCerrar();
              })
            }
          >
            No descartar
          </button>
        </div>
      </article>
    </div>
  );
}

// La franja elegida está vacía del todo: sin pendientes ni hechas recientes. El lienzo la centra
export function franjaVacia(tareas: Tareas, franja: FranjaTarea): boolean {
  return tareas.estado === 'lista' && !tareas.pendientes.some((t) => t.franja === franja) && !tareas.hechasRecientes.some((t) => t.franja === franja);
}

export function SeccionTareas({ tareas, franja, alPedir }: { tareas: Tareas; franja: FranjaTarea; alPedir: () => void }) {
  const { hecho, reabrir, ocupado, aviso } = useHecho();
  const [verHechas, setVerHechas] = useState(false);
  const [tarjeta, setTarjeta] = useState<OperacionRespuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proponiendo, enTransicion] = useTransition();

  if (tareas.estado === 'error') {
    return (
      <div className="vacio" role="alert">
        <h2>No pudimos leer tus tareas</h2>
        <p>{tareas.mensaje}</p>
      </div>
    );
  }

  const pendientes = tareas.pendientes.filter((t) => t.franja === franja);
  const hechas = tareas.hechasRecientes.filter((t) => t.franja === franja);
  const vacio = VACIO[franja];

  function descartar(tarea: TareaPersonal) {
    setError(null);
    enTransicion(async () => {
      const r = await proponerDescartarTarea(tarea.id);
      if (!r.propuesta) return setError(r.error ?? 'No se pudo descartar.');
      setTarjeta(r.propuesta);
    });
  }

  const estadoVacio = (
    <div className="vacio">
      <h2>{vacio.titulo}</h2>
      <p>{vacio.texto}</p>
      <button type="button" className="boton" onClick={alPedir}>
        Pedírselo al asistente
      </button>
    </div>
  );

  if (pendientes.length === 0 && hechas.length === 0) return estadoVacio;

  return (
    <section className="tareas" aria-label="Tareas">
      <header className="agenda-dia__cabecera">
        <p className="agenda-dia__zona">{tareas.zona}</p>
      </header>
      {aviso}
      {error && (
        <p className="turno__fallo" role="alert">
          {error}
        </p>
      )}
      {pendientes.length === 0 ? (
        <div className="tareas__vacio">{estadoVacio}</div>
      ) : (
        <ol className="tareas__lista" aria-label="Pendientes">
          {pendientes.map((t) => (
            <li key={t.id} className={`tarea${t.vencida ? ' tarea--vencida' : ''}`}>
              {t.avisoVencida && <AvisoVencida tarea={t} ocupado={ocupado} alDarlaPorHecha={() => hecho(t)} />}
              <div className="tarea__cuerpo">
                <p className="tarea__texto">{t.texto}</p>
                {t.contexto && <p className="tarea__contexto">{t.contexto}</p>}
                <Detalle tarea={t} />
                <Bitacora tarea={t} />
              </div>
              <div className="tarea__acciones">
                <button type="button" className="boton boton--secundario tarea__hecho" disabled={ocupado} onClick={() => hecho(t)} aria-label={`${nombreHecho(t)}: ${t.texto}`}>
                  {nombreHecho(t)}
                </button>
                <button type="button" className="boton-texto" disabled={proponiendo} onClick={() => descartar(t)} aria-label={`Descartar: ${t.texto}`}>
                  Descartar
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {hechas.length > 0 && (
        <section className="tareas__hechas" aria-label="Hechas en los últimos 7 días">
          <button type="button" className="tareas__ver-hechas" aria-expanded={verHechas} onClick={() => setVerHechas((v) => !v)}>
            {verHechas ? 'Ocultar hechas' : `Ver hechas (7 días) · ${hechas.length}`}
          </button>
          {verHechas && (
            <ol className="tareas__lista">
              {hechas.map((t) => (
                <li key={t.id} className="tarea tarea--hecha">
                  <div className="tarea__cuerpo">
                    <p className="tarea__texto">{t.texto}</p>
                    {t.cierre && <p className="tarea__detalle">{t.cierre}</p>}
                    {t.contexto && <p className="tarea__contexto">{t.contexto}</p>}
                    <Bitacora tarea={t} />
                  </div>
                  <div className="tarea__acciones">
                    <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => reabrir(t)} aria-label={`Reabrir: ${t.texto}`}>
                      Reabrir
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      {tarjeta && <TarjetaDescartar operacion={tarjeta} alCerrar={() => setTarjeta(null)} />}
    </section>
  );
}

// REQ-CUN03-13 · H-TP-09: debajo de los compromisos de Hoy, fuera de la línea de horas. Con su hora límite y
// «Hecho»; las vencidas, marcadas, solo cuando el día mostrado es hoy (eso lo decide la API)
export function TareasParaEsteDia({ dia }: { dia: TareasDelDia | null }) {
  const { hecho, ocupado, aviso, conAviso } = useHecho();
  // Sin tareas ese día no hay grupo; tras «Hecho» de la última, sigue a la vista para poder deshacerlo
  if (!dia || (dia.tareas.length === 0 && !conAviso)) return null;
  return (
    <section className="tareas-del-dia" aria-labelledby="titulo-tareas-del-dia">
      <h3 id="titulo-tareas-del-dia" className="tareas-del-dia__titulo">
        Tareas para este día
      </h3>
      {aviso}
      <ol className="tareas__lista" aria-label="Tareas para este día">
        {dia.tareas.map((t) => (
          <li key={t.id} className={`tarea${t.vencida ? ' tarea--vencida' : ''}`}>
            <div className="tarea__cuerpo">
              <p className="tarea__texto">{t.texto}</p>
              {t.vencida ? (
                <p className="tarea__detalle tarea__detalle--vencida">
                  {t.cuando}
                  <span className="etiqueta etiqueta--vencida">Vencida</span>
                </p>
              ) : (
                t.horaLimite && <p className="tarea__detalle">Antes de las {t.horaLimite}</p>
              )}
            </div>
            <div className="tarea__acciones">
              <button type="button" className="boton boton--secundario tarea__hecho" disabled={ocupado} onClick={() => hecho(t)} aria-label={`Hecho: ${t.texto}`}>
                Hecho
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
