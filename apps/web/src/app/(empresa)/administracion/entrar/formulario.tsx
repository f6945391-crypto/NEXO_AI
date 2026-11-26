'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { entrarEnEmpresa, type EstadoFormulario } from '../acciones';

// El mismo formulario que /entrar
export function FormularioEntradaEmpresa() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(entrarEnEmpresa, {});
  return (
    <form action={accion} className="formulario" noValidate>
      <div className="campo">
        <label htmlFor="correo">Correo</label>
        <input id="correo" name="correo" type="email" autoComplete="username" required />
      </div>
      <div className="campo">
        <label htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" name="contrasena" type="password" autoComplete="current-password" required />
        {/* REQ-ACC-19 · T-123 · H-ACC-09: la misma página que desde Entrar; las credenciales son las mismas */}
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
