import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { EjecutorHerramientas } from '../../src/agente/herramientas/ejecutor-herramientas';
import type { EntornoHerramienta } from '../../src/agente/herramientas/herramienta';
import { LlamadasAuditadas } from '../../src/agente/llamadas-auditadas';
import { ModeloSimulado } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO, type PeticionModelo } from '../../src/agente/modelo/proveedor-modelo';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { ContextoSolicitud } from '../../src/identidad/contexto';
import { OperacionesService } from '../../src/operaciones/operaciones.service';
import { RegistroOperaciones } from '../../src/operaciones/registro';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-030 · P-07 · specs/07-agente/plan.md §8

const simulado = new ModeloSimulado([{ si: '^hola$', pasos: [{ texto: 'Hola' }] }]);

const peticion = (texto: string): PeticionModelo => ({
  sistema: 'Prueba',
  mensajes: [{ rol: 'persona', texto }],
  herramientas: [],
  maxTokens: 100,
  referencia: { instante: new Date(), zonaHoraria: 'America/Lima' },
});

describe('T-030 · auditoría del agente', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let llamadas: LlamadasAuditadas;
  let ejecutor: EjecutorHerramientas;
  let contexto: ContextoSolicitud;
  let entorno: EntornoHerramienta;
  let ejecuciones = 0;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PROVEEDOR_MODELO).useValue(simulado).compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
    llamadas = app.get(LlamadasAuditadas);
    ejecutor = app.get(EjecutorHerramientas);

    // Una herramienta de prueba que propone una Operación, como harán las de agenda (T-031)
    const operaciones = app.get(OperacionesService);
    app.get(RegistroOperaciones).registrar({
      tipo: 'prueba.auditoria',
      esquema: z.strictObject({ texto: z.string() }),
      proponer: async () => ({ accion: 'Probar', datos: [], irreversible: null, confirmable: true, motivoNoConfirmable: null }),
      ejecutar: async () => ({ tipo: 'ejecutada', resultado: null }),
    });
    ejecutor.registrar({
      nombre: 'prueba.proponer',
      descripcion: 'Propone una operación de prueba.',
      esquema: z.strictObject({ texto: z.string().min(1) }),
      async ejecutar(ctx, argumentos) {
        ejecuciones += 1;
        await new Promise((r) => setTimeout(r, 30)); // Ventana para que dos ejecuciones compitan
        const op = await operaciones.proponer(ctx, { tipo: 'prueba.auditoria', carga: argumentos, origen: 'agente' });
        return { paraModelo: { propuesta: op.id }, operacionId: op.id };
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    simulado.recuperar();
    ejecuciones = 0;
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const cuenta = await crearCuentaLista(prisma, { organizacionId, correo: 'agente@nexoai.test', rol: 'usuario_personal', plan: 'personal' }, 'una-contrasena-de-prueba');
    contexto = { perfilId: cuenta.perfilId, organizacionId, rol: 'usuario_personal', plan: 'personal', primerIngresoPendiente: false };
    const conversacion = await prisma.conversacionAgente.create({ data: { organizacionId, perfilId: cuenta.perfilId, estado: 'abierta' } });
    entorno = { conversacionId: conversacion.id, solicitudOriginal: 'probar', referencia: { instante: new Date(), zonaHoraria: 'America/Lima' } };
  });

  describe('agente.herramienta-auditada-con-costo', () => {
    it('cada llamada al modelo deja su fila con tokens, costo y desenlace', async () => {
      const r = await llamadas.llamar(contexto, entorno.conversacionId, peticion('hola'));
      expect(r.ok).toBe(true);
      const fila = await prisma.llamadaModelo.findUniqueOrThrow({ where: { id: r.llamadaModeloId } });
      expect(fila).toMatchObject({ proveedor: 'simulado', modelo: 'simulado', desenlace: 'ok', intentos: 1, conversacionId: entorno.conversacionId });
      expect(fila.tokensEntrada).toBeGreaterThan(0);
      expect(Number(fila.costoUsd)).toBe(0);
    });

    it('también la que no responde, sin costo conocido', async () => {
      simulado.caer();
      const r = await llamadas.llamar(contexto, entorno.conversacionId, peticion('hola'));
      expect(r.ok).toBe(false);
      const fila = await prisma.llamadaModelo.findUniqueOrThrow({ where: { id: r.llamadaModeloId } });
      expect(fila).toMatchObject({ desenlace: 'no_disponible', costoUsd: null, tokensEntrada: null });
    });

    it('cada herramienta queda con sus argumentos, su resultado, la llamada que la pidió y la Operación creada', async () => {
      const llamada = await llamadas.llamar(contexto, entorno.conversacionId, peticion('hola'));
      const r = await ejecutor.ejecutar(contexto, entorno, { id: 'l-1', nombre: 'prueba_proponer', argumentos: { texto: 'algo' } }, llamada.llamadaModeloId);
      expect(r.operacionId).toBeTruthy();
      const fila = await prisma.invocacionHerramienta.findFirstOrThrow({ where: { idLlamada: 'l-1' } });
      expect(fila).toMatchObject({ herramienta: 'prueba.proponer', argumentos: { texto: 'algo' }, error: null, operacionId: r.operacionId, llamadaModeloId: llamada.llamadaModeloId });
      expect(fila.resultado).toMatchObject({ paraModelo: { propuesta: r.operacionId } });
    });

    it('unos argumentos inválidos no ejecutan nada y quedan auditados con su error', async () => {
      const r = await ejecutor.ejecutar(contexto, entorno, { id: 'l-2', nombre: 'prueba_proponer', argumentos: { texto: '' } }, null);
      expect(r.paraModelo).toMatchObject({ error: { codigo: 'ARGUMENTOS_INVALIDOS', campos: ['texto'] } });
      expect(ejecuciones).toBe(0);
      expect(await prisma.invocacionHerramienta.findFirstOrThrow({ where: { idLlamada: 'l-2' } })).toMatchObject({ error: 'ARGUMENTOS_INVALIDOS' });
    });

    it('una herramienta que no existe no hace nada y se le dice al modelo', async () => {
      const r = await ejecutor.ejecutar(contexto, entorno, { id: 'l-3', nombre: 'borrar_todo', argumentos: {} }, null);
      expect(r.paraModelo).toMatchObject({ error: { codigo: 'HERRAMIENTA_DESCONOCIDA' } });
    });

    it('el modelo ve cada herramienta con guion bajo y el esquema JSON de su contrato', () => {
      const definicion = ejecutor.definiciones().find((d) => d.nombre === 'prueba_proponer');
      expect(definicion?.esquema).toMatchObject({ type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] });
    });
  });

  describe('agente.herramienta-idempotente', () => {
    it('ejecutar dos veces la misma llamada crea una sola Operación y devuelve lo guardado', async () => {
      const llamada = { id: 'l-4', nombre: 'prueba_proponer', argumentos: { texto: 'una vez' } };
      const primera = await ejecutor.ejecutar(contexto, entorno, llamada, null);
      const segunda = await ejecutor.ejecutar(contexto, entorno, llamada, null);
      expect(segunda).toMatchObject({ repetida: true, operacionId: primera.operacionId });
      expect(ejecuciones).toBe(1);
      expect(await prisma.operacion.count({ where: { tipo: 'prueba.auditoria' } })).toBe(1);
    });

    it('dos ejecuciones simultáneas de la misma llamada ejecutan una', async () => {
      const llamada = { id: 'l-5', nombre: 'prueba_proponer', argumentos: { texto: 'a la vez' } };
      await Promise.all([ejecutor.ejecutar(contexto, entorno, llamada, null), ejecutor.ejecutar(contexto, entorno, llamada, null)]);
      expect(ejecuciones).toBe(1);
      expect(await prisma.operacion.count({ where: { tipo: 'prueba.auditoria' } })).toBe(1);
    });

    it('la misma id en otra conversación es otra llamada', async () => {
      const otra = await prisma.conversacionAgente.create({ data: { organizacionId: contexto.organizacionId, perfilId: contexto.perfilId, estado: 'abierta' } });
      const llamada = { id: 'l-6', nombre: 'prueba_proponer', argumentos: { texto: 'x' } };
      await ejecutor.ejecutar(contexto, entorno, llamada, null);
      await ejecutor.ejecutar(contexto, { ...entorno, conversacionId: otra.id }, llamada, null);
      expect(ejecuciones).toBe(2);
    });
  });
});
