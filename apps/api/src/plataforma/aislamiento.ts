import type { PrismaClient } from '../generado/prisma/client';

// P-04 · propuesta técnica §9 · T-003: toda consulta sobre una tabla de la organización se filtra por
// la organización del contexto, sin que cada consulta tenga que acordarse de hacerlo.
//
// Límites conocidos, cubiertos por reglas de AGENTS.md y no por este filtro:
// - Las escrituras anidadas (`create: { relacion: { create: … } }`) no pasan por aquí.
// - Las consultas en SQL crudo tampoco.

// Modelos con columna organizacion_id. La prueba plataforma.aislamiento-entre-organizaciones
// falla si el esquema tiene alguno que no esté en esta lista.
export const MODELOS_CON_ORGANIZACION: ReadonlySet<string> = new Set([
  'PerfilUsuario',
  'EventoAuditoria',
  'Operacion',
  'ConsentimientoIntegracion',
  'EventoAgenda',
  'SincronizacionCalendario',
  // T-030: el agente
  'ConversacionAgente',
  'LlamadaModelo',
  'InvocacionHerramienta',
  'PuntoControlAgente',
  // T-038: la transcripción
  'TurnoTranscripcion',
  // T-058: pertenencia a la organización (specs/08-administracion/plan.md §3.2)
  'MiembroOrganizacion',
  // CUN-05: equipos y su pertenencia (specs/05-equipos/plan.md). Desde la fusión del 25 de noviembre de 2026
  // son también los de la administración: `equipo` y `miembro_equipo` de T-058 se retiraron (D-F1)
  'Equipo',
  'MiembroDeEquipo',
  // T-047: las tareas personales (09-tareas-personales)
  'TareaPersonal',
  // 09-tareas-personales plan §13.1 · T-125: la bitácora de una tarea
  'AvanceTarea',
  // T-132: las reuniones y sus invitados (10-reuniones)
  'Reunion',
  'InvitadoReunion',
]);

export class ErrorDeAislamiento extends Error {
  constructor(mensaje: string) {
    super(`Aislamiento entre organizaciones: ${mensaje}`);
    this.name = 'ErrorDeAislamiento';
  }
}

const CON_WHERE = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
  'upsert',
]);
const CON_DATA_NUEVA = new Set(['create', 'createMany', 'createManyAndReturn']);
const CON_DATA_CAMBIADA = new Set(['update', 'updateMany', 'updateManyAndReturn']);

type Argumentos = Record<string, unknown>;

function comoLista(valor: unknown): unknown[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

// Se añade la condición con AND, que vale tanto para las consultas por clave única como para las demás.
function restringir(where: unknown, campo: string, organizacionId: string): Argumentos {
  const actual = (where ?? {}) as Argumentos;
  return { ...actual, AND: [...comoLista(actual.AND), { [campo]: organizacionId }] };
}

function asignar(data: unknown, organizacionId: string, modelo: string): Argumentos {
  const fila = { ...((data ?? {}) as Argumentos) };
  if ('organizacion' in fila) {
    throw new ErrorDeAislamiento(`${modelo}: usa organizacionId, no la relación organizacion`);
  }
  if (fila.organizacionId !== undefined && fila.organizacionId !== organizacionId) {
    throw new ErrorDeAislamiento(`${modelo}: no se puede crear una fila de otra organización`);
  }
  return { ...fila, organizacionId };
}

function impedirCambioDeOrganizacion(data: unknown, modelo: string): void {
  const cambios = (data ?? {}) as Argumentos;
  if ('organizacionId' in cambios || 'organizacion' in cambios) {
    throw new ErrorDeAislamiento(`${modelo}: una fila no cambia de organización`);
  }
}

export function aislarPorOrganizacion(prisma: PrismaClient, organizacionId: string) {
  return prisma.$extends({
    name: 'aislamiento-por-organizacion',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const esOrganizacion = model === 'Organizacion';
          if (!esOrganizacion && !MODELOS_CON_ORGANIZACION.has(model)) return query(args);

          const campo = esOrganizacion ? 'id' : 'organizacionId';
          const a = { ...((args ?? {}) as Argumentos) };

          if (esOrganizacion && (CON_DATA_NUEVA.has(operation) || operation === 'upsert')) {
            throw new ErrorDeAislamiento('las organizaciones no se crean desde el contexto de otra');
          }
          if (CON_WHERE.has(operation)) a.where = restringir(a.where, campo, organizacionId);
          if (CON_DATA_CAMBIADA.has(operation)) impedirCambioDeOrganizacion(a.data, model);
          if (CON_DATA_NUEVA.has(operation)) {
            a.data = Array.isArray(a.data)
              ? a.data.map((fila) => asignar(fila, organizacionId, model))
              : asignar(a.data, organizacionId, model);
          }
          if (operation === 'upsert') {
            a.create = asignar(a.create, organizacionId, model);
            impedirCambioDeOrganizacion(a.update, model);
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

export type PrismaDeOrganizacion = ReturnType<typeof aislarPorOrganizacion>;
