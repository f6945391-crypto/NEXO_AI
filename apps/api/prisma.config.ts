import { defineConfig } from 'prisma/config';
import { cargarEntorno } from './src/plataforma/entorno';

cargarEntorno();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
