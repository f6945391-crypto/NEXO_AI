import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorApi, EventoAgenda, OperacionRespuesta, Perfil } from '@nexoai/contratos';
import { enSuZona, fechaDeHoy, horario, nombreDeZona, ordenar, rangoDeHoy } from '../agenda/dia';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';

// T-021 · REQ-CUN01-06, 10, 11, 12 · specs/02-agenda/plan.md §5. El nivel Hoy de Agenda en el móvil:
// los compromisos del día en la zona del perfil, con el huso a la vista. Tocar uno abre su detalle y, si es
// propio y vigente, se puede cancelar con su confirmación previa (DP-01). No hay formulario de creación.

const NIVELES = ['Hoy', 'Semana', 'Mes'] as const;

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin-calendario' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'lista'; zona: string; eventos: EventoAgenda[] };

type Cancelacion = { tipo: 'detalle' } | { tipo: 'confirmando'; propuesta: OperacionRespuesta } | { tipo: 'ocupado' };

export function AgendaHoy({ alSalir, alAbrirCaptura, version = 0 }: { alSalir: () => void; alAbrirCaptura: () => void; version?: number }) {
  const [nivel, setNivel] = useState<(typeof NIVELES)[number]>('Hoy');
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [abierto, setAbierto] = useState<EventoAgenda | null>(null);
  const [cancelacion, setCancelacion] = useState<Cancelacion>({ tipo: 'detalle' });
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const perfil = await conSesion('/perfil');
      if (!perfil) return alSalir();
      const leido = Perfil.safeParse(perfil.cuerpo);
      const zona = leido.success ? leido.data.zonaHoraria : null;
      if (!zona) return setEstado({ tipo: 'error', mensaje: 'No pudimos leer tu zona horaria.' });

      const { desde, hasta } = rangoDeHoy(zona);
      const r = await conSesion(`/agenda/eventos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
      if (!r) return alSalir();
      if (ErrorApi.safeParse(r.cuerpo).data?.codigo === 'PERMISO_GOOGLE_FALTANTE') return setEstado({ tipo: 'sin-calendario' });
      const eventos = EventoAgenda.array().safeParse(r.cuerpo);
      if (r.estado !== 200 || !eventos.success) return setEstado({ tipo: 'error', mensaje: mensajeDeError(r.cuerpo, 'No pudimos leer tu agenda. Inténtalo de nuevo en un momento.') });
      setEstado({ tipo: 'lista', zona, eventos: ordenar(eventos.data) });
    } catch {
      setEstado({ tipo: 'error', mensaje: SIN_CONEXION });
    }
  }, [alSalir]);

  // T-035: también cuando el asistente deja algo hecho
  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  function abrir(evento: EventoAgenda) {
    setAbierto(evento);
    setCancelacion({ tipo: 'detalle' });
    setError(null);
  }

  async function proponerCancelacion(evento: EventoAgenda) {
    setError(null);
    setCancelacion({ tipo: 'ocupado' });
    const r = await conSesion('/operaciones', { metodo: 'POST', cuerpo: { tipo: 'agenda.cancelar', carga: { eventoId: evento.id }, origen: 'control_directo' } });
    if (!r) return alSalir();
    const propuesta = OperacionRespuesta.safeParse(r.cuerpo);
    if (r.estado !== 201 || !propuesta.success) {
      setCancelacion({ tipo: 'detalle' });
      return setError(mensajeDeError(r.cuerpo));
    }
    setCancelacion({ tipo: 'confirmando', propuesta: propuesta.data });
  }

  async function confirmar(propuesta: OperacionRespuesta) {
    setCancelacion({ tipo: 'ocupado' });
    const r = await conSesion(`/operaciones/${propuesta.id}/confirmar`, { metodo: 'POST' });
    if (!r) return alSalir();
    const hecha = OperacionRespuesta.safeParse(r.cuerpo);
    if (r.estado !== 200 || !hecha.success || hecha.data.estado !== 'ejecutada') {
      setCancelacion({ tipo: 'confirmando', propuesta });
      return setError(mensajeDeError(r.cuerpo, 'No se pudo cancelar. Inténtalo de nuevo.'));
    }
    setAbierto(null);
    setAviso('Compromiso cancelado.');
    await cargar();
  }

  async function noCancelar(propuesta: OperacionRespuesta) {
    setCancelacion({ tipo: 'detalle' });
    await conSesion(`/operaciones/${propuesta.id}/descartar`, { metodo: 'POST' });
  }

  return (
    <View style={estilos.contenedor}>
      <View accessibilityRole="tablist" style={estilos.niveles}>
        {NIVELES.map((n) => (
          <Pressable key={n} accessibilityRole="tab" accessibilityState={{ selected: n === nivel }} onPress={() => setNivel(n)} style={[estilos.nivel, n === nivel && estilos.nivelActivo]}>
            <Text style={[estilos.nivelTexto, n === nivel && estilos.nivelTextoActivo]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      {aviso && (
        <Text accessibilityRole="alert" style={estilos.aviso}>
          {aviso}
        </Text>
      )}

      {nivel !== 'Hoy' && <Vacio titulo="Por ahora, solo el día de hoy" texto={`La vista de ${nivel.toLowerCase()} llega en una próxima versión.`} />}
      {nivel === 'Hoy' && estado.tipo === 'cargando' && <Text style={estilos.suave}>Leyendo tu agenda…</Text>}
      {nivel === 'Hoy' && estado.tipo === 'error' && <Vacio titulo="No pudimos leer tu agenda" texto={estado.mensaje} />}
      {nivel === 'Hoy' && estado.tipo === 'sin-calendario' && (
        <Vacio titulo="Tu agenda llega con tu calendario" texto="Para mostrarte tus compromisos, NexoAI necesita permiso para ver tu calendario de Google. Conéctalo desde Ajustes en la web." />
      )}
      {nivel === 'Hoy' && estado.tipo === 'lista' && estado.eventos.length === 0 && (
        // REQ-CUN01-12: la acción abre la capa de captura, nunca un formulario (R-42)
        <Vacio titulo="Hoy no tienes compromisos" texto="Para crear el primero, pídeselo al asistente con tus palabras, por ejemplo «Agéndame una reunión mañana a las 10».">
          <Boton texto="Pedírselo al asistente" alPulsar={alAbrirCaptura} />
        </Vacio>
      )}
      {nivel === 'Hoy' && estado.tipo === 'lista' && estado.eventos.length > 0 && (
        <View style={estilos.dia}>
          <Text accessibilityRole="header" style={estilos.fecha}>
            {fechaDeHoy(estado.zona)}
          </Text>
          {/* REQ-CUN01-10: en qué zona están las horas */}
          <Text style={estilos.suave}>{nombreDeZona(estado.zona)}</Text>
          <View accessibilityRole="list" accessibilityLabel="Compromisos de hoy">
            {estado.eventos.map((e) => (
              <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`${e.titulo}, ${horario(e, estado.zona)}`} onPress={() => abrir(e)} style={estilos.compromiso}>
                <Text style={estilos.horario}>{horario(e, estado.zona)}</Text>
                <View style={estilos.cuerpoCompromiso}>
                  <Text style={[estilos.tituloCompromiso, e.estado === 'cancelado' && estilos.tachado]}>{e.titulo}</Text>
                  <View style={estilos.etiquetas}>
                    {e.estado === 'cancelado' && <Etiqueta texto="Cancelado" />}
                    {!e.esOrganizador && <Etiqueta texto="Invitado" />}
                  </View>
                  {enSuZona(e, estado.zona) && <Text style={estilos.suave}>{enSuZona(e, estado.zona)}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Modal visible={!!abierto} animationType="slide" transparent onRequestClose={() => setAbierto(null)}>
        {abierto && estado.tipo === 'lista' && (
          <View style={estilos.velo}>
            <View style={estilos.hoja}>
              <View style={estilos.cabeceraHoja}>
                <Text accessibilityRole="header" style={estilos.fecha}>
                  {abierto.titulo}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => setAbierto(null)} style={estilos.cerrar}>
                  <Text style={estilos.cerrarTexto}>Cerrar</Text>
                </Pressable>
              </View>
              <Text style={estilos.cuerpo}>
                {horario(abierto, estado.zona)} · {nombreDeZona(estado.zona)}
              </Text>
              {enSuZona(abierto, estado.zona) && <Text style={estilos.suave}>{enSuZona(abierto, estado.zona)}</Text>}
              {abierto.serieId && <Text style={estilos.suave}>Se repite: cancelarlo afecta solo a esta vez.</Text>}

              {cancelacion.tipo === 'confirmando' ? (
                // P-03: la acción exacta, sus datos y qué es irreversible, antes de ejecutarla
                <View accessibilityLabel={cancelacion.propuesta.vistaConfirmacion.accion} style={estilos.tarjeta}>
                  <Text style={estilos.tituloCompromiso}>{cancelacion.propuesta.vistaConfirmacion.accion}</Text>
                  {cancelacion.propuesta.vistaConfirmacion.datos.map((d) => (
                    <View key={d.etiqueta}>
                      <Text style={estilos.suave}>{d.etiqueta}</Text>
                      <Text style={estilos.cuerpo}>{d.valor}</Text>
                    </View>
                  ))}
                  {cancelacion.propuesta.vistaConfirmacion.irreversible && <Text style={estilos.irreversible}>{cancelacion.propuesta.vistaConfirmacion.irreversible}</Text>}
                  <Boton texto="Confirmar la cancelación" alPulsar={() => confirmar(cancelacion.propuesta)} />
                  <Boton texto="No cancelar" secundario alPulsar={() => noCancelar(cancelacion.propuesta)} />
                </View>
              ) : abierto.estado === 'cancelado' ? (
                <Text style={estilos.suave}>Este compromiso ya está cancelado.</Text>
              ) : !abierto.esOrganizador ? (
                // H-AG-05: no se cancela por otra persona ni se declina la invitación por ella
                <Text style={estilos.suave}>Lo organiza otra persona: solo quien lo organiza puede cancelarlo. Si no vas a ir, puedes rechazar la invitación en Google Calendar.</Text>
              ) : (
                <Boton texto={cancelacion.tipo === 'ocupado' ? 'Preparando…' : 'Cancelar compromiso'} secundario deshabilitado={cancelacion.tipo === 'ocupado'} alPulsar={() => proponerCancelacion(abierto)} />
              )}
              {error && <Aviso texto={error} />}
            </View>
          </View>
        )}
      </Modal>
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

function Etiqueta({ texto }: { texto: string }) {
  return <Text style={estilos.etiqueta}>{texto}</Text>;
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, gap: espaciado[16] },
  niveles: { flexDirection: 'row', alignSelf: 'flex-start', padding: 4, gap: 4, borderRadius: 12, backgroundColor: color.superficie.hundida },
  nivel: { minHeight: 36, paddingHorizontal: espaciado[16], justifyContent: 'center', borderRadius: 8 },
  nivelActivo: { backgroundColor: color.superficie.base },
  nivelTexto: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  nivelTextoActivo: { color: color.texto.fuerte, fontWeight: '700' },
  aviso: { fontSize: tipografia.etiqueta, color: color.estado.exito },
  dia: { gap: espaciado[4] },
  fecha: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte },
  suave: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave },
  cuerpo: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  compromiso: { flexDirection: 'row', gap: espaciado[12], minHeight: 56, paddingVertical: espaciado[12], borderTopWidth: 1, borderTopColor: color.borde.base },
  horario: { width: 104, fontSize: tipografia.etiqueta, color: color.texto.suave, fontVariant: ['tabular-nums'] },
  cuerpoCompromiso: { flex: 1, gap: 2 },
  tituloCompromiso: { fontSize: tipografia.cuerpo, fontWeight: '600', color: color.texto.fuerte },
  tachado: { textDecorationLine: 'line-through', color: color.texto.suave },
  etiquetas: { flexDirection: 'row', gap: espaciado[4] },
  etiqueta: { alignSelf: 'flex-start', paddingHorizontal: espaciado[8], paddingVertical: 2, borderRadius: 999, overflow: 'hidden', backgroundColor: color.superficie.hundida, color: color.texto.suave, fontSize: tipografia.micro, fontWeight: '600' },
  vacio: { flex: 1, minHeight: 240, justifyContent: 'center', alignItems: 'center', gap: espaciado[8], padding: espaciado[24], borderRadius: 16, backgroundColor: color.superficie.elevada },
  vacioTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte, textAlign: 'center' },
  vacioTexto: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave, textAlign: 'center' },
  velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 33, 46, 0.4)' },
  hoja: { gap: espaciado[12], padding: espaciado[16], paddingBottom: espaciado[32], borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: color.superficie.base },
  cabeceraHoja: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaciado[8] },
  cerrar: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  cerrarTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  tarjeta: { gap: espaciado[8], padding: espaciado[16], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base, backgroundColor: color.superficie.elevada },
  irreversible: { fontSize: tipografia.etiqueta, color: color.estado.error },
});
