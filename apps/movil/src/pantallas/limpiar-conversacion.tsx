import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';

// T-160 · REQ-AGT-10 · decisión 41 de 07-agente. Lo mismo que en la web: limpia lo que se ve de la conversación,
// sin borrar nada ni quitarle al asistente lo que recuerda. La capa vuelve a leer la conversación al abrirse.

const AVISO_LIMPIAR = 'Se limpia lo que ves. El asistente sigue recordando lo que hicieron, y lo que esté sin decidir se queda.';

export function LimpiarConversacion({ alSalir }: { alSalir: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function limpiar() {
    setEnviando(true);
    setError(null);
    try {
      const r = await conSesion('/asistente/conversacion/limpiar', { metodo: 'POST' });
      if (!r) return alSalir();
      if (r.estado !== 204) setError(mensajeDeError(r.cuerpo, 'No se pudo limpiar la conversación.'));
      else {
        setConfirmando(false);
        setAviso('Listo: la conversación quedó limpia.');
      }
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={estilos.bloque} accessibilityLabel="Conversación">
      <Text accessibilityRole="header" style={estilos.titulo}>
        Conversación
      </Text>
      <Text style={estilos.ayuda}>Deja en blanco la conversación con el asistente, en el móvil y en la web. No borra nada de tu agenda ni de tus tareas.</Text>
      {aviso && !confirmando && (
        <Text role="status" style={estilos.aviso}>
          {aviso}
        </Text>
      )}
      {!confirmando ? (
        <Boton
          texto="Limpiar conversación"
          secundario
          alPulsar={() => {
            setAviso(null);
            setConfirmando(true);
          }}
        />
      ) : (
        <>
          <Text style={estilos.aviso}>{AVISO_LIMPIAR}</Text>
          {error && <Aviso texto={error} />}
          <Boton texto={enviando ? 'Limpiando…' : 'Sí, limpiar'} alPulsar={limpiar} deshabilitado={enviando} />
          <Boton texto="Cancelar" secundario alPulsar={() => setConfirmando(false)} deshabilitado={enviando} />
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: espaciado[8], marginBottom: espaciado[16] },
  titulo: { fontSize: tipografia.cuerpo, fontWeight: '600', color: color.texto.fuerte },
  ayuda: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  aviso: { fontSize: tipografia.etiqueta, color: color.texto.fuerte },
});
