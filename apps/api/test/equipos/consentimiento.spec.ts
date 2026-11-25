import { ejecutarSql, urlPrueba } from '../utilidades/base-prueba';
import { DisponibilidadEquipoService } from '../../src/equipos/disponibilidad-equipo.service';
import { vi } from 'vitest';
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  IngresoRespuesta,
  OperacionRespuesta,
  type Rol,
} from '@nexoai/contratos';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import {
  clientePrueba,
  crearCuentaLista,
  vaciarTablas,
} from '../utilidades/base-prueba';

const CONTRASENA = 'una-contrasena-de-prueba';
const TIPO = 'equipo.cambiar_consentimiento';
const ACCION = 'equipo.consentimiento-cambiado';

describe('CUN-05 - Consentimiento individual mediante Operaciones', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let equipoId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function persona(
    rol: Rol = 'colaborador',
    integrante = true,
  ) {
    const correo = `consentimiento${++n}@nexoai.test`;

    const { perfilId } = await crearCuentaLista(
      prisma,
      {
        organizacionId,
        correo,
        rol,
        plan: 'empresarial',
      },
      CONTRASENA,
      'America/Lima',
    );

    if (integrante) {
      await prisma.miembroDeEquipo.create({
        data: {
          organizacionId,
          equipoId,
          perfilId,
          rolEnEquipo:
            rol === 'gerente' ? 'responsable' : 'integrante',
        },
      });
    }

    const ingreso = IngresoRespuesta.parse(
      (await http()
        .post('/auth/ingreso')
        .send({ correo, contrasena: CONTRASENA })
        .expect(200)).body,
    );

    return {
      perfilId,
      autorizacion: `Bearer ${ingreso.tokenAcceso}`,
    };
  }

  const proponer = (
    autorizacion: string,
    estado: string,
    extra: Record<string, unknown> = {},
  ) =>
    http()
      .post('/operaciones')
      .set('Authorization', autorizacion)
      .send({
        tipo: TIPO,
        origen: 'control_directo',
        carga: { equipoId, estado, ...extra },
      });

  const confirmar = (autorizacion: string, id: string) =>
    http()
      .post(`/operaciones/${id}/confirmar`)
      .set('Authorization', autorizacion);

  const membresia = (perfilId: string) =>
    prisma.miembroDeEquipo.findFirstOrThrow({
      where: { equipoId, perfilId, organizacionId },
    });

  const auditorias = (perfilId: string) =>
    prisma.eventoAuditoria.findMany({
      where: {
        organizacionId,
        perfilId,
        accion: ACCION,
      },
    });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();

    organizacionId = await crearOrganizacion(
      prisma,
      'Organizacion de consentimiento',
    );

    const equipo = await prisma.equipo.create({
      data: {
        organizacionId,
        nombre: 'Equipo de prueba',
      },
    });

    equipoId = equipo.id;
  });

  it('proponer no modifica el consentimiento ni genera auditoria', async () => {
    const p = await persona();

    const op = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    expect(op.estado).toBe('propuesta');
    expect(op.vistaConfirmacion.confirmable).toBe(true);

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('pendiente');

    expect(await auditorias(p.perfilId)).toHaveLength(0);
  });

  it('confirmar modifica el consentimiento y registra auditoria', async () => {
    const p = await persona();

    const op = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    const resultado = OperacionRespuesta.parse(
      (await confirmar(p.autorizacion, op.id)
        .expect(200)).body,
    );

    expect(resultado.estado).toBe('ejecutada');

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('concedida');

    expect(await auditorias(p.perfilId)).toMatchObject([
      {
        detalle: {
          equipoId,
          antes: 'pendiente',
          despues: 'concedida',
        },
      },
    ]);
  });

  it('confirmar dos veces no duplica la auditoria', async () => {
    const p = await persona();

    const op = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    await confirmar(p.autorizacion, op.id).expect(200);

    const primera = await membresia(p.perfilId);

    await confirmar(p.autorizacion, op.id).expect(200);

    const segunda = await membresia(p.perfilId);

    expect(segunda.consentimientoCambiadoEn)
      .toEqual(primera.consentimientoCambiadoEn);

    expect(await auditorias(p.perfilId)).toHaveLength(1);
  });

  it('descartar una propuesta no modifica el consentimiento', async () => {
    const p = await persona();

    const op = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    await http()
      .post(`/operaciones/${op.id}/descartar`)
      .set('Authorization', p.autorizacion)
      .expect(200);

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('pendiente');

    expect(await auditorias(p.perfilId)).toHaveLength(0);
  });

  it('un gerente no puede conceder consentimiento por otro integrante', async () => {
    const gerente = await persona('gerente');
    const colaborador = await persona();

    await proponer(
      gerente.autorizacion,
      'concedida',
      { perfilId: colaborador.perfilId },
    ).expect(400);

    expect(
      (await membresia(colaborador.perfilId)).estadoConsentimiento,
    ).toBe('pendiente');

    expect(await auditorias(colaborador.perfilId))
      .toHaveLength(0);
  });

  it('un usuario ajeno al equipo no puede proponer el cambio', async () => {
    const p = await persona('colaborador', false);

    await proponer(p.autorizacion, 'concedida').expect(403);

    expect(await auditorias(p.perfilId)).toHaveLength(0);
  });

  it('otro integrante no puede confirmar una operacion ajena', async () => {
    const p = await persona();
    const otro = await persona('gerente');

    const op = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    await confirmar(otro.autorizacion, op.id).expect(404);

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('pendiente');

    expect(await auditorias(p.perfilId)).toHaveLength(0);
  });

  it('una propuesta antigua no puede reactivar un consentimiento revocado', async () => {
    const p = await persona();

    const antigua = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    const revocar = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'revocada')
        .expect(201)).body,
    );

    const revocada = OperacionRespuesta.parse(
      (await confirmar(p.autorizacion, revocar.id)
        .expect(200)).body,
    );

    expect(revocada.estado).toBe('ejecutada');

    const obsoleta = OperacionRespuesta.parse(
      (await confirmar(p.autorizacion, antigua.id)
        .expect(200)).body,
    );

    expect(obsoleta.estado).toBe('fallida');

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('revocada');

    expect(await auditorias(p.perfilId)).toHaveLength(1);
  });

  it('la ruta PATCH anterior no permite modificar el consentimiento', async () => {
    const p = await persona();

    await http()
      .patch(`/equipos/${equipoId}/mi-consentimiento`)
      .set('Authorization', p.autorizacion)
      .send({ estado: 'concedida' })
      .expect(404);

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('pendiente');

    expect(await auditorias(p.perfilId)).toHaveLength(0);
  });

  it('aisla el consentimiento entre organizaciones', async () => {
    const p = await persona();

    const otraOrganizacion = await crearOrganizacion(
      prisma,
      'Otra organizacion',
    );

    const otroEquipo = await prisma.equipo.create({
      data: {
        organizacionId: otraOrganizacion,
        nombre: 'Equipo externo',
      },
    });

    await proponer(
      p.autorizacion,
      'concedida',
      { equipoId: otroEquipo.id },
    ).expect(403);

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('pendiente');

    expect(await auditorias(p.perfilId)).toHaveLength(0);
  });

  it('rechaza referencias internas introducidas por el cliente', async () => {
    const p = await persona();
    const actual = await membresia(p.perfilId);

    await proponer(
      p.autorizacion,
      'concedida',
      {
        referencia: {
          membresiaId: actual.id,
          estadoAnterior: 'pendiente',
          cambiadoEn: null,
        },
      },
    ).expect(400);

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('pendiente');

    expect(await auditorias(p.perfilId)).toHaveLength(0);

    expect(await prisma.operacion.count({
      where: {
        perfilId: p.perfilId,
        tipo: TIPO,
      },
    })).toBe(0);
  });

  it('no permite cambiar el consentimiento mediante el agente', async () => {
    const p = await persona();

    await http()
      .post('/operaciones')
      .set('Authorization', p.autorizacion)
      .send({
        tipo: TIPO,
        origen: 'agente',
        carga: {
          equipoId,
          estado: 'concedida',
        },
      })
      .expect(403);

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('pendiente');

    expect(await auditorias(p.perfilId)).toHaveLength(0);
  });

  it('permite rechazar el consentimiento propio', async () => {
    const p = await persona();

    const op = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'rechazada')
        .expect(201)).body,
    );

    const resultado = OperacionRespuesta.parse(
      (await confirmar(p.autorizacion, op.id)
        .expect(200)).body,
    );

    expect(resultado.estado).toBe('ejecutada');

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('rechazada');

    expect(await auditorias(p.perfilId)).toMatchObject([
      {
        detalle: {
          antes: 'pendiente',
          despues: 'rechazada',
        },
      },
    ]);
  });

  it('permite revocar un consentimiento previamente concedido', async () => {
    const p = await persona();

    const conceder = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    const primera = OperacionRespuesta.parse(
      (await confirmar(p.autorizacion, conceder.id)
        .expect(200)).body,
    );

    expect(primera.estado).toBe('ejecutada');

    const revocar = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'revocada')
        .expect(201)).body,
    );

    const segunda = OperacionRespuesta.parse(
      (await confirmar(p.autorizacion, revocar.id)
        .expect(200)).body,
    );

    expect(segunda.estado).toBe('ejecutada');

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('revocada');

    const eventos = await auditorias(p.perfilId);

    expect(eventos).toHaveLength(2);

    expect(eventos).toEqual(expect.arrayContaining([
      expect.objectContaining({
        detalle: expect.objectContaining({
          antes: 'concedida',
          despues: 'revocada',
        }),
      }),
    ]));
  });

  it('permite volver a autorizar mediante una propuesta nueva', async () => {
    const p = await persona();

    for (const estado of ['concedida', 'revocada', 'concedida']) {
      const op = OperacionRespuesta.parse(
        (await proponer(p.autorizacion, estado)
          .expect(201)).body,
      );

      const resultado = OperacionRespuesta.parse(
        (await confirmar(p.autorizacion, op.id)
          .expect(200)).body,
      );

      expect(resultado.estado).toBe('ejecutada');

      expect((await membresia(p.perfilId)).estadoConsentimiento)
        .toBe(estado);
    }

    expect(await auditorias(p.perfilId)).toHaveLength(3);
  });

  it('dos propuestas concurrentes no ejecutan dos cambios sobre la misma version', async () => {
    const p = await persona();

    const primera = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    const segunda = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'rechazada')
        .expect(201)).body,
    );

    const respuestas = await Promise.all([
      confirmar(p.autorizacion, primera.id).expect(200),
      confirmar(p.autorizacion, segunda.id).expect(200),
    ]);

    const resultados = respuestas.map(
      respuesta => OperacionRespuesta.parse(respuesta.body),
    );

    expect(resultados.map(r => r.estado).sort())
      .toEqual(['ejecutada', 'fallida']);

    const ganadora = resultados.find(
      r => r.estado === 'ejecutada',
    );

    const estadoEsperado =
      ganadora?.id === primera.id
        ? 'concedida'
        : 'rechazada';

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe(estadoEsperado);

    expect(await auditorias(p.perfilId)).toHaveLength(1);
  });

  it('excluye el calendario despues de revocar el consentimiento', async () => {
    const gerente = await persona('gerente');
    const colaborador = await persona();

    const servicio = app.get(DisponibilidadEquipoService);

    const verificar = vi.spyOn(servicio, 'verificarCalendario')
      .mockResolvedValue(true);

    const ocupados = vi.spyOn(servicio, 'obtenerOcupados')
      .mockImplementation(async (_organizacionId, perfilId) =>
        perfilId === colaborador.perfilId
          ? [{
              inicio: new Date('2026-11-12T09:00:00-05:00'),
              fin: new Date('2026-11-12T10:00:00-05:00'),
            }]
          : [],
      );

    const consultar = () =>
      http()
        .get(`/equipos/${equipoId}/disponibilidad`)
        .set('Authorization', gerente.autorizacion)
        .query({
          desde: '2026-11-12T08:00:00-05:00',
          hasta: '2026-11-12T20:00:00-05:00',
          bandaHoraria: 'normal',
        })
        .expect(200);

    try {
      for (const p of [gerente, colaborador]) {
        const op = OperacionRespuesta.parse(
          (await proponer(p.autorizacion, 'concedida')
            .expect(201)).body,
        );

        const resultado = OperacionRespuesta.parse(
          (await confirmar(p.autorizacion, op.id)
            .expect(200)).body,
        );

        expect(resultado.estado).toBe('ejecutada');
      }

      const antes = await consultar();

      expect(antes.body).toMatchObject({
        disponibilidadCompleta: true,
        participantesConsultados: 2,
        participantesSinDatos: [],
        intervalos: [
          {
            inicio: '2026-11-12T13:00:00.000Z',
            fin: '2026-11-12T14:00:00.000Z',
            duracionMinutos: 60,
          },
          {
            inicio: '2026-11-12T15:00:00.000Z',
            fin: '2026-11-13T01:00:00.000Z',
            duracionMinutos: 600,
          },
        ],
      });

      const revocar = OperacionRespuesta.parse(
        (await proponer(colaborador.autorizacion, 'revocada')
          .expect(201)).body,
      );

      const revocacion = OperacionRespuesta.parse(
        (await confirmar(colaborador.autorizacion, revocar.id)
          .expect(200)).body,
      );

      expect(revocacion.estado).toBe('ejecutada');

      verificar.mockClear();
      ocupados.mockClear();

      const despues = await consultar();

      expect(despues.body).toMatchObject({
        disponibilidadCompleta: false,
        participantesConsultados: 1,
        participantesSinDatos: [colaborador.perfilId],
        detalleParticipantesSinDatos: [{
          perfilId: colaborador.perfilId,
          motivo: 'sin_consentimiento',
        }],
        intervalos: [{
          inicio: '2026-11-12T13:00:00.000Z',
          fin: '2026-11-13T01:00:00.000Z',
          duracionMinutos: 720,
        }],
      });

      expect(verificar).toHaveBeenCalledTimes(1);
      expect(ocupados).toHaveBeenCalledTimes(1);

      expect(verificar.mock.calls[0]?.[1])
        .toBe(gerente.perfilId);

      expect(ocupados.mock.calls[0]?.[1])
        .toBe(gerente.perfilId);

      expect(await auditorias(colaborador.perfilId))
        .toHaveLength(2);

    } finally {
      verificar.mockRestore();
      ocupados.mockRestore();
    }
  });

  it('revierte el consentimiento si falla la auditoria', async () => {
    // Comprobar que la aplicacion utiliza exclusivamente
    // la base de datos de pruebas.
    expect(process.env.DATABASE_URL).toBe(urlPrueba());

    const p = await persona();

    const inicial = await membresia(p.perfilId);

    const op = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    const restriccion = 'prueba_cun05_fallo_auditoria';

    const retirarRestriccion = `
      ALTER TABLE evento_auditoria
      DROP CONSTRAINT IF EXISTS ${restriccion}
    `;

    // Limpiar una posible restriccion de una ejecucion
    // anterior interrumpida.
    await ejecutarSql(retirarRestriccion);

    try {
      await ejecutarSql(`
        ALTER TABLE evento_auditoria
        ADD CONSTRAINT ${restriccion}
        CHECK (accion <> 'equipo.consentimiento-cambiado')
      `);

      const respuesta = OperacionRespuesta.parse(
        (await confirmar(p.autorizacion, op.id)
          .expect(200)).body,
      );

      expect(respuesta.estado).toBe('fallida');

      const posterior = await membresia(p.perfilId);

      expect(posterior.estadoConsentimiento)
        .toBe(inicial.estadoConsentimiento);

      expect(posterior.consentimientoCambiadoEn)
        .toEqual(inicial.consentimientoCambiadoEn);

      expect(await auditorias(p.perfilId))
        .toHaveLength(0);

    } finally {
      await ejecutarSql(retirarRestriccion);
    }

    // Verificar que el sistema vuelve a funcionar
    // despues de retirar el fallo provocado.
    const nueva = OperacionRespuesta.parse(
      (await proponer(p.autorizacion, 'concedida')
        .expect(201)).body,
    );

    const recuperacion = OperacionRespuesta.parse(
      (await confirmar(p.autorizacion, nueva.id)
        .expect(200)).body,
    );

    expect(recuperacion.estado).toBe('ejecutada');

    expect((await membresia(p.perfilId)).estadoConsentimiento)
      .toBe('concedida');

    expect(await auditorias(p.perfilId))
      .toHaveLength(1);
  });
});
