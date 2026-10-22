import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function arrancar() {
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PUERTO ?? 3000));
}

void arrancar();
