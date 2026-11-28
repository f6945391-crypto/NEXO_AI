import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IntegrantesEquipoRespuesta, MisEquiposRespuesta, OperacionRespuesta, type DecisionAsistente, type EstadoConsentimientoEquipo } from '@nexoai/contratos';
import { Aviso, Boton } from '../componentes';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';
import { Tarjeta } from './captura';

// T-146 · D-REU-36 (reemplaza a D-REU-32): la autorización propia para compartir la disponibilidad, en Ajustes,
// apartado «Disponibilidad para tu equipo», como en la web. Una fila por equipo con su responsable y cuántas
// personas tiene (REQ-CUN05-19, H-EQ-01), el estado y «Autorizar» o «Retirar autorización». El cambio es la
// Operación de CUN-05 (REQ-CUN05-14 a 16), como control directo y con su tarjeta de confirmación (P-03, DP-01).
// Ajustes la pinta solo con plan efectivo Empresarial y algún equipo (REQ-CUN05-18).

type Equipo = { id: string; nombre: string; responsable: string | null; integrantes: number; estado: EstadoConsentimientoEquipo | null };
type Lectura = { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'lista'; equipos: Equipo[] };

export function AutorizacionesEquipo({ perfilId, alSalir }: { perfilId: string; alSalir: () => void }) {
  const [lectura, setLectura] = useState<Lectura>({ tipo: 'cargando' });
  // Una sola tarjeta abierta a la vez, bajo la fila de su equipo
  const [propuesta, setPropuesta] = useState<{ equipoId: string; operacion: OperacionRespuesta } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await conSesion('/equipos');
      if (!r) return alSalir();
      const mios = MisEquiposRespuesta.safeParse(r.cuerpo);
      if (r.estado !== 200 || !mios.success) return setLectura({ tipo: 'error', mensaje: mensajeDeError(r.cuerpo, 'No pudimos leer tus equipos.') });
      const equipos = await Promise.all(
        mios.data.map(async (m): Promise<Equipo> => {
          const i = await conSesion(`/equipos/${encodeURIComponent(m.equipo.id)}/integrantes`);
          const integrantes = IntegrantesEquipoRespuesta.safeParse(i?.cuerpo);
          const yo = i?.estado === 200 && integrantes.success ? integrantes.data.find((x) => x.perfilId === perfilId) : undefined;
          return { id: m.equipo.id, nombre: m.equipo.nombre, responsable: m.responsable?.correo ?? null, integrantes: m.integrantes ?? 0, estado: yo?.estadoConsentimiento ?? null };
        }),
      );
      setLectura({ tipo: 'lista', equipos });
    } catch {
      setLectura({ tipo: 'error', mensaje: SIN_CONEXION });
    }
  }, [perfilId, alSalir]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function proponer(equipoId: string, estado: 'concedida' | 'revocada') {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      const r = await conSesion('/operaciones', {
        metodo: 'POST',
        cuerpo: { tipo: 'equipo.cambiar_consentimiento', origen: 'control_directo', carga: { equipoId, estado } },
      });
      if (!r) return alSalir();
      const operacion = OperacionRespuesta.safeParse(r.cuerpo);
      if (r.estado !== 201 || !operacion.success || operacion.data.estado !== 'propuesta') return setError(mensajeDeError(r.cuerpo, 'No pudimos preparar el cambio.'));
      setPropuesta({ equipoId, operacion: operacion.data });
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setOcupado(false);
    }
  }

  async function decidir(d: DecisionAsistente) {
    if (!propuesta || !('operacionId' in d)) return;
    const { operacion } = propuesta;
    setOcupado(true);
    setError(null);
    try {
      if (d.decision === 'descartar') {
        setPropuesta(null);
        await conSesion(`/operaciones/${operacion.id}/descartar`, { metodo: 'POST' });
        setAviso('No se realizaron cambios.');
        return;
      }
      if (d.decision !== 'confirmar') return;
      const r = await conSesion(`/operaciones/${operacion.id}/confirmar`, { metodo: 'POST' });
      if (!r) return alSalir();
      const resultado = OperacionRespuesta.safeParse(r.cuerpo);
      setPropuesta(null);
      if (r.estado === 200 && resultado.success && resultado.data.estado === 'ejecutada') setAviso('Tu autorización se ha actualizado correctamente.');
      else setError(mensajeDeError(r.cuerpo, 'No se pudo confirmar el cambio. Inténtalo de nuevo.'));
      await cargar();
    } catch {
      setError(SIN_CONEXION);
    } finally {
      setOcupado(false);
    }
  }

  if (lectura.tipo === 'lista' && lectura.equipos.length === 0) return null;

  return (
    <View style={estilos.bloque}>
      <Text accessibilityRole="header" style={estilos.titulo}>
        Disponibilidad para tu equipo
      </Text>
      <Text style={estilos.suave}>Autoriza a cada equipo a ver tus horas libres y ocupadas para buscar horario de reunión. No se comparten títulos ni detalles, y puedes retirarlo cuando quieras.</Text>
      {lectura.tipo === 'cargando' && <Text style={estilos.suave}>Leyendo tus equipos…</Text>}
      {lectura.tipo === 'error' && <Aviso texto={lectura.mensaje} />}
      {lectura.tipo === 'lista' && (
        <View accessibilityRole="list" accessibilityLabel="Tus equipos" style={estilos.lista}>
          {lectura.equipos.map((equipo) => {
            const autorizado = equipo.estado === 'concedida';
            const abierta = propuesta?.equipoId === equipo.id ? propuesta.operacion : null;
            return (
              <View key={equipo.id} role="listitem" style={estilos.fila}>
                <View style={estilos.cabecera}>
                  <Text style={estilos.nombre}>{equipo.nombre}</Text>
                  <View style={[estilos.etiqueta, autorizado && estilos.etiquetaAutorizada]}>
                    <Text style={[estilos.etiquetaTexto, autorizado && estilos.etiquetaTextoAutorizada]}>{autorizado ? 'Autorizado' : 'Sin autorizar'}</Text>
                  </View>
                </View>
                <Text style={estilos.suave}>
                  {equipo.responsable ? `Responsable: ${equipo.responsable}` : 'Sin responsable'} · {equipo.integrantes} {equipo.integrantes === 1 ? 'integrante' : 'integrantes'}
                </Text>
                {abierta ? (
                  <Tarjeta operacion={abierta} activa decidido={null} ocupado={ocupado} alDecidir={(d) => void decidir(d)} />
                ) : (
                  equipo.estado && (
                    <Boton
                      texto={autorizado ? 'Retirar autorización' : 'Autorizar'}
                      secundario
                      deshabilitado={ocupado || propuesta !== null}
                      alPulsar={() => void proponer(equipo.id, autorizado ? 'revocada' : 'concedida')}
                    />
                  )
                )}
              </View>
            );
          })}
        </View>
      )}
      {aviso && (
        <Text role="status" style={estilos.aviso}>
          {aviso}
        </Text>
      )}
      {error && <Aviso texto={error} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: espaciado[8], paddingTop: espaciado[16], borderTopWidth: 1, borderTopColor: color.borde.base },
  titulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte },
  suave: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave },
  lista: { gap: espaciado[8] },
  fila: { gap: espaciado[8], padding: espaciado[12], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base },
  cabecera: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espaciado[8] },
  nombre: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.texto.fuerte },
  etiqueta: { paddingHorizontal: espaciado[8], paddingVertical: 2, borderRadius: 999, backgroundColor: color.superficie.hundida },
  etiquetaAutorizada: { backgroundColor: color.tinte.exito },
  etiquetaTexto: { fontSize: tipografia.micro, fontWeight: '600', color: color.texto.suave },
  etiquetaTextoAutorizada: { color: color.estado.exito },
  aviso: { fontSize: tipografia.etiqueta, color: color.estado.exito },
});
