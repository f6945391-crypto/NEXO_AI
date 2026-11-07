import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorApi, EventoAgenda, OperacionRespuesta, Perfil } from '@nexoai/contratos';
import {
  dias,
  enSuZona,
  fechaDeHoy,
  fechaLarga,
  horario,
  hoyEn,
  lunesDe,
  nombreDeLaSemana,
  nombreDelMes,
  nombreDeZona,
  ordenar,
  porDia,
  puntosDelDia,
  rangoDeFechas,
  rejillaDelMes,
  sumarDias,
  sumarMeses,
} from '../agenda/dia';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';
import { TareasParaEsteDia } from './tareas';

// T-021 · REQ-CUN01-06, 10, 11, 12 · specs/02-agenda/plan.md §5. El nivel Hoy de Agenda en el móvil:
// los compromisos del día en la zona del perfil, con el huso a la vista. Tocar uno abre su detalle y, si es
// propio y vigente, se puede cancelar con su confirmación previa (DP-01). No hay formulario de creación.
// T-044 · REQ-CUN01-14, 15 · design/ARQUITECTURA-VISUAL-MOVIL.md §3 ter. Semana: los siete días uno debajo de
// otro, cada uno con sus compromisos. Mes: la rejilla con un punto por cada dos compromisos; tocar un día lo
// abre en Hoy, con «Volver a hoy». Los tres niveles giran sobre una fecha, `foco`, que empieza en hoy.

const NIVELES = ['Hoy', 'Semana', 'Mes'] as const;

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin-calendario' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'lista'; eventos: EventoAgenda[] };

export type Nivel = (typeof NIVELES)[number];

// Las fechas que pinta cada nivel alrededor del foco
function fechasDelNivel(nivel: Nivel, foco: string): string[] {
  if (nivel === 'Semana') return dias(lunesDe(foco), 7);
  if (nivel === 'Mes') return rejillaDelMes(foco);
  return [foco];
}

const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const contarCompromisos = (n: number) => (n === 0 ? 'sin compromisos' : n === 1 ? '1 compromiso' : `${n} compromisos`);

type Cancelacion = { tipo: 'detalle' } | { tipo: 'confirmando'; propuesta: OperacionRespuesta } | { tipo: 'ocupado' };

export function AgendaHoy({
  alSalir,
  alAbrirCaptura,
  alCambiarNivel,
  mostrar,
  version = 0,
}: {
  alSalir: () => void;
  alAbrirCaptura: () => void;
  alCambiarNivel?: (nivel: Nivel) => void;
  mostrar?: (vista: View) => void;
  version?: number;
}) {
  const [nivel, setNivel] = useState<Nivel>('Hoy');
  const [zona, setZona] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [abierto, setAbierto] = useState<EventoAgenda | null>(null);
  const [cancelacion, setCancelacion] = useState<Cancelacion>({ tipo: 'detalle' });
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quien la pinta sabe en qué nivel está: la franja «en espera» solo va sobre Hoy (REQ-CAP-25)
  useEffect(() => alCambiarNivel?.(nivel), [nivel, alCambiarNivel]);

  // La zona del perfil, una vez: con ella se sabe qué fecha es hoy (P-05)
  useEffect(() => {
    void (async () => {
      try {
        const perfil = await conSesion('/perfil');
        if (!perfil) return alSalir();
        const leido = Perfil.safeParse(perfil.cuerpo);
        const dePerfil = leido.success ? leido.data.zonaHoraria : null;
        if (!dePerfil) return setEstado({ tipo: 'error', mensaje: 'No pudimos leer tu zona horaria.' });
        setZona(dePerfil);
        setFoco(hoyEn(dePerfil));
      } catch {
        setEstado({ tipo: 'error', mensaje: SIN_CONEXION });
      }
    })();
  }, [alSalir]);

  // Solo cuenta la última petición: al cambiar rápido de nivel o de período, una respuesta vieja que llega
  // tarde no pisa a la nueva
  const ultima = useRef(0);

  const cargar = useCallback(async () => {
    if (!zona || !foco) return;
    const esta = ++ultima.current;
    try {
      const fechas = fechasDelNivel(nivel, foco);
      const { desde, hasta } = rangoDeFechas(fechas[0]!, fechas[fechas.length - 1]!, zona);
      const r = await conSesion(`/agenda/eventos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
      if (esta !== ultima.current) return;
      if (!r) return alSalir();
      if (ErrorApi.safeParse(r.cuerpo).data?.codigo === 'PERMISO_GOOGLE_FALTANTE') return setEstado({ tipo: 'sin-calendario' });
      const eventos = EventoAgenda.array().safeParse(r.cuerpo);
      if (r.estado !== 200 || !eventos.success) return setEstado({ tipo: 'error', mensaje: mensajeDeError(r.cuerpo, 'No pudimos leer tu agenda. Inténtalo de nuevo en un momento.') });
      setEstado({ tipo: 'lista', eventos: ordenar(eventos.data) });
    } catch {
      if (esta === ultima.current) setEstado({ tipo: 'error', mensaje: SIN_CONEXION });
    }
  }, [alSalir, zona, foco, nivel]);

  // T-035: también cuando el asistente deja algo hecho
  useEffect(() => {
    setEstado({ tipo: 'cargando' });
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

      {estado.tipo === 'cargando' && <Text style={estilos.suave}>Leyendo tu agenda…</Text>}
      {estado.tipo === 'error' && <Vacio titulo="No pudimos leer tu agenda" texto={estado.mensaje} />}
      {estado.tipo === 'sin-calendario' && (
        <Vacio titulo="Tu agenda llega con tu calendario" texto="Para mostrarte tus compromisos, NexoAI necesita permiso para ver tu calendario de Google. Conéctalo desde Ajustes en la web." />
      )}
      {estado.tipo === 'lista' && zona && foco && nivel === 'Hoy' && (
        <NivelHoy foco={foco} zona={zona} eventos={estado.eventos} alAbrir={abrir} alVolverAHoy={() => setFoco(hoyEn(zona))} alAbrirCaptura={alAbrirCaptura} />
      )}
      {/* T-055 · REQ-CUN03-13: debajo de los compromisos de Hoy, también sin calendario (REQ-CUN03-20); nunca en Semana ni en Mes */}
      {(estado.tipo === 'lista' || estado.tipo === 'sin-calendario') && foco && nivel === 'Hoy' && <TareasParaEsteDia fecha={foco} version={version} alSalir={alSalir} />}
      {estado.tipo === 'lista' && zona && foco && nivel === 'Semana' && (
        <NivelSemana foco={foco} zona={zona} eventos={estado.eventos} alAbrir={abrir} alMover={(semanas) => setFoco(sumarDias(lunesDe(foco), semanas * 7))} mostrar={mostrar} />
      )}
      {estado.tipo === 'lista' && zona && foco && nivel === 'Mes' && (
        <NivelMes
          foco={foco}
          zona={zona}
          eventos={estado.eventos}
          alMover={(meses) => setFoco(sumarMeses(foco, meses))}
          alElegir={(fecha) => {
            setFoco(fecha);
            setNivel('Hoy');
          }}
        />
      )}

      <Modal visible={!!abierto} animationType="slide" transparent onRequestClose={() => setAbierto(null)}>
        {abierto && zona && (
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
                {horario(abierto, zona)} · {nombreDeZona(zona)}
              </Text>
              {enSuZona(abierto, zona) && <Text style={estilos.suave}>{enSuZona(abierto, zona)}</Text>}
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

type PropsNivel = { foco: string; zona: string; eventos: EventoAgenda[] };

// Un compromiso en su fila: la hora, el título y sus marcas. Igual en Hoy y en Semana.
function Fila({ evento, zona, alAbrir }: { evento: EventoAgenda; zona: string; alAbrir: (e: EventoAgenda) => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${evento.titulo}, ${horario(evento, zona)}`} onPress={() => alAbrir(evento)} style={estilos.compromiso}>
      <Text style={estilos.horario}>{horario(evento, zona)}</Text>
      <View style={estilos.cuerpoCompromiso}>
        <Text style={[estilos.tituloCompromiso, evento.estado === 'cancelado' && estilos.tachado]}>{evento.titulo}</Text>
        {(evento.estado === 'cancelado' || !evento.esOrganizador) && (
          <View style={estilos.etiquetas}>
            {evento.estado === 'cancelado' && <Etiqueta texto="Cancelado" />}
            {!evento.esOrganizador && <Etiqueta texto="Invitado" />}
          </View>
        )}
        {enSuZona(evento, zona) && <Text style={estilos.suave}>{enSuZona(evento, zona)}</Text>}
      </View>
    </Pressable>
  );
}

// Anterior · período · siguiente
function Navegacion({ titulo, anterior, siguiente, alMover }: { titulo: string; anterior: string; siguiente: string; alMover: (paso: number) => void }) {
  return (
    <View style={estilos.navegacion}>
      <Pressable accessibilityRole="button" accessibilityLabel={anterior} onPress={() => alMover(-1)} style={estilos.enlace}>
        <Text style={estilos.enlaceTexto}>Anterior</Text>
      </Pressable>
      <Text accessibilityRole="header" style={estilos.fecha}>
        {titulo}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={siguiente} onPress={() => alMover(1)} style={estilos.enlace}>
        <Text style={estilos.enlaceTexto}>Siguiente</Text>
      </Pressable>
    </View>
  );
}

function NivelHoy({ foco, zona, eventos, alAbrir, alVolverAHoy, alAbrirCaptura }: PropsNivel & { alAbrir: (e: EventoAgenda) => void; alVolverAHoy: () => void; alAbrirCaptura: () => void }) {
  const esHoy = foco === hoyEn(zona);
  return (
    <View style={estilos.dia}>
      {/* REQ-CUN01-15: un día elegido en el mes se ve aquí, y se vuelve a hoy con un toque */}
      <View style={estilos.cabeceraDia}>
        <Text accessibilityRole="header" style={estilos.fecha}>
          {esHoy ? fechaDeHoy(zona) : fechaLarga(foco)}
        </Text>
        {!esHoy && (
          <Pressable accessibilityRole="button" onPress={alVolverAHoy} style={estilos.enlace}>
            <Text style={estilos.enlaceTexto}>Volver a hoy</Text>
          </Pressable>
        )}
      </View>
      {/* REQ-CUN01-10: en qué zona están las horas */}
      <Text style={estilos.suave}>{nombreDeZona(zona)}</Text>
      {eventos.length === 0 ? (
        // REQ-CUN01-12: la acción abre la capa de captura, nunca un formulario (R-42)
        <Vacio
          titulo={esHoy ? 'Hoy no tienes compromisos' : 'Ese día no tienes compromisos'}
          texto={esHoy ? 'Para crear el primero, pídeselo al asistente con tus palabras, por ejemplo «Agéndame una reunión mañana a las 10».' : 'Para crear uno, pídeselo al asistente con tus palabras.'}
        >
          <Boton texto="Pedírselo al asistente" alPulsar={alAbrirCaptura} />
        </Vacio>
      ) : (
        <View accessibilityRole="list" accessibilityLabel={esHoy ? 'Compromisos de hoy' : `Compromisos del ${fechaLarga(foco).toLowerCase()}`}>
          {eventos.map((e) => (
            <Fila key={e.id} evento={e} zona={zona} alAbrir={alAbrir} />
          ))}
        </View>
      )}
    </View>
  );
}

// REQ-CUN01-14: los siete días, de lunes a domingo, también los que no tienen nada. Pulido: al abrir, el día de
// hoy queda a la vista aunque haya mucho antes; una sola vez y sin animar, después manda la persona.
function NivelSemana({
  foco,
  zona,
  eventos,
  alAbrir,
  alMover,
  mostrar,
}: PropsNivel & { alAbrir: (e: EventoAgenda) => void; alMover: (semanas: number) => void; mostrar?: (vista: View) => void }) {
  const lunes = lunesDe(foco);
  const fechas = dias(lunes, 7);
  const delDia = porDia(eventos, fechas, zona);
  const hoy = hoyEn(zona);
  const deHoy = useRef<View>(null);
  const mostrado = useRef(false);
  function alColocarHoy() {
    if (mostrado.current || !deHoy.current) return;
    mostrado.current = true;
    mostrar?.(deHoy.current);
  }
  return (
    <View style={estilos.dia}>
      <Navegacion titulo={nombreDeLaSemana(lunes)} anterior="Semana anterior" siguiente="Semana siguiente" alMover={alMover} />
      <Text style={estilos.suave}>{nombreDeZona(zona)}</Text>
      <View style={estilos.semana}>
        {fechas.map((fecha) => {
          const compromisos = delDia.get(fecha) ?? [];
          const esHoy = fecha === hoy;
          return (
            // El día de hoy lleva borde/fuerte (design/ARQUITECTURA-VISUAL-MOVIL.md §3 ter)
            <View
              key={fecha}
              ref={esHoy ? deHoy : undefined}
              onLayout={esHoy ? alColocarHoy : undefined}
              accessibilityLabel={esHoy ? `Hoy, ${fechaLarga(fecha).toLowerCase()}` : fechaLarga(fecha)}
              style={[estilos.diaSemana, esHoy && estilos.diaHoy]}
            >
              <View style={estilos.cabeceraDia}>
                <Text accessibilityRole="header" style={estilos.tituloDia}>
                  {fechaLarga(fecha)}
                </Text>
                {esHoy && <Etiqueta texto="Hoy" />}
              </View>
              {compromisos.length === 0 ? (
                <Text style={estilos.suave}>Sin compromisos</Text>
              ) : (
                compromisos.map((e) => <Fila key={`${fecha}-${e.id}`} evento={e} zona={zona} alAbrir={alAbrir} />)
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// REQ-CUN01-15: la forma del mes. Los cancelados no cuentan para los puntos: ya no son compromisos.
function NivelMes({ foco, zona, eventos, alMover, alElegir }: PropsNivel & { alMover: (meses: number) => void; alElegir: (fecha: string) => void }) {
  const fechas = rejillaDelMes(foco);
  const delDia = porDia(eventos.filter((e) => e.estado !== 'cancelado'), fechas, zona);
  const hoy = hoyEn(zona);
  const mes = foco.slice(0, 7);
  const semanas = Array.from({ length: fechas.length / 7 }, (_, i) => fechas.slice(i * 7, i * 7 + 7));
  return (
    <View style={estilos.dia}>
      <Navegacion titulo={nombreDelMes(foco)} anterior="Mes anterior" siguiente="Mes siguiente" alMover={alMover} />
      <Text style={estilos.suave}>{nombreDeZona(zona)}</Text>
      <View accessibilityLabel={`Rejilla de ${nombreDelMes(foco).toLowerCase()}`} style={estilos.rejilla}>
        <View style={estilos.filaMes}>
          {INICIALES.map((inicial) => (
            <Text key={inicial} style={estilos.inicial}>
              {inicial}
            </Text>
          ))}
        </View>
        {semanas.map((semana) => (
          <View key={semana[0]} style={estilos.filaMes}>
            {semana.map((fecha) => {
              const n = delDia.get(fecha)?.length ?? 0;
              const deOtroMes = fecha.slice(0, 7) !== mes;
              const esHoy = fecha === hoy;
              return (
                <Pressable
                  key={fecha}
                  accessibilityRole="button"
                  accessibilityLabel={`${fechaLarga(fecha)}, ${contarCompromisos(n)}`}
                  onPress={() => alElegir(fecha)}
                  style={[estilos.celda, esHoy && estilos.celdaHoy]}
                >
                  <Text style={[estilos.numero, deOtroMes && estilos.numeroAtenuado, esHoy && estilos.numeroHoy]}>{Number(fecha.slice(8, 10))}</Text>
                  <View style={estilos.puntos}>
                    {Array.from({ length: puntosDelDia(n) }, (_, i) => (
                      <View key={i} testID="punto" style={[estilos.punto, deOtroMes && estilos.puntoAtenuado]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
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
  cabeceraDia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado[8] },
  enlace: { minHeight: 44, minWidth: 44, paddingHorizontal: espaciado[8], justifyContent: 'center', alignItems: 'center' },
  enlaceTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  navegacion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado[8] },
  semana: { gap: espaciado[12], marginTop: espaciado[8] },
  diaSemana: { gap: espaciado[4], padding: espaciado[12], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base },
  diaHoy: { borderColor: color.borde.fuerte },
  tituloDia: { fontSize: tipografia.etiqueta, fontWeight: '700', color: color.texto.fuerte },
  rejilla: { gap: espaciado[4], marginTop: espaciado[8] },
  filaMes: { flexDirection: 'row', gap: espaciado[4] },
  inicial: { flex: 1, textAlign: 'center', fontSize: tipografia.micro, fontWeight: '600', color: color.texto.suave },
  celda: { flex: 1, minHeight: 52, alignItems: 'center', paddingTop: espaciado[8], gap: espaciado[4], borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  celdaHoy: { borderColor: color.borde.fuerte },
  numero: { fontSize: tipografia.etiqueta, color: color.texto.fuerte, fontVariant: ['tabular-nums'] },
  numeroAtenuado: { color: color.borde.fuerte },
  numeroHoy: { fontWeight: '700' },
  puntos: { flexDirection: 'row', gap: 3, minHeight: 6 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.marca.base },
  puntoAtenuado: { backgroundColor: color.borde.fuerte },
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
