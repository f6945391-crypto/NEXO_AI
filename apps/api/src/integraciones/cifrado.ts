import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { requerirVariable } from '../plataforma/entorno';

// Tokens de integración cifrados en reposo con AES-256-GCM (propuesta técnica §9, plan de acceso §5.4).
// La clave viene de TOKENS_CLAVE_CIFRADO y nunca se escribe en el registro.

function clave(): Buffer {
  const valor = Buffer.from(requerirVariable('TOKENS_CLAVE_CIFRADO'), 'base64');
  if (valor.length !== 32) throw new Error('TOKENS_CLAVE_CIFRADO tiene que ser de 32 bytes en base64');
  return valor;
}

// Formato: iv.etiqueta.cifrado, en base64url.
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', clave(), iv);
  const cifrado = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
  return [iv, cifrador.getAuthTag(), cifrado].map((b) => b.toString('base64url')).join('.');
}

export function descifrar(guardado: string): string {
  const [iv, etiqueta, cifrado] = guardado.split('.').map((p) => Buffer.from(p, 'base64url'));
  if (!iv || !etiqueta || !cifrado) throw new Error('Token cifrado con formato desconocido');
  const descifrador = createDecipheriv('aes-256-gcm', clave(), iv);
  descifrador.setAuthTag(etiqueta);
  return Buffer.concat([descifrador.update(cifrado), descifrador.final()]).toString('utf8');
}
