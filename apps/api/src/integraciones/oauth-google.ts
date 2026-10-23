import { Injectable } from '@nestjs/common';
import { requerirVariable } from '../plataforma/entorno';

// Puerto hacia el servidor OAuth de Google. La implementación real usa sus dos direcciones públicas;
// las pruebas la sustituyen por una simulada (overrideProvider). Sin SDK de Google: dos llamadas HTTP.

export const PROVEEDOR_OAUTH_GOOGLE = Symbol('PROVEEDOR_OAUTH_GOOGLE');

export interface TokensGoogle {
  accessToken: string;
  refreshToken: string | null;
  expiraEn: string;
  alcancesConcedidos: string[];
}

export interface ProveedorOAuthGoogle {
  urlDeAutorizacion(alcance: string, estado: string): string;
  canjearCodigo(codigo: string): Promise<TokensGoogle>;
}

@Injectable()
export class OAuthGoogleReal implements ProveedorOAuthGoogle {
  urlDeAutorizacion(alcance: string, estado: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: requerirVariable('GOOGLE_CLIENT_ID'),
      redirect_uri: requerirVariable('GOOGLE_REDIRECT_URI'),
      response_type: 'code',
      scope: alcance,
      // Autorización incremental: cada alcance se concede por separado (plan de acceso §5.4).
      include_granted_scopes: 'true',
      access_type: 'offline',
      prompt: 'consent',
      state: estado,
    }).toString();
    return url.toString();
  }

  async canjearCodigo(codigo: string): Promise<TokensGoogle> {
    const respuesta = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: codigo,
        client_id: requerirVariable('GOOGLE_CLIENT_ID'),
        client_secret: requerirVariable('GOOGLE_CLIENT_SECRET'),
        redirect_uri: requerirVariable('GOOGLE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      }),
    });
    const cuerpo = (await respuesta.json()) as Record<string, unknown>;
    if (!respuesta.ok) throw new Error(`Google rechazó el código: ${String(cuerpo.error ?? respuesta.status)}`);
    return {
      accessToken: String(cuerpo.access_token),
      refreshToken: typeof cuerpo.refresh_token === 'string' ? cuerpo.refresh_token : null,
      expiraEn: new Date(Date.now() + Number(cuerpo.expires_in ?? 0) * 1000).toISOString(),
      alcancesConcedidos: String(cuerpo.scope ?? '').split(' ').filter(Boolean),
    };
  }
}
