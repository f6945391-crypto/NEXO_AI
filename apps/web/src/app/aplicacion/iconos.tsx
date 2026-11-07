// Marcadores de posición geométricos, declarados como tales (design/ARQUITECTURA-VISUAL-WEB.md §7).
// Se sustituyen por el juego de iconos real sin tocar la navegación.

const comunes = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true } as const;

export const IconoAgenda = () => (
  <svg {...comunes}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </svg>
);

export const IconoTareas = () => (
  <svg {...comunes}>
    <path d="M9 7h11M9 12h11M9 17h11" />
    <path d="M4 7l1 1 2-2M4 12l1 1 2-2M4 17l1 1 2-2" />
  </svg>
);

export const IconoActividad = () => (
  <svg {...comunes}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const IconoAjustes = () => (
  <svg {...comunes}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </svg>
);

export const IconoExpandir = () => (
  <svg {...comunes}>
    <path d="M15 4h5v5M9 20H4v-5M20 4l-7 7M4 20l7-7" />
  </svg>
);

export const IconoContraer = () => (
  <svg {...comunes}>
    <path d="M14 10h6M14 10V4M10 14H4M10 14v6M20 4l-6 6M4 20l6-6" />
  </svg>
);

export const IconoEnviar = () => (
  <svg {...comunes}>
    <path d="M4 12l16-8-6 16-2-7-8-1z" />
  </svg>
);

export const IconoCerrar = () => (
  <svg {...comunes}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// T-044: pasar al período anterior o al siguiente en Semana y Mes
export const IconoAnterior = () => (
  <svg {...comunes}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconoSiguiente = () => (
  <svg {...comunes}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
