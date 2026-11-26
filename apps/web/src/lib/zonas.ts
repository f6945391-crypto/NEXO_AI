'use client';

import { useEffect, useState } from 'react';

// Zonas horarias para elegir, en el primer ingreso (T-011) y en Ajustes (T-027).

export type Zona = { valor: string; etiqueta: string };

// «America/Lima · GMT-5»: toda hora debe dejar saber en qué huso está (design/CONTEXTO.md).
export function etiquetarZona(zona: string): string {
  try {
    const partes = new Intl.DateTimeFormat('es', { timeZone: zona, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const desfase = partes.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return `${zona.replaceAll('_', ' ')} · ${desfase}`;
  } catch {
    return zona;
  }
}

// Solo en el navegador: la lista y la zona del equipo dependen de él, y así no difieren del servidor.
export function useZonas(): { zonas: Zona[]; deEsteEquipo: Zona | null } {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [deEsteEquipo, setDeEsteEquipo] = useState<Zona | null>(null);
  useEffect(() => {
    const propia = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nombres = new Set(Intl.supportedValuesOf('timeZone'));
    if (propia) nombres.add(propia);
    setZonas([...nombres].sort().map((valor) => ({ valor, etiqueta: etiquetarZona(valor) })));
    if (propia) setDeEsteEquipo({ valor: propia, etiqueta: etiquetarZona(propia) });
  }, []);
  return { zonas, deEsteEquipo };
}
