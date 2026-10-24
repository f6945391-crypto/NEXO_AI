import { useState } from 'react';
import { IngresoRespuesta, IngresoSolicitud } from '@nexoai/contratos';
import { Aviso, Boton, Campo, TarjetaAcceso } from '../componentes';
import { guardarSesion, llamar, mensajeDeError, SIN_CONEXION } from '../sesion';

// REQ-ACC-02, REQ-ACC-03 · T-028. Igual que la web: sin registro, y un solo mensaje que no revela si el
// correo existe.
export function Entrar({ alEntrar }: { alEntrar: (sesion: IngresoRespuesta) => void }) {
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
      {error && <Aviso texto={error} />}
      <Boton texto={enviando ? 'Entrando…' : 'Entrar'} alPulsar={entrar} deshabilitado={enviando} />
    </TarjetaAcceso>
  );
}
