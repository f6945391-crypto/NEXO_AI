import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SaludRespuesta } from '@nexoai/contratos';
import { color, espaciado, tipografia } from './tokens';

// T-020: la app arranca y consume packages/contratos (AD-08). Las pantallas llegan en T-021 y siguientes.
// En un teléfono, «localhost» es el propio teléfono: EXPO_PUBLIC_API_URL apunta a la API en tu red.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type EstadoApi = 'consultando' | 'disponible' | 'no disponible';

export function Aplicacion() {
  const [api, setApi] = useState<EstadoApi>('consultando');

  useEffect(() => {
    const controlador = new AbortController();
    const espera = setTimeout(() => controlador.abort(), 3000);
    fetch(`${API_URL}/salud`, { signal: controlador.signal })
      .then((respuesta) => respuesta.json())
      .then((cuerpo: unknown) => setApi(SaludRespuesta.safeParse(cuerpo).success ? 'disponible' : 'no disponible'))
      .catch(() => setApi('no disponible'))
      .finally(() => clearTimeout(espera));
    return () => controlador.abort();
  }, []);

  return (
    <View style={estilos.pantalla}>
      <Text style={estilos.marca} accessibilityRole="header">
        NexoAI
      </Text>
      <Text style={estilos.estado} testID="estado-api">
        API: {api}
      </Text>
      <StatusBar style="dark" />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado[12],
    backgroundColor: color.superficie.base,
  },
  marca: { fontSize: tipografia.titulo, fontWeight: '700', color: color.texto.fuerte },
  estado: { fontSize: tipografia.cuerpo, color: color.texto.suave },
});
