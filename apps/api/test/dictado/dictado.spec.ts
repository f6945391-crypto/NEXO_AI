import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, RespuestaDictado } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearTranscriptor, DICTADO_MODELO_POR_DEFECTO } from '../../src/dictado/dictado.module';
import { MENSAJE_VOZ_NO_DISPONIBLE } from '../../src/dictado/dictado.service';
import { TranscriptorOpenRouter } from '../../src/dictado/transcriptor-openrouter';
import { TEXTO_DICTADO_SIMULADO, TRANSCRIPTOR_VOZ, TranscriptorNoConfigurado, TranscriptorSimulado, type TranscriptorVoz } from '../../src/dictado/transcriptor';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// 01-captura · T-154 · REQ-CAP-27, 13 · plan de 07-agente §15.1. El dictado: un audio entra por multipart y sale
// su texto; el audio no se guarda y la auditoría anota solo segundos y costo. Nunca se llama a un proveedor real.

const CONTRASENA = 'una-contrasena-de-prueba';
const AUDIO = Buffer.from('audio de prueba, no hace falta que sea audio de verdad para el simulado');

// El transcriptor cambia por prueba, detrás del mismo proveedor de Nest
class TranscriptorIntercambiable implements TranscriptorVoz {
  actual: TranscriptorVoz = new TranscriptorSimulado();
  get nombre() {
    return this.actual.nombre;
  }
  transcribir(...args: Parameters<TranscriptorVoz['transcribir']>) {
    return this.actual.transcribir(...args);
  }
}

describe('asistente.dictado', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let autorizacion: string;
  let perfilId: string;
  let n = 0;
  const transcriptor = new TranscriptorIntercambiable();

  const dictar = (audio: Buffer | null, tipo = 'audio/webm') => {
    const r = request(app.getHttpServer()).post('/asistente/dictado').set('Authorization', autorizacion);
    return audio ? r.attach('audio', audio, { filename: 'dictado.webm', contentType: tipo }) : r.field('nada', 'x');
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(TRANSCRIPTOR_VOZ).useValue(transcriptor).compile();
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
    transcriptor.actual = new TranscriptorSimulado();
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `dictado${++n}@nexoai.test`;
    perfilId = (await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima')).perfilId;
    autorizacion = `Bearer ${IngresoRespuesta.parse((await request(app.getHttpServer()).post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body).tokenAcceso}`;
  });

  it('un audio devuelve su texto; la auditoría guarda segundos y costo, nunca el audio ni el texto', async () => {
    const r = await dictar(AUDIO).expect(200);
    expect(RespuestaDictado.parse(r.body)).toEqual({ texto: TEXTO_DICTADO_SIMULADO });
    const auditoria = await prisma.eventoAuditoria.findMany({ where: { perfilId, accion: 'dictado' } });
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]!.detalle).toEqual({ proveedor: 'simulado', bytes: AUDIO.length, segundos: null, costoUsd: 0 });
    expect(JSON.stringify(auditoria[0]!.detalle)).not.toContain(TEXTO_DICTADO_SIMULADO);
  });

  it('sin audio, vacío o que no es audio: 400 AUDIO_NO_VALIDO', async () => {
    for (const r of [await dictar(null).expect(400), await dictar(Buffer.alloc(0)).expect(400), await dictar(AUDIO, 'text/plain').expect(400)]) {
      expect(ErrorApi.parse(r.body).codigo).toBe('AUDIO_NO_VALIDO');
    }
  });

  it('sin configurar, o si el proveedor no responde: 503 con el texto fijo, y no se audita nada', async () => {
    transcriptor.actual = new TranscriptorNoConfigurado();
    const r = await dictar(AUDIO).expect(503);
    expect(ErrorApi.parse(r.body)).toMatchObject({ codigo: 'VOZ_NO_DISPONIBLE', mensaje: MENSAJE_VOZ_NO_DISPONIBLE });
    expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'dictado' } })).toBe(0);
  });

  it('sin sesión, 401', async () => {
    await request(app.getHttpServer()).post('/asistente/dictado').attach('audio', AUDIO, { filename: 'a.webm', contentType: 'audio/webm' }).expect(401);
  });

  it('con OpenRouter: multipart con el modelo, español y los términos; la respuesta queda con espacios normales', async () => {
    const recibidas: { url: string; autorizacion: string | null; campos: Record<string, string[]>; archivo: { tipo: string; tamano: number } | null }[] = [];
    const falso: typeof fetch = async (url, init) => {
      const cuerpo = init!.body as FormData;
      const campos: Record<string, string[]> = {};
      let archivo: { tipo: string; tamano: number } | null = null;
      for (const [clave, valor] of cuerpo.entries()) {
        if (typeof valor === 'string') (campos[clave] ??= []).push(valor);
        else archivo = { tipo: valor.type, tamano: valor.size };
      }
      recibidas.push({ url: String(url), autorizacion: new Headers(init!.headers).get('Authorization'), campos, archivo });
      return new Response(JSON.stringify({ text: 'Revisar el informe de Vasco el jueves a las 4 :00', usage: { seconds: 3.2, cost: 0.000266 } }), { status: 200 });
    };
    transcriptor.actual = new TranscriptorOpenRouter({ url: 'https://openrouter.ai/api/v1/', modelo: DICTADO_MODELO_POR_DEFECTO, clave: 'sk-or-prueba', terminos: ['NexoAI', 'Vasco'] }, falso);

    const r = await dictar(AUDIO).expect(200);
    expect(RespuestaDictado.parse(r.body)).toEqual({ texto: 'Revisar el informe de Vasco el jueves a las 4:00' });
    expect(recibidas).toEqual([
      {
        url: 'https://openrouter.ai/api/v1/audio/transcriptions',
        autorizacion: 'Bearer sk-or-prueba',
        campos: { model: ['assemblyai/universal-3-6-pro'], language: ['es'], 'keyterms[]': ['NexoAI', 'Vasco'] },
        archivo: { tipo: 'audio/webm', tamano: AUDIO.length },
      },
    ]);
    const [auditoria] = await prisma.eventoAuditoria.findMany({ where: { perfilId, accion: 'dictado' } });
    expect(auditoria!.detalle).toMatchObject({ proveedor: 'openrouter', segundos: 3.2, costoUsd: 0.000266 });
  });

  it('con OpenRouter, un rechazo o una caída es 503 y la clave no aparece en el error', async () => {
    transcriptor.actual = new TranscriptorOpenRouter(
      { url: 'https://openrouter.ai/api/v1', modelo: 'x', clave: 'sk-or-secreta', terminos: [] },
      async () => new Response(JSON.stringify({ error: { code: 402, message: 'Insufficient credits' } }), { status: 402 }),
    );
    const r = await dictar(AUDIO).expect(503);
    expect(JSON.stringify(r.body)).not.toContain('sk-or-secreta');
    transcriptor.actual = new TranscriptorOpenRouter({ url: 'https://openrouter.ai/api/v1', modelo: 'x', clave: 'sk-or-secreta', terminos: [] }, async () => {
      throw new Error('sin red');
    });
    await dictar(AUDIO).expect(503);
  });

  it('la configuración: por defecto no configurado; el simulado no se admite en producción; OpenRouter pide clave', () => {
    expect(crearTranscriptor({}).nombre).toBe('no-configurado');
    expect(crearTranscriptor({ DICTADO_PROVEEDOR: 'simulado' }).nombre).toBe('simulado');
    expect(() => crearTranscriptor({ DICTADO_PROVEEDOR: 'simulado', NODE_ENV: 'production' })).toThrow(/producción/);
    expect(() => crearTranscriptor({ DICTADO_PROVEEDOR: 'openrouter' })).toThrow(/DICTADO_CLAVE/);
    expect(crearTranscriptor({ DICTADO_PROVEEDOR: 'openrouter', DICTADO_CLAVE: 'x' }).nombre).toBe('openrouter');
  });
});
