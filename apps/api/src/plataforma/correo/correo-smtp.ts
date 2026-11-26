import nodemailer, { type Transporter } from 'nodemailer';
import type { CorreoSaliente, EnviadorCorreo } from './enviador-correo';

// T-122 · plan §5.8. Por SMTP: Mailpit en desarrollo (`smtp://localhost:1025`) y Resend en producción
// (`smtps://resend:<clave>@smtp.resend.com:465`). Es el único archivo que importa `nodemailer`
// (prueba `plataforma.correo-solo-por-el-puerto`). La URL lleva la clave: nunca se escribe en un registro.
export class CorreoSmtp implements EnviadorCorreo {
  private readonly transporte: Transporter;

  constructor(url: string, private readonly remitente: string) {
    this.transporte = nodemailer.createTransport(url);
  }

  async enviar(correo: CorreoSaliente): Promise<void> {
    await this.transporte.sendMail({
      from: this.remitente,
      to: correo.para,
      subject: correo.asunto,
      text: correo.texto,
      ...(correo.html ? { html: correo.html } : {}),
    });
  }
}
