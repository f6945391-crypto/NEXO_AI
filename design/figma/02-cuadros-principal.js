// 02 · Flujo principal de CUN-01 (móvil), cuadros 01 a 06.
// Requiere: 01-variables.js ejecutado.
// Idempotente: vacía la página de flujos antes de construir.
// >>> Pegar aquí el contenido de _helpers.js <<<

const pagina = figma.root.children.find(p => p.name.includes("Flujos · Móvil"));
await figma.setCurrentPageAsync(pagina);
for (const n of [...pagina.children]) n.remove();

await figma.loadFontAsync({family:"Inter",style:"Regular"});
await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});

function barra(f, texto, activo){
  const b = row("Barra de entrada", 8, [12,12,12,16]);
  radio(b, "radio/pill");
  fill(b, "superficie/elevada"); line(b, activo ? "borde/fuerte" : "borde/base");
  b.appendChild(T(texto, "Regular", "tam/cuerpo", activo ? "texto/fuerte" : "texto/suave", 280));
  return fija(f, b, 20, 760, 350);
}
function boton(txt, variante){
  const b = row("Botón / " + variante, 8, [14,20,14,20]);
  b.primaryAxisAlignItems = "CENTER"; radio(b, "radio/md");
  if (variante === "Primario")    { fill(b,"marca/base");      b.appendChild(T(txt,"Semi Bold","tam/cuerpo","texto/inverso")); }
  else if (variante === "Destructivo") { fill(b,"estado/error"); b.appendChild(T(txt,"Semi Bold","tam/cuerpo","texto/inverso")); }
  else if (variante === "Secundario")  { fill(b,"superficie/base"); line(b,"borde/fuerte"); b.appendChild(T(txt,"Semi Bold","tam/cuerpo","texto/fuerte")); }
  else { fill(b,"superficie/base"); b.appendChild(T(txt,"Semi Bold","tam/cuerpo","texto/suave")); }
  return b;
}
function tarjetaEvento(hora, titulo){
  const c = col("Tarjeta / Evento", 4, [14,16,14,16]);
  fill(c,"superficie/elevada"); line(c,"borde/base"); radio(c,"radio/md");
  c.appendChild(T(hora,"Semi Bold","tam/micro","marca/base"));
  c.appendChild(T(titulo,"Regular","tam/cuerpo","texto/fuerte",286));
  return c;
}
function burbuja(autor, txt){
  const b = col("Burbuja / " + autor, 6, [12,16,12,16]);
  fill(b, autor === "Usuario" ? "marca/suave" : "agente/suave"); radio(b,"radio/lg");
  b.appendChild(T(txt,"Regular","tam/cuerpo","texto/fuerte",250));
  return b;
}
const SUB = "Jueves 25 de septiembre · GMT-5";

// 01 Agenda vacía — REQ-CUN01-12
const f1 = pantalla(pagina,"CUN-01 / Móvil / Principal / 01 Agenda vacía",0,0);
cabecera(f1,SUB);
const vac = col("Estado vacío",10,[24,32,24,32]);
vac.set({counterAxisAlignItems:"CENTER"});
const v1 = T("Sin compromisos hoy","Semi Bold","tam/cuerpo-grande","texto/fuerte"); v1.textAlignHorizontal="CENTER";
const v2 = T("Pídeme que agende algo o créalo tú mismo","Regular","tam/etiqueta","texto/suave",280); v2.textAlignHorizontal="CENTER";
vac.appendChild(v1); vac.appendChild(v2);
fija(f1,vac,0,320,390);
barra(f1,"Escribe o pulsa el micrófono",false);

// 02 Agenda con compromisos — REQ-CUN01-09, REQ-CUN01-10
const f2 = pantalla(pagina,"CUN-01 / Móvil / Principal / 02 Agenda con compromisos",450,0);
cabecera(f2,SUB);
const lista = col("Lista de compromisos",12,[8,20,8,20]);
for (const [h,t] of [["08:30 – 09:15","Revisión de avances con María Fernanda Quispe"],["11:00 – 12:00","Comité de arquitectura"],["15:30 – 16:30","Entrevista de usuario — piloto NexoAI"]]) {
  const c = tarjetaEvento(h,t); lista.appendChild(c); c.layoutSizingHorizontal="FILL";
}
fija(f2,lista,0,120,390);
barra(f2,"Escribe o pulsa el micrófono",false);

// 03 Solicitud escrita — REQ-CUN01-01
const f3 = pantalla(pagina,"CUN-01 / Móvil / Principal / 03 Solicitud escrita",900,0);
cabecera(f3,SUB);
fija(f3, burbuja("Usuario","Agéndame una reunión con Vasco el viernes a las 10"), 100, 620, 270);
barra(f3,"Agéndame una reunión con Vasco…",true);

// 04 Interpretando — REQ-CUN01-01, REQ-CUN01-02
const f4 = pantalla(pagina,"CUN-01 / Móvil / Principal / 04 Interpretando",1350,0);
cabecera(f4,SUB);
fija(f4, burbuja("Usuario","Agéndame una reunión con Vasco el viernes a las 10"), 100, 120, 270);
const ag = burbuja("Asistente","Revisando tu agenda del viernes…");
const sk = figma.createRectangle(); sk.resize(180,10); sk.cornerRadius=5; fill(sk,"borde/base"); ag.appendChild(sk);
fija(f4,ag,20,230,290);

// 05 Confirmación pendiente — REQ-CUN01-03 (RN-ER-03). El cuadro más importante.
const f5 = pantalla(pagina,"CUN-01 / Móvil / Principal / 05 Confirmación pendiente",1800,0);
cabecera(f5,SUB);
fija(f5, burbuja("Usuario","Agéndame una reunión con Vasco el viernes a las 10"), 100, 120, 270);
const tar = col("Tarjeta / Confirmación",14,[18,18,18,18]);
fill(tar,"superficie/elevada"); line(tar,"borde/fuerte"); radio(tar,"radio/lg");
tar.appendChild(T("Voy a crear este compromiso","Semi Bold","tam/cuerpo-grande","texto/fuerte",300));
const datos = col("Datos",8,[0,0,0,0]);
for (const [k,v] of [["Con","Vasco Bustamante"],["Cuándo","Viernes 26 de septiembre, 10:00 – 11:00"],["Zona horaria","GMT-5 (Lima)"]]) {
  const r = row("Dato",8,[0,0,0,0]);
  const kk = T(k,"Regular","tam/etiqueta","texto/suave"); kk.resize(90,18); kk.textAutoResize="HEIGHT";
  r.appendChild(kk); r.appendChild(T(v,"Semi Bold","tam/etiqueta","texto/fuerte",200));
  datos.appendChild(r); r.layoutSizingHorizontal="FILL";
}
tar.appendChild(datos); datos.layoutSizingHorizontal="FILL";
tar.appendChild(T("Ver en qué me basé","Semi Bold","tam/etiqueta","marca/base"));
const acc = col("Acciones",8,[0,0,0,0]);
for (const [txt,va] of [["Confirmar","Primario"],["Editar","Secundario"],["Cancelar","Texto"]]) {
  const b = boton(txt,va); acc.appendChild(b); b.layoutSizingHorizontal="FILL";
}
tar.appendChild(acc); acc.layoutSizingHorizontal="FILL";
tar.appendChild(T("No se enviará ninguna invitación hasta que confirmes.","Regular","tam/micro","texto/suave",300));
fija(f5,tar,20,300,350);

// 06 Compromiso registrado — REQ-CUN01-04
const f6 = pantalla(pagina,"CUN-01 / Móvil / Principal / 06 Compromiso registrado",2250,0);
cabecera(f6,SUB);
const ok = col("Aviso",6,[14,16,14,16]);
fill(ok,"estado/exito-suave"); radio(ok,"radio/md");
ok.appendChild(T("Compromiso registrado","Semi Bold","tam/cuerpo","estado/exito",290));
ok.appendChild(T("Viernes 26, 10:00 – 11:00 con Vasco Bustamante","Regular","tam/etiqueta","texto/fuerte",290));
fija(f6,ok,20,120,350);
fija(f6, tarjetaEvento("10:00 – 11:00","Reunión con Vasco Bustamante"), 20, 250, 350);
fija(f6, boton("Deshacer","Secundario"), 20, 360, 350);

return { cuadros:[f1,f2,f3,f4,f5,f6].map(f => f.name) };
