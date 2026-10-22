import { Client } from 'pg';
import { crearClientePrisma, type PrismaClient } from '../../src/plataforma/prisma';

// Toda prueba con base de datos usa DATABASE_URL_PRUEBA. Vaciar solo se permite sobre una base *_prueba.
export function urlPrueba(): string {
  const url = process.env.DATABASE_URL_PRUEBA;
  if (!url) throw new Error('Falta DATABASE_URL_PRUEBA. Ver .env.example y levanta la base con `docker compose up -d`');
  const nombre = new URL(url).pathname.replace(/^\//, '');
  if (!nombre.endsWith('_prueba')) {
    throw new Error(`DATABASE_URL_PRUEBA apunta a «${nombre}»; las pruebas solo vacían bases cuyo nombre termina en _prueba`);
  }
  return url;
}

export function clientePrueba(): PrismaClient {
  return crearClientePrisma(urlPrueba());
}

export async function ejecutarSql(sql: string): Promise<void> {
  const cliente = new Client({ connectionString: urlPrueba() });
  await cliente.connect();
  try {
    await cliente.query(sql);
  } finally {
    await cliente.end();
  }
}

export async function vaciarTablas(): Promise<void> {
  await ejecutarSql('TRUNCATE sesion_renovacion, evento_auditoria, perfil_usuario, organizacion CASCADE');
}
