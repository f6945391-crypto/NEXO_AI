import { join } from 'node:path';
import type { NextConfig } from 'next';

const configuracion: NextConfig = {
  // packages/contratos se compila aparte y se importa como cualquier dependencia (AD-08).
  transpilePackages: ['@nexoai/contratos'],
  // Imagen de contenedor (apps/web/Dockerfile): next build deja en .next/standalone un server.js con solo
  // los archivos que usa. La raíz del rastreo es la del monorepo, para que entren packages/contratos y el
  // node_modules de pnpm, que están fuera de apps/web.
  output: 'standalone',
  outputFileTracingRoot: join(__dirname, '..', '..'),
  // Sin esto, `next dev` escribe su propio AGENTS.md al detectar un agente de IA. Las instrucciones
  // del proyecto viven solo en el AGENTS.md de la raíz.
  agentRules: false,
  // El indicador de desarrollo tapaba Ajustes, que vive abajo a la izquierda.
  devIndicators: { position: 'bottom-right' },
};

export default configuracion;
