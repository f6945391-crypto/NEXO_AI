// specs/07-agente/spec.md REQ-AGT-06 · decisión 30 · T-142. Lo que escribe el modelo se limpia en el código antes
// de guardarse en la transcripción: la web y el móvil muestran el texto tal cual, sin interpretar Markdown, y las
// instrucciones solas no bastan (P-02). Quita las marcas de formato, los nombres internos (de herramientas y de
// sus campos, los ids) y deja cada punto de una enumeración en su propia línea. No resume ni corta: lo que se
// dice sigue igual, sin lo que no se lee.

// Los nombres que la persona nunca debe ver. Salen del registro de herramientas (EjecutorHerramientas), no de una
// lista escrita a mano
export interface NombresInternos {
  // `tareas.registrar` y `tareas_registrar`
  herramientas: readonly string[];
  // Los campos de sus argumentos que no son palabras: `deQuien`, `horaLimite`, `tareaId`
  campos: readonly string[];
}

// Las franjas de Tareas por su id interno: se dicen como en la pantalla, en minúscula
const FRANJAS: Readonly<Record<string, string>> = { con_fecha: 'con fecha', sin_fecha: 'sin fecha' };

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Un campo es interno si no es una palabra: lleva una mayúscula por dentro o un guion bajo
export const esNombreInterno = (nombre: string) => /[a-z][A-Z]/.test(nombre) || nombre.includes('_');

function quitarFormato(texto: string): string {
  return (
    texto
      .replace(/\r\n?/g, '\n')
      // Bloques de código: solo las vallas
      .replace(/^\s*```[^\n]*$/gm, '')
      // Encabezados y citas
      .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')
      .replace(/^[ \t]*>[ \t]?/gm, '')
      // Enlaces: el texto, sin la dirección
      .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, '$1')
      // Negrita y cursiva
      .replace(/\*\*|__/g, '')
      // Viñetas con asterisco o más: un guion
      .replace(/^([ \t]*)[*+•][ \t]+/gm, '$1- ')
      .replace(/(^|[^\p{L}\p{N}])[*_]([^*_\n]+?)[*_](?=$|[^\p{L}\p{N}])/gmu, '$1$2')
      .replace(/\*/g, '')
      .replace(/`/g, '')
  );
}

function quitarNombres(texto: string, nombres: NombresInternos): string {
  let limpio = texto.replace(UUID, '');
  for (const [id, nombre] of Object.entries(FRANJAS)) limpio = limpio.replace(new RegExp(`\\b${id}\\b`, 'g'), nombre);
  // Los más largos primero, para que `tareas_anotar_avance` no deje «_avance»
  const herramientas = [...new Set(nombres.herramientas)].sort((a, b) => b.length - a.length).map(escapar);
  const campos = [...new Set(nombres.campos.filter(esNombreInterno))].sort((a, b) => b.length - a.length).map(escapar);
  if (herramientas.length > 0) {
    const h = `(?:${herramientas.join('|')})`;
    // «(tareas_reabrir, tareas_descartar)»: el paréntesis entero
    limpio = limpio.replace(new RegExp(`[ \\t]*\\(\\s*${h}(?:\\s*(?:,|y|o)\\s*${h})*\\s*\\)`, 'g'), '');
    // «con tareas_registrar», «usa tareas_cambiar», «la herramienta tareas_bitacora»: con su enlace
    limpio = limpio.replace(
      new RegExp(`\\b(?:con|usa|usas|usar|usando|mediante|llama a|llamas a|a través de)?[ \\t]*(?:la herramienta|la función|el comando)?[ \\t]*${h}\\b`, 'gi'),
      '',
    );
  }
  if (campos.length > 0) limpio = limpio.replace(new RegExp(`\\b(?:${campos.join('|')})\\b`, 'g'), '');
  return limpio;
}

// «Así funciona: 1. Registrar… 2. Ver…» en un solo párrafo: cada punto a su línea. Solo si los números forman la
// secuencia 1, 2, 3…, para no partir «a las 3. Luego»
function separarPuntos(texto: string): string {
  const marca = /(^|[ \t])(\d{1,2})[.)][ \t]+(?=\S)/gm;
  const posiciones: { indice: number; numero: number }[] = [];
  for (const m of texto.matchAll(marca)) posiciones.push({ indice: m.index! + m[1]!.length, numero: Number(m[2]) });
  const cortes: number[] = [];
  let esperado = 1;
  for (const p of posiciones) {
    if (p.numero === esperado) {
      cortes.push(p.indice);
      esperado += 1;
    } else if (p.numero === 1) {
      // Otra enumeración que empieza
      cortes.push(p.indice);
      esperado = 2;
    }
  }
  if (cortes.length < 2) return texto;
  let resultado = texto;
  for (const indice of cortes.reverse()) {
    const antes = resultado.slice(0, indice);
    if (antes === '' || antes.endsWith('\n')) continue;
    resultado = `${antes.replace(/[ \t]+$/, '')}\n${resultado.slice(indice)}`;
  }
  return resultado;
}

function ordenar(texto: string): string {
  return (
    texto
      .split('\n')
      .map((linea) =>
        linea
          .replace(/[ \t]{2,}/g, ' ')
          // Lo que dejó un nombre quitado: « .», « ,», «( )», «, .»
          .replace(/\(\s*\)/g, '')
          .replace(/[ \t]+([.,;:!?)])/g, '$1')
          .replace(/([(¿¡])[ \t]+/g, '$1')
          .replace(/,(\s*[.;:])/g, '$1')
          .replace(/([:;])\s*,/g, '$1')
          .replace(/:\s*\./g, '.')
          .trim(),
      )
      .map((linea) => {
        // La primera letra de una línea, o de un punto, en mayúscula si quedó en minúscula al quitar «Con …»
        const m = /^((?:\d{1,2}[.)]|-)\s+)?(\p{Ll})/u.exec(linea);
        return m ? `${m[1] ?? ''}${m[2]!.toUpperCase()}${linea.slice(m[0].length)}` : linea;
      })
      .join('\n')
      // Como mucho una línea en blanco seguida
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

// T-149 · REQ-AGT-08 · decisión 35. Una respuesta degenerada (el modelo entra en bucle y repite «...», «Sorry»)
// no se muestra: se dice este texto fijo. Se mira el texto ya limpio. Cifras provisionales
export const RESPUESTA_DEGENERADA = 'No pude armar bien la respuesta. ¿Me lo repites con otras palabras?';
const LARGO_DEGENERADO = 2500;
const REPETICIONES_DEGENERADAS = 4;
const LINEAS_PARA_MIRAR = 8;

export function esDegenerada(texto: string): boolean {
  if (texto.length > LARGO_DEGENERADO) return true;
  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  const veces = new Map<string, number>();
  for (const l of lineas) {
    if (!/\p{L}/u.test(l)) continue;
    const n = (veces.get(l) ?? 0) + 1;
    if (n >= REPETICIONES_DEGENERADAS) return true;
    veces.set(l, n);
  }
  if (lineas.length < LINEAS_PARA_MIRAR) return false;
  const sinPalabras = lineas.filter((l) => !/\p{L}{3}/u.test(l)).length;
  return sinPalabras * 2 >= lineas.length;
}

// T-148 · decisión 34: la negrita es la única marca que pasa. Mientras se limpia, cada par `**…**` (o `__…__`)
// de una línea y con texto dentro queda entre dos caracteres de control que ninguna otra regla toca; al final
// vuelve a ser `**…**`. Si al quitar un nombre interno la negrita queda vacía, desaparece.
const ABRE = '\u0001';
const CIERRA = '\u0002';
const NEGRITA = /(\*\*|__)(?=\S)([^\n*_]{1,120}?)(?<=\S)\1/g;

function protegerNegrita(texto: string): string {
  return texto.replace(/[\u0001\u0002]/g, '').replace(NEGRITA, (_, _marca, dentro: string) => `${ABRE}${dentro}${CIERRA}`);
}

function devolverNegrita(texto: string): string {
  return texto
    .replace(new RegExp(`${ABRE}\\s*${CIERRA}`, 'g'), '')
    .replace(new RegExp(`${ABRE}\\s*([^${CIERRA}]*?)\\s*${CIERRA}`, 'g'), (_, dentro: string) => `**${dentro}**`)
    .replace(/[\u0001\u0002]/g, '');
}

// T-153 · REQ-AGT-06: el modelo usa a veces espacios de Unicode (fino, sin separación, de cifra) que se ven como
// huecos raros: «10 :00», «1 de diciembre». Pasan a ser espacios normales, y una hora queda pegada
export function normalizarEspacios(texto: string): string {
  return texto
    .replace(/[  -   　]/g, ' ')
    .replace(/[​-‍⁠﻿]/g, '')
    .replace(/(\d) ?: ?(\d{2})\b/g, '$1:$2');
}

export function aTextoLlano(texto: string, nombres: NombresInternos = { herramientas: [], campos: [] }): string {
  return devolverNegrita(ordenar(separarPuntos(quitarNombres(quitarFormato(protegerNegrita(normalizarEspacios(texto))), nombres))));
}
