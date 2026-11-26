// Ayudantes de la plataforma WEB (1440x900). No se ejecuta solo:
// va pegado al inicio de cada script web. use_figma no admite imports.
// Diferencias con _helpers.js (móvil): pantalla de 1440x900, navegación
// lateral fija de 240px, y los contenedores nacen sin relleno para no
// dejar el blanco por defecto de createAutoLayout.

const vars = await figma.variables.getLocalVariablesAsync();
const V = Object.fromEntries(vars.map(v => [v.name, v]));

const paint = n => figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}}, "color", V[n]);
const fill  = (d,n) => { d.fills = [paint(n)]; };
const line  = (d,n) => { d.strokes = [paint(n)]; d.strokeWeight = 1; };
const radio = (d,r) => { for (const k of ["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"]) d.setBoundVariable(k, V[r]); };

function T(s, estilo, tam, colorVar, w) {
  const x = figma.createText();
  x.fontName = { family:"Inter", style:estilo };
  if (w) { x.resize(w, 20); x.textAutoResize = "HEIGHT"; }
  x.characters = s;
  x.setBoundVariable("fontSize", V[tam]);
  x.fills = [paint(colorVar)];
  return x;
}
function col(n, g, p) {
  const f = figma.createAutoLayout("VERTICAL", { name:n, itemSpacing:g });
  f.set({ paddingTop:p[0], paddingRight:p[1], paddingBottom:p[2], paddingLeft:p[3] });
  f.fills = [];
  return f;
}
function row(n, g, p) {
  const f = figma.createAutoLayout("HORIZONTAL", { name:n, itemSpacing:g });
  f.set({ paddingTop:p[0], paddingRight:p[1], paddingBottom:p[2], paddingLeft:p[3], counterAxisAlignItems:"CENTER" });
  f.fills = [];
  return f;
}
function fija(padre, hijo, x, y, w) {
  padre.appendChild(hijo);
  hijo.layoutSizingHorizontal = "FIXED";
  hijo.resize(w, hijo.height);
  hijo.x = x; hijo.y = y;
  return hijo;
}

// Armazón web. `activo` marca el ítem de navegación; `degradado` antepone
// el banner de asistente caído y devuelve el desplazamiento vertical `y0`
// que hay que sumar a todo lo que venga debajo.
function pantalla(pagina, nombre, x, y, opts) {
  const o = opts || {};
  const f = figma.createFrame();
  f.name = nombre; f.resize(1440, 900); f.x = x; f.y = y;
  fill(f, "superficie/hundida"); f.clipsContent = true;
  pagina.appendChild(f);

  const nav = col("Navegación lateral", 4, [24,16,24,16]);
  fill(nav, "superficie/base"); line(nav, "borde/base");
  nav.appendChild(T("NexoAI", "Semi Bold", "tam/cuerpo-grande", "marca/base"));
  const sep = figma.createRectangle(); sep.resize(200,1); fill(sep,"borde/base"); nav.appendChild(sep);
  for (const it of ["Mi agenda","Mis tareas","Equipo","Reuniones","Resúmenes"]) {
    const i = row("Ítem", 8, [10,12,10,12]);
    const act = it === (o.activo || "Equipo");
    if (act) { fill(i, "marca/suave"); radio(i, "radio/sm"); }
    i.appendChild(T(it, "Semi Bold", "tam/etiqueta", act ? "marca/base" : "texto/suave"));
    nav.appendChild(i); i.layoutSizingHorizontal = "FILL";
  }
  fija(f, nav, 0, 0, 240); nav.resize(240, 900);

  let y0 = 0;
  if (o.degradado) {
    const ban = row("Aviso / Degradado", 10, [12,20,12,20]);
    fill(ban, "estado/advertencia-suave");
    ban.appendChild(T(o.degradado, "Semi Bold", "tam/etiqueta", "estado/advertencia", 900));
    fija(f, ban, 240, 0, 1200); y0 = ban.height;
  }
  const cab = col("Cabecera", 4, [28,32,20,32]);
  cab.appendChild(T(o.titulo || "Equipo de Plataforma", "Semi Bold", "tam/titulo", "texto/fuerte"));
  cab.appendChild(T(o.subtitulo || "4 colaboradores · 7 tareas activas", "Regular", "tam/etiqueta", "texto/suave"));
  fija(f, cab, 240, y0, 1200);
  return { f, y0 };
}
