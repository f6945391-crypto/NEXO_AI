import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globales.css';

export const metadata: Metadata = {
  title: 'NexoAI',
  description: 'Asistente personal inteligente',
};

export default function DisposicionRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
