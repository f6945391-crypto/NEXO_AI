'use client';

import { useActionState, useEffect, useState } from 'react';
import { completarPrimerIngreso, type EstadoFormulario } from '../acciones';

type Zona = { valor: string; etiqueta: string };

// «America/Lima · GMT-5»: toda hora debe dejar saber en qué huso está (design/CONTEXTO.md).
function etiquetar(zona: string): string {
  try {
    const partes = new Intl.DateTimeFormat('es', { timeZone: zona, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const desfase = partes.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return `${zona.replaceAll('_', ' ')} · ${desfase}`;
  } catch {
    return zona;
  }
}

export function FormularioPrimerIngreso() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(completarPrimerIngreso, {});
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [deEsteEquipo, setDeEsteEquipo] = useState<Zona | null>(null);
  const [elegida, setElegida] = useState('');

  // Solo en el navegador: la lista y la zona del equipo dependen de él, y así no difieren del servidor.
  useEffect(() => {
    const propia = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nombres = new Set(Intl.supportedValuesOf('timeZone'));
    if (propia) nombres.add(propia);
    setZonas([...nombres].sort().map((valor) => ({ valor, etiqueta: etiquetar(valor) })));
    if (propia) setDeEsteEquipo({ valor: propia, etiqueta: etiquetar(propia) });
  }, []);

  return (
    <form action={accion} className="formulario" noValidate>
      <div className="campo">
        <label htmlFor="contrasenaNueva">Contraseña nueva</label>
        <input
          id="contrasenaNueva"
          name="contrasenaNueva"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          aria-describedby="ayuda-contrasena"
        />
        <p id="ayuda-contrasena" className="ayuda">
          Al menos 12 caracteres, distinta de la temporal.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="zonaHoraria">Zona horaria</label>
        {/* Empieza vacío a propósito: se propone la del equipo, pero la elige la persona (REQ-ACC-05). */}
        <select id="zonaHoraria" name="zonaHoraria" value={elegida} onChange={(e) => setElegida(e.target.value)} required>
          <option value="">Elige tu zona horaria</option>
          {zonas.map((zona) => (
            <option key={zona.valor} value={zona.valor}>
              {zona.etiqueta}
            </option>
          ))}
        </select>
        {deEsteEquipo && elegida !== deEsteEquipo.valor && (
          <button type="button" className="boton-texto" onClick={() => setElegida(deEsteEquipo.valor)}>
            Usar la de este equipo: {deEsteEquipo.etiqueta}
          </button>
        )}
      </div>

      {estado.error && (
        <p className="error" role="alert">
          {estado.error}
        </p>
      )}
      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar y continuar'}
      </button>
    </form>
  );
}
