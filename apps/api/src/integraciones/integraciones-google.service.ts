import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ALCANCES_GOOGLE,
  ClaveAlcanceGoogle,
  type EnlaceGoogleSolicitud,
  type PermisoGoogle,
} from '@nexoai/contratos';
import type { ContextoSolicitud } from '../identidad/contexto';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { cifrar } from './cifrado';
import { PROVEEDOR_OAUTH_GOOGLE, type ProveedorOAuthGoogle } from './oauth-google';

// REQ-ACC-06, REQ-ACC-07, REQ-ACC-14 · T-007 · specs/06-acceso/plan.md §5.4

const PROVEEDOR = 'google';
const TIPO_ESTADO = 'oauth-google';
const VIDA_ENLACE_S = 10 * 60;

// REQ-ACC-14: al colaborador solo se le ofrece el calendario.
const alcancesPara = (contexto: Pick<ContextoSolicitud, 'rol'>): ClaveAlcanceGoogle[] =>
  contexto.rol === 'colaborador' ? ['calendario'] : ['calendario', 'correo'];

export type ResultadoRetorno = 'conectado' | 'rechazado' | 'no-concedido' | 'error';

@Injectable()
export class IntegracionesGoogleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(PROVEEDOR_OAUTH_GOOGLE) private readonly oauth: ProveedorOAuthGoogle,
  ) {}

  async permisos(contexto: ContextoSolicitud): Promise<PermisoGoogle[]> {
    const filas = await this.prisma.deOrganizacion(contexto.organizacionId).consentimientoIntegracion.findMany({
      where: { perfilId: contexto.perfilId, proveedor: PROVEEDOR },
    });
    return alcancesPara(contexto).map((clave) => ({
      clave,
      nombre: ALCANCES_GOOGLE[clave].nombre,
      paraQue: ALCANCES_GOOGLE[clave].paraQue,
      estado: filas.find((f) => f.alcance === clave)?.estado ?? 'no_concedido',
    }));
  }

  // El estado de OAuth es un JWT firmado y de corta vida: quien vuelve de Google solo puede conectar
  // la cuenta que pidió el enlace, y solo el alcance que pidió.
  async crearEnlace(contexto: ContextoSolicitud, solicitud: EnlaceGoogleSolicitud): Promise<string> {
    if (!alcancesPara(contexto).includes(solicitud.alcance)) {
      throw errorApi(403, 'ROL_NO_PERMITIDO', 'Tu cuenta no usa este permiso.');
    }
    const estado = await this.jwt.signAsync(
      { typ: TIPO_ESTADO, sub: contexto.perfilId, org: contexto.organizacionId, alcance: solicitud.alcance, cliente: solicitud.cliente },
      { expiresIn: VIDA_ENLACE_S },
    );
    return this.oauth.urlDeAutorizacion(ALCANCES_GOOGLE[solicitud.alcance].alcance, estado);
  }

  // Google vuelve aquí con un código o con un error. Devuelve a dónde mandar al navegador.
  async retorno(consulta: { code?: string; state?: string; error?: string }): Promise<string> {
    let estado: { sub: string; org: string; alcance: ClaveAlcanceGoogle; cliente: 'web' | 'movil' };
    try {
      const carga = await this.jwt.verifyAsync<Record<string, unknown>>(consulta.state ?? '');
      if (carga.typ !== TIPO_ESTADO) throw new Error('estado de otro tipo');
      estado = {
        sub: String(carga.sub),
        org: String(carga.org),
        alcance: ClaveAlcanceGoogle.parse(carga.alcance),
        cliente: carga.cliente === 'movil' ? 'movil' : 'web',
      };
    } catch {
      return this.destino('web', 'error');
    }

    if (consulta.error || !consulta.code) return this.destino(estado.cliente, 'rechazado');

    let tokens;
    try {
      tokens = await this.oauth.canjearCodigo(consulta.code);
    } catch {
      return this.destino(estado.cliente, 'error');
    }
    // Con el consentimiento granular de Google la persona puede desmarcar el permiso: entonces no se guarda.
    if (!tokens.alcancesConcedidos.includes(ALCANCES_GOOGLE[estado.alcance].alcance)) {
      return this.destino(estado.cliente, 'no-concedido');
    }

    const datos = this.prisma.deOrganizacion(estado.org);
    const tokenCifrado = cifrar(JSON.stringify(tokens));
    const ahora = new Date();
    await datos.consentimientoIntegracion.upsert({
      where: { perfilId_proveedor_alcance: { perfilId: estado.sub, proveedor: PROVEEDOR, alcance: estado.alcance } },
      create: {
        organizacionId: estado.org,
        perfilId: estado.sub,
        proveedor: PROVEEDOR,
        alcance: estado.alcance,
        estado: 'concedido',
        tokenCifrado,
        concedidoEn: ahora,
      },
      update: { estado: 'concedido', tokenCifrado, concedidoEn: ahora, avisoEmitidoEn: null },
    });
    await datos.eventoAuditoria.create({
      data: { organizacionId: estado.org, perfilId: estado.sub, accion: 'google.conectado', detalle: { alcance: estado.alcance } },
    });
    return this.destino(estado.cliente, 'conectado');
  }

  private destino(cliente: 'web' | 'movil', resultado: ResultadoRetorno): string {
    if (cliente === 'movil') return `nexoai://google?resultado=${resultado}`;
    return `${process.env.WEB_URL ?? 'http://localhost:3001'}/?google=${resultado}`;
  }
}
