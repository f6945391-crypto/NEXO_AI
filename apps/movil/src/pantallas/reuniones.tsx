import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DetalleReunion, ListaReuniones, OperacionRespuesta, type DecisionAsistente, type InvitadoReunion, type ReunionResumen } from '@nexoai/contratos';
import { nombreDeZona } from '../agenda/dia';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';
import { diaYHora, libres, Tarjeta } from './captura';

// T-135 · 10-reuniones plan §10 · REQ-CUN06-07, 10, 15, 19 · D-REU-07, 19. El corte «Reuniones» de Agenda en el
// móvil: la lista con el estado por color (boceto 01 de Franco) y, al tocar una, su detalle con los invitados en
// una línea que se despliega, las propuestas con «Elegir» y la tarjeta de confirmación en el mismo lugar. Sin mapa
// de calor (REQ-CUN06-19): en 390 px se elige entre las propuestas que arma el código. Crear una reunión lo hace el
// asistente (R-42); convocar y cancelar van por Operaciones como control directo (DP-01, P-REU-03).

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const formato = (zona: string, opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es', { timeZone: zona, ...opciones });
const hora = (iso: string, zona: string) => formato(zona, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
// «Jueves 26 de noviembre», sin la coma que pone Intl tras el día de la semana
const diaLargo = (iso: string, zona: string) => mayuscula(formato(zona, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso)).replace(',', ''));
// Los días del rango son fechas sin hora: se leen a mediodía UTC para que no cambien de día
const fecha = (dia: string) => diaLargo(`${dia}T12:00:00Z`, 'UTC');

function duracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} minutos`;
  const horas = h === 1 ? '1 hora' : `${h} horas`;
  return m === 0 ? horas : `${horas} y ${m} minutos`;
}

// T-145 · REQ-CUN06-07 v2, D-REU-35: la petición que «Crear reunión» escribe en la capa, sin enviarla. La misma
// que en la web
const PEDIR_REUNION = 'Busca un horario para reunirme con mi equipo';

type Estado = { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'lista'; reuniones: ReunionResumen[] };

export function Reuniones({
  alSalir,
  alAbrirCaptura,
  mostrar,
  version,
}: {
  alSalir: () => void;
  alAbrirCaptura: (borrador?: string) => void;
  // Desplaza la sección hasta dejar a la vista una parte que no se ve (la tarjeta, al aparecer)
  mostrar?: (vista: View) => void;
  version: number;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const ultima = useRef(0);

  const cargar = useCallback(async () => {
    const esta = ++ultima.current;
    try {
      const r = await conSesion('/reuniones');
      if (esta !== ultima.current) return;
      if (!r) return alSalir();
      const lista = ListaReuniones.safeParse(r.cuerpo);
      if (r.estado !== 200 || !lista.success) return setEstado({ tipo: 'error', mensaje: mensajeDeError(r.cuerpo, 'No pudimos leer tus reuniones. Inténtalo de nuevo en un momento.') });
      const reuniones = lista.data.filter((x) => x.estado !== 'cancelada');
      setEstado({ tipo: 'lista', reuniones });
    } catch {
      if (esta === ultima.current) setEstado({ tipo: 'error', mensaje: SIN_CONEXION });
    }
  }, [alSalir]);

  // T-035: también cuando el asistente deja algo hecho, por ejemplo una reunión convocada en la conversación
  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  if (abierta) {
    return (
      <Detalle
        id={abierta}
        version={version}
        mostrar={mostrar}
        alSalir={alSalir}
        alVolver={(texto) => {
          setAbierta(null);
          setAviso(texto ?? null);
          void cargar();
        }}
      />
    );
  }

  return (
    <View style={estilos.contenedor}>
      {aviso && (
        <Text accessibilityRole="alert" style={estilos.hecho}>
          {aviso}
        </Text>
      )}
      {estado.tipo === 'cargando' && <Text style={estilos.suave}>Leyendo tus reuniones…</Text>}
      {estado.tipo === 'error' && <Aviso texto={estado.mensaje} />}
      {estado.tipo === 'lista' && estado.reuniones.length === 0 && (
        // T-145 · REQ-CUN06-07 v2: el estado vacío del boceto. «Crear reunión» no abre un formulario ni crea nada:
        // abre la capa con la petición escrita, sin enviarla (D-REU-35, R-42)
        <View style={estilos.vacio}>
          <DibujoReuniones />
          <Text accessibilityRole="header" style={estilos.vacioTitulo}>
            Aún no hay reuniones de equipo
          </Text>
          <Text style={estilos.vacioTexto}>Crea una reunión para comparar la disponibilidad de tu equipo y elegir un horario.</Text>
          <View style={estilos.vacioBoton}>
            <Boton texto="Crear reunión" alPulsar={() => alAbrirCaptura(PEDIR_REUNION)} />
          </View>
        </View>
      )}
      {estado.tipo === 'lista' && estado.reuniones.length > 0 && (
        <View accessibilityRole="list" accessibilityLabel="Reuniones" style={estilos.lista}>
          {estado.reuniones.map((reunion) => (
            <View key={reunion.id} role="listitem">
              <TarjetaReunion
                reunion={reunion}
                alAbrir={() => {
                  setAviso(null);
                  setAbierta(reunion.id);
                }}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// El dibujo del estado vacío: un calendario con sus anillas y casillas, hecho con vistas, sin otra dependencia
function DibujoReuniones() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={estilos.dibujo}>
      <View style={[estilos.anilla, { left: 14 }]} />
      <View style={[estilos.anilla, { right: 14 }]} />
      <View style={estilos.calendario}>
        <View style={estilos.calendarioCabecera} />
        <View style={estilos.casillas}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={[estilos.casilla, n === 4 && estilos.casillaMarcada]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// El estado con su color (REQ-CUN06-07): ámbar si falta elegir, verde con el día y la hora, gris si venció
function textoDelEstado(reunion: ReunionResumen): string {
  if (reunion.estado === 'agendada' && reunion.inicio) return `✓ ${diaYHora(reunion.inicio, reunion.zonaHoraria)}`;
  if (reunion.estado === 'pendiente') return 'Elegir horario';
  if (reunion.estado === 'vencida') return 'Venció sin horario';
  return 'Cancelada';
}

function Pildora({ reunion }: { reunion: ReunionResumen }) {
  const tono = reunion.estado === 'pendiente' ? estilos.pendiente : reunion.estado === 'agendada' ? estilos.agendada : estilos.apagada;
  const texto = reunion.estado === 'pendiente' ? estilos.pendienteTexto : reunion.estado === 'agendada' ? estilos.agendadaTexto : estilos.apagadaTexto;
  return (
    <View style={[estilos.pildora, tono]}>
      <Text style={[estilos.pildoraTexto, texto]}>{textoDelEstado(reunion)}</Text>
    </View>
  );
}

function TarjetaReunion({ reunion, alAbrir }: { reunion: ReunionResumen; alAbrir: () => void }) {
  const convocada = reunion.soyConvocante ? null : `Convocada por ${reunion.convocante.nombre}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[reunion.titulo, reunion.equipo.nombre, textoDelEstado(reunion).replace('✓ ', ''), convocada].filter(Boolean).join(', ')}
      onPress={alAbrir}
      style={[estilos.tarjeta, reunion.estado === 'pendiente' && estilos.tarjetaPendiente]}
    >
      <View style={estilos.tarjetaCuerpo}>
        <Text style={estilos.titulo}>{reunion.titulo}</Text>
        <Text style={estilos.suave}>{reunion.equipo.nombre}</Text>
        <Pildora reunion={reunion} />
        {convocada && <Text style={estilos.suave}>{convocada}</Text>}
      </View>
      {/* El chevron dice que se abre; solo la pendiente pide acción (boceto 01) */}
      <Text style={[estilos.chevron, reunion.estado !== 'pendiente' && estilos.chevronApagado]}>›</Text>
    </Pressable>
  );
}

// REQ-CUN06-09 · D-REU-20: una línea de resumen en lugar de una ficha por persona
function resumenInvitados(invitados: InvitadoReunion[]): string {
  const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  const conDatos = invitados.filter((i) => i.datos === 'con_datos');
  const partes = [cuenta(conDatos.filter((i) => !i.opcional).length, 'obligatorio', 'obligatorios'), cuenta(conDatos.filter((i) => i.opcional).length, 'opcional', 'opcionales')];
  const sinAutorizar = invitados.filter((i) => i.datos === 'sin_consentimiento').length;
  const sinCalendario = invitados.filter((i) => i.datos === 'sin_calendario').length;
  if (sinAutorizar > 0) partes.push(`${sinAutorizar} sin autorizar`);
  if (sinCalendario > 0) partes.push(`${sinCalendario} sin calendario`);
  return partes.join(' · ');
}

const DATOS: Record<InvitadoReunion['datos'], string | null> = {
  con_datos: null,
  sin_consentimiento: 'No autorizó compartir su disponibilidad',
  sin_calendario: 'No tiene calendario conectado',
};

type Confirmacion = { tipo: 'ninguna' } | { tipo: 'preparando'; inicio: string | null } | { tipo: 'tarjeta'; operacion: OperacionRespuesta; convocar: boolean };

function Detalle({ id, version, mostrar, alSalir, alVolver }: { id: string; version: number; mostrar?: (vista: View) => void; alSalir: () => void; alVolver: (aviso?: string) => void }) {
  const lugarTarjeta = useRef<View>(null);
  const [detalle, setDetalle] = useState<DetalleReunion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitadosAbiertos, setInvitadosAbiertos] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>({ tipo: 'ninguna' });
  const [ocupado, setOcupado] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await conSesion(`/reuniones/${id}`);
      if (!r) return alSalir();
      const leido = DetalleReunion.safeParse(r.cuerpo);
      if (r.estado !== 200 || !leido.success) return setError(mensajeDeError(r.cuerpo, 'No pudimos leer esta reunión. Inténtalo de nuevo en un momento.'));
      setDetalle(leido.data);
    } catch {
      setError(SIN_CONEXION);
    }
  }, [id, alSalir]);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  // Como en la capa (H-CAP-01): al aparecer una tarjeta, queda entera a la vista, botones incluidos. Tras el
  // siguiente cuadro, cuando la lista ya tiene su alto nuevo
  const operacionVista = confirmacion.tipo === 'tarjeta' ? confirmacion.operacion.id : null;
  useEffect(() => {
    if (!operacionVista) return;
    const cuadro = requestAnimationFrame(() => lugarTarjeta.current && mostrar?.(lugarTarjeta.current));
    return () => cancelAnimationFrame(cuadro);
  }, [operacionVista, mostrar]);

  // Elegir un horario o pedir cancelar: la API arma la tarjeta (P-03) y nada se hace hasta confirmar
  async function proponer(tipo: 'reunion.convocar' | 'reunion.cancelar', inicio: string | null) {
    setError(null);
    setHecho(null);
    setConfirmacion({ tipo: 'preparando', inicio });
    try {
      const carga = tipo === 'reunion.convocar' ? { reunionId: id, inicio } : { reunionId: id };
      const r = await conSesion('/operaciones', { metodo: 'POST', cuerpo: { tipo, carga, origen: 'control_directo' } });
      if (!r) return alSalir();
      const propuesta = OperacionRespuesta.safeParse(r.cuerpo);
      if (r.estado !== 201 || !propuesta.success) {
        setConfirmacion({ tipo: 'ninguna' });
        return setError(mensajeDeError(r.cuerpo));
      }
      setConfirmacion({ tipo: 'tarjeta', operacion: propuesta.data, convocar: tipo === 'reunion.convocar' });
    } catch {
      setConfirmacion({ tipo: 'ninguna' });
      setError(SIN_CONEXION);
    }
  }

  async function decidir(d: DecisionAsistente) {
    if (confirmacion.tipo !== 'tarjeta' || !('operacionId' in d)) return;
    const { operacion, convocar } = confirmacion;
    setOcupado(true);
    setError(null);
    try {
      if (d.decision === 'descartar') {
        setConfirmacion({ tipo: 'ninguna' });
        await conSesion(`/operaciones/${operacion.id}/descartar`, { metodo: 'POST' });
        return;
      }
      if (d.decision !== 'confirmar') return;
      const r = await conSesion(`/operaciones/${operacion.id}/confirmar`, { metodo: 'POST' });
      if (!r) return alSalir();
      const resultado = OperacionRespuesta.safeParse(r.cuerpo);
      if (r.estado === 200 && resultado.success && resultado.data.estado === 'ejecutada') {
        setConfirmacion({ tipo: 'ninguna' });
        if (!convocar) return alVolver('Reunión cancelada. Google avisó a los invitados.');
        setHecho('Listo: la reunión quedó agendada y Google envió las invitaciones.');
        return void cargar();
      }
      // H-AG-07: si algo cambió al confirmar, vuelve otra tarjeta y se decide de nuevo
      if (resultado.success && resultado.data.estado === 'propuesta') setConfirmacion({ tipo: 'tarjeta', operacion: resultado.data, convocar });
      setError(mensajeDeError(r.cuerpo, resultado.success && resultado.data.vistaConfirmacion.motivoNoConfirmable ? resultado.data.vistaConfirmacion.motivoNoConfirmable : 'No se pudo hacer. Inténtalo de nuevo.'));
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setOcupado(false);
    }
  }

  const tarjeta =
    confirmacion.tipo === 'tarjeta' ? (
      <View ref={lugarTarjeta}>
        <Tarjeta operacion={confirmacion.operacion} activa decidido={null} ocupado={ocupado} alDecidir={(d) => void decidir(d)} />
      </View>
    ) : null;

  return (
    <View style={estilos.contenedor}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a las reuniones" onPress={() => alVolver()} style={estilos.volver}>
        <Text style={estilos.enlaceTexto}>‹ Volver</Text>
      </Pressable>
      {!detalle && !error && <Text style={estilos.suave}>Leyendo la reunión…</Text>}
      {detalle && <Cuerpo detalle={detalle} invitadosAbiertos={invitadosAbiertos} alPlegarInvitados={() => setInvitadosAbiertos((a) => !a)} />}
      {hecho && (
        <Text accessibilityRole="alert" style={estilos.hecho}>
          {hecho}
        </Text>
      )}

      {detalle?.reunion.estado === 'pendiente' && detalle.reunion.soyConvocante && (
        <View style={estilos.seccion}>
          <Text accessibilityRole="header" style={estilos.subtitulo}>
            Horarios propuestos
          </Text>
          <Text style={estilos.suave}>{nombreDeZona(detalle.reunion.zonaHoraria)}</Text>
          {confirmacion.tipo === 'tarjeta' && confirmacion.convocar ? (
            tarjeta
          ) : detalle.propuestas.length === 0 ? (
            <Text style={estilos.cuerpo}>No encontré un horario en que estén libres todos los obligatorios. Pídele al asistente que busque en otros días.</Text>
          ) : (
            <View accessibilityRole="list" accessibilityLabel="Horarios propuestos" style={estilos.propuestas}>
              {detalle.propuestas.map((p) => {
                const texto = `${diaYHora(p.inicio, detalle.reunion.zonaHoraria)} – ${hora(p.fin, detalle.reunion.zonaHoraria)}`;
                const preparando = confirmacion.tipo === 'preparando' && confirmacion.inicio === p.inicio;
                return (
                  <View key={p.inicio} role="listitem" accessibilityLabel={texto} style={estilos.propuesta}>
                    <View style={estilos.propuestaTextos}>
                      <Text style={estilos.titulo}>{texto}</Text>
                      <Text style={estilos.suave}>{libres(p)}</Text>
                    </View>
                    <View style={estilos.elegir}>
                      <Boton texto={preparando ? 'Preparando…' : 'Elegir'} deshabilitado={confirmacion.tipo === 'preparando'} alPulsar={() => void proponer('reunion.convocar', p.inicio)} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          {/* El aviso de privacidad del boceto 02 (P-10): lo que se usó para calcular, nunca los títulos */}
          <Text style={estilos.suave}>Solo se usan horas libres u ocupadas, sin títulos ni detalles.</Text>
        </View>
      )}

      {/* Mientras se decide un horario, cancelar no se ofrece: una decisión a la vez */}
      {detalle && detalle.reunion.soyConvocante && detalle.reunion.estado !== 'cancelada' && !(confirmacion.tipo === 'tarjeta' && confirmacion.convocar) && (
        <View style={estilos.seccion}>
          {confirmacion.tipo === 'tarjeta' && !confirmacion.convocar ? (
            tarjeta
          ) : (
            <Boton
              texto={confirmacion.tipo === 'preparando' && confirmacion.inicio === null ? 'Preparando…' : 'Cancelar reunión'}
              secundario
              deshabilitado={confirmacion.tipo !== 'ninguna'}
              alPulsar={() => void proponer('reunion.cancelar', null)}
            />
          )}
        </View>
      )}
      {error && <Aviso texto={error} />}
    </View>
  );
}

function Cuerpo({ detalle, invitadosAbiertos, alPlegarInvitados }: { detalle: DetalleReunion; invitadosAbiertos: boolean; alPlegarInvitados: () => void }) {
  const { reunion, invitados } = detalle;
  const zona = reunion.zonaHoraria;
  return (
    <View style={estilos.seccion}>
      <Text accessibilityRole="header" style={estilos.cabecera}>
        {reunion.titulo}
      </Text>
      <Text style={estilos.suave}>{reunion.equipo.nombre}</Text>
      <Pildora reunion={reunion} />
      {reunion.estado === 'agendada' && reunion.inicio && reunion.fin ? (
        <View>
          <Text style={estilos.cuerpo}>
            {diaLargo(reunion.inicio, zona)}, {hora(reunion.inicio, zona)} a {hora(reunion.fin, zona)}
          </Text>
          <Text style={estilos.suave}>
            {nombreDeZona(zona)} · {duracion(reunion.duracionMinutos)}
          </Text>
        </View>
      ) : (
        <Text style={estilos.suave}>
          {reunion.rangoDesde === reunion.rangoHasta ? `El ${fecha(reunion.rangoDesde).toLowerCase()}` : `Del ${fecha(reunion.rangoDesde).toLowerCase()} al ${fecha(reunion.rangoHasta).toLowerCase()}`}
          {reunion.franja ? (reunion.franja === 'manana' ? ', por la mañana' : ', por la tarde') : ''} · {duracion(reunion.duracionMinutos)}
        </Text>
      )}
      {!reunion.soyConvocante && <Text style={estilos.suave}>Convocada por {reunion.convocante.nombre}</Text>}

      {/* REQ-CUN06-09 · D-REU-20: una línea con el resumen, que se despliega en la lista de invitados */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Invitados: ${resumenInvitados(invitados)}`}
        accessibilityState={{ expanded: invitadosAbiertos }}
        onPress={alPlegarInvitados}
        style={estilos.resumenInvitados}
      >
        <View style={estilos.propuestaTextos}>
          <Text style={estilos.suave}>Invitados</Text>
          <Text style={estilos.cuerpo}>{resumenInvitados(invitados)}</Text>
        </View>
        <Text style={estilos.enlaceTexto}>{invitadosAbiertos ? 'Ocultar' : 'Ver'}</Text>
      </Pressable>
      {invitadosAbiertos && (
        <View accessibilityRole="list" accessibilityLabel="Invitados" style={estilos.invitados}>
          {invitados.map((i) => (
            <View key={i.perfilId} role="listitem" style={estilos.invitado}>
              <View style={estilos.propuestaTextos}>
                <Text style={estilos.titulo}>{i.nombre}</Text>
                {/* D-REU-11: la dirección a la que llega la invitación */}
                <Text style={estilos.suave}>
                  {i.direccion}
                  {i.conGoogle ? '' : ' · sin Google conectado'}
                </Text>
                {DATOS[i.datos] && <Text style={estilos.advertencia}>{DATOS[i.datos]}</Text>}
              </View>
              <Text style={estilos.marca}>{i.opcional ? 'Opcional' : 'Obligatorio'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Abajo, el alto del asa: lo último de la lista no queda debajo de «Pedir algo»
  contenedor: { gap: espaciado[16], paddingBottom: 72 },
  lista: { gap: espaciado[12] },
  seccion: { gap: espaciado[8] },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: espaciado[12], minHeight: 56, padding: espaciado[16], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base, backgroundColor: color.superficie.base },
  // La que pide acción, con el borde fuerte (ARQUITECTURA-VISUAL-MOVIL §3, el borde graduado)
  tarjetaPendiente: { borderColor: color.borde.fuerte },
  tarjetaCuerpo: { flex: 1, gap: espaciado[4] },
  titulo: { fontSize: tipografia.cuerpo, fontWeight: '600', color: color.texto.fuerte },
  cabecera: { fontSize: tipografia.subtitulo, fontWeight: '700', color: color.texto.fuerte },
  subtitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte },
  cuerpo: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  suave: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave },
  advertencia: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.estado.advertencia },
  hecho: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.estado.exito },
  chevron: { fontSize: 28, lineHeight: 28, color: color.marca.base },
  chevronApagado: { color: color.borde.fuerte },
  pildora: { alignSelf: 'flex-start', paddingHorizontal: espaciado[8], paddingVertical: 2, borderRadius: 999 },
  pildoraTexto: { fontSize: tipografia.etiqueta, fontWeight: '600' },
  pendiente: { backgroundColor: color.tinte.espera },
  pendienteTexto: { color: color.tinte.esperaTexto },
  agendada: { backgroundColor: color.tinte.exito },
  agendadaTexto: { color: color.estado.exito },
  apagada: { backgroundColor: color.superficie.hundida },
  apagadaTexto: { color: color.texto.suave },
  volver: { alignSelf: 'flex-start', minHeight: 44, minWidth: 44, justifyContent: 'center' },
  enlaceTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  resumenInvitados: { flexDirection: 'row', alignItems: 'center', gap: espaciado[12], minHeight: 56, paddingVertical: espaciado[8], paddingHorizontal: espaciado[12], marginTop: espaciado[8], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base },
  invitados: { gap: espaciado[4] },
  invitado: { flexDirection: 'row', alignItems: 'center', gap: espaciado[12], paddingVertical: espaciado[8], borderTopWidth: 1, borderTopColor: color.borde.base },
  marca: { fontSize: tipografia.micro, fontWeight: '600', color: color.texto.suave },
  propuestas: { gap: espaciado[8] },
  propuesta: { flexDirection: 'row', alignItems: 'center', gap: espaciado[12], padding: espaciado[12], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base, backgroundColor: color.superficie.elevada },
  propuestaTextos: { flex: 1, gap: 2 },
  elegir: { minWidth: 96 },
  vacio: { minHeight: 240, justifyContent: 'center', alignItems: 'center', gap: espaciado[12], padding: espaciado[24], borderRadius: 16, backgroundColor: color.superficie.elevada },
  vacioTitulo: { fontSize: tipografia.subtitulo, fontWeight: '700', color: color.texto.fuerte, textAlign: 'center' },
  vacioTexto: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave, textAlign: 'center' },
  vacioBoton: { alignSelf: 'stretch', marginTop: espaciado[8] },
  // El dibujo, en el azul de la marca aclarado, como en el boceto
  dibujo: { width: 72, height: 72, marginBottom: espaciado[8], opacity: 0.55 },
  anilla: { position: 'absolute', top: 0, zIndex: 1, width: 4, height: 14, borderRadius: 2, backgroundColor: color.marca.base },
  calendario: { position: 'absolute', top: 6, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: color.marca.base, borderRadius: 8, overflow: 'hidden' },
  calendarioCabecera: { height: 14, borderBottomWidth: 3, borderBottomColor: color.marca.base },
  casillas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 7 },
  casilla: { width: 12, height: 12, borderRadius: 3, borderWidth: 2, borderColor: color.marca.base },
  casillaMarcada: { backgroundColor: color.marca.base },
});
