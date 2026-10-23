import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { IngresoRespuesta } from '@nexoai/contratos';
import type { PerfilUsuario } from '../generado/prisma/client';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { calcularHash, verificarContrasena } from './contrasenas';
import type { ContextoSolicitud } from './contexto';

// specs/06-acceso/plan.md §5.1 y §6 · T-004
export const DURACION_ACCESO_SEGUNDOS = 15 * 60;
export const DURACION_RENOVACION_MS = 30 * 24 * 60 * 60 * 1000;
// DP-04, provisional · T-024: margen en que reutilizar un token recién rotado no cierra la sesión.
export const MARGEN_REUTILIZACION_MS = 30 * 1000;

const hashDeToken = (token: string) => createHash('sha256').update(token).digest('hex');

const credencialesInvalidas = () =>
  errorApi(401, 'CREDENCIALES_INVALIDAS', 'El correo o la contraseña no son correctos.');
const sesionInvalida = () => errorApi(401, 'SESION_INVALIDA', 'La sesión terminó. Vuelve a iniciar sesión.');

@Injectable()
export class AutenticacionService {
  // Hash de una contraseña que nadie conoce. Si el correo no existe se verifica contra él, para que el
  // tiempo de respuesta no revele si el correo está registrado (REQ-ACC-03).
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // `sinAislar`: el perfil se busca por correo antes de conocer su organización (plan §2, H-ACC-01).
  async ingresar(correo: string, contrasena: string): Promise<IngresoRespuesta> {
    const perfil = await this.prisma.sinAislar.perfilUsuario.findUnique({ where: { correo } });
    this.hashFicticio ??= calcularHash(randomBytes(32).toString('hex'));
    const valida = await verificarContrasena(perfil?.hashContrasena ?? (await this.hashFicticio), contrasena);

    if (!perfil || !valida) {
      if (perfil) await this.auditar(perfil, 'ingreso.fallido');
      throw credencialesInvalidas();
    }

    const respuesta = await this.emitir(perfil, randomUUID());
    await this.auditar(perfil, 'ingreso');
    return respuesta;
  }

  async renovar(tokenRenovacion: string): Promise<IngresoRespuesta> {
    const hashToken = hashDeToken(tokenRenovacion);
    const sesion = await this.prisma.sinAislar.sesionRenovacion.findUnique({ where: { hashToken }, include: { perfil: true } });
    if (!sesion || sesion.expiraEn <= new Date()) throw sesionInvalida();

    if (!sesion.revocadaEn) {
      const ahora = new Date();
      const rotada = await this.prisma.sinAislar.sesionRenovacion.updateMany({
        where: { id: sesion.id, revocadaEn: null },
        data: { revocadaEn: ahora, rotadaEn: ahora },
      });
      if (rotada.count === 1) return this.emitir(sesion.perfil, sesion.familia);
      // Otra petición la rotó en este mismo instante: se resuelve como un duplicado, abajo.
    }

    const actual = await this.prisma.sinAislar.sesionRenovacion.findUniqueOrThrow({ where: { hashToken } });
    // Revocada sin rotar: cierre de sesión o cambio de contraseña. No es una alarma, simplemente terminó.
    if (!actual.rotadaEn) throw sesionInvalida();

    // T-024 · DP-04: el mismo token rotado vuelve en los segundos siguientes. Es la web pidiendo renovar
    // dos veces a la vez (dos pestañas, dos cargas), no un robo: tokens nuevos de la misma familia.
    const dentroDelMargen = Date.now() - actual.rotadaEn.getTime() <= MARGEN_REUTILIZACION_MS;
    const familiaActiva = await this.prisma.sinAislar.sesionRenovacion.count({
      where: { familia: actual.familia, revocadaEn: null },
    });
    if (dentroDelMargen && familiaActiva > 0) return this.emitir(sesion.perfil, actual.familia);

    // Fuera del margen: alguien más tiene el token. Se cierra todo ese ingreso.
    await this.revocarFamilia(actual.familia);
    await this.auditar(sesion.perfil, 'sesion.reutilizada');
    throw sesionInvalida();
  }

  // REQ-ACC-04, REQ-ACC-05 · H-ACC-02 · T-005. Cambiar la contraseña cierra todas las sesiones abiertas
  // con la temporal, y la respuesta trae tokens nuevos ya sin el primer ingreso pendiente.
  async completarPrimerIngreso(
    contexto: ContextoSolicitud,
    contrasenaNueva: string,
    zonaHoraria: string,
  ): Promise<IngresoRespuesta> {
    const datos = this.prisma.deOrganizacion(contexto.organizacionId);
    const perfil = await datos.perfilUsuario.findUniqueOrThrow({ where: { id: contexto.perfilId } });

    if (!perfil.debeCambiarContrasena && perfil.zonaHoraria !== null) {
      throw errorApi(409, 'PRIMER_INGRESO_YA_COMPLETADO', 'El primer ingreso ya está completado.');
    }
    if (await verificarContrasena(perfil.hashContrasena, contrasenaNueva)) {
      throw errorApi(400, 'CONTRASENA_NO_VALIDA', 'La contraseña nueva tiene que ser distinta de la temporal.');
    }

    const actualizado = await datos.perfilUsuario.update({
      where: { id: perfil.id },
      data: { hashContrasena: await calcularHash(contrasenaNueva), debeCambiarContrasena: false, zonaHoraria },
    });
    await this.prisma.sinAislar.sesionRenovacion.updateMany({
      where: { perfilId: perfil.id, revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
    await datos.eventoAuditoria.create({
      data: {
        organizacionId: perfil.organizacionId,
        perfilId: perfil.id,
        accion: 'primer-ingreso.completado',
        detalle: { zonaHoraria },
      },
    });
    return this.emitir(actualizado, randomUUID());
  }

  async salir(tokenRenovacion: string): Promise<void> {
    const sesion = await this.prisma.sinAislar.sesionRenovacion.findUnique({
      where: { hashToken: hashDeToken(tokenRenovacion) },
      include: { perfil: true },
    });
    if (!sesion) return;
    await this.revocarFamilia(sesion.familia);
    await this.auditar(sesion.perfil, 'salida');
  }

  private async emitir(perfil: PerfilUsuario, familia: string): Promise<IngresoRespuesta> {
    const tokenRenovacion = randomBytes(32).toString('base64url');
    await this.prisma.sinAislar.sesionRenovacion.create({
      data: {
        perfilId: perfil.id,
        hashToken: hashDeToken(tokenRenovacion),
        familia,
        expiraEn: new Date(Date.now() + DURACION_RENOVACION_MS),
      },
    });

    const primerIngresoPendiente = perfil.debeCambiarContrasena || perfil.zonaHoraria === null;
    const tokenAcceso = await this.jwt.signAsync(
      { sub: perfil.id, org: perfil.organizacionId, rol: perfil.rol, plan: perfil.plan, pi: primerIngresoPendiente },
      { expiresIn: DURACION_ACCESO_SEGUNDOS },
    );

    return {
      tokenAcceso,
      tokenRenovacion,
      accesoExpiraEn: new Date(Date.now() + DURACION_ACCESO_SEGUNDOS * 1000).toISOString(),
      rol: perfil.rol,
      plan: perfil.plan,
      primerIngresoPendiente,
    };
  }

  private async revocarFamilia(familia: string): Promise<void> {
    await this.prisma.sinAislar.sesionRenovacion.updateMany({
      where: { familia, revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
  }

  private async auditar(perfil: PerfilUsuario, accion: string): Promise<void> {
    await this.prisma.deOrganizacion(perfil.organizacionId).eventoAuditoria.create({
      data: { organizacionId: perfil.organizacionId, perfilId: perfil.id, accion },
    });
  }
}
