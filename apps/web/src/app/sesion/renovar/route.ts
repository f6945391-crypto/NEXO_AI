import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { IngresoRespuesta } from '@nexoai/contratos';
import { borrarTokens, COOKIE_RENOVACION, guardarTokens, llamarApi } from '../../../lib/sesion';

// Las páginas no pueden escribir cookies: cuando el acceso caduca, redirigen aquí para renovarlo.
export async function GET(solicitud: NextRequest) {
  const volver = solicitud.nextUrl.searchParams.get('volver') ?? '/';
  const destinoSeguro = volver.startsWith('/') && !volver.startsWith('//') ? volver : '/';
  const renovacion = (await cookies()).get(COOKIE_RENOVACION)?.value;

  if (renovacion) {
    try {
      const respuesta = await llamarApi('/auth/renovar', { metodo: 'POST', cuerpo: { tokenRenovacion: renovacion } });
      if (respuesta.estado === 200) {
        await guardarTokens(IngresoRespuesta.parse(respuesta.cuerpo));
        return NextResponse.redirect(new URL(destinoSeguro, solicitud.url));
      }
    } catch {
      // Sin respuesta de la API se trata como sesión terminada.
    }
  }
  await borrarTokens();
  return NextResponse.redirect(new URL('/entrar', solicitud.url));
}
