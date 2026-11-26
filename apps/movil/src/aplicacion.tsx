import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SesionActual } from '@nexoai/contratos';
import { Entrar } from './pantallas/entrar';
import { ActividadPantalla } from './pantallas/actividad';
import { AgendaHoy } from './pantallas/agenda';
import { Inicio, type Seccion } from './pantallas/inicio';
import { PrimerIngreso } from './pantallas/primer-ingreso';
import { Restablecer } from './pantallas/restablecer';
import { SeccionTareas } from './pantallas/tareas';
import { conSesion, salir } from './sesion';
import { color, espaciado, tipografia } from './tokens';

// T-028 · specs/06-acceso/plan.md §5.6. Sin librería de navegación: entrar, primer ingreso y la aplicación
// son estados de una sola pantalla. Al abrir se mira si hay una sesión guardada en el teléfono.

// T-123: «restablecer» pide el enlace sin sesión y vuelve a Entrar (REQ-ACC-19)
type Estado = 'cargando' | 'entrar' | 'restablecer' | 'primer-ingreso' | 'aplicacion';

export function Aplicacion() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [correoOlvidado, setCorreoOlvidado] = useState('');

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
      {estado === 'entrar' && (
        <Entrar
          alEntrar={(s) => setEstado(s.primerIngresoPendiente ? 'primer-ingreso' : 'aplicacion')}
          alOlvidar={(correo) => {
            setCorreoOlvidado(correo);
            setEstado('restablecer');
          }}
        />
      )}
      {estado === 'restablecer' && <Restablecer correoInicial={correoOlvidado} alVolver={() => setEstado('entrar')} />}
      {estado === 'primer-ingreso' && <PrimerIngreso alCompletar={() => setEstado('aplicacion')} alSalir={cerrarSesion} />}
      {estado === 'aplicacion' && (
        <Inicio
          alSalir={cerrarSesion}
          contenido={(seccion, abrirCaptura, version, lienzo) =>
            seccion === 'agenda' ? (
              <AgendaHoy alSalir={cerrarSesion} alAbrirCaptura={abrirCaptura} alCambiarNivel={lienzo.alCambiarNivel} mostrar={lienzo.mostrar} version={version} />
            ) : seccion === 'actividad' ? (
              // T-071 · REQ-CUN02-25
              <ActividadPantalla alSalir={cerrarSesion} version={version} />
            ) : (
              // T-054: la sección Tareas
              <SeccionTareas alAbrirCaptura={abrirCaptura} alSalir={cerrarSesion} version={version} />
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
});
