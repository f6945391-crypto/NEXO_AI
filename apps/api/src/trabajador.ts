import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { cargarEntorno } from './plataforma/entorno';
import { TrabajadorModule } from './trabajador.module';

// Proceso trabajador (AD-01, PROPUESTA-TECNICA.md §3). Se arranca con `node apps/api/dist/trabajador.js`.
async function arrancar() {
  cargarEntorno();
  const app = await NestFactory.createApplicationContext(TrabajadorModule);
  app.enableShutdownHooks();
}

void arrancar();
