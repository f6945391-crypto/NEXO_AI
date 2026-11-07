import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Actividad, type AccionDelAsistente, type CompromisoOcurrido, type NivelActividad } from '@nexoai/contratos';
import { fechaLarga, horario, nombreDeLaSemana, nombreDelMes, nombreDeZona } from '../agenda/dia';
import { conSesion, mensajeDeError, SIN_CONEXION } from '../sesion';
import { color, espaciado, tipografia } from '../tokens';

// T-083 · REQ-CUN02-25 a 31, 33 · specs/02-jornada/plan.md §5 · design/ARQUITECTURA-VISUAL-MOVIL.md §2 y §3 ter.
// Actividad en el móvil: lo que pasó. El mismo selector y la misma disposición que Agenda (pantallas/agenda.tsx),
// con dos bloques, «Compromisos» y «Lo que hizo el asistente». Abre en Día y hoy; al cambiar de nivel vuelve
// al período de hoy. Solo muestra: no hay ningún control que cambie algo (REQ-CUN02-31).

const NIVELES = [
  ['Día', 'dia'],
  ['Semana', 'semana'],
  ['Mes', 'mes'],
] as const satisfies readonly (readonly [string, NivelActividad])[];

const VOLVER: Record<NivelActividad, string> = { dia: 'Volver a hoy', semana: 'Esta semana', mes: 'Este mes' };
const PASO: Record<NivelActividad, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' };
// H-JOR-07
const DESDE = { agente: 'En la conversación', control_directo: 'Desde la pantalla' } as const;

type Estado = { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'lista'; actividad: Actividad };

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const ciudad = (zona: string) => (zona.split('/').pop() ?? zona).replaceAll('_', ' ');
const reloj = (instante: string, zona: string) => new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instante));

// «1 h», «45 min», «1 h 30 min»
function duracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

function tituloDe(a: Actividad): string {
  if (a.nivel === 'semana') return mayuscula(nombreDeLaSemana(a.primerDia));
  if (a.nivel === 'mes') return nombreDelMes(a.fecha);
  return fechaLarga(a.fecha);
}

// «hoy», «ese día», «esta semana»…
function periodoDe(a: Actividad): string {
  if (a.nivel === 'dia') return a.esActual ? 'hoy' : 'ese día';
  if (a.nivel === 'semana') return a.esActual ? 'esta semana' : 'esa semana';
  return a.esActual ? 'este mes' : 'ese mes';
}

// REQ-CUN02-33: por día, en orden, solo los días con algo
function porDia<T extends { dia: string }>(elementos: T[]): [string, T[]][] {
  const mapa = new Map<string, T[]>();
  for (const e of elementos) mapa.set(e.dia, [...(mapa.get(e.dia) ?? []), e]);
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function ActividadPantalla({ alSalir, version = 0 }: { alSalir: () => void; version?: number }) {
  const [nivel, setNivel] = useState<NivelActividad>('dia');
  const [fecha, setFecha] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  // Solo cuenta la última lectura: una respuesta vieja que llega tarde no pisa a la nueva
  const ultima = useRef(0);

  const cargar = useCallback(async () => {
    const esta = ++ultima.current;
    try {
      const r = await conSesion(`/actividad?nivel=${nivel}${fecha ? `&fecha=${fecha}` : ''}`);
      if (esta !== ultima.current) return;
      if (!r) return alSalir();
      const leida = Actividad.safeParse(r.cuerpo);
      if (r.estado !== 200 || !leida.success) return setEstado({ tipo: 'error', mensaje: mensajeDeError(r.cuerpo, 'No pudimos leer tu actividad. Inténtalo de nuevo en un momento.') });
      setEstado({ tipo: 'lista', actividad: leida.data });
    } catch {
      if (esta === ultima.current) setEstado({ tipo: 'error', mensaje: SIN_CONEXION });
    }
  }, [alSalir, nivel, fecha]);

  // También cuando el asistente deja algo hecho (T-035)
  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  function elegirNivel(nuevo: NivelActividad) {
    setNivel(nuevo);
    setFecha(null);
  }

  return (
    <View style={estilos.contenedor}>
      <View accessibilityRole="tablist" style={estilos.niveles}>
        {NIVELES.map(([nombre, clave]) => (
          <Pressable
            key={clave}
            accessibilityRole="tab"
            accessibilityState={{ selected: clave === nivel }}
            onPress={() => elegirNivel(clave)}
            style={[estilos.nivel, clave === nivel && estilos.nivelActivo]}
          >
            <Text style={[estilos.nivelTexto, clave === nivel && estilos.nivelTextoActivo]}>{nombre}</Text>
          </Pressable>
        ))}
      </View>

      {estado.tipo === 'cargando' && <Text style={estilos.suave}>Leyendo tu actividad…</Text>}
      {estado.tipo === 'error' && <Vacio titulo="No pudimos leer tu actividad" texto={estado.mensaje} />}
      {estado.tipo === 'lista' && <Contenido actividad={estado.actividad} alIr={setFecha} />}
    </View>
  );
}

function Contenido({ actividad: a, alIr }: { actividad: Actividad; alIr: (fecha: string | null) => void }) {
  const zona = a.zonaHoraria;
  const periodo = periodoDe(a);
  const todoVacio = a.compromisos.length === 0 && a.registro.length === 0;
  return (
    <View style={estilos.dia}>
      {/* Anterior · período · siguiente, como en Agenda; no se pasa al futuro (H-JOR-08) */}
      <View style={estilos.navegacion}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${PASO[a.nivel]} anterior`} onPress={() => alIr(a.anterior)} style={estilos.enlace}>
          <Text style={estilos.enlaceTexto}>Anterior</Text>
        </Pressable>
        <Text accessibilityRole="header" style={estilos.fecha}>
          {tituloDe(a)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${PASO[a.nivel]} siguiente`}
          accessibilityState={{ disabled: !a.siguiente }}
          disabled={!a.siguiente}
          onPress={() => a.siguiente && alIr(a.siguiente)}
          style={estilos.enlace}
        >
          <Text style={[estilos.enlaceTexto, !a.siguiente && estilos.enlaceApagado]}>Siguiente</Text>
        </Pressable>
      </View>
      <View style={estilos.cabeceraDia}>
        <Text style={estilos.suave}>{nombreDeZona(zona)}</Text>
        {!a.esActual && (
          <Pressable accessibilityRole="button" onPress={() => alIr(null)} style={estilos.enlace}>
            <Text style={estilos.enlaceTexto}>{VOLVER[a.nivel]}</Text>
          </Pressable>
        )}
      </View>
      {/* REQ-CUN02-28: hoy es la costura con Agenda */}
      {a.hastaAhora && <Text style={estilos.suave}>{a.nivel === 'dia' ? 'Lo ocurrido hasta ahora. Lo que queda de hoy está en Agenda.' : 'Lo ocurrido hasta ahora.'}</Text>}

      {todoVacio ? (
        // REQ-CUN02-30: nombra el período y no ofrece crear nada
        <Vacio
          titulo={a.esActual ? `${mayuscula(periodo)} todavía no ha pasado nada` : `${mayuscula(periodo)} no pasó nada`}
          texto="Aquí verás los compromisos que vayan terminando y lo que el asistente haga por ti."
        >
          {a.calendario !== 'conectado' && <SinCalendario estado={a.calendario} />}
        </Vacio>
      ) : (
        <>
          <Bloque titulo="Compromisos" total={a.compromisos.length}>
            {a.calendario !== 'conectado' ? (
              <SinCalendario estado={a.calendario} />
            ) : a.compromisos.length === 0 ? (
              <Text style={estilos.suave}>Ningún compromiso terminó {periodo}.</Text>
            ) : (
              <Grupos nivel={a.nivel} nombre="Compromisos" elementos={a.compromisos} pintar={(c) => <FilaCompromiso key={c.id} compromiso={c} zona={zona} />} />
            )}
          </Bloque>
          <Bloque titulo="Lo que hizo el asistente" total={a.registro.length}>
            {a.registro.length === 0 ? (
              <Text style={estilos.suave}>El asistente no hizo nada por ti {periodo}.</Text>
            ) : (
              <Grupos nivel={a.nivel} nombre="Lo que hizo el asistente" elementos={a.registro} pintar={(r) => <FilaAccion key={r.id} accion={r} zona={zona} />} />
            )}
          </Bloque>
        </>
      )}
    </View>
  );
}

function Bloque({ titulo, total, children }: { titulo: string; total: number; children: ReactNode }) {
  return (
    <View style={estilos.bloque}>
      <View style={estilos.tituloBloque}>
        <Text accessibilityRole="header" style={estilos.fecha}>
          {titulo}
        </Text>
        <Text accessibilityLabel={total === 1 ? '1 elemento' : `${total} elementos`} style={estilos.etiqueta}>
          {total}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Grupos<T extends { dia: string }>({ nivel, nombre, elementos, pintar }: { nivel: NivelActividad; nombre: string; elementos: T[]; pintar: (e: T) => ReactNode }) {
  if (nivel === 'dia') {
    return (
      <View accessibilityRole="list" accessibilityLabel={nombre}>
        {elementos.map(pintar)}
      </View>
    );
  }
  return (
    <View style={estilos.semana}>
      {porDia(elementos).map(([dia, lista]) => (
        <View key={dia} accessibilityRole="list" accessibilityLabel={`${nombre}, ${fechaLarga(dia).toLowerCase()}`} style={estilos.diaSemana}>
          <Text accessibilityRole="header" style={estilos.tituloDia}>
            {fechaLarga(dia)}
          </Text>
          {lista.map(pintar)}
        </View>
      ))}
    </View>
  );
}

// La hora arriba, el contenido debajo (§3, «Dato de apoyo dentro de un bloque»)
function FilaCompromiso({ compromiso: c, zona }: { compromiso: CompromisoOcurrido; zona: string }) {
  const enSuZona = c.todoElDia || c.zonaHoraria === zona ? null : `Hora de ${ciudad(c.zonaHoraria)}: ${horario(c, c.zonaHoraria)}`;
  return (
    <View style={estilos.fila}>
      <Text style={estilos.hora}>{horario(c, zona)}</Text>
      <Text style={estilos.titulo}>{c.titulo}</Text>
      {!c.todoElDia && <Text style={estilos.suave}>{duracion(c.duracionMinutos)}</Text>}
      {enSuZona && <Text style={estilos.suave}>{enSuZona}</Text>}
    </View>
  );
}

// Una acción del asistente: su hora en el tinte del asistente, qué hizo, sus datos en pares y desde dónde
function FilaAccion({ accion: r, zona }: { accion: AccionDelAsistente; zona: string }) {
  return (
    <View style={estilos.fila}>
      <Text style={estilos.horaAgente}>{reloj(r.ejecutadaEn, zona)}</Text>
      <Text style={estilos.titulo}>{r.descripcion}</Text>
      {r.datos.map((d) => (
        <View key={d.etiqueta} style={estilos.par}>
          <Text style={estilos.parEtiqueta}>{d.etiqueta}</Text>
          <Text style={estilos.parValor}>{d.valor}</Text>
        </View>
      ))}
      <Text style={estilos.suave}>{DESDE[r.origen]}</Text>
    </View>
  );
}

// REQ-CUN02-29 · H-JOR-10: en el lugar de los compromisos, sin presentarlo como error
function SinCalendario({ estado }: { estado: 'sin_conectar' | 'no_disponible' }) {
  return (
    <Text style={estilos.suave}>
      {estado === 'no_disponible'
        ? 'Ahora mismo no pudimos leer tu calendario. Inténtalo de nuevo en un momento.'
        : 'Tus compromisos aparecen aquí cuando conectes tu calendario. Conéctalo desde Ajustes en la web.'}
    </Text>
  );
}

function Vacio({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <View style={estilos.vacio}>
      <Text accessibilityRole="header" style={estilos.vacioTitulo}>
        {titulo}
      </Text>
      <Text style={estilos.vacioTexto}>{texto}</Text>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, gap: espaciado[16] },
  niveles: { flexDirection: 'row', alignSelf: 'flex-start', padding: 4, gap: 4, borderRadius: 12, backgroundColor: color.superficie.hundida },
  nivel: { minHeight: 36, paddingHorizontal: espaciado[16], justifyContent: 'center', borderRadius: 8 },
  nivelActivo: { backgroundColor: color.superficie.base },
  nivelTexto: { fontSize: tipografia.etiqueta, color: color.texto.suave },
  nivelTextoActivo: { color: color.texto.fuerte, fontWeight: '700' },
  dia: { gap: espaciado[4] },
  fecha: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte },
  suave: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave },
  navegacion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado[8] },
  cabeceraDia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado[8], minHeight: 44 },
  enlace: { minHeight: 44, minWidth: 44, paddingHorizontal: espaciado[8], justifyContent: 'center', alignItems: 'center' },
  enlaceTexto: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base },
  enlaceApagado: { color: color.borde.fuerte },
  bloque: { gap: espaciado[8], marginTop: espaciado[16] },
  tituloBloque: { flexDirection: 'row', alignItems: 'center', gap: espaciado[8] },
  etiqueta: { paddingHorizontal: espaciado[8], paddingVertical: 2, borderRadius: 999, overflow: 'hidden', backgroundColor: color.superficie.hundida, color: color.texto.suave, fontSize: tipografia.micro, fontWeight: '600' },
  semana: { gap: espaciado[12] },
  diaSemana: { gap: espaciado[4], padding: espaciado[12], borderRadius: 12, borderWidth: 1, borderColor: color.borde.base },
  tituloDia: { fontSize: tipografia.etiqueta, fontWeight: '700', color: color.texto.fuerte },
  fila: { gap: 2, paddingVertical: espaciado[12], borderTopWidth: 1, borderTopColor: color.borde.base },
  hora: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.marca.base, fontVariant: ['tabular-nums'] },
  horaAgente: { fontSize: tipografia.etiqueta, fontWeight: '600', color: color.agente.base, fontVariant: ['tabular-nums'] },
  titulo: { fontSize: tipografia.cuerpo, color: color.texto.fuerte },
  par: { flexDirection: 'row', gap: espaciado[12] },
  parEtiqueta: { minWidth: 88, fontSize: tipografia.etiqueta, color: color.texto.suave },
  parValor: { flex: 1, fontSize: tipografia.etiqueta, fontWeight: '600', color: color.texto.fuerte },
  vacio: { flex: 1, minHeight: 240, justifyContent: 'center', alignItems: 'center', gap: espaciado[8], padding: espaciado[24], marginTop: espaciado[12], borderRadius: 16, backgroundColor: color.superficie.elevada },
  vacioTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: color.texto.fuerte, textAlign: 'center' },
  vacioTexto: { fontSize: tipografia.etiqueta, lineHeight: 20, color: color.texto.suave, textAlign: 'center' },
});
