import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { color, espaciado, tipografia } from './tokens';

// Piezas comunes de las pantallas del móvil (T-028). Botones y campos con su etiqueta accesible, como en
// la web, y área táctil de al menos 44 px.

export function Boton({
  texto,
  alPulsar,
  deshabilitado,
  secundario,
}: {
  texto: string;
  alPulsar: () => void;
  deshabilitado?: boolean;
  secundario?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!deshabilitado }}
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

export const estilos = StyleSheet.create({
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
