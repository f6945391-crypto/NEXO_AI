'use client';

import { useActionState, useState } from 'react';
import { useZonas } from '../../lib/zonas';
import { completarPrimerIngreso, type EstadoFormulario } from '../acciones';

export function FormularioPrimerIngreso() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(completarPrimerIngreso, {});
  const { zonas, deEsteEquipo } = useZonas();
  const [elegida, setElegida] = useState('');

  return (
    <form action={accion} className="formulario" noValidate>
      <div className="campo">
        <label htmlFor="contrasenaNueva">Contraseña nueva</label>
        <input
          id="contrasenaNueva"
          name="contrasenaNueva"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          aria-describedby="ayuda-contrasena"
        />
        <p id="ayuda-contrasena" className="ayuda">
          Al menos 12 caracteres, distinta de la temporal.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="zonaHoraria">Zona horaria</label>
        {/* Empieza vacío a propósito: se propone la del equipo, pero la elige la persona (REQ-ACC-05). */}
        <select id="zonaHoraria" name="zonaHoraria" value={elegida} onChange={(e) => setElegida(e.target.value)} required>
          <option value="">Elige tu zona horaria</option>
          {zonas.map((zona) => (
            <option key={zona.valor} value={zona.valor}>
              {zona.etiqueta}
            </option>
          ))}
        </select>
        {deEsteEquipo && elegida !== deEsteEquipo.valor && (
          <button type="button" className="boton-texto" onClick={() => setElegida(deEsteEquipo.valor)}>
            Usar la de este equipo: {deEsteEquipo.etiqueta}
          </button>
        )}
      </div>

      {estado.error && (
        <p className="error" role="alert">
          {estado.error}
        </p>
      )}
      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar y continuar'}
      </button>
    </form>
  );
}
