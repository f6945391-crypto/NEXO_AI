'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EstadoConsentimientoEquipo } from '@nexoai/contratos';
import { obtenerEquipos, obtenerIntegrantes } from '../acciones-equipo';
import { ConsentimientoEquipo } from './consentimiento-equipo';

// T-134 · specs/10-reuniones/plan.md §10: la autorización propia para compartir la disponibilidad, al pie de la
// lista de reuniones (antes estaba en medio de la consulta de CUN-05). Una por equipo, con su responsable y
// cuántas personas tiene (REQ-CUN05-19, H-EQ-01). El cambio es la Operación de CUN-05 (REQ-CUN05-14 a 16).

type Equipo = { id: string; nombre: string; responsable: string | null; integrantes: number; estado: EstadoConsentimientoEquipo | null };

export function AutorizacionesEquipo({ perfilId }: { perfilId: string }) {
  const [equipos, setEquipos] = useState<Equipo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const respuesta = await obtenerEquipos();
    if (!respuesta.datos) {
      setError(respuesta.error);
      return;
    }
    const conEstado = await Promise.all(
      respuesta.datos.map(async (m): Promise<Equipo> => {
        const integrantes = await obtenerIntegrantes(m.equipo.id);
        const yo = integrantes.datos?.find((i) => i.perfilId === perfilId);
        return { id: m.equipo.id, nombre: m.equipo.nombre, responsable: m.responsable?.correo ?? null, integrantes: m.integrantes ?? 0, estado: yo?.estadoConsentimiento ?? null };
      }),
    );
    setError(null);
    setEquipos(conEstado);
  }, [perfilId]);

  useEffect(() => {
    // Carga al abrir el corte; la respuesta llega después, fuera del render
    void cargar();
  }, [cargar]);

  if (error) return <p className="ayuda" role="alert">{error}</p>;
  if (!equipos || equipos.length === 0) return null;

  return (
    <section className="autorizaciones" aria-labelledby="titulo-autorizaciones">
      <h3 id="titulo-autorizaciones">Compartir tu disponibilidad</h3>
      <ul className="autorizaciones__lista">
        {equipos.map((equipo) => (
          <li key={equipo.id} className="autorizaciones__equipo">
            <p className="autorizaciones__nombre">{equipo.nombre}</p>
            <p className="ayuda">
              {equipo.responsable ? `Responsable: ${equipo.responsable}` : 'Sin responsable'} · {equipo.integrantes} {equipo.integrantes === 1 ? 'integrante' : 'integrantes'}
            </p>
            {equipo.estado && (
              <ConsentimientoEquipo
                equipoId={equipo.id}
                estadoActual={equipo.estado}
                bloqueado={false}
                alOcupar={() => undefined}
                alProponer={() => undefined}
                alActualizar={cargar}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
