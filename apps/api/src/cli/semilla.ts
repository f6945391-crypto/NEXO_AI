import { cargarEntorno } from '../plataforma/entorno';
import { crearClientePrisma } from '../plataforma/prisma';
import { sembrar } from '../plataforma/semilla';

// Semilla de desarrollo (T-002, ampliada en T-004). Idempotente: solo crea las cuentas que falten.

async function principal(): Promise<void> {
  cargarEntorno();
  const prisma = crearClientePrisma();
  try {
    const { creadas } = await sembrar(prisma);
    console.log(creadas > 0 ? `Semilla aplicada: ${creadas} cuenta(s) nueva(s).` : 'La semilla ya estaba aplicada; no se cambió nada.');
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
