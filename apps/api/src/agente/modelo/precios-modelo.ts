import type { UsoModelo } from './proveedor-modelo';

// P-07 · T-029 · plan §8. Dólares por millón de tokens, por modelo. El proveedor real añade aquí los suyos
// (T-036). Un modelo sin precio da costo desconocido, nunca cero.
export const PRECIOS_POR_MILLON: Readonly<Record<string, { entrada: number; salida: number }>> = {
  simulado: { entrada: 0, salida: 0 },
};

// MODELO_PRECIOS (plan §3.1): el precio del modelo configurado, por ejemplo 0,0 en el nivel gratuito de Groq
const configurados = new Map<string, { entrada: number; salida: number }>();

export function registrarPrecio(modelo: string, entrada: number, salida: number): void {
  if (!Number.isFinite(entrada) || !Number.isFinite(salida) || entrada < 0 || salida < 0) throw new Error(`Precio no válido para ${modelo}`);
  configurados.set(modelo, { entrada, salida });
}

export function costoUsd(modelo: string, uso: UsoModelo): number | null {
  const precio = configurados.get(modelo) ?? PRECIOS_POR_MILLON[modelo];
  if (!precio) return null;
  return (uso.tokensEntrada * precio.entrada + uso.tokensSalida * precio.salida) / 1_000_000;
}
