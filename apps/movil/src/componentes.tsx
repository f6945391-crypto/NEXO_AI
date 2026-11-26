import type { ReactNode } from 'react';
import type { ResumenBitacora } from '@nexoai/contratos';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { color, espaciado, tipografia } from './tokens';

// Piezas comunes de las pantallas del móvil (T-028). Botones y campos con su etiqueta accesible, como en
// la web, y área táctil de al menos 44 px.

export function Boton({
  texto,
  alPulsar,
  deshabilitado,
  secundario,
  expandido,
}: {
  texto: string;
  alPulsar: () => void;
  deshabilitado?: boolean;
  secundario?: boolean;
  // Para los botones que pliegan y despliegan algo (H-CAP-01)
  expandido?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!deshabilitado, expanded: expandido }}
      disabled={deshabilitado}
      onPress={alPulsar}
      style={[estilos.boton, secundario && estilos.botonSecundario, deshabilitado && estilos.botonDeshabilitado]}
    >
      <Text style={[estilos.botonTexto, secundario && estilos.botonTextoSecundario]}>{texto}</Text>
    </Pressable>
  );
}

export function Campo({ etiqueta, ...props }: { etiqueta: string } & TextInputProps) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput accessibilityLabel={etiqueta} placeholderTextColor={color.texto.suave} style={estilos.entrada} {...props} />
    </View>
  );
}

export function Aviso({ texto }: { texto: string }) {
  return (
    <Text accessibilityRole="alert" style={estilos.error}>
      {texto}
    </Text>
  );
}

// La tarjeta centrada de Acceso, igual que en la web y más estrecha (spec de acceso §4)
export function TarjetaAcceso({ titulo, explicacion, children }: { titulo: string; explicacion: string; children: ReactNode }) {
  return (
    <View style={estilos.acceso}>
      <View style={estilos.tarjeta}>
        <Text accessibilityRole="header" style={estilos.titulo}>
          {titulo}
        </Text>
        <Text style={estilos.explicacion}>{explicacion}</Text>
        {children}
      </View>
    </View>
  );
}

// T-130 · REQ-CUN03-28 · H-TP-29, 35 · plan §13.8. El resumen breve de la bitácora, sobre los avances y nunca en
// su lugar, como en la web (R-41): con el tinte del asistente, una etiqueta que dice que lo escribió él y la fecha
// que arma la API («Resumen al miércoles 25 de noviembre»), para que no se lea como un avance. Lo usan la sección
// Tareas y el turno `bitacora` de la capa de captura. Sin resumen, no se muestra nada
export function ResumenDeBitacora({ tarea, resumen }: { tarea: string; resumen: ResumenBitacora | null }) {
  if (!resumen) return null;
  return (
    <View role="note" accessibilityLabel={`Resumen de ${tarea}`} style={estilos.resumen}>
      <Text style={estilos.resumenEtiqueta}>Escrito por el asistente</Text>
      <Text style={estilos.resumenTexto}>
        <Text style={estilos.resumenCuando}>{resumen.cuando}</Text> · {resumen.texto}
      </Text>
    </View>
  );
}

export const estilos = StyleSheet.create({
  resumen: { gap: 2, paddingVertical: espaciado[8], paddingHorizontal: espaciado[12], marginBottom: espaciado[4], borderRadius: 8, backgroundColor: color.agente.suave },
  resumenEtiqueta: { fontSize: tipografia.micro, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: color.agente.base },
  resumenTexto: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.fuerte },
  resumenCuando: { color: color.texto.suave },
  acceso: { flex: 1, justifyContent: 'center', padding: espaciado[16], backgroundColor: color.superficie.hundida },
  tarjeta: {
    gap: espaciado[16],
    padding: espaciado[24],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.borde.base,
    backgroundColor: color.superficie.base,
  },
  titulo: { fontSize: tipografia.subtitulo, fontWeight: '700', color: color.texto.fuerte },
  explicacion: { fontSize: tipografia.cuerpo, lineHeight: 24, color: color.texto.suave },
  campo: { gap: espaciado[8] },
  etiqueta: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.texto.fuerte },
  entrada: {
    minHeight: 44,
    paddingHorizontal: espaciado[12],
    borderWidth: 1,
    borderColor: color.borde.fuerte,
    borderRadius: 8,
    fontSize: tipografia.cuerpo,
    color: color.texto.fuerte,
    backgroundColor: color.superficie.base,
  },
  boton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: espaciado[16], borderRadius: 8, backgroundColor: color.marca.base },
  botonSecundario: { backgroundColor: color.superficie.base, borderWidth: 1, borderColor: color.borde.fuerte },
  botonDeshabilitado: { backgroundColor: color.borde.fuerte },
  botonTexto: { fontSize: tipografia.cuerpo, fontWeight: '600', color: color.texto.inverso },
  botonTextoSecundario: { color: color.texto.fuerte },
  error: { fontSize: tipografia.etiqueta, color: color.estado.error },
});
