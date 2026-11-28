import { expect, test, type Browser, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-135 · REQ-CUN06-07, 10, 15, 19 · 10-reuniones plan §10. Las reuniones en el móvil, a 390 × 844, sobre el
// escenario «Proyecto Alfa» que siembra apps/web/e2e/arrancar-api.mjs (bloque «Reuniones Demo»): el líder
// responsable, Ana y Beto autorizados y con calendario, Carla sin autorizar y Diego sin calendario; Pablo es del
// Plan Personal. La API usa el modelo simulado con su guion y el calendario simulado, que copia el evento a los
// invitados (P-REU-04). Por el límite de 5 ingresos por minuto, cada cuenta entra una vez y las pruebas van en orden.
// Con CAPTURAS_REUNIONES=<carpeta>, guarda las capturas (design/capturas/2026-11-25-reuniones/movil).

const CAPTURAS = process.env.CAPTURAS_REUNIONES;

async function capturar(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
}

async function entrar(browser: Browser, correo: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('/');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  return page;
}

const abrirReuniones = (page: Page) => page.getByRole('tab', { name: 'Reuniones' }).click();
const reuniones = (page: Page) => page.getByRole('list', { name: 'Reuniones' }).getByRole('listitem');
const enviar = (page: Page) => page.getByRole('button', { name: 'Enviar' }).click();
const cerrarCapa = (page: Page) => page.getByRole('button', { name: 'Cerrar', exact: true }).click();
// «Jueves 26, 14:00 – 15:00»: un horario propuesto en la capa
const HORARIO = /^\p{Lu}\p{Ll}+ \d+, \d{2}:\d{2} – \d{2}:\d{2}$/u;
// «✓ Jueves 26, 14:00»: la píldora verde de una agendada
const AGENDADA = /^✓ \p{Lu}\p{Ll}+ \d+, \d{2}:\d{2}$/u;

test.describe.configure({ mode: 'serial' });

let lider: Page;
test.beforeAll(async ({ browser }) => {
  lider = await entrar(browser, cuentas.reunionesLider.correo);
});
test.afterAll(async () => {
  await lider.close();
});

test.describe('movil.reuniones', () => {
  test('sin reuniones, el estado vacío del boceto con «Crear reunión» (REQ-CUN06-07 v2, 19; T-145)', async () => {
    await expect(lider.getByRole('tab', { name: 'Reuniones' })).toBeVisible();
    await abrirReuniones(lider);
    await expect(lider.getByRole('heading', { name: 'Aún no hay reuniones de equipo' })).toBeVisible();
    await expect(lider.getByText('Crea una reunión para comparar la disponibilidad de tu equipo y elegir un horario.')).toBeVisible();
    const crear = lider.getByRole('button', { name: 'Crear reunión' });
    await expect(crear).toBeVisible();
    // Los cortes tienen al menos 44 px de alto (RT-20)
    expect((await lider.getByRole('tab', { name: 'Reuniones' }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await capturar(lider, '01-lista-vacia');

    // D-REU-35: «Crear reunión» abre la capa con la petición escrita, sin enviarla, y no crea nada
    await crear.click();
    await expect(lider.getByLabel('Pídele algo al asistente')).toHaveValue('Busca un horario para reunirme con mi equipo');
    await expect(lider.getByLabel(/^Horarios para/)).toHaveCount(0);
  });

  test('en la capa, las propuestas pulsables; elegir una muestra la tarjeta y confirmar la deja agendada (REQ-CUN06-10)', async () => {
    // El guion del modelo simulado no entiende la petición de «Crear reunión»: se nombra el equipo
    await lider.getByLabel('Pídele algo al asistente').fill('Reunión con el equipo Proyecto Alfa');
    await enviar(lider);
    const turno = lider.getByLabel(/^Horarios para «/).last();
    await expect(turno).toBeVisible();
    const horarios = turno.getByRole('button', { name: HORARIO });
    await expect(horarios.first()).toBeVisible();
    expect(await horarios.count()).toBeLessThanOrEqual(3);
    await expect(turno.getByText(/^Libres \d+ de \d+/).first()).toBeVisible();
    await expect(turno.getByText('Hora de Lima (GMT-5)')).toBeVisible();
    await capturar(lider, '02-capa-propuestas');

    await horarios.first().click();
    const tarjeta = lider.getByLabel('Para confirmar').last();
    await expect(tarjeta).toContainText('Convocar esta reunión');
    // Plegada, con a quién le llega la invitación y lo irreversible (P-03)
    await expect(tarjeta.getByText(/^Invitados \(\d+\)$/)).toBeVisible();
    await expect(tarjeta.getByText(/ana@reuniones-movil\.test/)).toBeVisible();
    await expect(tarjeta.getByText(/^Google enviará la invitación por correo a/)).toBeVisible();
    await expect(tarjeta.getByText(/no se comprobó su disponibilidad/)).toBeVisible();
    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    await expect(lider.getByRole('separator', { name: /Se convocó «/ })).toBeVisible();
    await expect(tarjeta.getByText('Confirmado', { exact: true })).toBeVisible();
    await cerrarCapa(lider);

    await expect(reuniones(lider)).toHaveCount(1);
    await expect(reuniones(lider).first().getByText(AGENDADA)).toBeVisible();
    await expect(reuniones(lider).first().getByText('Proyecto Alfa', { exact: true })).toBeVisible();
  });

  test('una pendiente va en ámbar; su detalle muestra las propuestas sin mapa y los invitados en una línea (REQ-CUN06-07, 09, 19)', async () => {
    await lider.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await lider.getByLabel('Pídele algo al asistente').fill('reunión con Ana y Beto');
    await enviar(lider);
    await expect(lider.getByLabel(/^Horarios para «/).last().getByRole('button', { name: HORARIO }).first()).toBeVisible();
    await cerrarCapa(lider);

    await expect(reuniones(lider)).toHaveCount(2);
    const pendiente = reuniones(lider).filter({ hasText: 'Elegir horario' });
    await expect(pendiente).toHaveCount(1);
    await capturar(lider, '03-lista-pendiente');

    await pendiente.getByRole('button').click();
    await expect(lider.getByText('Horarios propuestos', { exact: true })).toBeVisible();
    const elegir = lider.getByRole('list', { name: 'Horarios propuestos' }).getByRole('button', { name: 'Elegir' });
    await expect(elegir.first()).toBeVisible();
    expect(await elegir.count()).toBeLessThanOrEqual(3);
    // REQ-CUN06-19: sin mapa de calor en el móvil
    await expect(lider.getByText(/Pasa el cursor|disponibles/)).toHaveCount(0);
    for (const b of await elegir.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    // D-REU-20: una línea que se despliega
    const linea = lider.getByRole('button', { name: 'Invitados: 2 obligatorios · 0 opcionales' });
    await expect(linea).toBeVisible();
    await expect(lider.getByRole('list', { name: 'Invitados' })).toHaveCount(0);
    await linea.click();
    const invitados = lider.getByRole('list', { name: 'Invitados' }).getByRole('listitem');
    await expect(invitados).toHaveCount(2);
    await expect(invitados.filter({ hasText: 'ana@reuniones-movil.test' })).toContainText('Obligatorio');
    // Para la captura: las propuestas enteras a la vista, con los invitados desplegados encima
    await lider.mouse.move(195, 500);
    await lider.mouse.wheel(0, 240);
    await expect(elegir.last()).toBeInViewport({ ratio: 1 });
    await capturar(lider, '04-detalle-propuestas-invitados');

    await elegir.first().click();
    const tarjeta = lider.getByLabel('Para confirmar');
    await expect(tarjeta).toContainText('Convocar esta reunión');
    await expect(tarjeta.getByText('Google enviará la invitación por correo a 2 personas. Deshacerlo es cancelar la reunión, que también les avisa.')).toBeVisible();
    // Al aparecer, la tarjeta entera queda a la vista, botones incluidos (como en la capa, H-CAP-01)
    await expect(tarjeta.getByRole('button', { name: 'Descartar' })).toBeInViewport({ ratio: 1 });
    await capturar(lider, '05-tarjeta-convocar');
    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    await expect(lider.getByText('Listo: la reunión quedó agendada y Google envió las invitaciones.')).toBeVisible();
    await expect(lider.getByText(AGENDADA)).toBeVisible();
    await expect(lider.getByText('Horarios propuestos', { exact: true })).toHaveCount(0);

    await lider.getByRole('button', { name: 'Volver a las reuniones' }).click();
    await expect(reuniones(lider)).toHaveCount(2);
    await expect(reuniones(lider).getByText(AGENDADA)).toHaveCount(2);
    await capturar(lider, '06-lista-agendada');
  });

  test('la invitada ve las dos agendadas, convocadas por el líder, sin poder cancelarlas (REQ-CUN06-07)', async ({ browser }) => {
    const ana = await entrar(browser, cuentas.reunionesAna.correo);
    await abrirReuniones(ana);
    await expect(reuniones(ana)).toHaveCount(2);
    await expect(reuniones(ana).getByText(AGENDADA)).toHaveCount(2);
    await expect(reuniones(ana).getByText('Convocada por Lider', { exact: true })).toHaveCount(2);
    await capturar(ana, '07-vista-invitada');

    await reuniones(ana).first().getByRole('button').click();
    await expect(ana.getByText('Convocada por Lider', { exact: true })).toBeVisible();
    await expect(ana.getByRole('button', { name: 'Cancelar reunión' })).toHaveCount(0);
    await ana.close();
  });

  test('quien convocó la cancela con su tarjeta, y sale de la lista (REQ-CUN06-15)', async () => {
    await reuniones(lider).filter({ hasText: 'Proyecto Alfa' }).first().getByRole('button').click();
    await lider.getByRole('button', { name: 'Cancelar reunión' }).click();
    const tarjeta = lider.getByLabel('Para confirmar');
    await expect(tarjeta).toContainText('Cancelar esta reunión');
    await expect(tarjeta.getByText(/Google avisará a los \d+ invitados de que se canceló\.$/)).toBeVisible();
    // Al aparecer, la tarjeta entera queda a la vista, botones incluidos (como en la capa, H-CAP-01)
    await expect(tarjeta.getByRole('button', { name: 'Descartar' })).toBeInViewport({ ratio: 1 });
    await capturar(lider, '08-tarjeta-cancelar');
    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    await expect(lider.getByText('Reunión cancelada. Google avisó a los invitados.')).toBeVisible();
    await expect(reuniones(lider)).toHaveCount(1);
  });

  // T-146 · D-REU-36: la autorización propia está en Ajustes, una fila por equipo, y no en la lista de Reuniones
  test('Ajustes tiene «Disponibilidad para tu equipo» con el responsable y el estado (REQ-CUN05-14, 19)', async () => {
    await expect(lider.getByRole('button', { name: /^Autorizar|^Retirar autorización/ })).toHaveCount(0);
    await lider.getByRole('button', { name: 'Ajustes' }).click();
    await expect(lider.getByRole('heading', { name: 'Disponibilidad para tu equipo' })).toBeVisible();
    const alfa = lider.getByRole('list', { name: 'Tus equipos' }).getByRole('listitem').filter({ hasText: 'Proyecto Alfa' });
    await expect(alfa).toContainText(`Responsable: ${cuentas.reunionesLider.correo} · 5 integrantes`);
    await expect(alfa).toContainText('Autorizado');
    await expect(alfa.getByRole('button', { name: 'Retirar autorización' })).toBeVisible();
    await capturar(lider, '09-ajustes-disponibilidad');
    // Retirarla pasa por la tarjeta; se descarta para no cambiar el escenario
    await alfa.getByRole('button', { name: 'Retirar autorización' }).click();
    const tarjeta = alfa.getByLabel('Para confirmar');
    await expect(tarjeta).toBeVisible();
    await tarjeta.getByRole('button', { name: 'Descartar' }).click();
    await expect(lider.getByText('No se realizaron cambios.')).toBeVisible();
    await expect(alfa).toContainText('Autorizado');
    await cerrarCapa(lider);
  });

  test('con el Plan Personal no hay corte «Reuniones» (REQ-CUN06-19)', async ({ browser }) => {
    const pablo = await entrar(browser, cuentas.reunionesPablo.correo);
    await expect(pablo.getByRole('tab', { name: 'Hoy' })).toBeVisible();
    await expect(pablo.getByRole('tab', { name: 'Reuniones' })).toHaveCount(0);
    await pablo.close();
  });
});
