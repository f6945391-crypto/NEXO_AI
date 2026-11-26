import { ElegirNueva } from './elegir-nueva';
import { PedirEnlace } from './pedir-enlace';

// REQ-ACC-19 · T-123 · specs/06-acceso/plan.md §5.8. Pública: no pide sesión ni lleva a Entrar o al primer
// ingreso, aunque haya una sesión abierta. Sin token, pide el correo; con el token del correo, la nueva.
export default async function Restablecer({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const valor = Array.isArray(token) ? token[0] : token;
  return valor ? <ElegirNueva token={valor} /> : <PedirEnlace />;
}
