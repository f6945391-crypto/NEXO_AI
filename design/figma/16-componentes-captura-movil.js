// 16 · Componentes móviles nuevos: navegación y capa de captura.
// Se ejecuta sobre la página "02 Componentes · Móvil".
// >>> Pegar aquí el contenido de _helpers.js <<<
//
// Cuatro componentes nuevos. Borra por nombre, así que es repetible.
// Los cuatro de móvil que ya existían (Botón, Tarjeta de evento, Burbuja,
// Barra de entrada) NO se tocan.

const pagina = figma.root.children.find(p => p.name === "02 Componentes · Móvil");
await figma.setCurrentPageAsync(pagina);
await figma.loadFontAsync({ family:"Inter", style:"Semi Bold" });
await figma.loadFontAsync({ family:"Inter", style:"Regular" });

const NOMBRES = ["Móvil / Pestañas","Móvil / Chip","Móvil / Fila de extracción","Móvil / Tarjeta de captura","Móvil / Aviso"];

// ---- Móvil / Pestañas ----------------------------------------------
// Lo que faltaba en TODO el proyecto: desde cualquier pantalla hay que ver
// qué otras secciones existen. Cuatro destinos, una variante por activa.
// Las marcas son geométricas y provisionales, igual que en web.
//   Hoy · Agenda · Tareas · Actividad
// Barra de 390 de ancho, anclada a y=756, con borde superior borde/base.
for (const n of pagina.findAllWithCriteria({ types:["COMPONENT","COMPONENT_SET"] }))
  if (NOMBRES.indexOf(n.name) !== -1) n.remove();

const ANCHO = 342;   // 390 del marco menos 24 de margen a cada lado

// ---- Móvil / Chip -------------------------------------------------------
// OJO: la etiqueta DEBE ajustar a varias líneas. Si nace con
// textAutoResize WIDTH_AND_HEIGHT, una sugerencia larga estira el chip
// fuera de la columna. Pasó, y se ve mal.
//
// Y SIN borde, con el texto en tono de texto y no de marca: tres cajas con
// texto azul apiladas se leen como tres enlaces, no como tres sugerencias.
// El azul marca UNA pieza por pantalla, que es el botón primario.
const vChip = [];
for (const e of [
  { estado:"Reposo",    fondo:"superficie/base",    borde:"borde/base", color:"marca/base" },
  { estado:"Activo",    fondo:"marca/suave",        borde:"marca/base", color:"marca/base" },
  { estado:"Bloqueado", fondo:"superficie/hundida", borde:"borde/base", color:"texto/suave" }]) {
  const c = figma.createAutoLayout("HORIZONTAL", { name:"Estado="+e.estado, itemSpacing:8 });
  c.set({ paddingTop:12, paddingRight:16, paddingBottom:12, paddingLeft:16, counterAxisAlignItems:"CENTER" });
  fill(c, e.fondo); line(c, e.borde); radio(c, "radio/pill");
  const t = T("Delega a Vasco el presupuesto", "Semi Bold", "tam/etiqueta", e.color, ANCHO - 32);
  t.name = "Etiqueta";
  c.appendChild(t);
  const comp = figma.createComponentFromNode(c);
  comp.layoutSizingHorizontal = "FIXED";
  comp.resize(ANCHO, comp.height);
  t.layoutSizingHorizontal = "FILL";
  comp.layoutSizingVertical = "HUG";
  vChip.push(comp);
}
const setChip = figma.combineAsVariants(vChip, pagina);
setChip.name = "Móvil / Chip";
setChip.x = 40; setChip.y = 1400;
setChip.layoutMode = "VERTICAL";
setChip.set({ itemSpacing:16, paddingTop:20, paddingBottom:20, paddingLeft:20, paddingRight:20 });
const cvChip = setChip.addComponentProperty("Etiqueta", "TEXT", "Delega a Vasco el presupuesto");
for (const c of setChip.children) c.children[0].componentPropertyReferences = { characters: cvChip };

// ---- Móvil / Fila de extracción ----------------------------------------
// Una intención sacada de una nota de voz o de una foto. El estado
// Dudosa es obligatorio: lo que no se entendió con certeza se marca.
const vFila = [];
for (const e of [
  { estado:"Aceptada",   marca:"estado/exito",       fondo:"superficie/base" },
  { estado:"Dudosa",     marca:"estado/advertencia", fondo:"estado/advertencia-suave" },
  { estado:"Descartada", marca:"borde/fuerte",       fondo:"superficie/hundida" }]) {
  const f = figma.createAutoLayout("HORIZONTAL", { name:"Estado="+e.estado, itemSpacing:12 });
  f.set({ paddingTop:14, paddingRight:16, paddingBottom:14, paddingLeft:14, counterAxisAlignItems:"CENTER" });
  fill(f, e.fondo); line(f, "borde/base"); radio(f, "radio/md");
  const marca = figma.createRectangle();
  marca.resize(4, 34); fill(marca, e.marca); marca.cornerRadius = 2; marca.name = "Marca";
  f.appendChild(marca);
  const med = figma.createAutoLayout("VERTICAL", { name:"Texto", itemSpacing:3 });
  med.fills = [];
  const t1 = T("Cita con el dentista", "Semi Bold", "tam/etiqueta", "texto/fuerte", ANCHO-90);
  const t2 = T("Compromiso · jueves 2, 16:00", "Regular", "tam/micro", "texto/suave", ANCHO-90);
  t1.name = "Texto"; t2.name = "Detalle";
  med.appendChild(t1); med.appendChild(t2);
  f.appendChild(med);
  const comp = figma.createComponentFromNode(f);
  comp.resize(ANCHO, comp.height);
  med.layoutSizingHorizontal = "FILL";
  t1.layoutSizingHorizontal = "FILL"; t2.layoutSizingHorizontal = "FILL";
  vFila.push(comp);
}
const setFila = figma.combineAsVariants(vFila, pagina);
setFila.name = "Móvil / Fila de extracción";
setFila.x = 40; setFila.y = 1620;
setFila.layoutMode = "VERTICAL";
setFila.set({ itemSpacing:16, paddingTop:20, paddingBottom:20, paddingLeft:20, paddingRight:20 });
const cvFT = setFila.addComponentProperty("Texto", "TEXT", "Cita con el dentista");
const cvFD = setFila.addComponentProperty("Detalle", "TEXT", "Compromiso · jueves 2, 16:00");
for (const c of setFila.children) {
  c.children[1].children[0].componentPropertyReferences = { characters: cvFT };
  c.children[1].children[1].componentPropertyReferences = { characters: cvFD };
}

// ---- Móvil / Tarjeta de captura ----------------------------------------
// Destino ÚNICO de toda captura, venga de texto, voz o cámara.
// Los botones no van dentro: se componen debajo con Móvil / Botón.
const vTar = [];
for (const x of [
  { t:"Compromiso",           acento:"marca/base" },
  { t:"Tarea",                acento:"agente/base" },
  { t:"Pendiente sin fecha",  acento:"estado/advertencia" },
  { t:"Esperando de alguien", acento:"estado/exito" },
  { t:"Error",                acento:"estado/error" }]) {
  const tar = figma.createAutoLayout("VERTICAL", { name:"Tipo="+x.t, itemSpacing:0 });
  tar.set({ paddingTop:0, paddingRight:0, paddingBottom:16, paddingLeft:0 });
  fill(tar, "superficie/elevada"); line(tar, "borde/base"); radio(tar, "radio/md");
  tar.clipsContent = true;
  const barra = figma.createRectangle();
  barra.resize(ANCHO, 4); fill(barra, x.acento);
  tar.appendChild(barra); barra.layoutSizingHorizontal = "FILL";
  const cont = figma.createAutoLayout("VERTICAL", { name:"Contenido", itemSpacing:6 });
  cont.set({ paddingTop:14, paddingRight:18, paddingBottom:0, paddingLeft:18 });
  cont.fills = [];
  tar.appendChild(cont); cont.layoutSizingHorizontal = "FILL";
  const et = T(x.t, "Semi Bold", "tam/micro", x.acento, ANCHO-36);
  const ti = T("Cita con el dentista", "Semi Bold", "tam/cuerpo", "texto/fuerte", ANCHO-36);
  const de = T("Jueves 2 de octubre, 16:00 a 17:00 · hora de Perú (GMT-5)", "Regular", "tam/etiqueta", "texto/suave", ANCHO-36);
  et.name = "Clase"; ti.name = "Título"; de.name = "Detalle";
  cont.appendChild(et); cont.appendChild(ti); cont.appendChild(de);
  et.layoutSizingHorizontal = "FILL"; ti.layoutSizingHorizontal = "FILL"; de.layoutSizingHorizontal = "FILL";
  const c = figma.createComponentFromNode(tar);
  c.resize(ANCHO, c.height);
  vTar.push(c);
}
const setTar = figma.combineAsVariants(vTar, pagina);
setTar.name = "Móvil / Tarjeta de captura";
setTar.x = 440; setTar.y = 1400;
setTar.layoutMode = "VERTICAL";
setTar.set({ itemSpacing:20, paddingTop:20, paddingBottom:20, paddingLeft:20, paddingRight:20 });
const cvTC = setTar.addComponentProperty("Clase", "TEXT", "Compromiso");
const cvTT = setTar.addComponentProperty("Título", "TEXT", "Cita con el dentista");
const cvTD = setTar.addComponentProperty("Detalle", "TEXT", "Jueves 2 de octubre, 16:00 a 17:00 · hora de Perú (GMT-5)");
for (const c of setTar.children) {
  const k = c.children[1];
  k.children[0].componentPropertyReferences = { characters: cvTC };
  k.children[1].componentPropertyReferences = { characters: cvTT };
  k.children[2].componentPropertyReferences = { characters: cvTD };
}

// ---- Móvil / Aviso ------------------------------------------------------
// Los tres estados de REQ-CAP-23. NO pueden parecerse entre sí:
// en espera (todo bien), fallo (algo se rompió), fuera del plan (oferta).
const vAv = [];
for (const a of [
  { t:"En espera",      fondo:"superficie/hundida", borde:"borde/base",   color:"texto/suave" },
  { t:"Fallo",          fondo:"estado/error-suave", borde:"estado/error", color:"estado/error" },
  { t:"Fuera del plan", fondo:"marca/suave",        borde:"marca/base",   color:"marca/base" }]) {
  const av = figma.createAutoLayout("VERTICAL", { name:"Tipo="+a.t, itemSpacing:5 });
  av.set({ paddingTop:16, paddingRight:18, paddingBottom:16, paddingLeft:18 });
  fill(av, a.fondo); line(av, a.borde); radio(av, "radio/md");
  const t1 = T("Guardada, sin conexión", "Semi Bold", "tam/etiqueta", a.color, ANCHO-36);
  const t2 = T("Se procesa en cuanto vuelvas a tener señal.", "Regular", "tam/micro", "texto/suave", ANCHO-36);
  t1.name = "Título"; t2.name = "Detalle";
  av.appendChild(t1); av.appendChild(t2);
  const c = figma.createComponentFromNode(av);
  c.resize(ANCHO, c.height);
  t1.layoutSizingHorizontal = "FILL"; t2.layoutSizingHorizontal = "FILL";
  vAv.push(c);
}
const setAv = figma.combineAsVariants(vAv, pagina);
setAv.name = "Móvil / Aviso";
setAv.x = 440; setAv.y = 1900;
setAv.layoutMode = "VERTICAL";
setAv.set({ itemSpacing:20, paddingTop:20, paddingBottom:20, paddingLeft:20, paddingRight:20 });
const cvAT = setAv.addComponentProperty("Título", "TEXT", "Guardada, sin conexión");
const cvAD = setAv.addComponentProperty("Detalle", "TEXT", "Se procesa en cuanto vuelvas a tener señal.");
for (const c of setAv.children) {
  c.children[0].componentPropertyReferences = { characters: cvAT };
  c.children[1].componentPropertyReferences = { characters: cvAD };
}

return {
  createdNodeIds: [setChip.id, setFila.id, setTar.id, setAv.id],
  clavesParaElScript17: {
    chip: Object.fromEntries(setChip.children.map(c => [c.name.split("=")[1], c.id])),
    fila: Object.fromEntries(setFila.children.map(c => [c.name.split("=")[1], c.id])),
    tarjeta: Object.fromEntries(setTar.children.map(c => [c.name.split("=")[1], c.id])),
    aviso: Object.fromEntries(setAv.children.map(c => [c.name.split("=")[1], c.id])),
    props: {
      chip: Object.keys(setChip.componentPropertyDefinitions),
      fila: Object.keys(setFila.componentPropertyDefinitions),
      tarjeta: Object.keys(setTar.componentPropertyDefinitions),
      aviso: Object.keys(setAv.componentPropertyDefinitions)
    }
  }
};
