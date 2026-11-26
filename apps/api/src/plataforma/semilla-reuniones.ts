import { crearCuenta, crearOrganizacion } from '../identidad/alta-cuentas';
import type { PrismaClient } from './prisma';

// T-136 · specs/10-reuniones/tasks.md. Cuatro cuentas del Plan Empresarial para probar las reuniones con
// calendarios de Google reales: cada persona entra con su cuenta, cambia la contraseña temporal y conecta un
// Google que maneje desde Ajustes. Datos de desarrollo: nunca se ejecuta en producción. Las contraseñas son
// temporales y el primer ingreso obliga a cambiarlas (REQ-ACC-04), como en `semilla.ts`.
export const ORGANIZACION_REUNIONES = 'Reuniones Demo';

export const CUENTAS_REUNIONES = [
  { clave: 'lider', correo: 'lider@reuniones.test', rol: 'gerente', contrasenaTemporal: 'reuniones-lider-temporal', administrador: true },
  { clave: 'ana', correo: 'ana@reuniones.test', rol: 'colaborador', contrasenaTemporal: 'reuniones-ana-temporal', administrador: false },
  { clave: 'beto', correo: 'beto@reuniones.test', rol: 'colaborador', contrasenaTemporal: 'reuniones-beto-temporal', administrador: false },
  { clave: 'lucia', correo: 'lucia@reuniones.test', rol: 'colaborador', contrasenaTemporal: 'reuniones-lucia-temporal', administrador: false },
] as const;

type Clave = (typeof CUENTAS_REUNIONES)[number]['clave'];

// «Proyecto Alfa» con las cuatro y «Diseño» con el líder y Ana, para probar que «reunión con Ana» pregunta el equipo
const EQUIPOS: { nombre: string; miembros: Clave[] }[] = [
  { nombre: 'Proyecto Alfa', miembros: ['lider', 'ana', 'beto', 'lucia'] },
  { nombre: 'Diseño', miembros: ['lider', 'ana'] },
];

// Idempotente: crea solo lo que falte. La autorización para compartir la disponibilidad queda pendiente:
// la da cada persona desde Agenda › Reuniones (REQ-CUN05-14)
export async function sembrarReuniones(prisma: PrismaClient): Promise<{ creadas: number; equipos: number }> {
  const existente = await prisma.organizacion.findFirst({ where: { nombre: ORGANIZACION_REUNIONES } });
  const organizacionId = existente?.id ?? (await crearOrganizacion(prisma, ORGANIZACION_REUNIONES, 'empresa'));

  let creadas = 0;
  const perfiles = new Map<Clave, string>();
  for (const cuenta of CUENTAS_REUNIONES) {
    const ya = await prisma.perfilUsuario.findUnique({ where: { correo: cuenta.correo } });
    if (ya) {
      perfiles.set(cuenta.clave, ya.id);
      continue;
    }
    const { perfilId } = await crearCuenta(
      prisma,
      { organizacionId, correo: cuenta.correo, rol: cuenta.rol, plan: 'empresarial', administrador: cuenta.administrador },
      cuenta.contrasenaTemporal,
    );
    perfiles.set(cuenta.clave, perfilId);
    creadas++;
  }

  let equipos = 0;
  for (const e of EQUIPOS) {
    const equipo =
      (await prisma.equipo.findFirst({ where: { organizacionId, nombre: e.nombre } })) ??
      (equipos++, await prisma.equipo.create({ data: { organizacionId, nombre: e.nombre } }));
    for (const clave of e.miembros) {
      const perfilId = perfiles.get(clave)!;
      await prisma.miembroDeEquipo.upsert({
        where: { equipoId_perfilId: { equipoId: equipo.id, perfilId } },
        update: {},
        create: { organizacionId, equipoId: equipo.id, perfilId, rolEnEquipo: clave === 'lider' ? 'responsable' : 'integrante' },
      });
    }
  }
  return { creadas, equipos };
}
