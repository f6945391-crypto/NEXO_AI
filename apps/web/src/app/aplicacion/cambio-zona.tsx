'use client';

import { useState, useTransition } from 'react';
import type { OperacionRespuesta } from '@nexoai/contratos';
import { etiquetarZona, useZonas } from '../../lib/zonas';
import { confirmarCambioZona, descartarOperacion, proponerCambioZona } from '../acciones';

// REQ-ACC-10, REQ-ACC-11 · T-027. Cambiar la zona horaria desde Ajustes: primero se ve qué compromisos
// se verán a otra hora, y solo al confirmar cambia algo. La tarjeta la escribe la API (T-009); aquí solo
// se pinta.

type Fase = { paso: 'reposo'; aviso?: string } | { paso: 'eligiendo' } | { paso: 'confirmando'; propuesta: OperacionRespuesta };

export function CambioZona({ zonaActual }: { zonaActual: string | null }) {
  const { zonas } = useZonas();
  const [fase, setFase] = useState<Fase>({ paso: 'reposo' });
  const [elegida, setElegida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, enTransicion] = useTransition();

  function verQueCambia() {
    setError(null);
    enTransicion(async () => {
      const r = await proponerCambioZona(elegida);
      if (r.propuesta) setFase({ paso: 'confirmando', propuesta: r.propuesta });
      else setError(r.error ?? 'No se pudo preparar el cambio.');
    });
  }

  function confirmar(id: string) {
    setError(null);
    enTransicion(async () => {
      const r = await confirmarCambioZona(id);
      if (r.error) setError(r.error);
      else setFase({ paso: 'reposo', aviso: `Listo: tu zona horaria ahora es ${etiquetarZona(elegida)}.` });
    });
  }

  function cancelar() {
    setError(null);
    if (fase.paso === 'confirmando') enTransicion(() => descartarOperacion(fase.propuesta.id));
    setFase({ paso: 'reposo' });
  }

  return (
    <div className="cambio-zona">
      <p className="cambio-zona__actual">{zonaActual ? etiquetarZona(zonaActual) : '—'}</p>

      {fase.paso === 'reposo' && (
        <>
          {fase.aviso && (
            <p className="cambio-zona__aviso" role="status">
              {fase.aviso}
            </p>
          )}
          <button type="button" className="boton-texto" onClick={() => setFase({ paso: 'eligiendo' })}>
            Cambiar zona horaria
          </button>
        </>
      )}

      {fase.paso === 'eligiendo' && (
        <div className="cambio-zona__eleccion">
          <label htmlFor="zona-nueva">Zona horaria nueva</label>
          <select id="zona-nueva" value={elegida} onChange={(e) => setElegida(e.target.value)}>
            <option value="">Elige la zona nueva</option>
            {zonas.map((zona) => (
              <option key={zona.valor} value={zona.valor}>
                {zona.etiqueta}
              </option>
            ))}
          </select>
          <p className="ayuda">Antes de cambiar nada verás qué compromisos se verán a otra hora.</p>
          <div className="cambio-zona__acciones">
            <button type="button" className="boton" disabled={!elegida || ocupado} onClick={verQueCambia}>
              {ocupado ? 'Preparando…' : 'Ver qué cambia'}
            </button>
            <button type="button" className="boton boton--secundario" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {fase.paso === 'confirmando' && (
        <section className="tarjeta-confirmacion" aria-labelledby="titulo-cambio-zona">
          <h4 id="titulo-cambio-zona">{fase.propuesta.vistaConfirmacion.accion}</h4>
          <dl>
            {fase.propuesta.vistaConfirmacion.datos.map((d) => (
              <div key={d.etiqueta} className="tarjeta-confirmacion__dato">
                <dt>{d.etiqueta}</dt>
                <dd>{d.valor}</dd>
              </div>
            ))}
          </dl>
          <div className="cambio-zona__acciones">
            <button type="button" className="boton" disabled={ocupado} onClick={() => confirmar(fase.propuesta.id)}>
              {ocupado ? 'Cambiando…' : 'Confirmar el cambio'}
            </button>
            <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
