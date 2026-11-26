import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENVIADOR_CORREO, type EnviadorCorreo } from '../plataforma/correo/enviador-correo';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { revocarSesionesDelPerfil } from './autenticacion.service';
import { calcularHash } from './contrasenas';

// T-123 · REQ-ACC-19 · specs/06-acceso/plan.md §5.8 · H-ACC-09 a 13
export const DURACION_ENLACE_MS = 30 * 60 * 1000;

const hashDe = (token: string) => createHash('sha256').update(token).digest('hex');
const enlaceNoValido = () => errorApi(400, 'ENLACE_NO_VALIDO', 'El enlace no es válido o ya venció. Pide otro desde Entrar.');

// H-ACC-13: texto y HTML, sin seguimiento; lo que se dice no revela nada que la persona no sepa
export function correoDeRestablecimiento(correo: string, enlace: string) {
  const texto = [
    'Hola:',
    '',
    `Alguien pidió restablecer la contraseña de tu cuenta de NexoAI (${correo}).`,
    'Para elegir una nueva, abre este enlace en los próximos 30 minutos:',
    '',
    enlace,
    '',
    'El enlace sirve una sola vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.',
    '',
    'NexoAI',
  ].join('\n');
  const html = `<p>Hola:</p>
<p>Alguien pidió restablecer la contraseña de tu cuenta de NexoAI (${correo}).</p>
<p>Para elegir una nueva, abre este enlace en los próximos 30 minutos:</p>
<p><a href="${enlace}">Elegir una contraseña nueva</a></p>
<p>Si el botón no funciona, copia esta dirección en el navegador:<br>${enlace}</p>
<p>El enlace sirve una sola vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>
<p>NexoAI</p>`;
  return { asunto: 'Restablece tu contraseña de NexoAI', texto, html };
}

@Injectable()
export class RestablecimientoService {
  private readonly registro = new Logger('Restablecimiento');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENVIADOR_CORREO) private readonly correo: EnviadorCorreo,
  ) {}

  // REQ-ACC-19: la respuesta es siempre la misma. El correo sale sin esperarlo, para que el tiempo de respuesta
  // no revele si la cuenta existe (REQ-ACC-03). Una cuenta suspendida o cerrada no recibe nada (H-ACC-11).
  async pedir(correo: string, ahora = new Date()): Promise<void> {
    // sinAislar: el perfil se busca por correo antes de conocer su organización (plan §5.1)
    const perfil = await this.prisma.sinAislar.perfilUsuario.findUnique({ where: { correo } });
    if (!perfil || perfil.estado !== 'activa') return;

    const datos = this.prisma.deOrganizacion(perfil.organizacionId);
    // Un pedido nuevo deja sin efecto los anteriores sin usar
    await datos.restablecimientoContrasena.updateMany({ where: { perfilId: perfil.id, usadoEn: null }, data: { usadoEn: ahora } });
    const token = randomBytes(32).toString('base64url');
    await datos.restablecimientoContrasena.create({
      data: { organizacionId: perfil.organizacionId, perfilId: perfil.id, hashToken: hashDe(token), venceEn: new Date(ahora.getTime() + DURACION_ENLACE_MS) },
    });
    await datos.eventoAuditoria.create({ data: { organizacionId: perfil.organizacionId, perfilId: perfil.id, accion: 'contrasena.restablecimiento-pedido', detalle: {} } });

    const base = (process.env.WEB_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
    const mensaje = correoDeRestablecimiento(perfil.correo, `${base}/restablecer?token=${token}`);
    void this.correo.enviar({ para: perfil.correo, ...mensaje }).catch((error: unknown) => {
      this.registro.error(`No se pudo enviar el correo de restablecimiento: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  // REQ-ACC-19: un enlace válido cambia la contraseña y cierra todas las sesiones, de la aplicación y de la zona
  // de empresa. No inicia sesión. El primer ingreso, si estaba pendiente, sigue pendiente (H-ACC-12).
  async confirmar(token: string, nueva: string, ahora = new Date()): Promise<void> {
    // sinAislar: el enlace se busca por su hash antes de conocer la organización
    const enlace = await this.prisma.sinAislar.restablecimientoContrasena.findUnique({ where: { hashToken: hashDe(token) }, include: { perfil: true } });
    if (!enlace || enlace.usadoEn || enlace.venceEn <= ahora || enlace.perfil.estado !== 'activa') throw enlaceNoValido();

    const datos = this.prisma.deOrganizacion(enlace.organizacionId);
    // Se marca usado solo si nadie lo usó entre la lectura y ahora: dos envíos a la vez cambian la contraseña una vez
    const marcado = await datos.restablecimientoContrasena.updateMany({ where: { id: enlace.id, usadoEn: null }, data: { usadoEn: ahora } });
    if (marcado.count === 0) throw enlaceNoValido();

    await datos.perfilUsuario.update({ where: { id: enlace.perfilId }, data: { hashContrasena: await calcularHash(nueva) } });
    await revocarSesionesDelPerfil(this.prisma, enlace.perfilId);
    await datos.eventoAuditoria.create({ data: { organizacionId: enlace.organizacionId, perfilId: enlace.perfilId, accion: 'contrasena.restablecida', detalle: {} } });
  }
}
