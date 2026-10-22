// Ayudantes de la plataforma WEB v2 — jerarquía de tres columnas.
// No se ejecuta solo: va pegado al inicio de cada script 13, 14 y 15.
// use_figma no admite imports.
//
// Diferencia con _helpers-web.js (v1): aquel dibujaba navegación de 240 px
// con texto y una sola columna de contenido de 1200. Aquí son tres:
// 72 navegación · 528 conversación · 840 lienzo. Ver
// design/ARQUITECTURA-VISUAL-WEB.md sección 2.

const vars = await figma.variables.getLocalVariablesAsync();
const V = Object.fromEntries(vars.map(v => [v.name, v]));

const paint = n => figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}}, "color", V[n]);
const fill  = (d,n) => { d.fills = [paint(n)]; };
const line  = (d,n,w) => { d.strokes = [paint(n)]; d.strokeWeight = w || 1; };
const radio = (d,r) => { for (const k of ["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"]) d.setBoundVariable(k, V[r]); };

function T(s, estilo, tam, colorVar, w, alinea) {
  const x = figma.createText();
  x.fontName = { family:"Inter", style:estilo };
  x.characters = s;
  if (w) { x.resize(w, 20); x.textAutoResize = "HEIGHT"; }
  else   { x.textAutoResize = "WIDTH_AND_HEIGHT"; }
  x.setBoundVariable("fontSize", V[tam]);
  x.fills = [paint(colorVar)];
  if (alinea) x.textAlignHorizontal = alinea;
  return x;
}

// El marco de pantalla NO es auto-layout, así que sus hijos no admiten
// layoutSizingHorizontal = "FILL". Hay que fijar ancho y posición a mano.
function fija(padre, hijo, x, y, w, h) {
  padre.appendChild(hijo);
  hijo.layoutSizingHorizontal = "FIXED";
  hijo.resize(w, h || hijo.height);
  hijo.x = x; hijo.y = y;
  return hijo;
}

// Armazón de tres columnas.
//   activo      — destino de navegación resaltado
//   banner      — texto del aviso de modo degradado, o null
//   modoDisp    — "55:0" Normal | "55:1" Lienzo expandido
// Devuelve { f, conv, lie, y0 }. En modo expandido `conv` es el asidero
// de 12 px: la conversación colapsada tiene que tener vuelta atrás.
function pantalla(pagina, nombre, x, y, opts) {
  const o = opts || {};
  const f = figma.createFrame();
  f.name = nombre; f.resize(1440, 900); f.x = x; f.y = y;
  fill(f, "superficie/hundida"); f.clipsContent = true;
  pagina.appendChild(f);
  if (o.coleccionDisposicion && o.modoDisp) {
    f.setExplicitVariableModeForCollection(o.coleccionDisposicion, o.modoDisp);
  }

  const nav = figma.createAutoLayout("VERTICAL", { name:"Navegación", itemSpacing:6 });
  nav.set({ paddingTop:20, paddingBottom:20, counterAxisAlignItems:"CENTER" });
  fill(nav, "superficie/base"); line(nav, "borde/base");
  const marca = figma.createFrame(); marca.name = "Marca"; marca.resize(28,28);
  fill(marca, "marca/base"); radio(marca, "radio/sm"); nav.appendChild(marca);
  const sep = figma.createRectangle(); sep.resize(40,1); fill(sep,"borde/base"); nav.appendChild(sep);
  for (const d of ["Agenda","Tareas","Equipo","Reuniones","Resúmenes","Actividad"]) {
    const ins = (d === o.activo ? ITEM_ACTIVO : ITEM_REPOSO).createInstance();
    ins.name = d;
    ins.setProperties({ [CLAVE_ICONO]: ICONOS[d] });
    nav.appendChild(ins);
  }
  fija(f, nav, 0, 0, 72, 900);
  nav.setBoundVariable("width", V["ancho/nav"]);

  let y0 = 0;
  if (o.banner) {
    const ban = figma.createAutoLayout("HORIZONTAL", { name:"Aviso / Degradado", itemSpacing:10 });
    ban.set({ paddingTop:14, paddingRight:24, paddingBottom:14, paddingLeft:24, counterAxisAlignItems:"CENTER" });
    fill(ban, "estado/advertencia-suave");
    const tb = T(o.banner, "Semi Bold", "tam/etiqueta", "estado/advertencia", 1320);
    ban.appendChild(tb);
    fija(f, ban, 72, 0, 1368);
    tb.layoutSizingHorizontal = "FILL";
    y0 = ban.height;
  }

  const expandido = o.modoDisp === "55:1";
  const conv = figma.createAutoLayout("VERTICAL", { name: expandido ? "Conversación colapsada" : "Conversación", itemSpacing:14 });
  if (!expandido) conv.set({ paddingTop:24, paddingRight:24, paddingBottom:24, paddingLeft:24 });
  fill(conv, "superficie/hundida"); line(conv, "borde/base");
  fija(f, conv, 72, y0, expandido ? 12 : 528, 900 - y0);
  if (!expandido) conv.setBoundVariable("width", V["ancho/conversacion"]);

  const lie = figma.createAutoLayout("VERTICAL", { name:"Lienzo", itemSpacing:0 });
  fill(lie, "superficie/base");
  fija(f, lie, expandido ? 84 : 600, y0, expandido ? 1356 : 840, 900 - y0);
  if (!expandido) lie.setBoundVariable("width", V["ancho/lienzo"]);

  return { f, conv, lie, y0 };
}

// Empuja la barra de entrada al fondo de la conversación sin desbordar.
function cierraConversacion(conv, barraComp, altoUtil) {
  const otros = conv.children.reduce((a,c) => a + c.height, 0);
  const libre = (altoUtil || 900) - 48 - otros - barraComp.height - 14 * conv.children.length;
  const h = figma.createFrame(); h.name = "Espacio"; h.fills = [];
  h.resize(480, Math.max(24, libre));
  conv.appendChild(h);
  conv.appendChild(barraComp.createInstance());
}
