import { AltaCuenta, TipoOrganizacion, type Plan } from '@nexoai/contratos';
import type { PrismaDeOrganizacion } from '../plataforma/aislamiento';
import type { PrismaClient } from '../plataforma/prisma';
import { calcularHash, generarContrasenaTemporal } from './contrasenas';

// REQ-ACC-01 · H-ACC-01: las cuentas las crea la organización con este servicio. Lo llaman el alta de
// arranque (CLI) y, desde T-061, la Operación `administracion.alta_cuenta` del área de administración.
// Es el único sitio que crea cuentas (specs/08-administracion/plan.md §2).

export interface CuentaCreada {
  perfilId: string;
  correo: string;
  contrasenaTemporal: string;
}

// Las dos formas de cliente que lo llaman: el de la CLI y las pruebas, y el aislado por la organización de la
// empresa en el área de administración. Las dos tienen las mismas tablas y la misma transacción.
type Cliente = PrismaClient | PrismaDeOrganizacion;

// T-058: `tipo` por defecto `empresa`, como todas las organizaciones creadas hasta ahora (plan §3.3).
export async function crearOrganizacion(prisma: PrismaClient, nombre: string, tipo: TipoOrganizacion = 'empresa'): Promise<string> {
  const organizacion = await prisma.organizacion.create({ data: { nombre, tipo: TipoOrganizacion.parse(tipo) } });
  await prisma.eventoAuditoria.create({
    data: { organizacionId: organizacion.id, accion: 'organizacion.creada', detalle: { nombre, tipo } },
  });
  return organizacion.id;
}

// `contrasenaTemporal` solo se pasa desde la semilla de desarrollo; en un alta real se genera.
// T-058 · REQ-ADM-01: en una organización de empresa la cuenta nace con su pertenencia propia y vigente; una
// organización personal tiene una sola cuenta y no tiene administradores.
export async function crearCuenta(
  prisma: Cliente,
  datos: AltaCuenta,
  contrasenaTemporal = generarContrasenaTemporal(),
): Promise<CuentaCreada> {
  const alta = AltaCuenta.parse(datos);
  const hashContrasena = await calcularHash(contrasenaTemporal);
  const cliente = prisma as PrismaClient;

  const perfil = await cliente.$transaction(async (tx) => {
    const organizacion = await tx.organizacion.findUniqueOrThrow({ where: { id: alta.organizacionId } });
    if (organizacion.tipo === 'personal') {
      if (alta.administrador) throw new Error('Una organización personal no tiene administradores');
      if ((await tx.perfilUsuario.count({ where: { organizacionId: alta.organizacionId } })) > 0) {
        throw new Error('Una organización personal tiene una sola cuenta');
      }
    }
    const creado = await tx.perfilUsuario.create({
      data: {
        organizacionId: alta.organizacionId,
        correo: alta.correo,
        hashContrasena,
        rol: alta.rol,
        plan: alta.plan,
        debeCambiarContrasena: true,
      },
    });
    if (organizacion.tipo === 'empresa') {
      await tx.miembroOrganizacion.create({
        data: {
          organizacionId: alta.organizacionId,
          perfilId: creado.id,
          origen: 'alta',
          estado: 'vigente',
          administrador: alta.administrador ?? false,
        },
      });
    }
    await tx.eventoAuditoria.create({
      data: {
        organizacionId: alta.organizacionId,
        perfilId: creado.id,
        accion: 'cuenta.creada',
        detalle: { rol: alta.rol, plan: alta.plan, ...(alta.administrador ? { administrador: true } : {}) },
      },
    });
    return creado;
  });

  return { perfilId: perfil.id, correo: perfil.correo, contrasenaTemporal };
}

// Alta de arranque (REQ-ADM-04, H-ADM-02, plan §3.3). Con `nuevaOrganizacion` el tipo, si no se dice, sale del
// plan: empresa con el Empresarial, personal con los demás. La primera cuenta de una empresa nueva es su
// administradora aunque no se indique.
export interface DatosAltaDeArranque {
  organizacionId?: string;
  nuevaOrganizacion?: string;
  tipo?: TipoOrganizacion;
  administrador?: boolean;
  correo: string;
  rol: AltaCuenta['rol'];
  plan: Plan;
}

export function tipoPorDefecto(plan: Plan): TipoOrganizacion {
  return plan === 'empresarial' ? 'empresa' : 'personal';
}

export async function altaDeArranque(
  prisma: PrismaClient,
  datos: DatosAltaDeArranque,
  contrasenaTemporal?: string,
): Promise<{ organizacionId: string; cuenta: CuentaCreada }> {
  if (!datos.organizacionId === !datos.nuevaOrganizacion) {
    throw new Error('Indica --organizacion <uuid> o --nueva-organizacion "<nombre>", uno de los dos');
  }
  if (datos.tipo && !datos.nuevaOrganizacion) throw new Error('--tipo solo vale con --nueva-organizacion');
  // Se valida todo antes de escribir: un dato inválido no puede dejar una organización creada a medias.
  const tipo = datos.tipo ?? tipoPorDefecto(datos.plan);
  const alta = AltaCuenta.omit({ organizacionId: true }).parse({
    correo: datos.correo,
    rol: datos.rol,
    plan: datos.plan,
    administrador: datos.administrador,
  });
  if (datos.nuevaOrganizacion && tipo === 'personal' && alta.administrador) {
    throw new Error('--administrador solo vale con una organización de empresa');
  }
  if (datos.organizacionId) {
    const existente = await prisma.organizacion.findUnique({ where: { id: datos.organizacionId } });
    if (!existente) throw new Error('No existe esa organización');
    if (alta.administrador && existente.tipo !== 'empresa') throw new Error('--administrador solo vale con una organización de empresa');
  }

  const organizacionId = datos.organizacionId ?? (await crearOrganizacion(prisma, datos.nuevaOrganizacion!, tipo));
  const administrador = alta.administrador ?? (datos.nuevaOrganizacion !== undefined && tipo === 'empresa');
  const cuenta = await crearCuenta(prisma, { organizacionId, ...alta, administrador }, contrasenaTemporal);
  return { organizacionId, cuenta };
}
