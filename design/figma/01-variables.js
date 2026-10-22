// 01 · Fundamentos: variables y code syntax
// Idempotente: borra y recrea las colecciones propias.
// LIMITACIÓN PLAN STARTER: un solo modo por colección. Los valores del modo
// Oscuro están en design/tokens.json bajo $extensions.oscuro y se cargan
// cuando el plan sea Professional.

const hex = h => ({ r: parseInt(h.slice(1,3),16)/255, g: parseInt(h.slice(3,5),16)/255, b: parseInt(h.slice(5,7),16)/255 });

const existentes = await figma.variables.getLocalVariableCollectionsAsync();
for (const c of existentes) { if (["color","espaciado","radio","tipografia"].includes(c.name)) c.remove(); }

const color = figma.variables.createVariableCollection("color");
color.renameMode(color.modes[0].modeId, "Claro");
const claro = color.modes[0].modeId;

const COLORES = {
  "marca/base": "#2166B0", "marca/fuerte": "#17497E", "marca/suave": "#E8F1FA",
  "superficie/base": "#FFFFFF", "superficie/elevada": "#F7FAFC", "superficie/hundida": "#EDF2F6",
  "texto/fuerte": "#14212E", "texto/suave": "#5A6E7A", "texto/inverso": "#FFFFFF",
  "borde/base": "#DCE6EC", "borde/fuerte": "#B8C9D4",
  "agente/base": "#6B4FD8", "agente/suave": "#F0ECFD",
  "estado/exito": "#1B7F4B", "estado/exito-suave": "#E6F4EC",
  "estado/advertencia": "#9A6400", "estado/advertencia-suave": "#FDF3E0",
  "estado/error": "#B3261E", "estado/error-suave": "#FBEAE9"
};

for (const [nombre, val] of Object.entries(COLORES)) {
  const v = figma.variables.createVariable(nombre, color, "COLOR");
  v.scopes = nombre.startsWith("texto/") ? ["TEXT_FILL"]
           : nombre.startsWith("borde/") ? ["STROKE_COLOR"]
           : ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"];
  v.setValueForMode(claro, hex(val));
}

function numerica(nombre, valores, scopes) {
  const col = figma.variables.createVariableCollection(nombre);
  col.renameMode(col.modes[0].modeId, "Base");
  const modo = col.modes[0].modeId;
  for (const [k, val] of Object.entries(valores)) {
    const v = figma.variables.createVariable(k, col, "FLOAT");
    v.scopes = scopes;
    v.setValueForMode(modo, val);
  }
}

numerica("espaciado", { "esp/2":2,"esp/4":4,"esp/8":8,"esp/12":12,"esp/16":16,"esp/20":20,"esp/24":24,"esp/32":32,"esp/40":40,"esp/48":48 }, ["GAP","WIDTH_HEIGHT"]);
numerica("radio", { "radio/sm":8,"radio/md":12,"radio/lg":16,"radio/pill":999 }, ["CORNER_RADIUS"]);
numerica("tipografia", { "tam/titulo":28,"tam/subtitulo":22,"tam/cuerpo-grande":18,"tam/cuerpo":16,"tam/etiqueta":14,"tam/micro":12 }, ["FONT_SIZE"]);

// code syntax WEB: var(--color-marca-base)
const vars = await figma.variables.getLocalVariablesAsync();
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const nombreCol = Object.fromEntries(cols.map(c => [c.id, c.name]));
for (const v of vars) {
  const c = nombreCol[v.variableCollectionId];
  if (!["color","espaciado","radio","tipografia"].includes(c)) continue;
  v.setVariableCodeSyntax("WEB", "var(--" + (c + "-" + v.name).replace(/\//g,"-").toLowerCase() + ")");
}

return { colecciones: cols.map(c => ({ nombre: c.name, variables: c.variableIds.length })) };
