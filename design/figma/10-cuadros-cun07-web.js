// 10 · CUN-07 Delegar tarea — 12 cuadros web.
// Requiere: 08-componentes-web.js. Pegar los IDs que devolvió.
// >>> Pegar aquí el contenido de _helpers-web.js <<<

const IDS = { boton:"PEGAR_ID_Web_Botón", campo:"PEGAR_ID_Web_Campo", fila:"PEGAR_ID_Web_Fila_de_colaborador" };

const pagina = figma.root.children.find(p => p.name === "05 Flujos · Web");
await figma.setCurrentPageAsync(pagina);
for (const n of [...pagina.children]) if (n.name.startsWith("CUN-07")) n.remove();
await figma.loadFontAsync({family:"Inter",style:"Regular"});
await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});

const sBoton = await figma.getNodeByIdAsync(IDS.boton);
const sCampo = await figma.getNodeByIdAsync(IDS.campo);
const cFila  = await figma.getNodeByIdAsync(IDS.fila);
const key = (n,p) => Object.keys(n.componentPropertyDefinitions).find(k => k.startsWith(p+"#"));
const kBt = key(sBoton,"Etiqueta");
const kCe = key(sCampo,"Etiqueta"), kCv = key(sCampo,"Valor"), kCa = key(sCampo,"Ayuda"), kCm = key(sCampo,"Mostrar ayuda");
const kFn = key(cFila,"Nombre"), kFd = key(cFila,"Detalle");

const boton = (t,v) => { const i = sBoton.defaultVariant.createInstance(); i.setProperties({"Tipo":v,[kBt]:t}); return i; };
const campo = (et,val,estado,ayuda) => {
  const i = sCampo.defaultVariant.createInstance();
  i.setProperties({ "Estado":estado||"Vacío", [kCe]:et, [kCv]:val, [kCa]:ayuda||"", [kCm]:!!ayuda });
  return i;
};
const fila = (n,d) => { const i = cFila.createInstance(); i.setProperties({[kFn]:n,[kFd]:d}); return i; };

function panelEquipo(f, y0) {
  const p = col("Lista / Equipo", 10, [20,20,20,20]);
  fill(p,"superficie/base"); line(p,"borde/base"); radio(p,"radio/md");
  p.appendChild(T("Colaboradores","Semi Bold","tam/cuerpo","texto/fuerte"));
  for (const [n,t] of [["Vasco Bustamante","2 tareas activas"],["Aixa Alvarez","3 tareas activas"],["María Fernanda Quispe Huamán","1 tarea activa"],["Diego Rojas Paredes","1 tarea activa"]]) {
    const r = fila(n,t); p.appendChild(r); r.layoutSizingHorizontal = "FILL";
  }
  return fija(f, p, 272, 140 + (y0||0), 400);
}
function panelDelegar(f, y0) {
  const p = col("Panel / Delegar", 16, [24,24,24,24]);
  fill(p,"superficie/base"); line(p,"borde/base"); radio(p,"radio/md");
  fija(f, p, 704, 140 + (y0||0), 704);
  return p;
}
const meter = (p, nodo) => { p.appendChild(nodo); nodo.layoutSizingHorizontal = "FILL"; return nodo; };
const dato = (k,v) => { const r = row("Dato",8,[0,0,0,0]); const kk = T(k,"Regular","tam/etiqueta","texto/suave"); kk.resize(120,18); kk.textAutoResize="HEIGHT"; r.appendChild(kk); r.appendChild(T(v,"Semi Bold","tam/etiqueta","texto/fuerte",420)); return r; };
const acciones = (p, lista) => { const a = row("Acciones",10,[0,0,0,0]); for (const [t,v] of lista) a.appendChild(boton(t,v)); p.appendChild(a); return a; };

// --- Principal ---
const w1 = pantalla(pagina,"CUN-07 / Web / Principal / 01 Panel de delegación vacío",0,0).f;
panelEquipo(w1);
const p1 = panelDelegar(w1);
p1.appendChild(T("Delegar una tarea","Semi Bold","tam/cuerpo-grande","texto/fuerte"));
meter(p1, campo("Actividad","Describe la actividad a delegar"));
meter(p1, campo("Colaborador","Elige a quién asignarla"));
meter(p1, campo("Fecha límite","dd/mm/aaaa"));
acciones(p1, [["Delegar","Primario"],["Cancelar","Texto"]]);

const w2 = pantalla(pagina,"CUN-07 / Web / Principal / 02 Indicando actividad y colaborador",1500,0).f;
panelEquipo(w2);
const p2 = panelDelegar(w2);
p2.appendChild(T("Delegar una tarea","Semi Bold","tam/cuerpo-grande","texto/fuerte"));
meter(p2, campo("Actividad","Preparar el informe de disponibilidad del sprint","Reposo"));
meter(p2, campo("Colaborador","Vasco","Activo"));
const sug = col("Sugerencias",6,[8,0,0,0]);
for (const s of ["Vasco Bustamante — Equipo de Plataforma","Vasco Núñez — Equipo de Datos"]) {
  const o = row("Sugerencia",8,[10,14,10,14]);
  fill(o,"superficie/elevada"); line(o,"borde/base"); radio(o,"radio/sm");
  o.appendChild(T(s,"Regular","tam/etiqueta","texto/fuerte",400));
  sug.appendChild(o); o.layoutSizingHorizontal="FILL";
}
meter(p2, sug);
meter(p2, campo("Fecha límite","dd/mm/aaaa"));

const w3 = pantalla(pagina,"CUN-07 / Web / Principal / 03 Propuesta preparada",3000,0).f;
panelEquipo(w3);
const p3 = panelDelegar(w3);
p3.appendChild(T("Delegar una tarea","Semi Bold","tam/cuerpo-grande","texto/fuerte"));
meter(p3, campo("Actividad","Preparar el informe de disponibilidad del sprint","Reposo"));
meter(p3, campo("Colaborador","Vasco Bustamante","Reposo"));
meter(p3, campo("Fecha límite","Viernes 2 de octubre","Reposo"));
const ok3 = row("Aviso",8,[10,14,10,14]); fill(ok3,"estado/exito-suave"); radio(ok3,"radio/sm");
ok3.appendChild(T("Información completa. Puedes delegar.","Regular","tam/etiqueta","estado/exito",500));
meter(p3, ok3);
acciones(p3, [["Delegar","Primario"],["Cancelar","Texto"]]);

// 04 — RN-ER-03. El cuadro más importante del caso de uso.
const w4 = pantalla(pagina,"CUN-07 / Web / Principal / 04 Confirmación pendiente",4500,0).f;
panelEquipo(w4);
const p4 = panelDelegar(w4);
p4.appendChild(T("Voy a delegar esta tarea","Semi Bold","tam/cuerpo-grande","texto/fuerte"));
const d4 = col("Datos",10,[0,0,0,0]);
for (const [k,v] of [["Actividad","Preparar el informe de disponibilidad del sprint"],["Responsable","Vasco Bustamante"],["Fecha límite","Viernes 2 de octubre · GMT-5"],["Equipo","Plataforma"]])
  meter(d4, dato(k,v));
meter(p4, d4);
p4.appendChild(T("Ver en qué me basé","Semi Bold","tam/etiqueta","marca/base"));
acciones(p4, [["Confirmar delegación","Primario"],["Editar","Secundario"],["Cancelar","Texto"]]);
p4.appendChild(T("Al confirmar se notificará a Vasco Bustamante. La notificación no se puede deshacer.","Regular","tam/micro","texto/suave",620));

const w5 = pantalla(pagina,"CUN-07 / Web / Principal / 05 Delegada y notificada",6000,0).f;
panelEquipo(w5);
const p5 = panelDelegar(w5);
const ok5 = col("Aviso",6,[14,16,14,16]); fill(ok5,"estado/exito-suave"); radio(ok5,"radio/sm");
ok5.appendChild(T("Tarea delegada","Semi Bold","tam/cuerpo","estado/exito",620));
ok5.appendChild(T("Vasco Bustamante recibió la asignación. Vence el viernes 2 de octubre.","Regular","tam/etiqueta","texto/fuerte",620));
meter(p5, ok5);
const tar5 = col("Tarjeta / Tarea",6,[16,16,16,16]);
fill(tar5,"superficie/elevada"); line(tar5,"borde/base"); radio(tar5,"radio/sm");
tar5.appendChild(T("PENDIENTE","Semi Bold","tam/micro","marca/base"));
tar5.appendChild(T("Preparar el informe de disponibilidad del sprint","Regular","tam/cuerpo","texto/fuerte",620));
tar5.appendChild(T("Vasco Bustamante · vence 02/10","Regular","tam/micro","texto/suave"));
meter(p5, tar5);
acciones(p5, [["Ver la tarea","Secundario"],["Delegar otra","Texto"]]);

// --- Alternativos ---
const wa = pantalla(pagina,"CUN-07 / Web / FA-01 / 01 Editando la propuesta",0,1000).f;
panelEquipo(wa);
const pa = panelDelegar(wa);
pa.appendChild(T("Editar antes de delegar","Semi Bold","tam/cuerpo-grande","texto/fuerte"));
meter(pa, campo("Actividad","Preparar el informe de disponibilidad del sprint","Reposo"));
meter(pa, campo("Responsable","Aixa Alvarez","Activo"));
meter(pa, campo("Fecha límite","Lunes 5 de octubre","Activo"));
const av = row("Aviso",8,[10,14,10,14]); fill(av,"marca/suave"); radio(av,"radio/sm");
av.appendChild(T("Revalidando autorización y completitud con los datos nuevos…","Regular","tam/etiqueta","marca/base",560));
meter(pa, av);
acciones(pa, [["Volver a la confirmación","Primario"],["Descartar cambios","Texto"]]);

const wb = pantalla(pagina,"CUN-07 / Web / FA-02 / 01 Cancelada antes de confirmar",1500,1000).f;
panelEquipo(wb);
const pb = panelDelegar(wb);
const avb = col("Aviso",6,[14,16,14,16]); fill(avb,"superficie/elevada"); line(avb,"borde/base"); radio(avb,"radio/sm");
avb.appendChild(T("Delegación cancelada","Semi Bold","tam/cuerpo","texto/fuerte",620));
avb.appendChild(T("No se creó ninguna tarea y no se notificó a nadie.","Regular","tam/etiqueta","texto/suave",620));
meter(pb, avb);
acciones(pb, [["Delegar una tarea","Primario"]]);

// --- Excepciones ---
const e1 = pantalla(pagina,"CUN-07 / Web / EX-01 / 01 Colaborador no válido",0,2000).f;
panelEquipo(e1);
const pe1 = panelDelegar(e1);
pe1.appendChild(T("Delegar una tarea","Semi Bold","tam/cuerpo-grande","texto/fuerte"));
meter(pe1, campo("Actividad","Preparar el informe de disponibilidad del sprint","Reposo"));
meter(pe1, campo("Responsable","Carla Medina","Error","Carla Medina no pertenece a ninguno de tus equipos. Elige un colaborador del equipo o pide que se le agregue."));
const op1 = col("Alternativas",6,[0,0,0,0]);
for (const s of ["Vasco Bustamante","Aixa Alvarez","Diego Rojas Paredes"]) {
  const o = row("Sugerencia",8,[10,14,10,14]);
  fill(o,"superficie/elevada"); line(o,"borde/base"); radio(o,"radio/sm");
  o.appendChild(T(s,"Regular","tam/etiqueta","texto/fuerte",400));
  op1.appendChild(o); o.layoutSizingHorizontal="FILL";
}
meter(pe1, op1);

const e2 = pantalla(pagina,"CUN-07 / Web / EX-02 / 01 Información insuficiente",1500,2000).f;
panelEquipo(e2);
const pe2 = panelDelegar(e2);
pe2.appendChild(T("Delegar una tarea","Semi Bold","tam/cuerpo-grande","texto/fuerte"));
meter(pe2, campo("Actividad","Preparar el informe de disponibilidad del sprint","Reposo"));
meter(pe2, campo("Responsable","Vasco Bustamante","Reposo"));
meter(pe2, campo("Fecha límite","","Error","Falta la fecha límite. Sin ella no puedo registrar la tarea."));
const sug2 = row("Sugerencias",8,[0,0,0,0]);
for (const s of ["Este viernes","En una semana","Fin de mes"]) {
  const o = row("Sugerencia",8,[8,12,8,12]);
  fill(o,"superficie/elevada"); line(o,"borde/base"); radio(o,"radio/pill");
  o.appendChild(T(s,"Regular","tam/micro","texto/fuerte"));
  sug2.appendChild(o);
}
pe2.appendChild(sug2);
acciones(pe2, [["Delegar","Primario"],["Cancelar","Texto"]]);

// EX-03 — sin botón "Solicitar autorización": ese flujo NO existe en el
// modelo de negocio. Si se quiere, hay que especificarlo como caso de uso.
const e3 = pantalla(pagina,"CUN-07 / Web / EX-03 / 01 Delegación no autorizada",3000,2000).f;
panelEquipo(e3);
const pe3 = panelDelegar(e3);
const av3 = col("Aviso / Rechazo",8,[16,18,16,18]);
fill(av3,"estado/error-suave"); radio(av3,"radio/sm");
av3.appendChild(T("No estás autorizado para delegar en este equipo","Semi Bold","tam/cuerpo","estado/error",620));
av3.appendChild(T("Tu rol permite consultar el avance del equipo, pero no asignar tareas. La delegación fue rechazada y no se creó ningún registro.","Regular","tam/etiqueta","texto/fuerte",620));
meter(pe3, av3);
acciones(pe3, [["Volver al equipo","Primario"]]);

// --- Transversales ---
const t1 = pantalla(pagina,"CUN-07 / Web / Transversal / Sin permiso de equipo",0,3000).f;
const pt1 = col("Aviso / Permiso",14,[24,24,24,24]);
fill(pt1,"superficie/base"); line(pt1,"borde/fuerte"); radio(pt1,"radio/md");
pt1.appendChild(T("No tienes acceso a este equipo","Semi Bold","tam/cuerpo-grande","texto/fuerte",560));
pt1.appendChild(T("No puedo mostrarte sus colaboradores ni sus tareas. Si necesitas coordinar con ellos, pide acceso al responsable del equipo.","Regular","tam/etiqueta","texto/suave",560));
acciones(pt1, [["Solicitar acceso","Primario"],["Volver a mis tareas","Texto"]]);
fija(t1, pt1, 480, 300, 608);

const r2 = pantalla(pagina,"CUN-07 / Web / Transversal / Modo degradado",1500,3000,
  { degradado:"El asistente no está disponible. Puedes delegar con el formulario manual." });
const t2 = r2.f, off = r2.y0;
panelEquipo(t2, off);
const pt2 = panelDelegar(t2, off);
pt2.appendChild(T("Delegar una tarea","Semi Bold","tam/cuerpo-grande","texto/fuerte"));
meter(pt2, campo("Actividad","Describe la actividad a delegar"));
meter(pt2, campo("Responsable","Elige un colaborador del equipo"));
meter(pt2, campo("Fecha límite","dd/mm/aaaa"));
const nota = row("Aviso",8,[10,14,10,14]); fill(nota,"superficie/elevada"); line(nota,"borde/base"); radio(nota,"radio/sm");
nota.appendChild(T("Sin el asistente no hay sugerencias automáticas, pero la delegación funciona igual.","Regular","tam/micro","texto/suave",560));
meter(pt2, nota);
acciones(pt2, [["Delegar","Primario"],["Cancelar","Texto"]]);

return { cuadros: pagina.children.filter(c => c.name.startsWith("CUN-07")).map(c => c.name) };
