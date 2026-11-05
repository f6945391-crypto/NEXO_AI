// Recorrido exploratorio de la web con el asistente simulado. Solo lee y captura; no cambia nada del repositorio.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const cuentas = JSON.parse(readFileSync('../../../../apps/web/e2e/cuentas.json', 'utf8'));
const SALIDA = './salida/web';
mkdirSync(SALIDA, { recursive: true });
const BASE = 'http://localhost:3101';

const navegador = await chromium.launch();
let n = 0;
const foto = async (page, nombre, opts = {}) => {
  n += 1;
  const archivo = `${SALIDA}/W${String(n).padStart(2, '0')}-${nombre}.png`;
  await page.screenshot({ path: archivo, fullPage: false, ...opts });
  console.log('capturada', archivo);
};

async function entrar(page, correo) {
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('heading', { level: 1, name: 'Agenda' }).waitFor();
}
async function pedir(page, texto) {
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
}

// ---------- Recorrido principal (1440×900) ----------
{
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-PE', timezoneId: 'America/Lima' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/entrar`);
  await foto(page, 'entrar');
  await entrar(page, cuentas.asistente.correo);
  await page.waitForTimeout(500);
  await foto(page, 'agenda-blanco-inicial');

  // «Pensando…»: se retrasa la acción de servidor para verlo
  let retrasar = true;
  await page.route('**/*', async (ruta) => {
    const req = ruta.request();
    if (retrasar && req.method() === 'POST' && req.headers()['next-action']) await new Promise((r) => setTimeout(r, 2500));
    try { await ruta.continue(); } catch {}
  });
  await pedir(page, 'Agéndame una revisión hoy a las 23');
  await page.waitForTimeout(700);
  await foto(page, 'mensaje-enviado-pensando');
  retrasar = false;
  await page.getByRole('article', { name: 'Para confirmar' }).waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'tarjeta-propuesta');

  // Recargar con la tarjeta pendiente: persiste
  await page.reload();
  await page.getByRole('article', { name: 'Para confirmar' }).waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'tarjeta-persiste-tras-recargar');

  await page.getByRole('article', { name: 'Para confirmar' }).getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText(/^Listo: «Revisión» quedó en tu calendario/).waitFor();
  await page.waitForTimeout(600);
  await foto(page, 'resultado-confirmado');

  // El siguiente mensaje vacía la pantalla (REQ-AGT-01 / H-AGT-05)
  await pedir(page, 'Mejor a las 5');
  await page.waitForTimeout(300);
  await foto(page, 'siguiente-mensaje-vacia-pantalla');
  await page.getByText('No sé hacer eso todavía.').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'siguiente-mensaje-respuesta-sin-contexto');

  // Consulta: la agenda armada por el código
  await pedir(page, '¿Qué tengo hoy?');
  await page.getByRole('region', { name: /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+, \d+ de / }).waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'consulta-lista-agenda');

  // Conflicto: mismo horario
  await pedir(page, 'Agéndame una llamada hoy a las 23');
  await page.getByRole('article', { name: 'Para confirmar' }).last().waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'tarjeta-con-conflicto');
  // Mensaje nuevo con propuesta pendiente: la descarta
  await pedir(page, 'Agéndame una llamada hoy a las 22');
  await page.getByRole('article', { name: 'Para confirmar' }).last().waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'propuesta-reemplazada-por-mensaje-nuevo');
  await page.getByRole('article', { name: 'Para confirmar' }).last().getByRole('button', { name: 'Descartar' }).click();
  await page.getByText('De acuerdo, no hice nada.').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'descartada');

  // Recargar tras el cierre: la conversación anterior desaparece
  await page.reload();
  await page.getByRole('heading', { level: 1, name: 'Agenda' }).waitFor();
  await page.waitForTimeout(500);
  await foto(page, 'recarga-tras-cierre-conversacion-vacia');

  // Pregunta por dato que falta
  await pedir(page, 'Agéndame algo con Vasco');
  await page.getByText('¿Qué día?').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'pregunta-dato-faltante');

  // Lienzo expandido, si existe el control
  const expandir = page.getByRole('button', { name: /expandir|ampliar|lienzo/i }).first();
  if (await expandir.count()) {
    await expandir.click();
    await page.waitForTimeout(400);
    await foto(page, 'lienzo-expandido');
  }
  await ctx.close();
}

// ---------- En espera y fuera de alcance ----------
{
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-PE', timezoneId: 'America/Lima' });
  const page = await ctx.newPage();
  await entrar(page, cuentas.asistenteEspera.correo);
  await pedir(page, 'Recuérdame pagar el recibo antes del sábado');
  await page.getByText(/^En espera\./).waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'tarea-en-espera');
  await pedir(page, 'Mándale un correo a Juan');
  await page.getByText('No sé hacer eso todavía.').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'fuera-de-alcance');
  await ctx.close();
}

// ---------- Ancho menor (1024×768) ----------
{
  const ctx = await navegador.newContext({ viewport: { width: 1024, height: 768 }, locale: 'es-PE', timezoneId: 'America/Lima' });
  const page = await ctx.newPage();
  await entrar(page, cuentas.armazon.correo);
  await page.waitForTimeout(500);
  await foto(page, 'ancho-1024-inicial');
  await pedir(page, 'Agéndame una reunión mañana a las 10');
  await page.getByRole('article', { name: 'Para confirmar' }).waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'ancho-1024-tarjeta');
  await ctx.close();
}

await navegador.close();
