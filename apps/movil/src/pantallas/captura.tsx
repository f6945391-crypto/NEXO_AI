import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

const hora = (iso: string, zona?: string) =>
  new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const dia = (iso: string, zona?: string) => new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));

function Tarjeta({ operacion, activa, ocupado, alDecidir }: { operacion: OperacionRespuesta; activa: boolean; ocupado: boolean; alDecidir: (d: DecisionAsistente) => void }) {
  const vista = operacion.vistaConfirmacion;
  const alternativas = vista.conflicto?.alternativas ?? [];
  return (
    // P-03: la acción exacta, sus datos y qué es irreversible, antes de ejecutarla
    <View accessibilityLabel="Para confirmar" style={estilos.tarjeta}>
      <Text style={estilos.accion}>{vista.accion}</Text>
      {vista.datos.map((d) => (
        <View key={d.etiqueta}>
          <Text style={estilos.suave}>{d.etiqueta}</Text>
          <Text style={estilos.cuerpo}>{d.valor}</Text>
        </View>
      ))}
      {vista.irreversible && <Text style={estilos.advertencia}>{vista.irreversible}</Text>}
      {!vista.confirmable && vista.motivoNoConfirmable && <Text style={estilos.advertencia}>{vista.motivoNoConfirmable}</Text>}
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
      {activa && <Boton texto="Descartar" secundario deshabilitado={ocupado} alPulsar={() => alDecidir({ operacionId: operacion.id, decision: 'descartar' })} />}
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
  alSalir,
}: {
  visible: boolean;
  alCerrar: () => void;
  // Algo quedó hecho: la agenda se vuelve a pedir
  alCambiarAgenda: () => void;
  alSalir: () => void;
}) {
  const [borrador, setBorrador] = useState('');
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [pendiente, setPendiente] = useState<string | null>(null);
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
      const { turnos, cierre, episodioId } = respuesta.data;
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
    // Lo escrito se ve al instante, sin esperar al asistente (corrección del 29 de octubre de 2026)
    const provisional: TurnoAsistente = { id: crypto.randomUUID(), en: new Date().toISOString(), tipo: 'persona', texto };
    setElementos((previos) => [...previos, { clase: 'turno', turno: provisional }]);
    void hablar('/asistente/mensajes', { texto }, provisional.id);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={alCerrar}>
      <View style={estilos.velo}>
        <View style={estilos.hoja}>
          <View style={estilos.cabecera}>
            <Text accessibilityRole="header" style={estilos.titulo}>
              ¿Qué hacemos?
            </Text>
            <Pressable accessibilityRole="button" onPress={alCerrar} style={estilos.cerrar}>
              <Text style={estilos.cerrarTexto}>Cerrar</Text>
            </Pressable>
          </View>

          {elementos.length > 0 && (
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
          )}
          {ocupado && <Text style={estilos.suave}>Pensando…</Text>}
          {error && <Aviso texto={error} />}

          <TextInput
            accessibilityLabel="Pídele algo al asistente"
            placeholder="Pídele algo al asistente"
            placeholderTextColor={color.texto.suave}
            value={borrador}
            onChangeText={setBorrador}
            onSubmitEditing={enviar}
            autoFocus
            multiline
            style={estilos.entrada}
          />
          <Boton texto="Enviar" alPulsar={enviar} deshabilitado={!borrador.trim() || ocupado} />
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 33, 46, 0.4)' },
  hoja: { maxHeight: '92%', gap: espaciado[12], padding: espaciado[16], paddingBottom: espaciado[32], borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: color.superficie.base },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: tipografia.subtitulo, fontWeight: '700', color: color.texto.fuerte },
  cerrar: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  cerrarTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  turnos: { flexGrow: 0 },
  turnosContenido: { gap: espaciado[8] },
  pedido: { alignSelf: 'flex-end', maxWidth: '85%', padding: espaciado[12], borderRadius: 12, backgroundColor: color.marca.base },
  pedidoTexto: { fontSize: tipografia.cuerpo, color: color.texto.inverso },
  respuesta: { alignSelf: 'flex-start', maxWidth: '92%', padding: espaciado[12], borderRadius: 12, backgroundColor: color.agente.suave },
  agenda: { gap: espaciado[4], padding: espaciado[12], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base, backgroundColor: color.superficie.elevada },
  tarjeta: { gap: espaciado[8], padding: espaciado[16], borderRadius: 12, borderWidth: 1, borderColor: color.borde.fuerte, backgroundColor: color.superficie.base },
  accion: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte },
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
  entrada: { minHeight: 72, padding: espaciado[12], borderWidth: 1, borderColor: color.borde.fuerte, borderRadius: 12, fontSize: tipografia.cuerpo, color: color.texto.fuerte, textAlignVertical: 'top' },
});
