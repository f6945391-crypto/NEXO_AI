'use client';

import { useState, useTransition } from 'react';
import type { OperacionRespuesta } from '@nexoai/contratos';
import { confirmarEnEmpresa, descartarEnEmpresa, proponerEnEmpresa } from '../acciones';

// T-062, T-067 · plan §7. Proponer, confirmar y descartar una Operación de la zona, y su tarjeta. La web no decide
// si se puede: pinta la tarjeta tal como la arma la API (vistaConfirmacion, P-03) y le envía lo que se elige.

export function useConfirmacion(alTerminar?: (operacion: OperacionRespuesta) => void) {
  const [propuesta, setPropuesta] = useState<OperacionRespuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const proponer = (tipo: string, carga: object) =>
    empezar(async () => {
      setError(null);
      const r = await proponerEnEmpresa(tipo, carga);
      if (r.error) setError(r.error);
      else setPropuesta(r.propuesta ?? null);
    });

  const confirmar = () =>
    empezar(async () => {
      if (!propuesta) return;
      const r = await confirmarEnEmpresa(propuesta.id);
      if (r.error || !r.operacion) {
        setError(r.error ?? 'No se pudo completar. Inténtalo de nuevo.');
        setPropuesta(null);
        return;
      }
      if (r.operacion.estado === 'propuesta') {
        // Algo cambió desde que se preparó: llega la tarjeta nueva, con el motivo
        setPropuesta(r.operacion);
        return;
      }
      if (r.operacion.estado !== 'ejecutada') setError(r.operacion.error ?? 'No se pudo completar.');
      alTerminar?.(r.operacion);
      setPropuesta(null);
    });

  const cancelar = () =>
    empezar(async () => {
      if (propuesta) await descartarEnEmpresa(propuesta.id);
      setPropuesta(null);
    });

  return { propuesta, error, ocupado, proponer, confirmar, cancelar };
}

// La tarjeta de confirmación, tal como la arma la API (P-03, REQ-ADM-16)
export function TarjetaConfirmacion({
  propuesta,
  ocupado,
  alConfirmar,
  alCancelar,
}: {
  propuesta: OperacionRespuesta;
  ocupado: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  const vista = propuesta.vistaConfirmacion;
  return (
    <div className="empresa__capa">
      <article className="tarjeta-confirmacion empresa__confirmacion" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacion">
        <h4 id="titulo-confirmacion">{vista.accion}</h4>
        <dl>
          {vista.datos.map((d) => (
            <div key={d.etiqueta} className="tarjeta-confirmacion__dato">
              <dt>{d.etiqueta}</dt>
              <dd>{d.valor}</dd>
            </div>
          ))}
        </dl>
        {vista.irreversible && <p className="tarjeta__irreversible">{vista.irreversible}</p>}
        {!vista.confirmable && vista.motivoNoConfirmable && (
          <p className="tarjeta__motivo" role="status">
            {vista.motivoNoConfirmable}
          </p>
        )}
        <div className="tarjeta__acciones">
          {vista.confirmable && (
            <button type="button" className="boton" onClick={alConfirmar} disabled={ocupado} autoFocus>
              Confirmar
            </button>
          )}
          <button type="button" className="boton boton--secundario" onClick={alCancelar} disabled={ocupado}>
            {vista.confirmable ? 'Cancelar' : 'Entendido'}
          </button>
        </div>
      </article>
    </div>
  );
}
