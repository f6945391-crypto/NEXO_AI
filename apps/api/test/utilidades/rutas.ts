import { RequestMethod, type INestApplication } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';

export interface Ruta {
  metodo: string;
  ruta: string;
}

function unir(...partes: (string | string[] | undefined)[]): string {
  const texto = partes
    .flatMap((p) => (Array.isArray(p) ? p : [p]))
    .filter((p): p is string => !!p && p !== '/')
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .join('/');
  return `/${texto}`;
}

// Lee las rutas de los metadatos de NestJS: cubre todo controlador registrado, en cualquier módulo.
export function listarRutas(app: INestApplication): Ruta[] {
  const rutas: Ruta[] = [];
  for (const modulo of app.get(ModulesContainer).values()) {
    for (const envoltorio of modulo.controllers.values()) {
      const clase = envoltorio.metatype as (new (...args: unknown[]) => object) | null;
      if (!clase) continue;
      const base = Reflect.getMetadata(PATH_METADATA, clase) as string | string[] | undefined;
      for (const nombre of Object.getOwnPropertyNames(clase.prototype)) {
        const manejador = (clase.prototype as Record<string, unknown>)[nombre];
        if (nombre === 'constructor' || typeof manejador !== 'function') continue;
        const ruta = Reflect.getMetadata(PATH_METADATA, manejador) as string | string[] | undefined;
        const metodo = Reflect.getMetadata(METHOD_METADATA, manejador) as RequestMethod | undefined;
        if (ruta === undefined || metodo === undefined) continue;
        rutas.push({ metodo: RequestMethod[metodo], ruta: unir(base, ruta) });
      }
    }
  }
  return rutas.sort((a, b) => `${a.ruta} ${a.metodo}`.localeCompare(`${b.ruta} ${b.metodo}`));
}
