import type { EventoCalendario, ProveedorCalendario, Quien } from './proveedor-calendario';

// T-013 · prueba calendario.contrato-del-proveedor. Lo que toda implementación de ProveedorCalendario
// tiene que cumplir. Lo ejecutan las pruebas contra la simulada y `probar-calendario` contra Google,
// para que las dos se comprueben con exactamente los mismos pasos.
//
// Crea un único evento de prueba, lo cambia y lo cancela. `limpiar` lo cancela si un paso falla a medias.

export interface PasoContrato {
  nombre: string;
  ejecutar(): Promise<void>;
}

export const TITULO_PRUEBA = 'NexoAI · prueba de contrato (se borra sola)';

function afirmar(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(`Contrato del proveedor de calendario: ${mensaje}`);
}

export function contratoDelProveedor(proveedor: ProveedorCalendario, quien: Quien, ahora = new Date()) {
  const DIA = 24 * 3600_000;
  // Dentro de 30 días, en una hora en punto, media hora: lejos de la agenda de hoy
  const inicio = new Date(Math.ceil((ahora.getTime() + 30 * DIA) / 3600_000) * 3600_000);
  const fin = new Date(inicio.getTime() + 30 * 60_000);
  const zonaHoraria = 'America/Lima';
  let token = '';
  let creado: EventoCalendario | undefined;
  let cancelado = false;

  async function incremental() {
    const r = await proveedor.listar(quien, { tipo: 'incremental', syncToken: token });
    afirmar(r.syncToken, 'la lectura incremental no devolvió token');
    token = r.syncToken;
    return r.cambios.filter((c) => (c.tipo === 'evento' ? c.evento.id : c.id) === creado?.id);
  }

  const pasos: PasoContrato[] = [
    {
      nombre: 'la lectura completa devuelve un token y cada evento con su zona horaria',
      async ejecutar() {
        const r = await proveedor.listar(quien, { tipo: 'completa', desde: new Date(ahora.getTime() - 30 * DIA), hasta: new Date(ahora.getTime() + 365 * DIA) });
        afirmar(r.syncToken, 'la lectura completa no devolvió token');
        for (const c of r.cambios) {
          if (c.tipo !== 'evento') continue;
          afirmar(c.evento.id, 'un evento sin id');
          afirmar(c.evento.zonaHoraria, `el evento ${c.evento.id} no tiene zona horaria`);
          afirmar(!Number.isNaN(c.evento.inicio.getTime()) && c.evento.inicio <= c.evento.fin, `el evento ${c.evento.id} tiene horas inválidas`);
        }
        token = r.syncToken;
      },
    },
    {
      nombre: 'crear devuelve el evento tal como quedó, del que la persona es organizadora',
      async ejecutar() {
        creado = await proveedor.crear(quien, { titulo: TITULO_PRUEBA, inicio, fin, zonaHoraria });
        afirmar(creado.id, 'el evento creado no tiene id');
        afirmar(creado.titulo === TITULO_PRUEBA, `título «${creado.titulo}»`);
        afirmar(creado.inicio.getTime() === inicio.getTime() && creado.fin.getTime() === fin.getTime(), 'las horas no coinciden con las pedidas');
        afirmar(creado.zonaHoraria === zonaHoraria, `zona «${creado.zonaHoraria}»`);
        afirmar(creado.esOrganizador && !creado.todoElDia, 'el evento creado no es propio o es de todo el día');
      },
    },
    {
      nombre: 'la lectura incremental trae el evento creado',
      async ejecutar() {
        const cambios = await incremental();
        afirmar(cambios.some((c) => c.tipo === 'evento'), 'no aparece el evento creado');
      },
    },
    {
      nombre: 'actualizar cambia solo lo indicado',
      async ejecutar() {
        afirmar(creado, 'no hay evento creado');
        const nuevo = await proveedor.actualizar(quien, creado.id, { titulo: `${TITULO_PRUEBA} · cambiado`, zonaHoraria });
        afirmar(nuevo.titulo === `${TITULO_PRUEBA} · cambiado`, 'el título no cambió');
        afirmar(nuevo.inicio.getTime() === inicio.getTime() && nuevo.fin.getTime() === fin.getTime(), 'cambiaron las horas');
        afirmar(nuevo.etag !== creado.etag, 'el etag no cambió');
      },
    },
    {
      nombre: 'la lectura incremental trae el cambio',
      async ejecutar() {
        const cambios = await incremental();
        afirmar(cambios.some((c) => c.tipo === 'evento' && c.evento.titulo.endsWith('· cambiado')), 'no aparece el cambio');
      },
    },
    {
      nombre: 'cancelar dos veces no falla',
      async ejecutar() {
        afirmar(creado, 'no hay evento creado');
        await proveedor.cancelar(quien, creado.id);
        cancelado = true;
        await proveedor.cancelar(quien, creado.id);
      },
    },
    {
      nombre: 'la lectura incremental trae el borrado como cancelado (R-25)',
      async ejecutar() {
        const cambios = await incremental();
        afirmar(cambios.some((c) => c.tipo === 'cancelado'), 'el borrado no llega como cancelado');
      },
    },
  ];

  async function limpiar() {
    if (creado && !cancelado) await proveedor.cancelar(quien, creado.id);
  }

  return { pasos, limpiar };
}
