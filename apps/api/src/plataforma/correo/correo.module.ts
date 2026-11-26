import { Global, Module } from '@nestjs/common';
import { CorreoSimulado } from './correo-simulado';
import { CorreoSmtp } from './correo-smtp';
import { ENVIADOR_CORREO, type EnviadorCorreo } from './enviador-correo';

// T-122 · PT-3 · plan §5.8. CORREO_PROVEEDOR: `simulado` (por defecto) o `smtp`, con CORREO_SMTP_URL y
// CORREO_REMITENTE. En producción, el simulado no se admite, como el modelo y el calendario simulados.
export function crearEnviadorCorreo(entorno: NodeJS.ProcessEnv = process.env): EnviadorCorreo {
  const elegido = entorno.CORREO_PROVEEDOR?.trim() || 'simulado';
  if (elegido === 'simulado') {
    if (entorno.NODE_ENV === 'production') throw new Error('CORREO_PROVEEDOR=simulado no se admite en producción');
    return new CorreoSimulado(entorno.CORREO_SIMULADO_ARCHIVO?.trim() || undefined);
  }
  if (elegido === 'smtp') {
    const url = entorno.CORREO_SMTP_URL?.trim();
    const remitente = entorno.CORREO_REMITENTE?.trim();
    if (!url || !remitente) throw new Error('CORREO_PROVEEDOR=smtp necesita CORREO_SMTP_URL y CORREO_REMITENTE. Ver .env.example');
    return new CorreoSmtp(url, remitente);
  }
  throw new Error(`CORREO_PROVEEDOR desconocido: ${elegido}. Ver .env.example`);
}

@Global()
@Module({
  providers: [{ provide: ENVIADOR_CORREO, useFactory: () => crearEnviadorCorreo() }],
  exports: [ENVIADOR_CORREO],
})
export class CorreoModule {}
