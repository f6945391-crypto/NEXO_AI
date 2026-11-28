import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConversacionAsistente, IngresoRespuesta, RespuestaAsistente } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EjecutorHerramientas } from '../../src/agente/herramientas/ejecutor-herramientas';
import { GUION_DEMOSTRACION } from '../../src/agente/modelo/guion-demostracion';
import { OPCIONES_LLAMADOR } from '../../src/agente/modelo/llamador-modelo';
import { ModeloSimulado, type ReglaGuion } from '../../src/agente/modelo/modelo-simulado';
import { PROVEEDOR_MODELO } from '../../src/agente/modelo/proveedor-modelo';
import { aTextoLlano, type NombresInternos } from '../../src/agente/texto-llano';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import { ProveedorCalendarioSimulado } from '../../src/integraciones/calendario/calendario-simulado';
import { PROVEEDOR_CALENDARIO } from '../../src/integraciones/calendario/proveedor-calendario';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';

// T-142 · REQ-AGT-06 · decisión 30 de 07-agente. Las respuestas del asistente, en texto llano: el código quita
// las marcas de formato y los nombres internos aunque el modelo los devuelva, y deja un punto por línea.

// La respuesta de Groq de la captura 04a (design/capturas/2026-11-27-revision/), en un solo párrafo
const RESPUESTA_CON_FORMATO =
  '¡Claro! La sección **tareas** es el lugar donde gestionas todo lo que tienes que hacer. Así funciona: ' +
  '1. **Registrar una tarea** – Con `tareas_registrar` puedes anotar cualquier actividad que debes realizar (por ejemplo “Enviar informe a Ana”). ' +
  '2. **Ver tus tareas** – Con `tareas_consultar` puedes listar tus pendientes, por tareas con fecha (`con_fecha`) o sin fecha. ' +
  '3. **Modificar una tarea** – Si cambias el texto, la fecha o el `deQuien`, usas `tareas_cambiar`. ' +
  '4. **Marcar como hecha** – Cuando terminas una tarea, la cierras con `tareas_completar`. ' +
  '5. **Reabrir o descartar** – Si ya no es relevante (`tareas_reabrir`, `tareas_descartar`). ' +
  '6. **Anotar avances** – Para registrar cómo vas, usa `tareas.anotar_avance`.';

const GUION: ReglaGuion[] = [
  { si: '^dime c[oó]mo funciona la secci[oó]n tareas$', pasos: [{ texto: RESPUESTA_CON_FORMATO }] },
  { si: '^dime algo con t[ií]tulo$', pasos: [{ texto: '## Resumen\n\n* **Uno**: el `eventoId` 0b6e7d1c-3a52-4c1f-9a7e-2f0c5d9e8b11\n* _Dos_\n\n\n\n> Tres' }] },
];
const simulado = new ModeloSimulado(GUION);
const calendario = new ProveedorCalendarioSimulado();
const CONTRASENA = 'una-contrasena-de-prueba';

describe('agente.respuesta-en-texto-llano', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let autorizacion: string;
  let nombres: NombresInternos;
  let n = 0;

  const http = () => request(app.getHttpServer());
  const enviar = async (texto: string) => RespuestaAsistente.parse((await http().post('/asistente/mensajes').set('Authorization', autorizacion).send({ texto }).expect(200)).body);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROVEEDOR_MODELO)
      .useValue(simulado)
      .overrideProvider(OPCIONES_LLAMADOR)
      .useValue({ limiteMs: 2_000, esperasMs: [0, 0] })
      .overrideProvider(PROVEEDOR_CALENDARIO)
      .useValue(calendario)
      .compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = clientePrueba();
    nombres = app.get(EjecutorHerramientas).nombresInternos();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas();
    simulado.recuperar();
    simulado.usarGuion(GUION);
    const organizacionId = await crearOrganizacion(prisma, 'Organización de prueba');
    const correo = `llano${++n}@nexoai.test`;
    await crearCuentaLista(prisma, { organizacionId, correo, rol: 'usuario_personal', plan: 'personal' }, CONTRASENA, 'America/Lima');
    autorizacion = `Bearer ${IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body).tokenAcceso}`;
  });

  it('los nombres internos salen del registro de herramientas, con punto y como los ve el modelo, y sus campos', () => {
    expect(nombres.herramientas).toEqual(expect.arrayContaining(['tareas.registrar', 'tareas_registrar', 'agenda_consultar', 'tareas_anotar_avance', 'reuniones_proponer']));
    expect(nombres.campos).toEqual(expect.arrayContaining(['deQuien', 'horaLimite', 'tareaId', 'eventoId']));
    // Un campo que es una palabra no se toca
    expect(nombres.campos).not.toContain('texto');
    expect(nombres.campos).not.toContain('fecha');
  });

  it('quita **, comillas invertidas y nombres internos, y deja cada punto en su línea, sin depender del modelo', async () => {
    const r = await enviar('dime cómo funciona la sección tareas');
    const texto = (r.turnos.at(-1) as { tipo: string; texto: string }).texto;
    expect(r.turnos.at(-1)!.tipo).toBe('texto');
    expect(texto).not.toMatch(/\*|`|#/);
    expect(texto).not.toMatch(/tareas[_.][a-z]|deQuien|con_fecha/);
    const lineas = texto.split('\n');
    expect(lineas).toHaveLength(7);
    expect(lineas[0]).toBe('¡Claro! La sección tareas es el lugar donde gestionas todo lo que tienes que hacer. Así funciona:');
    expect(lineas.slice(1).map((l) => l.slice(0, 3))).toEqual(['1. ', '2. ', '3. ', '4. ', '5. ', '6. ']);
    expect(lineas[1]).toBe('1. Registrar una tarea – puedes anotar cualquier actividad que debes realizar (por ejemplo “Enviar informe a Ana”).');
    expect(lineas[2]).toBe('2. Ver tus tareas – puedes listar tus pendientes, por tareas con fecha (con fecha) o sin fecha.');
    expect(lineas[3]).toBe('3. Modificar una tarea – Si cambias el texto, la fecha o el.');
    expect(lineas[5]).toBe('5. Reabrir o descartar – Si ya no es relevante.');
    expect(lineas[6]).toBe('6. Anotar avances – Para registrar cómo vas.');

    // Lo guardado en la transcripción es lo mismo que se mostró
    const leida = ConversacionAsistente.parse((await http().get('/asistente/conversacion').set('Authorization', autorizacion).expect(200)).body);
    const guardado = leida.episodios.flatMap((e) => e.turnos).find((t) => t.tipo === 'texto') as { texto: string };
    expect(guardado.texto).toBe(texto);
    // Y lo que el modelo vuelve a leer, también: no se le devuelve su propio formato
    await enviar('gracias');
    const leido = simulado.peticiones.at(-1)!.mensajes.filter((m) => m.rol === 'asistente').map((m) => (m as { texto: string | null }).texto);
    expect(leido).toContain(texto);
    expect(leido).not.toContain(RESPUESTA_CON_FORMATO);
  });

  it('encabezados, viñetas, cursiva, citas, ids y líneas en blanco de más', async () => {
    const r = await enviar('dime algo con título');
    expect((r.turnos.at(-1) as { texto: string }).texto).toBe('Resumen\n\n- Uno: el\n- Dos\n\nTres');
  });

  it('la explicación del guion de demostración se ve en líneas, con ejemplos en palabras de la persona', () => {
    const regla = GUION_DEMOSTRACION.find((r) => new RegExp(r.si, 'iu').test('dime cómo funciona la sección tareas'))!;
    const paso = regla.pasos[0] as { texto: string };
    expect(aTextoLlano(paso.texto, nombres).split('\n')).toEqual([
      'La sección Tareas guarda lo que tienes que hacer y lo que esperas de otras personas:',
      '1. Anotar una tarea: por ejemplo «recuérdame enviar el informe el viernes».',
      '2. Ver lo pendiente: «¿qué tengo pendiente?».',
      '3. Darla por hecha: «ya envié el informe».',
      '4. Contar cómo va: «sobre el informe: me falta la firma de Rosa».',
    ]);
  });

  it('un texto ya llano no cambia; «a las 3. Luego» no se parte', () => {
    const llano = 'Listo. Mañana tienes la reunión a las 3. Luego, el dentista a las 5.';
    expect(aTextoLlano(llano, nombres)).toBe(llano);
    expect(aTextoLlano('Hola, ¿qué hacemos?', nombres)).toBe('Hola, ¿qué hacemos?');
    // Una lista que ya venía en líneas sigue igual
    expect(aTextoLlano('Puedes pedirme:\n1. recuérdame enviar el informe el viernes\n2. ¿qué tengo pendiente?', nombres)).toBe(
      'Puedes pedirme:\n1. Recuérdame enviar el informe el viernes\n2. ¿qué tengo pendiente?',
    );
  });
});
