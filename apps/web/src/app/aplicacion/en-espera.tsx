'use client';

import { useState } from 'react';
import type { CosaEnEspera } from '../../lib/asistente';

// T-045 · REQ-CAP-25. Lo que está en espera se ve fuera de la conversación: una franja encima de la
// agenda de hoy con cuántas cosas son; al abrirla, cada una con lo que se pidió y por qué espera. Sin
// botón de retirar: esa decisión sigue abierta.

const cuantas = (n: number) => (n === 1 ? '1 cosa en espera' : `${n} cosas en espera`);

export function FranjaEnEspera({ cosas }: { cosas: CosaEnEspera[] }) {
  const [abierta, setAbierta] = useState(false);
  if (cosas.length === 0) return null;
  return (
    <section className="en-espera" aria-label="En espera">
      <button type="button" className="en-espera__resumen" aria-expanded={abierta} aria-controls="lista-en-espera" onClick={() => setAbierta((valor) => !valor)}>
        <span className="en-espera__marca" aria-hidden="true" />
        <span className="en-espera__cuantas">{cuantas(cosas.length)}</span>
        <span className="en-espera__accion">{abierta ? 'Ocultar' : 'Ver'}</span>
      </button>
      {abierta && (
        <ul id="lista-en-espera" className="en-espera__lista">
          {cosas.map((cosa) => (
            <li key={cosa.id}>
              <p className="en-espera__pedido">«{cosa.pedido}»</p>
              {cosa.motivo && <p className="en-espera__motivo">{cosa.motivo}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
