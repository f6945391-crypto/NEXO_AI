import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorApi, IngresoRespuesta, OperacionRespuesta, Perfil, type Rol } from '@nexoai/contratos';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { crearOrganizacion } from '../../src/identidad/alta-cuentas';
import type { PrismaClient } from '../../src/plataforma/prisma';
import { clientePrueba, crearCuentaLista, vaciarTablas } from '../utilidades/base-prueba';
import { diaSiguiente, instante } from '../utilidades/fechas';

// T-009 · REQ-ACC-10, REQ-ACC-11 · H-ACC-04

const CONTRASENA = 'una-contrasena-de-prueba';

describe('T-009 · cambio de zona horaria', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let organizacionId: string;
  let n = 0;

  const http = () => request(app.getHttpServer());

  async function persona(rol: Rol = 'usuario_personal') {
    const correo = `zh${++n}@nexoai.test`;
    const { perfilId } = await crearCuentaLista(prisma, { organizacionId, correo, rol, plan: rol === 'usuario_personal' ? 'personal' : 'empresarial' }, CONTRASENA, 'America/Lima');
    const s = IngresoRespuesta.parse((await http().post('/auth/ingreso').send({ correo, contrasena: CONTRASENA }).expect(200)).body);
    return { perfilId, autorizacion: `Bearer ${s.tokenAcceso}` };
  }

  // Un evento en la réplica, como lo dejaría la sincronización (T-014)
  let m = 0;
  async function evento(perfilId: string, titulo: string, inicio: Date, fin: Date, extra: { todoElDia?: boolean; estado?: 'confirmado' | 'cancelado' } = {}) {
    return prisma.eventoAgenda.create({
      data: {
        organizacionId,
        perfilId,
        googleCalendarioId: 'primary',
        googleEventoId: `g-${++m}`,
        etag: '"1"',
        titulo,
        inicio,
        fin,
        zonaHoraria: 'America/Lima',
        todoElDia: extra.todoElDia ?? false,
        esOrganizador: true,
        estado: extra.estado ?? 'confirmado',
        sincronizadoEn: new Date(),
      },
    });
  }

  const proponer = (autorizacion: string, zonaHoraria: string, origen = 'control_directo') =>
    http().post('/operaciones').set('Authorization', autorizacion).send({ tipo: 'perfil.cambiar_zona_horaria', carga: { zonaHoraria }, origen });
  const zonaDelPerfil = async (autorizacion: string) => Perfil.parse((await http().get('/perfil').set('Authorization', autorizacion).expect(200)).body).zonaHoraria;
  const dato = (r: OperacionRespuesta, etiqueta: string) => r.vistaConfirmacion.datos.find((d) => d.etiqueta === etiqueta)?.valor;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  describe('acceso.cambio-zona-muestra-afectados-y-no-aplica-sin-confirmar', () => {
    it('dice qué compromisos futuros se verán a otra hora, y sin confirmar no cambia nada', async () => {
      const { perfilId, autorizacion } = await persona();
      await evento(perfilId, 'Dentista', instante('10:00'), instante('11:00'));
      await evento(perfilId, 'Feriado', instante('00:00'), instante('00:00', diaSiguiente()), { todoElDia: true });
      await evento(perfilId, 'Cancelado', instante('12:00'), instante('13:00'), { estado: 'cancelado' });
      await evento(perfilId, 'Ya pasó', new Date(Date.now() - 3 * 3600_000), new Date(Date.now() - 2 * 3600_000));

      const r = OperacionRespuesta.parse((await proponer(autorizacion, 'Asia/Tokyo').expect(201)).body);
      expect(r.vistaConfirmacion).toMatchObject({ accion: 'Cambiar tu zona horaria', confirmable: true });
      expect(dato(r, 'Ahora')).toBe('Hora de Lima (GMT-5)');
      expect(dato(r, 'Nueva')).toBe('Hora de Tokyo (GMT+9)');
      expect(dato(r, 'Compromisos')).toBe('Uno se verá a otra hora. Siguen siendo a la misma hora real: solo cambia cómo los ves');
      // 10:00 en Lima son las 00:00 del día siguiente en Tokio
      expect(dato(r, 'Dentista')).toMatch(/: 10:00 – 11:00 → 00:00 – 01:00$/);
      for (const fuera of ['Feriado', 'Cancelado', 'Ya pasó']) expect(dato(r, fuera)).toBeUndefined();

      // Sin confirmar no cambia nada; descartar tampoco
      expect(await zonaDelPerfil(autorizacion)).toBe('America/Lima');
      await http().post(`/operaciones/${r.id}/descartar`).set('Authorization', autorizacion).expect(200);
      expect(await zonaDelPerfil(autorizacion)).toBe('America/Lima');
      expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'perfil.zona-horaria-cambiada' } })).toBe(0);
    });

    it('a una zona con el mismo desfase no se ve ningún compromiso a otra hora', async () => {
      const { perfilId, autorizacion } = await persona();
      await evento(perfilId, 'Dentista', instante('10:00'), instante('11:00'));
      const r = OperacionRespuesta.parse((await proponer(autorizacion, 'America/Bogota').expect(201)).body);
      expect(dato(r, 'Compromisos')).toBe('Ninguno se verá a otra hora');
    });

    it('lista como mucho diez y dice cuántos más hay', async () => {
      const { perfilId, autorizacion } = await persona();
      for (let h = 8; h < 20; h++) await evento(perfilId, `Compromiso ${h}`, instante(`${String(h).padStart(2, '0')}:00`), instante(`${String(h).padStart(2, '0')}:30`));
      const r = OperacionRespuesta.parse((await proponer(autorizacion, 'Asia/Tokyo').expect(201)).body);
      expect(dato(r, 'Compromisos')).toMatch(/^12 se verán a otra hora/);
      expect(r.vistaConfirmacion.datos.filter((d) => d.etiqueta.startsWith('Compromiso '))).toHaveLength(10);
      expect(dato(r, 'Y más')).toBe('2 compromisos más');
    });
  });

  describe('acceso.zona-horaria-modificable', () => {
    it('al confirmar cambia solo la zona del perfil, queda en la auditoría y los compromisos no se mueven', async () => {
      const { perfilId, autorizacion } = await persona();
      const dentista = await evento(perfilId, 'Dentista', instante('10:00'), instante('11:00'));
      const r = OperacionRespuesta.parse((await proponer(autorizacion, 'Asia/Tokyo').expect(201)).body);

      const c = OperacionRespuesta.parse((await http().post(`/operaciones/${r.id}/confirmar`).set('Authorization', autorizacion).expect(200)).body);
      expect(c).toMatchObject({ estado: 'ejecutada', resultado: { zonaHoraria: 'Asia/Tokyo' } });
      expect(await zonaDelPerfil(autorizacion)).toBe('Asia/Tokyo');
      expect(await prisma.eventoAuditoria.findMany({ where: { perfilId, accion: 'perfil.zona-horaria-cambiada' } })).toMatchObject([
        { detalle: { antes: 'America/Lima', despues: 'Asia/Tokyo' } },
      ]);
      // H-ACC-04: el instante del compromiso es el mismo
      const tras = await prisma.eventoAgenda.findUniqueOrThrow({ where: { id: dentista.id } });
      expect(tras.inicio.getTime()).toBe(instante('10:00').getTime());

      // Confirmar otra vez no vuelve a cambiar ni a auditar (P-07)
      await http().post(`/operaciones/${r.id}/confirmar`).set('Authorization', autorizacion).expect(200);
      expect(await prisma.eventoAuditoria.count({ where: { perfilId, accion: 'perfil.zona-horaria-cambiada' } })).toBe(1);
    });

    it('la misma zona o una sin nombre IANA se rechazan sin crear nada; el colaborador también cambia la suya', async () => {
      const { perfilId, autorizacion } = await persona();
      expect(ErrorApi.parse((await proponer(autorizacion, 'America/Lima').expect(400)).body)).toMatchObject({ codigo: 'SOLICITUD_INVALIDA', mensaje: 'Esa ya es tu zona horaria.' });
      expect(ErrorApi.parse((await proponer(autorizacion, 'GMT-5').expect(400)).body).codigo).toBe('SOLICITUD_INVALIDA');
      expect(await prisma.operacion.count({ where: { perfilId } })).toBe(0);

      const colaborador = await persona('colaborador');
      await proponer(colaborador.autorizacion, 'Europe/Madrid', 'agente').expect(201);
    });
  });
});
