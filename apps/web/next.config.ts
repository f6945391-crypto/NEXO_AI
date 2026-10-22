import type { NextConfig } from 'next';

const configuracion: NextConfig = {
  // packages/contratos se compila aparte y se importa como cualquier dependencia (AD-08).
  transpilePackages: ['@nexoai/contratos'],
  // Sin esto, `next dev` escribe su propio AGENTS.md al detectar un agente de IA. Las instrucciones
  // del proyecto viven solo en el AGENTS.md de la raíz.
  agentRules: false,
  // El indicador de desarrollo tapaba Ajustes, que vive abajo a la izquierda.
  devIndicators: { position: 'bottom-right' },
};

export default configuracion;
