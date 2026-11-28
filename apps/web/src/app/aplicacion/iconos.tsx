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

// T-062 · REQ-ADM-05: la zona de empresa, al pie de la navegación
export const IconoAdministracion = () => (
  <svg {...comunes}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4" />
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

// T-155 · REQ-CAP-27: dictar en la barra de la conversación, y detener la grabación
export const IconoMicrofono = () => (
  <svg {...comunes}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
  </svg>
);

export const IconoDetener = () => (
  <svg {...comunes}>
    <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" />
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

export const IconoEquipo = () => (
  <svg {...comunes}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
    <circle cx="17" cy="9" r="2" />
    <path d="M17 15a4 4 0 0 1 4 4v1" />
  </svg>
);
