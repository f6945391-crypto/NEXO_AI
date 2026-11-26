import { parseArgs } from 'node:util';
import { correoDeRestablecimiento } from '../identidad/restablecimiento.service';
import { crearEnviadorCorreo } from '../plataforma/correo/correo.module';
import { cargarEntorno } from '../plataforma/entorno';

// T-122 · PT-3 · specs/06-acceso/plan.md §5.8. Manda un correo de prueba con la configuración del .env:
//   pnpm --filter @nexoai/api probar-correo --para <correo> [--restablecer]
// Con --restablecer manda el correo de restablecer la contraseña, con un enlace que no sirve.
// Con Mailpit se ve en http://localhost:8025; con Resend llega de verdad.
async function principal(): Promise<void> {
  cargarEntorno();
  const { values: args } = parseArgs({ options: { para: { type: 'string' }, restablecer: { type: 'boolean' } } });
  if (!args.para) throw new Error('Indica --para <correo>');
  const proveedor = process.env.CORREO_PROVEEDOR?.trim() || 'simulado';
  const destino = (process.env.CORREO_SMTP_URL ?? '').replace(/\/\/[^@]*@/, '//***@');
  const base = (process.env.WEB_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
  const mensaje = args.restablecer
    ? correoDeRestablecimiento(args.para, `${base}/restablecer?token=enlace-de-prueba-que-no-sirve`)
    : { asunto: 'Prueba de correo de NexoAI', texto: 'Si lees esto, el correo de la plataforma funciona.' };
  await crearEnviadorCorreo(process.env).enviar({ para: args.para, ...mensaje });
  console.log(`Enviado a ${args.para} con ${proveedor}${destino ? ` (${destino})` : ''}: «${mensaje.asunto}»`);
}

principal().catch((error: unknown) => {
  // El mensaje de nodemailer puede citar la URL; la clave nunca se imprime
  console.error((error instanceof Error ? error.message : String(error)).replace(/re_[A-Za-z0-9_]+/g, 're_***'));
  process.exitCode = 1;
});
