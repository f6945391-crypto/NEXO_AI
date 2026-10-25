import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { crearProveedorModelo } from '../../src/agente/agente.module';
import { contratoDelProveedor, peticionDeContrato } from '../../src/agente/modelo/contrato';
import { GUION_DEMOSTRACION } from '../../src/agente/modelo/guion-demostracion';
import { LlamadorModelo } from '../../src/agente/modelo/llamador-modelo';
import { ModeloNoConfigurado } from '../../src/agente/modelo/modelo-no-configurado';
import { ModeloSimulado, SIN_REGLA, type ReglaGuion } from '../../src/agente/modelo/modelo-simulado';
import { costoUsd } from '../../src/agente/modelo/precios-modelo';
import { FalloDelModelo, ModeloNoDisponible, type PeticionModelo, type ProveedorModelo } from '../../src/agente/modelo/proveedor-modelo';

// T-029 · P-06, AD-06 · specs/07-agente/plan.md §3.

const GUION: ReglaGuion[] = [
  { si: '^hola$', pasos: [{ texto: 'Hola, ¿qué hacemos?' }] },
  { si: '^¿qué tengo mañana\\?$', pasos: [{ llamadas: [{ nombre: 'agenda_consultar', argumentos: { desde: '{mañana}', hasta: '{mañana}' } }] }] },
];

// Viernes 23 de octubre de 2026, 23:30 en Lima: en UTC ya es sábado
const TARDE_EN_LIMA = { instante: new Date('2026-10-24T04:30:00Z'), zonaHoraria: 'America/Lima' };

function peticion(texto: string, referencia = TARDE_EN_LIMA): PeticionModelo {
  return { ...peticionDeContrato(texto), referencia };
}

const rapido = (proveedor: ProveedorModelo) => new LlamadorModelo(proveedor, { limiteMs: 50, esperasMs: [0, 0] });

describe('agente.contrato-del-proveedor', () => {
  describe('simulado', () => {
    for (const paso of contratoDelProveedor(new ModeloSimulado(GUION), { texto: 'Hola', herramienta: '¿Qué tengo mañana?' }))
      it(paso.nombre, () => paso.ejecutar());
  });

  describe('no configurado', () => {
    for (const paso of contratoDelProveedor(new ModeloNoConfigurado())) it(paso.nombre, () => paso.ejecutar());
  });

  describe('el guion del simulado', () => {
    it('resuelve «mañana» y los días de la semana en la zona de la referencia, no en UTC', async () => {
      const simulado = new ModeloSimulado([
        { si: '^x$', pasos: [{ llamadas: [{ nombre: 'f', argumentos: { a: '{hoy}', b: '{mañana}', c: '{viernes}', d: '{jueves}', e: '{hora:9}', f: '{titulo:una reunión con Vasco}' } }] }] },
      ]);
      const r = await simulado.responder(peticion('x'), new AbortController().signal);
      expect(r.llamadas[0]?.argumentos).toEqual({ a: '2026-10-23', b: '2026-10-24', c: '2026-10-30', d: '2026-10-29', e: '09:00', f: 'Reunión con Vasco' });
    });

    it('lo que no está en el guion recibe «No sé hacer eso todavía», sin inventar nada', async () => {
      const r = await new ModeloSimulado(GUION).responder(peticion('Mándale un correo a Juan'), new AbortController().signal);
      expect(r).toMatchObject({ texto: SIN_REGLA, llamadas: [] });
    });

    it('da un paso por vuelta: tras el resultado de la herramienta, el siguiente', async () => {
      const simulado = new ModeloSimulado([{ si: '^x$', pasos: [{ llamadas: [{ nombre: 'f', argumentos: {} }] }, { texto: 'Hecho' }] }]);
      const primera = await simulado.responder(peticion('x'), new AbortController().signal);
      const segunda = await simulado.responder(
        {
          ...peticion('x'),
          mensajes: [
            { rol: 'persona', texto: 'x' },
            { rol: 'asistente', texto: null, llamadas: primera.llamadas },
            { rol: 'herramienta', llamadaId: primera.llamadas[0]!.id, contenido: '{}' },
          ],
        },
        new AbortController().signal,
      );
      expect(segunda).toMatchObject({ texto: 'Hecho', llamadas: [] });
    });

    it('el guion de demostración entiende los ejemplos de la web', async () => {
      const simulado = new ModeloSimulado(GUION_DEMOSTRACION);
      const pedir = async (texto: string) => (await simulado.responder(peticion(texto), new AbortController().signal)).llamadas[0];
      expect(await pedir('Agéndame una reunión con Vasco el viernes a las 10')).toMatchObject({
        nombre: 'agenda_registrar_evento',
        argumentos: { titulo: 'Reunión con Vasco', fecha: '2026-10-30', horaInicio: '10:00' },
      });
      expect(await pedir('¿Qué tengo mañana por la tarde?')).toMatchObject({
        nombre: 'agenda_consultar',
        argumentos: { desde: '2026-10-24', hasta: '2026-10-24', horaDesde: '12:00', horaHasta: '20:00' },
      });
      expect(await pedir('Recuérdame llamar al dentista')).toMatchObject({ nombre: 'captura_guardar_tarea', argumentos: { texto: 'llamar al dentista' } });
      expect(await pedir('Agéndame algo con Vasco')).toMatchObject({ argumentos: { titulo: 'Algo con Vasco' } });
    });
  });

  describe('el llamador', () => {
    it('un proveedor que tarda más del límite da ModeloNoDisponible tras tres intentos', async () => {
      const simulado = new ModeloSimulado(GUION);
      simulado.demorar(200);
      const r = await rapido(simulado).llamar(peticion('hola'));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toBeInstanceOf(ModeloNoDisponible);
      expect(r.registro).toMatchObject({ proveedor: 'simulado', intentos: 3, desenlace: 'no_disponible', costoUsd: null });
    });

    it('si falla dos veces y a la tercera responde, la respuesta llega con sus tres intentos', async () => {
      const simulado = new ModeloSimulado(GUION);
      simulado.fallarProximas(2);
      const r = await rapido(simulado).llamar(peticion('hola'));
      expect(r).toMatchObject({ ok: true, respuesta: { texto: 'Hola, ¿qué hacemos?' }, registro: { intentos: 3, desenlace: 'ok', costoUsd: 0 } });
    });

    it('un fallo del modelo no se reintenta', async () => {
      const roto: ProveedorModelo = {
        nombre: 'roto',
        responder: async () => {
          throw new Error('respuesta ilegible');
        },
      };
      const r = await rapido(roto).llamar(peticion('hola'));
      expect(r).toMatchObject({ ok: false, registro: { intentos: 1, desenlace: 'error' } });
      expect(!r.ok && r.error).toBeInstanceOf(FalloDelModelo);
    });

    it('una respuesta sin la forma esperada es un fallo', async () => {
      const raro: ProveedorModelo = { nombre: 'raro', responder: async () => ({ texto: 'hola' }) as never };
      const r = await rapido(raro).llamar(peticion('hola'));
      expect(!r.ok && r.error).toBeInstanceOf(FalloDelModelo);
    });

    it('sin proveedor configurado, el asistente no está disponible', async () => {
      const r = await rapido(new ModeloNoConfigurado()).llamar(peticion('hola'));
      expect(r).toMatchObject({ ok: false, registro: { proveedor: 'no-configurado', desenlace: 'no_disponible' } });
    });

    it('el costo sale del precio por modelo; un modelo sin precio da costo desconocido, nunca cero', () => {
      expect(costoUsd('simulado', { tokensEntrada: 1_000, tokensSalida: 500 })).toBe(0);
      expect(costoUsd('modelo-sin-precio', { tokensEntrada: 1_000, tokensSalida: 500 })).toBeNull();
    });
  });

  describe('selección del proveedor', () => {
    it('por defecto, no configurado; el simulado solo fuera de producción', () => {
      expect(crearProveedorModelo({}).nombre).toBe('no-configurado');
      expect(crearProveedorModelo({ MODELO_PROVEEDOR: 'simulado' }).nombre).toBe('simulado');
      expect(() => crearProveedorModelo({ MODELO_PROVEEDOR: 'simulado', NODE_ENV: 'production' })).toThrow();
      expect(() => crearProveedorModelo({ MODELO_PROVEEDOR: 'otro' })).toThrow(/desconocido/);
    });
  });

  it('ningún archivo fuera de src/agente/modelo importa el SDK de un proveedor de modelo (P-06)', () => {
    const raiz = join(__dirname, '../../src');
    const permitido = join(raiz, 'agente', 'modelo') + sep;
    const SDK = /from\s+['"](@anthropic-ai\/|openai|@google\/genai|@google\/generative-ai|@langchain\/(anthropic|openai|google|mistralai|ollama)|@mistralai\/|cohere-ai|ollama)/;
    const archivos = (dir: string): string[] =>
      readdirSync(dir).flatMap((nombre) => {
        const ruta = join(dir, nombre);
        return statSync(ruta).isDirectory() ? archivos(ruta) : ruta.endsWith('.ts') ? [ruta] : [];
      });
    const infractores = archivos(raiz).filter((ruta) => !ruta.startsWith(permitido) && SDK.test(readFileSync(ruta, 'utf8')));
    expect(infractores.map((ruta) => relative(raiz, ruta))).toEqual([]);
  });
});
