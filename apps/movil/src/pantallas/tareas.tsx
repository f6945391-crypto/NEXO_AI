import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ControlTarea, OperacionRespuesta, RespuestaTareas, TareasDelDia, type FranjaTarea, type TareaPersonal } from '@nexoai/contratos';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';

// T-054, T-055 · specs/09-tareas-personales/plan.md §8.2 · REQ-CUN03-06 a 11, 13 · R-38, R-41, R-42. La sección
// Tareas del móvil y el grupo «Tareas para este día» de Hoy. Las mismas tareas, en el mismo orden y con los
// mismos textos que la web: los arma la API en la zona del perfil. «Hecho» y «Recibido» no llevan tarjeta y se
// deshacen unos segundos (H-TP-07); tocar una tarea abre su detalle, desde donde se descarta con su tarjeta.
// Crear y cambiar se le piden al asistente (H-TP-08): no hay formulario.

const FRANJAS: { clave: FranjaTarea; nombre: string }[] = [
  { clave: 'con_fecha', nombre: 'Con fecha' },
  { clave: 'sin_fecha', nombre: 'Sin fecha' },
  { clave: 'esperando', nombre: 'Esperando de alguien' },
];

const DESHACER_MS = 6_000;

// REQ-CUN03-08: qué va en cada franja y cómo pedírselo al asistente
const VACIO: Record<FranjaTarea, { titulo: string; texto: string }> = {
  con_fecha: { titulo: 'Nada con fecha', texto: 'Aquí aparece lo que tienes que hacer para un día. Pídeselo al asistente, por ejemplo «Recuérdame pagar el recibo antes del sábado».' },
  sin_fecha: { titulo: 'Nada sin fecha', texto: 'Aquí aparece lo que tienes que hacer sin un día fijo. Pídeselo al asistente, por ejemplo «Tengo que llamar al dentista».' },
  esperando: {
    titulo: 'No esperas nada de nadie',
    texto: 'Aquí aparece lo que esperas de otra persona, sin que nadie le escriba. Díselo al asistente, por ejemplo «Juan tiene que enviarme el presupuesto el lunes».',
  },
};

const nombreHecho = (t: TareaPersonal) => (t.deQuien ? 'Recibido' : 'Hecho');
const quedo = (t: TareaPersonal) => (t.deQuien ? `«${t.texto}» quedó como recibido.` : `«${t.texto}» quedó hecha.`);

// «Hecho» con «Deshacer» unos segundos; `alCambiar` vuelve a pedir la lista
function useHecho(alCambiar: () => void, alSalir: () => void) {
  const [hecha, setHecha] = useState<TareaPersonal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (temporizador.current && clearTimeout(temporizador.current)), []);

  async function control(tarea: TareaPersonal, accion: 'hecha' | 'reabrir'): Promise<boolean> {
    setError(null);
    setOcupado(true);
    try {
      const r = await conSesion(`/tareas/${tarea.id}/${accion}`, { metodo: 'POST' });
      if (!r) {
        alSalir();
        return false;
      }
      if (r.estado !== 200 || !ControlTarea.safeParse(r.cuerpo).success) {
        setError(mensajeDeError(r.cuerpo, 'No se pudo cambiar la tarea. Inténtalo de nuevo.'));
        return false;
      }
      alCambiar();
      return true;
    } catch {
      setError(SIN_CONEXION);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function hecho(tarea: TareaPersonal) {
    if (!(await control(tarea, 'hecha'))) return;
    setHecha(tarea);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setHecha(null), DESHACER_MS);
  }

  async function deshacer() {
    if (!hecha) return;
    const tarea = hecha;
    setHecha(null);
    await control(tarea, 'reabrir');
  }

  const aviso = (
    <>
      {hecha && (
        <View accessibilityRole="alert" style={estilos.deshacer}>
          <Text style={estilos.deshacerTexto}>{quedo(hecha)}</Text>
          <Pressable accessibilityRole="button" onPress={() => void deshacer()} style={estilos.enlace}>
            <Text style={estilos.enlaceTexto}>Deshacer</Text>
          </Pressable>
        </View>
      )}
      {error && <Aviso texto={error} />}
    </>
  );
  return { hecho, reabrir: (t: TareaPersonal) => void control(t, 'reabrir'), ocupado, aviso, conAviso: hecha !== null || error !== null };
}

function Detalle({ tarea }: { tarea: TareaPersonal }) {
  return (
    <>
      {tarea.espera && <Text style={estilos.suave}>{tarea.espera}</Text>}
      {tarea.cuando && (
        <View style={estilos.enLinea}>
          <Text style={[estilos.suave, tarea.vencida && estilos.vencida]}>{tarea.cuando}</Text>
          {tarea.vencida && <Text style={estilos.etiquetaVencida}>Vencida</Text>}
        </View>
      )}
    </>
  );
}

function Fila({ tarea, ocupado, alHecho, alAbrir }: { tarea: TareaPersonal; ocupado: boolean; alHecho: () => void; alAbrir?: () => void }) {
  return (
    <View role="listitem" style={estilos.tarea}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${tarea.texto}, ver detalle`} disabled={!alAbrir} onPress={alAbrir} style={estilos.tareaCuerpo}>
        <Text style={estilos.tareaTexto}>{tarea.texto}</Text>
        <Detalle tarea={tarea} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${nombreHecho(tarea)}: ${tarea.texto}`}
        disabled={ocupado}
        onPress={alHecho}
        style={[estilos.hecho, ocupado && estilos.apagado]}
      >
        <Text style={estilos.hechoTexto}>{nombreHecho(tarea)}</Text>
      </Pressable>
    </View>
  );
}

type Descarte = { tarea: TareaPersonal; propuesta: OperacionRespuesta | null };

export function SeccionTareas({ alAbrirCaptura, alSalir, version = 0 }: { alAbrirCaptura: () => void; alSalir: () => void; version?: number }) {
  const [franja, setFranja] = useState<FranjaTarea>('con_fecha');
  const [datos, setDatos] = useState<RespuestaTareas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verHechas, setVerHechas] = useState(false);
  const [abierta, setAbierta] = useState<Descarte | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const recargar = useCallback(() => setRecarga((n) => n + 1), []);
  const { hecho, reabrir, ocupado, aviso } = useHecho(recargar, alSalir);

  useEffect(() => {
    let vigente = true;
    void conSesion('/tareas')
      .then((r) => {
        if (!r) return alSalir();
        const leidas = RespuestaTareas.safeParse(r.cuerpo);
        if (!vigente) return;
        if (r.estado !== 200 || !leidas.success) return setError(mensajeDeError(r.cuerpo, 'No pudimos leer tus tareas.'));
        setError(null);
        setDatos(leidas.data);
      })
      .catch(() => vigente && setError(SIN_CONEXION));
    return () => {
      vigente = false;
    };
  }, [version, recarga, alSalir]);

  async function proponerDescarte(tarea: TareaPersonal) {
    setErrorDetalle(null);
    const r = await conSesion('/operaciones', { metodo: 'POST', cuerpo: { tipo: 'tareas.descartar', carga: { tareaId: tarea.id }, origen: 'control_directo' } });
    if (!r) return alSalir();
    const propuesta = OperacionRespuesta.safeParse(r.cuerpo);
    if (r.estado !== 201 || !propuesta.success) return setErrorDetalle(mensajeDeError(r.cuerpo));
    setAbierta({ tarea, propuesta: propuesta.data });
  }

  async function confirmarDescarte(propuesta: OperacionRespuesta) {
    const r = await conSesion(`/operaciones/${propuesta.id}/confirmar`, { metodo: 'POST' });
    if (!r) return alSalir();
    const hecha = OperacionRespuesta.safeParse(r.cuerpo);
    if (r.estado !== 200 || !hecha.success || hecha.data.estado !== 'ejecutada') return setErrorDetalle(mensajeDeError(r.cuerpo, 'No se pudo descartar. Inténtalo de nuevo.'));
    setAbierta(null);
    recargar();
  }

  async function noDescartar(descarte: Descarte) {
    if (descarte.propuesta) await conSesion(`/operaciones/${descarte.propuesta.id}/descartar`, { metodo: 'POST' });
    setAbierta({ tarea: descarte.tarea, propuesta: null });
  }

  const pendientes = datos?.pendientes.filter((t) => t.franja === franja) ?? [];
  const hechas = datos?.hechasRecientes.filter((t) => t.franja === franja) ?? [];
  const vacio = VACIO[franja];

  return (
    <View style={estilos.contenedor}>
      <View accessibilityRole="tablist" style={estilos.franjas}>
        {FRANJAS.map((f) => (
          <Pressable
            key={f.clave}
            accessibilityRole="tab"
            accessibilityState={{ selected: f.clave === franja }}
            onPress={() => {
              setFranja(f.clave);
              setVerHechas(false);
            }}
            style={[estilos.franja, f.clave === franja && estilos.franjaActiva]}
          >
            <Text style={[estilos.franjaTexto, f.clave === franja && estilos.franjaTextoActiva]}>{f.nombre}</Text>
          </Pressable>
        ))}
      </View>

      {aviso}
      {error && <Vacio titulo="No pudimos leer tus tareas" texto={error} />}
      {!error && !datos && <Text style={estilos.suave}>Leyendo tus tareas…</Text>}
      {datos && (
        <>
          <Text style={estilos.suave}>{datos.zona}</Text>
          {pendientes.length === 0 ? (
            <Vacio titulo={vacio.titulo} texto={vacio.texto}>
              <Boton texto="Pedírselo al asistente" alPulsar={alAbrirCaptura} />
            </Vacio>
          ) : (
            <View accessibilityRole="list" accessibilityLabel="Pendientes">
              {pendientes.map((t) => (
                <Fila key={t.id} tarea={t} ocupado={ocupado} alHecho={() => void hecho(t)} alAbrir={() => setAbierta({ tarea: t, propuesta: null })} />
              ))}
            </View>
          )}
          {hechas.length > 0 && (
            <View style={estilos.hechas}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: verHechas }} onPress={() => setVerHechas((v) => !v)} style={estilos.enlace}>
                <Text style={estilos.enlaceTexto}>{verHechas ? 'Ocultar hechas' : `Ver hechas (7 días) · ${hechas.length}`}</Text>
              </Pressable>
              {verHechas && (
                <View accessibilityRole="list" accessibilityLabel="Hechas en los últimos 7 días">
                  {hechas.map((t) => (
                    <View key={t.id} role="listitem" style={estilos.tarea}>
                      <View style={estilos.tareaCuerpo}>
                        <Text style={[estilos.tareaTexto, estilos.tachado]}>{t.texto}</Text>
                        {t.cierre && <Text style={estilos.suave}>{t.cierre}</Text>}
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Reabrir: ${t.texto}`} disabled={ocupado} onPress={() => reabrir(t)} style={estilos.hecho}>
                        <Text style={estilos.hechoTexto}>Reabrir</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* El detalle de una tarea: sus datos y «Descartar» con su tarjeta (REQ-CUN03-11) */}
      <Modal visible={!!abierta} animationType="slide" transparent onRequestClose={() => setAbierta(null)}>
        {abierta && (
          <View style={estilos.velo}>
            <View style={estilos.hoja}>
              <View style={estilos.cabeceraHoja}>
                <Text accessibilityRole="header" style={estilos.titulo}>
                  {abierta.tarea.texto}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => setAbierta(null)} style={estilos.enlace}>
                  <Text style={estilos.enlaceTexto}>Cerrar</Text>
                </Pressable>
              </View>
              <Detalle tarea={abierta.tarea} />
              {abierta.propuesta ? (
                <View accessibilityLabel={abierta.propuesta.vistaConfirmacion.accion} style={estilos.tarjeta}>
                  <Text style={estilos.tareaTexto}>{abierta.propuesta.vistaConfirmacion.accion}</Text>
                  {abierta.propuesta.vistaConfirmacion.datos.map((d) => (
                    <View key={d.etiqueta}>
                      <Text style={estilos.suave}>{d.etiqueta}</Text>
                      <Text style={estilos.cuerpo}>{d.valor}</Text>
                    </View>
                  ))}
                  {abierta.propuesta.vistaConfirmacion.irreversible && <Text style={estilos.irreversible}>{abierta.propuesta.vistaConfirmacion.irreversible}</Text>}
                  <Boton texto="Confirmar" alPulsar={() => void confirmarDescarte(abierta.propuesta!)} />
                  <Boton texto="No descartar" secundario alPulsar={() => void noDescartar(abierta)} />
                </View>
              ) : (
                <Boton texto="Descartar" secundario alPulsar={() => void proponerDescarte(abierta.tarea)} />
              )}
              {errorDetalle && <Aviso texto={errorDetalle} />}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

// T-055 · REQ-CUN03-13 · H-TP-09: debajo de los compromisos del nivel Hoy, fuera de la línea de horas, con «Hecho».
// Las vencidas, solo cuando el día mostrado es hoy (lo decide la API)
export function TareasParaEsteDia({ fecha, version = 0, alSalir }: { fecha: string; version?: number; alSalir: () => void }) {
  const [dia, setDia] = useState<TareasDelDia | null>(null);
  const [recarga, setRecarga] = useState(0);
  const { hecho, ocupado, aviso, conAviso } = useHecho(
    useCallback(() => setRecarga((n) => n + 1), []),
    alSalir,
  );

  useEffect(() => {
    let vigente = true;
    void conSesion(`/tareas/dia?fecha=${encodeURIComponent(fecha)}`)
      .then((r) => {
        if (!r) return alSalir();
        const leido = TareasDelDia.safeParse(r.cuerpo);
        // Si no se puede leer, Hoy se ve como siempre: no hay nada que afirmar
        if (vigente) setDia(r.estado === 200 && leido.success ? leido.data : null);
      })
      .catch(() => vigente && setDia(null));
    return () => {
      vigente = false;
    };
  }, [fecha, version, recarga, alSalir]);

  if (!dia || (dia.tareas.length === 0 && !conAviso)) return null;
  return (
    <View accessibilityLabel="Tareas para este día" style={estilos.delDia}>
      <Text accessibilityRole="header" style={estilos.delDiaTitulo}>
        Tareas para este día
      </Text>
      {aviso}
      <View accessibilityRole="list" accessibilityLabel="Tareas para este día">
        {dia.tareas.map((t) => (
          <View key={t.id} role="listitem" style={estilos.tarea}>
            <View style={estilos.tareaCuerpo}>
              <Text style={estilos.tareaTexto}>{t.texto}</Text>
              {t.vencida ? (
                <View style={estilos.enLinea}>
                  <Text style={[estilos.suave, estilos.vencida]}>{t.cuando}</Text>
                  <Text style={estilos.etiquetaVencida}>Vencida</Text>
                </View>
              ) : (
                t.horaLimite && <Text style={estilos.suave}>Antes de las {t.horaLimite}</Text>
              )}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Hecho: ${t.texto}`} disabled={ocupado} onPress={() => void hecho(t)} style={[estilos.hecho, ocupado && estilos.apagado]}>
              <Text style={estilos.hechoTexto}>Hecho</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function Vacio({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <View style={estilos.vacio}>
      <Text style={estilos.vacioTitulo}>{titulo}</Text>
      <Text style={estilos.vacioTexto}>{texto}</Text>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, gap: espaciado[16] },
  franjas: { flexDirection: 'row', alignSelf: 'flex-start', padding: 4, gap: 4, borderRadius: 12, backgroundColor: color.superficie.hundida },
  franja: { minHeight: 36, paddingHorizontal: espaciado[12], justifyContent: 'center', borderRadius: 8 },
  franjaActiva: { backgroundColor: color.superficie.base },
  franjaTexto: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  franjaTextoActiva: { color: color.texto.fuerte, fontWeight: '700' },
  suave: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave },
  cuerpo: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  titulo: { flex: 1, fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte },
  tarea: { flexDirection: 'row', alignItems: 'center', gap: espaciado[12], minHeight: 56, paddingVertical: espaciado[12], borderTopWidth: 1, borderTopColor: color.borde.base },
  tareaCuerpo: { flex: 1, gap: 2 },
  tareaTexto: { fontSize: tipografia.cuerpo, fontWeight: '600', color: color.texto.fuerte },
  enLinea: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espaciado[8] },
  vencida: { color: color.estado.error },
  etiquetaVencida: { paddingHorizontal: espaciado[8], paddingVertical: 2, borderRadius: 999, overflow: 'hidden', backgroundColor: color.superficie.hundida, color: color.estado.error, fontSize: tipografia.micro, fontWeight: '600' },
  hecho: { minHeight: 44, minWidth: 44, paddingHorizontal: espaciado[12], justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: color.marca.base },
  hechoTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  apagado: { borderColor: color.borde.fuerte },
  tachado: { textDecorationLine: 'line-through', color: color.texto.suave },
  hechas: { gap: espaciado[4] },
  enlace: { minHeight: 44, minWidth: 44, paddingHorizontal: espaciado[8], justifyContent: 'center', alignSelf: 'flex-start' },
  enlaceTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  deshacer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado[8], paddingLeft: espaciado[12], borderRadius: 12, backgroundColor: color.tinte.exito },
  deshacerTexto: { flex: 1, fontSize: tipografia.etiqueta, color: color.estado.exito },
  delDia: { gap: espaciado[4], marginTop: espaciado[16] },
  delDiaTitulo: { fontSize: tipografia.etiqueta, fontWeight: '700', color: color.texto.suave },
  vacio: { minHeight: 240, justifyContent: 'center', alignItems: 'center', gap: espaciado[8], padding: espaciado[24], borderRadius: 16, backgroundColor: color.superficie.elevada },
  vacioTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte, textAlign: 'center' },
  vacioTexto: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave, textAlign: 'center' },
  velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 33, 46, 0.4)' },
  hoja: { gap: espaciado[12], padding: espaciado[16], paddingBottom: espaciado[32], borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: color.superficie.base },
  cabeceraHoja: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaciado[8] },
  tarjeta: { gap: espaciado[8], padding: espaciado[16], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base, backgroundColor: color.superficie.elevada },
  irreversible: { fontSize: tipografia.etiqueta, color: color.estado.error },
});
