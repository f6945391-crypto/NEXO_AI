import type { UsoModelo } from './proveedor-modelo';

// P-07 · T-029 · plan §8. Dólares por millón de tokens, por modelo. El proveedor real añade aquí los suyos
// (T-036). Un modelo sin precio da costo desconocido, nunca cero.
export const PRECIOS_POR_MILLON: Readonly<Record<string, { entrada: number; salida: number }>> = {
  simulado: { entrada: 0, salida: 0 },
};

export function costoUsd(modelo: string, uso: UsoModelo): number | null {
  const precio = PRECIOS_POR_MILLON[modelo];
  if (!precio) return null;
  return (uso.tokensEntrada * precio.entrada + uso.tokensSalida * precio.salida) / 1_000_000;
}
