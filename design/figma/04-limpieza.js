// 04 · Limpieza obligatoria después de generar cuadros.
// figma.createAutoLayout() deja un relleno blanco por defecto. En contenedores
// estructurales eso produce nodos con color sin variable vinculada, que la
// validación marca como error. Este script los deja sin relleno.

const pagina = figma.root.children.find(p => p.name.includes("Flujos · Móvil"));
await figma.setCurrentPageAsync(pagina);

const CONTENEDORES = new Set(["Encabezado","Estado vacío","Lista de compromisos","Datos","Dato","Acciones","Alternativas","Sugerencias","Esqueleto"]);
let limpiados = 0;
for (const c of pagina.children)
  for (const n of c.findAll(() => true))
    if (CONTENEDORES.has(n.name) && Array.isArray(n.fills) && n.fills.length) { n.fills = []; limpiados++; }

let sinVariable = [];
for (const c of pagina.children)
  for (const n of [c, ...c.findAll(() => true)]) {
    const f = n.fills;
    if (Array.isArray(f)) for (const p of f)
      if (p.type === "SOLID" && !(p.boundVariables && p.boundVariables.color))
        sinVariable.push(c.name + " → " + n.name + " [" + n.type + "]");
  }

return { contenedoresLimpiados: limpiados, nodosSinVariableDeColor: [...new Set(sinVariable)] };
