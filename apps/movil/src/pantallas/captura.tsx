import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Boton } from '../componentes';
import { color, espaciado, tipografia } from '../tokens';

// T-021 · R-36, P-11. La capa de captura sube sobre la sección en la que estás y no navega. El asistente
// llega en la fase 2: hasta entonces, lo que se pide queda aquí, en espera, y se dice con claridad que no se
// envió ni se creó nada. No hay camino manual paralelo (R-42; el cuadro móvil que lo ofrece es INC-11).

type Pedido = { id: number; texto: string };

export function CapaCaptura({ visible, alCerrar }: { visible: boolean; alCerrar: () => void }) {
  const [borrador, setBorrador] = useState('');
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  function enviar() {
    const texto = borrador.trim();
    if (!texto) return;
    setPedidos((previos) => [...previos, { id: previos.length + 1, texto }]);
    setBorrador('');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={alCerrar}>
      <View style={estilos.velo}>
        <View style={estilos.hoja}>
          <View style={estilos.cabecera}>
            <Text accessibilityRole="header" style={estilos.titulo}>
              ¿Qué hacemos?
            </Text>
            <Pressable accessibilityRole="button" onPress={alCerrar} style={estilos.cerrar}>
              <Text style={estilos.cerrarTexto}>Cerrar</Text>
            </Pressable>
          </View>

          {pedidos.length > 0 && (
            <View style={estilos.espera}>
              <Text accessibilityRole="alert" style={estilos.esperaTexto}>
                El asistente todavía no está activo en esta versión. Lo que pides queda aquí, en espera. No se ha enviado a nadie ni se ha creado nada.
              </Text>
              {pedidos.map((p) => (
                <View key={p.id} style={estilos.pedido}>
                  <Text style={estilos.pedidoTexto}>{p.texto}</Text>
                  <Text style={estilos.pedidoEstado}>En espera</Text>
                </View>
              ))}
            </View>
          )}

          <TextInput
            accessibilityLabel="Pídele algo al asistente"
            placeholder="Pídele algo al asistente"
            placeholderTextColor={color.texto.suave}
            value={borrador}
            onChangeText={setBorrador}
            onSubmitEditing={enviar}
            autoFocus
            multiline
            style={estilos.entrada}
          />
          <Boton texto="Enviar" alPulsar={enviar} deshabilitado={!borrador.trim()} />
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 33, 46, 0.4)' },
  hoja: { gap: espaciado[16], padding: espaciado[16], paddingBottom: espaciado[32], borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: color.superficie.base },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: tipografia.subtitulo, fontWeight: '700', color: color.texto.fuerte },
  cerrar: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  cerrarTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  espera: { gap: espaciado[8] },
  esperaTexto: { padding: espaciado[12], borderRadius: 12, backgroundColor: '#FDF3E0', color: '#7A4F00', fontSize: tipografia.etiqueta, lineHeight: 20 },
  pedido: { padding: espaciado[12], borderRadius: 12, backgroundColor: color.marca.suave, gap: 2 },
  pedidoTexto: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  pedidoEstado: { fontSize: tipografia.micro, color: color.texto.suave },
  entrada: { minHeight: 72, padding: espaciado[12], borderWidth: 1, borderColor: color.borde.fuerte, borderRadius: 12, fontSize: tipografia.cuerpo, color: color.texto.fuerte, textAlignVertical: 'top' },
});
