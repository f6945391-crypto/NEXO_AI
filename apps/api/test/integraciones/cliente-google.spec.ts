import 'reflect-metadata';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { cifrar, descifrar } from '../../src/integraciones/cifrado';
import { ClienteGoogle } from '../../src/integraciones/cliente-google';
import {
  ErrorOAuthGoogle,
  PROVEEDOR_OAUTH_GOOGLE,
  type ProveedorOAuthGoogle,
  type TokensGoogle,
} from '../../src/integraciones/oauth-google';
import { RequiereGoogle } from '../../src/integraciones/requiere-google';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-008 · REQ-ACC-08, REQ-ACC-09

@Controller('prueba-google')
class RutaConGoogle {
  @RequiereGoogle('calendario')
  @Get()
  responder() {
    return { llegó: true };
  }
}

// Google simulado: cuenta renovaciones y decide su resultado.
const google = {
  renovaciones: 0,
  renovacion: 'ok' as 'ok' | 'revocado' | 'caido',
};
const proveedor: ProveedorOAuthGoogle = {
  urlDeAutorizacion: () => 'https://google.prueba/auth',
  canjearCodigo: async () => {
    throw new Error('No se usa en estas pruebas');
  },
  async renovarAcceso(): Promise<TokensGoogle> {
    google.renovaciones += 1;
    if (google.renovacion === 'revocado') throw new ErrorOAuthGoogle('invalid_grant');
    if (google.renovacion === 'caido') throw new Error('tiempo agotado');
    return { accessToken: 'acceso-nuevo', refreshToken: null, expiraEn: new Date(Date.now() + 3600_000).toISOString(), alcancesConcedidos: [] };
  },
};

const CONTRASENA = 'una-contrasena-de-prueba';

describe('T-008 · permiso faltante y revocación de Google', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let cliente: ClienteGoogle;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function cuenta() {
    const correo = `cg${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol: 'gerente', plan: 'empresarial' }, CONTRASENA);
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { quien: { perfilId, organizacionId }, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  async function concederCalendario(perfilId: string, expiraEn: Date) {
    const tokens: TokensGoogle = { accessToken: 'acceso-viejo', refreshToken: 'renovacion', expiraEn: expiraEn.toISOString(), alcancesConcedidos: [] };
    await prisma.consentimientoIntegracion.create({
      data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido', tokenCifrado: cifrar(JSON.stringify(tokens)) },
    });
  }

  // Petición a Google simulada: registra con qué token se llamó y responde lo que se le pida.
  function peticionQueResponde(...estados: number[]) {
    const tokensUsados: string[] = [];
    const peticion = async (token: string) => {
      tokensUsados.push(token);
      return new Response('{}', { status: estados.shift() ?? 200 });
    };
    return { peticion, tokensUsados };
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule], controllers: [RutaConGoogle] })
      .overrideProvider(PROVEEDOR_OAUTH_GOOGLE)
      .useValue(proveedor)
      .compile();
    app = modulo.createNestApplication();
    await app.init();
    cliente = app.get(ClienteGoogle);
    prisma = clientePrueba();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    google.renovaciones = 0;
    google.renovacion = 'ok';
  });

  describe('acceso.sin-google-no-agenda-ni-envia', () => {
    it('una ruta que requiere el calendario responde PERMISO_GOOGLE_FALTANTE sin llamar a Google', async () => {
      const { autorizacion } = await cuenta();
      const r = await http().get('/prueba-google').set('Authorization', autorizacion).expect(403);
      expect(ErrorApi.parse(r.body)).toMatchObject({ codigo: 'PERMISO_GOOGLE_FALTANTE' });
      expect(ErrorApi.parse(r.body).mensaje).toContain('Ajustes');
      expect(google.renovaciones).toBe(0);
    });

    it('con el permiso concedido la ruta sí se ejecuta', async () => {
      const { autorizacion, quien } = await cuenta();
      await concederCalendario(quien.perfilId, new Date(Date.now() + 3600_000));
      await http().get('/prueba-google').set('Authorization', autorizacion).expect(200);
    });

    it('el cliente de Google no hace ninguna petición sin permiso', async () => {
      const { quien } = await cuenta();
      const { peticion, tokensUsados } = peticionQueResponde();
      await expect(cliente.llamar(quien, 'calendario', peticion)).rejects.toMatchObject({ status: 403 });
      expect(tokensUsados).toEqual([]);
    });
  });

  describe('renovación del acceso', () => {
    it('con el acceso vigente llama directamente, sin renovar', async () => {
      const { quien } = await cuenta();
      await concederCalendario(quien.perfilId, new Date(Date.now() + 3600_000));
      const { peticion, tokensUsados } = peticionQueResponde(200);
      await cliente.llamar(quien, 'calendario', peticion);
      expect(tokensUsados).toEqual(['acceso-viejo']);
      expect(google.renovaciones).toBe(0);
    });

    it('con el acceso caducado lo renueva, llama con el nuevo y lo guarda cifrado conservando la renovación', async () => {
      const { quien } = await cuenta();
      await concederCalendario(quien.perfilId, new Date(Date.now() - 1000));
      const { peticion, tokensUsados } = peticionQueResponde(200);
      await cliente.llamar(quien, 'calendario', peticion);
      expect(tokensUsados).toEqual(['acceso-nuevo']);
      const fila = await prisma.consentimientoIntegracion.findFirstOrThrow();
      expect(JSON.parse(descifrar(fila.tokenCifrado!))).toMatchObject({ accessToken: 'acceso-nuevo', refreshToken: 'renovacion' });
    });

    it('si Google rechaza el acceso, renueva una vez y repite la petición', async () => {
      const { quien } = await cuenta();
      await concederCalendario(quien.perfilId, new Date(Date.now() + 3600_000));
      const { peticion, tokensUsados } = peticionQueResponde(401, 200);
      const r = await cliente.llamar(quien, 'calendario', peticion);
      expect(r.status).toBe(200);
      expect(tokensUsados).toEqual(['acceso-viejo', 'acceso-nuevo']);
    });

    it('un fallo pasajero de Google no marca el permiso como retirado', async () => {
      const { quien } = await cuenta();
      await concederCalendario(quien.perfilId, new Date(Date.now() - 1000));
      google.renovacion = 'caido';
      await expect(cliente.llamar(quien, 'calendario', peticionQueResponde().peticion)).rejects.toMatchObject({ status: 502 });
      expect((await prisma.consentimientoIntegracion.findFirstOrThrow()).estado).toBe('concedido');
    });
  });

  describe('acceso.revocacion-avisa-una-vez-y-no-reintenta', () => {
    it('si Google retiró el permiso: lo marca, avisa una vez y las siguientes llamadas ni lo intentan', async () => {
      const { quien, autorizacion } = await cuenta();
      await concederCalendario(quien.perfilId, new Date(Date.now() - 1000));
      google.renovacion = 'revocado';

      for (let i = 0; i < 3; i++) {
        const { peticion, tokensUsados } = peticionQueResponde();
        await expect(cliente.llamar(quien, 'calendario', peticion)).rejects.toMatchObject({ status: 403 });
        expect(tokensUsados).toEqual([]);
      }

      expect(google.renovaciones).toBe(1);
      const fila = await prisma.consentimientoIntegracion.findFirstOrThrow();
      expect(fila.estado).toBe('revocado');
      expect(fila.tokenCifrado).toBeNull();
      expect(fila.avisoEmitidoEn).not.toBeNull();
      expect(await prisma.eventoAuditoria.count({ where: { perfilId: quien.perfilId, accion: 'google.permiso-perdido' } })).toBe(1);

      // La ruta protegida también lo bloquea, y Ajustes lo muestra como retirado.
      await http().get('/prueba-google').set('Authorization', autorizacion).expect(403);
      const permisos = await http().get('/integraciones/google/permisos').set('Authorization', autorizacion).expect(200);
      expect((permisos.body as { clave: string; estado: string }[]).find((p) => p.clave === 'calendario')?.estado).toBe('revocado');
    });

    it('si el acceso sigue rechazado tras renovar, el permiso queda caducado', async () => {
      const { quien } = await cuenta();
      await concederCalendario(quien.perfilId, new Date(Date.now() + 3600_000));
      const { peticion } = peticionQueResponde(401, 401);
      await expect(cliente.llamar(quien, 'calendario', peticion)).rejects.toMatchObject({ status: 403 });
      expect((await prisma.consentimientoIntegracion.findFirstOrThrow()).estado).toBe('caducado');
    });

    it('volver a conectar después de perder el permiso deja listo el aviso para la próxima vez', async () => {
      const { quien } = await cuenta();
      await concederCalendario(quien.perfilId, new Date(Date.now() - 1000));
      google.renovacion = 'revocado';
      await expect(cliente.llamar(quien, 'calendario', peticionQueResponde().peticion)).rejects.toBeDefined();
      // Reconectar (T-007) pone avisoEmitidoEn a nulo; aquí se comprueba el estado que deja la pérdida.
      expect((await prisma.consentimientoIntegracion.findFirstOrThrow()).avisoEmitidoEn).not.toBeNull();
    });
  });
});
