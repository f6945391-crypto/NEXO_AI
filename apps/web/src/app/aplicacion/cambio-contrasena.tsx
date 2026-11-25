'use client';

import { useState, useTransition } from 'react';
import { cambiarContrasena } from '../acciones';

// REQ-ACC-18 · T-121 · specs/06-acceso/plan.md §5.7. Cambiar la propia contraseña desde Ajustes: la actual y
// una nueva de al menos 12 caracteres. Al cambiarla se cierran las demás sesiones; esta sigue.

type Fase = { paso: 'reposo'; aviso?: string } | { paso: 'editando' };

export function CambioContrasena() {
  const [fase, setFase] = useState<Fase>({ paso: 'reposo' });
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, enTransicion] = useTransition();

  function cerrar(aviso?: string) {
    setActual('');
    setNueva('');
    setError(null);
    setFase({ paso: 'reposo', aviso });
  }

  function cambiar() {
    setError(null);
    enTransicion(async () => {
      const r = await cambiarContrasena(actual, nueva);
      if (r.error) setError(r.error);
      else cerrar('Listo: tu contraseña cambió y se cerraron tus otras sesiones.');
    });
  }

  return (
    <div className="cambio-zona">
      {fase.paso === 'reposo' && (
        <>
          {fase.aviso && (
            <p className="cambio-zona__aviso" role="status">
              {fase.aviso}
            </p>
          )}
          <button type="button" className="boton-texto" onClick={() => setFase({ paso: 'editando' })}>
            Cambiar contraseña
          </button>
        </>
      )}

      {fase.paso === 'editando' && (
        <form
          className="cambio-zona__eleccion"
          onSubmit={(evento) => {
            evento.preventDefault();
            cambiar();
          }}
        >
          <label htmlFor="contrasena-actual">Contraseña actual</label>
          <input id="contrasena-actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
          <label htmlFor="contrasena-nueva">Contraseña nueva</label>
          <input id="contrasena-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <p className="ayuda">Al menos 12 caracteres y distinta de la actual. Se cerrarán tus otras sesiones.</p>
          <div className="cambio-zona__acciones">
            <button type="submit" className="boton" disabled={!actual || !nueva || ocupado}>
              {ocupado ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
            <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => cerrar()}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
