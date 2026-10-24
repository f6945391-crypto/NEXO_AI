import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SesionActual } from '@nexoai/contratos';
import { Entrar } from './pantallas/entrar';
import { AgendaHoy } from './pantallas/agenda';
import { Inicio, type Seccion } from './pantallas/inicio';
import { PrimerIngreso } from './pantallas/primer-ingreso';
import { conSesion, salir } from './sesion';
import { color, espaciado, tipografia } from './tokens';

// T-028 · specs/06-acceso/plan.md §5.6. Sin librería de navegación: entrar, primer ingreso y la aplicación
// son estados de una sola pantalla. Al abrir se mira si hay una sesión guardada en el teléfono.

type Estado = 'cargando' | 'entrar' | 'primer-ingreso' | 'aplicacion';

const VACIOS: Record<Exclude<Seccion, 'agenda'>, { titulo: string; texto: string }> = {
  tareas: { titulo: 'Nada en tus tareas', texto: 'Cuando le pidas algo al asistente, tus tareas aparecerán aquí, ordenadas por franja.' },
  actividad: { titulo: 'Todavía no hay actividad', texto: 'Aquí verás cuánto tiempo dedicaste a cada cosa y todo lo que el asistente hizo por ti.' },
};

export function Aplicacion() {
  const [estado, setEstado] = useState<Estado>('cargando');

  useEffect(() => {
    void conSesion('/auth/sesion')
      .then((r) => {
        const sesion = SesionActual.safeParse(r?.cuerpo);
        if (r?.estado === 200 && sesion.success) setEstado('aplicacion');
        else if (r && (r.cuerpo as { codigo?: string } | null)?.codigo === 'PRIMER_INGRESO_PENDIENTE') setEstado('primer-ingreso');
        else setEstado('entrar');
      })
      .catch(() => setEstado('entrar'));
  }, []);

  const cerrarSesion = useCallback(() => {
    void salir().then(() => setEstado('entrar'));
  }, []);

  return (
    <View style={estilos.raiz}>
      {estado === 'cargando' && (
        <View style={estilos.centro}>
          <ActivityIndicator color={color.marca.base} accessibilityLabel="Cargando" />
        </View>
      )}
      {estado === 'entrar' && <Entrar alEntrar={(s) => setEstado(s.primerIngresoPendiente ? 'primer-ingreso' : 'aplicacion')} />}
      {estado === 'primer-ingreso' && <PrimerIngreso alCompletar={() => setEstado('aplicacion')} alSalir={cerrarSesion} />}
      {estado === 'aplicacion' && (
        <Inicio
          alSalir={cerrarSesion}
          contenido={(seccion, abrirCaptura) =>
            seccion === 'agenda' ? (
              <AgendaHoy alSalir={cerrarSesion} alAbrirCaptura={abrirCaptura} />
            ) : (
              <View style={estilos.vacio}>
                <Text style={estilos.vacioTitulo}>{VACIOS[seccion].titulo}</Text>
                <Text style={estilos.vacioTexto}>{VACIOS[seccion].texto}</Text>
              </View>
            )
          }
        />
      )}
      <StatusBar style="dark" />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.superficie.base },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: espaciado[8], padding: espaciado[24], borderRadius: 16, backgroundColor: color.superficie.elevada },
  vacioTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte, textAlign: 'center' },
  vacioTexto: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave, textAlign: 'center' },
});
