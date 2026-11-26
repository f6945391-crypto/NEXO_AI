import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import type { OperacionRespuesta, RespuestaAsistente, TurnoAsistente } from '@nexoai/contratos';
import { AsistenteService } from '../agente/asistente.service';
import { SincronizadorCalendario } from '../agenda/sincronizador-calendario';
import { AppModule } from '../app.module';
import type { ContextoSolicitud } from '../identidad/contexto';
import { PROVEEDOR_CALENDARIO, type ProveedorCalendario } from '../integraciones/calendario/proveedor-calendario';
import { ClienteGoogle } from '../integraciones/cliente-google';
import { OperacionesService } from '../operaciones/operaciones.service';
import { cargarEntorno } from '../plataforma/entorno';
import { PrismaService } from '../plataforma/prisma.service';
import { ORGANIZACION_REUNIONES } from '../plataforma/semilla-reuniones';
import { ReunionesService } from '../reuniones/reuniones.service';

// T-137 · specs/10-reuniones · prueba manual de CUN-06 con calendarios de Google reales, sobre la base de
// desarrollo y las cuentas de «Reuniones Demo» (T-136) ya conectadas. Va por pasos, para mirar los Gmail
// entre uno y otro. Cada paso que escribe en Google avisa a los invitados, salvo `google`.
//   pnpm --filter @nexoai/api probar-reuniones --paso <paso>
// Pasos: estado · autorizar · convocar · mover · google · cancelar. `convocar` habla con el asistente del
// `.env`; los demás van por Operaciones, como la pantalla. Las direcciones salen enmascaradas.

const CLAVES = ['lider', 'ana', 'beto', 'lucia'] as const;
type Clave = (typeof CLAVES)[number];
const EVENTOS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const FRASE = 'busca una hora de 30 minutos con el proyecto Alfa esta semana';

const fallos: string[] = [];
const comprobar = (ok: boolean, texto: string) => {
  console.log(`${ok ? '✓' : '✗'} ${texto}`);
  if (!ok) fallos.push(texto);
};
const enmascarar = (correo: string) => correo.replace(/^(.{2}).*@/, '$1***@');
const decir = (r: RespuestaAsistente) => {
  for (const t of r.turnos) if ('texto' in t && typeof t.texto === 'string') console.log(`  asistente (${t.tipo}): ${t.texto}`);
};
const hora = (iso: string | Date) =>
  new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

async function principal(): Promise<void> {
  cargarEntorno();
  const { values: args } = parseArgs({ options: { paso: { type: 'string' } } });
  const paso = args.paso ?? 'estado';

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const prisma = app.get(PrismaService);
    const reuniones = app.get(ReunionesService);
    const operaciones = app.get(OperacionesService);
    const asistente = app.get(AsistenteService);
    const google = app.get(ClienteGoogle);
    const calendario = app.get<ProveedorCalendario>(PROVEEDOR_CALENDARIO);
    const sincronizador = app.get(SincronizadorCalendario);

    // sinAislar: herramienta de desarrollo; todavía no se conoce la organización
    const organizacion = await prisma.sinAislar.organizacion.findFirstOrThrow({ where: { nombre: ORGANIZACION_REUNIONES } });
    const db = prisma.deOrganizacion(organizacion.id);
    const c = {} as Record<Clave, ContextoSolicitud & { correo: string }>;
    for (const clave of CLAVES) {
      const p = await db.perfilUsuario.findUniqueOrThrow({ where: { correo: `${clave}@reuniones.test` } });
      c[clave] = { perfilId: p.id, organizacionId: p.organizacionId, rol: p.rol, plan: p.plan, primerIngresoPendiente: p.debeCambiarContrasena, ambito: 'propio', empresa: null, correo: p.correo };
    }
    const alfa = await db.equipo.findFirstOrThrow({ where: { nombre: 'Proyecto Alfa' } });
    const ultima = () => db.reunion.findFirst({ where: { convocanteId: c.lider.perfilId }, orderBy: { creadaEn: 'desc' } });

    // Lo que dice Google, sin pasar por la copia de NexoAI
    const eventoEnGoogle = async (clave: Clave, id: string) => {
      const r = await google.llamar(c[clave], 'calendario', (token) => fetch(`${EVENTOS}/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } }));
      if (r.status === 404) return null;
      return (await r.json()) as { status?: string; start?: { dateTime?: string }; end?: { dateTime?: string }; attendees?: { email: string; optional?: boolean; organizer?: boolean }[] };
    };
    const confirmar = async (clave: Clave, op: OperacionRespuesta) => {
      for (const d of op.vistaConfirmacion.datos) console.log(`    ${d.etiqueta}: ${d.valor.replace(/[\w.+-]+@[\w.-]+/g, enmascarar)}`);
      const hecha = await operaciones.confirmar(c[clave], op.id);
      comprobar(hecha.estado === 'ejecutada', `${op.tipo} confirmada (${hecha.estado})`);
      return hecha;
    };
    const verificarEnGoogle = async (id: string, esperado: { inicio: Date; cancelada?: boolean }) => {
      for (const clave of CLAVES) {
        const conectado = await google.tienePermiso(c[clave], 'calendario');
        if (!conectado) continue;
        let ev = await eventoEnGoogle(clave, id);
        // P-REU-08: Google tarda unos segundos en copiar el cambio al calendario de cada invitado
        const listo = () => (esperado.cancelada ? !ev || ev.status === 'cancelled' : !!ev && ev.status !== 'cancelled' && Date.parse(ev.start?.dateTime ?? '') === esperado.inicio.getTime());
        for (let i = 0; i < 10 && clave !== 'lider' && !listo(); i++) {
          await new Promise((r) => setTimeout(r, 3_000));
          ev = await eventoEnGoogle(clave, id);
        }
        if (esperado.cancelada) {
          comprobar(!ev || ev.status === 'cancelled', `${clave}: en Google la reunión figura cancelada`);
          continue;
        }
        comprobar(!!ev && ev.status !== 'cancelled', `${clave}: el evento está en su Google Calendar`);
        if (ev?.start?.dateTime) comprobar(Date.parse(ev.start.dateTime) === esperado.inicio.getTime(), `${clave}: a la hora esperada (${hora(ev.start.dateTime)})`);
      }
    };

    if (paso === 'estado') {
      for (const clave of CLAVES) {
        const conectado = await google.tienePermiso(c[clave], 'calendario');
        const m = await db.miembroDeEquipo.findFirst({ where: { equipoId: alfa.id, perfilId: c[clave].perfilId } });
        const dir = conectado ? await reuniones.direccion(c.lider, c[clave].perfilId, c[clave].correo) : null;
        console.log(`${clave}: Google ${conectado ? 'conectado' : 'no'}; dirección ${dir ? enmascarar(dir.direccion) : '—'}; Proyecto Alfa: ${m?.estadoConsentimiento}`);
      }
      for (const r of await reuniones.lista(c.lider)) console.log(`reunión «${r.titulo}»: ${r.estado}${r.inicio ? ` · ${hora(r.inicio)}` : ''}`);
    }

    if (paso === 'diagnostico') {
      for (const url of [EVENTOS.replace('/events', ''), `${EVENTOS}?maxResults=50`]) {
        const r = await google.llamar(c.lider, 'calendario', (token) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }));
        const b = (await r.json()) as { error?: unknown; id?: string; summary?: string; items?: { organizer?: { email: string; self?: boolean }; creator?: { email: string; self?: boolean } }[] };
        const propio = b.items?.find((i) => i.organizer?.self || i.creator?.self);
        console.log(url.split('/v3/')[1], r.status, b.error ? JSON.stringify(b.error).slice(0, 300) : `id ${b.id ? enmascarar(b.id) : '—'} · summary ${b.summary ? enmascarar(b.summary) : '—'} · eventos ${b.items?.length ?? '—'} · propio ${propio ? enmascarar((propio.organizer?.self ? propio.organizer : propio.creator)!.email) : '—'}`);
      }
    }

    if (paso === 'verificar') {
      // Sin escribir nada: lo que hay en el Google de cada persona y en su copia de NexoAI
      const fila = await ultima();
      if (!fila?.googleEventoId) throw new Error('No hay una reunión con evento en Google');
      console.log(`reunión ${fila.estado} · ${fila.inicio ? hora(fila.inicio) : '—'}`);
      // Las respuestas, en el evento original: si alguien respondió desde otra cuenta, aparece una dirección de más
      const original = await google.llamar(c.lider, 'calendario', (token) => fetch(`${EVENTOS}/${encodeURIComponent(fila.googleEventoId!)}`, { headers: { Authorization: `Bearer ${token}` } }));
      const invitados = (((await original.json()) as { attendees?: { email: string; responseStatus?: string }[] }).attendees ?? []);
      console.log(`invitados en el evento del líder: ${invitados.map((a) => `${enmascarar(a.email)} ${a.responseStatus}`).join(' · ')}`);
      for (const clave of CLAVES) {
        const r = await google.llamar(c[clave], 'calendario', (token) => fetch(`${EVENTOS}/${encodeURIComponent(fila.googleEventoId!)}`, { headers: { Authorization: `Bearer ${token}` } }));
        const b = (await r.json()) as { status?: string; start?: { dateTime?: string }; attendees?: { self?: boolean; responseStatus?: string }[] };
        const yo = b.attendees?.find((a) => a.self);
        const sinc = await sincronizador.sincronizar(c[clave]);
        const r2 = await google.llamar(c[clave], 'calendario', (token) =>
          fetch(`${EVENTOS}?singleEvents=true&timeMin=${encodeURIComponent(fila.rangoDesde.toISOString())}&timeMax=${encodeURIComponent(fila.rangoHasta.toISOString())}`, { headers: { Authorization: `Bearer ${token}` } }),
        );
        const enLista = (((await r2.json()) as { items?: { id: string }[] }).items ?? []).some((x) => x.id === fila.googleEventoId);
        const copia = await db.eventoAgenda.findFirst({ where: { perfilId: c[clave].perfilId, googleEventoId: fila.googleEventoId } });
        console.log(`${clave}: Google ${r.status} ${b.status ?? ''} ${b.start?.dateTime ? hora(b.start.dateTime) : ''} respuesta ${yo?.responseStatus ?? '—'} · en la lista ${enLista ? 'sí' : 'no'} · sincronización ${JSON.stringify(sinc)} · copia NexoAI ${copia ? `${copia.estado} ${hora(copia.inicio)}${copia.esOrganizador ? '' : ' (invitada)'}` : '—'}`);
      }
    }

    if (paso === 'autorizar') {
      // REQ-CUN05-14: cada persona autoriza lo suyo, con la misma Operación que la pantalla
      for (const clave of CLAVES) {
        const m = await db.miembroDeEquipo.findFirstOrThrow({ where: { equipoId: alfa.id, perfilId: c[clave].perfilId } });
        if (m.estadoConsentimiento === 'concedida') {
          console.log(`- ${clave}: ya autorizado`);
          continue;
        }
        const op = await operaciones.proponer(c[clave], { tipo: 'equipo.cambiar_consentimiento', carga: { equipoId: alfa.id, estado: 'concedida' }, origen: 'control_directo' });
        const hecha = await operaciones.confirmar(c[clave], op.id);
        comprobar(hecha.estado === 'ejecutada', `${clave}: autoriza compartir su disponibilidad en «Proyecto Alfa»`);
      }
    }

    if (paso === 'convocar') {
      // REQ-CUN06-01 a 04: el asistente del .env, con los calendarios reales
      const de = <T extends TurnoAsistente['tipo']>(r: RespuestaAsistente, tipo: T) => r.turnos.find((t) => t.tipo === tipo) as Extract<TurnoAsistente, { tipo: T }> | undefined;
      console.log(`lider escribe: «${FRASE}»`);
      const r = await asistente.enviar(c.lider, FRASE);
      decir(r);
      const turno = de(r, 'reunion');
      comprobar(!!turno, 'el asistente propone horarios (turno de reunión)');
      if (!turno) return;
      const { reunion, propuestas, texto } = turno.propuestas;
      console.log(`  ${texto}`);
      for (const p of propuestas) console.log(`  · ${hora(p.inicio)} – ${hora(p.fin)} · libres ${p.libres} de ${p.de}`);
      comprobar(propuestas.length > 0, `${propuestas.length} propuestas`);
      comprobar(reunion.estado === 'pendiente', 'la reunión queda pendiente, sin nada en Google');

      // Independiente del cálculo: ninguna propuesta pisa un evento con hora de los obligatorios, leído de Google
      const fila = await reuniones.fila(c.lider, reunion.id);
      for (const clave of CLAVES) {
        if (!(await google.tienePermiso(c[clave], 'calendario'))) continue;
        const { cambios } = await calendario.listar(c[clave], { tipo: 'completa', desde: fila.rangoDesde, hasta: fila.rangoHasta });
        const ocupados = cambios.flatMap((x) => (x.tipo === 'evento' && !x.evento.todoElDia ? [x.evento] : []));
        const choques = propuestas.filter((p) => ocupados.some((e) => e.inicio.getTime() < Date.parse(p.fin) && Date.parse(p.inicio) < e.fin.getTime()));
        comprobar(choques.length === 0 || clave === 'lucia', `${clave}: ${ocupados.length} eventos en Google en el rango; ninguna propuesta los pisa${choques.length ? ` (pisa ${choques.length})` : ''}`);
      }

      const elegida = propuestas[0]!;
      const conTarjeta = await asistente.decidir(c.lider, { decision: 'horario', reunionId: reunion.id, inicio: elegida.inicio });
      const op = de(conTarjeta, 'propuesta')?.operacion;
      comprobar(op?.tipo === 'reunion.convocar', 'elegir un horario muestra la tarjeta «Convocar esta reunión»');
      if (!op) return;
      const r2 = await asistente.decidir(c.lider, { decision: 'confirmar', operacionId: op.id });
      decir(r2);
      for (const d of op.vistaConfirmacion.datos) console.log(`    ${d.etiqueta}: ${d.valor.replace(/[\w.+-]+@[\w.-]+/g, enmascarar)}`);

      const hecha = await reuniones.fila(c.lider, reunion.id);
      comprobar(hecha.estado === 'agendada' && !!hecha.googleEventoId, 'REQ-CUN06-11 · la reunión queda agendada, con su evento en Google');
      if (!hecha.googleEventoId) return;
      const ev = await eventoEnGoogle('lider', hecha.googleEventoId);
      const invitados = await db.invitadoReunion.findMany({ where: { reunionId: reunion.id } });
      const enGoogle = new Set((ev?.attendees ?? []).map((a) => a.email.toLowerCase()));
      for (const i of invitados) comprobar(!!i.direccion && enGoogle.has(i.direccion.toLowerCase()), `REQ-CUN06-12 · el evento invita a ${enmascarar(i.direccion ?? '(sin dirección)')}${i.opcional ? ' (opcional)' : ''}`);
      await verificarEnGoogle(hecha.googleEventoId, { inicio: hecha.inicio! });
      for (const clave of ['ana', 'beto', 'lucia'] as const) {
        const suya = (await reuniones.lista(c[clave])).find((x) => x.id === reunion.id);
        comprobar(suya?.estado === 'agendada' && !suya.soyConvocante, `REQ-CUN06-13 · ${clave} la ve agendada, convocada por Lider`);
      }
      console.log('\nRevisa los Gmail de Ana, Beto y Lucía: tiene que haber llegado la invitación de Google.');
    }

    if (paso === 'mover') {
      // REQ-CUN06-14: otro horario libre de los obligatorios; Google avisa del cambio
      const fila = await ultima();
      if (!fila || fila.estado !== 'agendada' || !fila.googleEventoId) throw new Error('No hay una reunión agendada; corre antes --paso convocar');
      const { propuestas } = await reuniones.propuestas(c.lider, await reuniones.fila(c.lider, fila.id));
      const otra = propuestas.find((p) => Date.parse(p.inicio) !== fila.inicio!.getTime());
      if (!otra) throw new Error('No hay otro horario libre en el rango de la reunión');
      console.log(`Mover de ${hora(fila.inicio!)} a ${hora(otra.inicio)}`);
      const op = await operaciones.proponer(c.lider, { tipo: 'reunion.mover', carga: { reunionId: fila.id, inicio: otra.inicio }, origen: 'agente', solicitudOriginal: 'mueve la reunión (probar-reuniones)' });
      await confirmar('lider', op);
      const movida = await reuniones.fila(c.lider, fila.id);
      comprobar(movida.inicio?.getTime() === Date.parse(otra.inicio), 'la reunión queda a la hora nueva en NexoAI');
      await verificarEnGoogle(fila.googleEventoId, { inicio: movida.inicio! });
      console.log('\nRevisa los Gmail: tiene que haber llegado el aviso del cambio de hora.');
    }

    if (paso === 'google') {
      // REQ-CUN06-17: el cambio hecho en Google manda. Se mueve una hora en Google, sin avisar a nadie
      const fila = await ultima();
      if (!fila || fila.estado !== 'agendada' || !fila.googleEventoId) throw new Error('No hay una reunión agendada');
      const inicio = new Date(fila.inicio!.getTime() + 60 * 60_000);
      const fin = new Date(fila.fin!.getTime() + 60 * 60_000);
      await calendario.actualizar(c.lider, fila.googleEventoId, { inicio, fin, zonaHoraria: fila.zonaHoraria }, { avisar: false });
      console.log(`En Google, la reunión pasa de ${hora(fila.inicio!)} a ${hora(inicio)}`);
      const lista = await reuniones.lista(c.lider);
      const vista = lista.find((x) => x.id === fila.id);
      comprobar(!!vista?.inicio && Date.parse(vista.inicio) === inicio.getTime(), 'REQ-CUN06-17 · NexoAI toma la hora que quedó en Google');
    }

    if (paso === 'cancelar') {
      // REQ-CUN06-15 y 16: solo quien convocó; Google avisa a los invitados
      const fila = await ultima();
      if (!fila || fila.estado !== 'agendada' || !fila.googleEventoId) throw new Error('No hay una reunión agendada');
      const ajena = await operaciones.proponer(c.ana, { tipo: 'reunion.cancelar', carga: { reunionId: fila.id }, origen: 'control_directo' }).then(
        () => null,
        (e: { getResponse?: () => { codigo?: string } }) => e.getResponse?.()?.codigo,
      );
      comprobar(ajena === 'SOLO_CONVOCANTE', `REQ-CUN06-16 · Ana no puede cancelarla (${ajena ?? 'la dejó proponer'})`);
      const op = await operaciones.proponer(c.lider, { tipo: 'reunion.cancelar', carga: { reunionId: fila.id }, origen: 'control_directo' });
      await confirmar('lider', op);
      comprobar((await reuniones.fila(c.lider, fila.id)).estado === 'cancelada', 'la reunión queda cancelada en NexoAI');
      await verificarEnGoogle(fila.googleEventoId, { inicio: fila.inicio!, cancelada: true });
      console.log('\nRevisa los Gmail: tiene que haber llegado la cancelación.');
    }

    console.log(fallos.length ? `\n${fallos.length} comprobaciones fallaron.` : '\nTodo en orden.');
    if (fallos.length) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

principal().catch((error: unknown) => {
  const respuesta = (error as { getResponse?: () => unknown }).getResponse?.();
  console.error(respuesta ? JSON.stringify(respuesta) : error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
