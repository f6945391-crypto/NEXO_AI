import { Inject, Injectable } from '@nestjs/common';
import { ALCANCES_GOOGLE, type ClaveAlcanceGoogle } from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { cifrar, descifrar } from './cifrado';
import { ErrorOAuthGoogle, PROVEEDOR_OAUTH_GOOGLE, type ProveedorOAuthGoogle, type TokensGoogle } from './oauth-google';

// REQ-ACC-08, REQ-ACC-09 · T-008 · specs/06-acceso/plan.md §5.4.
// El ÚNICO punto que llama a Google en nombre de una persona. Antes de llamar comprueba el permiso;
// renueva el acceso cuando caduca; y si Google dice que el permiso ya no vale, lo marca, avisa una sola
// vez y no vuelve a intentarlo.

type Quien = Pick<ContextoSolicitud, 'perfilId' | 'organizacionId'>;

const MARGEN_CADUCIDAD_MS = 60_000;

export const permisoFaltante = (alcance: ClaveAlcanceGoogle) =>
  errorApi(
    403,
    'PERMISO_GOOGLE_FALTANTE',
    `Para esto hace falta el permiso «${ALCANCES_GOOGLE[alcance].nombre}». Conéctalo desde Ajustes.`,
  );

const permisoRetirado = (alcance: ClaveAlcanceGoogle) =>
  errorApi(
    403,
    'PERMISO_GOOGLE_RETIRADO',
    `Google ya no da el permiso «${ALCANCES_GOOGLE[alcance].nombre}». Vuelve a conectarlo desde Ajustes.`,
  );

@Injectable()
export class ClienteGoogle {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROVEEDOR_OAUTH_GOOGLE) private readonly oauth: ProveedorOAuthGoogle,
  ) {}

  async tienePermiso(quien: Quien, alcance: ClaveAlcanceGoogle): Promise<boolean> {
    const fila = await this.fila(quien, alcance);
    return fila?.estado === 'concedido';
  }

  // `peticion` recibe el token de acceso y hace la llamada a la API de Google que corresponda.
  async llamar(quien: Quien, alcance: ClaveAlcanceGoogle, peticion: (tokenAcceso: string) => Promise<Response>): Promise<Response> {
    const fila = await this.fila(quien, alcance);
    if (!fila) throw permisoFaltante(alcance);
    if (fila.estado !== 'concedido' || !fila.tokenCifrado) throw permisoRetirado(alcance);

    let tokens = JSON.parse(descifrar(fila.tokenCifrado)) as TokensGoogle;
    if (new Date(tokens.expiraEn).getTime() - MARGEN_CADUCIDAD_MS <= Date.now()) {
      tokens = await this.renovar(quien, alcance, tokens);
    }

    let respuesta = await peticion(tokens.accessToken);
    if (respuesta.status === 401) {
      // Un acceso rechazado se renueva una vez; si vuelve a fallar, el permiso se da por caducado.
      tokens = await this.renovar(quien, alcance, tokens);
      respuesta = await peticion(tokens.accessToken);
      if (respuesta.status === 401) await this.perderPermiso(quien, alcance, 'caducado');
    }
    return respuesta;
  }

  private async renovar(quien: Quien, alcance: ClaveAlcanceGoogle, actuales: TokensGoogle): Promise<TokensGoogle> {
    if (!actuales.refreshToken) return this.perderPermiso(quien, alcance, 'caducado');
    let nuevos: TokensGoogle;
    try {
      nuevos = await this.oauth.renovarAcceso(actuales.refreshToken);
    } catch (error) {
      if (error instanceof ErrorOAuthGoogle && error.codigo === 'invalid_grant') {
        return this.perderPermiso(quien, alcance, 'revocado');
      }
      // Un fallo pasajero de Google no es una revocación: no se toca el permiso.
      throw errorApi(502, 'GOOGLE_NO_DISPONIBLE', 'Google no responde ahora mismo. Inténtalo de nuevo en un momento.');
    }
    const guardados: TokensGoogle = { ...nuevos, refreshToken: nuevos.refreshToken ?? actuales.refreshToken };
    await this.datos(quien).consentimientoIntegracion.update({
      where: { perfilId_proveedor_alcance: { perfilId: quien.perfilId, proveedor: 'google', alcance } },
      data: { tokenCifrado: cifrar(JSON.stringify(guardados)) },
    });
    return guardados;
  }

  // REQ-ACC-09: deja de intentarlo y avisa una sola vez. El aviso queda en la auditoría y el permiso se
  // ve como «Retirado» o «Caducado» en Ajustes.
  private async perderPermiso(quien: Quien, alcance: ClaveAlcanceGoogle, estado: 'revocado' | 'caducado'): Promise<never> {
    const datos = this.datos(quien);
    const primerAviso = await datos.consentimientoIntegracion.updateMany({
      where: { perfilId: quien.perfilId, proveedor: 'google', alcance, avisoEmitidoEn: null },
      data: { estado, tokenCifrado: null, avisoEmitidoEn: new Date() },
    });
    if (primerAviso.count === 1) {
      await datos.eventoAuditoria.create({
        data: { organizacionId: quien.organizacionId, perfilId: quien.perfilId, accion: 'google.permiso-perdido', detalle: { alcance, estado } },
      });
    } else {
      await datos.consentimientoIntegracion.updateMany({
        where: { perfilId: quien.perfilId, proveedor: 'google', alcance },
        data: { estado, tokenCifrado: null },
      });
    }
    throw permisoRetirado(alcance);
  }

  private fila(quien: Quien, alcance: ClaveAlcanceGoogle) {
    return this.datos(quien).consentimientoIntegracion.findUnique({
      where: { perfilId_proveedor_alcance: { perfilId: quien.perfilId, proveedor: 'google', alcance } },
    });
  }

  private datos(quien: Quien) {
    return this.prisma.deOrganizacion(quien.organizacionId);
  }
}
