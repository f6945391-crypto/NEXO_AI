import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { IngresoRespuesta, IngresoSolicitud } from '@nexoai/contratos';
import { Aviso, Boton, Campo, TarjetaAcceso } from '../componentes';
import { guardarSesion, llamar, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, tipografia } from '../tokens';

// REQ-ACC-02, REQ-ACC-03 · T-028. Igual que la web: sin registro, y un solo mensaje que no revela si el
// correo existe. REQ-ACC-19 · T-123: «¿Olvidaste tu contraseña?» abre Restablecer con el correo ya escrito.
export function Entrar({ alEntrar, alOlvidar }: { alEntrar: (sesion: IngresoRespuesta) => void; alOlvidar: (correo: string) => void }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    const solicitud = IngresoSolicitud.safeParse({ correo, contrasena });
    if (!solicitud.success) return setError('Escribe tu correo y tu contraseña.');
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await llamar('/auth/ingreso', { metodo: 'POST', cuerpo: solicitud.data });
      const sesion = IngresoRespuesta.safeParse(respuesta.cuerpo);
      if (respuesta.estado !== 200 || !sesion.success) return setError(mensajeDeError(respuesta.cuerpo));
      await guardarSesion(sesion.data);
      alEntrar(sesion.data);
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TarjetaAcceso titulo="Entra en NexoAI" explicacion="Con la cuenta que te dio tu organización.">
      <Campo etiqueta="Correo" value={correo} onChangeText={setCorreo} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" />
      <Campo etiqueta="Contraseña" value={contrasena} onChangeText={setContrasena} secureTextEntry autoComplete="current-password" onSubmitEditing={entrar} />
      <Pressable accessibilityRole="link" onPress={() => alOlvidar(correo.trim())} style={estilos.enlace}>
        <Text style={estilos.enlaceTexto}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
      {error && <Aviso texto={error} />}
      <Boton texto={enviando ? 'Entrando…' : 'Entrar'} alPulsar={entrar} deshabilitado={enviando} />
    </TarjetaAcceso>
  );
}

const estilos = StyleSheet.create({
  // Área táctil de 44 px (RT-20); se acerca al campo de contraseña, del que depende
  enlace: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: -8 },
  enlaceTexto: { fontSize: tipografia.etiqueta, color: color.marca.base, textDecorationLine: 'underline' },
});
