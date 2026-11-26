import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarCors } from './plataforma/cors';
import { cargarEntorno } from './plataforma/entorno';
import { configurarProxy } from './plataforma/proxy';

async function arrancar() {
  cargarEntorno();
  const app = await NestFactory.create(AppModule);
  configurarProxy(app);
  configurarCors(app);
  await app.listen(Number(process.env.PUERTO ?? 3000));
}

void arrancar();
