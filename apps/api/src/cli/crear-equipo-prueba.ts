import { cargarEntorno } from '../plataforma/entorno';
import { crearClientePrisma } from '../plataforma/prisma';

async function principal(): Promise<void> {
  cargarEntorno();

  const prisma = crearClientePrisma();

  try {
    const gerente = await prisma.perfilUsuario.findUnique({
      where: { correo: 'gerente@nexoai.test' },
    });

    const colaborador = await prisma.perfilUsuario.findUnique({
      where: { correo: 'colaborador@nexoai.test' },
    });

    if (!gerente || !colaborador) {
      throw new Error('No se encontraron las cuentas de desarrollo.');
    }

    if (gerente.organizacionId !== colaborador.organizacionId) {
      throw new Error('Los usuarios pertenecen a organizaciones distintas.');
    }

    const organizacionId = gerente.organizacionId;
    const nombre = 'Equipo de prueba CUN-05';

    let equipo = await prisma.equipo.findFirst({
      where: { organizacionId, nombre },
    });

    if (!equipo) {
      equipo = await prisma.equipo.create({
        data: { organizacionId, nombre },
      });
    }

    await prisma.miembroDeEquipo.upsert({
      where: {
        equipoId_perfilId: {
          equipoId: equipo.id,
          perfilId: gerente.id,
        },
      },
      update: {},
      create: {
        organizacionId,
        equipoId: equipo.id,
        perfilId: gerente.id,
        rolEnEquipo: 'responsable',
      },
    });

    await prisma.miembroDeEquipo.upsert({
      where: {
        equipoId_perfilId: {
          equipoId: equipo.id,
          perfilId: colaborador.id,
        },
      },
      update: {},
      create: {
        organizacionId,
        equipoId: equipo.id,
        perfilId: colaborador.id,
        rolEnEquipo: 'integrante',
      },
    });

    console.log('Equipo de prueba preparado correctamente.');
    console.log('Equipo:', equipo.nombre);
    console.log('ID:', equipo.id);
    console.log('Integrantes: gerente y colaborador.');
    console.log('Los consentimientos existentes no fueron modificados.');
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
