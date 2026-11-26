'use client';

import { useId, useRef, useState } from 'react';
import type {
  CambiarConsentimientoEquipoCarga,
  EstadoConsentimientoEquipo,
  OperacionRespuesta,
} from '@nexoai/contratos';

import {
  proponerCambioConsentimiento,
  confirmarCambioConsentimiento,
  descartarCambioConsentimiento,
} from '../acciones-equipo';

type Props = {
  equipoId: string;
  estadoActual: EstadoConsentimientoEquipo;
  bloqueado: boolean;
  alOcupar: (ocupado: boolean) => void;
  alProponer: (pendiente: boolean) => void;
  alActualizar: () => Promise<void>;
};

const ESTADOS: Record<EstadoConsentimientoEquipo, string> = {
  pendiente: 'Pendiente de autorización',
  concedida: 'Autorizado',
  rechazada: 'No autorizado',
  revocada: 'Autorización retirada',
};

export function ConsentimientoEquipo({
  equipoId,
  estadoActual,
  bloqueado,
  alOcupar,
  alProponer,
  alActualizar,
}: Props) {
  const titulo = useId();
  const tituloConfirmacion = useId();

  const [propuesta, setPropuesta] =
    useState<OperacionRespuesta | null>(null);

  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const enCurso = useRef(false);

  async function ejecutar(
    accion: () => Promise<void>,
  ) {
    if (enCurso.current || bloqueado) return;

    enCurso.current = true;
    setOcupado(true);
    alOcupar(true);
    setError(null);
    setAviso(null);

    try {
      await accion();
    } catch {
      setError(
        'No pudimos completar la solicitud. Inténtalo nuevamente.',
      );
    } finally {
      enCurso.current = false;
      setOcupado(false);
      alOcupar(false);
    }
  }

  async function proponer(
    estado: CambiarConsentimientoEquipoCarga['estado'],
  ) {
    await ejecutar(async () => {
      const respuesta = await proponerCambioConsentimiento(
        equipoId,
        estado,
      );

      if (!respuesta.datos) {
        setError(
          respuesta.error ??
          'No pudimos preparar el cambio.',
        );
        return;
      }

      setPropuesta(respuesta.datos);
      alProponer(true);
    });
  }

  async function confirmar() {
    if (!propuesta?.vistaConfirmacion.confirmable) return;

    await ejecutar(async () => {
      try {
        const respuesta =
          await confirmarCambioConsentimiento(propuesta.id);

        setPropuesta(null);

        if (!respuesta.datos) {
          setError(
            respuesta.error ??
            'No pudimos verificar el cambio.',
          );
          return;
        }

        if (respuesta.datos.equipoId !== equipoId) {
          setError(
            'El resultado no corresponde al equipo seleccionado.',
          );
          return;
        }

        setAviso(
          'Tu autorización se ha actualizado correctamente.',
        );
      } finally {
        setPropuesta(null);
        alProponer(false);
        await alActualizar();
      }
    });
  }

  async function cancelar() {
    if (!propuesta) return;

    await ejecutar(async () => {
      const respuesta =
        await descartarCambioConsentimiento(propuesta.id);

      if (!respuesta.datos) {
        setError(
          respuesta.error ??
          'No pudimos cancelar la propuesta.',
        );
        return;
      }

      setPropuesta(null);
      alProponer(false);
      setAviso('No se realizaron cambios.');
    });
  }

  const deshabilitado = ocupado || bloqueado;

  return (
    <section
      className="consentimiento-equipo"
      aria-labelledby={titulo}
      aria-busy={ocupado}
    >
      <h3 id={titulo}>
        Mi autorización de disponibilidad
      </h3>

      <p>
        Estado actual:{' '}
        <strong>{ESTADOS[estadoActual]}</strong>
      </p>

      <p className="ayuda">
        Permite que los integrantes de este equipo consulten
        tus horarios libres y ocupados. No se comparten
        títulos ni detalles.
      </p>

      {!propuesta && (
        <div className="cambio-zona__acciones">
          {estadoActual !== 'concedida' && (
            <button
              type="button"
              className="boton"
              disabled={deshabilitado}
              onClick={() => proponer('concedida')}
            >
              Autorizar disponibilidad
            </button>
          )}

          {estadoActual === 'pendiente' && (
            <button
              type="button"
              className="boton boton--secundario"
              disabled={deshabilitado}
              onClick={() => proponer('rechazada')}
            >
              No autorizar
            </button>
          )}

          {estadoActual === 'concedida' && (
            <button
              type="button"
              className="boton boton--secundario"
              disabled={deshabilitado}
              onClick={() => proponer('revocada')}
            >
              Retirar autorización
            </button>
          )}
        </div>
      )}

      {propuesta && (
        <section
          className="tarjeta-confirmacion"
          aria-labelledby={tituloConfirmacion}
        >
          <h4 id={tituloConfirmacion}>
            {propuesta.vistaConfirmacion.accion}
          </h4>

          <dl>
            {propuesta.vistaConfirmacion.datos.map(
              (dato, indice) => (
                <div
                  key={indice}
                  className="tarjeta-confirmacion__dato"
                >
                  <dt>{dato.etiqueta}</dt>
                  <dd>{dato.valor}</dd>
                </div>
              ),
            )}
          </dl>

          {propuesta.vistaConfirmacion.irreversible && (
            <p className="ayuda">
              {propuesta.vistaConfirmacion.irreversible}
            </p>
          )}

          {!propuesta.vistaConfirmacion.confirmable && (
            <p className="error" role="alert">
              {propuesta.vistaConfirmacion.motivoNoConfirmable}
            </p>
          )}

          <div className="cambio-zona__acciones">
            <button
              type="button"
              className="boton"
              disabled={
                deshabilitado ||
                !propuesta.vistaConfirmacion.confirmable
              }
              onClick={confirmar}
            >
              {ocupado ? 'Procesando…' : 'Confirmar cambio'}
            </button>

            <button
              type="button"
              className="boton boton--secundario"
              disabled={deshabilitado}
              onClick={cancelar}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {ocupado && !propuesta && (
        <p className="ayuda" role="status">
          Procesando solicitud…
        </p>
      )}

      {aviso && (
        <p className="cambio-zona__aviso" role="status">
          {aviso}
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
