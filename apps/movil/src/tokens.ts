// Tokens de design/tokens.json (modo claro), los mismos que usa la web.
export const color = {
  marca: { base: '#2166B0', fuerte: '#17497E', suave: '#E8F1FA' },
  superficie: { base: '#FFFFFF', elevada: '#F7FAFC', hundida: '#EDF2F6' },
  texto: { fuerte: '#14212E', suave: '#5A6E7A', inverso: '#FFFFFF' },
  borde: { base: '#DCE6EC', fuerte: '#B8C9D4' },
  agente: { base: '#6B4FD8', suave: '#F0ECFD' },
} as const;

export const espaciado = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 } as const;

export const tipografia = { titulo: 28, subtitulo: 22, cuerpo: 16, etiqueta: 14, micro: 12 } as const;
