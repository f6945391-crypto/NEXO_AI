import { redirect } from 'next/navigation';
import { fechaValida, obtenerAgenda, type NivelAgenda } from '../lib/agenda';
import { obtenerConversacion, obtenerEnEspera } from '../lib/asistente';
import { obtenerPerfil, obtenerPermisosGoogle, obtenerSesion } from '../lib/sesion';
import { obtenerTareas, obtenerTareasDelDia } from '../lib/tareas';
import { Aplicacion } from './aplicacion/aplicacion';

// La aplicación: navegación, conversación y lienzo (T-023). También para el colaborador (T-026, REQ-ACC-13).
export default async function Inicio({ searchParams }: { searchParams: Promise<{ google?: string; nivel?: string; fecha?: string }> }) {
  const sesion = await obtenerSesion();
  if (sesion.estado === 'ninguna') redirect('/entrar');
  if (sesion.estado === 'caducada') {
    // T-139: Semana, Mes o el día elegido van en la dirección; tras renovar se vuelve a la misma vista
    const { google, nivel, fecha } = await searchParams;
    const consulta = new URLSearchParams(Object.entries({ google, nivel, fecha }).filter((par): par is [string, string] => Boolean(par[1]))).toString();
    redirect(`/sesion/renovar?volver=${encodeURIComponent(consulta ? `/?${consulta}` : '/')}`);
  }
  if (sesion.estado === 'pendiente') redirect('/primer-ingreso');

  // T-034: la conversación abierta, con lo que espera tu confirmación o quedó en espera
  // T-045: lo que está en espera, para la franja del lienzo
  // T-052: las tareas, para la sección Tareas
  const [perfil, permisosGoogle, conversacion, enEspera, tareas, { google, nivel, fecha }] = await Promise.all([
    obtenerPerfil(),
    obtenerPermisosGoogle(),
    obtenerConversacion(),
    obtenerEnEspera(),
    obtenerTareas(),
    searchParams,
  ]);
  // T-025: la agenda, en la zona de la persona. T-044: el nivel y la fecha van en la dirección, así una
  // confirmación que vuelve a pedir la página trae la misma vista ya al día.
  const vista = { nivel: (['semana', 'mes'].includes(nivel ?? '') ? nivel : 'dia') as NivelAgenda, fecha: fechaValida(fecha) };
  const agenda = perfil?.zonaHoraria
    ? await obtenerAgenda(perfil.zonaHoraria, vista)
    : ({ estado: 'error', mensaje: 'No pudimos leer tu zona horaria.' } as const);
  // T-053 · REQ-CUN03-13: las tareas del día que muestra Hoy, en la zona del perfil
  const diaDeHoy = agenda.estado === 'lista' && agenda.nivel === 'dia' ? agenda.fechaIso : perfil?.zonaHoraria ? new Intl.DateTimeFormat('en-CA', { timeZone: perfil.zonaHoraria }).format(new Date()) : null;
  const tareasDelDia = vista.nivel === 'dia' && diaDeHoy ? await obtenerTareasDelDia(vista.fecha ?? diaDeHoy) : null;
  return (
    <Aplicacion
      rol={sesion.sesion.rol}
      plan={sesion.sesion.plan}
      administrador={sesion.sesion.administrador}
      perfil={perfil}
      permisosGoogle={permisosGoogle}
      agenda={agenda}
      vista={vista}
      enEspera={enEspera}
      conversacion={conversacion}
      resultadoGoogle={google ?? null}
      tareas={tareas}
      tareasDelDia={tareasDelDia}
    />
  );
}
