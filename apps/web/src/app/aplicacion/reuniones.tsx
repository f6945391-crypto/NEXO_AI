'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { DetalleReunion, InvitadoReunion, MapaReunion, OperacionRespuesta, ReunionResumen } from '@nexoai/contratos';
import { confirmarOperacionReunion, obtenerDetalleReunion, obtenerReuniones, proponerCancelarReunion, proponerConvocar } from '../acciones-reuniones';
import { descartarOperacion } from '../acciones';
import { AutorizacionesEquipo } from './autorizaciones-equipo';

// T-134 · specs/10-reuniones, REQ-CUN06-07 a 10, 15, 19 y 20 · bocetos 01 y 02 de Franco
// (design/bocetos/2026-11-25-reuniones/). El corte «Reuniones» de Agenda (D-REU-07): la lista con el estado de
// cada reunión por color y, al tocar una, su detalle. El formulario y la rejilla de CUN-05 salieron de la pantalla
// (D-REU-09). Crear una reunión lo hace el asistente (R-42); aquí solo se elige, se confirma y se cancela, como
// controles sobre algo que ya existe (DP-01). Las tarjetas las escribe la API; aquí solo se pintan.

const DURACIONES = [30, 45, 60, 90, 120];
// D-REU-20: desde 8 personas, la lista de invitados lleva buscador
const CON_BUSCADOR = 8;

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const formato = (zona: string, opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es', { timeZone: zona, ...opciones });
const hora = (iso: string, zona: string) => formato(zona, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const diaSemana = (iso: string, zona: string) => mayuscula(formato(zona, { weekday: 'long' }).format(new Date(iso)));
const numeroDia = (iso: string, zona: string) => formato(zona, { day: 'numeric' }).format(new Date(iso));
// «Jueves 26, 14:00», como en el boceto 01
export const cuandoCorto = (iso: string, zona: string) => `${diaSemana(iso, zona)} ${numeroDia(iso, zona)}, ${hora(iso, zona)}`;
const sumarMinutos = (iso: string, minutos: number) => new Date(Date.parse(iso) + minutos * 60_000).toISOString();
// Las fechas del mapa son días AAAA-MM-DD sin hora: se nombran a mediodía en UTC para que no cambien de día
const nombreFecha = (fecha: string) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  return { semana: mayuscula(formato('UTC', { weekday: 'short' }).format(d).replace('.', '')), numero: formato('UTC', { day: 'numeric' }).format(d) };
};

const enLista = (nombres: string[]) => (nombres.length < 2 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`);

// REQ-CUN06-07: el estado por color. Ámbar, pendiente; verde con ✓, agendada; gris, vencida
function textoEstado(r: ReunionResumen, zona: string): string {
  switch (r.estado) {
    case 'pendiente':
      return 'Elegir horario';
    case 'agendada': {
      const cuando = r.inicio ? cuandoCorto(r.inicio, zona) : '';
      return r.soyConvocante ? cuando : `Convocada por ${r.convocante.nombre} · ${cuando}`;
    }
    case 'vencida':
      return 'Venció sin horario';
    case 'cancelada':
      return 'Cancelada';
  }
}

function Pildora({ reunion, zona }: { reunion: ReunionResumen; zona: string }) {
  return (
    <span className={`pildora pildora--${reunion.estado}`}>
      {reunion.estado === 'agendada' && <span aria-hidden="true">✓ </span>}
      {textoEstado(reunion, zona)}
    </span>
  );
}

// La tarjeta de confirmación, con las mismas clases que la de la conversación para que se lea igual
function TarjetaConfirmacion({
  operacion,
  ocupado,
  textoConfirmar,
  alConfirmar,
  alDescartar,
}: {
  operacion: OperacionRespuesta;
  ocupado: boolean;
  textoConfirmar: string;
  alConfirmar: () => void;
  alDescartar: () => void;
}) {
  const vista = operacion.vistaConfirmacion;
  const lugar = useRef<HTMLElement>(null);
  // La tarjeta aparece donde estaba el botón: se trae a la vista entera
  useEffect(() => {
    lugar.current?.scrollIntoView?.({ block: 'nearest' });
  }, [operacion.id]);
  return (
    <article ref={lugar} className="tarjeta reuniones__tarjeta" aria-label="Para confirmar">
      <h3 className="tarjeta__accion">{vista.accion}</h3>
      <dl className="tarjeta__datos">
        {vista.datos.map((dato) => (
          <div key={dato.etiqueta}>
            <dt>{dato.etiqueta}</dt>
            <dd>{dato.valor}</dd>
          </div>
        ))}
      </dl>
      {vista.irreversible && <p className="tarjeta__irreversible">{vista.irreversible}</p>}
      {!vista.confirmable && vista.motivoNoConfirmable && (
        <p className="tarjeta__motivo" role="alert">
          {vista.motivoNoConfirmable}
        </p>
      )}
      <div className="tarjeta__acciones">
        {vista.confirmable && (
          <button type="button" className="boton" disabled={ocupado} onClick={alConfirmar}>
            {textoConfirmar}
          </button>
        )}
        <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={alDescartar}>
          Descartar
        </button>
      </div>
    </article>
  );
}

// ─── Lista (boceto 01) ──────────────────────────────────────────────────────────────────────────────────────

function Lista({
  reuniones,
  zona,
  aviso,
  alAbrir,
  alPedir,
}: {
  reuniones: ReunionResumen[];
  zona: string;
  aviso: string | null;
  alAbrir: (id: string) => void;
  alPedir: (texto: string) => void;
}) {
  return (
    <section className="reuniones" aria-labelledby="titulo-reuniones">
      <h2 id="titulo-reuniones" className="reuniones__titulo">
        Tus reuniones
      </h2>
      {aviso && (
        <p className="cambio-zona__aviso reuniones__aviso" role="status">
          {aviso}
        </p>
      )}
      {reuniones.length === 0 ? (
        <div className="vacio reuniones__vacio">
          <h2>Todavía no hay reuniones</h2>
          <p>Pídele al asistente que busque un horario con tu equipo.</p>
          <button type="button" className="ejemplo reuniones__ejemplo" onClick={() => alPedir('Busca un horario con mi equipo esta semana')}>
            Busca un horario con mi equipo esta semana
          </button>
        </div>
      ) : (
        <ul className="reuniones__lista" aria-label="Reuniones">
          {reuniones.map((r) => (
            <li key={r.id}>
              <button type="button" className={`reunion-ficha reunion-ficha--${r.estado}`} onClick={() => alAbrir(r.id)} aria-label={`${r.titulo}: ${textoEstado(r, zona)}`}>
                <span className="reunion-ficha__cuerpo">
                  <span className="reunion-ficha__titulo">{r.titulo}</span>
                  <span className="reunion-ficha__detalle">
                    {r.equipo.nombre} · {r.invitados} {r.invitados === 1 ? 'invitado' : 'invitados'}
                  </span>
                  <Pildora reunion={r} zona={zona} />
                </span>
                <span className="reunion-ficha__accion">
                  {r.estado === 'pendiente' && r.soyConvocante && <span className="reunion-ficha__llamada">Configurar horario</span>}
                  <span className="reunion-ficha__chevron" aria-hidden="true">
                    ›
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Mapa de calor (boceto 02, REQ-CUN06-08) ────────────────────────────────────────────────────────────────

type Celda = { inicio: string; libres: string[] };

function Mapa({
  mapa,
  nombres,
  zona,
  duracion,
  sugerido,
  elegido,
  alElegir,
}: {
  mapa: MapaReunion;
  nombres: Map<string, string>;
  zona: string;
  duracion: number;
  sugerido: string | null;
  elegido: string | null;
  alElegir: (inicio: string) => void;
}) {
  const [sobre, setSobre] = useState<string | null>(null);
  const n = mapa.personasConDatos.length;
  // Las filas son las medias horas en la zona de quien mira (P-05), comunes a todos los días
  const filas = useMemo(() => {
    const horas = new Set<string>();
    for (const d of mapa.dias) for (const f of d.franjas) horas.add(hora(f.inicio, zona));
    return [...horas].sort();
  }, [mapa, zona]);
  const celdas = useMemo(() => new Map(mapa.dias.map((d) => [d.fecha, new Map(d.franjas.map((f) => [hora(f.inicio, zona), f as Celda]))])), [mapa, zona]);

  // D-REU-20: el detalle nombra la lista más corta, los libres o los ocupados
  function quien(celda: Celda): string {
    const libres = celda.libres.map((id) => nombres.get(id) ?? '—');
    const ocupados = mapa.personasConDatos.filter((id) => !celda.libres.includes(id)).map((id) => nombres.get(id) ?? '—');
    if (libres.length === 0) return 'Nadie libre';
    if (ocupados.length > 0 && ocupados.length < libres.length) return `Libres ${libres.length} de ${n} · Ocupados: ${enLista(ocupados)}`;
    return `Libres: ${enLista(libres)}`;
  }

  return (
    <div className="mapa">
      <div className="mapa__leyenda">
        <span>0/{n} libres</span>
        <span className="mapa__escala" aria-hidden="true" />
        <span>
          {n}/{n} libres
        </span>
      </div>
      <p className="ayuda">Pasa el cursor sobre una media hora para ver quién está libre. Tócala para elegir ese inicio.</p>
      <div className="mapa__rejilla" role="grid" aria-label="Disponibilidad por media hora" style={{ gridTemplateColumns: `56px repeat(${mapa.dias.length}, minmax(0, 1fr))` }}>
        <div role="row" className="mapa__fila mapa__fila--cabecera">
          <span role="columnheader" className="mapa__esquina" />
          {mapa.dias.map((d) => {
            const { semana, numero } = nombreFecha(d.fecha);
            return (
              <span key={d.fecha} role="columnheader" className="mapa__dia">
                {semana}
                <strong>{numero}</strong>
              </span>
            );
          })}
        </div>
        {filas.map((fila) => (
          <div role="row" key={fila} className="mapa__fila">
            <span role="rowheader" className={`mapa__hora${fila.endsWith(':00') ? '' : ' mapa__hora--media'}`}>
              {fila}
            </span>
            {mapa.dias.map((d) => {
              const celda = celdas.get(d.fecha)?.get(fila);
              if (!celda) return <span key={d.fecha} role="gridcell" className="mapa__celda mapa__celda--vacia" />;
              const proporcion = n ? celda.libres.length / n : 0;
              // Curva: el verde intenso queda para cuando están libres todos o casi todos
              const intensidad = Math.round(10 + 78 * proporcion ** 1.6);
              const fuerte = intensidad >= 55;
              const id = `${d.fecha}-${fila}`;
              const esElegido = elegido === celda.inicio;
              const esSugerido = sugerido === celda.inicio;
              const franja = `${diaSemana(celda.inicio, zona)} ${numeroDia(celda.inicio, zona)} · ${hora(celda.inicio, zona)}–${hora(sumarMinutos(celda.inicio, mapa.franjaMinutos), zona)}`;
              return (
                <span key={d.fecha} role="gridcell" className="mapa__lugar" onMouseEnter={() => setSobre(id)} onMouseLeave={() => setSobre((s) => (s === id ? null : s))}>
                  <button
                    type="button"
                    className={`mapa__celda${esSugerido ? ' mapa__celda--sugerida' : ''}${esElegido ? ' mapa__celda--elegida' : ''}${fuerte ? ' mapa__celda--fuerte' : ''}`}
                    style={{ background: celda.libres.length === 0 ? undefined : `color-mix(in srgb, var(--estado-exito) ${intensidad}%, var(--superficie-base))` }}
                    aria-label={`${franja}: ${celda.libres.length} de ${n} libres${esSugerido ? ', sugerido' : ''}`}
                    aria-pressed={esElegido}
                    onFocus={() => setSobre(id)}
                    onBlur={() => setSobre((s) => (s === id ? null : s))}
                    onClick={() => alElegir(celda.inicio)}
                  >
                    {celda.libres.length}/{n}
                  </button>
                  {sobre === id && (
                    <span className="mapa__detalle" role="tooltip">
                      <strong>{franja}</strong>
                      <span>{quien(celda)}</span>
                      {duracion > mapa.franjaMinutos && <span className="mapa__detalle-nota">Al elegirla, la reunión dura {duracion} min</span>}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Invitados (REQ-CUN06-09, D-REU-19, D-REU-20) ───────────────────────────────────────────────────────────

const SIN_DATOS: Record<Exclude<InvitadoReunion['datos'], 'con_datos'>, string> = {
  sin_consentimiento: 'No autorizó',
  sin_calendario: 'Sin calendario',
};

function resumenInvitados(invitados: InvitadoReunion[], opcionales: Set<string>): string {
  const conDatos = invitados.filter((i) => i.datos === 'con_datos');
  const opc = conDatos.filter((i) => opcionales.has(i.perfilId)).length;
  const partes = [`${conDatos.length - opc} ${conDatos.length - opc === 1 ? 'obligatorio' : 'obligatorios'}`, `${opc} ${opc === 1 ? 'opcional' : 'opcionales'}`];
  const sinAutorizar = invitados.filter((i) => i.datos === 'sin_consentimiento').length;
  const sinCalendario = invitados.filter((i) => i.datos === 'sin_calendario').length;
  if (sinAutorizar) partes.push(`${sinAutorizar} sin autorizar`);
  if (sinCalendario) partes.push(`${sinCalendario} sin calendario`);
  return partes.join(' · ');
}

function Invitados({
  invitados,
  opcionales,
  editable,
  bloqueado,
  alMarcar,
}: {
  invitados: InvitadoReunion[];
  opcionales: Set<string>;
  editable: boolean;
  bloqueado: boolean;
  alMarcar: (perfilId: string, opcional: boolean) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const filtro = busqueda.trim().toLowerCase();
  const visibles = filtro ? invitados.filter((i) => i.nombre.toLowerCase().includes(filtro) || i.correo.toLowerCase().includes(filtro)) : invitados;

  return (
    <section className="invitados" aria-label="Invitados">
      <button type="button" className="invitados__resumen" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        <span>{resumenInvitados(invitados, opcionales)}</span>
        <span className="invitados__abrir">{abierto ? 'Ocultar' : 'Ver invitados'}</span>
      </button>
      {abierto && (
        <>
          {invitados.length >= CON_BUSCADOR && (
            <input type="search" className="invitados__buscar" placeholder="Buscar persona" aria-label="Buscar persona" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          )}
          <ul className="invitados__lista">
            {visibles.map((i) => {
              const opcional = opcionales.has(i.perfilId);
              const sinDatos = i.datos !== 'con_datos' ? SIN_DATOS[i.datos] : null;
              return (
                <li key={i.perfilId} className={`invitado${sinDatos ? ' invitado--sin-datos' : ''}`}>
                  <span className="invitado__punto" aria-hidden="true" />
                  <span className="invitado__nombre">
                    {i.nombre}
                    <span className="invitado__correo">{i.correo}</span>
                  </span>
                  {sinDatos && <span className="etiqueta invitado__estado">{sinDatos}</span>}
                  {editable ? (
                    <span className="marca" role="radiogroup" aria-label={`Marca de ${i.nombre}`}>
                      <label className={!opcional ? 'marca__opcion marca__opcion--activa' : 'marca__opcion'}>
                        <input type="radio" name={`marca-${i.perfilId}`} checked={!opcional} disabled={bloqueado} onChange={() => alMarcar(i.perfilId, false)} />
                        Obligatorio
                      </label>
                      <label className={opcional ? 'marca__opcion marca__opcion--activa' : 'marca__opcion'}>
                        <input type="radio" name={`marca-${i.perfilId}`} checked={opcional} disabled={bloqueado} onChange={() => alMarcar(i.perfilId, true)} />
                        Opcional
                      </label>
                    </span>
                  ) : (
                    <span className="etiqueta">{opcional ? 'Opcional' : 'Obligatorio'}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

// ─── Detalle (boceto 02) ────────────────────────────────────────────────────────────────────────────────────

type Fase = { paso: 'eligiendo' } | { paso: 'confirmando'; operacion: OperacionRespuesta; clase: 'convocar' | 'cancelar' };

function Detalle({ id, zona, alVolver }: { id: string; zona: string; alVolver: (aviso?: string) => void }) {
  const [detalle, setDetalle] = useState<DetalleReunion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duracion, setDuracion] = useState<number | null>(null);
  const [opcionales, setOpcionales] = useState<Set<string> | null>(null);
  const [elegidoManual, setElegidoManual] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>({ paso: 'eligiendo' });
  const [cargando, enCarga] = useTransition();
  const [ocupado, enOperacion] = useTransition();

  const pedir = useCallback(
    (cambios: { duracionMinutos?: number; opcionales?: string[] }) =>
      enCarga(async () => {
        const r = await obtenerDetalleReunion(id, cambios);
        if (!r.datos) return setError(r.error);
        setError(null);
        setDetalle(r.datos);
        setDuracion(r.datos.duracionMinutos);
        setOpcionales(new Set(r.datos.opcionales));
      }),
    [id],
  );

  useEffect(() => {
    pedir({});
  }, [pedir]);

  if (!detalle) {
    return (
      <section className="reunion-detalle" aria-busy={cargando || undefined}>
        <button type="button" className="boton-texto reunion-detalle__volver" onClick={() => alVolver()}>
          ‹ Volver
        </button>
        {error ? <p className="error" role="alert">{error}</p> : <p className="ayuda">Abriendo la reunión…</p>}
      </section>
    );
  }

  const { reunion, mapa, invitados, propuestas } = detalle;
  const marcados = opcionales ?? new Set(detalle.opcionales);
  const duracionActual = duracion ?? detalle.duracionMinutos;
  const sugerido = propuestas[0]?.inicio ?? null;
  const elegido = elegidoManual ?? sugerido;
  const pendiente = reunion.estado === 'pendiente' && reunion.soyConvocante;
  // Quién es quién en el mapa: quien convoca, que es quien mira, y los invitados
  const nombres = new Map<string, string>([[reunion.convocante.perfilId, 'tú'], ...invitados.map((i): [string, string] => [i.perfilId, i.nombre])]);

  function marcar(perfilId: string, opcional: boolean) {
    const nuevos = new Set(marcados);
    if (opcional) nuevos.add(perfilId);
    else nuevos.delete(perfilId);
    setOpcionales(nuevos);
    pedir({ duracionMinutos: duracionActual, opcionales: [...nuevos] });
  }

  function cambiarDuracion(minutos: number) {
    setDuracion(minutos);
    pedir({ duracionMinutos: minutos, opcionales: [...marcados] });
  }

  function confirmarHorario() {
    if (!elegido) return;
    setError(null);
    enOperacion(async () => {
      const r = await proponerConvocar(reunion.id, elegido, [...marcados]);
      if (!r.datos) return setError(r.error);
      setFase({ paso: 'confirmando', operacion: r.datos, clase: 'convocar' });
    });
  }

  function cancelarReunion() {
    setError(null);
    enOperacion(async () => {
      const r = await proponerCancelarReunion(reunion.id);
      if (!r.datos) return setError(r.error);
      setFase({ paso: 'confirmando', operacion: r.datos, clase: 'cancelar' });
    });
  }

  function confirmar(operacion: OperacionRespuesta, clase: 'convocar' | 'cancelar') {
    setError(null);
    enOperacion(async () => {
      const r = await confirmarOperacionReunion(operacion.id);
      if (!r.datos) return setError(r.error);
      // REQ-CUN06-11: si alguien se ocupó entretanto, la tarjeta vuelve sin poder confirmarse y dice por qué
      if (r.datos.estado === 'propuesta') return setFase({ paso: 'confirmando', operacion: r.datos, clase });
      alVolver(clase === 'convocar' ? `Listo: «${reunion.titulo}» quedó agendada y Google envió la invitación.` : `Listo: «${reunion.titulo}» quedó cancelada.`);
    });
  }

  function descartar(operacion: OperacionRespuesta) {
    setFase({ paso: 'eligiendo' });
    enOperacion(() => descartarOperacion(operacion.id));
    // Si caducó o alguien se ocupó, al volver se calcula de nuevo
    pedir({ duracionMinutos: duracionActual, opcionales: [...marcados] });
  }

  return (
    <section className="reunion-detalle" aria-labelledby="titulo-reunion" aria-busy={cargando || undefined}>
      <header className="reunion-detalle__cabecera">
        <button type="button" className="boton-texto reunion-detalle__volver" onClick={() => alVolver()}>
          ‹ Volver
        </button>
        <div className="reunion-detalle__titulo">
          <h2 id="titulo-reunion">{reunion.titulo}</h2>
          <Pildora reunion={reunion} zona={zona} />
        </div>
        <p className="ayuda">
          {reunion.equipo.nombre}
          {!reunion.soyConvocante && ` · Convocada por ${reunion.convocante.nombre}`}
        </p>
      </header>

      {reunion.estado === 'agendada' && reunion.inicio && reunion.fin && (
        <dl className="tarjeta__datos reunion-detalle__datos">
          <div>
            <dt>Cuándo</dt>
            <dd>
              {cuandoCorto(reunion.inicio, zona)} – {hora(reunion.fin, zona)}
            </dd>
          </div>
          <div>
            <dt>Duración</dt>
            <dd>{reunion.duracionMinutos} min</dd>
          </div>
        </dl>
      )}
      {reunion.estado === 'vencida' && <p className="ayuda">Pasaron los días en que se buscaba horario sin elegir ninguno. Pídele al asistente que busque de nuevo con otros días.</p>}

      {pendiente && fase.paso === 'eligiendo' && (
        <div className="reunion-detalle__controles">
          <label className="reunion-detalle__duracion">
            Duración
            <select value={duracionActual} disabled={cargando} onChange={(e) => cambiarDuracion(Number(e.target.value))}>
              {[...new Set([...DURACIONES, duracionActual])].sort((a, b) => a - b).map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Mientras se confirma, la tarjeta ya dice quién va y con qué marca */}
      {fase.paso === 'eligiendo' && (
        <Invitados invitados={invitados} opcionales={marcados} editable={pendiente} bloqueado={cargando} alMarcar={marcar} />
      )}

      {pendiente && fase.paso === 'eligiendo' && (
        <>
          {propuestas.length > 0 ? (
            <div className="reunion-detalle__propuestas">
              <p className="reunion-detalle__subtitulo">Horarios sugeridos</p>
              <ul className="propuestas-horario" aria-label="Horarios sugeridos">
                {propuestas.map((p) => (
                  <li key={p.inicio}>
                    <button type="button" className="boton boton--secundario propuesta-horario" aria-pressed={elegido === p.inicio} onClick={() => setElegidoManual(p.inicio)}>
                      {cuandoCorto(p.inicio, zona)}
                      <span className="propuesta-horario__libres">
                        {p.libres}/{p.de} libres
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="ayuda" role="status">
              No hay un horario en que estén libres todos los obligatorios. Marca a alguien como opcional, acorta la duración o pídele al asistente otros días.
            </p>
          )}
          {mapa && <Mapa mapa={mapa} nombres={nombres} zona={zona} duracion={duracionActual} sugerido={sugerido} elegido={elegido} alElegir={setElegidoManual} />}
          <p className="reunion-detalle__privacidad">Solo se muestran horas libres u ocupadas, sin títulos ni detalles</p>
          <div className="reunion-detalle__confirmar">
            {elegido && (
              <p className="ayuda" role="status">
                Elegido: {cuandoCorto(elegido, zona)} – {hora(sumarMinutos(elegido, duracionActual), zona)}
              </p>
            )}
            <button type="button" className="boton reunion-detalle__boton" disabled={!elegido || ocupado || cargando} onClick={confirmarHorario}>
              {ocupado ? 'Preparando…' : 'Confirmar horario'}
            </button>
          </div>
        </>
      )}

      {fase.paso === 'confirmando' && (
        <TarjetaConfirmacion
          operacion={fase.operacion}
          ocupado={ocupado}
          textoConfirmar="Confirmar"
          alConfirmar={() => confirmar(fase.operacion, fase.clase)}
          alDescartar={() => descartar(fase.operacion)}
        />
      )}

      {reunion.soyConvocante && fase.paso === 'eligiendo' && reunion.estado !== 'cancelada' && (
        <button type="button" className="boton boton--secundario reunion-detalle__cancelar" disabled={ocupado} onClick={cancelarReunion}>
          Cancelar reunión
        </button>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

// ─── El corte ───────────────────────────────────────────────────────────────────────────────────────────────

export function Reuniones({
  zona,
  perfilId,
  version,
  abrir,
  alPedir,
}: {
  zona: string;
  perfilId: string;
  // Sube cuando la conversación cambió alguna reunión: la lista se vuelve a pedir
  version: number;
  // «Ver todos los horarios» desde la conversación abre esta reunión
  abrir: { id: string; vez: number } | null;
  alPedir: (texto: string) => void;
}) {
  const [reuniones, setReuniones] = useState<ReunionResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(abrir?.id ?? null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [, enCarga] = useTransition();

  const cargar = useCallback(
    () =>
      enCarga(async () => {
        const r = await obtenerReuniones();
        if (!r.datos) return setError(r.error);
        setError(null);
        setReuniones(r.datos);
      }),
    [],
  );

  useEffect(() => {
    cargar();
  }, [cargar, version]);

  useEffect(() => {
    if (abrir) setAbierta(abrir.id);
  }, [abrir]);

  function volver(texto?: string) {
    setAbierta(null);
    setAviso(texto ?? null);
    cargar();
  }

  if (abierta) return <Detalle key={`${abierta}-${abrir?.vez ?? 0}`} id={abierta} zona={zona} alVolver={volver} />;

  return (
    <div className="reuniones__corte">
      {error ? (
        <div className="vacio" role="alert">
          <h2>No pudimos leer tus reuniones</h2>
          <p>{error}</p>
        </div>
      ) : reuniones ? (
        <Lista reuniones={reuniones} zona={zona} aviso={aviso} alAbrir={(id) => { setAviso(null); setAbierta(id); }} alPedir={alPedir} />
      ) : (
        <p className="ayuda">Leyendo tus reuniones…</p>
      )}
      <AutorizacionesEquipo perfilId={perfilId} />
    </div>
  );
}
