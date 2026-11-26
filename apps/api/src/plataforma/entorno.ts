import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Carga el .env de la raíz del monorepo si existe. Las variables ya definidas no se sobrescriben.
export function cargarEntorno(): void {
  const archivo = resolve(__dirname, '../../../../.env');
  if (existsSync(archivo)) process.loadEnvFile(archivo);
}

export function requerirVariable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Ver .env.example`);
  return valor;
}
