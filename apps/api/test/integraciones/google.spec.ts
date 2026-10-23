import 'reflect-metadata';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ALCANCES_GOOGLE, EnlaceGoogleRespuesta, ErrorApi, IngresoRespuesta, PermisoGoogle } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { descifrar } from '../../src/integraciones/cifrado';
import { PROVEEDOR_OAUTH_GOOGLE, type ProveedorOAuthGoogle, type TokensGoogle } from '../../src/integraciones/oauth-google';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-007 · REQ-ACC-06, REQ-ACC-07, REQ-ACC-14, con Google simulado.

const CALENDARIO = ALCANCES_GOOGLE.calendario.alcance;

// Google simulado: el código decide la respuesta.
const googleSimulado: ProveedorOAuthGoogle = {
  urlDeAutorizacion: (alcance, estado) =>
    `https://google.prueba/auth?${new URLSearchParams({ scope: alcance, state: estado }).toString()}`,
  async canjearCodigo(codigo): Promise<TokensGoogle> {
    if (codigo === 'falla') throw new Error('invalid_grant');
    return {
      accessToken: 'token-de-acceso-secreto',
      refreshToken: 'token-de-renovacion-secreto',
      expiraEn: new Date(Date.now() + 3600_000).toISOString(),
      alcancesConcedidos: codigo === 'sin-permiso' ? [] : [CALENDARIO],
    };
  },
};

const CONTRASENA = 'una-contrasena-de-prueba';

describe('T-007 · conexión con Google', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function sesion(rol: 'gerente' | 'colaborador' = 'gerente') {
    const correo = `google${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan: 'empresarial' }, CONTRASENA);
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  async function enlace(autorizacion: string, alcance = 'calendario') {
    const r = await http().post('/integraciones/google/enlace').set('Authorization', autorizacion).send({ alcance }).expect(200);
    return new URL(EnlaceGoogleRespuesta.parse(r.body).url);
  }

  const permisos = async (autorizacion: string) =>
    z.array(PermisoGoogle).parse((await http().get('/integraciones/google/permisos').set('Authorization', autorizacion).expect(200)).body);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROVEEDOR_OAUTH_GOOGLE)
      .useValue(googleSimulado)
      .compile();
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
    organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
  });

  describe('acceso.permisos-google-explicados', () => {
    it('lista los dos permisos, cada uno con para qué sirve, y ninguno concedido al principio', async () => {
      const { autorizacion } = await sesion();
      const lista = await permisos(autorizacion);
      expect(lista.map((p) => [p.clave, p.estado])).toEqual([
        ['calendario', 'no_concedido'],
        ['correo', 'no_concedido'],
      ]);
      expect(lista.every((p) => p.paraQue.length > 40)).toBe(true);
    });

    it('conectar el calendario: enlace firmado, vuelta de Google y permiso concedido con el token cifrado', async () => {
      const { autorizacion, perfilId } = await sesion();
      const url = await enlace(autorizacion);
      expect(url.searchParams.get('scope')).toBe(CALENDARIO);

      const vuelta = await http().get('/integraciones/google/retorno').query({ code: 'ok', state: url.searchParams.get('state') }).expect(302);
      expect(vuelta.headers.location).toMatch(/\/\?google=conectado$/);

      const lista = await permisos(autorizacion);
      expect(lista.find((p) => p.clave === 'calendario')?.estado).toBe('concedido');
      expect(lista.find((p) => p.clave === 'correo')?.estado).toBe('no_concedido');

      // El token no se puede leer en la base; solo descifrándolo con la clave (plan de acceso §5.4).
      const fila = await prisma.consentimientoIntegracion.findFirstOrThrow({ where: { perfilId } });
      expect(fila.tokenCifrado).not.toContain('secreto');
      expect(JSON.parse(descifrar(fila.tokenCifrado!)).refreshToken).toBe('token-de-renovacion-secreto');
      expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'google.conectado' } })).toBe(1);
    });

    it('si la persona rechaza en Google, o desmarca el permiso, no se guarda nada', async () => {
      const { autorizacion } = await sesion();
      const state = (await enlace(autorizacion)).searchParams.get('state');

      const rechazo = await http().get('/integraciones/google/retorno').query({ error: 'access_denied', state }).expect(302);
      expect(rechazo.headers.location).toMatch(/google=rechazado$/);
      const desmarcado = await http().get('/integraciones/google/retorno').query({ code: 'sin-permiso', state }).expect(302);
      expect(desmarcado.headers.location).toMatch(/google=no-concedido$/);
      const fallo = await http().get('/integraciones/google/retorno').query({ code: 'falla', state }).expect(302);
      expect(fallo.headers.location).toMatch(/google=error$/);

      expect(await prisma.consentimientoIntegracion.count()).toBe(0);
    });

    it('un estado falsificado o manipulado no conecta nada', async () => {
      const { autorizacion } = await sesion();
      const state = (await enlace(autorizacion)).searchParams.get('state')!;
      for (const falso of ['inventado', state.slice(0, -4) + 'AAAA']) {
        const r = await http().get('/integraciones/google/retorno').query({ code: 'ok', state: falso }).expect(302);
        expect(r.headers.location).toMatch(/google=error$/);
      }
      expect(await prisma.consentimientoIntegracion.count()).toBe(0);
    });

    it('sin sesión no se puede pedir un enlace', async () => {
      await http().post('/integraciones/google/enlace').send({ alcance: 'calendario' }).expect(401);
    });
  });

  describe('acceso.colaborador-solo-calendario', () => {
    it('al colaborador solo se le ofrece el calendario, y pedir el correo se rechaza (REQ-ACC-14)', async () => {
      const { autorizacion } = await sesion('colaborador');
      expect((await permisos(autorizacion)).map((p) => p.clave)).toEqual(['calendario']);
      const r = await http().post('/integraciones/google/enlace').set('Authorization', autorizacion).send({ alcance: 'correo' }).expect(403);
      expect(ErrorApi.parse(r.body).codigo).toBe('ROL_NO_PERMITIDO');
      await enlace(autorizacion, 'calendario');
    });
  });

  describe('acceso.solo-dos-alcances-sin-lectura-de-buzon', () => {
    it('los alcances son exactamente ver y editar eventos, y enviar correo', () => {
      expect(Object.values(ALCANCES_GOOGLE).map((a) => a.alcance).sort()).toEqual([
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/gmail.send',
      ]);
    });

    it('ningún archivo de código pide permisos de lectura o gestión del buzón (P-08)', () => {
      // Se construyen por partes para que este archivo no se encuentre a sí mismo.
      const prohibidos = ['readonly', 'modify', 'metadata', 'compose', 'insert', 'labels'].map((p) => `gmail.${p}`);
      prohibidos.push(['mail', 'google', 'com'].join('.'));
      const raiz = resolve(__dirname, '../../../..');
      const carpetas = ['apps/api/src', 'apps/web/src', 'apps/movil/src', 'packages/contratos/src'];

      const encontrados: string[] = [];
      const recorrer = (dir: string) => {
        for (const nombre of readdirSync(dir)) {
          const ruta = join(dir, nombre);
          if (nombre === 'generado' || nombre === 'node_modules') continue;
          if (statSync(ruta).isDirectory()) recorrer(ruta);
          else if (/\.(ts|tsx|mjs|json)$/.test(nombre)) {
            const texto = readFileSync(ruta, 'utf8');
            for (const p of prohibidos) if (texto.includes(p)) encontrados.push(`${ruta}: ${p}`);
          }
        }
      };
      carpetas.forEach((c) => recorrer(join(raiz, c)));
      expect(encontrados).toEqual([]);
    });
  });
});
