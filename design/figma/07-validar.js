// 07 · Validación. No muta nada: solo reporta.
// Comprueba convención de nombres, copias sueltas, colores sin variable
// y recuento de instancias por componente.

const pagina = figma.root.children.find(p => p.name.includes("Flujos · Móvil"));
await figma.setCurrentPageAsync(pagina);

const RX = /^CUN-\d{2} \/ (Móvil|Web) \/ (Principal|FA-\d{2}|EX-\d{2}|Transversal) \/ .+$/;
const REPETIBLES = n => n.startsWith("Botón / ") || n === "Tarjeta / Evento" || n.startsWith("Burbuja / ") || n === "Barra de entrada";

const cuadros = pagina.children.map(c => c.name).sort();
const malNombrados = cuadros.filter(n => !RX.test(n));
let copiasSueltas = [], sinVariable = [], instancias = {};

for (const cuadro of pagina.children)
  for (const n of cuadro.findAll(() => true)) {
    if (n.type === "FRAME" && REPETIBLES(n.name)) copiasSueltas.push(cuadro.name + " → " + n.name);
    if (n.type === "INSTANCE") {
      const mc = await n.getMainComponentAsync();
      const set = mc && mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent.name : (mc ? mc.name : "?");
      instancias[set] = (instancias[set] || 0) + 1;
    }
    const f = n.fills;
    if (Array.isArray(f)) for (const p of f)
      if (p.type === "SOLID" && !(p.boundVariables && p.boundVariables.color))
        sinVariable.push(cuadro.name + " → " + n.name + " [" + n.type + "]");
  }

const porFlujo = {};
for (const n of cuadros) { const f = n.split(" / ")[2]; porFlujo[f] = (porFlujo[f] || 0) + 1; }

return {
  totalCuadros: cuadros.length, porFlujo, cuadros,
  malNombrados, copiasSueltas,
  instanciasPorComponente: instancias,
  nodosSinVariableDeColor: [...new Set(sinVariable)]
};
