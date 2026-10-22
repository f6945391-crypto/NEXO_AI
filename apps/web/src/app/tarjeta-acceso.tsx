import type { ReactNode } from 'react';

// Armazón de las pantallas de acceso: anteriores a la aplicación, sin navegación.
export function TarjetaAcceso({ titulo, explicacion, children }: { titulo: string; explicacion: string; children: ReactNode }) {
  return (
    <main className="acceso">
      <section className="tarjeta" aria-labelledby="titulo-acceso">
        <p className="marca">NexoAI</p>
        <h1 id="titulo-acceso">{titulo}</h1>
        <p className="explicacion">{explicacion}</p>
        {children}
      </section>
    </main>
  );
}
