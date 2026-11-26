import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OperacionRespuesta } from '@nexoai/contratos';
import { conSesion } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';

// T-045 · REQ-CAP-25. Lo que está en espera se ve fuera de la capa: una franja encima de la agenda con
// cuántas cosas hay. Al abrirla, cada una con lo que se pidió y por qué espera, en palabras llanas. No hay
// botón de retirar: esa decisión sigue abierta. Sin nada en espera, la franja no aparece.
// La frase y el motivo vienen en la vista que arma la API (`vistaConfirmacion`), como en la tarjeta.

type Elemento = { id: string; frase: string; motivo: string | null };

const cuantas = (n: number) => (n === 1 ? '1 cosa en espera' : `${n} cosas en espera`);

function elementoDe(op: OperacionRespuesta): Elemento {
  const vista = op.vistaConfirmacion;
  const pedido = vista.datos.find((d) => d.etiqueta === 'Lo que pediste')?.valor;
  return { id: op.id, frase: pedido ?? vista.accion, motivo: vista.motivoNoConfirmable };
}

// `version` sube al cerrar la capa o cuando el asistente deja algo hecho: la franja vuelve a pedir la lista
export function FranjaEnEspera({ version, alSalir }: { version: number; alSalir: () => void }) {
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    let vigente = true;
    void conSesion('/operaciones?estado=en_espera')
      .then((r) => {
        if (!r) return alSalir();
        const lista = OperacionRespuesta.array().safeParse(r.cuerpo);
        // Si no se puede leer, la franja no aparece: la agenda sigue funcionando
        if (vigente && r.estado === 200 && lista.success) setElementos(lista.data.map(elementoDe));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [version, alSalir]);

  if (elementos.length === 0) return null;
  const titulo = cuantas(elementos.length);
  return (
    <View style={estilos.franja}>
      <Pressable accessibilityRole="button" accessibilityLabel={titulo} accessibilityState={{ expanded: abierta }} onPress={() => setAbierta((a) => !a)} style={estilos.cabecera}>
        <View style={estilos.marca} />
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.accion}>{abierta ? 'Ocultar' : 'Ver'}</Text>
      </Pressable>
      {abierta && (
        <View accessibilityRole="list" accessibilityLabel="Lo que está en espera" style={estilos.lista}>
          {elementos.map((e) => (
            <View key={e.id} role="listitem" style={estilos.elemento}>
              <Text style={estilos.frase}>«{e.frase}»</Text>
              {e.motivo && <Text style={estilos.motivo}>{e.motivo}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  franja: { borderRadius: 12, borderWidth: 1, borderColor: color.borde.base, backgroundColor: color.superficie.elevada },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado[8], minHeight: 48, paddingHorizontal: espaciado[12] },
  // Marcador geométrico del estado en espera
  marca: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.estado.advertencia },
  titulo: { flex: 1, fontSize: tipografia.etiqueta, fontWeight: '600', color: color.texto.fuerte },
  accion: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  lista: { paddingHorizontal: espaciado[12], paddingBottom: espaciado[12] },
  elemento: { gap: 2, paddingVertical: espaciado[8], borderTopWidth: 1, borderTopColor: color.borde.base },
  frase: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  motivo: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave },
});
