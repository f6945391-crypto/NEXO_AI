import 'reflect-metadata';
import { Injectable, type INestApplication, type OnModuleInit } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, OperacionRespuesta, type VistaConfirmacion } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { RegistroOperaciones, type EjecutorOperacion, type ResultadoEjecucion } from '../../src/operaciones/registro';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-012 · AD-09, P-03, P-07 · núcleo de REQ-CUN01-03

const vista = (confirmable = true): VistaConfirmacion => ({
  accion: 'Contar una vez',
  datos: [{ etiqueta: 'Qué', valor: 'una prueba' }],
  irreversible: null,
  confirmable,
  motivoNoConfirmable: confirmable ? null : 'Hay un conflicto',
});

// Ejecutor de prueba: cuenta sus ejecuciones. Con `modo` se fuerzan los otros desenlaces.
@Injectable()
class EjecutorDePrueba implements EjecutorOperacion<{ modo: 'normal' | 'reproponer' | 'fallar' | 'bloqueada' }>, OnModuleInit {
  readonly tipo = 'prueba.contar';
  readonly esquema = z.strictObject({ modo: z.enum(['normal', 'reproponer', 'fallar', 'bloqueada']) });
  ejecuciones = 0;

  constructor(private readonly registro: RegistroOperaciones) {}

  onModuleInit() {
    this.registro.registrar(this);
  }

  async proponer(_: unknown, carga: { modo: string }) {
    return vista(carga.modo !== 'bloqueada');
  }

  async ejecutar(_: unknown, carga: { modo: string }): Promise<ResultadoEjecucion> {
    if (carga.modo === 'fallar') throw new Error('El proveedor rechazó la acción');
    if (carga.modo === 'reproponer') return { tipo: 'reproponer', vistaConfirmacion: { ...vista(), accion: 'Propuesta nueva' } };
    await new Promise((r) => setTimeout(r, 50)); // Ventana para que dos confirmaciones compitan.
    this.ejecuciones += 1;
    return { tipo: 'ejecutada', resultado: { ejecucion: this.ejecuciones } };
  }
}

const CONTRASENA = 'una-contrasena-de-prueba';

describe('operaciones.confirmar-dos-veces-ejecuta-una', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ejecutor: EjecutorDePrueba;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function token() {
    const correo = `op${++n}@nexoai.test`;
    await crearCuentaLista(prisma, { organizacionId, correo, rol: 'gerente', plan: 'empresarial' }, CONTRASENA);
    const sesion = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return `Bearer ${sesion.tokenAcceso}`;
  }

  async function proponer(autorizacion: string, modo = 'normal') {
    const respuesta = await http()
      .post('/operaciones')
      .set('Authorization', autorizacion)
      .send({ tipo: 'prueba.contar', carga: { modo }, origen: 'control_directo' })
      .expect(201);
    return OperacionRespuesta.parse(respuesta.body);
  }

  const confirmar = (autorizacion: string, id: string) =>
    http().post(`/operaciones/${id}/confirmar`).set('Authorization', autorizacion);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule], providers: [EjecutorDePrueba] }).compile();
    app = modulo.createNestApplication();
    await app.init();
    ejecutor = app.get(EjecutorDePrueba);
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    ejecutor.ejecuciones = 0;
  });

  it('proponer no produce ningún efecto (REQ-CUN01-03)', async () => {
    const op = await proponer(await token());
    expect(op.estado).toBe('propuesta');
    expect(op.vistaConfirmacion.accion).toBe('Contar una vez');
    expect(ejecutor.ejecuciones).toBe(0);
  });

  it('confirmar ejecuta una vez y confirmar de nuevo devuelve el mismo resultado sin repetir el efecto', async () => {
    const autorizacion = await token();
    const op = await proponer(autorizacion);
    const primera = OperacionRespuesta.parse((await confirmar(autorizacion, op.id).expect(200)).body);
    const segunda = OperacionRespuesta.parse((await confirmar(autorizacion, op.id).expect(200)).body);

    expect(primera.estado).toBe('ejecutada');
    expect(segunda).toEqual(primera);
    expect(ejecutor.ejecuciones).toBe(1);
  });

  it('dos confirmaciones simultáneas ejecutan una sola vez', async () => {
    const autorizacion = await token();
    const op = await proponer(autorizacion);
    const respuestas = await Promise.all([confirmar(autorizacion, op.id), confirmar(autorizacion, op.id)]);

    expect(ejecutor.ejecuciones).toBe(1);
    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409]);
    const perdedora = respuestas.find((r) => r.status === 409)!;
    expect(ErrorApi.parse(perdedora.body).codigo).toBe('OPERACION_EN_CURSO');
  });

  it('descartar no ejecuta nada y después ya no se puede confirmar', async () => {
    const autorizacion = await token();
    const op = await proponer(autorizacion);
    const descartada = await http().post(`/operaciones/${op.id}/descartar`).set('Authorization', autorizacion).expect(200);
    expect(OperacionRespuesta.parse(descartada.body).estado).toBe('descartada');

    const intento = await confirmar(autorizacion, op.id).expect(409);
    expect(ErrorApi.parse(intento.body).codigo).toBe('OPERACION_NO_CONFIRMABLE');
    expect(ejecutor.ejecuciones).toBe(0);
  });

  it('una propuesta marcada como no confirmable no se ejecuta (REQ-CUN01-05)', async () => {
    const autorizacion = await token();
    const op = await proponer(autorizacion, 'bloqueada');
    await confirmar(autorizacion, op.id).expect(409);
    expect(ejecutor.ejecuciones).toBe(0);
  });

  it('si al confirmar algo cambió, vuelve a propuesta con la vista nueva y se puede confirmar otra vez (H-AG-07)', async () => {
    const autorizacion = await token();
    const op = await proponer(autorizacion, 'reproponer');
    const reabierta = OperacionRespuesta.parse((await confirmar(autorizacion, op.id).expect(200)).body);
    expect(reabierta.estado).toBe('propuesta');
    expect(reabierta.vistaConfirmacion.accion).toBe('Propuesta nueva');
    const fila = await prisma.operacion.findUniqueOrThrow({ where: { id: op.id } });
    expect(fila.confirmadaEn).toBeNull();
  });

  it('si la ejecución falla, la operación queda fallida con el motivo', async () => {
    const autorizacion = await token();
    const op = await proponer(autorizacion, 'fallar');
    const fallida = OperacionRespuesta.parse((await confirmar(autorizacion, op.id).expect(200)).body);
    expect(fallida.estado).toBe('fallida');
    expect(fallida.error).toBe('El proveedor rechazó la acción');
  });

  it('nadie más puede ver ni confirmar una operación ajena', async () => {
    const duena = await token();
    const otra = await token();
    const op = await proponer(duena);

    const ajena = await confirmar(otra, op.id).expect(404);
    expect(ErrorApi.parse(ajena.body).codigo).toBe('OPERACION_NO_ENCONTRADA');
    const lista = await http().get('/operaciones').set('Authorization', otra).expect(200);
    expect(lista.body).toEqual([]);
    expect(ejecutor.ejecuciones).toBe(0);
  });

  it('rechaza un tipo desconocido o una carga inválida sin crear nada', async () => {
    const autorizacion = await token();
    const desconocida = await http()
      .post('/operaciones')
      .set('Authorization', autorizacion)
      .send({ tipo: 'no.existe', carga: {}, origen: 'agente' })
      .expect(400);
    expect(ErrorApi.parse(desconocida.body).codigo).toBe('OPERACION_DESCONOCIDA');
    await http()
      .post('/operaciones')
      .set('Authorization', autorizacion)
      .send({ tipo: 'prueba.contar', carga: { modo: 'otro' }, origen: 'agente' })
      .expect(400);
    expect(await prisma.operacion.count()).toBe(0);
  });

  it('lista las operaciones propias filtrando por estado', async () => {
    const autorizacion = await token();
    const pendiente = await proponer(autorizacion);
    const hecha = await proponer(autorizacion);
    await confirmar(autorizacion, hecha.id).expect(200);

    const propuestas = await http().get('/operaciones?estado=propuesta').set('Authorization', autorizacion).expect(200);
    expect((propuestas.body as { id: string }[]).map((o) => o.id)).toEqual([pendiente.id]);
    const todas = await http().get('/operaciones?estado=propuesta,ejecutada').set('Authorization', autorizacion).expect(200);
    expect(todas.body).toHaveLength(2);
  });
});
