'use client';

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type FormEvent, type RefObject } from 'react';
import type { ConversacionAsistente, DecisionAsistente, OperacionRespuesta, TurnoAsistente } from '@nexoai/contratos';
import { decidirEnAsistente, enviarAlAsistente, verAnteriores } from '../acciones';
import { elementosDe, textoDelSeparador, type Elemento } from '../../lib/separador';
import { IconoEnviar } from './iconos';
import { ResumenDeBitacora } from './resumen-bitacora';

// T-034 · specs/07-agente/plan.md §9 · REQ-CAP-23. La conversación con el asistente. Cada turno se muestra
// según su tipo, para que no se parezca lo que significa cosas distintas: una tarjeta que espera tu
// confirmación, algo que quedó en espera y un fallo. Las tarjetas y los avisos los escribe la API; aquí
// solo se pintan. Ningún texto nombra la interfaz (R-40).
// T-039 · REQ-AGT-03: la conversación ya no se vacía al cerrarse una acción. Se ve lo de antes, con una línea
// que dice cuándo terminó y qué se hizo, y «Ver anteriores» trae lo más viejo sin perder lo que se leía.

type Alternativa = { inicio: string; fin: string };

// Pulido · REQ-CUN01-05, decisión 27 de 02-agenda: el choque de horario se dice en una línea, «Se cruza con
// «título»». El motivo largo que arma la API queda para quien lo pida (title en la web).
const enLista = (titulos: string[]) => (titulos.length < 2 ? titulos.join('') : `${titulos.slice(0, -1).join(', ')} y ${titulos[titulos.length - 1]}`);
const seCruzaCon = (eventos: { titulo: string }[]) => `Se cruza con ${enLista(eventos.map((e) => `«${e.titulo}»`))}`;

const hora = (iso: string, zona?: string) =>
  new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const dia = (iso: string, zona?: string) =>
  new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));

// Paridad con H-CAP-01 del móvil (apps/movil/src/pantallas/captura.tsx, mismo criterio): qué se decidió sobre
// una tarjeta que ya no espera. La Operación de la tarjeta es la de cuando se propuso; el desenlace se lee en
// lo que vino después.
function desenlace(elementos: Elemento[], desde: number, operacionId: string): string | null {
  for (const e of elementos.slice(desde + 1)) {
    if (e.clase === 'separador') {
      if (e.cierre.desenlace === 'descartado') return 'Descartado';
      return ['registrado', 'movido', 'cancelado', 'anotado'].includes(e.cierre.desenlace) ? 'Confirmado' : null;
    }
    const t = e.turno;
    if (t.tipo === 'resultado' && t.operacion.id === operacionId) return 'Confirmado';
    if (t.tipo === 'propuesta') return 'Cambiado por otro horario';
    if (t.tipo === 'persona') return 'Descartado';
    if (t.tipo === 'fallo') return 'No se pudo hacer';
  }
  return null;
}

function Tarjeta({
  operacion,
  activa,
  decidido,
  ocupado,
  zona,
  alDecidir,
}: {
  operacion: OperacionRespuesta;
  activa: boolean;
  // Lo que se decidió, cuando ya no espera
  decidido: string | null;
  ocupado: boolean;
  zona?: string;
  alDecidir: (decision: DecisionAsistente) => void;
}) {
  const vista = operacion.vistaConfirmacion;
  const alternativas: Alternativa[] = vista.conflicto?.alternativas ?? [];
  const choque = vista.conflicto?.eventos ?? [];
  return (
    <article className={`tarjeta${activa ? '' : ' tarjeta--decidida'}`} aria-label="Para confirmar">
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
      {!vista.confirmable && choque.length > 0 && (
        <p className="tarjeta__motivo tarjeta__motivo--choque" title={vista.motivoNoConfirmable ?? undefined}>
          {seCruzaCon(choque)}
        </p>
      )}
      {!vista.confirmable && choque.length === 0 && vista.motivoNoConfirmable && <p className="tarjeta__motivo">{vista.motivoNoConfirmable}</p>}
      {activa && alternativas.length > 0 && (
        <ul className="tarjeta__alternativas" aria-label="Otros horarios">
          {alternativas.map((a) => (
            <li key={a.inicio}>
              <button
                type="button"
                className="boton boton--secundario"
                disabled={ocupado}
                onClick={() => alDecidir({ operacionId: operacion.id, decision: 'alternativa', alternativa: a })}
              >
                {`${dia(a.inicio, zona)}, ${hora(a.inicio, zona)} – ${hora(a.fin, zona)}`}
              </button>
            </li>
          ))}
        </ul>
      )}
      {activa && (
        <div className="tarjeta__acciones">
          {vista.confirmable && (
            <button type="button" className="boton" disabled={ocupado} onClick={() => alDecidir({ operacionId: operacion.id, decision: 'confirmar' })}>
              Confirmar
            </button>
          )}
          <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => alDecidir({ operacionId: operacion.id, decision: 'descartar' })}>
            Descartar
          </button>
        </div>
      )}
      {!activa && decidido && <p className="tarjeta__decidido">{decidido}</p>}
    </article>
  );
}

function Turno({
  turno,
  pendiente,
  decidido,
  ocupado,
  zona,
  esUltimo,
  alDecidir,
}: {
  turno: TurnoAsistente;
  pendiente: string | null;
  decidido: string | null;
  ocupado: boolean;
  zona?: string;
  esUltimo: boolean;
  alDecidir: (d: DecisionAsistente) => void;
}) {
  switch (turno.tipo) {
    case 'persona':
      return (
        <li className="mensaje">
          <p className="mensaje__texto">{turno.texto}</p>
          <p className="mensaje__estado">{hora(turno.en, zona)}</p>
        </li>
      );
    case 'texto':
    case 'pregunta':
      return (
        <li className="turno">
          <p className="turno__texto">{turno.texto}</p>
        </li>
      );
    case 'agenda':
      return (
        <li className="turno">
          <section className="turno-agenda" aria-label={turno.lista.rango}>
            <p className="turno-agenda__rango">
              {turno.lista.rango} · {turno.lista.zona}
            </p>
            {turno.lista.compromisos.length === 0 ? (
              <p className="turno__texto">No tienes compromisos en ese momento.</p>
            ) : (
              <ol className="turno-agenda__lista">
                {turno.lista.compromisos.map((c) => (
                  <li key={c.id} className={c.cancelado ? 'compromiso--cancelado' : undefined}>
                    <span className="turno-agenda__horario">{c.horario}</span> {c.titulo}
                    {c.cancelado && <span className="etiqueta">Cancelado</span>}
                    {c.invitado && <span className="etiqueta">Invitado</span>}
                    <span className="turno-agenda__dia"> · {c.dia}</span>
                    {c.enSuZona && <span className="compromiso__zona"> · {c.enSuZona}</span>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </li>
      );
    // T-050 · REQ-CUN03-14: las tareas pendientes armadas por la API, tal como están, por franja
    case 'tareas':
      return (
        <li className="turno">
          <section className="turno-agenda" aria-label={turno.lista.alcance}>
            <p className="turno-agenda__rango">{turno.lista.alcance}</p>
            {turno.lista.grupos.length === 0 ? (
              <p className="turno__texto">No tienes tareas pendientes.</p>
            ) : (
              turno.lista.grupos.map((grupo) => (
                <div key={grupo.franja}>
                  <p className="turno-tareas__grupo">{grupo.nombre}</p>
                  <ol className="turno-agenda__lista" aria-label={grupo.nombre}>
                    {grupo.tareas.map((t) => (
                      <li key={t.id}>
                        {t.texto}
                        {t.espera && <span className="turno-agenda__dia"> · {t.espera}</span>}
                        {t.cuando && <span className={`turno-agenda__dia${t.vencida ? ' turno-tareas__vencida' : ''}`}> · {t.cuando}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              ))
            )}
          </section>
        </li>
      );
    // T-127 · REQ-CUN03-23 · H-TP-29: «¿cómo va…?», armado por la API con los avances tal como están, del más
    // reciente al más antiguo, o el texto de que no hay ninguno
    case 'bitacora':
      return (
        <li className="turno">
          <section className="turno-agenda" aria-label={`Bitácora de ${turno.bitacora.tarea}`}>
            <h3 className="turno-bitacora__tarea">{turno.bitacora.tarea}</h3>
            {turno.bitacora.contexto && <p className="turno-agenda__rango">{turno.bitacora.contexto}</p>}
            {/* T-130 · REQ-CUN03-28: el resumen arriba, si lo hay, y debajo los avances tal como están (H-TP-29) */}
            <ResumenDeBitacora tarea={turno.bitacora.tarea} resumen={turno.bitacora.resumen} />
            {turno.bitacora.avances.length === 0 ? (
              <p className="turno__texto">{turno.bitacora.vacia ?? 'Esta tarea no tiene avances anotados.'}</p>
            ) : (
              <ol className="turno-bitacora__lista" aria-label={`Avances de ${turno.bitacora.tarea}`}>
                {turno.bitacora.avances.map((a) => (
                  <li key={a.id}>
                    <span className="turno-agenda__dia">{a.cuando}</span>
                    <span>{a.texto}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </li>
      );
    // T-051 · REQ-CUN03-15: varias tareas encajan; elegir una la propone el código, sin pasar por el modelo
    case 'alternativas_de_referente':
      return (
        <li className="turno">
          <p className="turno__texto">{turno.lista.texto}</p>
          <ul className="candidatas" aria-label={turno.lista.texto}>
            {turno.lista.candidatas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="boton boton--secundario"
                  disabled={ocupado || !esUltimo || pendiente !== null}
                  onClick={() => alDecidir({ decision: 'referente', referenteId: c.id })}
                >
                  {c.titulo}
                  {c.detalle && <span className="candidatas__detalle">{c.detalle}</span>}
                </button>
              </li>
            ))}
          </ul>
        </li>
      );
    case 'propuesta':
      return (
        <li className="turno">
          <Tarjeta operacion={turno.operacion} activa={pendiente === turno.operacion.id} decidido={decidido} ocupado={ocupado} zona={zona} alDecidir={alDecidir} />
        </li>
      );
    case 'resultado':
      return (
        <li className="turno">
          <p className="turno__resultado" role="status">
            {turno.texto}
          </p>
        </li>
      );
    case 'en_espera':
      // En espera no es un error (REQ-CAP-23): se guardó y no se creó nada
      return (
        <li className="turno">
          <p className="aviso-espera" role="status">
            <strong>En espera.</strong> {turno.texto}
          </p>
        </li>
      );
    case 'fallo':
      return (
        <li className="turno">
          <p className="turno__fallo" role="alert">
            {turno.texto}
          </p>
        </li>
      );
  }
}

function Separador({ texto }: { texto: string }) {
  return (
    <li className="separador" role="separator" aria-label={texto}>
      <span>{texto}</span>
    </li>
  );
}

export function Conversacion({
  inicial,
  ejemplos,
  zona,
  entrada,
}: {
  inicial: ConversacionAsistente | null;
  ejemplos: string[];
  zona?: string;
  entrada: RefObject<HTMLTextAreaElement | null>;
}) {
  const [elementos, setElementos] = useState<Elemento[]>(() => elementosDe(inicial?.episodios ?? []));
  const [pendiente, setPendiente] = useState<string | null>(inicial?.pendiente ?? null);
  const [cursor, setCursor] = useState<string | null>(inicial?.hayAnteriores ? inicial.cursor : null);
  const [borrador, setBorrador] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, enTransicion] = useTransition();
  const [trayendo, enTransicionAnteriores] = useTransition();

  const final = useRef<HTMLDivElement>(null);
  const contenido = useRef<HTMLDivElement>(null);
  // Al poner arriba lo anterior se conserva lo que se estaba leyendo: se guarda la altura antes y se compensa después
  const altoAntes = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (altoAntes.current === null || !contenido.current) return;
    contenido.current.scrollTop += contenido.current.scrollHeight - altoAntes.current;
    altoAntes.current = null;
  }, [elementos]);

  // Lo último que se dijo queda siempre a la vista
  const ultimo = elementos.at(-1);
  useEffect(() => {
    final.current?.scrollIntoView?.({ block: 'end' });
  }, [ultimo, ocupado]);

  // `provisional`: el mensaje de la persona que ya se muestra, mientras el asistente responde. La respuesta
  // trae el definitivo, que lo reemplaza; si cerró la acción, trae también cómo terminó.
  function aplicar(r: Awaited<ReturnType<typeof enviarAlAsistente>>, provisional?: string) {
    if (!r.respuesta) {
      setElementos((previos) => previos.filter((e) => e.clase !== 'turno' || e.turno.id !== provisional));
      setError(r.error ?? 'El asistente no pudo responder.');
      return;
    }
    const { respuesta } = r;
    setElementos((previos) => [
      ...previos.filter((e) => e.clase !== 'turno' || e.turno.id !== provisional),
      ...respuesta.turnos.map((turno): Elemento => ({ clase: 'turno', turno })),
      ...(respuesta.cierre ? [{ clase: 'separador' as const, id: `separador-${respuesta.episodioId}`, cierre: respuesta.cierre }] : []),
    ]);
    setPendiente(respuesta.pendiente);
  }

  function enviar(evento?: FormEvent) {
    evento?.preventDefault();
    const texto = borrador.trim();
    if (!texto || ocupado) return;
    setError(null);
    setBorrador('');
    // Lo escrito se ve al instante, sin esperar al asistente (corrección del 29 de octubre de 2026)
    const provisional: TurnoAsistente = { id: crypto.randomUUID(), en: new Date().toISOString(), tipo: 'persona', texto };
    setElementos((previos) => [...previos, { clase: 'turno', turno: provisional }]);
    enTransicion(async () => aplicar(await enviarAlAsistente(texto), provisional.id));
  }

  function decidir(decision: DecisionAsistente) {
    setError(null);
    enTransicion(async () => aplicar(await decidirEnAsistente(decision)));
  }

  function traerAnteriores() {
    if (!cursor) return;
    enTransicionAnteriores(async () => {
      const r = await verAnteriores(cursor);
      if (!r.conversacion) return setError(r.error ?? 'No se pudo traer lo anterior.');
      const { conversacion } = r;
      altoAntes.current = contenido.current?.scrollHeight ?? null;
      setElementos((previos) => [...elementosDe(conversacion.episodios), ...previos]);
      setCursor(conversacion.hayAnteriores ? conversacion.cursor : null);
    });
  }

  function usarEjemplo(ejemplo: string) {
    setBorrador(ejemplo);
    entrada.current?.focus();
  }

  const zonaVista = zona ?? 'UTC';

  return (
    <section className="conversacion" aria-label="Asistente">
      <div className="conversacion__contenido" ref={contenido}>
        {/* Pegajoso: sigue a la vista arriba mientras quede algo anterior que traer */}
        {cursor && (
          <button type="button" className="ver-anteriores" onClick={traerAnteriores} disabled={trayendo}>
            {trayendo ? 'Trayendo…' : 'Ver anteriores'}
          </button>
        )}
        {elementos.length === 0 ? (
          <div className="blanco-inicial">
            <h2>¿Qué hacemos?</h2>
            <p>Pídelo con tus palabras. Antes de hacer nada que no se pueda deshacer, te lo enseño para que lo confirmes.</p>
            <ul className="ejemplos">
              {ejemplos.map((ejemplo) => (
                <li key={ejemplo}>
                  <button type="button" className="ejemplo" onClick={() => usarEjemplo(ejemplo)}>
                    {ejemplo}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="mensajes">
            {elementos.map((elemento, indice) =>
              elemento.clase === 'separador' ? (
                <Separador key={elemento.id} texto={textoDelSeparador(elemento.cierre, zonaVista)} />
              ) : (
                <Turno
                  key={elemento.turno.id}
                  turno={elemento.turno}
                  pendiente={pendiente}
                  decidido={
                    elemento.turno.tipo === 'propuesta' && pendiente !== elemento.turno.operacion.id
                      ? desenlace(elementos, indice, elemento.turno.operacion.id)
                      : null
                  }
                  ocupado={ocupado}
                  zona={zona}
                  esUltimo={elemento === ultimo}
                  alDecidir={decidir}
                />
              ),
            )}
          </ol>
        )}
        {ocupado && (
          <p className="pensando" role="status">
            Pensando…
          </p>
        )}
        {error && (
          <p className="turno__fallo" role="alert">
            {error}
          </p>
        )}
        <div ref={final} />
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
        <button type="submit" className="barra-entrada__enviar" aria-label="Enviar" disabled={!borrador.trim() || ocupado}>
          <IconoEnviar />
        </button>
      </form>
    </section>
  );
}
