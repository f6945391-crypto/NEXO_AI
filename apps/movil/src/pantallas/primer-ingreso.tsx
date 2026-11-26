import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IngresoRespuesta, PrimerIngresoSolicitud } from '@nexoai/contratos';
import { Aviso, Boton, Campo, TarjetaAcceso } from '../componentes';
import { conSesion, guardarSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';
import { etiquetarZona, zonaDelTelefono, zonasDisponibles } from '../zonas';

// REQ-ACC-04, REQ-ACC-05 · T-028. Contraseña nueva y zona horaria. La zona empieza sin elegir: se ofrece la
// del teléfono, pero la elige la persona. En lugar de un desplegable, que el móvil no tiene, un buscador.

const MAXIMO_RESULTADOS = 8;

export function PrimerIngreso({ alCompletar, alSalir }: { alCompletar: (sesion: IngresoRespuesta) => void; alSalir: () => void }) {
  const zonas = useMemo(zonasDisponibles, []);
  const propia = useMemo(zonaDelTelefono, []);
  const [contrasena, setContrasena] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [elegida, setElegida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const termino = busqueda.trim().toLowerCase().replaceAll(' ', '_');
  const resultados = termino ? zonas.filter((z) => z.valor.toLowerCase().includes(termino)).slice(0, MAXIMO_RESULTADOS) : [];

  async function guardar() {
    if (!elegida) return setError('Elige tu zona horaria para continuar.');
    const solicitud = PrimerIngresoSolicitud.safeParse({ contrasenaNueva: contrasena, zonaHoraria: elegida });
    if (!solicitud.success) {
      const corta = solicitud.error.issues.some((i) => i.path[0] === 'contrasenaNueva');
      return setError(corta ? 'La contraseña nueva necesita al menos 12 caracteres.' : 'Esa zona horaria no es válida.');
    }
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await conSesion('/auth/primer-ingreso', { metodo: 'POST', cuerpo: solicitud.data });
      if (!respuesta) return alSalir();
      const sesion = IngresoRespuesta.safeParse(respuesta.cuerpo);
      if (respuesta.estado !== 200 || !sesion.success) return setError(mensajeDeError(respuesta.cuerpo));
      await guardarSesion(sesion.data);
      alCompletar(sesion.data);
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TarjetaAcceso titulo="Antes de empezar" explicacion="Cambia la contraseña temporal y elige tu zona horaria. Con ella te mostramos cada compromiso a su hora.">
      <Campo etiqueta="Contraseña nueva" value={contrasena} onChangeText={setContrasena} secureTextEntry autoComplete="new-password" />
      <Text style={estilos.ayuda}>Al menos 12 caracteres, distinta de la temporal.</Text>

      <Campo etiqueta="Busca tu zona horaria" value={busqueda} onChangeText={setBusqueda} placeholder="Por ejemplo, Lima" autoCapitalize="none" />
      {resultados.length > 0 && (
        <View accessibilityRole="list" style={estilos.lista}>
          {resultados.map((zona) => (
            <Pressable
              key={zona.valor}
              accessibilityRole="radio"
              accessibilityState={{ checked: zona.valor === elegida }}
              onPress={() => setElegida(zona.valor)}
              style={[estilos.opcion, zona.valor === elegida && estilos.opcionElegida]}
            >
              <Text style={estilos.opcionTexto}>{zona.etiqueta}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {propia && elegida !== propia && (
        <Pressable accessibilityRole="button" onPress={() => setElegida(propia)} style={estilos.enlace}>
          <Text style={estilos.enlaceTexto}>Usar la de este teléfono: {etiquetarZona(propia)}</Text>
        </Pressable>
      )}
      <Text style={estilos.elegida}>{elegida ? `Zona elegida: ${etiquetarZona(elegida)}` : 'Todavía no elegiste tu zona horaria.'}</Text>

      {error && <Aviso texto={error} />}
      <Boton texto={enviando ? 'Guardando…' : 'Guardar y continuar'} alPulsar={guardar} deshabilitado={enviando} />
    </TarjetaAcceso>
  );
}

const estilos = StyleSheet.create({
  ayuda: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  lista: { borderWidth: 1, borderColor: color.borde.base, borderRadius: 8 },
  opcion: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espaciado[12], borderTopWidth: 1, borderTopColor: color.borde.base },
  opcionElegida: { backgroundColor: color.marca.suave },
  opcionTexto: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  enlace: { minHeight: 44, justifyContent: 'center' },
  enlaceTexto: { fontSize: tipografia.etiqueta, color: color.marca.base, textDecorationLine: 'underline' },
  elegida: { fontSize: tipografia.etiqueta, color: color.texto.fuerte },
});
