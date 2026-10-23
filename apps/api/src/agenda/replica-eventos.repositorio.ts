import { Injectable } from '@nestjs/common';
import type { Quien } from '../integraciones/calendario/proveedor-calendario';
import { PrismaService } from '../plataforma/prisma.service';

// REQ-CUN01-09 · T-014. Lectura de evento_agenda, siempre filtrada por el perfil de quien pregunta,
// además del filtro de organización: un gerente tampoco ve la agenda de su equipo por aquí.

@Injectable()
export class ReplicaEventosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  // Los eventos que tocan el rango, también los cancelados, que quedan a la vista como tales (R-25).
  enRango(quien: Quien, desde: Date, hasta: Date) {
    return this.prisma.deOrganizacion(quien.organizacionId).eventoAgenda.findMany({
      where: { perfilId: quien.perfilId, inicio: { lt: hasta }, fin: { gt: desde } },
      orderBy: [{ inicio: 'asc' }, { fin: 'asc' }],
    });
  }

  porId(quien: Quien, id: string) {
    return this.prisma.deOrganizacion(quien.organizacionId).eventoAgenda.findFirst({ where: { id, perfilId: quien.perfilId } });
  }
}
