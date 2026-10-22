// 06 · Sustituir las copias de los cuadros por instancias de los componentes.
// Requiere: 05-componentes.js ejecutado. Pasar los IDs que devolvió ese script.
// Conserva posición, ancho y textos de cada copia.

const IDS = {
  boton:   "PEGAR_ID_Móvil_Botón",
  tarjeta: "PEGAR_ID_Móvil_Tarjeta_de_evento",
  burbuja: "PEGAR_ID_Móvil_Burbuja",
  barra:   "PEGAR_ID_Móvil_Barra_de_entrada"
};

const pagina = figma.root.children.find(p => p.name.includes("Flujos · Móvil"));
await figma.setCurrentPageAsync(pagina);
await figma.loadFontAsync({family:"Inter",style:"Regular"});
await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});

const setBoton    = await figma.getNodeByIdAsync(IDS.boton);
const compTarjeta = await figma.getNodeByIdAsync(IDS.tarjeta);
const setBurbuja  = await figma.getNodeByIdAsync(IDS.burbuja);
const setBarra    = await figma.getNodeByIdAsync(IDS.barra);

// Las claves de propiedad llevan sufijo (#14:0), hay que leerlas en tiempo de ejecución.
const key = (nodo, pref) => Object.keys(nodo.componentPropertyDefinitions).find(k => k.startsWith(pref + "#"));
const kBotonTxt = key(setBoton,"Etiqueta"), kBurbTxt = key(setBurbuja,"Mensaje"), kBarraTxt = key(setBarra,"Texto");
const kHora = key(compTarjeta,"Hora"), kTitulo = key(compTarjeta,"Título");

const textos = n => n.findAll(x => x.type === "TEXT").map(x => x.characters);

// Recolectar antes de mutar: eliminar durante el recorrido rompe los índices.
const objetivos = [];
for (const cuadro of pagina.children)
  for (const n of cuadro.findAll(x => x.type === "FRAME")) {
    const nm = n.name;
    if (nm.startsWith("Botón / "))      objetivos.push({n, clase:"boton",   variante: nm.split(" / ")[1]});
    else if (nm === "Tarjeta / Evento") objetivos.push({n, clase:"tarjeta"});
    else if (nm.startsWith("Burbuja / ")) objetivos.push({n, clase:"burbuja", variante: nm.split(" / ")[1]});
    else if (nm === "Barra de entrada") objetivos.push({n, clase:"barra"});
  }

const reporte = { boton:0, tarjeta:0, burbuja:0, barra:0 };
for (const o of objetivos) {
  const n = o.n, padre = n.parent, idx = padre.children.indexOf(n);
  const { x, y, width } = n;
  const enAuto = padre.layoutMode && padre.layoutMode !== "NONE";
  const sizH = enAuto ? n.layoutSizingHorizontal : null;
  const txt = textos(n);

  let inst;
  if (o.clase === "boton") {
    inst = setBoton.defaultVariant.createInstance();
    inst.setProperties({ "Tipo": o.variante, [kBotonTxt]: txt[0] || "Acción" });
  } else if (o.clase === "tarjeta") {
    inst = compTarjeta.createInstance();
    inst.setProperties({ [kHora]: txt[0] || "", [kTitulo]: txt[1] || "" });
  } else if (o.clase === "burbuja") {
    inst = setBurbuja.defaultVariant.createInstance();
    inst.setProperties({ "Autor": o.variante, [kBurbTxt]: txt[0] || "" });
  } else {
    const t = txt[0] || "";
    const estado = t.includes("no disponible") ? "Deshabilitado" : t.includes("Agéndame") ? "Activo" : "Reposo";
    inst = setBarra.defaultVariant.createInstance();
    inst.setProperties({ "Estado": estado, [kBarraTxt]: t });
  }

  padre.insertChild(idx, inst);
  if (enAuto) { if (sizH) inst.layoutSizingHorizontal = sizH; }
  else { inst.resize(width, inst.height); inst.x = x; inst.y = y; }
  n.remove();
  reporte[o.clase]++;
}

return { instanciasCreadas: reporte, totalObjetivos: objetivos.length };
