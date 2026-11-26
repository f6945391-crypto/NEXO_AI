import { Injectable } from '@nestjs/common';
import {
  OperacionRespuesta,
  VistaConfirmacion,
  type EstadoOperacion,
  type MotivoEspera,
  type OperacionSolicitud,
} from '@nexoai/contratos';
import type { Operacion } from '../generado/prisma/client';
import type { AmbitoSesion, ContextoSolicitud } from '../identidad/contexto';
import { SIN_ORGANIZACION, SOLO_EL_ADMINISTRADOR, SOLO_EL_RESPONSABLE, TEXTO_AMBITO } from '../identidad/guardas';
import { PertenenciasRepositorio } from '../identidad/pertenencias';
import { errorApi } from '../plataforma/errores';
import { PrismaService } from '../plataforma/prisma.service';
import { RegistroOperaciones, type EjecutorOperacion } from './registro';

// AD-09 · specs/02-agenda/plan.md §3 · T-012.
//
// Garantías, cada una con su prueba:
// - Ningún efecto antes de `confirmar` (REQ-CUN01-03): el efecto vive solo en `ejecutor.ejecutar`.
// - Confirmar dos veces ejecuta una (P-07): la primera confirmación «reclama» la operación con una
//   actualización condicional atómica (`confirmadaEn` de nulo a ahora). Ajuste del plan: en lugar de
//   `SELECT … FOR UPDATE`, que exigiría SQL escrito a mano, prohibido por AGENTS.md.
// - Una operación solo la ve y la confirma quien la creó, dentro de su organización (P-04).
// - T-060 · specs/08-administracion/plan.md §5.2: las de ámbito `empresa` se proponen y se confirman solo con la
//   sesión de la zona de empresa, se guardan en la organización de la empresa y nunca se listan con las del
//   usuario. Su resultado efímero llega en la primera confirmación y no se guarda.

const aRespuesta = (op: Operacion): OperacionRespuesta =>
  OperacionRespuesta.parse({
    id: op.id,
    tipo: op.tipo,
    origen: op.origen,
    estado: op.estado,
    vistaConfirmacion: op.vistaConfirmacion,
    resultado: op.resultado ?? null,
    error: op.error,
    creadaEn: op.creadaEn.toISOString(),
  });

// Campos de primer nivel que no vienen, o vienen vacíos, y que el esquema exige.
function camposFaltantes(bruta: unknown, issues: readonly { path: readonly PropertyKey[] }[]): string[] {
  const valores = bruta && typeof bruta === 'object' ? (bruta as Record<string, unknown>) : {};
  const faltan = issues
    .map((issue) => String(issue.path[0] ?? ''))
    .filter((campo) => campo && (valores[campo] === undefined || valores[campo] === null || (typeof valores[campo] === 'string' && !String(valores[campo]).trim())));
  return [...new Set(faltan)];
}

const unirConY = (partes: string[]) => (partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : (partes[0] ?? ''));

// Por qué no se puede confirmar algo en espera, dicho a la persona (REQ-CAP-23: ni error ni fuera del plan)
const MOTIVOS_DE_ESPERA: Readonly<Record<MotivoEspera, string>> = {
  asistente_no_disponible: 'El asistente no respondía. Lo retoma en cuanto vuelva.',
  permiso_faltante: 'Falta el permiso de tu calendario de Google. Se retoma cuando lo conectes.',
  // H-TP-16: mientras T-056 no las convierte, ya no es cierto que «llegan en una próxima versión»
  funcion_por_llegar: 'Se está preparando para que la confirmes en Tareas.',
};

const noEncontrada = () => errorApi(404, 'OPERACION_NO_ENCONTRADA', 'No existe esa operación.');

const ambitoDe = (contexto: ContextoSolicitud): AmbitoSesion => contexto.ambito ?? 'propio';

@Injectable()
export class OperacionesService {
  private readonly pertenencias: PertenenciasRepositorio;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registro: RegistroOperaciones,
  ) {
    this.pertenencias = new PertenenciasRepositorio(prisma);
  }

  // `conversacionId`: la conversación del asistente de la que sale la propuesta (T-031); no viene del cliente.
  // `desdeEnEspera`: lo pedido estaba en espera y el asistente lo interpretó al volver: la misma fila pasa a
  // propuesta, con la frase y el momento de la captura (T-033, plan §7).
  async proponer(
    contexto: ContextoSolicitud,
    solicitud: OperacionSolicitud,
    extra: { conversacionId?: string; desdeEnEspera?: string } = {},
  ): Promise<OperacionRespuesta> {
    const ejecutor = this.registro.obtener(solicitud.tipo);
    if (!ejecutor) throw errorApi(400, 'OPERACION_DESCONOCIDA', 'Esa acción no existe.');
    const ambito = ejecutor.ambito ?? 'propio';
    if (ambito !== ambitoDe(contexto)) throw errorApi(403, 'AMBITO_INCORRECTO', TEXTO_AMBITO[ambito]);
    await this.comprobarAutoridad(contexto, ejecutor);
    if (ejecutor.origenes && !ejecutor.origenes.includes(solicitud.origen)) {
      throw errorApi(403, 'ORIGEN_NO_PERMITIDO', ejecutor.textoOrigenNoPermitido ?? 'Esto se le pide al asistente: no hay un camino aparte para hacerlo.');
    }

    const carga = ejecutor.esquema.safeParse(solicitud.carga);
    if (!carga.success) {
      // REQ-CUN01-07: si lo que falla es que falta algo, se dice qué, y no se crea la operación
      const faltan = camposFaltantes(solicitud.carga, carga.error.issues);
      if (faltan.length > 0) {
        const nombres = faltan.map((campo) => ejecutor.nombresDeCampos?.[campo] ?? campo);
        throw errorApi(400, 'DATOS_FALTANTES', `Falta ${unirConY(nombres)}.`, { campos: faltan });
      }
      throw errorApi(400, 'SOLICITUD_INVALIDA', 'Faltan datos o no tienen el formato esperado.');
    }

    const propuesta = await ejecutor.proponer(contexto, carga.data);
    const [vistaPropuesta, cargaFinal] = 'vista' in propuesta ? [propuesta.vista, propuesta.carga] : [propuesta, carga.data];
    const vista = VistaConfirmacion.parse(vistaPropuesta);
    if (extra.desdeEnEspera) {
      const pasada = await this.datos(contexto).operacion.updateMany({
        where: { id: extra.desdeEnEspera, perfilId: contexto.perfilId, estado: 'en_espera' },
        data: { tipo: solicitud.tipo, origen: solicitud.origen, carga: cargaFinal as object, vistaConfirmacion: vista, estado: 'propuesta', motivoEspera: null },
      });
      if (pasada.count === 1) return aRespuesta(await this.buscar(contexto, extra.desdeEnEspera));
    }
    const op = await this.datos(contexto).operacion.create({
      data: {
        organizacionId: this.organizacionDe(contexto),
        perfilId: contexto.perfilId,
        ambito: ambitoDe(contexto),
        tipo: solicitud.tipo,
        origen: solicitud.origen,
        solicitudOriginal: solicitud.solicitudOriginal ?? null,
        conversacionId: extra.conversacionId ?? null,
        carga: cargaFinal as object,
        vistaConfirmacion: vista,
        estado: 'propuesta',
      },
    });
    return aRespuesta(op);
  }

  async confirmar(contexto: ContextoSolicitud, id: string): Promise<OperacionRespuesta> {
    const op = await this.buscar(contexto, id);
    if (op.estado === 'ejecutada') return aRespuesta(op); // Idempotente: mismo resultado, sin repetir el efecto.
    if (op.estado !== 'propuesta') {
      throw errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Esta acción ya no se puede confirmar.');
    }
    // Por si el rol o la condición de administrador cambiaron desde que se propuso
    const tipo = this.registro.obtener(op.tipo);
    if (tipo) await this.comprobarAutoridad(contexto, tipo);
    if (!VistaConfirmacion.parse(op.vistaConfirmacion).confirmable) {
      throw errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Hay que resolver lo que impide esta acción antes de confirmarla.');
    }

    const reclamada = await this.datos(contexto).operacion.updateMany({
      where: { id, perfilId: contexto.perfilId, estado: 'propuesta', confirmadaEn: null },
      data: { confirmadaEn: new Date() },
    });
    if (reclamada.count !== 1) return this.resolverConcurrencia(contexto, id);

    const ejecutor = this.registro.obtener(op.tipo);
    if (!ejecutor) throw errorApi(400, 'OPERACION_DESCONOCIDA', 'Esa acción no existe.');

    let actualizada: Operacion;
    let efimero: OperacionRespuesta['efimero'];
    try {
      const resultado = await ejecutor.ejecutar(contexto, ejecutor.esquema.parse(op.carga), { id });
      if (resultado.tipo === 'ejecutada') efimero = resultado.efimero;
      actualizada = await this.datos(contexto).operacion.update({
        where: { id },
        data:
          resultado.tipo === 'ejecutada'
            ? { estado: 'ejecutada', resultado: resultado.resultado as object, ejecutadaEn: new Date() }
            : { estado: 'propuesta', vistaConfirmacion: VistaConfirmacion.parse(resultado.vistaConfirmacion), confirmadaEn: null },
      });
    } catch (error) {
      actualizada = await this.datos(contexto).operacion.update({
        where: { id },
        data: { estado: 'fallida', error: error instanceof Error ? error.message : 'Error al ejecutar la acción.' },
      });
    }
    return efimero ? { ...aRespuesta(actualizada), efimero } : aRespuesta(actualizada);
  }

  // P-11 · T-033 · plan §7: guarda lo pedido sin crear ni enviar nada. No se puede confirmar: no tiene
  // ejecutor. Con `desdeEnEspera`, la misma fila cambia de motivo (lo que esperaba al asistente resultó una tarea).
  async encolar(
    contexto: ContextoSolicitud,
    datos: {
      tipo: string;
      carga: object;
      motivo: MotivoEspera;
      solicitudOriginal: string;
      capturadaEn: Date;
      conversacionId: string | null;
      desdeEnEspera?: string;
    },
  ): Promise<OperacionRespuesta> {
    const vista: VistaConfirmacion = {
      accion: 'Atender lo que pediste',
      datos: [{ etiqueta: 'Lo que pediste', valor: datos.solicitudOriginal }],
      irreversible: null,
      confirmable: false,
      motivoNoConfirmable: MOTIVOS_DE_ESPERA[datos.motivo],
    };
    if (datos.desdeEnEspera) {
      const cambiada = await this.datos(contexto).operacion.updateMany({
        where: { id: datos.desdeEnEspera, perfilId: contexto.perfilId, estado: 'en_espera' },
        data: { tipo: datos.tipo, carga: datos.carga, motivoEspera: datos.motivo, vistaConfirmacion: vista },
      });
      if (cambiada.count === 1) return aRespuesta(await this.buscar(contexto, datos.desdeEnEspera));
    }
    const op = await this.datos(contexto).operacion.create({
      data: {
        organizacionId: contexto.organizacionId,
        perfilId: contexto.perfilId,
        tipo: datos.tipo,
        origen: 'agente',
        solicitudOriginal: datos.solicitudOriginal.slice(0, 2000),
        carga: datos.carga,
        vistaConfirmacion: vista,
        estado: 'en_espera',
        motivoEspera: datos.motivo,
        capturadaEn: datos.capturadaEn,
        conversacionId: datos.conversacionId,
      },
    });
    return aRespuesta(op);
  }

  async descartar(contexto: ContextoSolicitud, id: string): Promise<OperacionRespuesta> {
    await this.buscar(contexto, id);
    const descartada = await this.datos(contexto).operacion.updateMany({
      where: { id, perfilId: contexto.perfilId, estado: { in: ['propuesta', 'en_espera'] }, confirmadaEn: null },
      data: { estado: 'descartada' },
    });
    if (descartada.count !== 1) throw errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Esta acción ya no se puede descartar.');
    return aRespuesta(await this.buscar(contexto, id));
  }

  async listar(contexto: ContextoSolicitud, estados?: EstadoOperacion[]): Promise<OperacionRespuesta[]> {
    const ops = await this.datos(contexto).operacion.findMany({
      where: { perfilId: contexto.perfilId, ambito: ambitoDe(contexto), ...(estados ? { estado: { in: estados } } : {}) },
      orderBy: { creadaEn: 'desc' },
      take: 100,
    });
    return ops.map(aRespuesta);
  }

  // REQ-ACC-15: solo el responsable del equipo asigna trabajo a otros, aunque el colaborador tenga el plan.
  // T-060 · REQ-ADM-06, REQ-ADM-16: solo el administrador administra, y el rechazo queda registrado.
  private async comprobarAutoridad(contexto: ContextoSolicitud, ejecutor: Pick<EjecutorOperacion, 'tipo' | 'soloResponsable' | 'soloAdministrador'>): Promise<void> {
    if (ejecutor.soloResponsable && contexto.rol === 'colaborador') throw errorApi(403, 'ROL_NO_PERMITIDO', SOLO_EL_RESPONSABLE);
    if (ejecutor.soloAdministrador && !(await this.pertenencias.esAdministrador(contexto))) {
      await this.pertenencias.registrarRechazo(contexto, { tipo: ejecutor.tipo });
      throw errorApi(403, 'ADMINISTRACION_NO_PERMITIDA', SOLO_EL_ADMINISTRADOR);
    }
  }

  // La organización donde viven las Operaciones del ámbito de la sesión (plan §5.2, H-ADM-18)
  private organizacionDe(contexto: ContextoSolicitud): string {
    if (ambitoDe(contexto) === 'propio') return contexto.organizacionId;
    if (!contexto.empresa) throw errorApi(403, 'SIN_ORGANIZACION', SIN_ORGANIZACION);
    return contexto.empresa.organizacionId;
  }

  // Otra confirmación ganó la carrera: si ya terminó, mismo resultado; si sigue en curso, se dice.
  private async resolverConcurrencia(contexto: ContextoSolicitud, id: string): Promise<OperacionRespuesta> {
    const actual = await this.buscar(contexto, id);
    if (actual.estado === 'ejecutada') return aRespuesta(actual);
    if (actual.estado === 'propuesta') {
      throw errorApi(409, 'OPERACION_EN_CURSO', 'Esta acción ya se está ejecutando.');
    }
    throw errorApi(409, 'OPERACION_NO_CONFIRMABLE', 'Esta acción ya no se puede confirmar.');
  }

  private async buscar(contexto: ContextoSolicitud, id: string): Promise<Operacion> {
    const op = await this.datos(contexto).operacion.findFirst({ where: { id, perfilId: contexto.perfilId, ambito: ambitoDe(contexto) } });
    if (!op) throw noEncontrada();
    return op;
  }

  private datos(contexto: ContextoSolicitud) {
    return this.prisma.deOrganizacion(this.organizacionDe(contexto));
  }
}
