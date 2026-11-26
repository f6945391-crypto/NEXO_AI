import { Injectable, type OnModuleInit } from '@nestjs/common';
import { CambioZonaHorariaCarga, type VistaConfirmacion } from '@nexoai/contratos';
import { fechaLarga, horario, nombreDeZona } from '../agenda/formato';
import { ReplicaEventosRepositorio } from '../agenda/replica-eventos.repositorio';
import { RegistroOperaciones, type EjecutorOperacion, type ResultadoEjecucion } from '../operaciones/registro';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import type { ContextoSolicitud } from './contexto';

// REQ-ACC-10, REQ-ACC-11 · T-009 · specs/06-acceso/plan.md §5.3. Operación `perfil.cambiar_zona_horaria`.
// La propuesta dice qué compromisos se verán a otra hora; los compromisos no se mueven, porque se guardan
// como instantes (H-ACC-04). Solo al confirmar cambia la zona del perfil, y queda en la auditoría.

const MAXIMO_LISTADOS = 10;
const DIA_MS = 24 * 3600_000;

@Injectable()
export class CambiarZonaHoraria implements EjecutorOperacion<CambioZonaHorariaCarga>, OnModuleInit {
  readonly tipo = 'perfil.cambiar_zona_horaria';
  readonly esquema = CambioZonaHorariaCarga;
  // Es un ajuste sobre algo que ya existe, el perfil (DP-01)
  readonly origenes = ['agente', 'control_directo'] as const;
  readonly nombresDeCampos = { zonaHoraria: 'la zona horaria nueva' };

  constructor(
    private readonly registro: RegistroOperaciones,
    private readonly prisma: PrismaService,
    private readonly replica: ReplicaEventosRepositorio,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async proponer(contexto: ContextoSolicitud, carga: CambioZonaHorariaCarga): Promise<VistaConfirmacion> {
    const actual = await this.zonaActual(contexto);
    if (actual === carga.zonaHoraria) throw errorApi(400, 'SOLICITUD_INVALIDA', 'Esa ya es tu zona horaria.');
    const nueva = carga.zonaHoraria;

    // REQ-ACC-11: los compromisos futuros, vigentes y con hora cuya hora local cambia
    const ahora = new Date();
    const futuros = await this.replica.enRango(contexto, ahora, new Date(ahora.getTime() + 366 * DIA_MS));
    const afectados = futuros.filter(
      (e) => e.estado === 'confirmado' && !e.todoElDia && horario(e.inicio, e.fin, actual) !== horario(e.inicio, e.fin, nueva),
    );
    const listados = afectados.slice(0, MAXIMO_LISTADOS).map((e) => ({
      etiqueta: e.titulo,
      valor: `${fechaLarga(e.inicio, actual)}: ${horario(e.inicio, e.fin, actual)} → ${horario(e.inicio, e.fin, nueva)}`,
    }));
    const resto = afectados.length - listados.length;

    return {
      accion: 'Cambiar tu zona horaria',
      datos: [
        { etiqueta: 'Ahora', valor: nombreDeZona(actual, ahora) },
        { etiqueta: 'Nueva', valor: nombreDeZona(nueva, ahora) },
        {
          etiqueta: 'Compromisos',
          valor: afectados.length
            ? `${afectados.length === 1 ? 'Uno se verá' : `${afectados.length} se verán`} a otra hora. Siguen siendo a la misma hora real: solo cambia cómo los ves`
            : 'Ninguno se verá a otra hora',
        },
        ...listados,
        ...(resto > 0 ? [{ etiqueta: 'Y más', valor: `${resto} compromisos más` }] : []),
      ],
      irreversible: null,
      confirmable: true,
      motivoNoConfirmable: null,
    };
  }

  async ejecutar(contexto: ContextoSolicitud, carga: CambioZonaHorariaCarga): Promise<ResultadoEjecucion> {
    const datos = this.prisma.deOrganizacion(contexto.organizacionId);
    const antes = await this.zonaActual(contexto);
    await datos.perfilUsuario.update({ where: { id: contexto.perfilId }, data: { zonaHoraria: carga.zonaHoraria } });
    await datos.eventoAuditoria.create({
      data: {
        organizacionId: contexto.organizacionId,
        perfilId: contexto.perfilId,
        accion: 'perfil.zona-horaria-cambiada',
        detalle: { antes, despues: carga.zonaHoraria },
      },
    });
    return { tipo: 'ejecutada', resultado: { zonaHoraria: carga.zonaHoraria } };
  }

  private async zonaActual(contexto: ContextoSolicitud): Promise<string> {
    const perfil = await this.prisma.deOrganizacion(contexto.organizacionId).perfilUsuario.findUniqueOrThrow({ where: { id: contexto.perfilId } });
    return perfil.zonaHoraria ?? 'UTC';
  }
}
