import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { RestablecerSolicitud } from '@nexoai/contratos';
import { Aviso, Boton, Campo, TarjetaAcceso } from '../componentes';
import { llamar, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, tipografia } from '../tokens';

// REQ-ACC-19 · T-123 · specs/06-acceso/plan.md §5.8. Sin sesión. El móvil solo pide el enlace: el correo lo
// abre en la web, también en el navegador del teléfono, porque no hay enlace profundo a la app (H-ACC-10).
// La respuesta es la misma exista o no la cuenta (REQ-ACC-03): la API devuelve siempre 204.

export const ENLACE_ENVIADO =
  'Si ese correo tiene una cuenta en NexoAI, te enviamos un enlace. Revisa tu bandeja de entrada y el correo no deseado. El enlace vence en 30 minutos y se abre en el navegador.';

export function Restablecer({ correoInicial = '', alVolver }: { correoInicial?: string; alVolver: () => void }) {
  const [correo, setCorreo] = useState(correoInicial);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function pedir() {
    const solicitud = RestablecerSolicitud.safeParse({ correo });
    if (!solicitud.success) return setError('Escribe tu correo.');
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await llamar('/auth/restablecer', { metodo: 'POST', cuerpo: solicitud.data });
      if (respuesta.estado === 204) setEnviado(true);
      else setError(mensajeDeError(respuesta.cuerpo));
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TarjetaAcceso
      titulo="Restablecer tu contraseña"
      explicacion="Escribe el correo con el que entras a NexoAI. Si tiene una cuenta, te enviaremos un enlace para elegir una contraseña nueva."
    >
      {enviado ? (
        <Text role="status" style={estilos.enviado}>
          {ENLACE_ENVIADO}
        </Text>
      ) : (
        <>
          <Campo
            etiqueta="Correo"
            value={correo}
            onChangeText={setCorreo}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            onSubmitEditing={pedir}
          />
          {error && <Aviso texto={error} />}
          <Boton texto={enviando ? 'Enviando…' : 'Enviar enlace'} alPulsar={pedir} deshabilitado={enviando} />
        </>
      )}
      <Boton texto="Volver a Entrar" secundario alPulsar={alVolver} deshabilitado={enviando} />
    </TarjetaAcceso>
  );
}

const estilos = StyleSheet.create({
  enviado: { fontSize: tipografia.cuerpo, lineHeight: 24, color: color.texto.fuerte },
});
