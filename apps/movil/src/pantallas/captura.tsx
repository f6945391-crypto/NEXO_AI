import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import { ConversacionAsistente, Perfil, RespuestaAsistente, type DecisionAsistente, type OperacionRespuesta, type TurnoAsistente } from '@nexoai/contratos';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { elementosDe, textoDelSeparador, type Elemento } from '../separador';
import { color, espaciado, tipografia } from '../tokens';

// T-021 · R-36, P-11. La capa de captura sube sobre la sección en la que estás y no navega. No hay camino
// manual paralelo (R-42; el cuadro móvil que lo ofrece es INC-11).
// T-035 · specs/07-agente/plan.md §9 · REQ-CAP-01, 23. Habla con el asistente por las mismas rutas que la
// web y muestra la misma tarjeta: lo que se ve lo arma la API, y la confirmación es la de Operaciones.
// Cada tipo de turno se ve distinto: la tarjeta que espera tu confirmación, lo que quedó en espera y un fallo.
// T-039 · REQ-AGT-03: la capa ya no se vacía. Abre con lo que se está pidiendo y lo anterior, separados por
// una línea con la hora y lo que se hizo, y «Ver anteriores» trae lo más viejo.
// Pulido · «Ver anteriores» visible: el botón se queda pegado arriba de la lista aunque se haga scroll,
// mientras quede algo anterior (`stickyHeaderIndices`, que en Expo web es `position: sticky`).

// H-CAP-02: el campo empieza en una línea y crece hasta cuatro
const LINEA = 24;
const LINEAS_MAXIMAS = 4;
// En el navegador, el foco lo marca el contorno de la barra y no el anillo propio del campo
const SIN_ANILLO_WEB = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

const hora = (iso: string, zona?: string) =>
  new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const dia = (iso: string, zona?: string) => new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));

// Pulido · REQ-CUN01-05, decisión 27 de 02-agenda: el choque de horario se dice en una línea, «Se cruza con
// «título»». El motivo largo que arma la API no se pinta aquí.
const enLista = (titulos: string[]) => (titulos.length < 2 ? titulos.join('') : `${titulos.slice(0, -1).join(', ')} y ${titulos[titulos.length - 1]}`);
const seCruzaCon = (eventos: { titulo: string }[]) => `Se cruza con ${enLista(eventos.map((e) => `«${e.titulo}»`))}`;

// H-CAP-01: lo esencial de la tarjeta plegada, en una línea, con los datos que trae la propia tarjeta y en este
// orden. No se inventa nada: de la duración solo se quita su explicación («1 hora, porque…» → «1 hora»).
const ESENCIALES = ['Título', 'Compromiso', 'Título nuevo', 'Fecha', 'Hora', 'Cuándo', 'Ahora', 'Nueva', 'Duración'];
function lineaEsencial(datos: { etiqueta: string; valor: string }[]): string {
  const valores = ESENCIALES.flatMap((etiqueta) => {
    const dato = datos.find((d) => d.etiqueta === etiqueta);
    if (!dato) return [];
    return [etiqueta === 'Duración' ? dato.valor.split(',')[0] : dato.valor];
  });
  // Una tarjeta con otros datos: los dos primeros, tal cual
  if (valores.length === 0) return datos.filter((d) => d.etiqueta !== 'Alternativas').slice(0, 2).map((d) => d.valor).join(' · ');
  return valores.join(' · ');
}

// La primera petición de la persona en lo que se está pidiendo
const primeraPeticion = (turnos: TurnoAsistente[]) => turnos.find((t) => t.tipo === 'persona')?.texto ?? null;

function Tarjeta({ operacion, activa, ocupado, alDecidir }: { operacion: OperacionRespuesta; activa: boolean; ocupado: boolean; alDecidir: (d: DecisionAsistente) => void }) {
  const [detalles, setDetalles] = useState(false);
  const vista = operacion.vistaConfirmacion;
  const alternativas = vista.conflicto?.alternativas ?? [];
  const choque = vista.conflicto?.eventos ?? [];
  // Con los botones a la vista, las alternativas no se repiten en texto
  const datos = activa && alternativas.length > 0 ? vista.datos.filter((d) => d.etiqueta !== 'Alternativas') : vista.datos;
  const esencial = lineaEsencial(vista.datos);
  return (
    // P-03: la acción exacta, sus datos y qué es irreversible, antes de ejecutarla. H-CAP-01: plegada por
    // defecto; «Ver detalles» muestra todos los datos en la misma tarjeta (REQ-CAP-01)
    <View accessibilityLabel="Para confirmar" style={estilos.tarjeta}>
      <Text style={estilos.accion}>{vista.accion}</Text>
      {esencial !== '' && (
        <Text numberOfLines={2} style={estilos.esencial}>
          {esencial}
        </Text>
      )}
      {detalles &&
        datos.map((d) => (
          <View key={d.etiqueta}>
            <Text style={estilos.suave}>{d.etiqueta}</Text>
            <Text style={estilos.cuerpo}>{d.valor}</Text>
          </View>
        ))}
      {vista.irreversible && <Text style={estilos.advertencia}>{vista.irreversible}</Text>}
      {!vista.confirmable && choque.length > 0 && (
        <Text numberOfLines={1} style={estilos.advertencia}>
          {seCruzaCon(choque)}
        </Text>
      )}
      {!vista.confirmable && choque.length === 0 && vista.motivoNoConfirmable && <Text style={estilos.advertencia}>{vista.motivoNoConfirmable}</Text>}
      {activa &&
        alternativas.map((a) => (
          <Boton
            key={a.inicio}
            secundario
            deshabilitado={ocupado}
            texto={`${dia(a.inicio)}, ${hora(a.inicio)} – ${hora(a.fin)}`}
            alPulsar={() => alDecidir({ operacionId: operacion.id, decision: 'alternativa', alternativa: a })}
          />
        ))}
      {activa && vista.confirmable && <Boton texto="Confirmar" deshabilitado={ocupado} alPulsar={() => alDecidir({ operacionId: operacion.id, decision: 'confirmar' })} />}
      <View style={estilos.fila}>
        {activa && (
          <View style={estilos.enFila}>
            <Boton texto="Descartar" secundario deshabilitado={ocupado} alPulsar={() => alDecidir({ operacionId: operacion.id, decision: 'descartar' })} />
          </View>
        )}
        <View style={estilos.enFila}>
          <Boton texto={detalles ? 'Ocultar detalles' : 'Ver detalles'} secundario expandido={detalles} alPulsar={() => setDetalles((d) => !d)} />
        </View>
      </View>
    </View>
  );
}

function Turno({ turno, pendiente, ocupado, alDecidir }: { turno: TurnoAsistente; pendiente: string | null; ocupado: boolean; alDecidir: (d: DecisionAsistente) => void }) {
  switch (turno.tipo) {
    case 'persona':
      return (
        <View style={estilos.pedido}>
          <Text style={estilos.pedidoTexto}>{turno.texto}</Text>
        </View>
      );
    case 'texto':
    case 'pregunta':
      return (
        <View style={estilos.respuesta}>
          <Text style={estilos.cuerpo}>{turno.texto}</Text>
        </View>
      );
    case 'agenda':
      return (
        <View accessibilityLabel={turno.lista.rango} style={estilos.agenda}>
          <Text style={estilos.suave}>
            {turno.lista.rango} · {turno.lista.zona}
          </Text>
          {turno.lista.compromisos.length === 0 ? (
            <Text style={estilos.cuerpo}>No tienes compromisos en ese momento.</Text>
          ) : (
            turno.lista.compromisos.map((c) => (
              <Text key={c.id} style={[estilos.cuerpo, c.cancelado && estilos.tachado]}>
                {c.horario} {c.titulo}
                {c.cancelado ? ' · Cancelado' : ''}
                {c.invitado ? ' · Invitado' : ''}
                {c.enSuZona ? ` · ${c.enSuZona}` : ''}
              </Text>
            ))
          )}
        </View>
      );
    case 'propuesta':
      return <Tarjeta operacion={turno.operacion} activa={pendiente === turno.operacion.id} ocupado={ocupado} alDecidir={alDecidir} />;
    case 'resultado':
      return <Text style={estilos.resultado}>{turno.texto}</Text>;
    case 'en_espera':
      // En espera no es un error (REQ-CAP-23): se guardó y no se creó nada
      return (
        <View style={estilos.espera}>
          <Text style={estilos.esperaTexto}>En espera. {turno.texto}</Text>
        </View>
      );
    case 'fallo':
      return <Aviso texto={turno.texto} />;
  }
}

export function CapaCaptura({
  visible,
  alCerrar,
  alCambiarAgenda,
  alCambiarPendiente,
  alSalir,
}: {
  visible: boolean;
  alCerrar: () => void;
  // Algo quedó hecho: la agenda se vuelve a pedir
  alCambiarAgenda: () => void;
  // H-CAP-04: si queda una propuesta esperando decisión, para que el asa lo señale
  alCambiarPendiente: (hay: boolean) => void;
  alSalir: () => void;
}) {
  const [borrador, setBorrador] = useState('');
  // Alto del texto escrito, entre una línea y cuatro
  const [altoTexto, setAltoTexto] = useState(LINEA);
  const [enfocado, setEnfocado] = useState(false);
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [pendiente, setPendiente] = useState<string | null>(null);
  // H-CAP-04: lo que se está pidiendo ahora, para el título de la capa. Nulo si no hay nada dicho
  const [enCurso, setEnCurso] = useState<{ id: string; peticion: string | null } | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [zona, setZona] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [trayendo, setTrayendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Al poner arriba lo anterior no se baja hasta el final: se queda donde se estaba leyendo
  const anclado = useRef(false);

  // Al abrir la capa: lo que se está pidiendo y lo anterior (dos tramos), y lo que espera confirmación
  const cargar = useCallback(async () => {
    try {
      const r = await conSesion('/asistente/conversacion?limite=2');
      if (!r) return alSalir();
      const conversacion = ConversacionAsistente.safeParse(r.cuerpo);
      if (r.estado === 200 && conversacion.success) {
        setElementos(elementosDe(conversacion.data.episodios));
        setPendiente(conversacion.data.pendiente);
        const abierto = conversacion.data.episodios.find((e) => e.id === conversacion.data.episodioAbierto);
        setEnCurso(abierto && abierto.turnos.length > 0 ? { id: abierto.id, peticion: primeraPeticion(abierto.turnos) } : null);
        setCursor(conversacion.data.hayAnteriores ? conversacion.data.cursor : null);
      }
      // P-05: la hora de las líneas, en la zona del perfil
      const perfil = await conSesion('/perfil');
      const leido = perfil ? Perfil.safeParse(perfil.cuerpo) : null;
      if (leido?.success && leido.data.zonaHoraria) setZona(leido.data.zonaHoraria);
    } catch {
      setError(SIN_CONEXION);
    }
  }, [alSalir]);

  async function traerAnteriores() {
    if (!cursor || trayendo) return;
    setTrayendo(true);
    try {
      const r = await conSesion(`/asistente/conversacion?limite=3&antes=${encodeURIComponent(cursor)}`);
      if (!r) return alSalir();
      const conversacion = ConversacionAsistente.safeParse(r.cuerpo);
      if (r.estado !== 200 || !conversacion.success) return setError(mensajeDeError(r.cuerpo, 'No se pudo traer lo anterior.'));
      anclado.current = true;
      setElementos((previos) => [...elementosDe(conversacion.data.episodios), ...previos]);
      setCursor(conversacion.data.hayAnteriores ? conversacion.data.cursor : null);
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setTrayendo(false);
    }
  }

  useEffect(() => {
    if (visible) void cargar();
  }, [visible, cargar]);

  useEffect(() => alCambiarPendiente(pendiente !== null), [pendiente, alCambiarPendiente]);

  const lista = useRef<ScrollView>(null);

  // `provisional`: el mensaje de la persona que ya se muestra, mientras el asistente responde. La respuesta
  // trae el definitivo, que lo reemplaza.
  async function hablar(ruta: string, cuerpo: unknown, provisional?: string) {
    setError(null);
    setOcupado(true);
    try {
      const r = await conSesion(ruta, { metodo: 'POST', cuerpo });
      if (!r) return alSalir();
      const respuesta = RespuestaAsistente.safeParse(r.cuerpo);
      if (r.estado !== 200 || !respuesta.success) return setError(mensajeDeError(r.cuerpo, 'El asistente no pudo responder. Inténtalo de nuevo.'));
      const { turnos, cierre, episodioId, episodioCerrado } = respuesta.data;
      setEnCurso((previo) => (episodioCerrado ? null : previo?.id === episodioId ? previo : { id: episodioId, peticion: primeraPeticion(turnos) ?? previo?.peticion ?? null }));
      setElementos((previos) => [
        ...previos.filter((e) => e.clase !== 'turno' || e.turno.id !== provisional),
        ...turnos.map((turno): Elemento => ({ clase: 'turno', turno })),
        ...(cierre ? [{ clase: 'separador' as const, id: `separador-${episodioId}`, cierre }] : []),
      ]);
      setPendiente(respuesta.data.pendiente);
      if (respuesta.data.turnos.some((t) => t.tipo === 'resultado')) alCambiarAgenda();
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setOcupado(false);
    }
  }

  function enviar() {
    const texto = borrador.trim();
    if (!texto || ocupado) return;
    setBorrador('');
    setAltoTexto(LINEA);
    // Lo escrito se ve al instante, sin esperar al asistente (corrección del 29 de octubre de 2026)
    const provisional: TurnoAsistente = { id: crypto.randomUUID(), en: new Date().toISOString(), tipo: 'persona', texto };
    setElementos((previos) => [...previos, { clase: 'turno', turno: provisional }]);
    // Si es lo primero que se pide, el título cambia ya; la respuesta trae el episodio de verdad
    setEnCurso((previo) => previo ?? { id: '', peticion: texto });
    // Al enviar, la lista baja hasta el final aunque se estuviera leyendo algo anterior
    anclado.current = false;
    void hablar('/asistente/mensajes', { texto }, provisional.id);
  }

  const puedeEnviar = !!borrador.trim() && !ocupado;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={alCerrar}>
      <View style={estilos.velo}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={estilos.hoja}>
          {/* H-CAP-04: una sola fila. «¿Qué hacemos?» solo si no hay nada dicho en lo que se pide ahora */}
          <View style={estilos.cabecera}>
            <View style={estilos.cabeceraTextos}>
              <Text accessibilityRole="header" style={estilos.titulo}>
                {enCurso ? 'Asistente' : '¿Qué hacemos?'}
              </Text>
              {enCurso?.peticion && (
                <Text numberOfLines={1} style={estilos.suave}>
                  {enCurso.peticion}
                </Text>
              )}
            </View>
            <Pressable accessibilityRole="button" onPress={alCerrar} style={estilos.cerrar}>
              <Text style={estilos.cerrarTexto}>Cerrar</Text>
            </Pressable>
          </View>

          <ScrollView
              ref={lista}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              onContentSizeChange={() => {
                if (anclado.current) {
                  anclado.current = false;
                  return;
                }
                lista.current?.scrollToEnd({ animated: true });
              }}
              stickyHeaderIndices={cursor ? [0] : undefined}
              style={estilos.turnos}
              contentContainerStyle={estilos.turnosContenido}
            >
              {cursor && (
                // Con fondo propio: lo que pasa por debajo al hacer scroll no se transparenta
                <View style={estilos.anterioresFranja}>
                  <Pressable accessibilityRole="button" onPress={() => void traerAnteriores()} disabled={trayendo} style={estilos.anteriores}>
                    <Text style={estilos.anterioresTexto}>{trayendo ? 'Trayendo…' : 'Ver anteriores'}</Text>
                  </Pressable>
                </View>
              )}
              {elementos.map((elemento) => {
                if (elemento.clase === 'turno') {
                  const { turno } = elemento;
                  return <Turno key={turno.id} turno={turno} pendiente={pendiente} ocupado={ocupado} alDecidir={(d) => void hablar('/asistente/decisiones', d)} />;
                }
                const texto = textoDelSeparador(elemento.cierre, zona ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
                return (
                  <View key={elemento.id} role="separator" aria-label={texto} style={estilos.separador}>
                    <View style={estilos.separadorLinea} />
                    <Text style={estilos.separadorTexto}>{texto}</Text>
                    <View style={estilos.separadorLinea} />
                  </View>
                );
              })}
            </ScrollView>
          {ocupado && <Text style={estilos.suave}>Pensando…</Text>}
          {error && <Aviso texto={error} />}

          {/* H-CAP-02: una sola fila, con el botón de enviar dentro del mismo contorno */}
          <View style={[estilos.barra, enfocado && estilos.barraEnfocada]}>
            <TextInput
              accessibilityLabel="Pídele algo al asistente"
              placeholder="Pídele algo al asistente"
              placeholderTextColor={color.texto.suave}
              value={borrador}
              onChangeText={(texto) => {
                setBorrador(texto);
                if (!texto) setAltoTexto(LINEA);
              }}
              onContentSizeChange={(e) => setAltoTexto(Math.min(Math.max(e.nativeEvent.contentSize.height, LINEA), LINEA * LINEAS_MAXIMAS))}
              onSubmitEditing={enviar}
              autoFocus
              multiline
              onFocus={() => setEnfocado(true)}
              onBlur={() => setEnfocado(false)}
              style={[estilos.entrada, SIN_ANILLO_WEB, { height: altoTexto }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              accessibilityState={{ disabled: !puedeEnviar }}
              disabled={!puedeEnviar}
              onPress={enviar}
              hitSlop={espaciado[4]}
              style={[estilos.enviar, !puedeEnviar && estilos.enviarApagado]}
            >
              <Text style={estilos.enviarTexto}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  // H-CAP-03: la capa arranca donde empieza la cabecera de la sección y la tapa; detrás queda el antecedente
  velo: { flex: 1, paddingTop: espaciado[24], backgroundColor: color.velo.capa },
  hoja: { flex: 1, gap: espaciado[12], padding: espaciado[16], borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: color.superficie.base },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaciado[8] },
  cabeceraTextos: { flex: 1 },
  titulo: { fontSize: tipografia.subtitulo, fontWeight: '700', color: color.texto.fuerte },
  cerrar: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  cerrarTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  turnos: { flex: 1 },
  turnosContenido: { gap: espaciado[8] },
  pedido: { alignSelf: 'flex-end', maxWidth: '85%', padding: espaciado[12], borderRadius: 12, backgroundColor: color.marca.base },
  pedidoTexto: { fontSize: tipografia.cuerpo, color: color.texto.inverso },
  respuesta: { alignSelf: 'flex-start', maxWidth: '92%', padding: espaciado[12], borderRadius: 12, backgroundColor: color.agente.suave },
  agenda: { gap: espaciado[4], padding: espaciado[12], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base, backgroundColor: color.superficie.elevada },
  tarjeta: { gap: espaciado[8], padding: espaciado[16], borderRadius: 12, borderWidth: 1, borderColor: color.borde.fuerte, backgroundColor: color.superficie.base },
  accion: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte },
  esencial: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.fuerte },
  fila: { flexDirection: 'row', gap: espaciado[8] },
  enFila: { flex: 1 },
  advertencia: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.estado.advertencia },
  resultado: { padding: espaciado[12], borderRadius: 12, backgroundColor: '#E6F4EC', color: color.estado.exito, fontSize: tipografia.cuerpo },
  espera: { padding: espaciado[12], borderRadius: 12, backgroundColor: '#FDF3E0' },
  esperaTexto: { color: '#7A4F00', fontSize: tipografia.etiqueta, lineHeight: 20 },
  cuerpo: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  suave: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave },
  tachado: { textDecorationLine: 'line-through', color: color.texto.suave },
  separador: { flexDirection: 'row', alignItems: 'center', gap: espaciado[8], paddingVertical: espaciado[4] },
  separadorLinea: { flex: 1, height: 1, backgroundColor: color.borde.base },
  separadorTexto: { fontSize: 12, color: color.texto.suave },
  anterioresFranja: { alignItems: 'center', paddingBottom: espaciado[4], backgroundColor: color.superficie.base },
  anteriores: { alignSelf: 'center', backgroundColor: color.superficie.base, minHeight: 44, justifyContent: 'center', paddingHorizontal: espaciado[16], borderWidth: 1, borderColor: color.borde.fuerte, borderRadius: 12 },
  anterioresTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  barra: { flexDirection: 'row', alignItems: 'flex-end', gap: espaciado[8], padding: espaciado[4], paddingLeft: espaciado[16], borderWidth: 1, borderColor: color.borde.fuerte, borderRadius: 24, backgroundColor: color.superficie.base },
  barraEnfocada: { borderColor: color.marca.base },
  // Sin relleno propio: así el alto del contenido es el del texto y el campo no crece solo
  entrada: { flex: 1, marginVertical: espaciado[8], paddingVertical: 0, fontSize: tipografia.cuerpo, lineHeight: LINEA, color: color.texto.fuerte, textAlignVertical: 'top' },
  // Tan alto como una línea del campo: la barra no cambia de alto por el botón
  enviar: { width: LINEA + espaciado[8] * 2, height: LINEA + espaciado[8] * 2, borderRadius: (LINEA + espaciado[8] * 2) / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: color.marca.base },
  enviarApagado: { backgroundColor: color.borde.fuerte },
  enviarTexto: { fontSize: tipografia.subtitulo, fontWeight: '700', color: color.texto.inverso },
});
