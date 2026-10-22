import { AltaCuenta } from '@nexoai/contratos';
import type { PrismaClient } from '../plataforma/prisma';
import { calcularHash, generarContrasenaTemporal } from './contrasenas';

// REQ-ACC-01 · H-ACC-01: las cuentas las crea la organización con este servicio, desde un script.
// No hay ninguna ruta HTTP que lo invoque.

export interface CuentaCreada {
  perfilId: string;
  correo: string;
  contrasenaTemporal: string;
}

export async function crearOrganizacion(prisma: PrismaClient, nombre: string): Promise<string> {
  const organizacion = await prisma.organizacion.create({ data: { nombre } });
  await prisma.eventoAuditoria.create({
    data: { organizacionId: organizacion.id, accion: 'organizacion.creada', detalle: { nombre } },
  });
  return organizacion.id;
}

// `contrasenaTemporal` solo se pasa desde la semilla de desarrollo; en un alta real se genera.
export async function crearCuenta(
  prisma: PrismaClient,
  datos: AltaCuenta,
  contrasenaTemporal = generarContrasenaTemporal(),
): Promise<CuentaCreada> {
  const alta = AltaCuenta.parse(datos);
  const hashContrasena = await calcularHash(contrasenaTemporal);

  const perfil = await prisma.$transaction(async (tx) => {
    const creado = await tx.perfilUsuario.create({
      data: {
        organizacionId: alta.organizacionId,
        correo: alta.correo,
        hashContrasena,
        rol: alta.rol,
        plan: alta.plan,
        debeCambiarContrasena: true,
      },
    });
    await tx.eventoAuditoria.create({
      data: {
        organizacionId: alta.organizacionId,
        perfilId: creado.id,
        accion: 'cuenta.creada',
        detalle: { rol: alta.rol, plan: alta.plan },
      },
    });
    return creado;
  });

  return { perfilId: perfil.id, correo: perfil.correo, contrasenaTemporal };
}
