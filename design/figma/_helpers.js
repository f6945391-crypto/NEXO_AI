// Bloque de ayudantes. NO se ejecuta solo: va pegado al inicio de cada script
// que cree cuadros. use_figma no admite imports, por eso está duplicado en
// cada archivo. Si cambias algo aquí, cámbialo en todos.

const vars = await figma.variables.getLocalVariablesAsync();
const V = Object.fromEntries(vars.map(v => [v.name, v]));

const paint = n => figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}}, "color", V[n]);
const fill  = (d,n) => { d.fills = [paint(n)]; };
const line  = (d,n) => { d.strokes = [paint(n)]; d.strokeWeight = 1; };
const radio = (d,r) => { for (const k of ["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"]) d.setBoundVariable(k, V[r]); };

// Texto vinculado a variable de tamaño. `w` fija el ancho y activa el salto de línea.
function T(s, estilo, tam, colorVar, w) {
  const x = figma.createText();
  x.fontName = { family:"Inter", style:estilo };
  if (w) { x.resize(w, 20); x.textAutoResize = "HEIGHT"; }
  x.characters = s;
  x.setBoundVariable("fontSize", V[tam]);
  x.fills = [paint(colorVar)];
  return x;
}

// Contenedores. pads = [arriba, derecha, abajo, izquierda]
function col(n, g, p) {
  const f = figma.createAutoLayout("VERTICAL", { name:n, itemSpacing:g });
  f.set({ paddingTop:p[0], paddingRight:p[1], paddingBottom:p[2], paddingLeft:p[3] });
  return f;
}
function row(n, g, p) {
  const f = figma.createAutoLayout("HORIZONTAL", { name:n, itemSpacing:g });
  f.set({ paddingTop:p[0], paddingRight:p[1], paddingBottom:p[2], paddingLeft:p[3], counterAxisAlignItems:"CENTER" });
  return f;
}

// Pantalla móvil. Cambiar a 1440x900 para web.
function pantalla(pagina, n, x, y) {
  const f = figma.createFrame();
  f.name = n; f.resize(390, 844); f.x = x; f.y = y;
  fill(f, "superficie/base"); f.clipsContent = true;
  pagina.appendChild(f);
  return f;
}

// OJO: el marco de pantalla NO es auto-layout, así que sus hijos no admiten
// layoutSizingHorizontal = "FILL". Hay que fijar ancho y posición a mano.
function fija(padre, hijo, x, y, w) {
  padre.appendChild(hijo);
  hijo.layoutSizingHorizontal = "FIXED";
  hijo.resize(w, hijo.height);
  hijo.x = x; hijo.y = y;
  return hijo;
}

function cabecera(f, sub) {
  const h = col("Encabezado", 4, [56,20,16,20]);
  h.appendChild(T("Hoy","Semi Bold","tam/titulo","texto/fuerte"));
  h.appendChild(T(sub,"Regular","tam/etiqueta","texto/suave"));
  return fija(f, h, 0, 0, 390);
}
