import type { ResumenBitacora } from '@nexoai/contratos';

// T-130 · REQ-CUN03-28 · H-TP-29, 35 · plan §13.8. El resumen breve de la bitácora, sobre los avances y nunca en
// su lugar. Lleva una etiqueta que dice que lo escribió el asistente y la fecha que arma la API («Resumen al
// miércoles 25 de noviembre»), para que nadie lo tome por un avance. Lo usan la sección Tareas y el turno
// `bitacora` de la conversación. Sin resumen, no se muestra nada
export function ResumenDeBitacora({ tarea, resumen }: { tarea: string; resumen: ResumenBitacora | null }) {
  if (!resumen) return null;
  return (
    <div className="resumen-bitacora" role="note" aria-label={`Resumen de ${tarea}`}>
      <p className="resumen-bitacora__etiqueta">Escrito por el asistente</p>
      <p className="resumen-bitacora__texto">
        <span className="resumen-bitacora__cuando">{resumen.cuando}</span> · {resumen.texto}
      </p>
    </div>
  );
}
