// T-122 · PT-3 · specs/06-acceso/plan.md §5.8. Única vía para que la plataforma envíe un correo, como
// `ProveedorModelo` para el modelo (P-06). El correo de la persona (`gmail.send`, P-08) no pasa por aquí: este
// es el remitente de NexoAI (DP-03).

export const ENVIADOR_CORREO = Symbol('ENVIADOR_CORREO');

export interface CorreoSaliente {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
}

export interface EnviadorCorreo {
  enviar(correo: CorreoSaliente): Promise<void>;
}
