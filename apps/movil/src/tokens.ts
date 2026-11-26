// Tokens de design/tokens.json (modo claro), los mismos que usa la web.
export const color = {
  marca: { base: '#2166B0', fuerte: '#17497E', suave: '#E8F1FA' },
  superficie: { base: '#FFFFFF', elevada: '#F7FAFC', hundida: '#EDF2F6' },
  texto: { fuerte: '#14212E', suave: '#5A6E7A', inverso: '#FFFFFF' },
  borde: { base: '#DCE6EC', fuerte: '#B8C9D4' },
  agente: { base: '#6B4FD8', suave: '#F0ECFD' },
  estado: { error: '#B3261E', exito: '#1B7F4B', advertencia: '#9A6400' },
  // Tintes de los bloques de estado de la capa de captura: lo hecho y lo que quedó en espera
  tinte: { exito: '#E6F4EC', espera: '#FDF3E0', esperaTexto: '#7A4F00' },
  // H-CAP-03 (7 de noviembre de 2026): el velo bajo la capa de captura, con `texto.fuerte` de base. Valor
  // provisional, más opaco que el de las hojas; la capa ya tapa la cabecera de la sección. No está aún en
  // design/tokens.json
  velo: { capa: 'rgba(20, 33, 46, 0.48)' },
} as const;

export const espaciado = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 } as const;

export const tipografia = { titulo: 28, subtitulo: 22, cuerpo: 16, etiqueta: 14, micro: 12 } as const;
