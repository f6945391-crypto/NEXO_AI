'use client';

import type { ConversacionAsistente } from '@nexoai/contratos';
import { useState, useTransition } from 'react';
import { limpiarConversacion } from '../acciones';

// T-159 · REQ-AGT-10 · decisión 41 de 07-agente. En Ajustes: limpia lo que se ve de la conversación. Nada se borra
// y el asistente sigue recordando lo que hicieron; lo que sigue abierto se queda. Confirma con un aviso en la misma
// pantalla, no con una tarjeta: no cambia nada fuera de la vista.

export const AVISO_LIMPIAR = 'Se limpia lo que ves. El asistente sigue recordando lo que hicieron, y lo que esté sin decidir se queda.';

export function LimpiarConversacion({ alLimpiar }: { alLimpiar: (conversacion: ConversacionAsistente) => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, enTransicion] = useTransition();

  function limpiar() {
    setError(null);
    enTransicion(async () => {
      const r = await limpiarConversacion();
      if (r.error || !r.conversacion) {
        setError(r.error ?? 'No se pudo limpiar la conversación.');
        return;
      }
      setConfirmando(false);
      setAviso('Listo: la conversación quedó limpia.');
      alLimpiar(r.conversacion);
    });
  }

  return (
    <section className="permisos" aria-labelledby="titulo-conversacion">
      <h3 id="titulo-conversacion">Conversación</h3>
      <p className="explicacion">Deja en blanco la conversación con el asistente, en la web y en el móvil. No borra nada de tu agenda ni de tus tareas.</p>
      {aviso && !confirmando && (
        <p className="cambio-zona__aviso" role="status">
          {aviso}
        </p>
      )}
      {!confirmando ? (
        <button
          type="button"
          className="boton boton--secundario"
          onClick={() => {
            setAviso(null);
            setConfirmando(true);
          }}
        >
          Limpiar conversación
        </button>
      ) : (
        <div className="cambio-zona__eleccion" role="group" aria-label="Limpiar conversación">
          <p className="ayuda">{AVISO_LIMPIAR}</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="cambio-zona__acciones">
            <button type="button" className="boton" disabled={ocupado} onClick={limpiar}>
              {ocupado ? 'Limpiando…' : 'Sí, limpiar'}
            </button>
            <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
