import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-034 · REQ-CAP-23, REQ-CUN01-01, 04, 13 · specs/07-agente/plan.md §9. La API de estas pruebas usa el
// modelo simulado con el guion de demostración (H-AGT-02) y el calendario simulado: nunca Groq ni Google.

async function entrar(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

async function pedir(page: Page, texto: string) {
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
}

test.describe('web.asistente-agenda-y-confirma', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('se pide un compromiso, se confirma en su tarjeta y aparece en Hoy; una consulta responde con la agenda tal cual', async ({ page }) => {
    await entrar(page, cuentas.asistente.correo);
    await expect(page.getByText('Hoy no tienes compromisos')).toBeVisible();

    await pedir(page, 'Agéndame una revisión hoy a las 23');
    const tarjeta = page.getByRole('article', { name: 'Para confirmar' });
    await expect(tarjeta.getByRole('heading', { name: 'Registrar este compromiso en tu calendario de Google' })).toBeVisible();
    await expect(tarjeta).toContainText('Revisión');
    await expect(tarjeta).toContainText('23:00 – 00:00');
    // REQ-CUN01-01: sin hora de fin, una hora, y la tarjeta lo dice
    await expect(tarjeta).toContainText('1 hora, porque no indicaste la hora de fin');
    // Nada se registró todavía (REQ-CUN01-03)
    await expect(page.getByText('Hoy no tienes compromisos')).toBeVisible();

    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toBeVisible();
    await expect(tarjeta.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    const hoy = page.getByRole('list', { name: 'Compromisos de hoy' });
    await expect(hoy.getByText('Revisión')).toBeVisible();

    // REQ-CUN01-13: la consulta la responde la agenda armada por el código
    await pedir(page, '¿Qué tengo hoy?');
    // La de la conversación empieza con mayúscula; la de Hoy, no
    const lista = page.getByRole('region', { name: /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+, \d+ de / });
    await expect(lista).toContainText('Hora de Lima (GMT-5)');
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('23:00 – 00:00 Revisión');

    // T-039 · REQ-AGT-03: lo de antes sigue a la vista, separado por una línea que dice qué se hizo
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toBeVisible();
    await expect(page.getByRole('separator', { name: /Se registró «Revisión»$/ })).toBeVisible();
    await expect(page.getByText('¿Qué hacemos?')).toHaveCount(0);
  });

  // Pulido · REQ-CUN01-05: la cuenta semanaLlena tiene «Llamada con proveedores» mañana de 10:00 a 11:00
  test('un choque de horario se avisa en una línea que nombra el compromiso con el que se cruza (REQ-CUN01-05)', async ({ page }) => {
    await entrar(page, cuentas.semanaLlena.correo);
    await pedir(page, 'Agéndame una revisión mañana a las 10');
    const tarjeta = page.getByRole('article', { name: 'Para confirmar' }).last();
    const aviso = tarjeta.locator('.tarjeta__motivo');
    await expect(aviso).toHaveText('Se cruza con «Llamada con proveedores»');
    const alto = await aviso.evaluate((p) => p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).fontSize));
    expect(alto).toBeLessThan(2);
    // No se puede confirmar, y las alternativas siguen ahí
    await expect(tarjeta.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    await expect(tarjeta.getByRole('list', { name: 'Otros horarios' }).getByRole('button').first()).toBeVisible();
    // Decisión 28 de 02-agenda: las alternativas son botones y no se repiten en los datos
    await expect(tarjeta.getByText('Alternativas', { exact: true })).toHaveCount(0);
  });

  test('descartar no registra nada', async ({ page }) => {
    await entrar(page, cuentas.asistente.correo);
    await pedir(page, 'Agéndame una llamada mañana a las 9');
    const tarjeta = page.getByRole('article', { name: 'Para confirmar' }).last();
    await tarjeta.getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByText('De acuerdo, no hice nada.')).toBeVisible();
  });

  // Paridad con H-CAP-01 del móvil: una tarjeta ya decidida dice cómo terminó y no ofrece botones, también al recargar.
  // Con CAPTURAS_PENDIENTES=<carpeta>, guarda la captura (design/capturas/2026-11-07-pendientes).
  test('una tarjeta ya decidida queda sin botones y con «Confirmado» o «Descartado»', async ({ page }) => {
    await entrar(page, cuentas.asistente.correo);
    const tarjetas = page.getByRole('article', { name: 'Para confirmar' });

    await pedir(page, 'Agéndame una llamada mañana a las 16');
    const confirmada = tarjetas.last();
    await expect(confirmada).toContainText('16:00 – 17:00');
    await confirmada.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/^Listo: «Llamada» quedó en tu calendario/)).toBeVisible();

    await pedir(page, 'Agéndame una llamada mañana a las 18');
    await expect(tarjetas.last()).toContainText('18:00 – 19:00');
    await tarjetas.last().getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByText('De acuerdo, no hice nada.').last()).toBeVisible();
    if (process.env.CAPTURAS_PENDIENTES) await page.screenshot({ path: `${process.env.CAPTURAS_PENDIENTES}/web-tarjeta-decidida.png` });

    for (const vuelta of ['en la sesión', 'al recargar']) {
      if (vuelta === 'al recargar') await page.reload();
      const alas16 = tarjetas.filter({ hasText: '16:00 – 17:00' });
      const alas18 = tarjetas.filter({ hasText: '18:00 – 19:00' });
      await expect(alas16.locator('.tarjeta__decidido'), vuelta).toHaveText('Confirmado');
      await expect(alas18.locator('.tarjeta__decidido'), vuelta).toHaveText('Descartado');
      for (const tarjeta of [alas16, alas18]) await expect(tarjeta.getByRole('button'), vuelta).toHaveCount(0);
    }
  });
});

test.describe('web.asistente-en-espera', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // T-050: una tarea ya no queda en espera; lo que espera aquí es un compromiso sin el calendario conectado
  // (la cuenta asistenteEspera no lo tiene)
  test('lo que queda en espera se ve como en espera, no como un fallo, y sigue ahí al recargar (REQ-CAP-23, REQ-ACC-08)', async ({ page }) => {
    await entrar(page, cuentas.asistenteEspera.correo);
    await pedir(page, 'Agéndame una reunión mañana a las 10');
    const aviso = page.getByText(/^En espera\. Para eso necesito permiso para ver y editar tu calendario de Google/);
    await expect(aviso).toBeVisible();
    // Ningún fallo en la conversación (Next.js tiene su propio aviso de navegación, fuera de ella)
    await expect(page.getByRole('region', { name: 'Asistente' }).getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect(page.getByText('Agéndame una reunión mañana a las 10')).toBeVisible();
    await expect(aviso).toBeVisible();
  });

  test('lo que el asistente no sabe hacer lo dice, sin inventar (REQ-AGT-02)', async ({ page }) => {
    await entrar(page, cuentas.asistenteEspera.correo);
    await pedir(page, 'Mándale un correo a Juan');
    await expect(page.getByText('No sé hacer eso todavía.')).toBeVisible();
  });
});

test.describe('web.asistente-historial', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('tras recargar se ve lo anterior con sus líneas; «Ver anteriores» trae lo más viejo y desaparece al no quedar más (REQ-AGT-03)', async ({ page }) => {
    await entrar(page, cuentas.historial.correo);
    // Persona sin historial: el blanco inicial con ejemplos
    await expect(page.getByRole('heading', { name: '¿Qué hacemos?' })).toBeVisible();

    for (let i = 0; i < 4; i++) {
      await pedir(page, 'Agéndame una llamada mañana a las 9');
      const tarjeta = page.getByRole('article', { name: 'Para confirmar' }).last();
      await tarjeta.getByRole('button', { name: 'Descartar' }).click();
      await expect(page.getByRole('separator')).toHaveCount(i + 1);
    }
    await expect(page.getByRole('separator').first()).toHaveAccessibleName(/^[A-ZÁÉÍÓÚ][a-záéíóú]+ \d+, \d{2}:\d{2} · Se descartó «Llamada»$/);

    await page.reload();
    await expect(page.getByRole('heading', { name: '¿Qué hacemos?' })).toHaveCount(0);
    await expect(page.getByRole('separator')).toHaveCount(3);
    await page.getByRole('button', { name: 'Ver anteriores' }).click();
    await expect(page.getByRole('separator')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Ver anteriores' })).toHaveCount(0);
    // R-40: la interfaz no se nombra a sí misma
    await expect(page.getByText(/episodio|transcripci[oó]n|turno/i)).toHaveCount(0);
  });

  test('«Ver anteriores» sigue a la vista arriba aunque se haya desplazado la conversación', async ({ page }) => {
    await entrar(page, cuentas.historialLargo.correo);
    for (let i = 0; i < 4; i++) {
      await pedir(page, 'Agéndame una llamada mañana a las 9');
      await page.getByRole('article', { name: 'Para confirmar' }).last().getByRole('button', { name: 'Descartar' }).click();
      await expect(page.getByRole('separator')).toHaveCount(i + 1);
    }
    await page.reload();
    const boton = page.getByRole('button', { name: 'Ver anteriores' });
    const zona = page.locator('.conversacion__contenido');
    await expect(page.getByRole('separator')).toHaveCount(3);
    // Hay más de lo que cabe: se abre al final, y el botón se ve igual
    expect(await zona.evaluate((el) => el.scrollHeight > el.clientHeight + 200)).toBe(true);
    await expect(boton).toBeInViewport();
    await zona.evaluate((el) => el.scrollTo({ top: el.scrollHeight / 2 }));
    await expect(boton).toBeInViewport();

    await boton.click();
    await expect(page.getByRole('separator')).toHaveCount(4);
    await expect(boton).toHaveCount(0);
  });

  // T-050: registrar una tarea cierra como cualquier registro; «Tarea guardada» ya no se produce
  test('confirmar una tarea deja la línea «Se registró», con su texto', async ({ page }) => {
    await entrar(page, cuentas.asistenteEspera.correo);
    await pedir(page, 'Recuérdame comprar pan');
    await page.getByRole('article', { name: 'Para confirmar' }).getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('separator', { name: /· Se registró «Comprar pan»$/ })).toBeVisible();
  });
});


test.describe('web.en-espera-visible', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('lo que está en espera se ve en una franja encima de la agenda de hoy, con lo pedido y el motivo, sin retirar (REQ-CAP-25)', async ({ page }) => {
    await entrar(page, cuentas.enEspera.correo);
    const lienzo = page.getByRole('main');
    // Sin nada en espera, no hay franja
    await expect(lienzo.getByRole('region', { name: 'En espera' })).toHaveCount(0);

    // T-050: sin el calendario conectado (la cuenta enEspera no lo tiene), un compromiso queda en espera
    await pedir(page, 'Agéndame una llamada mañana a las 9');
    const franja = lienzo.getByRole('region', { name: 'En espera' });
    const resumen = franja.getByRole('button', { name: /^1 cosa en espera/ });
    await expect(resumen).toBeVisible();
    await expect(resumen).toHaveAttribute('aria-expanded', 'false');

    await pedir(page, 'Agéndame una reunión con Vasco el viernes a las 10');
    await expect(franja.getByRole('button', { name: /^2 cosas en espera/ })).toBeVisible();

    // Sigue ahí al recargar, y al abrirla dice qué se pidió y por qué espera
    await page.reload();
    await franja.getByRole('button', { name: /^2 cosas en espera/ }).click();
    const cosas = franja.getByRole('listitem');
    await expect(cosas).toHaveCount(2);
    await expect(cosas.locator('.en-espera__pedido')).toHaveText(['«Agéndame una reunión con Vasco el viernes a las 10»', '«Agéndame una llamada mañana a las 9»']);
    await expect(cosas.first().locator('.en-espera__motivo')).toHaveText('Falta el permiso de tu calendario de Google. Se retoma cuando lo conectes.');
    // Retirar sigue siendo una decisión abierta: la lista no tiene botones
    await expect(franja.getByRole('list').getByRole('button')).toHaveCount(0);
    // R-40: la interfaz no se nombra a sí misma
    await expect(franja.getByText(/episodio|transcripci[oó]n|turno|operaci[oó]n/i)).toHaveCount(0);

    // Solo encima de la agenda de hoy
    await page.getByRole('tab', { name: 'Semana' }).click();
    await expect(page.getByRole('tab', { name: 'Semana' })).toHaveAttribute('aria-selected', 'true');
    await expect(franja).toHaveCount(0);
  });
});
