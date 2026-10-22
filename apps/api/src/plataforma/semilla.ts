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
  {
    correo: 'colaborador@nexoai.test',
    rol: 'colaborador',
    plan: 'empresarial',
    contrasenaTemporal: 'desarrollo-colaborador-temporal',
  },
] as const;

// Idempotente por cuenta: crea la organización si falta y solo las cuentas que no existan todavía.
export async function sembrar(prisma: PrismaClient): Promise<{ creadas: number }> {
  const existente = await prisma.organizacion.findFirst({ where: { nombre: ORGANIZACION_DESARROLLO } });
  const organizacionId = existente?.id ?? (await crearOrganizacion(prisma, ORGANIZACION_DESARROLLO));

  let creadas = 0;
  for (const cuenta of CUENTAS_DESARROLLO) {
    if (await prisma.perfilUsuario.findUnique({ where: { correo: cuenta.correo } })) continue;
    await crearCuenta(
      prisma,
      { organizacionId, correo: cuenta.correo, rol: cuenta.rol, plan: cuenta.plan },
      cuenta.contrasenaTemporal,
    );
    creadas++;
  }
  return { creadas };
}
