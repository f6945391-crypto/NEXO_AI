// 13 · Componentes nuevos de la jerarquía de tres columnas.
// Se ejecuta sobre la página "03 Componentes · Web".
// >>> Pegar aquí el contenido de _helpers-web-v2.js, MENOS pantalla()
//     y cierraConversacion(), que necesitan los IDs que este script crea. <<<
//
// Crea siete componentes. Borra por nombre, así que es repetible.

const pagina = figma.root.children.find(p => p.name === "03 Componentes · Web");
await figma.setCurrentPageAsync(pagina);
await figma.loadFontAsync({ family:"Inter", style:"Semi Bold" });
await figma.loadFontAsync({ family:"Inter", style:"Regular" });

const NOMBRES = ["Web / Icono","Web / Ítem de navegación","Web / Tarjeta","Web / Burbuja",
                 "Web / Barra de entrada","Web / Panel de lienzo","Web / Fila de registro",
                 "Web / Advertencia de descarte"];
for (const n of pagina.findAllWithCriteria({ types:["COMPONENT","COMPONENT_SET"] })) {
  if (NOMBRES.indexOf(n.name) !== -1) n.remove();
}

function caja(x,y,w,h,r){ const d=figma.createRectangle(); d.resize(w,h); d.x=x; d.y=y; fill(d,"texto/fuerte"); if(r) d.cornerRadius=r; return d; }
function bola(x,y,t){ const d=figma.createEllipse(); d.resize(t,t); d.x=x; d.y=y; fill(d,"texto/fuerte"); return d; }

// ---- Web / Icono --------------------------------------------------------
// MARCADORES DE POSICIÓN geométricos. No es un juego de iconos definitivo.
// Van como INSTANCE_SWAP para que sustituirlos no obligue a tocar cuadros.
const formas = {
  "Agenda":    () => [caja(2,4,16,14,2), caja(2,4,16,4,0), caja(5,1,2,4,1), caja(13,1,2,4,1)],
  "Tareas":    () => [caja(2,4,3,3,1), caja(7,4,11,3,1), caja(2,10,3,3,1), caja(7,10,11,3,1), caja(2,16,3,3,1), caja(7,16,11,3,1)],
  "Equipo":    () => [bola(3,3,7), bola(11,6,5), caja(1,13,10,6,3), caja(11,15,8,4,2)],
  "Reuniones": () => [bola(2,2,16), caja(9,5,2,6,1), caja(9,9,6,2,1)],
  "Resúmenes": () => [caja(3,2,14,17,2), caja(6,6,8,2,1), caja(6,10,8,2,1), caja(6,14,5,2,1)],
  "Actividad": () => [caja(2,12,3,7,1), caja(7,7,3,12,1), caja(12,2,3,17,1), caja(2,19,16,1,0)]
};
const vIcono = [];
for (const [nombre, hacer] of Object.entries(formas)) {
  const m = figma.createFrame();
  m.name = "Nombre=" + nombre; m.resize(20,20); m.fills = []; m.clipsContent = false;
  for (const p of hacer()) m.appendChild(p);
  vIcono.push(figma.createComponentFromNode(m));
}
const setIcono = figma.combineAsVariants(vIcono, pagina);
setIcono.name = "Web / Icono";
setIcono.x = 40; setIcono.y = 1400;
setIcono.layoutMode = "HORIZONTAL";
setIcono.set({ itemSpacing:16, paddingTop:16, paddingBottom:16, paddingLeft:16, paddingRight:16 });
const iconoBase = setIcono.defaultVariant;

// ---- Web / Ítem de navegación ------------------------------------------
const vItem = [];
for (const estado of ["Reposo","Activo"]) {
  const it = figma.createAutoLayout("HORIZONTAL", { name:"Estado="+estado, itemSpacing:0 });
  it.set({ paddingTop:14, paddingBottom:14, paddingLeft:26, paddingRight:26,
           counterAxisAlignItems:"CENTER", primaryAxisAlignItems:"CENTER" });
  if (estado === "Activo") { fill(it,"marca/suave"); radio(it,"radio/sm"); } else it.fills = [];
  it.appendChild(iconoBase.createInstance());
  const c = figma.createComponentFromNode(it);
  c.resize(72, c.height);
  vItem.push(c);
}
const setItem = figma.combineAsVariants(vItem, pagina);
setItem.name = "Web / Ítem de navegación";
setItem.x = 40; setItem.y = 1560;
setItem.layoutMode = "VERTICAL";
setItem.set({ itemSpacing:16, paddingTop:16, paddingBottom:16, paddingLeft:16, paddingRight:16 });
// OJO: addComponentProperty va en el CONJUNTO, nunca en una variante.
// En una variante falla con "Can only set component property definitions
// on a product component".
const claveIcono = setItem.addComponentProperty("Icono", "INSTANCE_SWAP", iconoBase.id);
for (const c of setItem.children) c.children[0].componentPropertyReferences = { mainComponent: claveIcono };

// ---- Web / Tarjeta ------------------------------------------------------
// El componente que carga la propuesta entera: las tarjetas SON la interfaz.
// Los botones NO van dentro: se componen debajo con Web / Botón.
const ANCHO = 480;
const tipos = [
  { nombre:"Propuesta",    acento:"agente/base" },
  { nombre:"Confirmación", acento:"estado/advertencia" },
  { nombre:"Resultado",    acento:"estado/exito" },
  { nombre:"Bloqueada",    acento:"marca/base" },
  { nombre:"Error",        acento:"estado/error" }
];
const vTarjeta = [];
for (const t of tipos) {
  const tar = figma.createAutoLayout("VERTICAL", { name:"Tipo="+t.nombre, itemSpacing:0 });
  tar.set({ paddingTop:0, paddingRight:0, paddingBottom:16, paddingLeft:0 });
  fill(tar,"superficie/elevada"); line(tar,"borde/base"); radio(tar,"radio/md");
  tar.clipsContent = true;
  const barra = figma.createRectangle(); barra.resize(ANCHO,4); fill(barra, t.acento);
  tar.appendChild(barra); barra.layoutSizingHorizontal = "FILL";
  const cont = figma.createAutoLayout("VERTICAL", { name:"Contenido", itemSpacing:6 });
  cont.set({ paddingTop:16, paddingRight:20, paddingBottom:0, paddingLeft:20 });
  cont.fills = [];
  tar.appendChild(cont); cont.layoutSizingHorizontal = "FILL";
  const tit = T("Título de la tarjeta","Semi Bold","tam/cuerpo","texto/fuerte",ANCHO-40);
  const cue = T("Cuerpo con los datos concretos de la acción.","Regular","tam/etiqueta","texto/suave",ANCHO-40);
  tit.name = "Título"; cue.name = "Cuerpo";
  cont.appendChild(tit); cont.appendChild(cue);
  tit.layoutSizingHorizontal = "FILL"; cue.layoutSizingHorizontal = "FILL";
  const c = figma.createComponentFromNode(tar);
  c.resize(ANCHO, c.height);
  vTarjeta.push(c);
}
const setTarjeta = figma.combineAsVariants(vTarjeta, pagina);
setTarjeta.name = "Web / Tarjeta";
setTarjeta.x = 40; setTarjeta.y = 1800;
setTarjeta.layoutMode = "VERTICAL";
setTarjeta.set({ itemSpacing:24, paddingTop:24, paddingBottom:24, paddingLeft:24, paddingRight:24 });
const cvTit = setTarjeta.addComponentProperty("Título","TEXT","Título de la tarjeta");
const cvCue = setTarjeta.addComponentProperty("Cuerpo","TEXT","Cuerpo con los datos concretos de la acción.");
for (const c of setTarjeta.children) {
  c.children[1].children[0].componentPropertyReferences = { characters: cvTit };
  c.children[1].children[1].componentPropertyReferences = { characters: cvCue };
}

// ---- Web / Burbuja ------------------------------------------------------
// Ancho FIJO por variante. Si hiciera hug, un mensaje largo estiraría la
// burbuja más allá de la columna de 528 px. Pasó, y se ve feo.
const vBurbuja = [];
for (const b of [{a:"Usuario",f:"marca/suave",w:380},{a:"Asistente",f:"superficie/elevada",w:440}]) {
  const cont = figma.createAutoLayout("VERTICAL", { name:"Autor="+b.a, itemSpacing:0 });
  cont.set({ paddingTop:12, paddingRight:16, paddingBottom:12, paddingLeft:16 });
  fill(cont, b.f); radio(cont,"radio/md");
  if (b.a === "Asistente") line(cont,"borde/base");
  const t = T("Mensaje del turno.","Regular","tam/cuerpo","texto/fuerte", b.w-32);
  t.name = "Mensaje";
  cont.appendChild(t);
  const c = figma.createComponentFromNode(cont);
  c.layoutSizingHorizontal = "FIXED";
  c.resize(b.w, c.height);
  t.layoutSizingHorizontal = "FILL";
  c.layoutSizingVertical = "HUG";
  vBurbuja.push(c);
}
const setBurbuja = figma.combineAsVariants(vBurbuja, pagina);
setBurbuja.name = "Web / Burbuja";
setBurbuja.x = 620; setBurbuja.y = 1400;
setBurbuja.layoutMode = "VERTICAL";
setBurbuja.set({ itemSpacing:20, paddingTop:20, paddingBottom:20, paddingLeft:20, paddingRight:20 });
const cvMsg = setBurbuja.addComponentProperty("Mensaje","TEXT","Mensaje del turno.");
for (const c of setBurbuja.children) c.children[0].componentPropertyReferences = { characters: cvMsg };

// ---- Web / Barra de entrada --------------------------------------------
const vBarra = [];
for (const b of [
  { e:"Reposo",        borde:"borde/base", fondo:"superficie/base",    color:"texto/suave"  },
  { e:"Activo",        borde:"marca/base", fondo:"superficie/base",    color:"texto/fuerte" },
  { e:"Deshabilitado", borde:"borde/base", fondo:"superficie/hundida", color:"texto/suave"  }]) {
  const cont = figma.createAutoLayout("HORIZONTAL", { name:"Estado="+b.e, itemSpacing:12 });
  cont.set({ paddingTop:14, paddingRight:16, paddingBottom:14, paddingLeft:16, counterAxisAlignItems:"CENTER" });
  fill(cont,b.fondo); line(cont,b.borde, b.e==="Activo"?2:1); radio(cont,"radio/md");
  const t = T("Pide algo al asistente","Regular","tam/cuerpo",b.color,ANCHO-64);
  t.name = "Texto";
  cont.appendChild(t);
  const c = figma.createComponentFromNode(cont);
  c.resize(ANCHO, c.height);
  t.layoutSizingHorizontal = "FILL";
  vBarra.push(c);
}
const setBarra = figma.combineAsVariants(vBarra, pagina);
setBarra.name = "Web / Barra de entrada";
setBarra.x = 620; setBarra.y = 1700;
setBarra.layoutMode = "VERTICAL";
setBarra.set({ itemSpacing:20, paddingTop:20, paddingBottom:20, paddingLeft:20, paddingRight:20 });
const cvTxt = setBarra.addComponentProperty("Texto","TEXT","Pide algo al asistente");
for (const c of setBarra.children) c.children[0].componentPropertyReferences = { characters: cvTxt };

// ---- Web / Panel de lienzo ---------------------------------------------
// Banda de cabecera de la columna derecha. El control expande y contrae:
// es el único cambio de disposición que existe, no hay inverso.
const vPanel = [];
for (const modo of ["Objeto","Registro"]) {
  const cab = figma.createAutoLayout("HORIZONTAL", { name:"Modo="+modo, itemSpacing:16 });
  cab.set({ paddingTop:24, paddingRight:24, paddingBottom:20, paddingLeft:24,
            counterAxisAlignItems:"CENTER", primaryAxisAlignItems:"SPACE_BETWEEN" });
  fill(cab,"superficie/base"); line(cab,"borde/base");
  const izq = figma.createAutoLayout("VERTICAL", { name:"Encabezado", itemSpacing:4 });
  izq.fills = [];
  const tit = T("Título del lienzo","Semi Bold","tam/subtitulo","texto/fuerte",560);
  const sub = T("Subtítulo con contexto y zona horaria","Regular","tam/etiqueta","texto/suave",560);
  tit.name = "Título"; sub.name = "Subtítulo";
  izq.appendChild(tit); izq.appendChild(sub);
  cab.appendChild(izq);
  const ctrl = figma.createFrame(); ctrl.name = "Expandir"; ctrl.resize(32,32);
  fill(ctrl,"superficie/hundida"); radio(ctrl,"radio/sm"); ctrl.clipsContent = true;
  ctrl.appendChild(caja(7,10,7,2,1));  ctrl.appendChild(caja(7,10,2,7,1));
  ctrl.appendChild(caja(18,20,7,2,1)); ctrl.appendChild(caja(23,13,2,7,1));
  cab.appendChild(ctrl);
  const c = figma.createComponentFromNode(cab);
  c.resize(840, c.height);
  izq.layoutSizingHorizontal = "FILL";
  tit.layoutSizingHorizontal = "FILL"; sub.layoutSizingHorizontal = "FILL";
  vPanel.push(c);
}
const setPanel = figma.combineAsVariants(vPanel, pagina);
setPanel.name = "Web / Panel de lienzo";
setPanel.x = 1180; setPanel.y = 1400;
setPanel.layoutMode = "VERTICAL";
setPanel.set({ itemSpacing:24, paddingTop:24, paddingBottom:24, paddingLeft:24, paddingRight:24 });
const cvPTit = setPanel.addComponentProperty("Título","TEXT","Título del lienzo");
const cvPSub = setPanel.addComponentProperty("Subtítulo","TEXT","Subtítulo con contexto y zona horaria");
for (const c of setPanel.children) {
  c.children[0].children[0].componentPropertyReferences = { characters: cvPTit };
  c.children[0].children[1].componentPropertyReferences = { characters: cvPSub };
}

// ---- Web / Fila de registro --------------------------------------------
// Interfaz de la tabla evento_auditoria (propuesta técnica §8 y §9).
const vFila = [];
for (const r of [{r:"Hecho",c:"estado/exito"},{r:"Rechazado",c:"estado/error"},{r:"Pendiente",c:"estado/advertencia"}]) {
  const fila = figma.createAutoLayout("HORIZONTAL", { name:"Resultado="+r.r, itemSpacing:14 });
  fila.set({ paddingTop:14, paddingRight:20, paddingBottom:14, paddingLeft:20, counterAxisAlignItems:"CENTER" });
  fila.fills = []; line(fila,"borde/base");
  const punto = figma.createEllipse(); punto.resize(10,10); fill(punto,r.c); punto.name="Marca";
  fila.appendChild(punto);
  const med = figma.createAutoLayout("VERTICAL", { name:"Texto", itemSpacing:3 });
  med.fills = [];
  const acc = T("Acción registrada","Semi Bold","tam/etiqueta","texto/fuerte",560);
  const det = T("Detalle con los datos concretos","Regular","tam/micro","texto/suave",560);
  acc.name="Acción"; det.name="Detalle";
  med.appendChild(acc); med.appendChild(det);
  fila.appendChild(med);
  const mom = T("hace un momento","Regular","tam/micro","texto/suave");
  mom.name = "Momento";
  fila.appendChild(mom);
  const c = figma.createComponentFromNode(fila);
  c.resize(792, c.height);
  med.layoutSizingHorizontal = "FILL";
  acc.layoutSizingHorizontal = "FILL"; det.layoutSizingHorizontal = "FILL";
  vFila.push(c);
}
const setFila = figma.combineAsVariants(vFila, pagina);
setFila.name = "Web / Fila de registro";
setFila.x = 1180; setFila.y = 1700;
setFila.layoutMode = "VERTICAL";
setFila.set({ itemSpacing:20, paddingTop:24, paddingBottom:24, paddingLeft:24, paddingRight:24 });
const cvA = setFila.addComponentProperty("Acción","TEXT","Acción registrada");
const cvD = setFila.addComponentProperty("Detalle","TEXT","Detalle con los datos concretos");
const cvM = setFila.addComponentProperty("Momento","TEXT","hace un momento");
for (const c of setFila.children) {
  c.children[1].children[0].componentPropertyReferences = { characters: cvA };
  c.children[1].children[1].componentPropertyReferences = { characters: cvD };
  c.children[2].componentPropertyReferences = { characters: cvM };
}

// ---- Web / Advertencia de descarte --------------------------------------
// Un solo componente para los dos usos: vaciar la conversación a mano y
// pulsar un destino con una propuesta sin confirmar. Dice QUÉ se pierde,
// nunca "¿estás seguro?" (RN-ER-03).
const av = figma.createAutoLayout("VERTICAL", { name:"Web / Advertencia de descarte", itemSpacing:8 });
av.set({ paddingTop:20, paddingRight:24, paddingBottom:20, paddingLeft:24 });
fill(av,"estado/advertencia-suave"); line(av,"estado/advertencia"); radio(av,"radio/md");
const avT = T("Se descartará la propuesta sin confirmar","Semi Bold","tam/cuerpo","texto/fuerte",392);
const avC = T("Detalle exacto de lo que se pierde, con nombres y fechas.","Regular","tam/etiqueta","texto/fuerte",392);
avT.name="Título"; avC.name="Qué se pierde";
av.appendChild(avT); av.appendChild(avC);
const compAv = figma.createComponentFromNode(av);
compAv.resize(440, compAv.height);
avT.layoutSizingHorizontal = "FILL"; avC.layoutSizingHorizontal = "FILL";
compAv.x = 1180; compAv.y = 2100;
const cvQ = compAv.addComponentProperty("Qué se pierde","TEXT",avC.characters);
compAv.children[1].componentPropertyReferences = { characters: cvQ };

return {
  createdNodeIds: [setIcono.id, setItem.id, setTarjeta.id, setBurbuja.id, setBarra.id, setPanel.id, setFila.id, compAv.id],
  clavesParaElScript14: {
    ITEM_REPOSO: setItem.children[0].id, ITEM_ACTIVO: setItem.children[1].id,
    CLAVE_ICONO: claveIcono,
    ICONOS: Object.fromEntries(setIcono.children.map(c => [c.name.split("=")[1], c.id])),
    tarjeta: Object.fromEntries(setTarjeta.children.map(c => [c.name.split("=")[1], c.id])),
    burbuja: Object.fromEntries(setBurbuja.children.map(c => [c.name.split("=")[1], c.id])),
    barra:   Object.fromEntries(setBarra.children.map(c => [c.name.split("=")[1], c.id])),
    panel:   Object.fromEntries(setPanel.children.map(c => [c.name.split("=")[1], c.id])),
    fila:    Object.fromEntries(setFila.children.map(c => [c.name.split("=")[1], c.id])),
    advertencia: compAv.id,
    props: {
      tarjeta: Object.keys(setTarjeta.componentPropertyDefinitions),
      panel:   Object.keys(setPanel.componentPropertyDefinitions),
      fila:    Object.keys(setFila.componentPropertyDefinitions)
    }
  }
};
