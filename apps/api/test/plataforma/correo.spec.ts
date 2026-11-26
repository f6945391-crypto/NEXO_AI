import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CorreoSimulado } from '../../src/plataforma/correo/correo-simulado';
import { CorreoSmtp } from '../../src/plataforma/correo/correo-smtp';
import { crearEnviadorCorreo } from '../../src/plataforma/correo/correo.module';

// T-122 · PT-3 · specs/06-acceso/plan.md §5.8
const SRC = resolve(__dirname, '../../src');
const archivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : ruta.endsWith('.ts') ? [ruta] : [];
  });

describe('plataforma.correo-solo-por-el-puerto', () => {
  it('nodemailer solo se importa en plataforma/correo', () => {
    const fuera = archivos(SRC)
      .filter((ruta) => /from ['"]nodemailer['"]|require\(['"]nodemailer['"]\)/.test(readFileSync(ruta, 'utf8')))
      .map((ruta) => relative(SRC, ruta).replaceAll('\\', '/'))
      .filter((ruta) => !ruta.startsWith('plataforma/correo/'));
    expect(fuera).toEqual([]);
  });
});

describe('plataforma.correo-simulado', () => {
  it('por defecto es el simulado; con smtp exige la URL y el remitente; en producción no hay simulado', () => {
    expect(crearEnviadorCorreo({})).toBeInstanceOf(CorreoSimulado);
    expect(() => crearEnviadorCorreo({ CORREO_PROVEEDOR: 'smtp' })).toThrow(/CORREO_SMTP_URL/);
    expect(crearEnviadorCorreo({ CORREO_PROVEEDOR: 'smtp', CORREO_SMTP_URL: 'smtp://localhost:1025', CORREO_REMITENTE: 'NexoAI <a@b.test>' })).toBeInstanceOf(CorreoSmtp);
    expect(() => crearEnviadorCorreo({ NODE_ENV: 'production' })).toThrow(/producción/);
    expect(() => crearEnviadorCorreo({ CORREO_PROVEEDOR: 'otro' })).toThrow(/desconocido/);
  });

  it('guarda en memoria y, con archivo, una línea JSON por correo', async () => {
    const archivo = join(mkdtempSync(join(tmpdir(), 'correo-')), 'correos.jsonl');
    const simulado = new CorreoSimulado(archivo);
    await simulado.enviar({ para: 'a@nexoai.test', asunto: 'Uno', texto: 'hola' });
    await simulado.enviar({ para: 'b@nexoai.test', asunto: 'Dos', texto: 'chau' });
    expect(simulado.enviados.map((c) => c.para)).toEqual(['a@nexoai.test', 'b@nexoai.test']);
    const lineas = readFileSync(archivo, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { asunto: string });
    expect(lineas.map((l) => l.asunto)).toEqual(['Uno', 'Dos']);
  });
});
