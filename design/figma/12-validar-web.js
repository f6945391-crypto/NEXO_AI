// 12 · Validación de la página web. No muta nada.
// Mismo contrato que 07-validar.js pero sobre "05 Flujos · Web".

const pagina = figma.root.children.find(p => p.name === "05 Flujos · Web");
await figma.setCurrentPageAsync(pagina);

const RX = /^CUN-\d{2} \/ (Móvil|Web) \/ (Principal|FA-\d{2}|EX-\d{2}|Transversal) \/ .+$/;
const REPETIBLES = n => n.startsWith("Botón / ") || n === "Campo" || n === "Fila / Colaborador";

const cuadros = pagina.children.map(c => c.name).sort();
const malNombrados = cuadros.filter(n => !RX.test(n));
let copiasSueltas = [], sinVariable = [], instancias = {};

for (const cuadro of pagina.children)
  for (const n of cuadro.findAll(() => true)) {
    if (n.type === "FRAME" && REPETIBLES(n.name)) copiasSueltas.push(cuadro.name + " → " + n.name);
    if (n.type === "INSTANCE") {
      const mc = await n.getMainComponentAsync();
      const s = mc && mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent.name : (mc ? mc.name : "?");
      instancias[s] = (instancias[s] || 0) + 1;
    }
    const f = n.fills;
    if (Array.isArray(f)) for (const p of f)
      if (p.type === "SOLID" && !(p.boundVariables && p.boundVariables.color))
        sinVariable.push(cuadro.name + " → " + n.name + " [" + n.type + "]");
  }

const porCUN = {};
for (const n of cuadros) { const c = n.split(" / ")[0]; porCUN[c] = (porCUN[c] || 0) + 1; }

return {
  totalCuadros: cuadros.length, porCUN, cuadros,
  malNombrados, copiasSueltas,
  instanciasPorComponente: instancias,
  nodosSinVariableDeColor: [...new Set(sinVariable)]
};
