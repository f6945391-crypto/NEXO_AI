'use client';

import Link from 'next/link';
import { useState, useTransition, type FormEvent } from 'react';
import { TarjetaAcceso } from '../tarjeta-acceso';
import { confirmarRestablecimiento, type ResultadoConfirmacion } from './acciones';

const TITULO = 'Elige una contraseña nueva';
const MINIMO = 12;

// REQ-ACC-19: la contraseña nueva, dos veces. Lo que se puede comprobar aquí no llega a la API: el largo y que
// las dos coincidan. Si el enlace venció o ya se usó, el mensaje de la API y el camino para pedir otro.
export function ElegirNueva({ token }: { token: string }) {
  const [resultado, setResultado] = useState<ResultadoConfirmacion>({});
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  if (resultado.listo) {
    return (
      <TarjetaAcceso titulo={TITULO}>
        <p className="confirmacion-acceso" role="status">
          Listo. Ya puedes entrar con tu contraseña nueva.
        </p>
        <Link href="/entrar" className="boton">
          Entrar
        </Link>
      </TarjetaAcceso>
    );
  }

  if (resultado.enlaceNoValido) {
    return (
      <TarjetaAcceso titulo={TITULO}>
        <p className="error" role="alert">
          {resultado.enlaceNoValido}
        </p>
        <Link href="/restablecer" className="boton">
          Pedir otro enlace
        </Link>
      </TarjetaAcceso>
    );
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const nueva = String(datos.get('nueva') ?? '');
    const repetida = String(datos.get('repetida') ?? '');
    if (nueva.length < MINIMO) return setErrorLocal('La contraseña nueva necesita al menos 12 caracteres.');
    if (nueva !== repetida) return setErrorLocal('Las dos contraseñas no coinciden.');
    setErrorLocal(null);
    iniciar(async () => setResultado(await confirmarRestablecimiento(token, nueva)));
  }

  const error = errorLocal ?? resultado.error;
  return (
    <TarjetaAcceso titulo={TITULO}>
      <form onSubmit={enviar} className="formulario" noValidate>
        <div className="campo">
          <label htmlFor="nueva">Contraseña nueva</label>
          <input id="nueva" name="nueva" type="password" autoComplete="new-password" minLength={MINIMO} required aria-describedby="ayuda-nueva" />
          <p id="ayuda-nueva" className="ayuda">
            Al menos 12 caracteres. Al cambiarla se cierran todas tus sesiones abiertas.
          </p>
        </div>
        <div className="campo">
          <label htmlFor="repetida">Repite la contraseña</label>
          <input id="repetida" name="repetida" type="password" autoComplete="new-password" minLength={MINIMO} required />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </TarjetaAcceso>
  );
}
