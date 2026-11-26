// 18 · Validación de la página «07 Móvil v2 · Estructura y recorrido»
// Se ejecuta con use_figma. Devuelve texto; no modifica nada.
//
// Las comprobaciones 4 y 5 existen porque el mismo defecto se coló CUATRO veces:
// un velo a opacidad 1 y una capa de captura sin sección debajo. Una nota en el
// README no lo impidió ninguna de las cuatro. Esto sí.

const page = figma.root.children.find(p => p.name.startsWith("07 Móvil v2"));
await figma.setCurrentPageAsync(page);
const cuadros = page.children.filter(n => n.type === "FRAME");
const fallos = [], avisos = [];
const F = (c, t) => fallos.push(c.name + " · " + t);

const VELO_ESPERADO = 0.16;
const ANCHO = 390, ALTO = 844;

for (const c of cuadros) {
  // 1 · convención de nombres
  if (!/^MOV-v2 \/ [^/]+ \/ \d{2} .+/.test(c.name)) F(c, "nombre fuera de la convención «MOV-v2 / Grupo / NN Nombre»");

  // 2 · medida del dispositivo
  if (Math.round(c.width) !== ANCHO || Math.round(c.height) !== ALTO) F(c, "no mide 390x844");

  // 3 · fondo blanco y pestañas siempre visibles
  const f0 = c.fills && c.fills[0];
  if (!f0 || !f0.boundVariables || !f0.boundVariables.color) F(c, "el fondo del cuadro no está atado a una variable");
  if (!c.findOne(n => n.type === "INSTANCE" && /Pestañas/.test(n.name))) F(c, "sin pestañas");

  // 4 · EL VELO  ── el defecto que se repitió cuatro veces
  for (const v of c.findAll(n => n.name === "Velo")) {
    const p = v.fills[0];
    const op = p && p.opacity !== undefined ? p.opacity : 1;
    if (Math.abs(op - VELO_ESPERADO) > 0.01) F(c, "velo a opacidad " + op.toFixed(2) + ", se espera " + VELO_ESPERADO);
    if (v.opacity !== 1) F(c, "el velo lleva opacidad en el nodo; va en la pintura");
    if (!p || !p.boundVariables || !p.boundVariables.color) F(c, "velo sin variable");
  }

  // 5 · TODA CAPA TIENE SECCIÓN DEBAJO ── la otra mitad del mismo defecto
  const capa = c.findOne(n => n.name === "Capa de captura");
  if (capa) {
    if (!c.findOne(n => n.name === "Velo")) F(c, "hay capa de captura pero no hay velo");
    const cont = c.findOne(n => n.name === "Contenido");
    if (!cont) F(c, "capa de captura sin «Contenido» debajo: el fondo está vacío");
    else if (cont.children.length < 2) F(c, "el «Contenido» de detrás tiene " + cont.children.length + " hijo: es relleno, no una sección real");
    const iVelo = c.children.findIndex(n => n.name === "Velo");
    const iCapa = c.children.findIndex(n => n.name === "Capa de captura");
    if (iVelo > iCapa) F(c, "el velo está por encima de la capa");
  }

  // 6 · color siempre por variable
  for (const n of c.findAll(n => n.fills && n.fills !== figma.mixed && n.fills.length)) {
    const p = n.fills[0];
    if (p.type === "SOLID" && (!p.boundVariables || !p.boundVariables.color) && n.name !== "Velo")
      F(c, "«" + n.name + "» tiene color sin variable");
  }

  // 7 · a lo ancho es fallo; a lo alto es scroll, y solo avisa si algo lo corta.
  //     El suelo es la barra de entrada cuando la hay, y si no las pestañas.
  const barra = c.findOne(n => n.type === "INSTANCE" && /Barra de entrada/.test(n.name));
  const SUELO = barra ? Math.round(barra.y) : 756;
  for (const n of c.children) {
    if (n.x < -1 || n.x + n.width > ANCHO + 1) F(c, "«" + n.name + "» se sale a lo ancho");
    if (!capa && /Cuerpo|Contenido/.test(n.name) && n.y + n.height > SUELO)
      avisos.push(c.name + " · el contenido acaba en y=" + Math.round(n.y + n.height) + ", lo corta el suelo (" + SUELO + ")");
  }
}

// inventario por grupo
const grupos = {};
for (const c of cuadros) {
  const g = (c.name.split(" / ")[1]) || "?";
  grupos[g] = (grupos[g] || 0) + 1;
}

return "CUADROS: " + cuadros.length +
  "\nGRUPOS:\n" + Object.keys(grupos).map(g => "  " + g + ": " + grupos[g]).join("\n") +
  "\n\nFALLOS: " + fallos.length + (fallos.length ? "\n  " + fallos.join("\n  ") : "  — ninguno") +
  "\n\nAVISOS: " + avisos.length + (avisos.length ? "\n  " + avisos.join("\n  ") : "  — ninguno");
