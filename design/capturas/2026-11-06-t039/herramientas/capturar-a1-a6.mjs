// Pruebas visuales A1–A6 sobre T-039 (commit 36a9551): web (1440×900) y móvil (390×844 ×2). Solo captura.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const SALIDA = '/home/claude/capturas/salida/a1-a6'; mkdirSync(`${SALIDA}/web`, { recursive: true }); mkdirSync(`${SALIDA}/movil`, { recursive: true });
const resultados = [];
const ok = (id, nombre, cond, detalle = '') => { resultados.push({ id, nombre, ok: !!cond, detalle }); console.log(cond ? 'OK  ' : 'FAIL', id, nombre, detalle); };
const navegador = await chromium.launch();

// ---------------- WEB ----------------
{
  const cuentas = JSON.parse(readFileSync('/home/claude/nexoai-t039-pruebas/apps/web/e2e/cuentas.json', 'utf8'));
  const BASE = 'http://localhost:3401';
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-PE', timezoneId: 'America/Lima' });
  const page = await ctx.newPage();
  let n = 0;
  const foto = async (nombre) => { n += 1; await page.screenshot({ path: `${SALIDA}/web/A-W${String(n).padStart(2, '0')}-${nombre}.png` }); };
  const pedir = async (t) => { await page.getByLabel('Pídele algo al asistente').fill(t); await page.getByRole('button', { name: 'Enviar' }).click(); };
  const confirmar = async () => { const a = page.getByRole('article', { name: 'Para confirmar' }).last(); await a.waitFor(); await a.getByRole('button', { name: 'Confirmar' }).click(); };
  const separadores = () => page.getByRole('separator').count();
  const texto = async () => (await page.locator('.conversacion').innerText().catch(() => page.locator('body').innerText()));

  await page.goto(`${BASE}/entrar`, { timeout: 120000 });
  await page.getByLabel('Correo').fill(cuentas.asistente.correo); await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click(); await page.getByRole('heading', { level: 1, name: 'Agenda' }).waitFor({ timeout: 120000 });
  await page.waitForTimeout(600); await foto('persona-nueva-blanco-inicial');
  ok('A5.a', 'web: persona sin historial ve el blanco inicial con ejemplos', await page.getByRole('heading', { name: '¿Qué hacemos?' }).count() === 1);

  // A1: confirmar y escribir otra cosa
  await pedir('Agéndame una revisión hoy a las 23'); await confirmar();
  await page.getByText(/^Listo: «Revisión»/).waitFor(); await page.waitForTimeout(400); await foto('confirmado');
  await pedir('Mejor a las 5'); await page.getByText('No sé hacer eso todavía.').last().waitFor(); await page.waitForTimeout(400); await foto('A1-siguiente-mensaje-no-vacia');
  const t1 = await texto();
  ok('A1.a', 'web: tras confirmar y escribir otra cosa, la petición, la tarjeta y el «Listo» siguen visibles', /Agéndame una revisión/.test(t1) && /Listo: «Revisión»/.test(t1) && /Mejor a las 5/.test(t1));
  ok('A1.b', 'web: hay un separador entre el episodio cerrado y el nuevo', (await separadores()) >= 1, `${await separadores()} separadores`);
  const sep1 = await page.getByRole('separator').first().getAttribute('aria-label');
  ok('A1.c', 'web: el separador dice cuándo y qué se hizo', /registr|Revisión/i.test(sep1 ?? ''), sep1 ?? '');

  // A2: recargar
  await page.reload(); await page.getByRole('heading', { level: 1, name: 'Agenda' }).waitFor(); await page.waitForTimeout(800); await foto('A2-recarga');
  const t2 = await texto();
  ok('A2', 'web: tras recargar se ve lo mismo (episodio cerrado + separador + abierto)', /Listo: «Revisión»/.test(t2) && /Mejor a las 5/.test(t2) && (await separadores()) >= 1);

  // A6: separadores por desenlace: descartado, tarea guardada
  await pedir('Agéndame una llamada hoy a las 22');
  { const a = page.getByRole('article', { name: 'Para confirmar' }).last(); await a.waitFor(); await a.getByRole('button', { name: 'Descartar' }).click(); await page.getByText('De acuerdo, no hice nada.').last().waitFor(); }
  await pedir('Recuérdame pagar el recibo'); await page.getByText(/^En espera\./).last().waitFor(); await page.waitForTimeout(400);
  await pedir('Agéndame una reunión mañana a las 10'); await confirmar(); await page.getByText(/^Listo: «Reunión»/).waitFor(); await page.waitForTimeout(500);
  await foto('A6-separadores-por-desenlace');
  const etiquetas = await page.getByRole('separator').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  writeFileSync(`${SALIDA}/web-separadores.json`, JSON.stringify(etiquetas, null, 2));
  ok('A6.a', 'web: separador de descartado', etiquetas.some((e) => /descart/i.test(e ?? '')), etiquetas.join(' | '));
  ok('A6.b', 'web: separador «Tarea guardada»', etiquetas.some((e) => /tarea/i.test(e ?? '')));
  ok('A6.c', 'web: separador de registrado con título', etiquetas.some((e) => /Reunión/.test(e ?? '')));
  ok('A6.d', 'web: textos sin vocabulario interno', !/episodio|turno|transcripci/i.test(await texto()));

  // A4: ver anteriores (tenemos 4-5 episodios; la página por defecto son 3)
  await page.reload(); await page.getByRole('heading', { level: 1, name: 'Agenda' }).waitFor(); await page.waitForTimeout(800);
  const boton = page.getByRole('button', { name: 'Ver anteriores' });
  ok('A4.a', 'web: existe «Ver anteriores» cuando hay más episodios', (await boton.count()) === 1);
  // ¿está visible sin hacer scroll?
  const visibleSinScroll = (await boton.count()) ? await boton.first().isVisible() && (await boton.first().boundingBox())?.y >= 0 && (await boton.first().boundingBox())?.y < 900 : false;
  ok('A4.b', 'web: «Ver anteriores» a la vista al abrir (sin scroll)', visibleSinScroll, `y=${(await boton.first().boundingBox())?.y}`);
  await page.locator('.conversacion__contenido, .conversacion').first().evaluate((el) => el.scrollTo(0, 0)).catch(() => {});
  await page.waitForTimeout(300); await foto('A4-antes-de-ver-anteriores');
  const antes = await separadores();
  if (await boton.count()) { await boton.first().click(); await page.waitForTimeout(1200); }
  await foto('A4-despues-de-ver-anteriores');
  const despues = await separadores();
  ok('A4.c', 'web: «Ver anteriores» trae un episodio más (un separador más)', despues > antes, `${antes} → ${despues}`);
  ok('A4.d', 'web: el botón desaparece cuando no hay más', (await page.getByRole('button', { name: 'Ver anteriores' }).count()) === 0 || despues > antes + 1, `quedan ${await page.getByRole('button', { name: 'Ver anteriores' }).count()}`);
  await ctx.close();
}

// ---------------- MÓVIL ----------------
{
  const cuentas = JSON.parse(readFileSync('/home/claude/nexoai-t039-pruebas/apps/movil/e2e/cuentas.json', 'utf8'));
  const BASE = 'http://localhost:3204';
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PE', timezoneId: 'America/Lima' });
  const page = await ctx.newPage();
  let n = 0;
  const foto = async (nombre) => { n += 1; await page.screenshot({ path: `${SALIDA}/movil/A-M${String(n).padStart(2, '0')}-${nombre}.png` }); };
  const pedir = async (t) => { await page.getByLabel('Pídele algo al asistente').fill(t); await page.getByRole('button', { name: 'Enviar' }).click(); };
  const texto = async () => page.locator('body').innerText();
  await page.goto(BASE, { timeout: 120000 });
  await page.getByLabel('Correo').waitFor({ timeout: 120000 });
  await page.getByLabel('Correo').fill(cuentas.captura.correo); await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click(); await page.getByRole('heading', { name: 'Agenda' }).waitFor();
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click(); await page.getByLabel('Pídele algo al asistente').waitFor(); await page.waitForTimeout(400);
  await foto('capa-blanco');
  await pedir('Agéndame una revisión hoy a las 23'); await page.getByLabel('Para confirmar').last().waitFor(); await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText(/^Listo: «Revisión»/).waitFor(); await page.waitForTimeout(400); await foto('confirmado');
  await pedir('Mejor a las 5'); await page.getByText('No sé hacer eso todavía.').last().waitFor(); await page.waitForTimeout(500); await foto('A1-siguiente-mensaje-no-vacia');
  const m1 = await texto();
  ok('A1.m', 'móvil: tras confirmar y escribir otra cosa, todo sigue visible', /Agéndame una revisión/.test(m1) && /Listo: «Revisión»/.test(m1) && /Mejor a las 5/.test(m1));
  ok('A1.m2', 'móvil: hay separador', (await page.getByRole('separator').count()) >= 1, `${await page.getByRole('separator').count()}`);
  // A3: cerrar y reabrir la capa
  await page.getByRole('button', { name: 'Cerrar' }).click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click(); await page.getByLabel('Pídele algo al asistente').waitFor(); await page.waitForTimeout(600);
  await foto('A3-capa-reabierta');
  const m3 = await texto();
  ok('A3', 'móvil: al reabrir la capa se ve el episodio anterior y el actual', /Listo: «Revisión»/.test(m3) && /Mejor a las 5/.test(m3));
  // A6: tarea guardada + otro episodio
  await pedir('Recuérdame pagar el recibo'); await page.getByText(/^En espera\./).last().waitFor(); await page.waitForTimeout(300);
  await pedir('Agéndame una reunión mañana a las 10'); await page.getByLabel('Para confirmar').last().waitFor(); await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText(/^Listo: «Reunión»/).waitFor(); await page.waitForTimeout(500); await foto('A6-separadores');
  const etiquetasM = await page.getByRole('separator').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  ok('A6.m', 'móvil: separadores con «Tarea guardada» y registrado', etiquetasM.some((e) => /tarea/i.test(e ?? '')) && etiquetasM.some((e) => /Reunión/.test(e ?? '')), etiquetasM.join(' | '));
  // A4 móvil: ver anteriores tras reabrir (4 episodios → la capa abre con 2)
  await page.getByRole('button', { name: 'Cerrar' }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click(); await page.getByLabel('Pídele algo al asistente').waitFor(); await page.waitForTimeout(700);
  await foto('A4-capa-reabierta-con-ver-anteriores');
  const botonM = page.getByRole('button', { name: 'Ver anteriores' });
  ok('A4.m', 'móvil: existe «Ver anteriores»', (await botonM.count()) >= 1);
  const sepAntes = await page.getByRole('separator').count();
  if (await botonM.count()) { await botonM.first().click(); await page.waitForTimeout(1200); }
  await foto('A4-despues-de-ver-anteriores');
  ok('A4.m2', 'móvil: «Ver anteriores» trae más', (await page.getByRole('separator').count()) > sepAntes, `${sepAntes} → ${await page.getByRole('separator').count()}`);
  ok('A6.m2', 'móvil: textos sin vocabulario interno', !/episodio|turno|transcripci/i.test(await texto()));
  await ctx.close();
}
await navegador.close();
writeFileSync(`${SALIDA}/resultados-a1-a6.json`, JSON.stringify(resultados, null, 2));
console.log(`\n${resultados.filter((r) => r.ok).length} de ${resultados.length} en verde`);
