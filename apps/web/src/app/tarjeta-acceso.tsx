import type { ReactNode } from 'react';

// Armazón de las pantallas de acceso: anteriores a la aplicación, sin navegación. Sin explicación, solo el
// título y el contenido (T-123: lo que se ve tras pedir el enlace o cambiar la contraseña).
export function TarjetaAcceso({ titulo, explicacion, children }: { titulo: string; explicacion?: string; children: ReactNode }) {
  return (
    <main className="acceso">
      <section className="tarjeta" aria-labelledby="titulo-acceso">
        <p className="marca">NexoAI</p>
        <h1 id="titulo-acceso">{titulo}</h1>
        {explicacion && <p className="explicacion">{explicacion}</p>}
        {children}
      </section>
    </main>
  );
}
