import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CorreoSaliente, EnviadorCorreo } from './enviador-correo';

// T-122. En memoria, para las pruebas: nunca sale a internet. Con `archivo` además añade cada correo, una línea
// JSON, a ese archivo: así las pruebas de extremo a extremo leen el enlace sin un buzón (plan §5.8).
export class CorreoSimulado implements EnviadorCorreo {
  readonly enviados: (CorreoSaliente & { en: string })[] = [];

  constructor(private readonly archivo?: string) {
    if (archivo) mkdirSync(dirname(archivo), { recursive: true });
  }

  async enviar(correo: CorreoSaliente): Promise<void> {
    const registro = { ...correo, en: new Date().toISOString() };
    this.enviados.push(registro);
    if (this.archivo) appendFileSync(this.archivo, `${JSON.stringify(registro)}\n`, 'utf8');
  }

  reiniciar(): void {
    this.enviados.length = 0;
  }
}
