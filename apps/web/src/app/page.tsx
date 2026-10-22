import { SaludRespuesta } from '@nexoai/contratos';

// T-010: la web arranca y consume packages/contratos (AD-08). Las pantallas reales llegan en T-011.
export const dynamic = 'force-dynamic';

async function consultarApi(): Promise<'disponible' | 'no disponible'> {
  const base = process.env.API_URL ?? 'http://localhost:3000';
  try {
    const respuesta = await fetch(`${base}/salud`, { cache: 'no-store', signal: AbortSignal.timeout(2000) });
    return SaludRespuesta.safeParse(await respuesta.json()).success ? 'disponible' : 'no disponible';
  } catch {
    return 'no disponible';
  }
}

export default async function Inicio() {
  const api = await consultarApi();
  return (
    <main style={{ padding: 40 }}>
      <h1>NexoAI</h1>
      <p data-prueba="estado-api">API: {api}</p>
    </main>
  );
}
