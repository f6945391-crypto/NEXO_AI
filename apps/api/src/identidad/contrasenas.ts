import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

// argon2id, el algoritmo por defecto de @node-rs/argon2 (specs/06-acceso/plan.md §6).
export function calcularHash(contrasena: string): Promise<string> {
  return hash(contrasena);
}

export function verificarContrasena(hashGuardado: string, contrasena: string): Promise<boolean> {
  return verify(hashGuardado, contrasena);
}

// 16 caracteres aleatorios. Solo se muestra una vez, a quien da el alta.
export function generarContrasenaTemporal(): string {
  return randomBytes(12).toString('base64url');
}
