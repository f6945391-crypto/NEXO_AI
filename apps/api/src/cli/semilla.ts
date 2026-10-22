import { cargarEntorno } from '../plataforma/entorno';
import { crearClientePrisma } from '../plataforma/prisma';
import { sembrar } from '../plataforma/semilla';

// Semilla de desarrollo (T-002). Es idempotente: si la organización de desarrollo ya existe, no hace nada.

async function principal(): Promise<void> {
  cargarEntorno();
  const prisma = crearClientePrisma();
  try {
    const resultado = await sembrar(prisma);
    console.log(resultado.creada ? 'Semilla aplicada.' : 'La semilla ya estaba aplicada; no se cambió nada.');
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
