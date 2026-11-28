import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-134 · specs/10-reuniones (REQ-CUN06-07 a 10, 15, 19): el corte «Reuniones» de Agenda, su detalle con el mapa de
// calor y el turno `reunion` de la conversación. Reemplaza a la prueba del formulario de CUN-05, que salió de la
// pantalla (D-REU-09). Los datos los siembra e2e/arrancar-api.mjs («Reuniones Demo», «Proyecto Alfa»): el primer día
// hábil desde mañana tiene el escenario de T-124 y Beto está de viaje los otros cuatro.
// Con CAPTURAS_REUNIONES=<carpeta>, guarda las capturas (design/capturas/2026-11-25-reuniones/web).

const CAPTURAS = process.env.CAPTURAS_REUNIONES;
async function capturar(page: Page, nombre: string) {
  if (!CAPTURAS) return;
  // El indicador de desarrollo de Next.js no es parte de la aplicación
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
}

async function entrar(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

const niveles = (page: Page) => page.getByRole('tablist', { name: 'Niveles' }).getByRole('tab');

async function abrirReuniones(page: Page) {
  await page.getByRole('tablist', { name: 'Niveles' }).getByRole('tab', { name: 'Reuniones' }).click();
}

// El primer día hábil desde mañana, en Lima, como lo calcula la siembra
function primerHabil(): { fecha: string; nombre: string } {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  for (let n = 1; ; n++) {
    const dia = new Date(Date.parse(`${hoy}T12:00:00Z`) + n * 24 * 3600_000);
    if (dia.getUTCDay() === 0 || dia.getUTCDay() === 6) continue;
    const semana = new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long' }).format(dia);
    return { fecha: dia.toISOString().slice(0, 10), nombre: `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${dia.getUTCDate()}` };
  }
}

const TITULO = 'Reunión de Proyecto Alfa';

test.describe('web.reuniones', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.describe.configure({ mode: 'serial' });

  test('con Plan Personal no hay corte «Reuniones»', async ({ page }) => {
    await entrar(page, cuentas.reunionesPablo.correo);
    await expect(niveles(page)).toHaveText(['Hoy', 'Semana', 'Mes']);
    await capturar(page, '11-sin-plan-sin-corte');
  });

  test('el líder pide una reunión, la ve en ámbar, la recalcula en el detalle y la convoca desde la conversación', async ({ page }) => {
    const dia = primerHabil();
    await entrar(page, cuentas.reunionesLider.correo);
    await abrirReuniones(page);

    await test.step('lista vacía: el estado vacío del boceto, sin la autorización propia (T-145, T-146)', async () => {
      await expect(page.getByRole('heading', { name: 'Aún no hay reuniones de equipo' })).toBeVisible();
      await expect(page.getByText('Crea una reunión para comparar la disponibilidad de tu equipo y elegir un horario.')).toBeVisible();
      // D-REU-36: la autorización propia pasó a Ajustes
      await expect(page.getByRole('heading', { name: 'Compartir tu disponibilidad' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Disponibilidad para tu equipo' })).toHaveCount(0);
      // REQ-CUN06-07 v2: en el corte «Reuniones», el blanco de la conversación ofrece ejemplos de reuniones
      await expect(page.getByRole('button', { name: 'Busca un horario de 30 minutos para reunirnos' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Consulta la disponibilidad de mi equipo para mañana' })).toBeVisible();
      await capturar(page, '01-lista-vacia');
      // D-REU-35: «Crear reunión» escribe la petición en la barra de entrada, sin enviarla, y no crea nada
      await page.getByRole('button', { name: 'Crear reunión' }).click();
      await expect(page.getByLabel('Pídele algo al asistente')).toHaveValue('Busca un horario para reunirme con mi equipo');
      await expect(page.getByRole('heading', { name: 'Aún no hay reuniones de equipo' })).toBeVisible();
      await expect(page.getByRole('list', { name: 'Reuniones' })).toHaveCount(0);
    });

    const horarios = page.getByRole('list', { name: `Horarios para ${TITULO}` });
    await test.step('la conversación muestra tres propuestas y la lista la muestra en ámbar', async () => {
      await page.getByLabel('Pídele algo al asistente').fill('reunión con el proyecto Alfa');
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(horarios.getByRole('button')).toHaveCount(3);
      // Todos libres el primer día: 11:00, 12:00 y 14:00 (los demás días Beto está de viaje)
      await expect(horarios.getByRole('button').first()).toContainText(`${dia.nombre}, 11:00 – 12:00`);
      await expect(horarios.getByRole('button').first()).toContainText('3/3 libres');
      await expect(page.getByRole('button', { name: 'Ver todos los horarios' })).toBeVisible();
      await expect(page.getByRole('button', { name: `${TITULO}: Elegir horario` })).toBeVisible();
      await capturar(page, '02-conversacion-propuestas');
      await capturar(page, '03-lista-pendiente-ambar');
    });

    await test.step('el detalle muestra el mapa, el sugerido y quién está libre', async () => {
      await page.getByRole('button', { name: `${TITULO}: Elegir horario` }).click();
      await expect(page.getByRole('heading', { level: 2, name: TITULO })).toBeVisible();
      const mapa = page.getByRole('grid', { name: 'Disponibilidad por media hora' });
      await expect(mapa).toBeVisible();
      // Cinco días hábiles y 24 medias horas, de 08:00 a 20:00
      await expect(mapa.getByRole('columnheader')).toHaveCount(6);
      await expect(mapa.getByRole('rowheader')).toHaveCount(24);
      await expect(mapa.getByRole('button', { name: `${dia.nombre} · 11:00–11:30: 3 de 3 libres, sugerido` })).toBeVisible();
      await expect(page.getByText('Solo se muestran horas libres u ocupadas, sin títulos ni detalles')).toBeVisible();
      await expect(page.getByRole('button', { name: /^2 obligatorios · 0 opcionales · 1 sin autorizar · 1 sin calendario/ })).toBeVisible();
      // D-REU-20: si son menos los ocupados, el detalle los nombra a ellos
      await mapa.evaluate((e) => e.scrollIntoView({ block: 'end' }));
      await mapa.getByRole('button', { name: `${dia.nombre} · 08:00–08:30: 2 de 3 libres` }).hover();
      await expect(page.getByRole('tooltip')).toContainText('Libres 2 de 3 · Ocupados: Beto');
      await capturar(page, '04-detalle-mapa-tooltip');
      await mapa.getByRole('button', { name: `${dia.nombre} · 15:00–15:30: 2 de 3 libres` }).hover();
      await expect(page.getByRole('tooltip')).toContainText('Libres 2 de 3 · Ocupados: tú');
    });

    await test.step('marcar a Beto como opcional vuelve a calcular las propuestas', async () => {
      const propuestas = page.getByRole('list', { name: 'Horarios sugeridos' });
      await expect(propuestas).not.toContainText('2/3 libres');
      await page.getByRole('button', { name: /obligatorios · 0 opcionales/ }).click();
      await expect(page.getByRole('listitem').filter({ hasText: cuentas.reunionesCarla.correo })).toContainText('No autorizó');
      await expect(page.getByRole('listitem').filter({ hasText: cuentas.reunionesDiego.correo })).toContainText('Sin calendario');
      await page.getByRole('radiogroup', { name: 'Marca de Beto' }).getByText('Opcional').click();
      await expect(page.getByRole('button', { name: /^1 obligatorio · 1 opcional · 1 sin autorizar · 1 sin calendario/ })).toBeVisible();
      // Sin Beto como necesario, aparecen los días de su viaje
      await expect(propuestas).toContainText('2/3 libres');
      await capturar(page, '05-invitados-beto-opcional');
    });

    await test.step('«Confirmar horario» muestra la tarjeta en el mismo detalle', async () => {
      await page.getByRole('button', { name: 'Confirmar horario' }).click();
      const tarjeta = page.getByRole('main').getByRole('article', { name: 'Para confirmar' });
      await expect(tarjeta.getByRole('heading', { name: 'Convocar esta reunión' })).toBeVisible();
      await expect(tarjeta).toContainText('Google enviará la invitación por correo');
      await capturar(page, '06-tarjeta-convocar');
      await tarjeta.getByRole('button', { name: 'Descartar' }).click();
      await expect(tarjeta).toHaveCount(0);
      await page.getByRole('button', { name: '‹ Volver' }).click();
    });

    await test.step('elegir una propuesta en la conversación muestra la tarjeta y confirmar la deja en verde', async () => {
      await horarios.getByRole('button').first().click();
      const tarjeta = page.getByRole('region', { name: 'Asistente' }).getByRole('article', { name: 'Para confirmar' });
      await expect(tarjeta.getByRole('heading', { name: 'Convocar esta reunión' })).toBeVisible();
      await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
      await expect(page.locator('.turno__resultado')).toBeVisible();
      await expect(page.getByRole('button', { name: `${TITULO}: ${dia.nombre}, 11:00` })).toBeVisible();
      await capturar(page, '07-lista-agendada-verde');
    });
  });

  test('la invitada la ve agendada en su lista y en su agenda, como invitada', async ({ page }) => {
    const dia = primerHabil();
    await entrar(page, cuentas.reunionesAna.correo);
    await abrirReuniones(page);
    const ficha = page.getByRole('button', { name: `${TITULO}: Convocada por Lider · ${dia.nombre}, 11:00` });
    await expect(ficha).toBeVisible();
    await capturar(page, '08-invitada-lista');
    // Sin mapa y sin «Cancelar reunión»: no la convocó
    await ficha.click();
    await expect(page.getByRole('heading', { level: 2, name: TITULO })).toBeVisible();
    await expect(page.getByRole('grid')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar reunión' })).toHaveCount(0);

    await page.goto(`/?fecha=${dia.fecha}`);
    const compromiso = page.getByRole('listitem').filter({ hasText: TITULO });
    await expect(compromiso).toContainText('Invitado');
    await capturar(page, '09-invitada-agenda');
  });

  test('quien convocó la cancela desde el detalle, con su tarjeta', async ({ page }) => {
    const dia = primerHabil();
    await entrar(page, cuentas.reunionesLider.correo);
    await abrirReuniones(page);
    await page.getByRole('button', { name: `${TITULO}: ${dia.nombre}, 11:00` }).click();
    await expect(page.getByRole('grid')).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancelar reunión' }).click();
    const tarjeta = page.getByRole('main').getByRole('article', { name: 'Para confirmar' });
    await expect(tarjeta.getByRole('heading', { name: 'Cancelar esta reunión' })).toBeVisible();
    await expect(tarjeta).toContainText('Google avisará');
    await capturar(page, '10-tarjeta-cancelar');
    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(`Listo: «${TITULO}» quedó cancelada.`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aún no hay reuniones de equipo' })).toBeVisible();
  });
});

// T-124 · specs/05-equipos/casos-de-prueba.md, CP-R-01 a 04 en pantalla. CP-R-05 (la consulta de todos sale parcial)
// probaba el formulario de CUN-05, que salió de la pantalla (D-REU-09): quien no autorizó o no tiene calendario se ve
// ahora en la línea de invitados del detalle, y lo prueba `web.reuniones`.
test.describe('web.escenario-reuniones', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('CP-R-01 · con Plan Personal no hay corte de equipo', async ({ page }) => {
    await entrar(page, cuentas.reunionesPablo.correo);
    await expect(niveles(page)).toHaveText(['Hoy', 'Semana', 'Mes']);
  });

  test('CP-R-02 · el administrador sin equipo tampoco lo tiene', async ({ page }) => {
    await entrar(page, cuentas.reunionesAdmin.correo);
    await expect(niveles(page)).toHaveText(['Hoy', 'Semana', 'Mes']);
  });

  test('CP-R-03 · en la zona de empresa, el administrador ve el equipo con su responsable', async ({ page }) => {
    await page.goto('/administracion/entrar');
    await page.getByLabel('Correo').fill(cuentas.reunionesAdmin.correo);
    await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Equipos' }).click();
    const alfa = page.locator('article, section, li').filter({ hasText: 'Proyecto Alfa' }).first();
    await expect(alfa).toContainText(cuentas.reunionesLider.correo);
    for (const clave of ['reunionesAna', 'reunionesBeto', 'reunionesCarla', 'reunionesDiego'] as const) {
      await expect(alfa).toContainText(cuentas[clave].correo);
    }
  });

  test('CP-R-04 · el integrante ve al responsable del equipo en Ajustes', async ({ page }) => {
    await entrar(page, cuentas.reunionesBeto.correo);
    // T-146 · D-REU-36: el responsable y la autorización propia pasaron del pie de Reuniones a Ajustes
    await page.getByRole('button', { name: 'Ajustes' }).click();
    const apartado = page.getByRole('dialog', { name: 'Ajustes' }).getByRole('region', { name: 'Disponibilidad para tu equipo' });
    await expect(apartado.getByText(`Responsable: ${cuentas.reunionesLider.correo} · 5 integrantes`)).toBeVisible();
  });
});

// T-146 · D-REU-36 · REQ-CUN05-14 a 16, 18 y 19: «Compartir tu disponibilidad» salió del pie de Reuniones y está en
// Ajustes, apartado «Disponibilidad para tu equipo», con una fila por equipo. La Operación es la de siempre
// (`equipo.cambiar_consentimiento`), con su tarjeta. Carla empieza sin autorizar (pendiente) y termina sin autorizar
// (retirada): para el escenario de `web.reuniones` sigue contando como «sin autorizar».
test.describe('web.consentimiento-en-ajustes', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('con Plan Personal, Ajustes no tiene el apartado', async ({ page }) => {
    await entrar(page, cuentas.reunionesPablo.correo);
    await page.getByRole('button', { name: 'Ajustes' }).click();
    const ajustes = page.getByRole('dialog', { name: 'Ajustes' });
    await expect(ajustes.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await expect(ajustes.getByRole('heading', { name: 'Disponibilidad para tu equipo' })).toHaveCount(0);
  });

  test('la integrante autoriza y retira su autorización desde Ajustes, con su tarjeta', async ({ page }) => {
    await entrar(page, cuentas.reunionesCarla.correo);
    await abrirReuniones(page);
    // La lista de Reuniones queda solo con las reuniones
    await expect(page.getByRole('heading', { name: 'Compartir tu disponibilidad' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Autorizar/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Ajustes' }).click();
    const apartado = page.getByRole('dialog', { name: 'Ajustes' }).getByRole('region', { name: 'Disponibilidad para tu equipo' });
    const alfa = apartado.getByRole('listitem').filter({ hasText: 'Proyecto Alfa' });
    await expect(alfa).toContainText(`Responsable: ${cuentas.reunionesLider.correo} · 5 integrantes`);
    await expect(alfa).toContainText('Sin autorizar');
    await capturar(page, '12-ajustes-sin-autorizar');

    await test.step('autorizar pasa por la tarjeta y deja «Autorizado»', async () => {
      await alfa.getByRole('button', { name: 'Autorizar: Proyecto Alfa' }).click();
      // P-03: la tarjeta de la Operación, en la misma fila, antes de cambiar nada
      await expect(alfa.getByRole('region', { name: /autoriz/i })).toContainText('Solo disponibilidad libre u ocupada');
      await expect(alfa).toContainText('Sin autorizar');
      await capturar(page, '13-ajustes-tarjeta-autorizar');
      await alfa.getByRole('button', { name: 'Confirmar cambio' }).click();
      await expect(alfa.getByRole('button', { name: 'Retirar autorización: Proyecto Alfa' })).toBeVisible();
      await expect(alfa).toContainText('Autorizado');
      await expect(alfa.getByText('Tu autorización se ha actualizado correctamente.')).toBeVisible();
    });

    await test.step('retirarla vuelve a «Sin autorizar»', async () => {
      await alfa.getByRole('button', { name: 'Retirar autorización: Proyecto Alfa' }).click();
      await alfa.getByRole('button', { name: 'Confirmar cambio' }).click();
      await expect(alfa.getByRole('button', { name: 'Autorizar: Proyecto Alfa' })).toBeVisible();
      await expect(alfa).toContainText('Sin autorizar');
    });

    await test.step('descartar la tarjeta no cambia nada', async () => {
      await alfa.getByRole('button', { name: 'Autorizar: Proyecto Alfa' }).click();
      await alfa.getByRole('button', { name: 'Cancelar' }).click();
      await expect(alfa.getByText('No se realizaron cambios.')).toBeVisible();
      await expect(alfa).toContainText('Sin autorizar');
    });
  });
});
