// T-123. El móvil no instala los tipos de Node (`types: []` en tsconfig.json), y `movil.restablecer` necesita leer
// el archivo de correos del simulado. Solo lo que esa prueba usa; con la misma forma que @types/node, para no
// chocar con él si algún día se instala.
declare module 'node:fs' {
  export function existsSync(ruta: string): boolean;
  export function mkdirSync(ruta: string, opciones?: { recursive?: boolean }): string | undefined;
  export function readFileSync(ruta: string, codificacion: 'utf8'): string;
}

declare module 'node:path' {
  export function dirname(ruta: string): string;
  export function resolve(...partes: string[]): string;
}

declare var __dirname: string;
