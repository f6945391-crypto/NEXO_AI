import { parseArgs } from 'node:util';
import { AltaCuenta } from '@nexoai/contratos';
import { z } from 'zod';
import { crearCuenta, crearOrganizacion } from '../identidad/alta-cuentas';
import { cargarEntorno } from '../plataforma/entorno';
import { crearClientePrisma } from '../plataforma/prisma';

// Alta de una cuenta (REQ-ACC-01, H-ACC-01). Uso:
//   pnpm --filter @nexoai/api crear-cuenta -- --organizacion <uuid> --correo <correo> --rol <rol> --plan <plan>
//   pnpm --filter @nexoai/api crear-cuenta -- --nueva-organizacion "<nombre>" --correo ... --rol ... --plan ...

async function principal(): Promise<void> {
  cargarEntorno();
  const { values: args } = parseArgs({
    options: {
      organizacion: { type: 'string' },
      'nueva-organizacion': { type: 'string' },
      correo: { type: 'string' },
      rol: { type: 'string' },
      plan: { type: 'string' },
    },
  });
  if (!args.organizacion === !args['nueva-organizacion']) {
    throw new Error('Indica --organizacion <uuid> o --nueva-organizacion "<nombre>", uno de los dos');
  }

  // Se valida todo antes de escribir: un dato inválido no puede dejar una organización creada a medias.
  const validacion = AltaCuenta.omit({ organizacionId: true }).safeParse({
    correo: args.correo,
    rol: args.rol,
    plan: args.plan,
  });
  if (!validacion.success) throw new Error(`Datos de la cuenta no válidos:\n${z.prettifyError(validacion.error)}`);

  const prisma = crearClientePrisma();
  try {
    const organizacionId = args.organizacion ?? (await crearOrganizacion(prisma, args['nueva-organizacion']!));
    const cuenta = await crearCuenta(prisma, { organizacionId, ...validacion.data });
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
