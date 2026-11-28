import { expect, test, type Browser, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-062 · REQ-ADM-05, REQ-ADM-08 a 16 (interfaz) · specs/08-administracion/plan.md §7, contra la API real.
// T-067 · REQ-ADM-28 a 32 (interfaz): equipos. T-147 · H-ADM-35: «Perfil» en Personas.

const aviso = (page: Page) => page.locator('p.error[role="alert"]');

async function entrarEnZona(page: Page, correo: string, contrasena = cuentas.contrasenaTemporal) {
  await page.goto('/administracion/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(contrasena);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

const fila = (page: Page, correo: string) => page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: correo, exact: true }) });

async function pedir(page: Page, correo: string, accion: string) {
  await page.getByRole('button', { name: `Acciones para ${correo}` }).click();
  await page.getByRole('menuitem', { name: accion }).click();
}

test.describe('web.administracion-solo-para-administradores', () => {
  test('una cuenta personal no entra en la zona y ve el mismo mensaje que con credenciales inválidas', async ({ page }) => {
    await entrarEnZona(page, cuentas.personalSinEmpresa.correo, 'no-es-la-contrasena');
    const invalidas = await aviso(page).textContent();
    await entrarEnZona(page, cuentas.personalSinEmpresa.correo);
    await expect(aviso(page)).toHaveText(invalidas ?? '');
    await expect(page).toHaveURL(/\/administracion\/entrar$/);

    // Sin la sesión de la zona, la zona manda a su entrada
    await page.goto('/administracion');
    await expect(page).toHaveURL(/\/administracion\/entrar$/);
  });

  test('un responsable que no administra entra solo a Equipos, sin Personas ni Registro', async ({ page }) => {
    await entrarEnZona(page, cuentas.acmeResponsable.correo);
    await expect(page).toHaveURL(/\/administracion\/equipos$/);
    const navegacion = page.getByRole('navigation', { name: 'Administración' });
    await expect(navegacion.getByRole('link', { name: 'Equipos' })).toBeVisible();
    await expect(navegacion.getByRole('link', { name: 'Personas' })).toHaveCount(0);
    await expect(navegacion.getByRole('link', { name: 'Registro' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Ventas' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Soporte' })).toHaveCount(0);
    // Solo lectura: ninguna acción en el lienzo (plan §7.2)
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);
    await page.goto('/administracion');
    await expect(page).toHaveURL(/\/administracion\/equipos$/);
  });

  // REQ-ADM-05 · plan §7.1: la entrada desde la aplicación, al pie de la navegación y encima de Ajustes
  async function entrarEnLaAplicacion(page: Page, correo: string) {
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
  }

  test('la administradora ve «Administración» encima de Ajustes, y abre la entrada de la zona en otra pestaña', async ({ page }) => {
    await entrarEnLaAplicacion(page, cuentas.administradora.correo);
    const navegacion = page.getByRole('navigation', { name: 'Secciones' });
    const entrada = navegacion.getByRole('link', { name: 'Administración' });
    await expect(entrada).toBeVisible();
    await expect(entrada).toHaveAttribute('title', 'Administración');
    await expect(entrada).toHaveAttribute('target', '_blank');
    await expect(entrada).toHaveAttribute('rel', 'noopener');
    const [arriba, abajo] = await Promise.all([entrada.boundingBox(), navegacion.getByRole('button', { name: 'Ajustes' }).boundingBox()]);
    expect(arriba!.y).toBeLessThan(abajo!.y);

    // Otra pestaña, sin la sesión de la aplicación: pide entrar en la zona
    const [pestana] = await Promise.all([page.context().waitForEvent('page'), entrada.click()]);
    await expect(pestana).toHaveURL(/\/administracion\/entrar$/);
    await expect(pestana.getByLabel('Correo')).toBeVisible();
    await pestana.close();
  });

  test('una cuenta personal sin empresa no ve «Administración» en la navegación', async ({ page }) => {
    await entrarEnLaAplicacion(page, cuentas.personalSinEmpresa.correo);
    const navegacion = page.getByRole('navigation', { name: 'Secciones' });
    await expect(navegacion.getByRole('button', { name: 'Ajustes' })).toBeVisible();
    await expect(navegacion.getByRole('link', { name: 'Administración' })).toHaveCount(0);
  });
});

test.describe('web.administracion-cuentas', () => {
  // Una sola sesión para todo el recorrido: la entrada admite cinco intentos por minuto y correo
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  // web.administracion-personas (T-147, ajustada): «Perfil» siempre escrito, los administradores primero y el resumen
  test('la administradora entra y ve las personas de su organización', async () => {
    await entrarEnZona(page, cuentas.administradora.correo);
    await expect(page).toHaveURL(/\/administracion$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Personas' })).toBeVisible();
    await expect(page.getByText('1 administrador · 3 miembros', { exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Perfil' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Administra' })).toHaveCount(0);
    await expect(page.getByRole('row').nth(1).getByRole('rowheader')).toHaveText(cuentas.administradora.correo);
    await expect(fila(page, cuentas.administradora.correo)).toContainText('Administrador');
    for (const cuenta of [cuentas.acmeResponsable, cuentas.acmeSuspender, cuentas.acmeRestablecer]) await expect(fila(page, cuenta.correo)).toContainText('Miembro');
    await expect(fila(page, cuentas.acmeResponsable.correo).getByRole('listitem').filter({ hasText: 'Ventas' })).toContainText('Responsable');
    await expect(fila(page, cuentas.acmeRestablecer.correo)).not.toContainText('Responsable');
    await expect(fila(page, cuentas.acmeSuspender.correo)).toContainText('De la organización');
    // Nadie de otra organización
    await expect(fila(page, cuentas.personalSinEmpresa.correo)).toHaveCount(0);
  });

  test('da de alta una cuenta y ve su contraseña temporal una sola vez', async () => {
    await page.goto('/administracion');
    await page.getByRole('button', { name: 'Dar de alta' }).click();
    await page.getByLabel('Correo').fill('nueva-e2e@acme.test');
    await page.getByRole('button', { name: 'Revisar' }).click();

    const tarjeta = page.getByRole('dialog', { name: 'Dar de alta una cuenta de la organización' });
    await expect(tarjeta).toContainText('nueva-e2e@acme.test');
    await expect(tarjeta).toContainText('La contraseña temporal se muestra una sola vez');
    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();

    const temporal = page.getByRole('dialog', { name: 'Contraseña temporal' });
    const contrasena = (await temporal.getByLabel('Contraseña temporal').textContent()) ?? '';
    expect(contrasena).toHaveLength(16);
    await expect(temporal.getByRole('button', { name: 'Copiar' })).toBeVisible();
    await temporal.getByRole('button', { name: 'Listo' }).click();

    await expect(fila(page, 'nueva-e2e@acme.test')).toContainText('Aún no entró');
    await page.reload();
    await expect(page.getByText(contrasena)).toHaveCount(0);
  });

  test('suspende una cuenta desde su tarjeta de confirmación y la reactiva', async () => {
    await page.goto('/administracion');
    await pedir(page, cuentas.acmeSuspender.correo, 'Suspender');
    const tarjeta = page.getByRole('dialog', { name: 'Suspender una cuenta' });
    await expect(tarjeta).toContainText(cuentas.acmeSuspender.correo);
    await expect(tarjeta).toContainText('Se cierran sus sesiones abiertas');
    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    await expect(fila(page, cuentas.acmeSuspender.correo)).toContainText('Suspendida');

    await pedir(page, cuentas.acmeSuspender.correo, 'Reactivar');
    await page.getByRole('dialog', { name: 'Reactivar una cuenta' }).getByRole('button', { name: 'Confirmar' }).click();
    await expect(fila(page, cuentas.acmeSuspender.correo)).toContainText('Activa');
  });

  test('restablece una contraseña y la temporal se ve una vez', async () => {
    await page.goto('/administracion');
    await pedir(page, cuentas.acmeRestablecer.correo, 'Restablecer contraseña');
    const tarjeta = page.getByRole('dialog', { name: 'Restablecer la contraseña de una cuenta' });
    await expect(tarjeta).toContainText('La contraseña anterior deja de valer');
    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    const temporal = page.getByRole('dialog', { name: 'Contraseña temporal' });
    await expect(temporal).toContainText(cuentas.acmeRestablecer.correo);
    await temporal.getByRole('button', { name: 'Listo' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(fila(page, cuentas.acmeRestablecer.correo)).toContainText('Aún no entró');
  });

  test('la única administradora no puede dejar de serlo: la tarjeta lo explica y no deja confirmar', async () => {
    await page.goto('/administracion');
    await pedir(page, cuentas.administradora.correo, 'Dejar de administrar');
    const tarjeta = page.getByRole('dialog', { name: 'Dejar de ser administrador de la organización' });
    await expect(tarjeta).toContainText('nombra a otra persona administradora');
    await expect(tarjeta.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    await tarjeta.getByRole('button', { name: 'Entendido' }).click();
  });

  test('ve los equipos, con «Sin responsable» destacado, y el registro de lo hecho', async () => {
    await page.goto('/administracion');
    await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: 'Equipos' }).click();
    const ventas = page.getByRole('article', { name: 'Ventas' });
    await expect(ventas).toContainText(cuentas.acmeResponsable.correo);
    await expect(ventas).toContainText(cuentas.acmeSuspender.correo);
    await expect(page.getByRole('article', { name: 'Soporte' }).getByText('Sin responsable')).toBeVisible();

    await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: 'Registro' }).click();
    const registro = page.getByRole('list', { name: 'Registro' });
    await expect(registro.getByRole('listitem').first()).toContainText('Restablecer la contraseña de una cuenta');
    await expect(registro).toContainText('Dar de alta una cuenta de la organización');
  });

  test('salir de la zona no cierra la sesión de la aplicación', async () => {
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(cuentas.administradora.correo);
    await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();

    // La sesión de la zona sigue abierta en el mismo navegador
    await page.goto('/administracion');
    await page.getByRole('button', { name: 'Salir de Administración' }).click();
    await expect(page).toHaveURL(/\/administracion\/entrar$/);
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
  });
});

// T-067 · REQ-ADM-28 a 31. Sobre un equipo nuevo, para no cambiar «Ventas» ni «Soporte», que leen otras pruebas.
test.describe('web.administracion-equipos', () => {
  test('la administradora crea «Marketing», suma a dos personas, nombra responsable a una y la quita', async ({ page }) => {
    await entrarEnZona(page, cuentas.administradora.correo);
    await expect(page).toHaveURL(/\/administracion$/);
    await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: 'Equipos' }).click();
    await expect(page).toHaveURL(/\/administracion\/equipos$/);

    // Crear
    await page.getByRole('button', { name: 'Crear equipo' }).click();
    await page.getByLabel('Nombre del equipo').fill('Marketing');
    await page.getByRole('button', { name: 'Revisar' }).click();
    const crear = page.getByRole('dialog', { name: 'Crear un equipo' });
    await expect(crear).toContainText('Marketing');
    await crear.getByRole('button', { name: 'Confirmar' }).click();
    const marketing = page.getByRole('article', { name: 'Marketing' });
    await expect(marketing.getByText('Sin responsable')).toBeVisible();

    // El nombre repetido no se puede confirmar
    await page.getByRole('button', { name: 'Crear equipo' }).click();
    await page.getByLabel('Nombre del equipo').fill('ventas');
    await page.getByRole('button', { name: 'Revisar' }).click();
    const repetido = page.getByRole('dialog', { name: 'Crear un equipo' });
    await expect(repetido).toContainText('Ya hay un equipo «Ventas» en la organización');
    await expect(repetido.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    await repetido.getByRole('button', { name: 'Entendido' }).click();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Añadir a dos personas
    for (const cuenta of [cuentas.acmeSuspender, cuentas.acmeRestablecer]) {
      await marketing.getByLabel('Persona para añadir a Marketing').selectOption({ label: cuenta.correo });
      await marketing.getByRole('button', { name: 'Añadir a Marketing' }).click();
      const anadir = page.getByRole('dialog', { name: 'Añadir a alguien a un equipo' });
      await expect(anadir).toContainText(cuenta.correo);
      await anadir.getByRole('button', { name: 'Confirmar' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(marketing.getByRole('listitem').filter({ hasText: cuenta.correo })).toBeVisible();
    }

    // Nombrar responsable
    await marketing.getByRole('button', { name: `Nombrar a ${cuentas.acmeSuspender.correo} responsable de Marketing` }).click();
    const nombrar = page.getByRole('dialog', { name: 'Nombrar responsable de un equipo' });
    await expect(nombrar).toContainText('Nadie');
    await nombrar.getByRole('button', { name: 'Confirmar' }).click();
    await expect(marketing.getByText('Sin responsable')).toHaveCount(0);

    // Quitarla: el equipo queda sin responsable, a la vista
    await marketing.getByRole('button', { name: `Quitar a ${cuentas.acmeSuspender.correo} de Marketing` }).click();
    const quitar = page.getByRole('dialog', { name: 'Quitar a alguien de un equipo' });
    await expect(quitar).toContainText('el equipo queda sin responsable');
    await expect(quitar).toContainText('tendrá que autorizar otra vez');
    await quitar.getByRole('button', { name: 'Confirmar' }).click();
    await expect(marketing.getByText('Sin responsable')).toBeVisible();
    await expect(marketing.getByRole('listitem').filter({ hasText: cuentas.acmeSuspender.correo })).toHaveCount(0);
    await expect(marketing.getByRole('listitem').filter({ hasText: cuentas.acmeRestablecer.correo })).toBeVisible();

    // Personas lo refleja
    await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: 'Personas' }).click();
    await expect(fila(page, cuentas.acmeRestablecer.correo)).toContainText('Marketing');
    await expect(fila(page, cuentas.acmeSuspender.correo)).not.toContainText('Marketing');
  });
});
