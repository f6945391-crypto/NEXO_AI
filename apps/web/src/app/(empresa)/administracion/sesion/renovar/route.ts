import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { IngresoRespuesta } from '@nexoai/contratos';
import { llamarApi } from '../../../../../lib/sesion';
import { borrarTokensEmpresa, COOKIE_EMPRESA_RENOVACION, guardarTokensEmpresa } from '../../_comun/sesion';

// Las páginas no pueden escribir cookies: cuando el acceso de la zona caduca, redirigen aquí para renovarlo.
// Solo vuelve a una dirección de la zona.
export async function GET(solicitud: NextRequest) {
  const volver = solicitud.nextUrl.searchParams.get('volver') ?? '/administracion';
  const destino = volver.startsWith('/administracion') && !volver.startsWith('//') ? volver : '/administracion';
  const renovacion = (await cookies()).get(COOKIE_EMPRESA_RENOVACION)?.value;
  if (renovacion) {
    try {
      const respuesta = await llamarApi('/auth/renovar', { metodo: 'POST', cuerpo: { tokenRenovacion: renovacion } });
      if (respuesta.estado === 200) {
        await guardarTokensEmpresa(IngresoRespuesta.parse(respuesta.cuerpo));
        return NextResponse.redirect(new URL(destino, solicitud.url));
      }
    } catch {
      // Sin respuesta de la API se trata como sesión terminada
    }
  }
  await borrarTokensEmpresa();
  return NextResponse.redirect(new URL('/administracion/entrar', solicitud.url));
}
