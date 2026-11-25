'use client';

import { useEffect, useState } from 'react';
import type {
  EquipoResumen as Equipo,
  IntegranteEquipo as Integrante,
  DisponibilidadEquipoRespuesta as Disponibilidad,
  BandaHorariaEquipo,
} from '@nexoai/contratos';
import {
  obtenerEquipos,
  obtenerIntegrantes,
  obtenerDisponibilidadEquipo,
} from '../acciones-equipo';
import { ConsentimientoEquipo } from './consentimiento-equipo';
import { RejillaDisponibilidad } from './rejilla-disponibilidad';

function motivoVisible(motivo?: string): string {
  switch (motivo) {
    case 'sin_consentimiento':
      return 'No ha autorizado compartir su disponibilidad.';
    case 'calendario_no_disponible':
      return 'No pudimos consultar su calendario.';
    case 'autorizacion_no_vigente':
      return 'Su autorización dejó de estar vigente.';
    default:
      return 'No pudimos confirmar su disponibilidad.';
  }
}

function consentimientoVisible(estado?: string): string {
  switch (estado) {
    case 'concedida':
      return 'Disponibilidad autorizada';
    case 'pendiente':
      return 'Autorización pendiente';
    case 'rechazada':
      return 'Autorización rechazada';
    case 'revocada':
      return 'Autorización retirada';
    default:
      return 'Autorización no confirmada';
  }
}

function fechaLocal(zona: string): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function siguienteDia(fecha: string): string {
  const dia = new Date(`${fecha}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + 1);
  return dia.toISOString().slice(0, 10);
}

function horaISO(
  fecha: string,
  hora: string,
  zona: string,
): string {
  const objetivo = Date.parse(`${fecha}T${hora}:00Z`);

  const formato = new Intl.DateTimeFormat('en-GB', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  let instante = objetivo;

  for (let intento = 0; intento < 6; intento++) {
    const partes = formato.formatToParts(new Date(instante));

    const valor = (tipo: string) =>
      Number(partes.find((parte) => parte.type === tipo)?.value);

    const representado = Date.UTC(
      valor('year'),
      valor('month') - 1,
      valor('day'),
      valor('hour'),
      valor('minute'),
      valor('second'),
    );

    const diferencia = objetivo - representado;

    if (diferencia === 0) {
      return new Date(instante).toISOString();
    }

    instante += diferencia;
  }

  throw new Error(
    'No se pudo determinar el horario local solicitado.',
  );
}

function horaVisible(iso: string, zona: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function tituloDisponibilidad(
  resultado: Disponibilidad,
): string {
  switch (resultado.estadoDisponibilidad) {
    case 'disponible':
      return resultado.disponibilidadCompleta
        ? 'Horarios disponibles'
        : 'Horarios disponibles entre los calendarios consultados';

    case 'sin_intervalos_comunes':
      return 'No encontramos horarios libres en común';

    case 'duracion_insuficiente':
      return 'Los horarios encontrados son demasiado cortos';

    case 'sin_datos':
      return 'No pudimos determinar la disponibilidad';
  }
}

function mensajeDisponibilidad(
  resultado: Disponibilidad,
  duracion?: number,
): string {
  switch (resultado.estadoDisponibilidad) {
    case 'disponible': {
      const cantidad = resultado.intervalos.length;

      return cantidad === 1
        ? 'Encontramos un intervalo que cumple las condiciones seleccionadas.'
        : `Encontramos ${cantidad} intervalos que cumplen las condiciones seleccionadas.`;
    }

    case 'sin_intervalos_comunes':
      return 'Los calendarios consultados no coinciden en ningún horario libre dentro de la fecha y banda seleccionadas.';

    case 'duracion_insuficiente': {
      const mayor = resultado.intervalosComunes.reduce(
        (maximo, intervalo) =>
          Math.max(maximo, intervalo.duracionMinutos),
        0,
      );

      const minutos = new Intl.NumberFormat('es-PE', {
        maximumFractionDigits: 2,
      }).format(mayor);

      return duracion === undefined
        ? `El mayor intervalo encontrado dura ${minutos} minutos.`
        : `Solicitaste ${duracion} minutos, pero el mayor intervalo encontrado dura ${minutos} minutos.`;
    }

    case 'sin_datos':
      return 'No fue posible consultar ningún calendario de los participantes seleccionados.';
  }
}

export function DisponibilidadEquipo({
  zona,
  perfilId,
}: {
  zona: string;
  perfilId: string;
}) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  // T-120 · REQ-CUN05-19: el responsable y cuántas personas tiene cada equipo
  const [resumenes, setResumenes] = useState<Record<string, { responsable: string | null; integrantes: number }>>({});
  const [equipoId, setEquipoId] = useState('');
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [cargandoIntegrantes, setCargandoIntegrantes] = useState(false);
  const [fecha, setFecha] = useState(() => siguienteDia(fechaLocal(zona)));
  const [duracion, setDuracion] = useState<number | undefined>(undefined);
  const [bandaHoraria, setBandaHoraria] = useState<BandaHorariaEquipo>('normal');
  const [resultado, setResultado] = useState<Disponibilidad | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [gestionandoConsentimiento, setGestionandoConsentimiento] =
    useState(false);
  const [propuestaPendiente, setPropuestaPendiente] =
    useState(false);
  const [equipoCargado, setEquipoCargado] = useState('');

  const integrantesVigentes =
    equipoCargado === equipoId && !cargandoIntegrantes;

  const miMembresia = integrantesVigentes
    ? integrantes.find(
        integrante => integrante.perfilId === perfilId,
      )
    : undefined;

  const controlesBloqueados =
    cargando ||
    gestionandoConsentimiento ||
    propuestaPendiente ||
    cargandoIntegrantes;

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const respuesta = await obtenerEquipos();

      if (!activo) return;

      if (respuesta.error) {
        setError(respuesta.error);
        return;
      }

      const encontrados = (respuesta.datos ?? [])
        .map((registro) => registro.equipo);

      setEquipos(encontrados);
      setResumenes(Object.fromEntries((respuesta.datos ?? []).map((registro) => [
        registro.equipo.id,
        { responsable: registro.responsable?.correo ?? null, integrantes: registro.integrantes ?? 0 },
      ])));

      if (encontrados.length > 0) {
        setEquipoId(encontrados[0]?.id ?? '');
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarIntegrantes() {
      setEquipoCargado('');
      setIntegrantes([]);
      setSeleccionados([]);
      setResultado(null);
      setError('');

      if (!equipoId) {
        setCargandoIntegrantes(false);
        return;
      }

      setCargandoIntegrantes(true);

      const respuesta = await obtenerIntegrantes(equipoId);

      if (!activo) return;

      setCargandoIntegrantes(false);

      if (respuesta.error) {
        setError(respuesta.error);
        return;
      }

      const encontrados = respuesta.datos ?? [];
      setIntegrantes(encontrados);
      setEquipoCargado(equipoId);
      setSeleccionados(encontrados.map((integrante) => integrante.perfilId));
    }

    void cargarIntegrantes();

    return () => {
      activo = false;
    };
  }, [equipoId]);

  async function actualizarConsentimiento() {
    setResultado(null);
    setError('');

    try {
      const respuesta = await obtenerIntegrantes(equipoId);

      if (!respuesta.datos) {
        throw new Error(
          respuesta.error ??
          'No pudimos actualizar los integrantes.',
        );
      }

      const encontrados = respuesta.datos;

      setIntegrantes(encontrados);

      setSeleccionados(actuales =>
        actuales.filter(id =>
          encontrados.some(persona => persona.perfilId === id),
        ),
      );
    } catch {
      setEquipoCargado('');
      setIntegrantes([]);
      setSeleccionados([]);
      setError(
        'No pudimos actualizar las autorizaciones. Recarga la pagina.',
      );

      throw new Error('No se pudo actualizar el equipo.');
    }
  }

  async function consultar(ajustes: {
    fecha?: string;
    duracion?: number | null;
    participantes?: string[];
    banda?: BandaHorariaEquipo;
  } = {}) {
    const fechaConsulta = ajustes.fecha ?? fecha;
    const duracionConsulta =
      ajustes.duracion === null
        ? undefined
        : ajustes.duracion ?? duracion;
    const participantesConsulta =
      ajustes.participantes ?? seleccionados;
    const bandaConsulta = ajustes.banda ?? bandaHoraria;
    if (
      !equipoId ||
      !fechaConsulta ||
      !integrantesVigentes ||
      controlesBloqueados
    ) return;

    if (participantesConsulta.length === 0) {
      setResultado(null);
      setError('Selecciona al menos un integrante.');
      return;
    }

    setCargando(true);
    setError('');
    setResultado(null);

    try {
      const desde = horaISO(
        fechaConsulta,
        bandaConsulta === 'fueraDeBanda' ? '00:00' : '08:00',
        zona,
      );

      const hasta =
        bandaConsulta === 'fueraDeBanda'
          ? horaISO(siguienteDia(fechaConsulta), '00:00', zona)
          : horaISO(
              fechaConsulta,
              bandaConsulta === 'extendida' ? '22:00' : '20:00',
              zona,
            );

      const respuesta = await obtenerDisponibilidadEquipo(
        equipoId,
        desde,
        hasta,
        duracionConsulta,
        participantesConsulta,
        bandaConsulta,
      );

      if (respuesta.error) {
        setError(respuesta.error);
        return;
      }

      if (!respuesta.datos) {
        setError('No recibimos una disponibilidad válida.');
        return;
      }

      setResultado(respuesta.datos);
    } catch {
      setError('No pudimos consultar la disponibilidad.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="disponibilidad-equipo">
      <h2>Disponibilidad del equipo</h2>

      <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
        <label>
          Equipo
          <select
            value={equipoId}
            disabled={controlesBloqueados}
            onChange={(evento) => {
              setEquipoId(evento.target.value);
              setResultado(null);
            }}
            style={{ display: 'block', width: '100%', padding: '10px' }}
          >
            {equipos.length === 0 && <option value="">No hay equipos disponibles</option>}
            {equipos.map((equipo) => (
              <option key={equipo.id} value={equipo.id}>
                {equipo.nombre}
              </option>
            ))}
          </select>
        </label>
        {resumenes[equipoId] && (
          <p className="disponibilidad-equipo__resumen">
            {resumenes[equipoId].responsable ? `Responsable: ${resumenes[equipoId].responsable}` : 'Sin responsable'}
            {` · ${resumenes[equipoId].integrantes} ${resumenes[equipoId].integrantes === 1 ? 'integrante' : 'integrantes'}`}
          </p>
        )}

        <label>
          Fecha
          <input
            type="date"
            value={fecha}
            disabled={controlesBloqueados}
            onChange={(evento) => {
              setFecha(evento.target.value);
              setResultado(null);
            }}
            style={{ display: 'block', padding: '10px' }}
          />
        </label>

        <label>
          Duración de la reunión
          <select
            value={duracion ?? ''}
            disabled={controlesBloqueados}
            onChange={(evento) => {
              const nueva = evento.target.value === ''
                ? undefined
                : Number(evento.target.value);
              setDuracion(nueva);
              if (resultado) {
                void consultar({ duracion: nueva ?? null });
              } else {
                setResultado(null);
              }
            }}
            style={{ display: 'block', padding: '10px' }}
          >
            <option value="">Sin duración mínima</option>
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
            <option value={90}>90 minutos</option>
            <option value={120}>120 minutos</option>
            <option value={180}>180 minutos</option>
          </select>
        </label>

        <label>
          Banda horaria
          <select
            value={bandaHoraria}
            disabled={controlesBloqueados}
            onChange={(evento) => {
              setBandaHoraria(
                evento.target.value as BandaHorariaEquipo,
              );
              setResultado(null);
              setError('');
            }}
            style={{ display: 'block', padding: '10px' }}
          >
            <option value="normal">
              Horario habitual (08:00 - 20:00)
            </option>
            <option value="extendida">
              Horario ampliado (08:00 - 22:00)
            </option>
            <option value="fueraDeBanda">
              Todo el día (00:00 - 24:00)
            </option>
          </select>
        </label>

        {bandaHoraria === 'fueraDeBanda' && (
          <p role="status">
            Se incluirán horarios fuera de la jornada habitual.
          </p>
        )}

        <button
          type="button"
          className="boton"
          disabled={
            !equipoId ||
            !integrantesVigentes ||
            controlesBloqueados ||
            seleccionados.length === 0
          }
          onClick={() => void consultar()}
        >
          {cargando ? 'Consultando...' : 'Consultar disponibilidad'}
        </button>
      </div>

      {miMembresia && (
        <div style={{ marginTop: '28px' }}>
          <ConsentimientoEquipo
            key={equipoId + ':' + perfilId}
            equipoId={equipoId}
            estadoActual={miMembresia.estadoConsentimiento}
            bloqueado={cargando || cargandoIntegrantes}
            alOcupar={setGestionandoConsentimiento}
            alProponer={setPropuestaPendiente}
            alActualizar={actualizarConsentimiento}
          />
        </div>
      )}

      {integrantesVigentes && integrantes.length > 0 && (
        <section style={{ marginTop: '28px' }}>
          <h3 id="participantes-equipo">
            Seleccionar participantes
          </h3>
          <p>Elige los integrantes cuya disponibilidad deseas consultar.</p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              type="button"
              disabled={controlesBloqueados}
              onClick={() => {
                setSeleccionados(integrantes.map((integrante) => integrante.perfilId));
                setResultado(null);
              }}
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              disabled={controlesBloqueados}
              onClick={() => {
                setSeleccionados([]);
                setResultado(null);
              }}
            >
              Deseleccionar todos
            </button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {integrantes.map((integrante) => (
              <label
                key={integrante.perfilId}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <input
                  type="checkbox"
                  disabled={controlesBloqueados}
                  checked={seleccionados.includes(integrante.perfilId)}
                  onChange={(evento) => {
                    const nuevos = evento.target.checked
                      ? [...seleccionados, integrante.perfilId]
                      : seleccionados.filter(
                          id => id !== integrante.perfilId,
                        );
                    setSeleccionados(nuevos);
                    if (resultado && nuevos.length > 0) {
                      void consultar({ participantes: nuevos });
                    } else {
                      setResultado(null);
                    }
                  }}
                />
                <span>
                  {integrante.perfil?.correo ?? integrante.perfilId}
                  {' — '}
                  {consentimientoVisible(
                    integrante.estadoConsentimiento,
                  )}
                </span>
              </label>
            ))}
          </div>

          <p style={{ marginTop: '12px' }}>
            Participantes seleccionados: {seleccionados.length} de {integrantes.length}
          </p>
        </section>
      )}

      {error && (
        <p role="alert" style={{ marginTop: '20px', color: '#b91c1c' }}>
          {error}
        </p>
      )}

      {!resultado &&
        !cargando &&
        !error &&
        integrantesVigentes &&
        seleccionados.length > 0 && (
          <p role="status" style={{ marginTop: '28px' }}>
            Selecciona las condiciones de la reunión y consulta
            la disponibilidad de los participantes.
          </p>
      )}

      {resultado && (
        <section style={{ marginTop: '28px' }}>
          <div role="status" aria-live="polite">
            <h3>{tituloDisponibilidad(resultado)}</h3>
            <p>{mensajeDisponibilidad(resultado, duracion)}</p>
          </div>

          <p>
              Zona horaria: {resultado.zonaHoraria ?? zona}
            </p>
            <p>
            Participantes consultados: {resultado.participantesConsultados}
            {' de '}
            {seleccionados.length}
          </p>

          {!resultado.disponibilidadCompleta &&
            resultado.participantesConsultados > 0 && (
              <div role="alert">
                <strong>Disponibilidad parcial</strong>
                <p>
                  El resultado corresponde solo a los calendarios
                  consultados. No garantiza la disponibilidad de
                  todos los participantes seleccionados.
                </p>
              </div>
          )}

          {resultado.participantesSinDatos.length > 0 && (
            <div>
              <h4>Participantes cuya disponibilidad no se pudo confirmar</h4>
              <ul>
                {resultado.participantesSinDatos.map((perfilId) => {
                  const integrante = integrantes.find(
                    (persona) => persona.perfilId === perfilId,
                  );
                  const detalle = resultado.detalleParticipantesSinDatos?.find(
                    (persona) => persona.perfilId === perfilId,
                  );

                  return (
                    <li key={perfilId}>
                      <strong>
                        {integrante?.perfil.correo ??
                          'Participante del equipo'}
                      </strong>
                      {' - '}
                      {motivoVisible(detalle?.motivo)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {bandaHoraria === 'fueraDeBanda' && (
            <p role="status">
              La consulta incluye horarios fuera de la banda de 08:00 a 22:00.
            </p>
          )}

          {resultado.estadoDisponibilidad !== 'disponible' && (
            <section
              aria-label="Ajustar consulta"
              style={{
                marginBlock: 'var(--espaciado-24)',
                padding: 'var(--espaciado-16)',
                border: '1px solid var(--borde-base)',
                borderRadius: 'var(--radio-md)',
              }}
            >
              <h4>Otras opciones de b\u00fasqueda</h4>

              <p>
                Puedes modificar las condiciones y volver a consultar.
              </p>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--espaciado-12)',
              }}>
                {duracion !== undefined && (
                  <button
                    type="button"
                    disabled={controlesBloqueados}
                    onClick={() => {
                      setDuracion(undefined);
                      void consultar({ duracion: null });
                    }}
                  >
                    Consultar sin duraci\u00f3n m\u00ednima
                  </button>
                )}

                {bandaHoraria !== 'fueraDeBanda' && (
                  <button
                    type="button"
                    disabled={controlesBloqueados}
                    onClick={() => {
                      const nueva = bandaHoraria === 'normal'
                        ? 'extendida'
                        : 'fueraDeBanda';

                      if (
                        nueva === 'fueraDeBanda' &&
                        !window.confirm(
                          'La consulta incluir\u00e1 horarios fuera de 08:00 a 22:00. Continuar?',
                        )
                      ) return;

                      setBandaHoraria(nueva);
                      void consultar({ banda: nueva });
                    }}
                  >
                    {bandaHoraria === 'normal'
                      ? 'Ampliar horario hasta las 22:00'
                      : 'Consultar todo el d\u00eda'}
                  </button>
                )}

                <button
                  type="button"
                  disabled={controlesBloqueados}
                  onClick={() => {
                    const nueva = siguienteDia(fecha);
                    setFecha(nueva);
                    void consultar({ fecha: nueva });
                  }}
                >
                  Consultar el d\u00eda siguiente
                </button>

                <button
                  type="button"
                  disabled={controlesBloqueados}
                  onClick={() => {
                    document.getElementById(
                      'participantes-equipo',
                    )?.scrollIntoView({ block: 'center' });
                  }}
                >
                  Modificar participantes
                </button>

                <button
                  type="button"
                  disabled={controlesBloqueados}
                  onClick={() => {
                    setResultado(null);
                    setError('');
                  }}
                >
                  Cancelar b\u00fasqueda
                </button>
              </div>
            </section>
          )}

          <RejillaDisponibilidad
            resultado={resultado}
            nombres={Object.fromEntries(
              integrantes.map((integrante) => [
                integrante.perfilId,
                integrante.perfil.correo,
              ]),
            )}
          />

          {resultado.estadoDisponibilidad === 'disponible' && (
            <ul aria-label={
              resultado.disponibilidadCompleta
                ? 'Horarios comunes'
                : 'Horarios parciales'
            }>
              {resultado.intervalos.map((intervalo) => (
                <li key={`${intervalo.inicio}-${intervalo.fin}`}>
                  <strong>
                    {horaVisible(intervalo.inicio, resultado.zonaHoraria ?? zona)}
                    {' – '}
                    {horaVisible(intervalo.fin, resultado.zonaHoraria ?? zona) === '00:00'
                      ? '00:00 (día siguiente)'
                      : horaVisible(intervalo.fin, resultado.zonaHoraria ?? zona)}
                  </strong>
                  {' — '}
                  {intervalo.duracionMinutos} minutos libres
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}
