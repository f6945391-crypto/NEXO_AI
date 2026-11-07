import { Injectable } from '@nestjs/common';
import { EntradaRegistroEmpresa, VistaConfirmacion } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PrismaService } from '../plataforma/prisma.service';

// specs/08-administracion/plan.md §4.3 y §6 · T-067, T-068. Lecturas del área. Todo se lee aislado por la
// organización de la empresa salvo el correo y el estado de las cuentas afiliadas, que viven en su organización
// personal (opción B): esa es la única lectura con `sinAislar`, justificada en el plan §4.3.
@Injectable()
export class LecturasAdministracion {
  constructor(private readonly prisma: PrismaService) {}

  empresaDe(contexto: ContextoSolicitud): string {
    // Las rutas del área son @EnEmpresa(): la guarda ya comprobó que la pertenencia sigue vigente
    return contexto.empresa!.organizacionId;
  }

  // Correo y estado de cuentas que tienen o tuvieron una pertenencia en la empresa, y nada más (REQ-ADM-08)
  async cuentasDe(empresaId: string, perfilIds: string[]): Promise<Map<string, { correo: string; estado: 'activa' | 'suspendida' | 'cerrada'; primerIngresoPendiente: boolean; plan: string; propia: boolean }>> {
    const unicos = [...new Set(perfilIds)];
    const propias = await this.prisma.deOrganizacion(empresaId).perfilUsuario.findMany({
      where: { id: { in: unicos } },
      select: { id: true, correo: true, estado: true, plan: true, debeCambiarContrasena: true, zonaHoraria: true },
    });
    const resto = unicos.filter((id) => !propias.some((p) => p.id === id));
    // `sinAislar` (plan §4.3, «El administrador ve sus cuentas afiliadas»): solo perfiles con una pertenencia en
    // esta empresa, y solo su correo y su estado. Nunca zona horaria, consentimientos ni nada más.
    const ajenas = resto.length
      ? await this.prisma.sinAislar.perfilUsuario.findMany({
          where: { id: { in: resto }, pertenencias: { some: { organizacionId: empresaId } } },
          select: { id: true, correo: true, estado: true },
        })
      : [];
    const mapa = new Map<string, { correo: string; estado: 'activa' | 'suspendida' | 'cerrada'; primerIngresoPendiente: boolean; plan: string; propia: boolean }>();
    for (const p of propias) {
      mapa.set(p.id, { correo: p.correo, estado: p.estado, plan: p.plan, primerIngresoPendiente: p.debeCambiarContrasena || p.zonaHoraria === null, propia: true });
    }
    // Mientras dure la afiliación tiene el Plan Empresarial (H-ADM-06); su plan propio no se le muestra a la empresa
    for (const p of ajenas) mapa.set(p.id, { correo: p.correo, estado: p.estado, plan: 'empresarial', primerIngresoPendiente: false, propia: false });
    return mapa;
  }

  async registro(contexto: ContextoSolicitud): Promise<EntradaRegistroEmpresa[]> {
    const empresaId = this.empresaDe(contexto);
    const ops = await this.prisma.deOrganizacion(empresaId).operacion.findMany({
      where: { ambito: 'empresa', estado: { in: ['ejecutada', 'fallida'] } },
      orderBy: { creadaEn: 'desc' },
      take: 200,
    });
    const cuentas = await this.cuentasDe(empresaId, ops.map((o) => o.perfilId));
    return ops.map((op) => {
      const vista = VistaConfirmacion.parse(op.vistaConfirmacion);
      return EntradaRegistroEmpresa.parse({
        id: op.id,
        tipo: op.tipo,
        estado: op.estado,
        accion: vista.accion,
        datos: vista.datos,
        por: cuentas.get(op.perfilId)?.correo ?? 'Una cuenta que ya no pertenece a la organización',
        creadaEn: op.creadaEn.toISOString(),
        ejecutadaEn: op.ejecutadaEn?.toISOString() ?? null,
      });
    });
  }
}
