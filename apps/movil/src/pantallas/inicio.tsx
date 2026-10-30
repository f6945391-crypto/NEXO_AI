import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Perfil } from '@nexoai/contratos';
import { Boton } from '../componentes';
import { CapaCaptura } from './captura';
import { conSesion } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';
import { etiquetarZona } from '../zonas';

// T-028 · design/ARQUITECTURA-VISUAL-MOVIL.md §2. Tres secciones con pestañas abajo (R-32) y Ajustes en la
// cabecera, encima y con «Cerrar» (R-34, R-43). El asa abre la capa de captura sobre la sección (R-36, T-021).

export type Seccion = 'agenda' | 'tareas' | 'actividad';

const SECCIONES: Record<Seccion, { nombre: string; pregunta: string }> = {
  agenda: { nombre: 'Agenda', pregunta: 'Lo que va a pasar' },
  tareas: { nombre: 'Tareas', pregunta: 'Lo que hay que hacer' },
  actividad: { nombre: 'Actividad', pregunta: 'Lo que pasó' },
};

const NOMBRE_PLAN = { gratuito: 'Gratuito', personal: 'Personal', empresarial: 'Empresarial' } as const;

// T-035: `version` sube cada vez que el asistente deja algo hecho, para que la sección vuelva a pedir sus datos
export function Inicio({ alSalir, contenido }: { alSalir: () => void; contenido: (seccion: Seccion, abrirCaptura: () => void, version: number) => ReactNode }) {
  const [seccion, setSeccion] = useState<Seccion>('agenda');
  const [ajustes, setAjustes] = useState(false);
  const [captura, setCaptura] = useState(false);
  const [version, setVersion] = useState(0);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

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

      <ScrollView contentContainerStyle={estilos.cuerpo}>{contenido(seccion, () => setCaptura(true), version)}</ScrollView>

      {/* El asa: abre la capa de captura sin salir de la sección (glosario, «Asa») */}
      <Pressable accessibilityRole="button" accessibilityLabel="Pedir algo al asistente" onPress={() => setCaptura(true)} style={estilos.asa}>
        <Text style={estilos.asaTexto}>Pedir algo</Text>
      </Pressable>
      <CapaCaptura visible={captura} alCerrar={() => setCaptura(false)} alCambiarAgenda={() => setVersion((v) => v + 1)} alSalir={alSalir} />

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
            {perfil && (
              <View style={estilos.perfil}>
                <Dato etiqueta="Correo" valor={perfil.correo} />
                <Dato etiqueta="Organización" valor={perfil.organizacion.nombre} />
                <Dato etiqueta="Plan" valor={NOMBRE_PLAN[perfil.plan]} />
                <Dato etiqueta="Zona horaria" valor={perfil.zonaHoraria ? etiquetarZona(perfil.zonaHoraria) : '—'} />
              </View>
            )}
            <Text style={estilos.pregunta}>Tu correo, tu plan y tu cuenta los gestiona tu organización.</Text>
            <Boton texto="Cerrar sesión" alPulsar={alSalir} />
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
  cuerpo: { flexGrow: 1, paddingHorizontal: espaciado[16], paddingBottom: espaciado[24], gap: espaciado[16] },
  asa: { position: 'absolute', right: espaciado[16], bottom: 72, minHeight: 48, paddingHorizontal: espaciado[20], justifyContent: 'center', borderRadius: 24, backgroundColor: color.agente.base },
  asaTexto: { fontSize: tipografia.etiqueta, fontWeight: '700', color: color.texto.inverso },
  pestanas: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.borde.base, backgroundColor: color.superficie.base },
  pestana: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  pestanaTexto: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  pestanaActiva: { color: color.marca.base, fontWeight: '700' },
  velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 33, 46, 0.4)' },
  hoja: { gap: espaciado[16], padding: espaciado[16], paddingBottom: espaciado[32], borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: color.superficie.base },
  perfil: { gap: espaciado[12] },
  dato: { gap: 2 },
  datoEtiqueta: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  datoValor: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
});
