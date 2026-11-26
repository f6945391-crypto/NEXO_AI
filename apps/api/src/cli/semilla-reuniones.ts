import { cargarEntorno } from '../plataforma/entorno';
import { crearClientePrisma } from '../plataforma/prisma';
import { CUENTAS_REUNIONES, sembrarReuniones } from '../plataforma/semilla-reuniones';

// T-136. Cuatro cuentas de «Reuniones Demo» en la base de desarrollo, para conectar calendarios reales.
// Idempotente. Las contraseñas temporales están en src/plataforma/semilla-reuniones.ts; no se imprimen.

async function principal(): Promise<void> {
  cargarEntorno();
  const prisma = crearClientePrisma();
  try {
    const { creadas, equipos } = await sembrarReuniones(prisma);
    console.log(creadas > 0 || equipos > 0 ? `Reuniones Demo: ${creadas} cuenta(s) y ${equipos} equipo(s) nuevos.` : 'Reuniones Demo ya estaba preparada; no se cambió nada.');
    console.log(`Cuentas: ${CUENTAS_REUNIONES.map((c) => c.correo).join(', ')}.`);
    console.log('Cada una: entrar, cambiar la contraseña, Ajustes › conectar Google, y Agenda › Reuniones › autorizar.');
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
