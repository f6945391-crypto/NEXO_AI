import { EntradaRegistroEmpresa } from '@nexoai/contratos';
import { exigirSesionEmpresa } from '../_comun/exigir';
import { leerDeLaZona } from '../_comun/sesion';

// T-069 · plan §7.2, «Registro», y §9. Lo que hicieron los administradores, de más reciente a más antiguo, sin
// contenido de nadie. Las fechas, con la zona horaria de quien mira (P-05).
export default async function PaginaRegistro() {
  const sesion = await exigirSesionEmpresa('/administracion/registro', { administrador: true });
  const entradas = await leerDeLaZona('/administracion/operaciones', EntradaRegistroEmpresa.array());
  const zona = sesion.zonaHoraria ?? 'UTC';
  const fecha = new Intl.DateTimeFormat('es', { timeZone: zona, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <>
      <header className="empresa__cabecera">
        <div>
          <h1>Registro</h1>
          <p className="empresa__subtitulo">Lo que se hizo desde Administración, de lo más reciente a lo más antiguo. Horas de {zona.replace(/_/g, ' ')}.</p>
        </div>
      </header>
      {entradas === null ? (
        <p className="error" role="alert">
          No pudimos leer el registro. Vuelve a cargar la página.
        </p>
      ) : entradas.length === 0 ? (
        <div className="empresa__vacio">
          <h2>Todavía no se hizo nada desde aquí</h2>
        </div>
      ) : (
        <ol className="empresa__registro" aria-label="Registro">
          {entradas.map((e) => (
            <li key={e.id} className="empresa__entrada">
              <p className="empresa__entrada-accion">
                {e.accion}
                {e.estado === 'fallida' && <span className="empresa__etiqueta empresa__etiqueta--aviso">No se completó</span>}
              </p>
              <p className="empresa__entrada-datos">{e.datos.map((d) => `${d.etiqueta}: ${d.valor}`).slice(0, 3).join(' · ')}</p>
              <p className="empresa__entrada-pie">
                {e.por} · <time dateTime={e.ejecutadaEn ?? e.creadaEn}>{fecha.format(new Date(e.ejecutadaEn ?? e.creadaEn))}</time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
