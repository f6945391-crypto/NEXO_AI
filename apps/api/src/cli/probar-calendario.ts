import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { contratoDelProveedor } from '../integraciones/calendario/contrato';
import { PROVEEDOR_CALENDARIO, type ProveedorCalendario } from '../integraciones/calendario/proveedor-calendario';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { cargarEntorno } from '../plataforma/entorno';
import { PlataformaModule } from '../plataforma/plataforma.module';
import { PrismaService } from '../plataforma/prisma.service';

// T-013 · prueba manual de la implementación real contra Google Calendar, con los mismos pasos que la
// prueba calendario.contrato-del-proveedor. Usa la base de desarrollo y el permiso ya concedido. Uso:
//   pnpm --filter @nexoai/api probar-calendario -- --correo <correo> [--solo-lectura]
// Sin --solo-lectura crea un evento de prueba dentro de 30 días, lo cambia y lo cancela.

@Module({ imports: [PlataformaModule, IntegracionesModule] })
class ModuloPrueba {}

async function principal(): Promise<void> {
  cargarEntorno();
  const { values: args } = parseArgs({ options: { correo: { type: 'string' }, 'solo-lectura': { type: 'boolean' } } });
  if (!args.correo) throw new Error('Indica --correo <correo> de una cuenta con el calendario conectado');

  const app = await NestFactory.createApplicationContext(ModuloPrueba, { logger: ['error'] });
  try {
    // sinAislar: es una herramienta de desarrollo y todavía no se conoce la organización.
    const perfil = await app.get(PrismaService).sinAislar.perfilUsuario.findUniqueOrThrow({ where: { correo: args.correo } });
    const quien = { perfilId: perfil.id, organizacionId: perfil.organizacionId };
    const { pasos, limpiar } = contratoDelProveedor(app.get<ProveedorCalendario>(PROVEEDOR_CALENDARIO), quien);
    try {
      for (const paso of args['solo-lectura'] ? pasos.slice(0, 1) : pasos) {
        await paso.ejecutar();
        console.log(`✓ ${paso.nombre}`);
      }
    } finally {
      await limpiar();
    }
    console.log('El proveedor real cumple el contrato.');
  } finally {
    await app.close();
  }
}

principal().catch((error: unknown) => {
  // Los errores de la API (HttpException) llevan el código y el mensaje en su respuesta.
  const respuesta = (error as { getResponse?: () => unknown }).getResponse?.();
  console.error(respuesta ? JSON.stringify(respuesta) : error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
