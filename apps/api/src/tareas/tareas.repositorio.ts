import { Injectable } from '@nestjs/common';
import type { EstadoTarea, FechaDia } from '@nexoai/contratos';
import type { Quien } from '../integraciones/calendario/proveedor-calendario';
import { PrismaService } from '../plataforma/prisma.service';

// REQ-CUN03-10 · T-048. Lectura de `tarea`, siempre filtrada por el perfil de quien pregunta, además del
// filtro de organización: ni el responsable del equipo ni la organización ven las tareas personales ajenas.

const dia = (f: FechaDia) => new Date(`${f}T00:00:00Z`);

@Injectable()
export class TareasRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  porEstado(quien: Quien, estados: readonly EstadoTarea[]) {
    return this.prisma.deOrganizacion(quien.organizacionId).tarea.findMany({
      where: { perfilId: quien.perfilId, estado: { in: [...estados] } },
      orderBy: { creadaEn: 'desc' },
    });
  }

  porId(quien: Quien, id: string) {
    return this.prisma.deOrganizacion(quien.organizacionId).tarea.findFirst({ where: { id, perfilId: quien.perfilId } });
  }

  // Las pendientes con fecha entre dos días, ambos incluidos (REQ-CUN03-08)
  pendientesEnFechas(quien: Quien, desde: FechaDia, hasta: FechaDia) {
    return this.prisma.deOrganizacion(quien.organizacionId).tarea.findMany({
      where: { perfilId: quien.perfilId, estado: 'pendiente', fecha: { gte: dia(desde), lte: dia(hasta) } },
      orderBy: [{ fecha: 'asc' }, { creadaEn: 'asc' }],
    });
  }

  async zonaDelPerfil(quien: Quien): Promise<string> {
    const perfil = await this.prisma.deOrganizacion(quien.organizacionId).perfilUsuario.findUniqueOrThrow({ where: { id: quien.perfilId } });
    return perfil.zonaHoraria ?? 'UTC';
  }
}
