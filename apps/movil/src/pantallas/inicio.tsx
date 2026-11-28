import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Perfil } from '@nexoai/contratos';
import { Boton } from '../componentes';
import type { Nivel } from './agenda';
import { AutorizacionesEquipo } from './autorizaciones-equipo';
import { LimpiarConversacion } from './limpiar-conversacion';
import { CambioContrasena } from './cambio-contrasena';
import { CapaCaptura } from './captura';
import { FranjaEnEspera } from './en-espera';
import { conSesion } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';
import { etiquetarZona } from '../zonas';

// T-028 · design/ARQUITECTURA-VISUAL-MOVIL.md §2. Tres secciones con pestañas abajo (R-32) y Ajustes en la
// cabecera, encima y con «Cerrar» (R-34, R-43). El asa abre la capa de captura sobre la sección (R-36, T-021).
// T-045 · REQ-CAP-25: encima de la agenda, la franja con lo que está en espera. Se vuelve a pedir al cerrar la
// capa, que es donde algo puede quedar en espera.
// Pulido · REQ-CAP-25, decisión 26 de 02-agenda: la franja va solo sobre el nivel Hoy, como en la web. La agenda
// avisa de su nivel con `alCambiarNivel`.
// Pulido · REQ-CUN01-14: `mostrar` desplaza la lista, sin animar, hasta dejar a la vista una parte que no se ve
// (la usa Semana para abrir con el día de hoy visible).

export type Seccion = 'agenda' | 'tareas' | 'actividad';

// Lo que Inicio ofrece a la sección que pinta
export type Lienzo = { alCambiarNivel: (nivel: Nivel) => void; mostrar: (vista: View) => void };

const SECCIONES: Record<Seccion, { nombre: string; pregunta: string }> = {
  agenda: { nombre: 'Agenda', pregunta: 'Lo que va a pasar' },
  tareas: { nombre: 'Tareas', pregunta: 'Lo que hay que hacer' },
  actividad: { nombre: 'Actividad', pregunta: 'Lo que pasó' },
};

const NOMBRE_PLAN = { gratuito: 'Gratuito', personal: 'Personal', empresarial: 'Empresarial' } as const;

// T-035: `version` sube cada vez que el asistente deja algo hecho, para que la sección vuelva a pedir sus datos
// T-135: `abrirCaptura` puede llevar un texto de ejemplo, que queda escrito en el campo sin enviarse
export function Inicio({
  alSalir,
  contenido,
}: {
  alSalir: () => void;
  contenido: (seccion: Seccion, abrirCaptura: (borrador?: string) => void, version: number, lienzo: Lienzo) => ReactNode;
}) {
  const [seccion, setSeccion] = useState<Seccion>('agenda');
  const [ajustes, setAjustes] = useState(false);
  const [captura, setCaptura] = useState(false);
  const [borrador, setBorrador] = useState<string | null>(null);
  // Un botón pasa su evento como primer argumento: solo un texto cuenta como borrador
  const abrirCaptura = useCallback((texto?: unknown) => {
    setBorrador(typeof texto === 'string' ? texto : null);
    setCaptura(true);
  }, []);
  const [version, setVersion] = useState(0);
  const [esperas, setEsperas] = useState(0);
  // H-CAP-04: hay una propuesta esperando decisión. Se sabe por la capa, sin otra llamada: hasta que la capa
  // se abre por primera vez, el asa no lo señala
  const [porDecidir, setPorDecidir] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nivel, setNivel] = useState<Nivel>('Hoy');
  const alCambiarNivel = useCallback((nuevo: Nivel) => setNivel(nuevo), []);

  // Qué parte de la lista se ve: desde dónde y cuánto alto
  const desplazable = useRef<ScrollView>(null);
  const contenidoDesplazable = useRef<View>(null);
  const desplazamiento = useRef(0);
  const altoVisible = useRef(0);
  // Si la vista no se ve entera, la lista se mueve hasta su borde de arriba, con un margen
  const mostrar = useCallback((vista: View) => {
    const contenedor = contenidoDesplazable.current;
    if (!contenedor) return;
    vista.measureLayout(contenedor, (_x, y, _ancho, alto) => {
      const arriba = desplazamiento.current;
      if (y >= arriba && y + alto <= arriba + altoVisible.current) return;
      desplazable.current?.scrollTo({ y: Math.max(0, y - espaciado[8]), animated: false });
    });
  }, []);

  useEffect(() => {
    if (!ajustes || perfil) return;
    void conSesion('/perfil').then((r) => {
      if (!r) return alSalir();
      const leido = Perfil.safeParse(r.cuerpo);
      if (r.estado === 200 && leido.success) setPerfil(leido.data);
    });
  }, [ajustes, perfil, alSalir]);

  const actual = SECCIONES[seccion];
  return (
    <View style={estilos.pantalla}>
      <View style={estilos.cabecera}>
        <View>
          <Text accessibilityRole="header" style={estilos.titulo}>
            {actual.nombre}
          </Text>
          <Text style={estilos.pregunta}>{actual.pregunta}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setAjustes(true)} style={estilos.textoBoton}>
          <Text style={estilos.textoBotonTexto}>Ajustes</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={desplazable}
        contentContainerStyle={estilos.desplazable}
        scrollEventThrottle={16}
        onScroll={(e) => (desplazamiento.current = e.nativeEvent.contentOffset.y)}
        onLayout={(e) => (altoVisible.current = e.nativeEvent.layout.height)}
      >
        <View ref={contenidoDesplazable} style={estilos.cuerpo}>
          {seccion === 'agenda' && nivel === 'Hoy' && <FranjaEnEspera version={version + esperas} alSalir={alSalir} />}
          {contenido(seccion, abrirCaptura, version, { alCambiarNivel, mostrar })}
        </View>
      </ScrollView>

      {/* El asa: abre la capa de captura sin salir de la sección (glosario, «Asa») */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={porDecidir ? 'Pedir algo al asistente, hay algo esperando tu decisión' : 'Pedir algo al asistente'}
        onPress={() => abrirCaptura()}
        style={estilos.asa}
      >
        <Text style={estilos.asaTexto}>Pedir algo</Text>
        {porDecidir && <View style={estilos.asaPunto} />}
      </Pressable>
      <CapaCaptura
        visible={captura}
        borradorInicial={borrador}
        alCerrar={() => {
          setCaptura(false);
          setBorrador(null);
          setEsperas((e) => e + 1);
        }}
        alCambiarAgenda={() => setVersion((v) => v + 1)}
        alCambiarPendiente={setPorDecidir}
        alSalir={alSalir}
      />

      <View accessibilityRole="tablist" style={estilos.pestanas}>
        {(Object.keys(SECCIONES) as Seccion[]).map((clave) => (
          <Pressable
            key={clave}
            accessibilityRole="tab"
            accessibilityState={{ selected: clave === seccion }}
            onPress={() => setSeccion(clave)}
            style={estilos.pestana}
          >
            <Text style={[estilos.pestanaTexto, clave === seccion && estilos.pestanaActiva]}>{SECCIONES[clave].nombre}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={ajustes} animationType="slide" transparent onRequestClose={() => setAjustes(false)}>
        <View style={estilos.velo}>
          <View accessibilityRole="none" aria-label="Ajustes" style={estilos.hoja}>
            <View style={estilos.cabecera}>
              <Text accessibilityRole="header" style={estilos.titulo}>
                Ajustes
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setAjustes(false)} style={estilos.textoBoton}>
                <Text style={estilos.textoBotonTexto}>Cerrar</Text>
              </Pressable>
            </View>
            {/* T-146: con el apartado de los equipos, la hoja puede pasar del alto de la pantalla */}
            <ScrollView contentContainerStyle={estilos.hojaContenido}>
              {perfil && (
                <View style={estilos.perfil}>
                  <Dato etiqueta="Correo" valor={perfil.correo} />
                  <Dato etiqueta="Organización" valor={perfil.organizacion.nombre} />
                  <Dato etiqueta="Plan" valor={NOMBRE_PLAN[perfil.plan]} />
                  <Dato etiqueta="Zona horaria" valor={perfil.zonaHoraria ? etiquetarZona(perfil.zonaHoraria) : '—'} />
                </View>
              )}
              {/* REQ-ACC-18 · T-121 */}
              <CambioContrasena />
              <Text style={estilos.pregunta}>Tu correo, tu plan y tu cuenta los gestiona tu organización.</Text>
              {/* T-146 · D-REU-36: la autorización para compartir la disponibilidad, con plan efectivo Empresarial y
                  algún equipo (REQ-CUN05-18) */}
              {perfil && perfil.planEfectivo === 'empresarial' && perfil.equipos > 0 && <AutorizacionesEquipo perfilId={perfil.perfilId} alSalir={alSalir} />}
              {/* T-160 · REQ-AGT-10 */}
              <LimpiarConversacion alSalir={alSalir} />
              <Boton texto="Cerrar sesión" alPulsar={alSalir} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.superficie.base },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: espaciado[16], paddingTop: espaciado[24], paddingBottom: espaciado[12] },
  titulo: { fontSize: tipografia.titulo, fontWeight: '700', color: color.texto.fuerte },
  pregunta: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  textoBoton: { minHeight: 44, minWidth: 44, paddingHorizontal: espaciado[8], alignItems: 'center', justifyContent: 'center' },
  textoBotonTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  desplazable: { flexGrow: 1 },
  cuerpo: { flexGrow: 1, paddingHorizontal: espaciado[16], paddingBottom: espaciado[24], gap: espaciado[16] },
  asa: { position: 'absolute', right: espaciado[16], bottom: 72, minHeight: 48, paddingHorizontal: espaciado[20], justifyContent: 'center', borderRadius: 24, backgroundColor: color.agente.base },
  asaTexto: { fontSize: tipografia.etiqueta, fontWeight: '700', color: color.texto.inverso },
  // Algo espera decisión: un punto en la esquina, con borde para que se separe del asa
  asaPunto: { position: 'absolute', top: 0, right: 0, width: espaciado[12], height: espaciado[12], borderRadius: espaciado[12] / 2, borderWidth: 2, borderColor: color.superficie.base, backgroundColor: color.estado.advertencia },
  pestanas: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.borde.base, backgroundColor: color.superficie.base },
  pestana: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  pestanaTexto: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  pestanaActiva: { color: color.marca.base, fontWeight: '700' },
  velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 33, 46, 0.4)' },
  hoja: { maxHeight: '92%', gap: espaciado[16], padding: espaciado[16], paddingBottom: espaciado[32], borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: color.superficie.base },
  hojaContenido: { gap: espaciado[16] },
  perfil: { gap: espaciado[12] },
  dato: { gap: 2 },
  datoEtiqueta: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  datoValor: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
});
