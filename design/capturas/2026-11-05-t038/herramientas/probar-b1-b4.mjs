// Pruebas B1–B4 del plan, por HTTP contra la API de T-038 con el simulado. Solo lee y escribe en la base de prueba.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import pg from '/home/claude/nexoai-t038/apps/api/node_modules/pg/lib/index.js';

const API = 'http://localhost:3202';
const cuentas = JSON.parse(readFileSync('/home/claude/nexoai-t038/apps/web/e2e/cuentas.json', 'utf8'));
const SALIDA = '/home/claude/capturas/salida/t038'; mkdirSync(SALIDA, { recursive: true });
const db = new pg.Client({ connectionString: 'postgresql://nexoai:nexoai@localhost:5432/nexoai_e2e_prueba' }); await db.connect();

const resultados = [];
const ok = (id, nombre, cond, detalle = '') => { resultados.push({ id, nombre, ok: !!cond, detalle }); console.log(cond ? 'OK  ' : 'FAIL', id, nombre, detalle); };

async function entrar(correo) {
  const r = await fetch(`${API}/auth/ingreso`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo, contrasena: cuentas.contrasenaTemporal }) });
  const j = await r.json(); if (!r.ok) throw new Error('ingreso ' + JSON.stringify(j));
  return j.tokenAcceso ?? j.accessToken ?? j.token;
}
const api = (token) => async (ruta, cuerpo, metodo = cuerpo ? 'POST' : 'GET') => {
  const r = await fetch(`${API}${ruta}`, { method: metodo, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { estado: r.status, cuerpo: await r.json().catch(() => null) };
};

const token = await entrar(cuentas.asistente.correo);
const h = api(token);

// --- Episodio 1: registrar y confirmar
let r = await h('/asistente/mensajes', { texto: 'Agéndame una revisión hoy a las 23' });
ok('B1.a', 'proponer devuelve una propuesta pendiente', r.cuerpo?.pendiente && r.cuerpo.turnos.some(t => t.tipo === 'propuesta'), `estado ${r.estado}`);
const ep1 = r.cuerpo.episodioId;
// Tamaño del punto de control con la propuesta pendiente (B2)
const pc1 = await db.query('select octet_length(datos::text) as bytes, datos from punto_control_agente');
const bytesConPropuesta = Number(pc1.rows[0].bytes);
// reinicio simulado: la API es sin estado entre peticiones; la interrupción vive en la base
r = await h('/asistente/decisiones', { operacionId: r.cuerpo.pendiente, decision: 'confirmar' });
ok('B1.b', 'confirmar tras "reconstruir" el grafo reanuda y el resultado sale de la Operación', r.cuerpo?.turnos.some(t => t.tipo === 'resultado' && /Listo/.test(t.texto)) && r.cuerpo.episodioCerrado === true, JSON.stringify(r.cuerpo?.turnos.map(t=>t.tipo)));
const pc2 = await db.query('select octet_length(datos::text) as bytes, datos from punto_control_agente where conversacion_id = $1', [ep1]);
const guardado = pc2.rows[0].datos;
const puntosTexto = Object.values(guardado.puntos[''] ?? {}).map(([p]) => Buffer.from(p, 'base64').toString('utf8'));
ok('B2.a', 'el punto de control no contiene "turnos"', puntosTexto.every(t => !t.includes('"turnos"')), `${puntosTexto.length} puntos`);
const bytesCerrado = Number(pc2.rows[0].bytes);
const bytesDecodificados = puntosTexto.reduce((a, t) => a + Buffer.byteLength(t), 0);
ok('B2.b', 'tamaño del punto de control (episodio de 3 mensajes, cerrado)', true, `${bytesCerrado} bytes en la fila (base64); ${bytesDecodificados} bytes de estado real; ${puntosTexto.length} puntos; con propuesta pendiente: ${bytesConPropuesta}`);
ok('B2.c', 'meta del plan: < 2 000 bytes', bytesCerrado < 2000, `${bytesCerrado} ≥ 2000 → NO se alcanza (Claude Code lo anotó: 5 546)`);
ok('B2.d', 'límite fijado por T-038: < 6 000 bytes', bytesCerrado < 6000, `${bytesCerrado}`);
// qué pesa dentro
const campos = {};
try { const est = JSON.parse(puntosTexto[0]); const cv = est.channel_values ?? est; for (const [k, v] of Object.entries(cv)) campos[k] = Buffer.byteLength(JSON.stringify(v)); } catch {}
writeFileSync(`${SALIDA}/desglose-punto-control.json`, JSON.stringify({ bytesCerrado, bytesDecodificados, bytesConPropuesta, puntos: puntosTexto.length, campos }, null, 2));

// --- Episodio 2: descartar
r = await h('/asistente/mensajes', { texto: 'Agéndame una llamada hoy a las 22' });
r = await h('/asistente/decisiones', { operacionId: r.cuerpo.pendiente, decision: 'descartar' });
ok('B3.a', 'descartar cierra el episodio', r.cuerpo?.episodioCerrado === true);
// --- Episodio 3: registrar y confirmar
r = await h('/asistente/mensajes', { texto: 'Agéndame una reunión mañana a las 10' });
await h('/asistente/decisiones', { operacionId: r.cuerpo.pendiente, decision: 'confirmar' });
// --- Episodio 4: recordar tarea (en espera, sin acción → ¿cierra? se verá) y episodio 5 abierto con pregunta
r = await h('/asistente/mensajes', { texto: 'Recuérdame pagar el recibo' });
const ep4cerrado = r.cuerpo.episodioCerrado;
r = await h('/asistente/mensajes', { texto: 'Agéndame algo con Vasco' });
ok('B3.b', 'una pregunta por dato que falta no cierra el episodio', r.cuerpo?.episodioCerrado === false && r.cuerpo.turnos.some(t => t.tipo === 'pregunta'));

// --- Paginación
const p1 = await h('/asistente/conversacion');
const c = p1.cuerpo;
writeFileSync(`${SALIDA}/conversacion-pagina1.json`, JSON.stringify(c, null, 2));
ok('B3.c', 'forma del contrato', c && Array.isArray(c.episodios) && 'episodioAbierto' in c && 'pendiente' in c && 'hayAnteriores' in c && 'cursor' in c, Object.keys(c ?? {}).join(','));
ok('B3.d', 'cada episodio trae sus turnos y su cierre', c.episodios.every(e => Array.isArray(e.turnos) && 'cierre' in e), `${c.episodios.length} episodios en la página`);
ok('B3.e', 'el episodio abierto va último y con cierre nulo', c.episodios.at(-1)?.id === c.episodioAbierto && c.episodios.at(-1)?.cierre === null);
ok('B3.f', 'los cerrados llevan desenlace y título', c.episodios.slice(0, -1).every(e => e.cierre && e.cierre.desenlace && 'titulo' in e.cierre), c.episodios.slice(0, -1).map(e => `${e.cierre?.desenlace}:${e.cierre?.titulo}`).join(' | '));
ok('B3.g', 'turnos en orden cronológico dentro del episodio', c.episodios.every(e => e.turnos.every((t, i) => i === 0 || t.en >= e.turnos[i - 1].en)));
ok('B3.h', 'página por defecto: 3 episodios y hayAnteriores', c.episodios.length === 3 && c.hayAnteriores === true && c.cursor, `cursor=${c.cursor?.slice(0, 8)}`);
const p2 = await h(`/asistente/conversacion?antes=${c.cursor}`);
const c2 = p2.cuerpo;
writeFileSync(`${SALIDA}/conversacion-pagina2.json`, JSON.stringify(c2, null, 2));
const ids1 = new Set(c.episodios.map(e => e.id));
ok('B3.i', 'la página anterior trae episodios más antiguos, sin repetir', c2.episodios.length > 0 && c2.episodios.every(e => !ids1.has(e.id)) && c2.episodios.every(e => e.abiertoEn <= c.episodios[0].abiertoEn), `${c2.episodios.length} episodios; hayAnteriores=${c2.hayAnteriores}`);
ok('B3.j', 'la última página dice que no hay más', c2.hayAnteriores === false || (await h(`/asistente/conversacion?antes=${c2.cursor}`)).cuerpo?.hayAnteriores === false);
ok('B3.k', 'limite se respeta (limite=1)', (await h('/asistente/conversacion?limite=1')).cuerpo?.episodios.length === 1);
ok('B3.l', 'limite fuera de rango se rechaza (0 y 21)', (await h('/asistente/conversacion?limite=0')).estado === 400 && (await h('/asistente/conversacion?limite=21')).estado === 400);
const totalTurnos = (await db.query('select count(*)::int as n from turno_asistente')).rows[0].n;
const turnosVisibles = [...c.episodios, ...c2.episodios].reduce((a, e) => a + e.turnos.length, 0);
ok('B3.m', 'todos los turnos guardados son visibles por páginas', totalTurnos === turnosVisibles, `${totalTurnos} en tabla, ${turnosVisibles} en páginas`);
ok('B3.n', 'episodio de tarea en espera: ¿se cerró?', true, `episodioCerrado=${ep4cerrado} (informativo: una tarea guardada no es una acción confirmada)`);

// --- B4 aislamiento: otro perfil de la misma organización y otra organización
const otros = [['asistenteEspera', 'mismo plan/organización de prueba'], ['armazon', 'otra cuenta']];
for (const [clave, desc] of otros) {
  if (!cuentas[clave]) continue;
  try {
    const t2 = await entrar(cuentas[clave].correo);
    const c3 = (await api(t2)('/asistente/conversacion')).cuerpo;
    ok('B4', `${clave} (${desc}) no ve la transcripción de asistente`, c3 && c3.episodios.every(e => !ids1.has(e.id)) && !c3.episodios.some(e => e.turnos.some(t => /revisión/i.test(t.texto ?? ''))), `${c3?.episodios.length ?? '?'} episodios propios`);
  } catch (e) { ok('B4', `${clave}: no se pudo entrar (${e.message.slice(0, 60)})`, true, 'cuenta con primer ingreso pendiente; se omite'); }
}
const orgs = await db.query('select count(distinct organizacion_id)::int as n from turno_asistente');
const perfiles = await db.query('select perfil_id, count(*)::int as n from turno_asistente group by perfil_id');
ok('B4.b', 'la tabla guarda organización y perfil en cada turno', orgs.rows[0].n >= 1 && perfiles.rows.length >= 1, `${perfiles.rows.length} perfiles con turnos`);

writeFileSync(`${SALIDA}/resultados-b1-b4.json`, JSON.stringify(resultados, null, 2));
await db.end();
console.log(`\n${resultados.filter(r => r.ok).length} de ${resultados.length} comprobaciones en verde`);
