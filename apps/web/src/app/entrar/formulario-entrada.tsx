'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ingresar, type EstadoFormulario } from '../acciones';

export function FormularioEntrada() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(ingresar, {});

  return (
    <form action={accion} className="formulario" noValidate>
      <div className="campo">
        <label htmlFor="correo">Correo</label>
        <input id="correo" name="correo" type="email" autoComplete="username" required />
      </div>
      <div className="campo">
        <label htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" name="contrasena" type="password" autoComplete="current-password" required />
        {/* REQ-ACC-19 · T-123 */}
        <Link href="/restablecer" className="boton-texto">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      {estado.error && (
        <p className="error" role="alert">
          {estado.error}
        </p>
      )}
      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
