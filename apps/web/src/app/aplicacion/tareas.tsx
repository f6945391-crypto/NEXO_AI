'use client';

import { useState, useTransition } from 'react';
import type { Tarea } from '@nexoai/contratos';
import type { Tareas } from '../../lib/tareas';
import { cambiarEstadoDeTarea } from '../acciones';

// T-053 · REQ-CUN03-03, 05, 08 · design/ARQUITECTURA-VISUAL-WEB.md. La sección Tareas: tres franjas, sin
// niveles de período (R-38). Qué franja es cada tarea, el orden y cuáles están atrasadas lo decide la API.
// «Hecho» es un control directo de un toque, sin tarjeta (decisión 2). Crear o cambiar una tarea se le pide al
// asistente, nunca a un formulario (R-42): el estado vacío lleva a pedírselo.

export const FRANJAS = [
  { clave: 'conFecha', nombre: 'Con fecha' },
  { clave: 'sinFecha', nombre: 'Sin fecha' },
  { clave: 'esperando', nombre: 'Esperando de alguien' },
] as const;

const VACIO: Record<(typeof FRANJAS)[number]['clave'], { titulo: string; texto: string }> = {
  conFecha: { titulo: 'No tienes tareas con fecha', texto: 'Pídeselo al asistente con tus palabras, por ejemplo «Recuérdame pagar el recibo el viernes».' },
  sinFecha: { titulo: 'No tienes tareas sin fecha', texto: 'Pídeselo al asistente con tus palabras, por ejemplo «Tengo que renovar mi pasaporte».' },
  esperando: { titulo: 'No esperas nada de nadie', texto: 'Cuéntaselo al asistente, por ejemplo «Estoy esperando que Marta me mande el contrato».' },
};

// Un día del calendario, sin zona: se formatea al mediodía en UTC para que no se corra de día
const dia = (fecha: string) =>
  new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${fecha}T12:00:00Z`));

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

function Detalle({ tarea }: { tarea: Tarea }) {
  const cuando = tarea.fecha ? `${mayuscula(dia(tarea.fecha))}${tarea.hora ? `, ${tarea.hora}` : ''}` : null;
  const espera = tarea.esperaDe ? `Esperas «${tarea.esperaQue}» de ${tarea.esperaDe}` : null;
  if (!cuando && !espera) return null;
  return <p className="tarea__detalle">{[espera, cuando].filter(Boolean).join(' · ')}</p>;
}

export function ListaTareas({ tareas, franja, abrirCaptura }: { tareas: Extract<Tareas, { estado: 'lista' }>; franja: number; abrirCaptura: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [, enTransicion] = useTransition();
  const { clave, nombre } = FRANJAS[franja] ?? FRANJAS[0];
  const lista = tareas[clave];

  function hecha(tarea: Tarea) {
    setError(null);
    setOcupada(tarea.id);
    enTransicion(async () => {
      const resultado = await cambiarEstadoDeTarea(tarea.id, 'completar');
      if (resultado.error) setError(resultado.error);
      setOcupada(null);
    });
  }

  if (lista.length === 0) {
    const vacio = VACIO[clave];
    return (
      <div className="vacio">
        <h2>{vacio.titulo}</h2>
        <p>{vacio.texto}</p>
        <button type="button" className="boton" onClick={abrirCaptura}>
          Pedírselo al asistente
        </button>
      </div>
    );
  }

  return (
    <section className="tareas" aria-label={`Tareas: ${nombre}`}>
      <ol className="tareas__lista" aria-label={nombre}>
        {lista.map((tarea) => (
          <li key={tarea.id} className={`tarea${tarea.atrasada ? ' tarea--atrasada' : ''}`}>
            <button
              type="button"
              className="boton boton--secundario tarea__hecho"
              aria-label={`Marcar como hecha: ${tarea.titulo}`}
              disabled={ocupada === tarea.id}
              onClick={() => hecha(tarea)}
            >
              Hecho
            </button>
            <div>
              <p className="tarea__titulo">
                {tarea.titulo}
                {tarea.atrasada && <span className="etiqueta etiqueta--atrasada">Atrasada</span>}
              </p>
              <Detalle tarea={tarea} />
            </div>
          </li>
        ))}
      </ol>
      {error && (
        <p className="tareas__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
