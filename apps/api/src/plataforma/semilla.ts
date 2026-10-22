import { crearCuenta, crearOrganizacion } from '../identidad/alta-cuentas';
import type { PrismaClient } from './prisma';

// Datos de desarrollo y de prueba. Nunca se ejecuta en producción.
// Las contraseñas son temporales: el primer ingreso obliga a cambiarlas (REQ-ACC-04).
export const ORGANIZACION_DESARROLLO = 'Organización de desarrollo';

export const CUENTAS_DESARROLLO = [
  {
    correo: 'personal@nexoai.test',
    rol: 'usuario_personal',
    plan: 'personal',
    contrasenaTemporal: 'desarrollo-personal-temporal',
  },
  {
    correo: 'gerente@nexoai.test',
    rol: 'gerente',
    plan: 'empresarial',
    contrasenaTemporal: 'desarrollo-gerente-temporal',
  },
] as const;

export async function sembrar(prisma: PrismaClient): Promise<{ creada: boolean }> {
  const existente = await prisma.organizacion.findFirst({ where: { nombre: ORGANIZACION_DESARROLLO } });
  if (existente) return { creada: false };

  const organizacionId = await crearOrganizacion(prisma, ORGANIZACION_DESARROLLO);
  for (const cuenta of CUENTAS_DESARROLLO) {
    await crearCuenta(
      prisma,
      { organizacionId, correo: cuenta.correo, rol: cuenta.rol, plan: cuenta.plan },
      cuenta.contrasenaTemporal,
    );
  }
  return { creada: true };
}
