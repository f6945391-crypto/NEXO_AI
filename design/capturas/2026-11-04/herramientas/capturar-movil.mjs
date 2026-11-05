// Recorrido exploratorio del móvil (Expo web) con el asistente simulado. Solo captura.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const cuentas = JSON.parse(readFileSync('../../../../apps/movil/e2e/cuentas.json', 'utf8'));
const SALIDA = './salida/movil';
mkdirSync(SALIDA, { recursive: true });
const BASE = 'http://localhost:3201';

const navegador = await chromium.launch();
let n = 0;
const foto = async (page, nombre) => {
  n += 1;
  const archivo = `${SALIDA}/M${String(n).padStart(2, '0')}-${nombre}.png`;
  await page.screenshot({ path: archivo });
  console.log('capturada', archivo);
};
const contexto = () => navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PE', timezoneId: 'America/Lima' });

async function entrar(page, correo) {
  await page.goto(BASE);
  await page.getByLabel('Correo').waitFor({ timeout: 90_000 });
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('heading', { name: 'Agenda' }).waitFor();
}
async function abrirCapa(page) {
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
  await page.getByLabel('Pídele algo al asistente').waitFor();
}
async function pedir(page, texto) {
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
}

{
  const ctx = await contexto();
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByLabel('Correo').waitFor({ timeout: 90_000 });
  await page.waitForTimeout(500);
  await foto(page, 'entrar');
  await entrar(page, cuentas.captura.correo);
  await page.waitForTimeout(600);
  await foto(page, 'inicio-agenda-vacia');
  await abrirCapa(page);
  await page.waitForTimeout(400);
  await foto(page, 'capa-captura-blanco');

  let retrasar = true;
  await page.route('**/asistente/mensajes', async (ruta) => {
    if (retrasar) await new Promise((r) => setTimeout(r, 2500));
    try { await ruta.continue(); } catch {}
  });
  await pedir(page, 'Agéndame una revisión hoy a las 23');
  await page.waitForTimeout(700);
  await foto(page, 'mensaje-enviado-pensando');
  retrasar = false;
  await page.getByLabel('Para confirmar').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'tarjeta-propuesta');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByText(/^Listo: «Revisión» quedó en tu calendario/).waitFor();
  await page.waitForTimeout(400);
  await foto(page, 'resultado-confirmado');

  // Siguiente mensaje en la misma capa: vacía
  await pedir(page, 'Mejor a las 5');
  await page.waitForTimeout(250);
  await foto(page, 'siguiente-mensaje-vacia-capa');
  await page.getByText('No sé hacer eso todavía.').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'siguiente-mensaje-sin-contexto');

  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.waitForTimeout(500);
  await foto(page, 'inicio-con-compromiso');
  await abrirCapa(page);
  await page.waitForTimeout(400);
  await foto(page, 'capa-reabierta-tras-cierre');

  // Conflicto
  await pedir(page, 'Agéndame una llamada hoy a las 23');
  await page.getByLabel('Para confirmar').last().waitFor();
  await page.waitForTimeout(400);
  await foto(page, 'tarjeta-con-conflicto');
  await page.getByRole('button', { name: 'Descartar' }).click();
  await page.getByText('De acuerdo, no hice nada.').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'descartada');

  // Dato que falta
  await pedir(page, 'Agéndame algo con Vasco');
  await page.getByText('¿Qué día?').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'pregunta-dato-faltante');
  // Consulta
  await pedir(page, '¿Qué tengo hoy?');
  await page.waitForTimeout(1200);
  await foto(page, 'consulta-lista-agenda');
  await ctx.close();
}

{
  const ctx = await contexto();
  const page = await ctx.newPage();
  await entrar(page, cuentas.capturaEspera.correo);
  await abrirCapa(page);
  await pedir(page, 'Recuérdame pagar el recibo');
  await page.getByText(/^En espera\./).waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'tarea-en-espera');
  await pedir(page, 'Mándale un correo a Juan');
  await page.getByText('No sé hacer eso todavía.').waitFor();
  await page.waitForTimeout(300);
  await foto(page, 'fuera-de-alcance');
  await ctx.close();
}

await navegador.close();
