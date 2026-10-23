import { Inject, Injectable } from '@nestjs/common';
import { ClienteGoogle } from '../integraciones/cliente-google';
import {
  PROVEEDOR_CALENDARIO,
  SincronizacionCaducada,
  type CambioCalendario,
  type EventoCalendario,
  type ProveedorCalendario,
  type Quien,
} from '../integraciones/calendario/proveedor-calendario';
import { PrismaService } from '../plataforma/prisma.service';

// REQ-CUN01-09, REQ-CUN01-10 · T-014 · specs/02-agenda/plan.md §4. Copia el calendario principal de
// Google en evento_agenda (AD-10). Lee completo la primera vez, y después solo lo que cambió.

const DIA_MS = 24 * 3600_000;
// Ventana de la lectura completa: 30 días atrás, 365 adelante
export const VENTANA_ATRAS_DIAS = 30;
export const VENTANA_ADELANTE_DIAS = 365;
// H-AG-09: la lectura incremental solo trae lo que cambia, así que lo que ya existía más allá de la
// ventana no entra en ella hasta que cambie. Se vuelve a leer completo cuando la ventana ha avanzado
// 30 días, para que siempre cubra al menos 335 días por delante.
export const RENOVAR_VENTANA_DIAS = 30;

export type ResultadoSincronizacion =
  | { tipo: 'completa' | 'incremental'; cambios: number }
  // Sin permiso de calendario no se llama al proveedor (REQ-CUN01-08, REQ-ACC-09)
  | { tipo: 'sin_permiso' };

const esClaveRepetida = (error: unknown) => (error as { code?: string }).code === 'P2002';

@Injectable()
export class SincronizadorCalendario {
  // Una sola sincronización a la vez por perfil dentro de un proceso: dos consultas seguidas comparten la misma.
  private readonly enCurso = new Map<string, Promise<ResultadoSincronizacion>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly google: ClienteGoogle,
    @Inject(PROVEEDOR_CALENDARIO) private readonly proveedor: ProveedorCalendario,
  ) {}

  sincronizar(quien: Quien, ahora = new Date()): Promise<ResultadoSincronizacion> {
    const actual = this.enCurso.get(quien.perfilId);
    if (actual) return actual;
    const nueva = this.ejecutar(quien, ahora).finally(() => this.enCurso.delete(quien.perfilId));
    this.enCurso.set(quien.perfilId, nueva);
    return nueva;
  }

  // Cuándo se sincronizó por última vez; nulo si nunca.
  async ultimaSincronizacion(quien: Quien): Promise<Date | null> {
    const fila = await this.datos(quien).sincronizacionCalendario.findUnique({ where: { perfilId: quien.perfilId } });
    return fila?.ultimaSincronizacion ?? null;
  }

  private async ejecutar(quien: Quien, ahora: Date): Promise<ResultadoSincronizacion> {
    if (!(await this.google.tienePermiso(quien, 'calendario'))) return { tipo: 'sin_permiso' };

    const estado = await this.datos(quien).sincronizacionCalendario.findUnique({ where: { perfilId: quien.perfilId } });
    const ventanaVigente = estado && estado.ventanaHasta.getTime() > ahora.getTime() + (VENTANA_ADELANTE_DIAS - RENOVAR_VENTANA_DIAS) * DIA_MS;
    if (estado?.syncToken && ventanaVigente) {
      try {
        const r = await this.proveedor.listar(quien, { tipo: 'incremental', syncToken: estado.syncToken });
        await this.aplicar(quien, r.cambios, ahora);
        await this.datos(quien).sincronizacionCalendario.update({
          where: { perfilId: quien.perfilId },
          data: { syncToken: r.syncToken, ultimaSincronizacion: ahora },
        });
        return { tipo: 'incremental', cambios: r.cambios.length };
      } catch (error) {
        // El 410 de Google: el token ya no vale y se vuelve a leer completo
        if (!(error instanceof SincronizacionCaducada)) throw error;
      }
    }
    return this.completa(quien, ahora);
  }

  private async completa(quien: Quien, ahora: Date): Promise<ResultadoSincronizacion> {
    const desde = new Date(ahora.getTime() - VENTANA_ATRAS_DIAS * DIA_MS);
    const hasta = new Date(ahora.getTime() + VENTANA_ADELANTE_DIAS * DIA_MS);
    const r = await this.proveedor.listar(quien, { tipo: 'completa', desde, hasta });
    await this.aplicar(quien, r.cambios, ahora);

    // Lo que la réplica tenía en la ventana y Google ya no trae se borró allí: queda cancelado (R-25).
    const vigentes = r.cambios.flatMap((c) => (c.tipo === 'evento' ? [c.evento.id] : []));
    await this.datos(quien).eventoAgenda.updateMany({
      where: { perfilId: quien.perfilId, estado: 'confirmado', inicio: { lt: hasta }, fin: { gt: desde }, googleEventoId: { notIn: vigentes } },
      data: { estado: 'cancelado', sincronizadoEn: ahora },
    });

    const fila = { syncToken: r.syncToken, ventanaDesde: desde, ventanaHasta: hasta, ultimaSincronizacion: ahora };
    await this.datos(quien).sincronizacionCalendario.upsert({
      where: { perfilId: quien.perfilId },
      create: { perfilId: quien.perfilId, organizacionId: quien.organizacionId, ...fila },
      update: fila,
    });
    return { tipo: 'completa', cambios: r.cambios.length };
  }

  private async aplicar(quien: Quien, cambios: CambioCalendario[], ahora: Date): Promise<void> {
    for (const cambio of cambios) {
      if (cambio.tipo === 'cancelado') {
        // Nunca se borra de la réplica: se marca (R-25)
        await this.datos(quien).eventoAgenda.updateMany({
          where: { perfilId: quien.perfilId, googleEventoId: cambio.id },
          data: { estado: 'cancelado', sincronizadoEn: ahora },
        });
        continue;
      }
      await this.incorporar(quien, cambio.evento, ahora);
    }
  }

  // Guarda en la réplica un evento tal como lo devolvió Google. Lo usan la sincronización y las
  // Operaciones de agenda tras escribir (REQ-CUN01-04: la réplica queda con la respuesta, no con lo pedido).
  async incorporar(quien: Quien, e: EventoCalendario, ahora = new Date()) {
    const fila = {
      etag: e.etag,
      titulo: e.titulo,
      inicio: e.inicio,
      fin: e.fin,
      zonaHoraria: e.zonaHoraria,
      todoElDia: e.todoElDia,
      esOrganizador: e.esOrganizador,
      serieId: e.serieId,
      estado: 'confirmado' as const,
      sincronizadoEn: ahora,
    };
    const guardar = () =>
      this.datos(quien).eventoAgenda.upsert({
        where: { perfilId_googleEventoId: { perfilId: quien.perfilId, googleEventoId: e.id } },
        create: { perfilId: quien.perfilId, organizacionId: quien.organizacionId, googleCalendarioId: 'primary', googleEventoId: e.id, ...fila },
        update: fila,
      });
    // El trabajador y una consulta pueden crear el mismo evento a la vez; el segundo intento lo actualiza.
    return guardar().catch((error: unknown) => (esClaveRepetida(error) ? guardar() : Promise.reject(error)));
  }

  private datos(quien: Quien) {
    return this.prisma.deOrganizacion(quien.organizacionId);
  }
}
