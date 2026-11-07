// Tokens de design/tokens.json (modo claro), los mismos que usa la web.
export const color = {
  marca: { base: '#2166B0', fuerte: '#17497E', suave: '#E8F1FA' },
  superficie: { base: '#FFFFFF', elevada: '#F7FAFC', hundida: '#EDF2F6' },
  texto: { fuerte: '#14212E', suave: '#5A6E7A', inverso: '#FFFFFF' },
  borde: { base: '#DCE6EC', fuerte: '#B8C9D4' },
  agente: { base: '#6B4FD8', suave: '#F0ECFD' },
  estado: { error: '#B3261E', exito: '#1B7F4B', advertencia: '#9A6400' },
  // H-CAP-03 (7 de noviembre de 2026): el velo bajo la capa de captura, con `texto.fuerte` de base. Más opaco
  // que el de las hojas para que la cabecera de la sección no se lea a través. No está aún en design/tokens.json
  velo: { capa: 'rgba(20, 33, 46, 0.72)' },
} as const;

export const espaciado = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 } as const;

export const tipografia = { titulo: 28, subtitulo: 22, cuerpo: 16, etiqueta: 14, micro: 12 } as const;
