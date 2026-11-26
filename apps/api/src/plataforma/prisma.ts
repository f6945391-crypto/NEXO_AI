import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generado/prisma/client';
import { requerirVariable } from './entorno';

export { PrismaClient };

export function crearClientePrisma(url = requerirVariable('DATABASE_URL')): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
