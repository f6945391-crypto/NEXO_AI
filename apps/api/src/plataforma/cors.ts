import type { INestApplication } from '@nestjs/common';

// T-028 · specs/06-acceso/plan.md §5.6. Una app nativa no usa CORS, pero Expo web corre en un navegador.
// Solo se admiten los orígenes de CORS_ORIGENES (separados por comas), nunca «*». Vacía, no se admite ninguno.

export function origenesPermitidos(): string[] {
  return (process.env.CORS_ORIGENES ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen && origen !== '*');
}

export function configurarCors(app: INestApplication): void {
  const origenes = origenesPermitidos();
  if (origenes.length === 0) return;
  // PATCH desde T-121: cambiar la contraseña (PATCH /auth/contrasena) también desde Expo web
  app.enableCors({ origin: origenes, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Authorization', 'Content-Type'] });
}
