import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ConversacionAsistente, RespuestaAsistente, type DecisionAsistente, type OperacionRespuesta, type TurnoAsistente } from '@nexoai/contratos';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';

// T-021 · R-36, P-11. La capa de captura sube sobre la sección en la que estás y no navega. No hay camino
// manual paralelo (R-42; el cuadro móvil que lo ofrece es INC-11).
// T-035 · specs/07-agente/plan.md §9 · REQ-CAP-01, 23. Habla con el asistente por las mismas rutas que la
// web y muestra la misma tarjeta: lo que se ve lo arma la API, y la confirmación es la de Operaciones.
// Cada tipo de turno se ve distinto: la tarjeta que espera tu confirmación, lo que quedó en espera y un fallo.

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
  const [turnos, setTurnos] = useState<TurnoAsistente[]>([]);
  const [pendiente, setPendiente] = useState<string | null>(null);
  // REQ-AGT-01: tras cerrarse una acción, lo siguiente que se pide empieza en limpio
  const [cerrada, setCerrada] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir la capa, la conversación abierta: lo que espera confirmación o quedó en espera sigue ahí
  const cargar = useCallback(async () => {
    try {
      const r = await conSesion('/asistente/conversacion');
      if (!r) return alSalir();
      const conversacion = ConversacionAsistente.safeParse(r.cuerpo);
      if (r.estado === 200 && conversacion.success) {
        setTurnos(conversacion.data.turnos);
        setPendiente(conversacion.data.pendiente);
      }
    } catch {
      setError(SIN_CONEXION);
    }
  }, [alSalir]);

  useEffect(() => {
    if (visible) void cargar();
  }, [visible, cargar]);

  async function hablar(ruta: string, cuerpo: unknown, reiniciar: boolean) {
    setError(null);
    setOcupado(true);
    try {
      const r = await conSesion(ruta, { metodo: 'POST', cuerpo });
      if (!r) return alSalir();
      const respuesta = RespuestaAsistente.safeParse(r.cuerpo);
      if (r.estado !== 200 || !respuesta.success) return setError(mensajeDeError(r.cuerpo, 'El asistente no pudo responder. Inténtalo de nuevo.'));
      setTurnos((previos) => (reiniciar ? respuesta.data.turnos : [...previos, ...respuesta.data.turnos]));
      setPendiente(respuesta.data.pendiente);
      setCerrada(respuesta.data.cerrada);
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
    void hablar('/asistente/mensajes', { texto }, cerrada);
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

          {turnos.length > 0 && (
            <ScrollView style={estilos.turnos} contentContainerStyle={estilos.turnosContenido}>
              {turnos.map((turno) => (
                <Turno key={turno.id} turno={turno} pendiente={pendiente} ocupado={ocupado} alDecidir={(d) => void hablar('/asistente/decisiones', d, false)} />
              ))}
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
  entrada: { minHeight: 72, padding: espaciado[12], borderWidth: 1, borderColor: color.borde.fuerte, borderRadius: 12, fontSize: tipografia.cuerpo, color: color.texto.fuerte, textAlignVertical: 'top' },
});
