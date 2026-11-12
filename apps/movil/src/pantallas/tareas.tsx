import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tarea, TareasPorFranja } from '@nexoai/contratos';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';

// T-054 · REQ-CUN03-03, 05, 08. La sección Tareas del móvil, como la de la web: tres franjas, sin niveles
// de período (R-38). Qué franja es cada tarea, el orden y cuáles están atrasadas lo decide la API. «Hecho»
// es un control directo de un toque, sin tarjeta (decisión 2). Crear o cambiar una tarea se le pide al
// asistente, nunca a un formulario (R-42): el estado vacío lleva a pedírselo.

const FRANJAS = [
  { clave: 'conFecha', nombre: 'Con fecha' },
  { clave: 'sinFecha', nombre: 'Sin fecha' },
  { clave: 'esperando', nombre: 'Esperando de alguien' },
] as const;

const VACIO = {
  conFecha: { titulo: 'No tienes tareas con fecha', texto: 'Pídeselo al asistente con tus palabras, por ejemplo «Recuérdame pagar el recibo el viernes».' },
  sinFecha: { titulo: 'No tienes tareas sin fecha', texto: 'Pídeselo al asistente con tus palabras, por ejemplo «Tengo que renovar mi pasaporte».' },
  esperando: { titulo: 'No esperas nada de nadie', texto: 'Cuéntaselo al asistente, por ejemplo «Estoy esperando que Marta me mande el contrato».' },
} as const;

type Estado = { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'lista'; tareas: TareasPorFranja };

// Un día del calendario, sin zona: se formatea al mediodía en UTC para que no se corra de día
const dia = (fecha: string) => {
  const texto = new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${fecha}T12:00:00Z`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

function detalle(tarea: Tarea): string | null {
  const cuando = tarea.fecha ? `${dia(tarea.fecha)}${tarea.hora ? `, ${tarea.hora}` : ''}` : null;
  const espera = tarea.esperaDe ? `Esperas «${tarea.esperaQue}» de ${tarea.esperaDe}` : null;
  const partes = [espera, cuando].filter(Boolean);
  return partes.length ? partes.join(' · ') : null;
}

export function Tareas({ alSalir, alAbrirCaptura, version = 0 }: { alSalir: () => void; alAbrirCaptura: () => void; version?: number }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [franja, setFranja] = useState(0);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    void conSesion('/tareas')
      .then((r) => {
        if (!r) return alSalir();
        const leidas = TareasPorFranja.safeParse(r.cuerpo);
        if (!vigente) return;
        if (r.estado === 200 && leidas.success) setEstado({ tipo: 'lista', tareas: leidas.data });
        else setEstado({ tipo: 'error', mensaje: mensajeDeError(r.cuerpo, 'No pudimos leer tus tareas.') });
      })
      .catch(() => vigente && setEstado({ tipo: 'error', mensaje: SIN_CONEXION }));
    return () => {
      vigente = false;
    };
  }, [version, recarga, alSalir]);

  const hecha = useCallback(
    (tarea: Tarea) => {
      setError(null);
      setOcupada(tarea.id);
      void conSesion(`/tareas/${encodeURIComponent(tarea.id)}/completar`, { metodo: 'POST' })
        .then((r) => {
          if (!r) return alSalir();
          if (r.estado === 200) setRecarga((n) => n + 1);
          else setError(mensajeDeError(r.cuerpo, 'No se pudo cambiar la tarea. Inténtalo de nuevo.'));
        })
        .catch(() => setError(SIN_CONEXION))
        .finally(() => setOcupada(null));
    },
    [alSalir],
  );

  if (estado.tipo === 'cargando') return <Text style={estilos.suave}>Cargando tus tareas…</Text>;
  if (estado.tipo === 'error') return <Aviso texto={estado.mensaje} />;

  const { clave, nombre } = FRANJAS[franja] ?? FRANJAS[0];
  const lista = estado.tareas[clave];

  return (
    <View style={estilos.raiz}>
      <View accessibilityRole="tablist" style={estilos.franjas}>
        {FRANJAS.map((f, i) => (
          <Pressable
            key={f.clave}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === franja }}
            onPress={() => setFranja(i)}
            style={[estilos.franja, i === franja && estilos.franjaActiva]}
          >
            <Text style={[estilos.franjaTexto, i === franja && estilos.franjaTextoActivo]}>{f.nombre}</Text>
          </Pressable>
        ))}
      </View>

      {lista.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.vacioTitulo}>{VACIO[clave].titulo}</Text>
          <Text style={estilos.vacioTexto}>{VACIO[clave].texto}</Text>
          <Boton texto="Pedírselo al asistente" alPulsar={alAbrirCaptura} />
        </View>
      ) : (
        <View accessibilityRole="list" accessibilityLabel={nombre} style={estilos.lista}>
          {lista.map((tarea) => {
            const extra = detalle(tarea);
            return (
              <View key={tarea.id} role="listitem" style={[estilos.tarea, tarea.atrasada && estilos.tareaAtrasada]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Marcar como hecha: ${tarea.titulo}`}
                  disabled={ocupada === tarea.id}
                  onPress={() => hecha(tarea)}
                  style={estilos.hecho}
                >
                  <Text style={estilos.hechoTexto}>Hecho</Text>
                </Pressable>
                <View style={estilos.texto}>
                  <Text style={estilos.titulo}>{tarea.titulo}</Text>
                  {tarea.atrasada && <Text style={estilos.atrasada}>Atrasada</Text>}
                  {extra && <Text style={estilos.suave}>{extra}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}
      {error && <Aviso texto={error} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { gap: espaciado[16] },
  franjas: { flexDirection: 'row', gap: espaciado[8], flexWrap: 'wrap' },
  franja: { paddingVertical: espaciado[8], paddingHorizontal: espaciado[12], borderRadius: 999, backgroundColor: color.superficie.elevada },
  franjaActiva: { backgroundColor: color.marca.base },
  franjaTexto: { fontSize: tipografia.etiqueta, color: color.texto.fuerte },
  franjaTextoActivo: { color: '#ffffff', fontWeight: '700' },
  lista: { gap: espaciado[8] },
  tarea: { flexDirection: 'row', alignItems: 'center', gap: espaciado[12], padding: espaciado[12], borderRadius: 12, backgroundColor: color.superficie.elevada },
  tareaAtrasada: { borderLeftWidth: 4, borderLeftColor: color.marca.base },
  hecho: { paddingVertical: espaciado[8], paddingHorizontal: espaciado[12], borderRadius: 8, borderWidth: 1, borderColor: color.marca.base },
  hechoTexto: { fontSize: tipografia.etiqueta, color: color.marca.base, fontWeight: '700' },
  texto: { flex: 1, gap: 2 },
  titulo: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  atrasada: { fontSize: tipografia.etiqueta, fontWeight: '700', color: color.marca.base },
  suave: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  vacio: { alignItems: 'center', gap: espaciado[8], padding: espaciado[24], borderRadius: 16, backgroundColor: color.superficie.elevada },
  vacioTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte, textAlign: 'center' },
  vacioTexto: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave, textAlign: 'center' },
});
