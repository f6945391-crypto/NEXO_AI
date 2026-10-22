// 11 · CUN-05 Consultar disponibilidad de equipo — 8 cuadros web.
// Requiere: 08-componentes-web.js y 09-rejilla-disponibilidad.js.
// >>> Pegar aquí el contenido de _helpers-web.js <<<
//
// RN-CAL-01 quedó APROBADA el 26 de septiembre de 2026. Criterio final en
// specs/05-equipos/spec.md sección 1.
//
// DERIVA: estos cuadros se generaron con la versión anterior del criterio.
// Faltan dos estados que el criterio final exige:
//   1. consulta SIN duración indicada -> se muestran todos los bloques
//      libres comunes con su duración escrita (REQ-CUN05-04);
//   2. hay bloques comunes pero NINGUNO admite la duración pedida, que no
//      puede verse igual que «sin horario común» (REQ-CUN05-03 + sección 3).
// También cambia el pie de la rejilla: el desempate a igual hora de inicio
// es por mayor duración, y la zona horaria es la de quien consulta.

const IDS = { boton:"PEGAR_ID_Web_Botón", rejilla:"PEGAR_ID_Web_Rejilla_de_disponibilidad" };

const pagina = figma.root.children.find(p => p.name === "05 Flujos · Web");
await figma.setCurrentPageAsync(pagina);
for (const n of [...pagina.children]) if (n.name.startsWith("CUN-05")) n.remove();
await figma.loadFontAsync({family:"Inter",style:"Regular"});
await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});

const sBoton = await figma.getNodeByIdAsync(IDS.boton);
const sRejilla = await figma.getNodeByIdAsync(IDS.rejilla);
const kBt = Object.keys(sBoton.componentPropertyDefinitions).find(k => k.startsWith("Etiqueta#"));
const boton = (t,v) => { const i = sBoton.defaultVariant.createInstance(); i.setProperties({"Tipo":v,[kBt]:t}); return i; };
const rejilla = (e) => { const i = sRejilla.defaultVariant.createInstance(); i.setProperties({"Estado":e}); return i; };
const meter = (p,n) => { p.appendChild(n); n.layoutSizingHorizontal = "FILL"; return n; };

const CAB = { activo:"Reuniones", titulo:"Consultar disponibilidad", subtitulo:"Equipo de Plataforma" };

function selector(f, y0, participantes, duracion, rango, marcados) {
  const p = col("Panel / Participantes", 12, [20,20,20,20]);
  fill(p,"superficie/base"); line(p,"borde/base"); radio(p,"radio/md");
  p.appendChild(T("Participantes","Semi Bold","tam/cuerpo","texto/fuerte"));
  const chips = row("Chips", 8, [0,0,0,0]);
  for (const nom of participantes) {
    const c = row("Chip / Participante", 8, [8,12,8,12]);
    const aviso = marcados && marcados.includes(nom);
    fill(c, aviso ? "estado/advertencia-suave" : "marca/suave"); radio(c,"radio/pill");
    c.appendChild(T(nom,"Semi Bold","tam/micro", aviso ? "estado/advertencia" : "marca/base"));
    c.appendChild(T("×","Regular","tam/micro","texto/suave"));
    chips.appendChild(c);
  }
  const add = row("Chip / Añadir", 8, [8,12,8,12]);
  fill(add,"superficie/base"); line(add,"borde/fuerte"); radio(add,"radio/pill");
  add.appendChild(T("+ Añadir participante","Semi Bold","tam/micro","texto/suave"));
  chips.appendChild(add);
  p.appendChild(chips);
  const cond = row("Condiciones", 16, [0,0,0,0]);
  cond.appendChild(T("Duración: " + duracion,"Regular","tam/etiqueta","texto/suave"));
  cond.appendChild(T("Rango: " + rango,"Regular","tam/etiqueta","texto/suave"));
  p.appendChild(cond);
  return fija(f, p, 272, 140 + (y0||0), 1136);
}
const TRES = ["Vasco Bustamante","Aixa Alvarez","María Fernanda Quispe Huamán"];
const RANGO = "jueves 2 – viernes 3 de octubre";
const Y = 4200, Y2 = 5200;

// 01 Selección de participantes — REQ-CUN05-01
const r1 = pantalla(pagina,"CUN-05 / Web / Principal / 01 Selección de participantes",0,Y,CAB).f;
selector(r1, 0, ["Vasco Bustamante","Aixa Alvarez"], "60 minutos", RANGO);
const vac = col("Estado vacío", 8, [40,32,40,32]);
vac.set({counterAxisAlignItems:"CENTER"});
fill(vac,"superficie/base"); line(vac,"borde/base"); radio(vac,"radio/md");
const e1 = T("Añade a los participantes para ver su disponibilidad","Semi Bold","tam/cuerpo","texto/fuerte"); e1.textAlignHorizontal="CENTER";
const e2 = T("Se mostrarán los horarios libres comunes dentro del horario laboral de todos.","Regular","tam/etiqueta","texto/suave",520); e2.textAlignHorizontal="CENTER";
vac.appendChild(e1); vac.appendChild(e2); vac.appendChild(boton("Consultar disponibilidad","Primario"));
fija(r1, vac, 272, 300, 1136);

// 02 Consultando — estado de latencia. DEBE distinguirse de "sin coincidencia".
const r2 = pantalla(pagina,"CUN-05 / Web / Principal / 02 Consultando disponibilidad",1500,Y,CAB).f;
selector(r2, 0, TRES, "60 minutos", RANGO);
const carg = col("Esqueleto", 12, [20,20,20,20]);
fill(carg,"superficie/base"); line(carg,"borde/base"); radio(carg,"radio/md");
carg.appendChild(T("Consultando las agendas de los 3 participantes…","Regular","tam/etiqueta","texto/suave"));
for (let i=0;i<3;i++){ const b=figma.createRectangle(); b.resize(700,28); b.cornerRadius=6; fill(b,"superficie/hundida"); carg.appendChild(b); }
fija(r2, carg, 272, 300, 1136);

// 03 Alternativas encontradas — REQ-CUN05-03, 06, 07
const r3 = pantalla(pagina,"CUN-05 / Web / Principal / 03 Alternativas encontradas",3000,Y,CAB).f;
selector(r3, 0, TRES, "60 minutos", RANGO);
const g3 = rejilla("Con alternativas"); r3.appendChild(g3); g3.x = 272; g3.y = 300;
const lista3 = col("Alternativas", 8, [20,20,20,20]);
fill(lista3,"superficie/base"); line(lista3,"borde/base"); radio(lista3,"radio/md");
lista3.appendChild(T("Alternativas ordenadas","Semi Bold","tam/cuerpo","texto/fuerte"));
for (const [h,nota] of [["Jueves 2, 10:00 – 11:00","La más temprana dentro del horario laboral de todos"],["Jueves 2, 11:00 – 12:00","Segunda opción"]]) {
  const o = col("Opción / Horario", 2, [12,14,12,14]);
  fill(o,"superficie/elevada"); line(o,"borde/base"); radio(o,"radio/sm");
  o.appendChild(T(h,"Semi Bold","tam/etiqueta","texto/fuerte",300));
  o.appendChild(T(nota,"Regular","tam/micro","texto/suave",300));
  meter(lista3, o);
}
fija(r3, lista3, 1060, 300, 348);

// 04 Alternativa seleccionada — la entrega hacia CUN-06
const r4 = pantalla(pagina,"CUN-05 / Web / Principal / 04 Alternativa seleccionada",4500,Y,CAB).f;
selector(r4, 0, TRES, "60 minutos", RANGO);
const g4 = rejilla("Con alternativas"); r4.appendChild(g4); g4.x = 272; g4.y = 300;
const sel = col("Panel / Selección", 12, [20,20,20,20]);
fill(sel,"superficie/base"); line(sel,"borde/fuerte"); radio(sel,"radio/md");
sel.appendChild(T("Jueves 2, 10:00 – 11:00","Semi Bold","tam/cuerpo-grande","texto/fuerte",300));
sel.appendChild(T("Los 3 participantes están libres · GMT-5","Regular","tam/etiqueta","texto/suave",300));
sel.appendChild(T("Esta consulta no crea ninguna reunión.","Regular","tam/micro","texto/suave",300));
const acc4 = col("Acciones", 8, [0,0,0,0]);
meter(acc4, boton("Coordinar reunión aquí","Primario"));
meter(acc4, boton("Ver otra alternativa","Texto"));
meter(sel, acc4);
fija(r4, sel, 1060, 300, 348);

// FA-01 Participantes modificados — REQ-CUN05-10
const a1 = pantalla(pagina,"CUN-05 / Web / FA-01 / 01 Participantes modificados",0,Y2,CAB).f;
selector(a1, 0, ["Vasco Bustamante","Aixa Alvarez"], "60 minutos", RANGO);
const avA = row("Aviso", 10, [12,16,12,16]); fill(avA,"marca/suave"); radio(avA,"radio/sm");
avA.appendChild(T("Quitaste a María Fernanda Quispe Huamán. Recalculando con 2 participantes.","Semi Bold","tam/etiqueta","marca/base",900));
fija(a1, avA, 272, 300, 1136);
const gA = rejilla("Con alternativas"); a1.appendChild(gA); gA.x = 272; gA.y = 360;

// EX-01 Disponibilidad parcial — REQ-CUN05-08
const x1 = pantalla(pagina,"CUN-05 / Web / EX-01 / 01 Disponibilidad parcial",1500,Y2,CAB).f;
selector(x1, 0, TRES, "60 minutos", RANGO, ["María Fernanda Quispe Huamán"]);
const avX = col("Aviso / Parcial", 6, [14,16,14,16]); fill(avX,"estado/advertencia-suave"); radio(avX,"radio/sm");
avX.appendChild(T("Resultado parcial","Semi Bold","tam/cuerpo","estado/advertencia",900));
avX.appendChild(T("María Fernanda Quispe Huamán no ha concedido permiso de calendario. No se cuenta como libre: las alternativas mostradas solo confirman a 2 de 3 participantes.","Regular","tam/etiqueta","texto/fuerte",900));
fija(x1, avX, 272, 300, 1136);
const gX = rejilla("Datos parciales"); x1.appendChild(gX); gX.x = 272; gX.y = 390;

// EX-02 Sin horario común — REQ-CUN05-09 (RN-ER-01)
const x2 = pantalla(pagina,"CUN-05 / Web / EX-02 / 01 Sin horario común",3000,Y2,CAB).f;
selector(x2, 0, TRES, "60 minutos", "jueves 2 de octubre");
const gY = rejilla("Sin coincidencia"); x2.appendChild(gY); gY.x = 272; gY.y = 300;
const salidas = col("Panel / Salidas", 12, [20,20,20,20]);
fill(salidas,"superficie/base"); line(salidas,"borde/base"); radio(salidas,"radio/md");
salidas.appendChild(T("¿Qué quieres hacer?","Semi Bold","tam/cuerpo","texto/fuerte",300));
const acc = col("Acciones", 8, [0,0,0,0]);
for (const [t,v] of [["Ampliar el rango de fechas","Primario"],["Quitar un participante","Secundario"],["Reducir la duración","Secundario"],["Cancelar","Texto"]])
  meter(acc, boton(t,v));
meter(salidas, acc);
fija(x2, salidas, 1060, 300, 348);

// Transversal / Modo degradado — la disponibilidad es cálculo determinista:
// funciona igual sin el modelo de lenguaje. Es el punto del principio 3
// de la constitución hecho interfaz.
const rT = pantalla(pagina,"CUN-05 / Web / Transversal / Modo degradado",4500,Y2,
  {...CAB, degradado:"El asistente no está disponible. La disponibilidad se calcula igual: es cálculo determinista, no interpretación."});
const t1 = rT.f, off = rT.y0;
selector(t1, off, TRES, "60 minutos", RANGO);
const gT = rejilla("Con alternativas"); t1.appendChild(gT); gT.x = 272; gT.y = 300 + off;
const notaT = row("Aviso", 10, [12,16,12,16]); fill(notaT,"superficie/base"); line(notaT,"borde/base"); radio(notaT,"radio/sm");
notaT.appendChild(T("Sin el asistente no hay resúmenes ni sugerencias en lenguaje natural, pero la rejilla y la selección funcionan igual.","Regular","tam/micro","texto/suave",330));
fija(t1, notaT, 1060, 300 + off, 348);

return { cuadros: pagina.children.filter(c => c.name.startsWith("CUN-05")).map(c => c.name) };
