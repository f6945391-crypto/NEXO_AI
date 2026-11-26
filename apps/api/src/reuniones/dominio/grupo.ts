// specs/10-reuniones/plan.md §4 · T-131 · REQ-CUN06-02 · D-REU-17, D-REU-18. Reconocer un equipo por su
// nombre y una persona por su correo. Lo decide el código, no el modelo (P-02).

// Sin mayúsculas, tildes ni signos; las palabras separadas por un espacio
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@]+/g, ' ')
    .trim();
}

const SIN_PALABRA = /^(el |la )?(equipo|proyecto) /;

// D-REU-17: «el proyecto Alfa», «equipo Proyecto Alfa» y «proyecto alfa» encajan con «Proyecto Alfa».
// Primero el nombre exacto; si no hay, sin la palabra «equipo» o «proyecto»; si tampoco, el que lo contiene.
export function equiposQueEncajan<T extends { nombre: string }>(pedido: string, equipos: T[]): T[] {
  const p = normalizar(pedido);
  const variantes = [p, p.replace(SIN_PALABRA, ''), p.replace(/^(el |la )/, '')].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const v of variantes) {
    const exactos = equipos.filter((e) => normalizar(e.nombre) === v || normalizar(e.nombre).replace(SIN_PALABRA, '') === v);
    if (exactos.length > 0) return exactos;
  }
  const corto = p.replace(SIN_PALABRA, '');
  return equipos.filter((e) => normalizar(e.nombre).includes(corto));
}

// Lo de antes de la arroba, con sus partes: «ana.perez@» → «ana perez»
export function nombreDeCorreo(correo: string): string {
  return normalizar(correo.split('@')[0] ?? correo);
}

// «Ana Perez» para mostrar, a partir del correo (D-REU-18: el perfil no tiene nombre visible)
export function nombreVisible(correo: string): string {
  return nombreDeCorreo(correo)
    .split(' ')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

// D-REU-18: «Ana» encaja con ana.perez@ y con ana@; «Ana Pérez», con ana.perez@; el correo entero, consigo
export function personaEncaja(pedido: string, correo: string): boolean {
  const p = normalizar(pedido);
  if (!p) return false;
  if (p === normalizar(correo)) return true;
  const palabras = p.split(' ');
  const partes = nombreDeCorreo(correo).split(' ');
  return palabras.every((palabra, i) => partes[i] === palabra);
}
