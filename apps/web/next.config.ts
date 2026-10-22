import type { NextConfig } from 'next';

const configuracion: NextConfig = {
  // packages/contratos se compila aparte y se importa como cualquier dependencia (AD-08).
  transpilePackages: ['@nexoai/contratos'],
};

export default configuracion;
