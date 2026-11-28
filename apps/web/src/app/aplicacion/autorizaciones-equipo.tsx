'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EstadoConsentimientoEquipo } from '@nexoai/contratos';
import { obtenerEquipos, obtenerIntegrantes } from '../acciones-equipo';
import { ConsentimientoEquipo } from './consentimiento-equipo';

// T-146 · D-REU-36 (reemplaza a D-REU-32): la autorización propia para compartir la disponibilidad, en Ajustes,
// apartado «Disponibilidad para tu equipo». Una fila por equipo, con su responsable y cuántas personas tiene
// (REQ-CUN05-19, H-EQ-01), el estado y el botón. El cambio es la Operación de CUN-05 (REQ-CUN05-14 a 16).
// Lo pinta Ajustes solo con plan efectivo Empresarial y algún equipo (REQ-CUN05-18).

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
    // Carga al abrir Ajustes; la respuesta llega después, fuera del render
    void cargar();
  }, [cargar]);

  if (!error && equipos?.length === 0) return null;

  return (
    <section className="permisos autorizaciones" aria-labelledby="titulo-autorizaciones">
      <h3 id="titulo-autorizaciones">Disponibilidad para tu equipo</h3>
      <p className="explicacion">Autoriza a cada equipo a ver tus horas libres y ocupadas para buscar horario de reunión. No se comparten títulos ni detalles, y puedes retirarlo cuando quieras.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!error && !equipos && <p className="explicacion">Leyendo tus equipos…</p>}
      {equipos && equipos.length > 0 && (
        <ul aria-label="Tus equipos">
          {equipos.map((equipo) => {
            const autorizado = equipo.estado === 'concedida';
            return (
              <li key={equipo.id} className="permiso autorizacion">
                <div>
                  <p className="permiso__nombre">
                    {equipo.nombre}{' '}
                    <span className={`etiqueta${autorizado ? ' etiqueta--concedido' : ''}`}>{autorizado ? 'Autorizado' : 'Sin autorizar'}</span>
                  </p>
                  <p className="permiso__para">
                    {equipo.responsable ? `Responsable: ${equipo.responsable}` : 'Sin responsable'} · {equipo.integrantes} {equipo.integrantes === 1 ? 'integrante' : 'integrantes'}
                  </p>
                </div>
                {equipo.estado && (
                  <ConsentimientoEquipo
                    variante="fila"
                    nombreEquipo={equipo.nombre}
                    equipoId={equipo.id}
                    estadoActual={equipo.estado}
                    bloqueado={false}
                    alOcupar={() => undefined}
                    alProponer={() => undefined}
                    alActualizar={cargar}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
