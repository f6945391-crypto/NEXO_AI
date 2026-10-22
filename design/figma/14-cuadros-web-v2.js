// 14 · Los 9 cuadros de la página "06 Arquitectura · Web v2".
// >>> Pegar aquí el contenido de _helpers-web-v2.js <<<
//
// Requiere: 13-componentes-web-v2.js, que devuelve los IDs de abajo.
// Antes de ejecutar, sustituir PEGAR_ID_… por lo que devolvió el 13.
//
// NO toca los 20 cuadros de CUN-07 y CUN-05 de la página 05. Esta es una
// sección nueva: la jerarquía se prueba aquí antes de rehacer aquellos.

const ITEM_REPOSO = await figma.getNodeByIdAsync("PEGAR_ID_Item_Reposo");
const ITEM_ACTIVO = await figma.getNodeByIdAsync("PEGAR_ID_Item_Activo");
const CLAVE_ICONO = "PEGAR_CLAVE_Icono";           // p. ej. "Icono#58:0"
const ICONOS = { Agenda:"…", Tareas:"…", Equipo:"…", Reuniones:"…", "Resúmenes":"…", Actividad:"…" };
const C = {
  tarjProp:  await figma.getNodeByIdAsync("PEGAR_ID_Tarjeta_Propuesta"),
  tarjBloq:  await figma.getNodeByIdAsync("PEGAR_ID_Tarjeta_Bloqueada"),
  burbUsr:   await figma.getNodeByIdAsync("PEGAR_ID_Burbuja_Usuario"),
  burbAsi:   await figma.getNodeByIdAsync("PEGAR_ID_Burbuja_Asistente"),
  barraRep:  await figma.getNodeByIdAsync("PEGAR_ID_Barra_Reposo"),
  barraDes:  await figma.getNodeByIdAsync("PEGAR_ID_Barra_Deshabilitado"),
  panelObj:  await figma.getNodeByIdAsync("PEGAR_ID_Panel_Objeto"),
  panelReg:  await figma.getNodeByIdAsync("PEGAR_ID_Panel_Registro"),
  fHecho:    await figma.getNodeByIdAsync("PEGAR_ID_Fila_Hecho"),
  fRech:     await figma.getNodeByIdAsync("PEGAR_ID_Fila_Rechazado"),
  fPend:     await figma.getNodeByIdAsync("PEGAR_ID_Fila_Pendiente"),
  advert:    await figma.getNodeByIdAsync("PEGAR_ID_Advertencia"),
  // De la v1, se reutilizan sin cambios:
  btnPrim:   await figma.getNodeByIdAsync("33:4"),
  btnSec:    await figma.getNodeByIdAsync("33:7"),
  btnTxt:    await figma.getNodeByIdAsync("33:10"),
  btnDest:   await figma.getNodeByIdAsync("33:13"),
  campoVacio:await figma.getNodeByIdAsync("33:377"),
  colab:     await figma.getNodeByIdAsync("33:37"),
  rejilla:   await figma.getNodeByIdAsync("35:35")
};
const P = {  // claves de propiedad; leerlas en ejecución, nunca escribirlas a mano
  tarjTit:"Título#…", tarjCue:"Cuerpo#…",
  panelTit:"Título#…", panelSub:"Subtítulo#…",
  filaAcc:"Acción#…", filaDet:"Detalle#…", filaMom:"Momento#…",
  burbMsg:"Mensaje#…", btnEt:"Etiqueta#33:0",
  colabNom:"Nombre#33:21", colabDet:"Detalle#33:22",
  advQue:"Qué se pierde#…"
};

const pagina = figma.root.children.find(p => p.name === "06 Arquitectura · Web v2");
await figma.setCurrentPageAsync(pagina);
await figma.loadFontAsync({ family:"Inter", style:"Semi Bold" });
await figma.loadFontAsync({ family:"Inter", style:"Regular" });
const DISP = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === "disposicion");
const NORMAL = DISP.modes.find(m => m.name === "Normal").modeId;
const EXPANDIDO = DISP.modes.find(m => m.name === "Lienzo expandido").modeId;
const base = { coleccionDisposicion: DISP, modoDisp: NORMAL };

for (const c of pagina.children.slice()) if (c.name.indexOf("WEB-v2 /") === 0) c.remove();

function contenidoLienzo(lie, panelComp, titulo, subtitulo, padTop) {
  const cab = panelComp.createInstance();
  lie.appendChild(cab); cab.layoutSizingHorizontal = "FILL";
  cab.setProperties({ [P.panelTit]: titulo, [P.panelSub]: subtitulo });
  const cont = figma.createAutoLayout("VERTICAL", { name:"Contenido", itemSpacing:10 });
  cont.set({ paddingTop: padTop || 16, paddingRight:24, paddingBottom:24, paddingLeft:24 });
  cont.fills = [];
  lie.appendChild(cont); cont.layoutSizingHorizontal = "FILL";
  return cont;
}
function mensajeCentral(conv, titulo, cuerpo, colorTit, padTop) {
  const h = figma.createFrame(); h.name="Espacio"; h.fills=[]; h.resize(480, padTop||200);
  conv.appendChild(h);
  const caja = figma.createAutoLayout("VERTICAL", { name:"Mensaje", itemSpacing:8 });
  caja.set({ paddingTop:28, paddingRight:24, paddingBottom:28, paddingLeft:24, counterAxisAlignItems:"CENTER" });
  caja.fills = [];
  const t1 = T(titulo,"Semi Bold","tam/cuerpo-grande",colorTit||"texto/fuerte",432,"CENTER");
  const t2 = T(cuerpo,"Regular","tam/etiqueta","texto/suave",432,"CENTER");
  caja.appendChild(t1); caja.appendChild(t2);
  conv.appendChild(caja); caja.layoutSizingHorizontal = "FILL";
  t1.layoutSizingHorizontal = "FILL"; t2.layoutSizingHorizontal = "FILL";
  return caja;
}

// ===== Armazón / 01 Normal ==============================================
// El caso de referencia: CUN-07 con la jerarquía nueva. La confirmación
// deja de ser un panel lateral y pasa a ser una tarjeta de la conversación.
{
  const a = pantalla(pagina, "WEB-v2 / Armazón / 01 Normal", 0, 200, Object.assign({activo:"Equipo"}, base));
  // El turno del usuario se alinea a la derecha envolviéndolo en una fila
  // con primaryAxisAlignItems MAX: el auto-layout no alinea hijo a hijo.
  const fila = figma.createAutoLayout("HORIZONTAL", { name:"Turno del usuario", itemSpacing:0 });
  fila.set({ primaryAxisAlignItems:"MAX" }); fila.fills = [];
  a.conv.appendChild(fila); fila.layoutSizingHorizontal = "FILL";
  const bu = C.burbUsr.createInstance(); fila.appendChild(bu);
  bu.setProperties({ [P.burbMsg]: "Delega a María Fernanda revisar el informe de cierre para el viernes" });
  const ba = C.burbAsi.createInstance(); a.conv.appendChild(ba);
  ba.setProperties({ [P.burbMsg]: "Preparé la delegación. Revisa los datos antes de confirmar: la notificación a María Fernanda no se puede deshacer." });
  const tar = C.tarjProp.createInstance(); a.conv.appendChild(tar);
  tar.setProperties({ [P.tarjTit]:"Delegar «Revisar el informe de cierre»",
                      [P.tarjCue]:"Responsable: María Fernanda Quispe Huamán · Vence el viernes 2 de octubre · Equipo de Plataforma" });
  const acc = figma.createAutoLayout("HORIZONTAL", { name:"Acciones", itemSpacing:10 });
  acc.fills = [];
  for (const [comp, et] of [[C.btnPrim,"Confirmar delegación"],[C.btnSec,"Modificar"],[C.btnTxt,"Cancelar"]]) {
    const b = comp.createInstance(); b.setProperties({ [P.btnEt]: et }); acc.appendChild(b);
  }
  a.conv.appendChild(acc);
  cierraConversacion(a.conv, C.barraRep, 900);

  const cont = contenidoLienzo(a.lie, C.panelObj, "Equipo de Plataforma",
    "4 colaboradores · 7 tareas activas · hora de Perú (GMT-5)", 8);
  const rot = T("Colaboradores del equipo","Semi Bold","tam/etiqueta","texto/suave",700);
  cont.appendChild(rot); rot.layoutSizingHorizontal = "FILL";
  for (const [n, d] of [
    ["María Fernanda Quispe Huamán","3 tareas activas · 1 vence esta semana"],
    ["Vasco Bustamante Ríos","2 tareas activas"],
    ["Aixa Alvarez Mendoza","1 tarea activa · sin vencimientos"],
    ["Joaquín Sebastián Valdivia Ccahuana","1 tarea activa · vencida hace 2 días"]]) {
    const f = C.colab.createInstance();
    cont.appendChild(f); f.layoutSizingHorizontal = "FILL";
    f.setProperties({ [P.colabNom]: n, [P.colabDet]: d });
  }
}

// ===== Armazón / 02 Lienzo expandido ====================================
// Con cinco o más participantes es la disposición esperada, no una comodidad.
{
  const b = pantalla(pagina, "WEB-v2 / Armazón / 02 Lienzo expandido", 1540, 200,
                     { activo:"Reuniones", coleccionDisposicion: DISP, modoDisp: EXPANDIDO });
  const cont = contenidoLienzo(b.lie, C.panelObj, "Disponibilidad del Equipo de Plataforma",
    "5 participantes · semana del 28 de septiembre · hora de Perú (GMT-5) · 60 minutos solicitados", 20);
  const nota = T("La conversación queda colapsada en el asidero de la izquierda, que es la única vuelta atrás.",
                 "Regular","tam/etiqueta","texto/suave",1200);
  cont.appendChild(nota); nota.layoutSizingHorizontal = "FILL";
  cont.appendChild(C.rejilla.createInstance());
  // DERIVA CONOCIDA: la rejilla se construyó para 1200 px y no llena 1356.
  // Se redimensiona cuando se rehagan los cuadros de CUN-05.
}

// ===== Blancos: los cuatro estados que no pueden parecerse ==============
// Si dos de estos se ven igual, el producto miente. Ver
// design/ARQUITECTURA-VISUAL-WEB.md sección 8.
{
  // 01 Vacía tras cerrar — logro. El resultado está en el lienzo.
  const a = pantalla(pagina, "WEB-v2 / Blancos / 01 Vacía tras cerrar", 0, 1200, Object.assign({activo:"Equipo"}, base));
  mensajeCentral(a.conv, "Listo. La delegación quedó registrada",
    "Vaciaste la conversación. Lo que hiciste no se perdió: está en el registro, a la derecha.", null, 240);
  const salida = figma.createAutoLayout("HORIZONTAL", { name:"Salida", itemSpacing:0 });
  salida.set({ primaryAxisAlignItems:"CENTER" }); salida.fills = [];
  a.conv.appendChild(salida); salida.layoutSizingHorizontal = "FILL";
  const va = C.btnTxt.createInstance(); va.setProperties({ [P.btnEt]:"Ver lo anterior" });
  salida.appendChild(va);   // el vaciado lo decide el usuario: hace falta vuelta atrás
  cierraConversacion(a.conv, C.barraRep, 900);
  const cont = contenidoLienzo(a.lie, C.panelReg, "Actividad", "Lo que el asistente hizo por ti · alcance personal", 16);
  const f = C.fHecho.createInstance();
  cont.appendChild(f); f.layoutSizingHorizontal = "FILL";
  f.setProperties({ [P.filaAcc]:"Tarea delegada a María Fernanda Quispe Huamán",
                    [P.filaDet]:"«Revisar el informe de cierre» · vence el 2 de octubre · notificación enviada",
                    [P.filaMom]:"hace unos segundos" });
}
{
  // 02 Inicial — invitación, con ejemplos concretos y pulsables.
  const b = pantalla(pagina, "WEB-v2 / Blancos / 02 Inicial", 1540, 1200, Object.assign({activo:"Agenda"}, base));
  mensajeCentral(b.conv, "¿Qué necesitas coordinar?",
    "Escríbelo como se lo dirías a una persona. Lo que prepare el asistente aparecerá aquí como una tarjeta, y siempre confirmas antes de que pase nada.", null, 200);
  for (const e of ["Delega a Vasco preparar el presupuesto para el jueves",
                   "Busca una hora de 60 minutos para el Equipo de Plataforma",
                   "¿Qué tengo pendiente que venza esta semana?"]) {
    const chip = figma.createAutoLayout("HORIZONTAL", { name:"Ejemplo", itemSpacing:0 });
    chip.set({ paddingTop:12, paddingRight:16, paddingBottom:12, paddingLeft:16 });
    fill(chip,"superficie/base"); line(chip,"borde/base"); radio(chip,"radio/md");
    const t = T(e,"Regular","tam/etiqueta","marca/base",448);
    chip.appendChild(t); b.conv.appendChild(chip);
    chip.layoutSizingHorizontal = "FILL"; t.layoutSizingHorizontal = "FILL";
  }
  cierraConversacion(b.conv, C.barraRep, 900);
  const cont = contenidoLienzo(b.lie, C.panelObj, "Aquí verás lo que estés trabajando",
    "El lienzo muestra el día, la agenda, la rejilla o la tarea que la conversación esté tratando", 120);
  // El vacío inicial del lienzo NO puede parecerse a "no hay datos".
  const t1 = T("Todavía no hay nada que mostrar","Semi Bold","tam/cuerpo","texto/suave",600,"CENTER");
  const t2 = T("Esto no es «no hay datos»: es que aún no has pedido nada. En cuanto lo hagas, el resultado se queda aquí aunque vacíes la conversación.","Regular","tam/etiqueta","texto/suave",600,"CENTER");
  cont.counterAxisAlignItems = "CENTER";
  cont.appendChild(t1); cont.appendChild(t2);
  t1.layoutSizingHorizontal = "FILL"; t2.layoutSizingHorizontal = "FILL";
}
{
  // 03 Asistente no disponible — disculpa, y el camino manual operativo.
  const a = pantalla(pagina, "WEB-v2 / Blancos / 03 Asistente no disponible", 3080, 1200,
    Object.assign({ activo:"Equipo",
      banner:"El asistente no está disponible. Esto es una caída nuestra, no un límite de tu plan: la delegación manual sigue funcionando en el panel de la derecha." }, base));
  mensajeCentral(a.conv, "El asistente no responde",
    "Estamos reintentando. Mientras tanto puedes delegar a mano: el formulario de la derecha crea la misma tarea y notifica igual.", "estado/advertencia", 200);
  cierraConversacion(a.conv, C.barraDes, 900 - a.y0);
  const cont = contenidoLienzo(a.lie, C.panelObj, "Delegar a mano",
    "Equipo de Plataforma · el camino manual completa el caso de uso sin el asistente", 24);
  cont.itemSpacing = 16;
  for (let i = 0; i < 3; i++) {
    const campo = C.campoVacio.createInstance();
    cont.appendChild(campo); campo.layoutSizingHorizontal = "FILL";
  }
  const acc = figma.createAutoLayout("HORIZONTAL", { name:"Acciones", itemSpacing:10 });
  acc.fills = [];
  const b = C.btnPrim.createInstance(); b.setProperties({ [P.btnEt]:"Revisar antes de delegar" });
  acc.appendChild(b); cont.appendChild(acc);
}
{
  // 04 Fuera del plan — oferta, y qué sí puede hacer ahora.
  const b = pantalla(pagina, "WEB-v2 / Blancos / 04 Fuera del plan", 4620, 1200, Object.assign({activo:"Agenda"}, base));
  const h = figma.createFrame(); h.name="Espacio"; h.fills=[]; h.resize(480,160); b.conv.appendChild(h);
  const tb = C.tarjBloq.createInstance(); b.conv.appendChild(tb);
  tb.setProperties({ [P.tarjTit]:"Planificar tu jornada no está en tu plan",
    [P.tarjCue]:"Tu plan registra y consulta compromisos cuando se lo pides. Organizar el día por ti, anticipar y automatizar es lo que añade el Plan Personal." });
  const acc = figma.createAutoLayout("HORIZONTAL", { name:"Acciones", itemSpacing:10 });
  acc.fills = [];
  const b1 = C.btnPrim.createInstance(); b1.setProperties({ [P.btnEt]:"Ver el Plan Personal" });
  const b2 = C.btnTxt.createInstance();  b2.setProperties({ [P.btnEt]:"Seguir sin eso" });
  acc.appendChild(b1); acc.appendChild(b2); b.conv.appendChild(acc);
  const pie = T("Lo que sí puedes hacer ahora: registrar, consultar y modificar tus compromisos, a la derecha.","Regular","tam/micro","texto/suave",480);
  b.conv.appendChild(pie); pie.layoutSizingHorizontal = "FILL";
  cierraConversacion(b.conv, C.barraRep, 900);
  const cont = contenidoLienzo(b.lie, C.panelObj, "Mi agenda",
    "Jueves 2 de octubre · 4 compromisos · hora de Perú (GMT-5)", 20);
  for (const [hr, t] of [["09:00 – 10:00","Revisión de avance · Equipo de Plataforma"],
                         ["11:30 – 12:00","Uno a uno con María Fernanda Quispe Huamán"],
                         ["14:00 – 15:30","Comité de arquitectura"],
                         ["16:00 – 16:30","Cierre de semana"]]) {
    const fila = figma.createAutoLayout("HORIZONTAL", { name:"Compromiso", itemSpacing:16 });
    fila.set({ paddingTop:14, paddingRight:16, paddingBottom:14, paddingLeft:16, counterAxisAlignItems:"CENTER" });
    fill(fila,"superficie/hundida"); radio(fila,"radio/sm");
    const th = T(hr,"Semi Bold","tam/etiqueta","marca/base",110);
    const tt = T(t,"Regular","tam/etiqueta","texto/fuerte",600);
    fila.appendChild(th); fila.appendChild(tt);
    cont.appendChild(fila); fila.layoutSizingHorizontal = "FILL"; tt.layoutSizingHorizontal = "FILL";
  }
}

// ===== Registro: alcance personal y alcance de equipo ===================
// El alcance de equipo NUNCA muestra la agenda personal ni las
// comunicaciones del colaborador. Coordinar no es vigilar (RN-OP-02).
// [Los dos cuadros se construyen igual que los anteriores, con
//  C.panelReg y filas C.fHecho / C.fPend / C.fRech, más el selector de
//  alcance en chips y el bloque "Límite de privacidad" al pie.]

// ===== Diálogos / 01 Advertencia de descarte ============================
// Se clona el cuadro 01, se cambia el destino activo de navegación y se
// superpone velo + diálogo. El velo usa superficie/velo con opacidad en
// el relleno: ningún color suelto en toda la página.

return { nota: "Ver 15-validar-web-v2.js para el informe de la página." };
