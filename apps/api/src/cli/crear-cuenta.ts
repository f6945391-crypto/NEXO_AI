import { parseArgs } from 'node:util';
import { Plan, Rol, TipoOrganizacion } from '@nexoai/contratos';
import { z } from 'zod';
import { altaDeArranque } from '../identidad/alta-cuentas';
import { cargarEntorno } from '../plataforma/entorno';
import { crearClientePrisma } from '../plataforma/prisma';

// Alta de arranque de una cuenta (REQ-ACC-01, H-ACC-01, REQ-ADM-04). Uso:
//   pnpm --filter @nexoai/api crear-cuenta --organizacion <uuid> --correo <correo> --rol <rol> --plan <plan> [--administrador]
//   pnpm --filter @nexoai/api crear-cuenta --nueva-organizacion "<nombre>" [--tipo personal|empresa] --correo ... --rol ... --plan ...
// Sin --tipo, la organización nueva es de empresa con el Plan Empresarial y personal con los demás. La primera
// cuenta de una empresa nueva es su administradora (T-065, specs/08-administracion/plan.md §3.3).

async function principal(): Promise<void> {
  cargarEntorno();
  const { values: args } = parseArgs({
    options: {
      organizacion: { type: 'string' },
      'nueva-organizacion': { type: 'string' },
      tipo: { type: 'string' },
      administrador: { type: 'boolean' },
      correo: { type: 'string' },
      rol: { type: 'string' },
      plan: { type: 'string' },
    },
  });

  const validacion = z
    .object({ rol: Rol, plan: Plan, tipo: TipoOrganizacion.optional(), correo: z.string() })
    .safeParse({ rol: args.rol, plan: args.plan, tipo: args.tipo, correo: args.correo });
  if (!validacion.success) throw new Error(`Datos de la cuenta no válidos:\n${z.prettifyError(validacion.error)}`);

  const prisma = crearClientePrisma();
  try {
    const { organizacionId, cuenta } = await altaDeArranque(prisma, {
      organizacionId: args.organizacion,
      nuevaOrganizacion: args['nueva-organizacion'],
      administrador: args.administrador,
      ...validacion.data,
    });
    console.log(`Cuenta creada: ${cuenta.correo} (organización ${organizacionId})`);
    console.log(`Contraseña temporal, se muestra una sola vez: ${cuenta.contrasenaTemporal}`);
    console.log('En el primer ingreso se pedirá cambiarla y elegir zona horaria (REQ-ACC-04).');
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
