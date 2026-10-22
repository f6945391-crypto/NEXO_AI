// 17 · Los 14 cuadros de la página "07 Móvil v2 · Estructura y recorrido".
// >>> Pegar aquí el contenido de _helpers.js <<<
//
// Requiere 16-componentes-captura-movil.js (Pestañas, Chip, Fila, Tarjeta, Aviso).
// NO toca los 13 cuadros de CUN-01 de la página 04.
//
// Todo lo de aquí sale de design/ARQUITECTURA-VISUAL-MOVIL.md, que a su vez
// se midió de los cuadros del 04. Si algo contradice al 04, manda el 04.

const M = 20, ANCHO = 350, Y_PEST = 756, Y_BARRA = 699, VELO = 0.16;

const C = {
  evento:   await figma.getNodeByIdAsync("15:5"),
  burbUsr:  await figma.getNodeByIdAsync("15:8"),
  barra:    await figma.getNodeByIdAsync("16:4"),
  barraDes: await figma.getNodeByIdAsync("16:10"),
  btnPrim:  await figma.getNodeByIdAsync("14:5"),
  btnSec:   await figma.getNodeByIdAsync("14:8"),
  btnTxt:   await figma.getNodeByIdAsync("14:11"),
  filaAcep: await figma.getNodeByIdAsync("PEGAR_ID_Fila_Aceptada"),
  filaDud:  await figma.getNodeByIdAsync("PEGAR_ID_Fila_Dudosa"),
  pest: { Hoy: await figma.getNodeByIdAsync("PEGAR_ID_Pestanas_Hoy"),
          Agenda: await figma.getNodeByIdAsync("PEGAR_ID_Pestanas_Agenda"),
          Tareas: await figma.getNodeByIdAsync("PEGAR_ID_Pestanas_Tareas"),
          Actividad: await figma.getNodeByIdAsync("PEGAR_ID_Pestanas_Actividad") }
};
const P = { evH:"Hora#15:0", evT:"Título#15:1", barra:"Texto#16:0",
            burb:"Mensaje#15:2", btn:"Etiqueta#14:0",
            filaT:"Texto#…", filaD:"Detalle#…" };

const hoja = figma.root.children.find(p => p.name.indexOf("07 Móvil v2") === 0);
await figma.setCurrentPageAsync(hoja);
await figma.loadFontAsync({ family:"Inter", style:"Semi Bold" });
await figma.loadFontAsync({ family:"Inter", style:"Regular" });
for (const c of hoja.children.slice()) if (c.name.indexOf("MOV-v2 /") === 0) c.remove();

// appendChild NO devuelve el nodo. Guardarlo antes o encadenar rompe.
function pon(padre, nodo) { padre.appendChild(nodo); nodo.layoutSizingHorizontal = "FILL"; return nodo; }

// Armazón móvil: fondo BLANCO, cabecera SIN caja, pestañas siempre visibles.
function pantalla(nombre, x, y, titulo, sub, activa, barra) {
  const f = figma.createFrame();
  f.name = nombre; f.resize(390, 844); f.x = x; f.y = y;
  fill(f, "superficie/base"); f.clipsContent = true;
  hoja.appendChild(f);

  const cab = figma.createAutoLayout("VERTICAL", { name:"Encabezado", itemSpacing:4 });
  cab.set({ paddingTop:56, paddingRight:M, paddingBottom:16, paddingLeft:M });
  cab.fills = [];                                   // la cabecera NO es una caja
  const t1 = T(titulo, "Semi Bold", "tam/titulo", "texto/fuerte", ANCHO);
  const t2 = T(sub, "Regular", "tam/etiqueta", "texto/suave", ANCHO);
  cab.appendChild(t1); cab.appendChild(t2);
  fija(f, cab, 0, 0, 390);
  t1.layoutSizingHorizontal = "FILL"; t2.layoutSizingHorizontal = "FILL";

  const cont = figma.createAutoLayout("VERTICAL", { name:"Contenido", itemSpacing:12 });
  cont.set({ paddingTop:4 }); cont.fills = [];
  fija(f, cont, M, cab.height, ANCHO);

  if (barra) {
    const b = (barra === "degradada" ? C.barraDes : C.barra).createInstance();
    b.setProperties({ [P.barra]: barra === "degradada"
      ? "El asistente no responde · puedes escribir igual"
      : "Escribe o pulsa el micrófono" });
    fija(f, b, M, Y_BARRA, ANCHO);
  }
  fija(f, C.pest[activa].createInstance(), 0, Y_PEST, 390);
  return { f, cont };
}

// La capa de captura sube SOBRE la sección y no navega a otra pantalla.
// Por eso el velo es suave: si tapa el fondo, deja de ser una capa.
//
// OJO: hay que crear una pintura NUEVA por nodo. Reutilizar el mismo
// objeto de pintura en varios nodos PIERDE la opacidad (queda en 1) y el
// velo sale casi negro. Costó un ciclo entero descubrirlo.
function capa(f, altura) {
  const velo = figma.createRectangle();
  velo.name = "Velo"; velo.resize(390, 844); velo.x = 0; velo.y = 0;
  velo.fills = [figma.variables.setBoundVariableForPaint(
    { type:"SOLID", color:{r:0,g:0,b:0}, opacity:VELO }, "color", V["superficie/velo"])];
  f.appendChild(velo);

  const c = figma.createAutoLayout("VERTICAL", { name:"Capa de captura", itemSpacing:14 });
  c.set({ paddingTop:14, paddingRight:M, paddingBottom:28, paddingLeft:M });
  fill(c, "superficie/base");
  for (const k of ["topLeftRadius","topRightRadius"]) c.setBoundVariable(k, V["radio/lg"]);
  f.appendChild(c);
  c.layoutSizingHorizontal = "FIXED"; c.resize(390, altura);
  c.x = 0; c.y = 844 - altura;
  const asa = figma.createRectangle();
  asa.resize(44, 4); fill(asa, "borde/fuerte"); asa.cornerRadius = 2; asa.name = "Asa";
  c.appendChild(asa); asa.layoutAlign = "CENTER";
  return c;
}

// Botones SIEMPRE a ancho completo y apilados. «Cancelar» es de texto,
// nunca destructivo: el rojo se reserva para borrar algo que existe.
function acciones(cap, pares) {
  const a = figma.createAutoLayout("VERTICAL", { name:"Acciones", itemSpacing:8 });
  a.fills = []; pon(cap, a);
  for (const [comp, et] of pares) {
    const b = comp.createInstance(); b.setProperties({ [P.btn]: et }); pon(a, b);
  }
}

// Datos estructurados en pares etiqueta / valor alineados. NUNCA en una
// línea corrida con puntos: eso vale para un pie, no para lo que hay que
// revisar antes de confirmar.
function datos(cap, pares) {
  const d = figma.createAutoLayout("VERTICAL", { name:"Datos", itemSpacing:10 });
  d.fills = []; pon(cap, d);
  for (const [et, val] of pares) {
    const fila = figma.createAutoLayout("HORIZONTAL", { name:"Dato", itemSpacing:10 });
    fila.fills = [];
    const a = T(et, "Regular", "tam/etiqueta", "texto/suave", 106);
    const b = T(val, "Semi Bold", "tam/etiqueta", "texto/fuerte", 194);
    fila.appendChild(a); fila.appendChild(b);
    pon(d, fila);
    a.layoutSizingHorizontal = "FIXED"; a.resize(106, a.height);
    b.layoutSizingHorizontal = "FILL";
  }
}

// Bloque de estado: tinte del estado, SIN borde. El color ya separa.
function tinte(cont, fondo, colorTit, titulo, cuerpo) {
  const b = figma.createAutoLayout("VERTICAL", { name:"Aviso", itemSpacing:6 });
  b.set({ paddingTop:14, paddingRight:16, paddingBottom:14, paddingLeft:16 });
  fill(b, fondo); radio(b, "radio/md");
  const t1 = T(titulo, "Semi Bold", "tam/etiqueta", colorTit, ANCHO-32);
  const t2 = T(cuerpo, "Regular", "tam/etiqueta", "texto/fuerte", ANCHO-32);
  b.appendChild(t1); b.appendChild(t2); pon(cont, b);
  t1.layoutSizingHorizontal = "FILL"; t2.layoutSizingHorizontal = "FILL";
}
function bloque(cont, apoyo, titulo) {
  const i = C.evento.createInstance();
  pon(cont, i);
  i.setProperties({ [P.evH]: apoyo, [P.evT]: titulo });
  return i;
}

// ===== Estructura · 4 cuadros ===========================================
// Las cuatro secciones. Hasta ahora no había forma de saber que existían.
//   01 Hoy · 02 Agenda · 03 Tareas · 04 Actividad

// ===== Recorrido · 5 cuadros ============================================
// UNA sola historia seguida, que es lo que le faltaba al boceto anterior:
//   01 Hoy antes
//   02 Grabando            → capa sobre Hoy
//   03 Encontré tres cosas → lista aceptable por partes, lo dudoso marcado
//   04 Confirmar           → pares etiqueta/valor y botones apilados
//   05 Hoy después         → vuelve a la sección y el resultado está ahí

// ===== Estados · 3 cuadros ==============================================
// Los tres que NO pueden parecerse entre sí:
//   01 En espera sin conexión  → tinte hundido: todo bien, hay que esperar
//   02 No pude procesarla      → tinte de error: algo se rompió
//   03 Fuera del plan          → tinte de marca: es una oferta

// ===== Excepciones · 2 cuadros ==========================================
//   01 No cabe ese día          → no se fuerza, queda pendiente, y se dice
//   02 Asistente no disponible  → banner y camino manual operativo

return { cuadros: hoja.children.map(c => c.name) };
