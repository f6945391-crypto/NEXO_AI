import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { IngresoRespuesta, SesionActual } from '@nexoai/contratos';
import type { PerfilUsuario } from '../generado/prisma/client';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { calcularHash, verificarContrasena } from './contrasenas';
import type { AmbitoSesion, ContextoSolicitud } from './contexto';
import { PertenenciasRepositorio } from './pertenencias';

// specs/06-acceso/plan.md §5.1 y §6 · T-004
export const DURACION_ACCESO_SEGUNDOS = 15 * 60;
export const DURACION_RENOVACION_MS = 30 * 24 * 60 * 60 * 1000;
// DP-04, provisional · T-024: margen en que reutilizar un token recién rotado no cierra la sesión.
export const MARGEN_REUTILIZACION_MS = 30 * 1000;

const hashDeToken = (token: string) => createHash('sha256').update(token).digest('hex');

const credencialesInvalidas = () =>
  errorApi(401, 'CREDENCIALES_INVALIDAS', 'El correo o la contraseña no son correctos.');
const sesionInvalida = () => errorApi(401, 'SESION_INVALIDA', 'La sesión terminó. Vuelve a iniciar sesión.');

// REQ-ADM-12, REQ-ADM-13: solo después de verificar la contraseña; con una errónea, el mensaje de siempre.
const TEXTO_ESTADO = {
  suspendida: { codigo: 'CUENTA_SUSPENDIDA', mensaje: 'Tu cuenta está suspendida. Habla con quien administra tu organización.' },
  cerrada: { codigo: 'CUENTA_CERRADA', mensaje: 'Tu cuenta está cerrada. Habla con quien administra tu organización.' },
} as const;

// T-059 · specs/08-administracion/plan.md §4.2: suspender, cerrar o restablecer la contraseña cierran todas las
// sesiones de la cuenta, de la aplicación y de la zona de empresa. `sesion_renovacion` no lleva organización.
export async function revocarSesionesDelPerfil(prisma: PrismaService, perfilId: string): Promise<void> {
  await prisma.sinAislar.sesionRenovacion.updateMany({ where: { perfilId, revocadaEn: null }, data: { revocadaEn: new Date() } });
}

@Injectable()
export class AutenticacionService {
  // Hash de una contraseña que nadie conoce. Si el correo no existe se verifica contra él, para que el
  // tiempo de respuesta no revele si el correo está registrado (REQ-ACC-03).
  private hashFicticio?: Promise<string>;
  private readonly pertenencias: PertenenciasRepositorio;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {
    this.pertenencias = new PertenenciasRepositorio(prisma);
  }

  // `sinAislar`: el perfil se busca por correo antes de conocer su organización (plan §2, H-ACC-01).
  private async verificar(correo: string, contrasena: string): Promise<PerfilUsuario> {
    const perfil = await this.prisma.sinAislar.perfilUsuario.findUnique({ where: { correo } });
    this.hashFicticio ??= calcularHash(randomBytes(32).toString('hex'));
    const valida = await verificarContrasena(perfil?.hashContrasena ?? (await this.hashFicticio), contrasena);

    if (!perfil || !valida) {
      if (perfil) await this.auditar(perfil, 'ingreso.fallido');
      throw credencialesInvalidas();
    }
    if (perfil.estado !== 'activa') {
      await this.auditar(perfil, `ingreso.cuenta-${perfil.estado}`);
      const { codigo, mensaje } = TEXTO_ESTADO[perfil.estado];
      throw errorApi(403, codigo, mensaje);
    }
    return perfil;
  }

  async ingresar(correo: string, contrasena: string): Promise<IngresoRespuesta> {
    const perfil = await this.verificar(correo, contrasena);
    const respuesta = await this.emitir(perfil, randomUUID(), 'propio');
    await this.auditar(perfil, 'ingreso');
    return respuesta;
  }

  // T-059 · specs/08-administracion/plan.md §7.1. Mismas credenciales, otra sesión: solo para quien pertenece a
  // una empresa y la administra o es responsable de un equipo. A cualquier otra cuenta, el mismo texto que unas
  // credenciales inválidas: no se revela si existe ni qué le falta (REQ-ACC-03, REQ-ADM-06). El primer
  // ingreso se hace en la aplicación, nunca en la zona.
  async ingresarEnEmpresa(correo: string, contrasena: string): Promise<IngresoRespuesta> {
    const perfil = await this.verificar(correo, contrasena);
    const pertenencia = await this.pertenencias.vigenteDe(perfil.id);
    if (!pertenencia || !(await this.pertenencias.puedeEntrarEnZona({ perfilId: perfil.id, empresa: pertenencia }))) {
      await this.auditar(perfil, 'ingreso.empresa-rechazado');
      throw credencialesInvalidas();
    }
    if (perfil.debeCambiarContrasena || perfil.zonaHoraria === null) {
      throw errorApi(403, 'PRIMER_INGRESO_PENDIENTE', 'Antes de entrar aquí, entra en NexoAI para cambiar tu contraseña y elegir tu zona horaria.');
    }
    const respuesta = await this.emitir(perfil, randomUUID(), 'empresa');
    await this.prisma.deOrganizacion(pertenencia.organizacionId).eventoAuditoria.create({
      data: { organizacionId: pertenencia.organizacionId, perfilId: perfil.id, accion: 'ingreso.empresa' },
    });
    return respuesta;
  }

  async renovar(tokenRenovacion: string): Promise<IngresoRespuesta> {
    const hashToken = hashDeToken(tokenRenovacion);
    const sesion = await this.prisma.sinAislar.sesionRenovacion.findUnique({ where: { hashToken }, include: { perfil: true } });
    if (!sesion || sesion.expiraEn <= new Date()) throw sesionInvalida();
    // REQ-ADM-12: una cuenta suspendida o cerrada no renueva, aunque su sesión no se haya revocado
    if (sesion.perfil.estado !== 'activa') throw sesionInvalida();

    if (!sesion.revocadaEn) {
      const ahora = new Date();
      const rotada = await this.prisma.sinAislar.sesionRenovacion.updateMany({
        where: { id: sesion.id, revocadaEn: null },
        data: { revocadaEn: ahora, rotadaEn: ahora },
      });
      if (rotada.count === 1) return this.emitir(sesion.perfil, sesion.familia, sesion.ambito);
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
    if (dentroDelMargen && familiaActiva > 0) return this.emitir(sesion.perfil, actual.familia, sesion.ambito);

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
    return this.emitir(actualizado, randomUUID(), 'propio');
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

  // T-059 · plan §4.2: en cada ingreso y cada renovación se lee la pertenencia vigente y se calcula el plan
  // efectivo. La sesión de la zona de empresa solo se renueva mientras la cuenta siga pudiendo entrar en ella.
  private async emitir(perfil: PerfilUsuario, familia: string, ambito: AmbitoSesion): Promise<IngresoRespuesta> {
    const pertenencia = await this.pertenencias.vigenteDe(perfil.id);
    if (ambito === 'empresa' && (!pertenencia || !(await this.pertenencias.puedeEntrarEnZona({ perfilId: perfil.id, empresa: pertenencia })))) {
      await this.revocarFamilia(familia);
      throw sesionInvalida();
    }
    const plan = this.pertenencias.planEfectivo(perfil, pertenencia);

    const tokenRenovacion = randomBytes(32).toString('base64url');
    await this.prisma.sinAislar.sesionRenovacion.create({
      data: {
        perfilId: perfil.id,
        hashToken: hashDeToken(tokenRenovacion),
        familia,
        ambito,
        expiraEn: new Date(Date.now() + DURACION_RENOVACION_MS),
      },
    });

    const primerIngresoPendiente = perfil.debeCambiarContrasena || perfil.zonaHoraria === null;
    const tokenAcceso = await this.jwt.signAsync(
      {
        sub: perfil.id,
        org: perfil.organizacionId,
        rol: perfil.rol,
        plan,
        pi: primerIngresoPendiente,
        emp: pertenencia ? { o: pertenencia.organizacionId, m: pertenencia.miembroId, g: pertenencia.origen } : null,
        amb: ambito,
      },
      { expiresIn: DURACION_ACCESO_SEGUNDOS },
    );

    return {
      tokenAcceso,
      tokenRenovacion,
      accesoExpiraEn: new Date(Date.now() + DURACION_ACCESO_SEGUNDOS * 1000).toISOString(),
      rol: perfil.rol,
      plan,
      primerIngresoPendiente,
    };
  }

  // GET /auth/sesion (plan §6): quién soy según el token, más lo que se lee de la base en cada petición
  async sesionActual(contexto: ContextoSolicitud): Promise<SesionActual> {
    const vigente = (await this.pertenencias.sigueVigente(contexto)) ? contexto.empresa! : null;
    const empresa = vigente
      ? await this.prisma.deOrganizacion(vigente.organizacionId).organizacion.findUnique({ where: { id: vigente.organizacionId }, select: { nombre: true, tipo: true } })
      : null;
    return {
      perfilId: contexto.perfilId,
      organizacionId: contexto.organizacionId,
      rol: contexto.rol,
      plan: contexto.plan,
      primerIngresoPendiente: contexto.primerIngresoPendiente,
      administrador: vigente ? await this.pertenencias.esAdministrador(contexto) : false,
      organizacion: empresa,
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
