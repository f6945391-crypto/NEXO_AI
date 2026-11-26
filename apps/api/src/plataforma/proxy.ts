import type { INestApplication } from '@nestjs/common';

// T-141 · H-ACC-17 · specs/06-acceso/plan.md §5.10. En producción la API queda detrás de un proxy inverso que pone
// el HTTPS. Sin esto, todas las peticiones llegarían con la IP del proxy, y el límite de intentos (por IP y correo)
// sería uno solo para todo el mundo. Con CONFIAR_EN_PROXY=1 la IP del cliente sale de X-Forwarded-For, un salto:
// solo el del proxy propio. Sin la variable, la API usa la IP de la conexión, como en desarrollo.
export function configurarProxy(app: INestApplication, entorno: NodeJS.ProcessEnv = process.env): boolean {
  const valor = entorno.CONFIAR_EN_PROXY?.trim();
  if (!valor || valor === '0' || valor.toLowerCase() === 'false') return false;
  const instancia = app.getHttpAdapter().getInstance() as { set?: (clave: string, valor: unknown) => void };
  instancia.set?.('trust proxy', 1);
  return true;
}
