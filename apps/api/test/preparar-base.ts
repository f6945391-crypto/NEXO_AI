import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ejecutarSql, urlPrueba } from './utilidades/base-prueba';

// Se ejecuta una vez antes de todas las pruebas: deja la base de prueba vacía y aplica las migraciones
// desde cero. Así cada ejecución comprueba que la migración se aplica sobre una base vacía (T-002).
export default async function preparar(): Promise<void> {
  const url = urlPrueba();
  await ejecutarSql('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
