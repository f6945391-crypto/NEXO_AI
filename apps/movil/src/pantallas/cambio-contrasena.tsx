import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CambioContrasenaSolicitud, IngresoRespuesta } from '@nexoai/contratos';
import { Aviso, Boton, Campo } from '../componentes';
import { conSesion, guardarSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';

// REQ-ACC-18 · T-121 · specs/06-acceso/plan.md §5.7. Lo mismo que en la web: la actual y una nueva de al
// menos 12 caracteres; la API devuelve tokens nuevos para esta sesión y cierra las demás.

export function CambioContrasena() {
  const [editando, setEditando] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cerrar(texto: string | null = null) {
    setActual('');
    setNueva('');
    setError(null);
    setAviso(texto);
    setEditando(false);
  }

  async function cambiar() {
    const datos = CambioContrasenaSolicitud.safeParse({ actual, nueva });
    if (!datos.success) {
      setError('La contraseña nueva tiene que tener al menos 12 caracteres.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await conSesion('/auth/contrasena', { metodo: 'PATCH', cuerpo: datos.data });
      if (!respuesta) setError('Tu sesión terminó. Vuelve a entrar.');
      else if (respuesta.estado !== 200) setError(mensajeDeError(respuesta.cuerpo, 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'));
      else {
        await guardarSesion(IngresoRespuesta.parse(respuesta.cuerpo));
        cerrar('Listo: tu contraseña cambió y se cerraron tus otras sesiones.');
      }
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setEnviando(false);
    }
  }

  if (!editando) {
    return (
      <View style={estilos.bloque}>
        {aviso && (
          <Text role="status" style={estilos.aviso}>
            {aviso}
          </Text>
        )}
        <Boton texto="Cambiar contraseña" secundario alPulsar={() => setEditando(true)} />
      </View>
    );
  }

  return (
    <View style={estilos.bloque}>
      <Campo etiqueta="Contraseña actual" value={actual} onChangeText={setActual} secureTextEntry autoComplete="current-password" />
      <Campo etiqueta="Contraseña nueva" value={nueva} onChangeText={setNueva} secureTextEntry autoComplete="new-password" />
      <Text style={estilos.ayuda}>Al menos 12 caracteres y distinta de la actual. Se cerrarán tus otras sesiones.</Text>
      {error && <Aviso texto={error} />}
      <Boton texto={enviando ? 'Cambiando…' : 'Cambiar contraseña'} alPulsar={cambiar} deshabilitado={!actual || !nueva || enviando} />
      <Boton texto="Cancelar" secundario alPulsar={() => cerrar()} deshabilitado={enviando} />
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: espaciado[8], marginBottom: espaciado[16] },
  ayuda: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  aviso: { fontSize: tipografia.etiqueta, color: color.texto.fuerte },
});
