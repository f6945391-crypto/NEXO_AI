// 15 · Informe de la página 06 Arquitectura · Web v2. NO muta nada.
// Comprueba lo que la validación estructural sí puede comprobar:
// convención de nombres, presencia de las tres columnas, vinculación de
// los anchos a la colección disposicion y ausencia de colores sueltos.
//
// Lo que NO comprueba, y por eso hace falta mirar los cuadros: que los
// cuatro blancos se distingan entre sí. Eso es visual y estructuralmente
// los cuatro son idénticos.

const pagina = figma.root.children.find(p => p.name === "06 Arquitectura · Web v2");
await figma.setCurrentPageAsync(pagina);

const RE = /^WEB-v2 \/ (Armazón|Blancos|Lienzo|Registro|Diálogos) \/ \d{2} .+$/;
const cuadros = pagina.children.filter(c => c.type === "FRAME");
const informe = [];
let sueltosTotal = 0, instanciasTotal = 0;

for (const f of cuadros) {
  const cols = f.children
    .filter(c => ["Navegación","Conversación","Lienzo","Conversación colapsada"].indexOf(c.name) !== -1)
    .map(c => c.name);
  const vinculados = f.children.filter(c => c.boundVariables && c.boundVariables.width).map(c => c.name);
  const sueltos = [];
  for (const n of f.findAll(x => "fills" in x)) {
    if (!Array.isArray(n.fills)) continue;
    for (const p of n.fills) {
      if (p.type === "SOLID" && !(p.boundVariables && p.boundVariables.color)) sueltos.push(n.name);
    }
  }
  const ins = f.findAllWithCriteria({ types:["INSTANCE"] }).length;
  sueltosTotal += sueltos.length;
  instanciasTotal += ins;
  informe.push({ cuadro:f.name, convencion:RE.test(f.name), columnas:cols,
                 anchosVinculados:vinculados, instancias:ins, nSueltos:sueltos.length });
}

const cols = await figma.variables.getLocalVariableCollectionsAsync();
const disp = cols.find(c => c.name === "disposicion");

return {
  totalCuadros: cuadros.length,
  fueraDeConvencion: informe.filter(i => !i.convencion).map(i => i.cuadro),
  sinTresColumnas: informe.filter(i => i.columnas.indexOf("Navegación") === -1 || i.columnas.indexOf("Lienzo") === -1).map(i => i.cuadro),
  totalInstancias: instanciasTotal,
  totalColoresSueltos: sueltosTotal,
  coleccionDisposicion: disp ? { modos: disp.modes.map(m => m.name), vars: disp.variableIds.length } : null,
  detalle: informe
};
