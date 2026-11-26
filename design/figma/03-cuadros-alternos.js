// 03 · Flujos alternativos, excepciones y transversales de CUN-01 (móvil).
// Requiere: 01-variables.js y 02-cuadros-principal.js ejecutados.
// NO vacía la página: añade a lo que 02 ya construyó.
// >>> Pegar aquí el contenido de _helpers.js <<<

const pagina = figma.root.children.find(p => p.name.includes("Flujos · Móvil"));
await figma.setCurrentPageAsync(pagina);
await figma.loadFontAsync({family:"Inter",style:"Regular"});
await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});

function boton(txt, variante){
  const b = row("Botón / " + variante, 8, [14,20,14,20]);
  b.primaryAxisAlignItems = "CENTER"; radio(b, "radio/md");
  if (variante === "Primario")         { fill(b,"marca/base");      b.appendChild(T(txt,"Semi Bold","tam/cuerpo","texto/inverso")); }
  else if (variante === "Destructivo") { fill(b,"estado/error");    b.appendChild(T(txt,"Semi Bold","tam/cuerpo","texto/inverso")); }
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
function burbuja(autor, txt, ancho){
  const b = col("Burbuja / " + autor, 6, [12,16,12,16]);
  fill(b, autor === "Usuario" ? "marca/suave" : "agente/suave"); radio(b,"radio/lg");
  b.appendChild(T(txt,"Regular","tam/cuerpo","texto/fuerte", ancho || 250));
  return b;
}
function barra(f, texto, habilitada){
  const b = row("Barra de entrada", 8, [12,12,12,16]);
  radio(b,"radio/pill"); fill(b,"superficie/elevada"); line(b,"borde/base");
  if (!habilitada) b.opacity = 0.5;
  b.appendChild(T(texto,"Regular","tam/cuerpo","texto/suave",280));
  return fija(f,b,20,760,350);
}
function aviso(f, y, fondo, acento, titulo, cuerpo){
  const a = col("Aviso",6,[14,16,14,16]);
  fill(a,fondo); radio(a,"radio/md");
  a.appendChild(T(titulo,"Semi Bold","tam/cuerpo",acento,290));
  a.appendChild(T(cuerpo,"Regular","tam/etiqueta","texto/fuerte",290));
  return fija(f,a,20,y,350);
}
// Una fila por flujo. 964 px de separación vertical entre filas.
const Y1 = 964, Y2 = 1928, Y3 = 2892;

// FA-01 Conflicto de horario — REQ-CUN01-05
const a1 = pantalla(pagina,"CUN-01 / Móvil / FA-01 / 01 Conflicto detectado",0,Y1);
cabecera(a1,"Viernes 26 de septiembre · GMT-5");
aviso(a1,120,"estado/advertencia-suave","estado/advertencia","Ese horario ya está ocupado","Tienes «Comité de arquitectura» de 10:00 a 11:00.");
const alt = col("Alternativas",8,[0,0,0,0]);
for (const h of ["Viernes 26, 11:15 – 12:15","Viernes 26, 16:00 – 17:00","Lunes 29, 10:00 – 11:00"]) {
  const o = row("Opción / Horario",8,[14,16,14,16]);
  fill(o,"superficie/elevada"); line(o,"borde/base"); radio(o,"radio/md");
  o.appendChild(T(h,"Regular","tam/cuerpo","texto/fuerte",280));
  alt.appendChild(o); o.layoutSizingHorizontal="FILL";
}
fija(a1,alt,20,250,350);
fija(a1, boton("Elegir otro horario","Secundario"), 20, 440, 350);
fija(a1, boton("Cancelar","Texto"), 20, 500, 350);

// FA-02 Modificar o cancelar — REQ-CUN01-06
const b1 = pantalla(pagina,"CUN-01 / Móvil / FA-02 / 01 Compromiso seleccionado",0,Y2);
cabecera(b1,"Viernes 26 de septiembre · GMT-5");
const det = col("Detalle / Compromiso",10,[18,18,18,18]);
fill(det,"superficie/elevada"); line(det,"borde/base"); radio(det,"radio/lg");
det.appendChild(T("Comité de arquitectura","Semi Bold","tam/cuerpo-grande","texto/fuerte",300));
det.appendChild(T("Viernes 26, 10:00 – 11:00 · GMT-5","Regular","tam/etiqueta","texto/suave",300));
det.appendChild(T("3 participantes","Regular","tam/etiqueta","texto/suave",300));
fija(b1,det,20,120,350);
fija(b1, boton("Modificar","Secundario"), 20, 290, 350);
fija(b1, boton("Cancelar compromiso","Texto"), 20, 350, 350);

// La confirmación previa también aplica a cancelar: es RN-ER-03, no solo al crear.
const b2 = pantalla(pagina,"CUN-01 / Móvil / FA-02 / 02 Confirmación de cancelación",450,Y2);
cabecera(b2,"Viernes 26 de septiembre · GMT-5");
const tc = col("Tarjeta / Confirmación",14,[18,18,18,18]);
fill(tc,"superficie/elevada"); line(tc,"estado/error"); radio(tc,"radio/lg");
tc.appendChild(T("Voy a cancelar este compromiso","Semi Bold","tam/cuerpo-grande","texto/fuerte",300));
tc.appendChild(T("Comité de arquitectura · Viernes 26, 10:00 – 11:00","Regular","tam/etiqueta","texto/fuerte",300));
const ac = col("Acciones",8,[0,0,0,0]);
for (const [t,v] of [["Cancelar compromiso","Destructivo"],["Volver","Texto"]]) {
  const b = boton(t,v); ac.appendChild(b); b.layoutSizingHorizontal="FILL";
}
tc.appendChild(ac); ac.layoutSizingHorizontal="FILL";
tc.appendChild(T("Se avisará a los 3 participantes. Esta acción no se puede deshacer.","Regular","tam/micro","texto/suave",300));
fija(b2,tc,20,120,350);

// EX-01 Información insuficiente — REQ-CUN01-07
const x1 = pantalla(pagina,"CUN-01 / Móvil / EX-01 / 01 Información insuficiente",900,Y2);
cabecera(x1,"Jueves 25 de septiembre · GMT-5");
fija(x1, burbuja("Usuario","Agéndame algo con Vasco",200), 150, 120, 220);
const ba = burbuja("Asistente","Me falta un dato para agendarlo");
ba.appendChild(T("¿Qué día y a qué hora quieres la reunión?","Regular","tam/etiqueta","texto/fuerte",250));
fija(x1,ba,20,220,290);
const su = col("Sugerencias",8,[0,0,0,0]);
for (const s of ["Mañana 10:00","Viernes 15:00","Elegir en el calendario"]) {
  const o = row("Sugerencia",8,[10,14,10,14]);
  fill(o,"superficie/elevada"); line(o,"borde/base"); radio(o,"radio/pill");
  o.appendChild(T(s,"Regular","tam/etiqueta","texto/fuerte"));
  su.appendChild(o); o.layoutSizingHorizontal="HUG";
}
fija(x1,su,20,360,350);

// EX-02 Sin autorización — REQ-CUN01-08 (RN-OP-01). Ofrece el camino manual.
const x2 = pantalla(pagina,"CUN-01 / Móvil / EX-02 / 01 Sin autorización",0,Y3);
cabecera(x2,"Jueves 25 de septiembre · GMT-5");
const p = col("Aviso / Permiso",12,[18,18,18,18]);
fill(p,"superficie/elevada"); line(p,"borde/fuerte"); radio(p,"radio/lg");
p.appendChild(T("Necesito acceso a tu calendario","Semi Bold","tam/cuerpo-grande","texto/fuerte",300));
p.appendChild(T("Sin ese permiso no puedo consultar ni registrar compromisos por ti. Puedes concederlo ahora o seguir gestionando tu agenda manualmente.","Regular","tam/etiqueta","texto/suave",300));
const ap = col("Acciones",8,[0,0,0,0]);
for (const [t,v] of [["Conceder acceso al calendario","Primario"],["Seguir sin el asistente","Secundario"]]) {
  const b = boton(t,v); ap.appendChild(b); b.layoutSizingHorizontal="FILL";
}
p.appendChild(ap); ap.layoutSizingHorizontal="FILL";
p.appendChild(T("Puedes revocar este permiso cuando quieras desde tu perfil.","Regular","tam/micro","texto/suave",300));
fija(x2,p,20,120,350);

// Transversal / Cargando agenda
const t1 = pantalla(pagina,"CUN-01 / Móvil / Transversal / Cargando agenda",450,Y3);
cabecera(t1,"Jueves 25 de septiembre · GMT-5");
const sk = col("Esqueleto",12,[0,0,0,0]);
for (let i=0;i<3;i++){
  const c = col("Tarjeta / Esqueleto",8,[16,16,16,16]);
  fill(c,"superficie/elevada"); line(c,"borde/base"); radio(c,"radio/md");
  const r1 = figma.createRectangle(); r1.resize(80,10); r1.cornerRadius=5; fill(r1,"borde/base"); c.appendChild(r1);
  const r2 = figma.createRectangle(); r2.resize(220,12); r2.cornerRadius=6; fill(r2,"borde/base"); c.appendChild(r2);
  sk.appendChild(c); c.layoutSizingHorizontal="FILL";
}
fija(t1,sk,20,120,350);
barra(t1,"Escribe o pulsa el micrófono",false);

// Transversal / Modo degradado — REQ-CUN01-11. La agenda sigue usable sin el asistente.
const t2 = pantalla(pagina,"CUN-01 / Móvil / Transversal / Modo degradado",900,Y3);
cabecera(t2,"Jueves 25 de septiembre · GMT-5");
aviso(t2,120,"estado/advertencia-suave","estado/advertencia","El asistente no está disponible","Tu agenda sigue funcionando. Puedes crear y editar compromisos manualmente.");
const lista = col("Lista de compromisos",12,[0,0,0,0]);
for (const [h,tt] of [["08:30 – 09:15","Revisión de avances con María Fernanda Quispe"],["11:00 – 12:00","Comité de arquitectura"]]) {
  const c = tarjetaEvento(h,tt); lista.appendChild(c); c.layoutSizingHorizontal="FILL";
}
fija(t2,lista,20,240,350);
fija(t2, boton("Nuevo compromiso","Primario"), 20, 700, 350);
barra(t2,"Asistente no disponible",false);

return { cuadros:[a1,b1,b2,x1,x2,t1,t2].map(f=>f.name) };
