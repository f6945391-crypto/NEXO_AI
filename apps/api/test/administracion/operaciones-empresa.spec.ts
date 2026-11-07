import 'reflect-metadata';
import { Injectable, type INestApplication, type OnModuleInit } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EntradaRegistroEmpresa, ErrorApi, IngresoRespuesta, OperacionRespuesta, type VistaConfirmacion } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { OperacionesService } from '../../src/operaciones/operaciones.service';
import { RegistroOperaciones, type EjecutorOperacion, type ResultadoEjecucion } from '../../src/operaciones/registro';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-060 · REQ-ADM-07, REQ-ADM-16 · specs/08-administracion/plan.md §5.2 y §7.3

const vista: VistaConfirmacion = { accion: 'Probar la administración', datos: [{ etiqueta: 'Qué', valor: 'una prueba' }], irreversible: null, confirmable: true, motivoNoConfirmable: null };

// Un tipo de Operación de la zona de empresa, como lo serán el alta y el restablecimiento de contraseña
@Injectable()
class AdministrarDePrueba implements EjecutorOperacion<Record<string, never>>, OnModuleInit {
  readonly tipo = 'administracion.prueba';
  readonly esquema = z.strictObject({});
  readonly ambito = 'empresa';
  readonly soloAdministrador = true;
  readonly origenes = ['control_directo'] as const;
  readonly textoOrigenNoPermitido = 'Esto se hace en Administración.';
  ejecuciones = 0;

  constructor(private readonly registro: RegistroOperaciones) {}

  onModuleInit() {
    this.registro.registrar(this);
  }

  async proponer() {
    return vista;
  }

  async ejecutar(): Promise<ResultadoEjecucion> {
    this.ejecuciones += 1;
    return { tipo: 'ejecutada', resultado: { hecho: true }, efimero: { contrasenaTemporal: 'se-ve-una-vez' } };
  }
}

const CONTRASENA = 'una-contrasena-de-prueba';

describe('T-060 · Operaciones de ámbito de empresa y resultado efímero', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tipo: AdministrarDePrueba;
  let acme: string;
  let personal: string;
  let perfilId: string;
  let zona: string;
  let aplicacion: string;

  const http = () => request(app.getHttpServer());
  const token = (cuerpo: unknown) => `Bearer ${IngresoRespuesta.parse(cuerpo).tokenAcceso}`;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule], providers: [AdministrarDePrueba] }).compile();
    app = modulo.createNestApplication();
    await app.init();
    tipo = app.get(AdministrarDePrueba);
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // Una administradora afiliada: su cuenta vive en su organización personal y administra Acme (H-ADM-18)
  beforeEach(async () => {
    await vaciarTablas();
    tipo.ejecuciones = 0;
    acme = await crearOrganizacion(prisma, 'Acme', 'empresa');
    personal = await crearOrganizacion(prisma, 'Vasco', 'personal');
    perfilId = (await crearCuentaLista(prisma, { organizacionId: personal, correo: 'vasco@correo.test', rol: 'usuario_personal', plan: 'personal' }, CONTRASENA)).perfilId;
    await prisma.miembroOrganizacion.create({ data: { organizacionId: acme, perfilId, origen: 'afiliacion', estado: 'vigente', administrador: true } });
    zona = token((await http().post('/administracion/entrar').send({ correo: 'vasco@correo.test', contrasena: CONTRASENA }).expect(200)).body);
    aplicacion = token((await http().post('/auth/ingreso').send({ correo: 'vasco@correo.test', contrasena: CONTRASENA }).expect(200)).body);
  });

  describe('administracion.el-asistente-no-administra', () => {
    it('un tipo de administración no se propone con el origen del asistente ni desde la aplicación', async () => {
      const servicio = app.get(OperacionesService);
      const contexto = { perfilId, organizacionId: personal, rol: 'usuario_personal' as const, plan: 'empresarial' as const, primerIngresoPendiente: false, ambito: 'empresa' as const, empresa: { organizacionId: acme, miembroId: (await prisma.miembroOrganizacion.findFirstOrThrow()).id, origen: 'afiliacion' as const } };
      await expect(servicio.proponer(contexto, { tipo: 'administracion.prueba', carga: {}, origen: 'agente' })).rejects.toMatchObject({ response: { codigo: 'ORIGEN_NO_PERMITIDO', mensaje: 'Esto se hace en Administración.' } });

      const r = await http().post('/operaciones').set('Authorization', aplicacion).send({ tipo: 'administracion.prueba', carga: {}, origen: 'control_directo' }).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('AMBITO_INCORRECTO');
      expect(await prisma.operacion.count()).toBe(0);
    });
  });

  describe('administracion.toda-accion-confirmada-y-registrada', () => {
    it('se guarda en la empresa, no se ejecuta sin confirmar, y lo efímero llega una sola vez', async () => {
      const propuesta = OperacionRespuesta.parse((await http().post('/administracion/operaciones').set('Authorization', zona).send({ tipo: 'administracion.prueba', carga: {} }).expect(201)).body);
      expect(tipo.ejecuciones).toBe(0);
      const fila = await prisma.operacion.findUniqueOrThrow({ where: { id: propuesta.id } });
      expect([fila.organizacionId, fila.ambito, fila.origen]).toEqual([acme, 'empresa', 'control_directo']);
      expect(await prisma.operacion.count({ where: { organizacionId: personal } })).toBe(0);

      const primera = OperacionRespuesta.parse((await http().post(`/administracion/operaciones/${propuesta.id}/confirmar`).set('Authorization', zona).expect(200)).body);
      expect([primera.estado, primera.efimero]).toEqual(['ejecutada', { contrasenaTemporal: 'se-ve-una-vez' }]);
      const segunda = OperacionRespuesta.parse((await http().post(`/administracion/operaciones/${propuesta.id}/confirmar`).set('Authorization', zona).expect(200)).body);
      expect(segunda.estado).toBe('ejecutada');
      expect(segunda.efimero).toBeUndefined();
      expect(JSON.stringify((await prisma.operacion.findUniqueOrThrow({ where: { id: propuesta.id } })).resultado)).not.toContain('se-ve-una-vez');
      expect(tipo.ejecuciones).toBe(1);

      // No aparece en lo del usuario; sí en el registro de la empresa
      expect((await http().get('/operaciones').set('Authorization', aplicacion).expect(200)).body).toEqual([]);
      await http().post(`/operaciones/${propuesta.id}/confirmar`).set('Authorization', aplicacion).expect(404);
      const registro = EntradaRegistroEmpresa.array().parse((await http().get('/administracion/operaciones').set('Authorization', zona).expect(200)).body);
      expect(registro.map((e) => [e.id, e.accion, e.por, e.estado])).toEqual([[propuesta.id, 'Probar la administración', 'vasco@correo.test', 'ejecutada']]);
    });

    it('quitarle la condición entre proponer y confirmar hace fallar la confirmación sin efecto, y queda registrado', async () => {
      const propuesta = OperacionRespuesta.parse((await http().post('/administracion/operaciones').set('Authorization', zona).send({ tipo: 'administracion.prueba', carga: {} }).expect(201)).body);
      await prisma.miembroOrganizacion.updateMany({ where: { perfilId }, data: { administrador: false } });

      const r = await http().post(`/administracion/operaciones/${propuesta.id}/confirmar`).set('Authorization', zona).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('ADMINISTRACION_NO_PERMITIDA');
      expect(tipo.ejecuciones).toBe(0);
      expect((await prisma.operacion.findUniqueOrThrow({ where: { id: propuesta.id } })).estado).toBe('propuesta');
      expect(await prisma.eventoAuditoria.count({ where: { organizacionId: acme, accion: 'administracion.rechazada' } })).toBe(1);
    });
  });
});
