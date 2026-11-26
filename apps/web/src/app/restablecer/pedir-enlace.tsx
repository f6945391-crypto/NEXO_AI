'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { TarjetaAcceso } from '../tarjeta-acceso';
import { pedirEnlace, type EstadoPedido } from './acciones';

const TITULO = 'Restablecer tu contraseña';

// REQ-ACC-19: el mismo mensaje exista o no la cuenta
export function PedirEnlace() {
  const [estado, accion, enviando] = useActionState<EstadoPedido, FormData>(pedirEnlace, {});

  if (estado.enviado) {
    return (
      <TarjetaAcceso titulo={TITULO}>
        <p className="confirmacion-acceso" role="status">
          Si ese correo tiene una cuenta en NexoAI, te enviamos un enlace. Revisa tu bandeja de entrada y el correo no deseado. El enlace vence en 30 minutos.
        </p>
        <Link href="/entrar" className="boton-texto">
          Volver a Entrar
        </Link>
      </TarjetaAcceso>
    );
  }

  return (
    <TarjetaAcceso
      titulo={TITULO}
      explicacion="Escribe el correo con el que entras a NexoAI. Si tiene una cuenta, te enviaremos un enlace para elegir una contraseña nueva."
    >
      <form action={accion} className="formulario" noValidate>
        <div className="campo">
          <label htmlFor="correo">Correo</label>
          <input id="correo" name="correo" type="email" autoComplete="username" required />
        </div>
        {estado.error && (
          <p className="error" role="alert">
            {estado.error}
          </p>
        )}
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>
      <Link href="/entrar" className="boton-texto">
        Volver a Entrar
      </Link>
    </TarjetaAcceso>
  );
}
