'use client';

import { useEffect, useState } from 'react';
import {
  obtenerEquipos,
  obtenerIntegrantes,
  obtenerDisponibilidadEquipo,
} from '../acciones-equipo';

type Equipo = {
  id: string;
  nombre: string;
};

type Integrante = {
  perfilId: string;
  rol?: string;
  estadoConsentimiento?: string;
  consentimiento?: string;
  perfil?: {
    correo?: string;
    zonaHoraria?: string;
  };
};

type Intervalo = {
  inicio: string;
  fin: string;
  duracionMinutos: number;
};

type Disponibilidad = {
  disponibilidadCompleta: boolean;
  participantesConsultados: number;
  participantesSinDatos: unknown[];
  intervalos: Intervalo[];
  advertencia: string | null;
};

function lista<T>(datos: unknown): T[] {
  return Array.isArray(datos) ? (datos as T[]) : [];
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

function offsetZona(fecha: string, zona: string): string {
  const referencia = Date.parse(`${fecha}T12:00:00Z`);

  const nombre = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(referencia))
    .find((parte) => parte.type === 'timeZoneName')?.value;

  if (!nombre || nombre === 'GMT') return '+00:00';

  const coincidencia = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(nombre);

  if (!coincidencia) return '+00:00';

  return `${coincidencia[1]}${(coincidencia[2] ?? '00').padStart(2, '0')}:${coincidencia[3] ?? '00'}`;
}

function horaISO(fecha: string, hora: string, zona: string): string {
  return `${fecha}T${hora}:00${offsetZona(fecha, zona)}`;
}

function horaVisible(iso: string, zona: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function DisponibilidadEquipo({ zona }: { zona: string }) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoId, setEquipoId] = useState('');
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [fecha, setFecha] = useState(() => siguienteDia(fechaLocal(zona)));
  const [duracion, setDuracion] = useState(30);
  const [resultado, setResultado] = useState<Disponibilidad | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const respuesta = await obtenerEquipos();

      if (!activo) return;

      if (respuesta.error) {
        setError(respuesta.error);
        return;
      }

      const encontrados = lista<{ equipo: Equipo }>(respuesta.datos)
        .map((registro) => registro.equipo)
        .filter((equipo): equipo is Equipo =>
          Boolean(equipo?.id && equipo?.nombre),
        );

      setEquipos(encontrados);

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
      setIntegrantes([]);
      setResultado(null);

      if (!equipoId) return;

      const respuesta = await obtenerIntegrantes(equipoId);

      if (!activo) return;

      if (respuesta.error) {
        setError(respuesta.error);
        return;
      }

      setIntegrantes(lista<Integrante>(respuesta.datos));
    }

    void cargarIntegrantes();

    return () => {
      activo = false;
    };
  }, [equipoId]);

  async function consultar() {
    if (!equipoId || !fecha) return;

    setCargando(true);
    setError('');
    setResultado(null);

    const desde = horaISO(fecha, '08:00', zona);
    const hasta = horaISO(fecha, '20:00', zona);

    try {
      const respuesta = await obtenerDisponibilidadEquipo(
        equipoId,
        desde,
        hasta,
        duracion,
      );

      if (respuesta.error) {
        setError(respuesta.error);
        return;
      }

      const datos = respuesta.datos as Disponibilidad;
      setResultado(datos);
    } catch {
      setError('No pudimos consultar la disponibilidad.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <section style={{ padding: '24px', maxWidth: '760px' }}>
      <h2>Disponibilidad del equipo</h2>
      <p>Encuentra horarios libres sin consultar los detalles privados de otros calendarios.</p>

      <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
        <label>
          Equipo
          <select
            value={equipoId}
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

        <label>
          Fecha
          <input
            type="date"
            value={fecha}
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
            value={duracion}
            onChange={(evento) => {
              setDuracion(Number(evento.target.value));
              setResultado(null);
            }}
            style={{ display: 'block', padding: '10px' }}
          >
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
            <option value={90}>90 minutos</option>
          </select>
        </label>

        <button
          type="button"
          className="boton"
          disabled={!equipoId || cargando}
          onClick={() => void consultar()}
        >
          {cargando ? 'Consultando...' : 'Consultar disponibilidad'}
        </button>
      </div>

      {integrantes.length > 0 && (
        <section style={{ marginTop: '28px' }}>
          <h3>Integrantes del equipo</h3>
          <ul>
            {integrantes.map((integrante) => (
              <li key={integrante.perfilId}>
                {integrante.perfil?.correo ?? integrante.perfilId}
                {' — '}
                {integrante.estadoConsentimiento ??
                  integrante.consentimiento ??
                  'Estado no disponible'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" style={{ marginTop: '20px', color: '#b91c1c' }}>
          {error}
        </p>
      )}

      {resultado && (
        <section style={{ marginTop: '28px' }}>
          <h3>Horarios disponibles</h3>

          <p>
            Participantes consultados: {resultado.participantesConsultados}
          </p>

          {!resultado.disponibilidadCompleta && (
            <p role="alert">
              La disponibilidad es parcial. Faltan datos de algunos integrantes.
            </p>
          )}

          {resultado.advertencia && (
            <p role="status">{resultado.advertencia}</p>
          )}

          {resultado.intervalos.length === 0 ? (
            <p>No encontramos intervalos comunes para la duración seleccionada.</p>
          ) : (
            <ul>
              {resultado.intervalos.map((intervalo) => (
                <li key={`${intervalo.inicio}-${intervalo.fin}`}>
                  <strong>
                    {horaVisible(intervalo.inicio, zona)}
                    {' – '}
                    {horaVisible(intervalo.fin, zona)}
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
