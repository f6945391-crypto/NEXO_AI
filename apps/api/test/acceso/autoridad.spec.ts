import 'reflect-metadata';
import { Controller, Get, Injectable, type INestApplication, type OnModuleInit } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, type Rol, type VistaConfirmacion } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { CLAVE_ALCANCE, CLAVE_PUBLICO, SoloResponsable } from '../../src/identidad/decoradores';
import { RegistroOperaciones, type EjecutorOperacion, type ResultadoEjecucion } from '../../src/operaciones/registro';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-026 · REQ-ACC-13, REQ-ACC-15 · specs/06-acceso/plan.md §5.5

// Una ruta del responsable, como lo será la administración del equipo
@SoloResponsable()
@Controller('prueba-equipo')
class RutaDelResponsable {
  llamadas = 0;

  @Get()
  responder() {
    this.llamadas += 1;
    return { ok: true };
  }
}

const vista: VistaConfirmacion = { accion: 'Asignar', datos: [], irreversible: null, confirmable: true, motivoNoConfirmable: null };

// Un tipo de Operación que asigna trabajo, como lo será la delegación (fase 4)
@Injectable()
class AsignarDePrueba implements EjecutorOperacion<Record<string, never>>, OnModuleInit {
  readonly tipo = 'prueba.asignar';
  readonly esquema = z.strictObject({});
  readonly soloResponsable = true;
  propuestas = 0;

  constructor(private readonly registro: RegistroOperaciones) {}

  onModuleInit() {
    this.registro.registrar(this);
  }

  async proponer() {
    this.propuestas += 1;
    return vista;
  }

  async ejecutar(): Promise<ResultadoEjecucion> {
    return { tipo: 'ejecutada', resultado: null };
  }
}

const CONTRASENA = 'una-contrasena-de-prueba';

describe('T-026 · el colaborador con el plan, sin autoridad sobre otros', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let ruta: RutaDelResponsable;
  let asignar: AsignarDePrueba;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function sesion(rol: Rol) {
    const correo = `au${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan: 'empresarial' }, CONTRASENA);
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule, DiscoveryModule],
      controllers: [RutaDelResponsable],
      providers: [AsignarDePrueba],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
    ruta = app.get(RutaDelResponsable);
    asignar = app.get(AsignarDePrueba);
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    ruta.llamadas = 0;
    asignar.propuestas = 0;
  });

  describe('acceso.solo-el-responsable-asigna-tareas', () => {
    it('al colaborador, una ruta del responsable se le rechaza sin ejecutarla, y explica por qué', async () => {
      const { autorizacion } = await sesion('colaborador');
      const r = await http().get('/prueba-equipo').set('Authorization', autorizacion).expect(403);
      expect(ErrorApi.parse(r.body)).toEqual({ codigo: 'ROL_NO_PERMITIDO', mensaje: 'Solo el responsable del equipo asigna tareas y administra el equipo.' });
      expect(ruta.llamadas).toBe(0);
    });

    it('al colaborador, una Operación que asigna trabajo se le rechaza sin proponer ni crear nada', async () => {
      const { perfilId, autorizacion } = await sesion('colaborador');
      const r = await http().post('/operaciones').set('Authorization', autorizacion).send({ tipo: 'prueba.asignar', carga: {}, origen: 'agente' }).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('ROL_NO_PERMITIDO');
      expect(asignar.propuestas).toBe(0);
      expect(await prisma.operacion.count({ where: { perfilId } })).toBe(0);
    });

    it('el responsable sí puede, por la ruta y por la Operación', async () => {
      const { autorizacion } = await sesion('gerente');
      await http().get('/prueba-equipo').set('Authorization', autorizacion).expect(200);
      await http().post('/operaciones').set('Authorization', autorizacion).send({ tipo: 'prueba.asignar', carga: {}, origen: 'agente' }).expect(201);
      expect(asignar.propuestas).toBe(1);
    });
  });

  describe('acceso.toda-ruta-declara-su-alcance', () => {
    it('cada ruta de la aplicación es pública o declara @SobreLoPropio o @SoloResponsable', () => {
      const sinDeclarar: string[] = [];
      let revisadas = 0;
      for (const { metatype } of app.get(DiscoveryService).getControllers()) {
        if (!metatype || metatype === RutaDelResponsable) continue;
        const clase = metatype as new (...args: never[]) => object;
        for (const nombre of Object.getOwnPropertyNames(clase.prototype)) {
          const metodo = (clase.prototype as Record<string, unknown>)[nombre];
          if (nombre === 'constructor' || typeof metodo !== 'function' || Reflect.getMetadata(METHOD_METADATA, metodo) === undefined) continue;
          revisadas += 1;
          const declara = (clave: string) => Reflect.getMetadata(clave, metodo) !== undefined || Reflect.getMetadata(clave, clase) !== undefined;
          if (!declara(CLAVE_PUBLICO) && !declara(CLAVE_ALCANCE)) {
            sinDeclarar.push(`${clase.name}.${nombre} (${String(Reflect.getMetadata(PATH_METADATA, metodo))})`);
          }
        }
      }
      expect(revisadas).toBeGreaterThan(10);
      expect(sinDeclarar).toEqual([]);
    });
  });
});
