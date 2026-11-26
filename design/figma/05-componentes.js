// 05 · Componentes de la plataforma móvil.
// Requiere: 01-variables.js ejecutado.
// Idempotente: borra por nombre antes de recrear.
// CONVENCIÓN ANTI-COLISIÓN: todo componente lleva prefijo de plataforma,
// "Móvil / …" o "Web / …", porque ambas plataformas comparten archivo
// (el plan Starter solo da 3 páginas, así que no hay una página por plataforma).

const pag = figma.root.children.find(p => p.name.includes("Componentes"));
await figma.setCurrentPageAsync(pag);
await figma.loadFontAsync({family:"Inter",style:"Regular"});
await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});

const vars = await figma.variables.getLocalVariablesAsync();
const V = Object.fromEntries(vars.map(v=>[v.name,v]));
const paint = n => figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}},"color",V[n]);
const radio = (d,r) => { for (const k of ["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"]) d.setBoundVariable(k,V[r]); };
const pad = (d,v) => { for (const k of ["paddingTop","paddingBottom"]) d.setBoundVariable(k,V[v[0]]); for (const k of ["paddingLeft","paddingRight"]) d.setBoundVariable(k,V[v[1]]); };

const NOMBRES = ["Móvil / Botón","Móvil / Tarjeta de evento","Móvil / Burbuja","Móvil / Barra de entrada"];
for (const n of [...pag.children]) if (NOMBRES.includes(n.name)) n.remove();

function txt(nombre, estilo, tam, colorVar, contenido, ancho) {
  const t = figma.createText();
  t.name = nombre; t.fontName = {family:"Inter",style:estilo};
  if (ancho) { t.resize(ancho,20); t.textAutoResize="HEIGHT"; }
  t.characters = contenido;
  t.setBoundVariable("fontSize", V[tam]);
  t.fills = [paint(colorVar)];
  return t;
}
function propTexto(nodo, etiqueta, valor, nombreCapa) {
  const id = nodo.addComponentProperty(etiqueta, "TEXT", valor);
  const hijos = nodo.type === "COMPONENT_SET" ? nodo.children : [nodo];
  for (const c of hijos) {
    const t = c.findOne(n => n.type === "TEXT" && n.name === nombreCapa);
    if (t) t.componentPropertyReferences = { characters: id };
  }
  return id;
}
function grid(set, x, y) {
  set.x = x; set.y = y;
  set.layoutMode = "VERTICAL"; set.itemSpacing = 16;
  set.paddingTop = 24; set.paddingBottom = 24; set.paddingLeft = 24; set.paddingRight = 24;
  set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
}

// --- Móvil / Botón : Tipo = Primario | Secundario | Texto | Destructivo ---
const TIPOS = [
  { v:"Primario",    fondo:"marca/base",      borde:null,           texto:"texto/inverso" },
  { v:"Secundario",  fondo:"superficie/base", borde:"borde/fuerte", texto:"texto/fuerte" },
  { v:"Texto",       fondo:"superficie/base", borde:null,           texto:"texto/suave" },
  { v:"Destructivo", fondo:"estado/error",    borde:null,           texto:"texto/inverso" }
];
const cBoton = [];
for (const t of TIPOS) {
  const f = figma.createAutoLayout("HORIZONTAL",{name:"Botón", itemSpacing:8});
  f.set({ primaryAxisAlignItems:"CENTER", counterAxisAlignItems:"CENTER" });
  pad(f, ["esp/16","esp/20"]); radio(f,"radio/md");
  f.fills = [paint(t.fondo)];
  if (t.borde) { f.strokes = [paint(t.borde)]; f.strokeWeight = 1; } else f.strokes = [];
  f.appendChild(txt("Etiqueta","Semi Bold","tam/cuerpo",t.texto,"Etiqueta"));
  pag.appendChild(f);
  const c = figma.createComponentFromNode(f); c.name = "Tipo=" + t.v; cBoton.push(c);
}
const sBoton = figma.combineAsVariants(cBoton, pag);
sBoton.name = "Móvil / Botón";
sBoton.description = "Acción principal de una pantalla. Destructivo solo para acciones irreversibles y siempre detrás de una confirmación previa (RN-ER-03).";
grid(sBoton, 80, 120);
propTexto(sBoton, "Etiqueta", "Etiqueta", "Etiqueta");

// --- Móvil / Tarjeta de evento ---
const fT = figma.createAutoLayout("VERTICAL",{name:"Tarjeta de evento"});
fT.setBoundVariable("itemSpacing", V["esp/4"]);
pad(fT, ["esp/16","esp/16"]); radio(fT,"radio/md");
fT.fills = [paint("superficie/elevada")];
fT.strokes = [paint("borde/base")]; fT.strokeWeight = 1;
pag.appendChild(fT); fT.resize(318, fT.height);
fT.appendChild(txt("Hora","Semi Bold","tam/micro","marca/base","08:30 – 09:15"));
const tit = txt("Título","Regular","tam/cuerpo","texto/fuerte","Revisión de avances con María Fernanda Quispe",286);
fT.appendChild(tit); tit.layoutSizingHorizontal = "FILL";
const cTarjeta = figma.createComponentFromNode(fT);
cTarjeta.name = "Móvil / Tarjeta de evento";
cTarjeta.description = "Un compromiso de la agenda. La hora usa marca/base para que el usuario escanee la columna temporal sin leer los títulos.";
cTarjeta.x = 320; cTarjeta.y = 120;
propTexto(cTarjeta, "Hora", "08:30 – 09:15", "Hora");
propTexto(cTarjeta, "Título", "Revisión de avances", "Título");

// --- Móvil / Burbuja : Autor = Usuario | Asistente ---
const AUTORES = [
  { v:"Usuario",   fondo:"marca/suave",  esquina:"bottomRightRadius", msg:"Agéndame una reunión con Vasco el viernes a las 10" },
  { v:"Asistente", fondo:"agente/suave", esquina:"bottomLeftRadius",  msg:"Revisando tu agenda del viernes…" }
];
const cBurb = [];
for (const a of AUTORES) {
  const f = figma.createAutoLayout("VERTICAL",{name:"Burbuja"});
  pad(f, ["esp/12","esp/16"]); radio(f,"radio/lg");
  f.setBoundVariable(a.esquina, V["radio/sm"]);
  f.fills = [paint(a.fondo)];
  pag.appendChild(f); f.resize(270, f.height);
  const m = txt("Mensaje","Regular","tam/cuerpo","texto/fuerte",a.msg,238);
  f.appendChild(m); m.layoutSizingHorizontal = "FILL";
  const c = figma.createComponentFromNode(f); c.name = "Autor=" + a.v; cBurb.push(c);
}
const sBurbuja = figma.combineAsVariants(cBurb, pag);
sBurbuja.name = "Móvil / Burbuja";
sBurbuja.description = "Turno de la conversación. La variante Asistente usa la familia agente/* para que se distinga de un vistazo qué dijo el usuario y qué propuso el sistema.";
grid(sBurbuja, 700, 120);
propTexto(sBurbuja, "Mensaje", "Mensaje", "Mensaje");

// --- Móvil / Barra de entrada : Estado = Reposo | Activo | Deshabilitado ---
const ESTADOS = [
  { v:"Reposo",        borde:"borde/base",   texto:"texto/suave",  op:1,   msg:"Escribe o pulsa el micrófono" },
  { v:"Activo",        borde:"borde/fuerte", texto:"texto/fuerte", op:1,   msg:"Agéndame una reunión con Vasco…" },
  { v:"Deshabilitado", borde:"borde/base",   texto:"texto/suave",  op:0.5, msg:"Asistente no disponible" }
];
const cBarra = [];
for (const e of ESTADOS) {
  const f = figma.createAutoLayout("HORIZONTAL",{name:"Barra de entrada"});
  f.set({ counterAxisAlignItems:"CENTER" });
  f.setBoundVariable("itemSpacing", V["esp/8"]);
  pad(f, ["esp/12","esp/16"]); radio(f,"radio/pill");
  f.fills = [paint("superficie/elevada")];
  f.strokes = [paint(e.borde)]; f.strokeWeight = 1;
  f.opacity = e.op;
  pag.appendChild(f); f.resize(350, f.height);
  const t = txt("Texto","Regular","tam/cuerpo",e.texto,e.msg,300);
  f.appendChild(t); t.layoutSizingHorizontal = "FILL";
  const c = figma.createComponentFromNode(f); c.name = "Estado=" + e.v; cBarra.push(c);
}
const sBarra = figma.combineAsVariants(cBarra, pag);
sBarra.name = "Móvil / Barra de entrada";
sBarra.description = "Punto de entrada al asistente. La variante Deshabilitado es obligatoria: en modo degradado la barra debe verse inactiva sin desaparecer, para que el usuario entienda que el asistente no responde pero la agenda sí funciona.";
grid(sBarra, 80, 460);
propTexto(sBarra, "Texto", "Escribe o pulsa el micrófono", "Texto");

return { componentes: [sBoton, cTarjeta, sBurbuja, sBarra].map(c => ({ nombre: c.name, id: c.id })) };
