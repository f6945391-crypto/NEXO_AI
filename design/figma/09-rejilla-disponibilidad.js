// 09 · Web / Rejilla de disponibilidad — el componente central de CUN-05.
// Requiere: 01-variables.js. Página "03 Componentes · Web".
//
// Es la representación visual de RN-CAL-01. Tres estados obligatorios:
//   Con alternativas · Sin coincidencia · Datos parciales
// El error a evitar es que "no hay horario común" se vea igual que
// "todavía no he calculado". Por eso Sin coincidencia lleva aviso explícito
// y nunca es una rejilla vacía.

const pag = figma.root.children.find(p => p.name === "03 Componentes · Web");
await figma.setCurrentPageAsync(pag);
await figma.loadFontAsync({family:"Inter",style:"Regular"});
await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});
for (const n of [...pag.children]) if (n.name === "Web / Rejilla de disponibilidad") n.remove();

const vars = await figma.variables.getLocalVariablesAsync();
const V = Object.fromEntries(vars.map(v=>[v.name,v]));
const paint=n=>figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}},"color",V[n]);
const radio=(d,r)=>{for(const k of["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"])d.setBoundVariable(k,V[r]);};
function T(s,e,t,c,w){const x=figma.createText();x.fontName={family:"Inter",style:e};if(w){x.resize(w,16);x.textAutoResize="HEIGHT";}x.characters=s;x.setBoundVariable("fontSize",V[t]);x.fills=[paint(c)];return x;}

// 08:00 a 17:00. El horario laboral empieza a las 09:00, así que la primera
// columna se atenúa: está fuera de banda horaria: libre pero NO alternativa (RN-CAL-01).
const HORAS = ["08","09","10","11","12","13","14","15","16","17"];
const ANCHO_NOMBRE = 200, ANCHO_COL = 52, ALTO_FILA = 40;
const ANCHO = ANCHO_NOMBRE + HORAS.length * ANCHO_COL;

const BASE = [
  { n:"Vasco Bustamante",             ocupado:[0,1,5,6] },
  { n:"Aixa Alvarez",                 ocupado:[0,4,5,8,9] },
  { n:"María Fernanda Quispe Huamán", ocupado:[1,5,6,7] }
];

function construir(variante) {
  const parts = BASE.map(p => ({...p}));
  let bandas = [];
  if (variante === "Con alternativas") bandas = [2, 3];
  if (variante === "Datos parciales")  { parts[2].sinDatos = true; bandas = [2, 3]; }
  if (variante === "Sin coincidencia") parts.forEach((p,i) => { p.ocupado = [0,1,2,3,4,5,6,7,8,9].filter(h => (h + i) % 3 !== 2); });

  const f = figma.createFrame();
  f.name = "Rejilla de disponibilidad";
  f.resize(ANCHO, 0);
  f.fills = [paint("superficie/base")];
  f.strokes = [paint("borde/base")]; f.strokeWeight = 1;
  radio(f,"radio/md"); f.clipsContent = true;
  pag.appendChild(f);

  let y = 16;
  const tit = T("Disponibilidad del equipo","Semi Bold","tam/cuerpo","texto/fuerte");
  tit.x = 16; tit.y = y; f.appendChild(tit);
  // La zona horaria va SIEMPRE visible: REQ-CUN05-07.
  const hus = T("Horarios en GMT-5 (Lima) · jueves 2 de octubre","Regular","tam/micro","texto/suave");
  hus.x = 16; hus.y = y + 22; f.appendChild(hus);
  y += 54;

  // Banda de coincidencia: va ANTES que las filas para quedar por debajo.
  for (const b of bandas) {
    const r = figma.createRectangle();
    r.name = "Banda / Coincidencia";
    r.resize(ANCHO_COL, 22 + parts.length * ALTO_FILA + 8);
    r.x = ANCHO_NOMBRE + b * ANCHO_COL; r.y = y;
    r.fills = [paint("estado/exito-suave")];
    f.appendChild(r);
  }
  const fuera = figma.createRectangle();
  fuera.name = "Fuera de horario";
  fuera.resize(ANCHO_COL, 22 + parts.length * ALTO_FILA + 8);
  fuera.x = ANCHO_NOMBRE; fuera.y = y;
  fuera.fills = [paint("superficie/hundida")];
  f.appendChild(fuera);

  HORAS.forEach((h,i) => {
    const t = T(h + ":00","Regular","tam/micro","texto/suave");
    t.x = ANCHO_NOMBRE + i * ANCHO_COL + 6; t.y = y;
    f.appendChild(t);
  });
  y += 22;

  for (const p of parts) {
    const nom = T(p.n,"Semi Bold","tam/micro", p.sinDatos ? "texto/suave" : "texto/fuerte", ANCHO_NOMBRE - 24);
    nom.x = 16; nom.y = y + 10;
    f.appendChild(nom);

    if (p.sinDatos) {
      // Tramado + etiqueta. Nunca una fila vacía: vacío se lee como "libre".
      const r = figma.createRectangle();
      r.name = "Sin datos";
      r.resize(HORAS.length * ANCHO_COL - 4, ALTO_FILA - 10);
      r.x = ANCHO_NOMBRE + 2; r.y = y + 4;
      r.fills = [paint("superficie/hundida")];
      r.strokes = [paint("borde/fuerte")]; r.strokeWeight = 1; r.dashPattern = [4,4];
      r.cornerRadius = 4;
      f.appendChild(r);
      const et = T("Sin permiso de calendario · no cuenta como libre","Regular","tam/micro","estado/advertencia");
      et.x = ANCHO_NOMBRE + 10; et.y = y + 14;
      f.appendChild(et);
    } else {
      for (const h of p.ocupado) {
        const r = figma.createRectangle();
        r.name = "Bloque / Ocupado";
        r.resize(ANCHO_COL - 4, ALTO_FILA - 10);
        r.x = ANCHO_NOMBRE + h * ANCHO_COL + 2; r.y = y + 4;
        r.fills = [paint("marca/suave")];
        r.strokes = [paint("marca/base")]; r.strokeWeight = 1;
        r.cornerRadius = 4;
        f.appendChild(r);
      }
    }
    y += ALTO_FILA;
  }

  y += 10;
  if (variante === "Sin coincidencia") {
    const av = figma.createFrame();
    av.name = "Aviso / Sin coincidencia";
    av.resize(ANCHO - 32, 44); av.x = 16; av.y = y;
    av.fills = [paint("estado/advertencia-suave")]; av.cornerRadius = 8;
    f.appendChild(av);
    const t = T("No hay ningún horario libre para los tres dentro del horario laboral.","Semi Bold","tam/etiqueta","estado/advertencia", ANCHO - 64);
    t.x = 28; t.y = y + 13; f.appendChild(t);
    y += 56;
  } else {
    const t = T(bandas.length + " alternativas encontradas · la más temprana primero (RN-CAL-01)","Regular","tam/micro","texto/suave");
    t.x = 16; t.y = y; f.appendChild(t);
    y += 26;
  }
  f.resize(ANCHO, y + 6);
  return f;
}

const comps = [];
for (const v of ["Con alternativas","Sin coincidencia","Datos parciales"]) {
  const f = construir(v);
  const c = figma.createComponentFromNode(f);
  c.name = "Estado=" + v;
  comps.push(c);
}
const set = figma.combineAsVariants(comps, pag);
set.name = "Web / Rejilla de disponibilidad";
set.description = "Representación visual de RN-CAL-01. Tres estados obligatorios. «Sin coincidencia» nunca puede verse como una rejilla vacía: el usuario tiene que distinguirlo de «todavía no he calculado». La primera columna aparece atenuada porque está fuera del horario laboral y no es alternativa válida aunque esté libre.";
set.x = 80; set.y = 700;
set.layoutMode = "VERTICAL"; set.itemSpacing = 24;
set.paddingTop = 24; set.paddingBottom = 24; set.paddingLeft = 24; set.paddingRight = 24;
set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";

return { componente: set.name, id: set.id, variantes: set.children.map(c => c.name) };
