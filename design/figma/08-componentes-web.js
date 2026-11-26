// 08 · Componentes de la plataforma WEB.
// Requiere: 01-variables.js ejecutado. Página "03 Componentes · Web".
// Idempotente: borra por nombre antes de recrear.
//
// Los componentes web son DISTINTOS de los de móvil, no variantes de los
// mismos. Web / Botón tiene menos relleno porque en escritorio no aplica
// el área táctil mínima de 44px. Lo que comparten es el juego de variables.

const pag = figma.root.children.find(p => p.name === "03 Componentes · Web");
await figma.setCurrentPageAsync(pag);
await figma.loadFontAsync({family:"Inter",style:"Regular"});
await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});
for (const n of [...pag.children]) if (n.name.startsWith("Web / ")) n.remove();

const vars = await figma.variables.getLocalVariablesAsync();
const V = Object.fromEntries(vars.map(v=>[v.name,v]));
const paint=n=>figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}},"color",V[n]);
const radio=(d,r)=>{for(const k of["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"])d.setBoundVariable(k,V[r]);};
const pad=(d,v,h)=>{for(const k of["paddingTop","paddingBottom"])d.setBoundVariable(k,V[v]);for(const k of["paddingLeft","paddingRight"])d.setBoundVariable(k,V[h]);};

function txt(nombre,estilo,tam,colorVar,contenido,ancho){
  const t=figma.createText(); t.name=nombre; t.fontName={family:"Inter",style:estilo};
  if(ancho){t.resize(ancho,20); t.textAutoResize="HEIGHT";}
  t.characters=contenido; t.setBoundVariable("fontSize",V[tam]); t.fills=[paint(colorVar)];
  return t;
}
function propTexto(nodo,etiqueta,valor,capa){
  const id=nodo.addComponentProperty(etiqueta,"TEXT",valor);
  for (const c of (nodo.type==="COMPONENT_SET"?nodo.children:[nodo])) {
    const t=c.findOne(n=>n.type==="TEXT"&&n.name===capa);
    if(t) t.componentPropertyReferences={characters:id};
  }
  return id;
}
function grid(set,x,y){
  set.x=x; set.y=y; set.layoutMode="VERTICAL"; set.itemSpacing=16;
  set.paddingTop=24; set.paddingBottom=24; set.paddingLeft=24; set.paddingRight=24;
  set.primaryAxisSizingMode="AUTO"; set.counterAxisSizingMode="AUTO";
}

// --- Web / Botón ---
const TIPOS=[
  {v:"Primario",   fondo:"marca/base",      borde:null,           texto:"texto/inverso"},
  {v:"Secundario", fondo:"superficie/base", borde:"borde/fuerte", texto:"texto/fuerte"},
  {v:"Texto",      fondo:null,              borde:null,           texto:"texto/suave"},
  {v:"Destructivo",fondo:"estado/error",    borde:null,           texto:"texto/inverso"}
];
const cB=[];
for (const t of TIPOS) {
  const f=figma.createAutoLayout("HORIZONTAL",{name:"Botón",itemSpacing:8});
  f.set({primaryAxisAlignItems:"CENTER",counterAxisAlignItems:"CENTER"});
  pad(f,"esp/12","esp/20"); radio(f,"radio/sm");
  f.fills = t.fondo ? [paint(t.fondo)] : [];
  f.strokes = t.borde ? [paint(t.borde)] : []; if(t.borde) f.strokeWeight=1;
  f.appendChild(txt("Etiqueta","Semi Bold","tam/etiqueta",t.texto,"Etiqueta"));
  pag.appendChild(f);
  const c=figma.createComponentFromNode(f); c.name="Tipo="+t.v; cB.push(c);
}
const sBoton=figma.combineAsVariants(cB,pag);
sBoton.name="Web / Botón";
sBoton.description="Acción en escritorio. Más compacto que Móvil / Botón: aquí no hay restricción de área táctil de 44px, así que el relleno es menor y caben tres acciones en fila.";
grid(sBoton,80,120);
propTexto(sBoton,"Etiqueta","Etiqueta","Etiqueta");

// --- Web / Campo ---
// Vacío y Reposo existen por separado a propósito: un campo lleno no debe
// verse como marcador de posición. Fue un defecto detectado en validación.
const ESTADOS=[
  {v:"Vacío",  borde:"borde/base",   valor:"texto/suave",  ayuda:"texto/suave"},
  {v:"Reposo", borde:"borde/base",   valor:"texto/fuerte", ayuda:"texto/suave"},
  {v:"Activo", borde:"borde/fuerte", valor:"texto/fuerte", ayuda:"texto/suave"},
  {v:"Error",  borde:"estado/error", valor:"texto/fuerte", ayuda:"estado/error"}
];
const cC=[];
for (const e of ESTADOS) {
  const f=figma.createAutoLayout("VERTICAL",{name:"Campo",itemSpacing:6});
  f.fills=[];
  pag.appendChild(f); f.resize(420,f.height);
  f.appendChild(txt("Etiqueta","Semi Bold","tam/micro","texto/suave","Etiqueta"));
  const caja=figma.createAutoLayout("HORIZONTAL",{name:"Caja",itemSpacing:8});
  caja.set({counterAxisAlignItems:"CENTER"});
  pad(caja,"esp/12","esp/16"); radio(caja,"radio/sm");
  caja.fills=[paint("superficie/base")]; caja.strokes=[paint(e.borde)]; caja.strokeWeight=1;
  const val=txt("Valor","Regular","tam/etiqueta",e.valor,"Valor",300);
  caja.appendChild(val);
  f.appendChild(caja); caja.layoutSizingHorizontal="FILL"; val.layoutSizingHorizontal="FILL";
  const ay=txt("Ayuda","Regular","tam/micro",e.ayuda,"Texto de ayuda",400);
  f.appendChild(ay); ay.layoutSizingHorizontal="FILL";
  const c=figma.createComponentFromNode(f); c.name="Estado="+e.v; cC.push(c);
}
const sCampo=figma.combineAsVariants(cC,pag);
sCampo.name="Web / Campo";
sCampo.description="Campo del camino manual. Vacío pinta el marcador de posición en texto/suave; Reposo es un campo ya lleno. El estado Error lleva el mensaje concreto en la línea de ayuda, no un genérico: lo exigen EX-01 y EX-02 de CUN-07.";
grid(sCampo,420,120);
propTexto(sCampo,"Etiqueta","Etiqueta","Etiqueta");
propTexto(sCampo,"Valor","Valor","Valor");
propTexto(sCampo,"Ayuda","Texto de ayuda","Ayuda");
const idAyuda=sCampo.addComponentProperty("Mostrar ayuda","BOOLEAN",true);
for (const c of sCampo.children) {
  const a=c.findOne(n=>n.name==="Ayuda");
  if(a) a.componentPropertyReferences={...(a.componentPropertyReferences||{}), visible:idAyuda};
}

// --- Web / Fila de colaborador ---
const f3=figma.createAutoLayout("VERTICAL",{name:"Fila de colaborador",itemSpacing:2});
pad(f3,"esp/12","esp/16"); radio(f3,"radio/sm");
f3.fills=[paint("superficie/elevada")];
pag.appendChild(f3); f3.resize(360,f3.height);
const nom=txt("Nombre","Semi Bold","tam/etiqueta","texto/fuerte","María Fernanda Quispe Huamán",328);
f3.appendChild(nom); nom.layoutSizingHorizontal="FILL";
f3.appendChild(txt("Detalle","Regular","tam/micro","texto/suave","2 tareas activas"));
const cFila=figma.createComponentFromNode(f3);
cFila.name="Web / Fila de colaborador";
cFila.description="Integrante del equipo en la lista lateral. El nombre ocupa el ancho completo porque los nombres reales desbordan: probar siempre con el caso largo.";
cFila.x=980; cFila.y=120;
propTexto(cFila,"Nombre","Nombre del colaborador","Nombre");
propTexto(cFila,"Detalle","0 tareas activas","Detalle");

// Guardar estos IDs: los scripts 10 y 11 los necesitan.
return { componentes:[sBoton,sCampo,cFila].map(c=>({nombre:c.name,id:c.id})) };
